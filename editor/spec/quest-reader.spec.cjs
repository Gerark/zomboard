const test = require('node:test');
const assert = require('node:assert/strict');
const { readFile, mkdir, mkdtemp, writeFile, readdir } = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');
const { parseMissions, loadBoard } = require('../quest-reader.cjs');

const root = path.resolve(__dirname, '../..');
const mission = {
  id: 'one', number: '01', title: 'One', kicker: 'RUN', category: 'field', risk: 'LOW',
  completed: false, location: 'Safehouse', crew: '2 survivors', teaser: 'A teaser.',
  description: 'A description.', note: 'A note.', objectives: [{ text: 'Return alive' }],
  image: 'assets/one.png', imageAlt: 'An image reference'
};
const source = missions => `'use strict';\nconst missions = ${JSON.stringify(missions)};\n`;

test('real quests load in source order with all fields and no source-folder changes', async () => {
  const filename = path.join(root, 'missions-data.js');
  const before = await readFile(filename);
  const files = await readdir(root);
  const loaded = await loadBoard(root);
  // Only this known, curated file is evaluated for an independent comparison.
  const expected = JSON.parse(vm.runInNewContext(`${before.toString()}\nJSON.stringify(missions)`));
  assert.deepEqual(loaded.missions, expected);
  assert.equal(loaded.missions.length, 16);
  assert.equal(loaded.missions.filter(m => m.completed).length, 7);
  assert.deepEqual(await readFile(filename), before);
  assert.deepEqual(await readdir(root), files);
});

test('static data parser never executes expressions, getters, spreads or other statements', () => {
  globalThis.questReaderExecuted = false;
  const invalid = [
    'const missions = (globalThis.questReaderExecuted = true, []);',
    'const missions = []; globalThis.questReaderExecuted = true;',
    'const missions = [(()=>{globalThis.questReaderExecuted = true; return {};})()];',
    'const missions = [{get title(){globalThis.questReaderExecuted = true}}];',
    'const missions = [{...other}];', 'const missions = [,];',
    'const missions = [{id:"a",id:"b"}];', 'const missions = [{__proto__:{}}];',
    'const missions = [{["id"]:"one"}];', 'const missions = [{value: /x/}];',
    'const missions = [{value: 1e999}];', 'let missions = [];'
  ];
  for (const value of invalid) assert.throws(() => parseMissions(value));
  assert.equal(globalThis.questReaderExecuted, false);
  delete globalThis.questReaderExecuted;
});

test('optional metadata, negative coordinates and zero survive without defaults or inheritance', () => {
  const original = { ...mission, mapTarget: { x: 0, y: -50 }, objectives: [{ text: 'First', mapTarget: { x: -1, y: 0, zoom: 0.5 } }, { text: 'Second' }], relatedMission: 'two', outdatedLead: 'An old lead.' };
  const second = { ...mission, id: 'two', number: '02', completed: true };
  const parsed = parseMissions(source([original, second]));
  assert.deepEqual(parsed, [original, second]);
  assert.equal(Object.hasOwn(parsed[0].mapTarget, 'zoom'), false);
  assert.equal(Object.hasOwn(parsed[0].objectives[1], 'mapTarget'), false);
  assert.deepEqual(parseMissions('// Empty board\nconst missions = [];'), []);
});

test('ordered image list takes precedence over unused legacy image fields', () => {
  const original = { ...mission, image: 'unused-invalid', imageAlt: null, images: [{ src: 'assets/first.png', alt: 'First' }, { src: 'assets/second.svg', alt: 'Second' }] };
  assert.deepEqual(parseMissions(source([original]))[0].images, original.images);
});

test('malformed fields, duplicate IDs, objectives, map targets and relationships fail clearly', () => {
  for (const changed of [
    { ...mission, completed: 'false' }, { ...mission, number: '1' },
    { ...mission, title: null }, { ...mission, category: 'other' },
    { ...mission, risk: 'unknown' }, { ...mission, objectives: ['legacy'] },
    { ...mission, objectives: [] }, { ...mission, mapTarget: null },
    { ...mission, mapTarget: { x: '1', y: 2 } },
    { ...mission, mapTarget: { x: 1.1, y: 2 } },
    { ...mission, mapTarget: { x: Number.MAX_SAFE_INTEGER + 1, y: 2 } },
    { ...mission, objectives: [{ text: 'Go', mapTarget: { x: 1, y: 2, zoom: 0 } }] },
    { ...mission, relatedMission: 'missing' }, { ...mission, relatedMission: 'one' },
    { ...mission, image: '../outside.png' }, { ...mission, images: null }
  ]) assert.throws(() => parseMissions(source([changed])));
  assert.throws(() => parseMissions(source([mission, mission])), /duplicate/);
});

test('folder reader handles spaces, missing files, invalid UTF-8, malformed and oversized source read-only', async () => {
  const parent = path.join(root, '.cache/quest-reader-checks');
  await mkdir(parent, { recursive: true });
  const directory = await mkdtemp(path.join(parent, 'folder with spaces '));
  await assert.rejects(loadBoard(directory), /no missions-data.js/);
  const filename = path.join(directory, 'missions-data.js');
  const content = source([mission]);
  await writeFile(filename, content);
  assert.deepEqual((await loadBoard(directory)).missions, [mission]);
  assert.equal(await readFile(filename, 'utf8'), content);
  assert.deepEqual(await readdir(directory), ['missions-data.js']);
  await writeFile(filename, 'const missions = [broken];');
  await assert.rejects(loadBoard(directory), /static quest data/);
  await writeFile(filename, Buffer.from([0xff, 0xfe, 0xff]));
  await assert.rejects(loadBoard(directory), /encoded data|encoding/i);
  await writeFile(filename, ' '.repeat(2 * 1024 * 1024 + 1));
  await assert.rejects(loadBoard(directory), /2 MiB/);
  assert.throws(() => parseMissions(' '.repeat(2 * 1024 * 1024 + 1)), /2 MiB/);
});
