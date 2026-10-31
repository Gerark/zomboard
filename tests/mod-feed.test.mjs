import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, readFile, readdir, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';
import sharp from 'sharp';
import { prepareModFeed } from '../scripts/build-mod-feed.mjs';
import { buildPages } from '../scripts/build-pages.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const digest = data => createHash('sha256').update(data).digest('hex');

test('real mod export preserves all curated fields, ordering, images and PNG identities under hosting paths', async () => {
  const source = JSON.parse(JSON.stringify(vm.runInNewContext(`${await readFile(path.join(root,'missions-data.js'),'utf8')}\nmissions`)));
  for (const base of ['https://example.test/zomboard/','https://board.example/']) {
    const files = new Map(await prepareModFeed(root,new URL(base),source));
    const feed = JSON.parse(files.get('api/v2/missions.json'));
    assert.equal(feed.missions.length,source.length);
    for (let n=0;n<source.length;n++) {
      const a=source[n], b=feed.missions[n];
      for (const key of ['id','number','title','kicker','teaser','category','completed','risk','location','crew','description','note','objectives','outdatedLead','relatedMission','mapTarget']) assert.deepEqual(b[key],a[key]);
      const images=a.images?.length ? a.images : [{src:a.image,alt:a.imageAlt||''}];
      assert.equal(b.images.length,images.length);
      for(let i=0;i<images.length;i++) {
        assert.equal(b.images[i].alt,images[i].alt||'');
        const sourcePng = await readFile(path.join(root, images[i].src));
        const sourceMetadata = await sharp(sourcePng).metadata();
        assert.equal(b.images[i].width, sourceMetadata.width);
        assert.equal(b.images[i].height, sourceMetadata.height);
        for(const image of [b.images[i],b.images[i].thumbnail]) {
          assert.ok(image.url.startsWith(`${base}api/v2/assets/`));
          assert.equal(new URL(image.url).origin, new URL(base).origin);
          assert.equal(new URL(image.url).pathname.split('/').at(-1), `${image.sha256}.png`);
          const png=files.get(new URL(image.url).pathname.slice(new URL(base).pathname.length));
          assert.ok(png); assert.equal(png.length,image.bytes); assert.equal(digest(png),image.sha256);
          const meta=await sharp(png).metadata(); assert.equal(meta.format,'png'); assert.equal(meta.width,image.width); assert.equal(meta.height,image.height);
          if (image === b.images[i] && sourceMetadata.format === 'png') assert.deepEqual(png, sourcePng);
          if (image === b.images[i] && sourceMetadata.format === 'svg') assert.deepEqual(await sharp(png).ensureAlpha().raw().toBuffer(), await sharp(sourcePng).ensureAlpha().raw().toBuffer());
        }
        assert.ok(b.images[i].thumbnail.width<=512 && b.images[i].thumbnail.height<=320);
        assert.ok(b.images[i].thumbnail.width<=b.images[i].width && b.images[i].thumbnail.height<=b.images[i].height);
        assert.ok(Math.abs(b.images[i].thumbnail.width - b.images[i].width * b.images[i].thumbnail.height / b.images[i].height)<=1);
      }
    }
    assert.ok([...files.keys()].every(name=>name==='api/v2/missions.json'||/^api\/v2\/assets\/[a-f0-9]{64}\.png$/.test(name)));
  }
});

async function fixture(t) {
  const parent = path.join(root, '.cache');
  await mkdir(parent, { recursive: true });
  const directory = await mkdtemp(path.join(parent, 'mod-feed-review-'));
  t.after(async () => {
    assert.equal(path.dirname(directory), parent);
    assert.ok(path.basename(directory).startsWith('mod-feed-review-'));
    await rm(directory, { recursive: true, force: true });
  });
  await mkdir(path.join(directory, 'assets'));
  await sharp({ create: { width: 16, height: 8, channels: 3, background: '#ef6846' } }).png().toFile(path.join(directory, 'assets', 'photo.png'));
  await writeFile(path.join(directory, 'assets', 'hero-mccoy.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="65"><rect width="100" height="65" fill="#42544c"/></svg>');
  for (const file of ['index.html', 'styles.css', 'missions.js', 'share.js', '.nojekyll']) await cp(path.join(root, file), path.join(directory, file));
  const mission = { id: 'one', number: '01', title: 'One', kicker: 'Test', teaser: 'Test', category: 'field', completed: false, risk: 'LOW', location: 'Test', crew: 'Test', description: 'Test', note: 'Note', objectives: [{ text: 'Read' }], image: 'assets/photo.png', imageAlt: 'Small image' };
  const source = [mission];
  const save = () => writeFile(path.join(directory, 'missions-data.js'), `const missions = ${JSON.stringify(source)};`);
  await save();
  return { directory, source, mission, save, base: new URL('https://example.test/zomboard/') };
}

test('normal website builds include the API, preserve runtime files, and accept an empty board', async t => {
  const f = await fixture(t);
  const result = await buildPages({ root: f.directory, baseUrl: f.base.href });
  const feed = JSON.parse(await readFile(path.join(result.output, 'api/v2/missions.json'), 'utf8'));
  assert.equal(feed.missions[0].title, f.mission.title);
  for (const image of [feed.missions[0].images[0], feed.missions[0].images[0].thumbnail]) {
    const relative = new URL(image.url).pathname.slice(f.base.pathname.length);
    const bytes = await readFile(path.join(result.output, relative));
    assert.equal(digest(bytes), image.sha256);
    assert.equal(bytes.length, image.bytes);
  }
  assert.deepEqual(await readdir(path.join(result.output, 'share')), ['one.html']);
  for (const file of ['missions-data.js', 'missions.js', 'share.js', 'styles.css']) {
    assert.deepEqual(await readFile(path.join(result.output, file)), await readFile(path.join(f.directory, file)));
  }
  const html = await readFile(path.join(result.output, 'index.html'), 'utf8');
  assert.ok(html.includes('<script src="missions-data.js" defer></script>'));
  assert.ok(html.includes('<script src="missions.js" defer></script>'));
  assert.ok(html.indexOf('src="missions-data.js"') < html.indexOf('src="missions.js"'));
  assert.ok(!html.includes('api/v2/missions.json'));
  assert.deepEqual(await readdir(path.join(result.output, 'api')), ['v2']);

  // A rebuild must remove stale production v1 output from earlier builds.
  await mkdir(path.join(result.output, 'api/v1'));
  await writeFile(path.join(result.output, 'api/v1/missions.json'), '{}');
  await buildPages({ root: f.directory, baseUrl: f.base.href });
  assert.deepEqual(await readdir(path.join(result.output, 'api')), ['v2']);

  f.source.length = 0;
  await f.save();
  await buildPages({ root: f.directory, baseUrl: f.base.href });
  const empty = JSON.parse(await readFile(path.join(result.output, 'api/v2/missions.json'), 'utf8'));
  assert.deepEqual(empty, { schemaVersion: 2, missions: [], revision: digest('{"missions":[],"schemaVersion":2}') });
  assert.deepEqual(await readdir(path.join(result.output, 'share')), []);
});

test('v2 exports optional quest and objective targets independently without filling omitted values', async t => {
  const f = await fixture(t);
  const cases = [
    { ...f.mission },
    { ...f.mission, mapTarget: { x: 0, y: -9750 } },
    { ...f.mission, objectives: [{ text: 'Read', mapTarget: { x: 10620, y: 9750, zoom: 18 } }, { text: 'Return' }] },
    { ...f.mission, mapTarget: { x: -10620, y: 0, zoom: 0.5 }, objectives: [{ text: 'Read' }, { text: 'Return', mapTarget: { x: Number.MIN_SAFE_INTEGER, y: Number.MAX_SAFE_INTEGER } }] },
  ];
  for (const mission of cases) {
    const files = new Map(await prepareModFeed(f.directory, f.base, [mission]));
    const feed = JSON.parse(files.get('api/v2/missions.json'));
    assert.equal(feed.schemaVersion, 2);
    const exported = feed.missions[0];
    assert.equal(Object.hasOwn(exported, 'mapTarget'), Object.hasOwn(mission, 'mapTarget'));
    assert.deepEqual(exported.mapTarget, mission.mapTarget);
    assert.deepEqual(exported.objectives, mission.objectives);
  }
});

test('v2 rejects malformed map targets at either level, including explicit undefined and unsafe numbers', async t => {
  const f = await fixture(t);
  const invalid = [undefined, null, [], true, 12, 'target', {}, { x: 1 }, { y: 2 }];
  for (const key of ['x', 'y']) {
    for (const value of [undefined, null, '1', true, NaN, Infinity, -Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1, Number.MIN_SAFE_INTEGER - 1]) {
      invalid.push({ x: 1, y: 2, [key]: value });
    }
  }
  for (const zoom of [undefined, null, '18', true, [], {}, 0, -1, NaN, Infinity, -Infinity]) invalid.push({ x: 1, y: 2, zoom });
  for (const target of invalid) {
    for (const mission of [
      { ...f.mission, mapTarget: target },
      { ...f.mission, objectives: [{ text: 'Read', mapTarget: target }] },
    ]) {
      await assert.rejects(prepareModFeed(f.directory, f.base, [mission]), /Invalid mod-feed mapTarget/);
    }
  }
});

test('v2 requires objective objects with valid plain text and preserves output on invalid objectives or targets', async t => {
  const f = await fixture(t);
  const invalidObjectives = [undefined, null, [], 'Read', {}, { text: null }, { text: 1 }, { text: '' }, { text: ' ' }, { text: 'a'.repeat(513) }, { text: 'Bad\u0000text' }, { text: '\ud800' }];
  for (const objective of invalidObjectives) {
    await assert.rejects(prepareModFeed(f.directory, f.base, [{ ...f.mission, objectives: [objective] }]), /Invalid mod-feed/);
  }
  await assert.rejects(prepareModFeed(f.directory, f.base, [{ ...f.mission, objectives: Array(1) }]), /Invalid mod-feed objective/);

  const result = await buildPages({ root: f.directory, baseUrl: f.base.href });
  const previousFeed = await readFile(path.join(result.output, 'api/v2/missions.json'));
  const previousData = await readFile(path.join(result.output, 'missions-data.js'));
  const invalidMissions = [
    { ...f.mission, objectives: ['Read'] },
    { ...f.mission, objectives: [{ text: '' }] },
    { ...f.mission, objectives: [{ text: 'a'.repeat(513) }] },
    { ...f.mission, mapTarget: null },
    { ...f.mission, mapTarget: { x: 1 } },
    { ...f.mission, mapTarget: { x: 1, y: 2, zoom: 0 } },
    { ...f.mission, objectives: [{ text: 'Read', mapTarget: { y: 2 } }] },
    { ...f.mission, objectives: [{ text: 'Read', mapTarget: { x: '1', y: 2 } }] },
    { ...f.mission, objectives: [{ text: 'Read', mapTarget: { x: 1, y: 2, zoom: '18' } }] },
  ];
  for (const mission of invalidMissions) {
    f.source[0] = mission;
    await f.save();
    await assert.rejects(buildPages({ root: f.directory, baseUrl: f.base.href }), /Invalid (mod-feed|objectives)/);
    assert.deepEqual(await readFile(path.join(result.output, 'api/v2/missions.json')), previousFeed);
    assert.deepEqual(await readFile(path.join(result.output, 'missions-data.js')), previousData);
  }
});

test('v2 revisions cover both target levels and omitted zoom with stable canonical object keys', async t => {
  const f = await fixture(t);
  const mission = { ...f.mission, mapTarget: { x: 10620, y: 9750, zoom: 18 }, objectives: [{ text: 'Read', mapTarget: { x: -1, y: 0, zoom: 1.5 } }] };
  const build = async value => new Map(await prepareModFeed(f.directory, f.base, [value])).get('api/v2/missions.json');
  const bytes = await build(mission);
  const original = JSON.parse(bytes);
  assert.deepEqual(await build(mission), bytes);
  const reordered = structuredClone(mission);
  for (const holder of [reordered, reordered.objectives[0]]) holder.mapTarget = Object.fromEntries(Object.entries(holder.mapTarget).reverse());
  assert.deepEqual(await build(reordered), bytes);
  for (const level of ['quest', 'objective']) {
    for (const key of ['x', 'y', 'zoom']) {
      const changed = structuredClone(mission);
      const holder = level === 'quest' ? changed : changed.objectives[0];
      holder.mapTarget[key] += 1;
      assert.notEqual(JSON.parse(await build(changed)).revision, original.revision, `${level}.${key}`);
    }
    for (const removeTarget of [false, true]) {
      const changed = structuredClone(mission);
      const holder = level === 'quest' ? changed : changed.objectives[0];
      if (removeTarget) delete holder.mapTarget;
      else delete holder.mapTarget.zoom;
      assert.notEqual(JSON.parse(await build(changed)).revision, original.revision, `${level} omitted value`);
    }
  }
});

test('export rejects consumer-incompatible control characters and overlong image URLs', async t => {
  const f = await fixture(t);
  for (const character of ['\u0000', '\r', '\u007f', '\u0085', '\u009f', '\ud800']) {
    await assert.rejects(prepareModFeed(f.directory, f.base, [{ ...f.mission, title: `Before${character}after` }]), /Invalid mod-feed text/);
  }
  const legal = { ...f.mission, description: 'Line one\nLine two\twith an emoji \ud83e\udddf and café.' };
  const feed = JSON.parse(new Map(await prepareModFeed(f.directory, f.base, [legal])).get('api/v2/missions.json'));
  assert.equal(feed.missions[0].description, legal.description);
  await assert.rejects(prepareModFeed(f.directory, new URL(`https://example.test/${'a'.repeat(2000)}/`), f.source), /Invalid mod-feed text/);
});

test('thumbnails preserve full framing without enlargement for wide, tall and small images', async t => {
  const f = await fixture(t);
  const cases = [[1024, 320, 512, 160], [320, 1024, 100, 320], [16, 8, 16, 8]];
  for (const [width, height, thumbnailWidth, thumbnailHeight] of cases) {
    const png = await sharp({ create: { width, height, channels: 3, background: '#f0d9b5' } }).png().toBuffer();
    await writeFile(path.join(f.directory, 'assets', 'photo.png'), png);
    const files = new Map(await prepareModFeed(f.directory, f.base, f.source));
    const image = JSON.parse(files.get('api/v2/missions.json')).missions[0].images[0];
    assert.equal(image.width, width);
    assert.equal(image.height, height);
    assert.equal(image.thumbnail.width, thumbnailWidth);
    assert.equal(image.thumbnail.height, thumbnailHeight);
    assert.deepEqual(files.get(`api/v2/assets/${image.sha256}.png`), png);
    assert.ok(!('alt' in image.thumbnail));
  }
});

test('canonical revisions cover every exported field and ordered objective/image content', async t => {
  const f = await fixture(t);
  const mission = { ...f.mission, outdatedLead: 'Old lead', relatedMission: 'two', image: 'assets/unused.png', images: [{ src: 'assets/photo.png', alt: 'Photo' }, { src: 'assets/hero-mccoy.svg', alt: 'Drawing' }] };
  const source = [mission, { ...f.mission, id: 'two', number: '02', completed: true }];
  const build = async value => {
    const bytes = new Map(await prepareModFeed(f.directory, f.base, value)).get('api/v2/missions.json');
    const feed = JSON.parse(bytes);
    const { revision, ...content } = feed;
    const keys = new Set();
    JSON.stringify(content, (key, item) => { keys.add(key); return item; });
    assert.match(revision, /^[a-f0-9]{64}$/);
    assert.equal(revision, digest(JSON.stringify(content, [...keys].sort())));
    return { bytes, feed };
  };
  const original = await build(source);
  const reorderedKeys = source.map(item => Object.fromEntries(Object.entries(item).reverse()));
  assert.deepEqual((await build(reorderedKeys)).bytes, original.bytes);
  assert.equal(original.feed.missions[0].images.length, 2);
  assert.equal(original.feed.missions[0].images[0].alt, 'Photo');
  assert.equal(original.feed.missions[0].images[1].alt, 'Drawing');
  for (const key of ['id', 'number', 'title', 'kicker', 'teaser', 'location', 'crew', 'description', 'note', 'outdatedLead', 'relatedMission']) {
    const changed = structuredClone(source);
    changed[0][key] += key === 'id' ? '-changed' : ' changed';
    assert.notEqual((await build(changed)).feed.revision, original.feed.revision, key);
  }
  for (const [key, value] of [['category', 'base'], ['risk', 'HIGH'], ['completed', true], ['objectives', [{ text: 'Changed objective' }]]]) {
    const changed = structuredClone(source);
    changed[0][key] = value;
    assert.notEqual((await build(changed)).feed.revision, original.feed.revision, key);
  }
  const changedAlt = structuredClone(source);
  changedAlt[0].images[1].alt = 'Changed drawing description';
  assert.notEqual((await build(changedAlt)).feed.revision, original.feed.revision);
  const changedOrder = structuredClone(source);
  changedOrder[0].images.reverse();
  assert.notEqual((await build(changedOrder)).feed.revision, original.feed.revision);
  const objectiveOrder = structuredClone(source);
  objectiveOrder[0].objectives = [{ text: 'First' }, { text: 'Second' }];
  const before = (await build(objectiveOrder)).feed.revision;
  objectiveOrder[0].objectives.reverse();
  assert.notEqual((await build(objectiveOrder)).feed.revision, before);
});

test('v2 limits reject oversized source data and preserve prior build output on validation failure', async t => {
  const f = await fixture(t);
  const prepare = source => prepareModFeed(f.directory, f.base, source);
  const result = await buildPages({ root: f.directory, baseUrl: f.base.href });
  const before = await readFile(path.join(result.output, 'api/v2/missions.json'));
  const invalid = [
    { ...f.mission, id: 'a'.repeat(81) },
    { ...f.mission, title: 'a'.repeat(257) },
    { ...f.mission, teaser: 'a'.repeat(513) },
    { ...f.mission, description: 'a'.repeat(8193) },
    { ...f.mission, outdatedLead: 'a'.repeat(8193) },
    { ...f.mission, objectives: [] },
    { ...f.mission, objectives: Array(17).fill({ text: 'One' }) },
    { ...f.mission, objectives: [{ text: 'a'.repeat(513) }] },
    { ...f.mission, imageAlt: 'a'.repeat(513) },
  ];
  for (const mission of invalid) await assert.rejects(prepare([mission]), /Invalid mod-feed/);
  await assert.rejects(prepare(Array(129).fill(f.mission)), /at most 128/);
  const large = Array.from({ length: 128 }, (_, n) => ({ ...f.mission, id: `quest-${n}`, description: 'a'.repeat(8192), note: 'b'.repeat(8192) }));
  await assert.rejects(prepare(large), /exceeds 1 MiB/);
  const accepted = Array.from({ length: 128 }, (_, n) => ({ ...f.mission, id: `quest-${n}` }));
  assert.equal(JSON.parse(new Map(await prepare(accepted)).get('api/v2/missions.json')).missions.length, 128);

  f.mission.title = 'a'.repeat(257);
  await f.save();
  await assert.rejects(buildPages({ root: f.directory, baseUrl: f.base.href }), /Invalid mod-feed text/);
  assert.deepEqual(await readFile(path.join(result.output, 'api/v2/missions.json')), before);
  f.mission.title = 'One';
  await f.save();
  for (const [width, height] of [[4097, 1], [3000, 3000]]) {
    await sharp({ create: { width, height, channels: 3, background: '#000000' } }).png().toFile(path.join(f.directory, 'assets', 'photo.png'));
    await assert.rejects(prepare(f.source));
  }
  await writeFile(path.join(f.directory, 'assets', 'photo.png'), Buffer.alloc(8 * 1024 * 1024 + 1));
  await assert.rejects(prepare(f.source), /byte limit/);
});

test('mod revisions are deterministic and cover text, order, completion and image bytes; invalid input fails before publication', async t => {
  const parent=path.join(root,'.cache'); await mkdir(parent,{recursive:true}); const dir=await mkdtemp(path.join(parent,'feed-test-'));
  t.after(async()=>{ assert.equal(path.dirname(dir),parent); await rm(dir,{recursive:true,force:true}); });
  await mkdir(path.join(dir,'assets')); const image=path.join(dir,'assets','photo.png');
  await sharp({create:{width:16,height:8,channels:3,background:'#ef6846'}}).png().toFile(image);
  const m={id:'one',number:'01',title:'One',kicker:'Test',teaser:'Test',category:'field',completed:false,risk:'LOW',location:'Test',crew:'Test',description:'Test',note:'',objectives:[{text:'Read'}],image:'assets/photo.png'};
  const source=[m,{...m,id:'two',number:'02'}], base=new URL('https://example.test/zomboard/');
  const build=async()=>JSON.parse(new Map(await prepareModFeed(dir,base,source)).get('api/v2/missions.json'));
  const original=await build(); assert.deepEqual(await build(),original);
  source[0].completed=true; assert.notEqual((await build()).revision,original.revision); source[0].completed=false;
  source.reverse(); assert.notEqual((await build()).revision,original.revision); source.reverse();
  source[0].description+=' changed'; assert.notEqual((await build()).revision,original.revision); source[0].description='Test';
  await sharp({create:{width:16,height:8,channels:3,background:'#000000'}}).png().toFile(image);
  assert.notEqual((await build()).revision,original.revision);
  source[0].id='two'; await assert.rejects(build,/duplicate/); source[0].id='one';
  source[0].image='../outside.png'; await assert.rejects(build,/path/); source[0].image='assets/photo.png';
  source[0].images=Array(9).fill({src:'assets/photo.png'}); await assert.rejects(build,/Too many/); delete source[0].images;
  await writeFile(image,'broken'); await assert.rejects(build);
  const empty=JSON.parse(new Map(await prepareModFeed(dir,base,[])).get('api/v2/missions.json')); assert.deepEqual(empty.missions,[]);
});
