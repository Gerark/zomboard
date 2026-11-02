const { open, lstat, mkdir, readFile, rename, unlink, realpath } = require('node:fs/promises');
const { createHash, randomUUID } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');
const path = require('node:path');
const { loadDocument, parseDocument } = require('./quest-reader.cjs');
const { imageList, imagePath } = require('./asset-library.cjs');
const { tokenizer } = require('acorn');

const fields = Object.freeze({ title: 256, teaser: 512, description: 8192, note: 8192 });
const metadataText = Object.freeze({ kicker: 256, location: 256, crew: 256 });
const metadataKeys = ['kicker', 'location', 'crew', 'category', 'risk', 'completed'];
const cache = ['.cache', 'quest-editor'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function validateEdits(edits, creating = false) {
  const allowed = [...Object.keys(fields), ...metadataKeys, 'objectives', 'images', ...(creating ? ['id', 'number'] : [])];
  if (!edits || typeof edits !== 'object' || Array.isArray(edits) || Object.keys(fields).some(key => !Object.hasOwn(edits, key)) || Object.keys(edits).some(key => !allowed.includes(key))) throw new Error('Only title, teaser, description, field notes, quest details, objectives and images can be saved. Saved IDs and numbers are locked.');
  const errors = {};
  for (const [key, limit] of Object.entries({ ...fields, ...metadataText })) {
    if (!creating && !Object.hasOwn(edits, key)) continue;
    const value = edits[key];
    if (typeof value !== 'string' || !value.trim()) errors[key] = 'Enter nonempty text.';
    else if (value.length > limit) errors[key] = `Use at most ${limit} characters.`;
    else if (/[\x00-\x08\x0b-\x1f\x7f-\x9f]/.test(value) || !value.isWellFormed()) errors[key] = 'Remove unsupported control characters or invalid Unicode.';
  }
  for (const [key, values] of [['category', ['field', 'base']], ['risk', ['LOW', 'MEDIUM', 'HIGH', 'SEVERE']]]) {
    if ((creating || Object.hasOwn(edits, key)) && !values.includes(edits[key])) errors[key] = `Choose a valid ${key}.`;
  }
  if ((creating || Object.hasOwn(edits, 'completed')) && typeof edits.completed !== 'boolean') errors.completed = 'Completion must be a boolean.';
  if (creating) {
    if (typeof edits.id !== 'string' || edits.id.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(edits.id)) errors.id = 'Use a lowercase slug ID of at most 80 characters, with single hyphens between segments.';
    if (typeof edits.number !== 'string' || !/^\d{2}$/.test(edits.number)) errors.number = 'Use exactly two digits.';
  }
  if (Object.keys(errors).length) {
    const error = new Error('Check the highlighted text fields. Nothing was saved.');
    error.fieldErrors = errors;
    throw error;
  }
}

const literal = (value, space) => JSON.stringify(value, null, space).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const propertyOf = (node, key) => node.properties.find(item => (item.key.name ?? item.key.value) === key);

function rewriteObject(source, node, changes) {
  const patches = [], added = [];
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  const last = node.properties.at(-1);
  const prefix = last ? source.slice(source.lastIndexOf('\n', last.start) + 1, last.start) : '';
  const indent = /^\s*$/.test(prefix) ? prefix : '    ';
  for (const [key, text] of Object.entries(changes)) {
    const property = propertyOf(node, key);
    if (property) patches.push({ start: property.value.start, end: property.value.end, text });
    else added.push(`${key}: ${text}`);
  }
  if (added.length) patches.push({ start: last ? last.end : node.start + 1, end: last ? last.end : node.start + 1, text: `${last ? ',' : ''}${newline}${indent}${added.join(`,${newline}${indent}`)}` });
  let text = source.slice(node.start, node.end);
  for (const patch of patches.sort((a, b) => b.start - a.start)) text = text.slice(0, patch.start - node.start) + patch.text + text.slice(patch.end - node.start);
  return text;
}

function listError(field, message) {
  const error = new Error('Check the highlighted fields. Nothing was saved.');
  error.fieldErrors = { [field]: message };
  throw error;
}

function listEdits(entries, originals, kind) {
  const limit = kind === 'objectives' ? 16 : 8;
  if (!Array.isArray(entries) || !entries.length || entries.length > limit) listError(kind, `Use 1–${limit} ${kind}.`);
  const used = new Set();
  return entries.map((entry, index) => {
    const allowed = kind === 'objectives' ? ['sourceIndex', 'text'] : ['sourceIndex', 'src', 'alt'];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || Object.keys(entry).some(key => !allowed.includes(key))) listError(kind, 'Unsupported list entry.');
    const originalIndex = entry.sourceIndex;
    if (originalIndex !== null && (!Number.isInteger(originalIndex) || originalIndex < 0 || originalIndex >= originals.length || used.has(originalIndex))) listError(kind, 'Invalid or repeated original entry.');
    if (originalIndex !== null) used.add(originalIndex);
    const original = originalIndex === null ? {} : originals[originalIndex];
    if (kind === 'objectives') {
      if (typeof entry.text !== 'string' || !entry.text.trim() || entry.text.length > 512 || /[\x00-\x08\x0b-\x1f\x7f-\x9f]/.test(entry.text) || !entry.text.isWellFormed()) listError(`objectives.${index}.text`, 'Use nonempty plain text up to 512 characters.');
      return { ...original, text: entry.text };
    }
    if (!imagePath(entry.src) || (originalIndex !== null && entry.src !== original.src)) listError(`images.${index}.src`, 'Choose a local image using Add existing or Import.');
    if (typeof entry.alt !== 'string' || entry.alt.length > 512 || /[\x00-\x08\x0b-\x1f\x7f-\x9f]/.test(entry.alt) || !entry.alt.isWellFormed()) listError(`images.${index}.alt`, 'Use plain alternative text up to 512 characters.');
    return { ...original, src: entry.src, ...(entry.alt !== (original.alt || '') ? { alt: entry.alt } : {}) };
  });
}

function patchText(document, id, edits) {
  validateEdits(edits);
  const index = document.missions.findIndex(mission => mission.id === id);
  if (index < 0) throw new Error('This quest is not in the loaded board. Reopen the source folder.');
  const mission = document.missions[index];
  const changes = {};
  const expected = structuredClone(document.missions);
  for (const key of [...Object.keys(fields), ...metadataKeys]) {
    if (!Object.hasOwn(edits, key)) continue;
    if (mission[key] === edits[key]) continue;
    const property = propertyOf(document.nodes[index], key);
    if (!property) throw new Error(`Cannot locate the ${key} source value.`);
    changes[key] = literal(edits[key]);
    expected[index][key] = edits[key];
  }
  if (Object.hasOwn(edits, 'objectives')) {
    const objectives = listEdits(edits.objectives, mission.objectives, 'objectives');
    if (!isDeepStrictEqual(objectives, mission.objectives)) {
      const array = propertyOf(document.nodes[index], 'objectives').value;
      const entries = edits.objectives.map((entry, n) => entry.sourceIndex === null ? literal(objectives[n]) : rewriteObject(document.source, array.elements[entry.sourceIndex], entry.text === mission.objectives[entry.sourceIndex].text ? {} : { text: literal(entry.text) }));
      const newline = document.source.includes('\r\n') ? '\r\n' : '\n';
      changes.objectives = `[${newline}      ${entries.join(`,${newline}      `)}${newline}    ]`;
      expected[index].objectives = objectives;
    }
  }
  if (Object.hasOwn(edits, 'images')) {
    const images = listEdits(edits.images, imageList(mission), 'images');
    if (!isDeepStrictEqual(images, imageList(mission))) {
      changes.images = literal(images);
      expected[index].images = images;
    }
  }
  const node = document.nodes[index];
  const source = document.source.slice(0, node.start) + rewriteObject(document.source, node, changes) + document.source.slice(node.end);
  const next = parseDocument(source);
  if (!isDeepStrictEqual(next.missions, expected)) throw new Error('The update changed unexpected quest data. Nothing was saved.');
  return next;
}

function appendQuest(document, edits) {
  validateEdits(edits, true);
  if (document.missions.length >= 128) throw new Error('The board supports at most 128 quests.');
  if (document.missions.some(mission => mission.id === edits.id)) listError('id', 'Another quest already uses this ID. Choose a unique ID.');
  const mission = {
    id: edits.id, number: edits.number, title: edits.title, completed: edits.completed,
    kicker: edits.kicker, category: edits.category, risk: edits.risk,
    images: listEdits(edits.images, [], 'images'), location: edits.location, crew: edits.crew,
    teaser: edits.teaser, description: edits.description,
    objectives: listEdits(edits.objectives, [], 'objectives'), note: edits.note
  };
  const source = document.source, closing = document.array.end - 1;
  let prefix = source.slice(0, closing);
  const last = document.nodes.at(-1);
  if (last) {
    const tail = source.slice(last.end, closing);
    const hasComma = tokenizer(tail, { ecmaVersion: 'latest' }).getToken().type.label === ',';
    if (!hasComma) prefix = prefix.slice(0, last.end) + ',' + prefix.slice(last.end);
  }
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  const entry = literal(mission, 2).replace(/\n/g, `${newline}  `);
  const next = parseDocument(prefix + `${newline}  ${entry}${newline}` + source.slice(closing));
  if (!isDeepStrictEqual(next.missions, [...document.missions, mission])) throw new Error('Appending the quest changed unexpected data. Nothing was saved.');
  return next;
}

async function writeNew(filename, bytes) {
  const handle = await open(filename, 'wx');
  try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
}

class QuestStore {
  static async open(directory) {
    const document = await loadDocument(directory);
    let generated = path.basename(document.root).toLowerCase() === '_site';
    try { await lstat(path.join(document.root, '.zomboard-output')); generated = true; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (generated) throw new Error('Choose the ZomBoard source folder. Generated _site output cannot be edited.');
    // A write must replace the selected source file itself, never a linked target.
    const info = await lstat(path.join(document.root, 'missions-data.js'));
    if (!info.isFile() || info.isSymbolicLink()) throw new Error('Editing requires a regular missions-data.js file, not a symbolic link.');
    return new QuestStore(document);
  }

  constructor(document) {
    this.document = document;
    this.digest = hash(document.bytes);
    this.busy = false;
  }

  get board() { return { root: this.document.root, missions: this.document.missions }; }

  async ensureCache() {
    let current = this.document.root;
    for (const component of cache) {
      current = path.join(current, component);
      try { await mkdir(current); } catch (error) { if (error.code !== 'EEXIST') throw error; }
      const info = await lstat(current);
      if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('The editor cache must be a real directory inside the selected folder.');
    }
    const backups = path.join(current, 'backups');
    try { await mkdir(backups); } catch (error) { if (error.code !== 'EEXIST') throw error; }
    const info = await lstat(backups);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('The backup directory must not be a symbolic link.');
    return current;
  }

  async assertUnchanged() {
    if (await realpath(this.document.root) !== this.document.root) throw new Error('The selected folder changed. Reopen it before saving.');
    const filename = path.join(this.document.root, 'missions-data.js');
    let info;
    try { info = await lstat(filename); } catch (error) { if (error.code === 'ENOENT') throw new Error('CONFLICT: missions-data.js was removed outside the app. Reopen the folder before saving.'); throw error; }
    if (!info.isFile() || info.isSymbolicLink()) throw new Error('The source file was replaced with a link or non-file. Reopen the folder.');
    if (info.size !== this.document.bytes.length || hash(await readFile(filename)) !== this.digest) throw new Error('CONFLICT: missions-data.js changed outside the app. Your draft is retained. Copy any draft text you need, then reopen the folder to reload it.');
  }

  async create(edits, options = {}) { return this.save(undefined, edits, { ...options, creating: true }); }

  async save(id, edits, { checkpoint = async () => {}, assets, creating = false } = {}) {
    if (this.busy) throw new Error('A save is already in progress.');
    this.busy = true;
    let lock, lockPath, tempPath, result, failure;
    try {
      const next = creating ? appendQuest(this.document, edits) : patchText(this.document, id, edits);
      const missionId = creating ? edits.id : id;
      await this.assertUnchanged();
      if (next.source === this.document.source) return { saved: false, board: this.board };
      const previousMission = this.document.missions.find(mission => mission.id === missionId);
      const updatedMission = next.missions.find(mission => mission.id === missionId);
      let imagePlan;
      if (creating || !isDeepStrictEqual(imageList(previousMission), imageList(updatedMission))) {
        if (!assets || assets.root !== this.document.root) throw new Error('Image validation is unavailable. Reopen the source folder.');
        imagePlan = await assets.prepare(imageList(updatedMission));
      }
      const directory = await this.ensureCache();
      lockPath = path.join(directory, 'save.lock');
      try { lock = await open(lockPath, 'wx'); }
      catch (error) {
        if (error.code === 'EEXIST') throw new Error('A save lock already exists. Another editor may be saving. If all editor windows are closed, remove .cache/quest-editor/save.lock before trying again.');
        throw error;
      }
      await lock.writeFile(JSON.stringify({ pid: process.pid, started: new Date().toISOString() }));
      await lock.sync();
      await this.assertUnchanged();
      const token = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`;
      const backupPath = path.join(directory, 'backups', `${token}.js`);
      tempPath = path.join(directory, `${token}.tmp`);
      await writeNew(backupPath, this.document.bytes);
      const bytes = Buffer.from(next.source, 'utf8');
      await writeNew(tempPath, bytes);
      await checkpoint('prepared');
      if (imagePlan) { await assets.install(imagePlan, directory); await checkpoint('images'); }
      await this.assertUnchanged();
      if (imagePlan) await assets.assertPlan(imagePlan);
      await rename(tempPath, path.join(this.document.root, 'missions-data.js'));
      tempPath = undefined;
      this.document = { root: this.document.root, bytes, ...next };
      this.digest = hash(bytes);
      assets?.clearStaged();
      result = { saved: true, board: this.board, backup: path.relative(this.document.root, backupPath) };
      return result;
    } catch (error) { failure = error; throw error; }
    finally {
      const cleanup = [];
      if (tempPath) { try { await unlink(tempPath); } catch (error) { if (error.code !== 'ENOENT') cleanup.push(error.message); } }
      if (lock) {
        try { await lock.close(); } catch (error) { cleanup.push(error.message); }
        try { await unlink(lockPath); } catch (error) { cleanup.push(error.message); }
      }
      this.busy = false;
      if (cleanup.length) {
        const warning = 'Editor temporary-file cleanup failed. Check .cache/quest-editor/ before the next save.';
        if (result) result.warning = warning;
        else if (failure) failure.message += ` ${warning}`;
      }
    }
  }
}

module.exports = { QuestStore, patchText, appendQuest };
