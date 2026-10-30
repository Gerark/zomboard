import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import sharp from 'sharp';
import { buildPages } from '../scripts/build-pages.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtureParent = path.join(root, '.cache');
const baseUrl = 'https://example.test/zomboard/';

async function fixture(t) {
  await mkdir(fixtureParent, { recursive: true });
  const dir = await mkdtemp(path.join(fixtureParent, 'preview-test-'));
  t.after(async () => {
    const relative = path.relative(fixtureParent, dir);
    assert.ok(relative.startsWith('preview-test-') && !relative.includes(path.sep));
    await rm(dir, { recursive: true, force: true });
  });
  await mkdir(path.join(dir, 'assets'));
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="65"><rect width="100" height="65" fill="#42544c"/></svg>';
  await writeFile(path.join(dir, 'assets', 'drawing.svg'), svg);
  await writeFile(path.join(dir, 'assets', 'hero-mccoy.svg'), svg);
  await sharp({ create: { width: 80, height: 60, channels: 3, background: '#ef6846' } }).png().toFile(path.join(dir, 'assets', 'photo.png'));
  for (const file of ['styles.css', 'missions.js', 'share.js', '.nojekyll']) await writeFile(path.join(dir, file), '');
  await writeFile(path.join(dir, 'index.html'), '<meta property="og:image" content="assets/hero-mccoy.svg">\n<!-- MISSION_SHARE_CONFIG -->');
  const mission = { id: 'photo', number: '01', title: 'Food & "friends" <script>bad()</script>', teaser: 'Supplies > nothing. </script>', kicker: 'SUPPLY RUN', category: 'field', risk: 'HIGH', completed: false, location: 'Knox County', crew: '2 survivors', description: 'A supply run.', note: 'Bring bags.', objectives: ['Return home'], images: [{ src: 'assets/photo.png', alt: 'A "photo" & supplies' }, { src: 'assets/drawing.svg', alt: 'A drawing' }], image: 'assets/unused-missing.png' };
  const missions = [mission, { ...mission, id: 'drawing', number: '02', images: [], image: 'assets/drawing.svg', imageAlt: 'An illustrated stove', relatedMission: 'photo' }];
  const save = () => writeFile(path.join(dir, 'missions-data.js'), `const missions = ${JSON.stringify(missions)};`);
  await save();
  return { dir, missions, save };
}

function metadata(html, property) {
  const value = html.match(new RegExp(`<meta property="${property}" content="([^"]*)">`));
  assert.ok(value, `Missing ${property}`);
  return value[1].replaceAll('&amp;', '&');
}

test('builds static mission metadata from existing text and first images; only SVGs are converted', async t => {
  const f = await fixture(t);
  await writeFile(path.join(f.dir, 'private.txt'), 'must not be published');
  const result = await buildPages({ root: f.dir, baseUrl });
  assert.equal(result.missionCount, 2);
  const photo = await readFile(path.join(result.output, 'share', 'photo.html'), 'utf8');
  assert.ok(photo.includes('Food &amp; &quot;friends&quot; &lt;script&gt;bad()&lt;/script&gt;'));
  assert.ok(photo.includes('Supplies &gt; nothing. &lt;/script&gt;'));
  assert.ok(!photo.includes('<script>bad()'));
  assert.ok(!photo.includes('http-equiv="refresh"'));
  assert.ok(metadata(photo, 'og:url').startsWith(`${baseUrl}share/photo.html?v=`));
  assert.ok(metadata(photo, 'og:image').startsWith(`${baseUrl}assets/photo.png?v=`));
  assert.equal(metadata(photo, 'og:image:width'), '80');
  assert.equal(metadata(photo, 'og:image:height'), '60');
  assert.deepEqual(await readFile(path.join(result.output, 'assets', 'photo.png')), await readFile(path.join(f.dir, 'assets', 'photo.png')));
  const drawing = await readFile(path.join(result.output, 'share', 'drawing.html'), 'utf8');
  const drawingUrl = new URL(metadata(drawing, 'og:image'));
  assert.ok(drawingUrl.pathname.match(/\/assets\/share\/drawing-[a-f0-9]+\.png$/));
  const generated = path.join(result.output, drawingUrl.pathname.replace('/zomboard/', ''));
  assert.equal((await sharp(generated).metadata()).format, 'png');
  assert.ok(drawing.includes('href="../index.html?mission=drawing"'));
  const index = await readFile(path.join(result.output, 'index.html'), 'utf8');
  assert.ok(index.includes('id="mission-share-config"'));
  assert.ok(metadata(index, 'og:image').includes('/assets/share/hero-mccoy-'));
  assert.ok(!index.includes('MISSION_SHARE_CONFIG'));
  const published = await readdir(result.output);
  assert.ok(!published.includes('private.txt'));
  assert.ok(!published.includes('package.json'));
  assert.ok(published.includes('.nojekyll'));
});

test('revisions are stable and respond to preview text and first-image changes; deleted missions leave no stale pages', async t => {
  const f = await fixture(t);
  const initial = await buildPages({ root: f.dir, baseUrl });
  assert.deepEqual((await buildPages({ root: f.dir, baseUrl })).shareLinks, initial.shareLinks);
  f.missions[0].teaser = 'An updated lead';
  await f.save();
  const changed = await buildPages({ root: f.dir, baseUrl });
  assert.notEqual(changed.shareLinks.photo, initial.shareLinks.photo);
  assert.equal(changed.shareLinks.drawing, initial.shareLinks.drawing);
  await sharp({ create: { width: 80, height: 60, channels: 3, background: '#000000' } }).png().toFile(path.join(f.dir, 'assets', 'photo.png'));
  const newImage = await buildPages({ root: f.dir, baseUrl });
  assert.notEqual(newImage.shareLinks.photo, changed.shareLinks.photo);
  f.missions.pop();
  await f.save();
  await buildPages({ root: f.dir, baseUrl });
  assert.deepEqual(await readdir(path.join(initial.output, 'share')), ['photo.html']);
});

test('rejects invalid IDs, relationships, asset casing and paths before replacing output', async t => {
  const f = await fixture(t);
  f.missions[1].id = 'photo';
  await f.save();
  await assert.rejects(buildPages({ root: f.dir, baseUrl }), /duplicate mission ID/);
  f.missions[1].id = 'drawing';
  f.missions[1].relatedMission = 'missing';
  await f.save();
  await assert.rejects(buildPages({ root: f.dir, baseUrl }), /Invalid related mission/);
  f.missions[1].relatedMission = 'photo';
  f.missions[0].images[0].src = 'assets/Photo.png';
  await f.save();
  await assert.rejects(buildPages({ root: f.dir, baseUrl }), /case-mismatched asset/);
  f.missions[0].images[0].src = 'assets/../private.png';
  await f.save();
  await assert.rejects(buildPages({ root: f.dir, baseUrl }), /local PNG or SVG/);
  await assert.rejects(buildPages({ root: f.dir, baseUrl: 'https://example.test/?token=secret' }), /without credentials, a query or a hash/);
});

test('requires a boolean completed flag and preserves the previous output when invalid', async t => {
  const f = await fixture(t);
  f.missions[1].completed = true;
  await f.save();
  const result = await buildPages({ root: f.dir, baseUrl });
  assert.ok((await readdir(path.join(result.output, 'share'))).includes('drawing.html'));
  const original = await readFile(path.join(result.output, 'missions-data.js'), 'utf8');
  for (const invalid of [undefined, null, 'false', 'true', 0, 1]) {
    f.missions[0].completed = invalid;
    await f.save();
    await assert.rejects(buildPages({ root: f.dir, baseUrl }), /Invalid completed flag: photo/);
    assert.equal(await readFile(path.join(result.output, 'missions-data.js'), 'utf8'), original);
  }
});

test('refuses to remove an existing output folder it does not own', async t => {
  const f = await fixture(t);
  await mkdir(path.join(f.dir, '_site'));
  await writeFile(path.join(f.dir, '_site', 'keep.txt'), 'keep this');
  await assert.rejects(buildPages({ root: f.dir, baseUrl }), /without its .zomboard-output marker/);
  assert.equal(await readFile(path.join(f.dir, '_site', 'keep.txt'), 'utf8'), 'keep this');
});
