const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdir, mkdtemp, readFile, writeFile, readdir } = require('node:fs/promises');
const path = require('node:path');
const { suggestIdentity } = require('../quest-identity.js');
const { QuestStore, appendQuest } = require('../quest-store.cjs');
const { parseDocument, parseMissions } = require('../quest-reader.cjs');
const { AssetLibrary } = require('../asset-library.cjs');
const root = path.resolve(__dirname, '../..');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5O8AAAAASUVORK5CYII=', 'base64');
const edits = () => ({ id: 'supply-run', number: '17', title: 'Supply run', completed: false, kicker: 'FIELD OPERATION', category: 'field', risk: 'MEDIUM', location: 'Muldraugh', crew: 'Two survivors', teaser: 'Bring useful supplies.', description: 'Visit the warehouse.', note: 'Bring a bag.', objectives: [{ sourceIndex: null, text: 'Return safely.' }], images: [{ sourceIndex: null, src: 'assets/test.png', alt: 'A supply crate.' }] });
const textAndMetadata = mission => Object.fromEntries(['title', 'teaser', 'description', 'note', 'kicker', 'category', 'risk', 'location', 'crew', 'completed'].map(key => [key, mission[key]]));
async function fixture(source) {
  const parent = path.join(root, '.cache/quest-create-checks'); await mkdir(parent, { recursive: true });
  const directory = await mkdtemp(path.join(parent, 'checkout with spaces '));
  source ??= await readFile(path.join(root, 'missions-data.js'), 'utf8');
  const filename = path.join(directory, 'missions-data.js'); await writeFile(filename, source);
  await mkdir(path.join(directory, 'assets')); await writeFile(path.join(directory, 'assets/test.png'), png);
  const assets = new AssetLibrary(directory, async () => ({ width: 1, height: 1, preview: 'data:image/png;base64,' + png.toString('base64') }));
  return { directory, filename, source, assets, store: await QuestStore.open(directory) };
}

test('identity suggestions handle collisions, Unicode, long titles and exhausted display numbers', () => {
  assert.deepEqual(suggestIdentity([]), { id: 'new-quest', number: '01' });
  assert.deepEqual(suggestIdentity([{ id: 'new-quest', number: '16' }]), { id: 'new-quest-2', number: '17' });
  assert.equal(suggestIdentity([{ id: 'cafe-run', number: '01' }, { id: 'cafe-run-2', number: '03' }], ' Café / Run! ').id, 'cafe-run-3');
  const long = 'a'.repeat(80); const id = suggestIdentity([{ id: long, number: '99' }], long).id;
  assert.equal(id.length, 80); assert.ok(id.endsWith('-2'));
  assert.equal(suggestIdentity([{ id: 'one', number: '99' }]).number, '01');
  assert.equal(suggestIdentity(Array.from({ length: 99 }, (_, i) => ({ id: `q-${i}`, number: String(i + 1).padStart(2, '0') }))).number, '');
  assert.equal(suggestIdentity([], '🪓').id, 'new-quest');
});

test('append preserves existing quest source, comments, trailing commas, BOM and CRLF; empty boards work', async () => {
  const original = await readFile(path.join(root, 'missions-data.js'), 'utf8');
  const mission = parseMissions(original)[0]; delete mission.relatedMission;
  const one = JSON.stringify(mission);
  for (const source of ['const missions = [];', `const missions = [ // no quests\n];`, `const missions = [${one} // last quest\n];`, `const missions = [${one}, /* trailing comma */\n];`, `\ufeff'use strict';\r\nconst missions = [${one}\r\n// retain comment\r\n];\r\n`]) {
    const before = parseDocument(source), after = appendQuest(before, edits());
    assert.deepEqual(after.missions.slice(0, -1), before.missions);
    assert.equal(after.missions.at(-1).id, 'supply-run');
    for (const node of before.nodes) assert.ok(after.source.includes(source.slice(node.start, node.end)));
    if (source.includes('//')) assert.ok(after.source.includes(source.slice(source.indexOf('//'), source.indexOf('\n', source.indexOf('//')))));
    assert.equal(after.source.startsWith('\ufeff'), source.startsWith('\ufeff'));
    if (source.includes('\r\n')) assert.equal(/(?<!\r)\n/.test(after.source), false);
    assert.equal(Object.hasOwn(after.missions.at(-1), 'mapTarget'), false);
    assert.equal(Object.hasOwn(after.missions.at(-1), 'relatedMission'), false);
  }
});

test('create appends once, validates images, keeps exact backup and locks saved identity', async () => {
  const f = await fixture(); const original = structuredClone(f.store.board.missions);
  const result = await f.store.create(edits(), { assets: f.assets });
  assert.equal(result.saved, true); assert.equal(result.board.missions.length, 17);
  assert.deepEqual(result.board.missions.slice(0, -1), original);
  assert.equal(result.board.missions.at(-1).completed, false);
  assert.equal(await readFile(path.join(f.directory, result.backup), 'utf8'), f.source);
  const reopened = await QuestStore.open(f.directory);
  assert.deepEqual(reopened.board.missions, result.board.missions);
  await assert.rejects(reopened.save('supply-run', { ...textAndMetadata(reopened.board.missions.at(-1)), id: 'changed' }), /Saved IDs/);
  await assert.rejects(reopened.create(edits(), { assets: f.assets }), error => Boolean(error.fieldErrors?.id));
  assert.equal((await readdir(path.join(f.directory, '.cache/quest-editor/backups'))).length, 1);
});

test('existing quest details and completion save without altering IDs, numbers, targets or other quests', async () => {
  const f = await fixture(); const expected = structuredClone(f.store.board.missions);
  const changes = { ...textAndMetadata(expected[0]), kicker: 'HOMEFRONT', category: 'base', risk: 'LOW', location: 'Safehouse', crew: 'Everyone', completed: false };
  Object.assign(expected[0], changes);
  const result = await f.store.save('bunker', changes);
  assert.deepEqual(result.board.missions, expected);
  const bytes = await readFile(f.filename);
  assert.equal((await f.store.save('bunker', changes)).saved, false);
  assert.deepEqual(await readFile(f.filename), bytes);
});

test('invalid creation and metadata fail beside fields and never write', async () => {
  const f = await fixture();
  for (const [key, value] of [['id', 'bunker'], ['id', 'Invalid ID'], ['id', 'a'.repeat(81)], ['number', '1'], ['number', 17], ['category', 'other'], ['risk', 'low'], ['completed', 'false'], ['kicker', ''], ['location', 'x'.repeat(257)], ['crew', '\u0000'], ['objectives', [{ sourceIndex: 0, text: 'Injected original' }]], ['images', []], ['images', [{ sourceIndex: 0, src: 'assets/test.png', alt: '' }]]]) {
    await assert.rejects(f.store.create({ ...edits(), [key]: value }, { assets: f.assets }), error => Boolean(error.fieldErrors));
  }
  await assert.rejects(f.store.create({ ...edits(), mapTarget: { x: 1, y: 2 } }, { assets: f.assets }), /Only title/);
  const mission = f.store.board.missions[0];
  for (const [key, value] of [['completed', null], ['category', 'other'], ['risk', 'low'], ['crew', '']]) await assert.rejects(f.store.save(mission.id, { ...textAndMetadata(mission), [key]: value }), error => Boolean(error.fieldErrors?.[key]));
  assert.equal(await readFile(f.filename, 'utf8'), f.source);
  assert.deepEqual(await readdir(f.directory), ['assets', 'missions-data.js']);
});

test('new quests require validated assets and refuse missing or case-mismatched paths', async () => {
  const f = await fixture('const missions = [];');
  await assert.rejects(f.store.create(edits()), /validation is unavailable/);
  for (const src of ['assets/TEST.png', 'assets/missing.png']) await assert.rejects(f.store.create({ ...edits(), images: [{ sourceIndex: null, src, alt: '' }] }, { assets: f.assets }));
  assert.equal(await readFile(f.filename, 'utf8'), f.source);
});

test('creation enforces the 128-quest bound and preserves original ordering and numbering', () => {
  const missions = Array.from({ length: 128 }, (_, index) => ({ ...edits(), id: `quest-${index}`, number: '01', objectives: [{ text: 'Objective' }], images: [{ src: 'assets/test.png' }] }));
  assert.throws(() => appendQuest(parseDocument('const missions = ' + JSON.stringify(missions)), edits()), /128/);
});

test('external edits and failure after import leave creation draft retryable and source intact', async () => {
  const f = await fixture(); const input = path.join(f.directory, 'import.png'); await writeFile(input, png);
  const image = await f.assets.stage(input); const draft = { ...edits(), images: [{ sourceIndex: null, src: image.src, alt: '' }] };
  await assert.rejects(f.store.create(draft, { assets: f.assets, checkpoint: async phase => { if (phase === 'images') throw new Error('Interrupted before replacement'); } }), /Interrupted/);
  assert.equal(await readFile(f.filename, 'utf8'), f.source); assert.equal(f.assets.staged.size, 1);
  assert.deepEqual(await readFile(path.join(f.directory, image.src)), png);
  const external = f.source + '\n// external edit'; await writeFile(f.filename, external);
  await assert.rejects(f.store.create(draft, { assets: f.assets }), /CONFLICT/);
  assert.equal(await readFile(f.filename, 'utf8'), external);
  const reopened = await QuestStore.open(f.directory);
  assert.equal((await reopened.create(draft, { assets: f.assets })).board.missions.length, 17);
});
