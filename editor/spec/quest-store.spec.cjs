const test = require('node:test');
const assert = require('node:assert/strict');
const { readFile, writeFile, readdir, mkdir, mkdtemp } = require('node:fs/promises');
const path = require('node:path');
const { QuestStore } = require('../quest-store.cjs');
const { parseMissions } = require('../quest-reader.cjs');

const root = path.resolve(__dirname, '../..');
const textOf = mission => Object.fromEntries(['title', 'teaser', 'description', 'note'].map(key => [key, mission[key]]));
async function fixture() {
  const parent = path.join(root, '.cache/quest-store-checks');
  await mkdir(parent, { recursive: true });
  const directory = await mkdtemp(path.join(parent, 'source folder '));
  const source = await readFile(path.join(root, 'missions-data.js'));
  const filename = path.join(directory, 'missions-data.js');
  await writeFile(filename, source);
  return { directory, source, filename, store: await QuestStore.open(directory) };
}

test('saving four fields changes only their literal ranges, preserves all other data and keeps an exact backup', async () => {
  const f = await fixture();
  const before = parseMissions(f.source.toString());
  const edits = { title: 'A "quoted" title & <text>', teaser: "A survivor's teaser.", description: 'First line.\nSecond line: Ω 🪓 \u2028end.', note: 'Bring supplies.\tStay alive.' };
  const result = await f.store.save(before[0].id, edits);
  assert.equal(result.saved, true);
  assert.deepEqual(await readFile(path.join(f.directory, result.backup)), f.source);
  const saved = await readFile(f.filename, 'utf8');
  const expected = structuredClone(before);
  Object.assign(expected[0], edits);
  assert.deepEqual(parseMissions(saved), expected);
  assert.ok(saved.startsWith(f.source.toString().slice(0, f.source.toString().indexOf("title: 'THE BUNKER MYSTERY'"))));
  const untouched = f.source.toString().slice(f.source.toString().indexOf("id: 'groceries'"));
  assert.ok(saved.endsWith(untouched));
  const reopened = await QuestStore.open(f.directory);
  assert.deepEqual(reopened.board.missions, expected);
  assert.equal(Object.hasOwn(reopened.board.missions[0].objectives[0].mapTarget, 'zoom'), false);
  assert.deepEqual(await readdir(path.join(f.directory, '.cache/quest-editor')), ['backups']);
  const next = { ...edits, note: 'A second saved note.' };
  assert.equal((await reopened.save(before[0].id, next)).saved, true);
  assert.equal(parseMissions(await readFile(f.filename, 'utf8'))[0].note, next.note);
});

test('no-change saves preserve bytes and create no cache or backup', async () => {
  const f = await fixture();
  assert.equal((await f.store.save('bunker', textOf(f.store.board.missions[0]))).saved, false);
  assert.deepEqual(await readFile(f.filename), f.source);
  assert.deepEqual(await readdir(f.directory), ['missions-data.js']);
});

test('generated deployment output is refused as an editing workspace', async () => {
  const f = await fixture();
  await writeFile(path.join(f.directory, '.zomboard-output'), 'Generated deployment output');
  await assert.rejects(QuestStore.open(f.directory), /Generated _site output cannot be edited/);
  assert.deepEqual(await readFile(f.filename), f.source);
});

test('comments, CRLF, UTF-8 BOM, Unicode and unknown metadata survive a text save', async () => {
  const f = await fixture();
  const source = `\ufeff${f.source.toString().replace(/\r?\n/g, '\r\n').replace("title: 'THE BUNKER MYSTERY'", "title: /* keep this comment */ 'THE BUNKER MYSTERY'").replace("id: 'groceries'", "extraMetadata: { keep: ['Ω', 0, false] }, id: 'groceries'")}`;
  await writeFile(f.filename, source);
  const store = await QuestStore.open(f.directory);
  const edits = { ...textOf(store.board.missions[0]), title: 'Updated Ω title' };
  await store.save('bunker', edits);
  const saved = await readFile(f.filename, 'utf8');
  assert.equal(saved, source.replace("'THE BUNKER MYSTERY'", JSON.stringify(edits.title)));
  assert.deepEqual(parseMissions(saved)[1].extraMetadata, { keep: ['Ω', 0, false] });
});

test('empty, oversized, control-character and ill-formed text fail with field errors without writes', async () => {
  const f = await fixture();
  const original = textOf(f.store.board.missions[0]);
  for (const [key, value] of [['title', ' '], ['teaser', 'x'.repeat(513)], ['description', 'x'.repeat(8193)], ['note', '\u0000bad'], ['title', '\ud800']]) {
    await assert.rejects(f.store.save('bunker', { ...original, [key]: value }), error => Boolean(error.fieldErrors?.[key]));
  }
  for (const edits of [null, [], { ...original, id: 'renamed' }, { ...original, number: '99' }, { title: 'Only title' }]) await assert.rejects(f.store.save('bunker', edits), /Only title/);
  await assert.rejects(f.store.save('unknown', original), /not in the loaded board/);
  assert.deepEqual(await readFile(f.filename), f.source);
  assert.deepEqual(await readdir(f.directory), ['missions-data.js']);
});

test('external edits before saving are retained and the stale editor cannot write', async () => {
  const f = await fixture();
  const external = Buffer.concat([f.source, Buffer.from('\n// Changed outside the app.\n')]);
  await writeFile(f.filename, external);
  await assert.rejects(f.store.save('bunker', { ...textOf(f.store.board.missions[0]), title: 'Draft' }), /CONFLICT/);
  assert.deepEqual(await readFile(f.filename), external);
  assert.deepEqual(await readdir(f.directory), ['missions-data.js']);
});

test('external edits during preparation are detected immediately before replacement', async () => {
  const f = await fixture();
  const external = Buffer.concat([f.source, Buffer.from('\n// Concurrent outside edit.\n')]);
  await assert.rejects(f.store.save('bunker', { ...textOf(f.store.board.missions[0]), title: 'Draft' }, {
    checkpoint: async () => writeFile(f.filename, external)
  }), /CONFLICT/);
  assert.deepEqual(await readFile(f.filename), external);
  assert.deepEqual(await readdir(path.join(f.directory, '.cache/quest-editor')), ['backups']);
});

test('failed preparation leaves source intact, retains the backup and removes temporary state', async () => {
  const f = await fixture();
  await assert.rejects(f.store.save('bunker', { ...textOf(f.store.board.missions[0]), title: 'Draft' }, {
    checkpoint: async () => { throw new Error('Simulated failure before replacement'); }
  }), /Simulated failure/);
  assert.deepEqual(await readFile(f.filename), f.source);
  const cache = path.join(f.directory, '.cache/quest-editor');
  assert.deepEqual(await readdir(cache), ['backups']);
  const backups = await readdir(path.join(cache, 'backups'));
  assert.equal(backups.length, 1);
  assert.deepEqual(await readFile(path.join(cache, 'backups', backups[0])), f.source);
});

test('simultaneous saves respect the lock and a second stale session then reports a conflict', async () => {
  const f = await fixture();
  const second = await QuestStore.open(f.directory);
  const edits = { ...textOf(f.store.board.missions[0]), title: 'First writer' };
  await f.store.save('bunker', edits, {
    checkpoint: async () => {
      await assert.rejects(second.save('bunker', { ...edits, title: 'Second writer' }), /save lock/);
    }
  });
  await assert.rejects(second.save('bunker', { ...edits, title: 'Second writer' }), /CONFLICT/);
  assert.equal(parseMissions(await readFile(f.filename, 'utf8'))[0].title, edits.title);
});
