const { parse } = require('acorn');
const { open, realpath } = require('node:fs/promises');
const path = require('node:path');

const MAX_SOURCE_BYTES = 2 * 1024 * 1024;

function readLiteral(node, depth = 0) {
  if (!node || depth > 64) throw new Error('Sparse arrays or excessively nested data are unsupported.');
  if (node.type === 'Literal') {
    if (node.value === null || ['string', 'boolean'].includes(typeof node.value)) return node.value;
    if (typeof node.value === 'number' && Number.isFinite(node.value)) return node.value;
  }
  if (node.type === 'UnaryExpression' && ['-', '+'].includes(node.operator) && node.argument.type === 'Literal' && typeof node.argument.value === 'number') {
    const value = readLiteral(node.argument, depth + 1);
    return node.operator === '-' ? -value : value;
  }
  if (node.type === 'ArrayExpression') return node.elements.map(item => readLiteral(item, depth + 1));
  if (node.type === 'ObjectExpression') {
    const value = {};
    for (const property of node.properties) {
      if (property.type !== 'Property' || property.computed || property.method || property.shorthand || property.kind !== 'init') throw new Error('Only plain data properties are supported.');
      const key = property.key.type === 'Identifier' ? property.key.name : property.key.value;
      if (typeof key !== 'string' || ['__proto__', 'constructor', 'prototype'].includes(key) || Object.hasOwn(value, key)) throw new Error('Duplicate or unsafe data property.');
      value[key] = readLiteral(property.value, depth + 1);
    }
    return value;
  }
  throw new Error(`Expected static quest data; ${node.type} is unsupported. The source file is never executed.`);
}

function validateMissions(missions) {
  const ids = new Set();
  const fail = (label, message) => { throw new Error(`${label}: ${message}`); };
  const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const text = (value, label) => { if (typeof value !== 'string' || !value.trim()) fail(label, 'expected nonempty text.'); };
  const target = (value, label) => {
    if (!isObject(value) || !Number.isSafeInteger(value.x) || !Number.isSafeInteger(value.y)) fail(label, 'X and Y must be safe integers.');
    if (Object.hasOwn(value, 'zoom') && (typeof value.zoom !== 'number' || !Number.isFinite(value.zoom) || value.zoom <= 0)) fail(label, 'zoom must be a finite positive number.');
  };
  for (const [index, mission] of missions.entries()) {
    const label = `Quest ${index + 1}`;
    if (!isObject(mission)) fail(label, 'expected an object.');
    if (typeof mission.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(mission.id) || ids.has(mission.id)) fail(label, 'invalid or duplicate quest ID.');
    ids.add(mission.id);
    for (const key of ['number', 'title', 'kicker', 'teaser', 'location', 'crew', 'description', 'note']) text(mission[key], `${mission.id}.${key}`);
    if (!/^\d{2}$/.test(mission.number)) fail(mission.id, 'number must contain two digits.');
    if (!['field', 'base'].includes(mission.category)) fail(mission.id, 'invalid category.');
    if (!['LOW', 'MEDIUM', 'HIGH', 'SEVERE'].includes(mission.risk)) fail(mission.id, 'invalid risk.');
    if (typeof mission.completed !== 'boolean') fail(mission.id, 'completed must be a boolean.');
    for (const key of ['outdatedLead', 'relatedMission']) if (Object.hasOwn(mission, key) && typeof mission[key] !== 'string') fail(`${mission.id}.${key}`, 'expected text.');
    if (Object.hasOwn(mission, 'mapTarget')) target(mission.mapTarget, `${mission.id}.mapTarget`);
    if (!Array.isArray(mission.objectives) || !mission.objectives.length) fail(mission.id, 'expected objective objects.');
    for (const [n, objective] of mission.objectives.entries()) {
      if (!isObject(objective)) fail(mission.id, 'expected objective objects.');
      text(objective.text, `${mission.id}.objectives[${n}].text`);
      if (Object.hasOwn(objective, 'mapTarget')) target(objective.mapTarget, `${mission.id}.objectives[${n}].mapTarget`);
    }
    if (Object.hasOwn(mission, 'images') && !Array.isArray(mission.images)) fail(mission.id, 'images must be an array.');
    const images = mission.images?.length ? mission.images : [{ src: mission.image, alt: mission.imageAlt }];
    for (const image of images) {
      if (!isObject(image) || typeof image.src !== 'string' || !/^assets\/[a-zA-Z0-9_./-]+\.(png|svg)$/.test(image.src) || image.src.split('/').some(part => !part || part === '.' || part === '..')) fail(mission.id, 'expected a local PNG/SVG image reference in assets/.');
      if (image.alt !== undefined && typeof image.alt !== 'string') fail(mission.id, 'image alternative text must be text.');
    }
  }
  for (const mission of missions) if (mission.relatedMission && (!ids.has(mission.relatedMission) || mission.relatedMission === mission.id)) fail(mission.id, 'relatedMission must refer to another existing quest.');
}

function parseDocument(source) {
  if (typeof source !== 'string' || Buffer.byteLength(source, 'utf8') > MAX_SOURCE_BYTES) throw new Error('Quest source exceeds the 2 MiB input limit.');
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'script' });
  const statements = ast.body.filter(node => !(node.type === 'ExpressionStatement' && node.directive === 'use strict'));
  const declaration = statements[0];
  if (statements.length !== 1 || declaration?.type !== 'VariableDeclaration' || declaration.kind !== 'const' || declaration.declarations.length !== 1) throw new Error('Expected only const missions = [static quest data].');
  const binding = declaration.declarations[0];
  if (binding.id.type !== 'Identifier' || binding.id.name !== 'missions' || binding.init?.type !== 'ArrayExpression') throw new Error('Expected a literal missions array.');
  const missions = readLiteral(binding.init);
  validateMissions(missions);
  return { source, missions, nodes: binding.init.elements, array: binding.init };
}

function parseMissions(source) {
  return parseDocument(source).missions;
}

async function loadDocument(directory) {
  const root = await realpath(directory);
  let handle;
  try {
    handle = await open(path.join(root, 'missions-data.js'), 'r');
    const info = await handle.stat();
    if (!info.isFile()) throw new Error('missions-data.js must be a regular file.');
    if (info.size > MAX_SOURCE_BYTES) throw new Error('Quest source exceeds the 2 MiB input limit.');
    const bytes = await handle.readFile();
    if (bytes.length > MAX_SOURCE_BYTES) throw new Error('Quest source exceeds the 2 MiB input limit.');
    const source = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
    return { root, bytes, ...parseDocument(source) };
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('This folder has no missions-data.js. Choose the ZomBoard source folder.');
    throw error;
  } finally { await handle?.close(); }
}

async function loadBoard(directory) {
  const { root, missions } = await loadDocument(directory);
  return { root, missions };
}

module.exports = { parseMissions, parseDocument, loadDocument, loadBoard };
