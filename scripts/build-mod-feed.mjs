import { createHash } from 'node:crypto';
import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const text = (value, name, limit, empty = false) => {
  if (typeof value !== 'string' || value.length > limit || (!empty && !value.trim()) || /[\x00-\x08\x0b-\x1f\x7f-\x9f]/.test(value) || !value.isWellFormed())
    throw new Error(`Invalid mod-feed text: ${name}`);
  return value;
};
const mapTarget = (value, name) => {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      !Object.hasOwn(value, 'x') || !Object.hasOwn(value, 'y') ||
      !Number.isSafeInteger(value.x) || !Number.isSafeInteger(value.y))
    throw new Error(`Invalid mod-feed mapTarget: ${name} requires safe integer x and y`);
  const target = { x: value.x, y: value.y };
  if (Object.hasOwn(value, 'zoom')) {
    if (typeof value.zoom !== 'number' || !Number.isFinite(value.zoom) || value.zoom <= 0)
      throw new Error(`Invalid mod-feed mapTarget: ${name}.zoom must be finite and positive`);
    target.zoom = value.zoom;
  }
  return target;
};
async function assetPath(root, src) {
  if (typeof src !== 'string' || !/^assets\/[a-zA-Z0-9_./-]+\.(png|svg)$/.test(src) || src.split('/').some(p => !p || p === '.' || p === '..')) throw new Error('Invalid mod-feed asset path');
  let current = root;
  for (const part of src.split('/')) {
    if (!(await readdir(current)).includes(part)) throw new Error(`Missing/case-mismatched mod-feed asset: ${src}`);
    current = path.join(current, part);
    if ((await lstat(current)).isSymbolicLink()) throw new Error('Mod-feed asset symlink rejected');
  }
  return current;
}

/** Prepare and validate everything before the caller replaces deployment output. */
export async function prepareModFeed(root, base, source) {
  if (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(base.hostname)))
    throw new Error('Mod-feed base must be HTTPS (loopback preview may use HTTP)');
  if (!Array.isArray(source) || source.length > 128) throw new Error('Mod feed supports at most 128 quests');
  const files = new Map();
  const prepared = new Map();
  let assetBytes = 0;
  async function describe(png) {
    const metadata = await sharp(png, { limitInputPixels: 8_000_000 }).metadata();
    if (metadata.format !== 'png' || png.length > 8 * 1024 * 1024 || !metadata.width || !metadata.height || metadata.width > 4096 || metadata.height > 4096 || metadata.width * metadata.height > 8_000_000)
      throw new Error('Mod-feed image exceeds PNG limits');
    const sha256 = hash(png), filename = `api/v2/assets/${sha256}.png`;
    const url = text(new URL(filename, base).href, 'image URL', 2048);
    if (!files.has(filename)) {
      assetBytes += png.length;
      if (assetBytes > 256 * 1024 * 1024) throw new Error('Mod-feed build asset budget exceeded');
      files.set(filename, png);
    }
    return { url, sha256, bytes: png.length, width: metadata.width, height: metadata.height };
  }
  async function prepare(src) {
    if (prepared.has(src)) return prepared.get(src);
    const filename = await assetPath(root, src);
    const info = await lstat(filename);
    if (!info.isFile() || info.size > 8 * 1024 * 1024) throw new Error('Source image exceeds mod-feed byte limit');
    const bytes = await readFile(filename);
    const input = sharp(bytes, { limitInputPixels: 8_000_000 });
    const metadata = await input.metadata();
    if (!['png', 'svg'].includes(metadata.format) || metadata.width > 4096 || metadata.height > 4096 || metadata.width * metadata.height > 8_000_000) throw new Error('Invalid mod-feed source image');
    const png = metadata.format === 'svg' ? await input.png().toBuffer() : bytes;
    const original = await describe(png);
    const thumbnail = await describe(await sharp(png).resize({ width: 512, height: 320, fit: 'inside', withoutEnlargement: true }).png().toBuffer());
    const result = { ...original, thumbnail }; prepared.set(src, result); return result;
  }
  const missions = [], ids = new Set();
  for (const item of source) {
    const id = text(item.id, 'id', 80);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || ids.has(id)) throw new Error('Invalid/duplicate mod-feed quest ID');
    ids.add(id);
    const mission = { id };
    for (const key of ['number','title','kicker','teaser','category','risk','location','crew','description','note'])
      mission[key] = text(item[key], key, ['description','note'].includes(key) ? 8192 : key === 'teaser' ? 512 : 256, key === 'note');
    if (!['field','base'].includes(item.category) || !['LOW','MEDIUM','HIGH','SEVERE'].includes(item.risk) || typeof item.completed !== 'boolean') throw new Error('Invalid mod-feed quest classification');
    mission.completed = item.completed;
    if (!Array.isArray(item.objectives) || !item.objectives.length || item.objectives.length > 16) throw new Error('Invalid mod-feed objectives');
    mission.objectives = Array.from(item.objectives, (value, index) => {
      const name = `${id}.objectives[${index}]`;
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid mod-feed objective: ${name}`);
      const objective = { text: text(value.text, `${name}.text`, 512) };
      if (Object.hasOwn(value, 'mapTarget')) objective.mapTarget = mapTarget(value.mapTarget, name);
      return objective;
    });
    if (Object.hasOwn(item, 'mapTarget')) mission.mapTarget = mapTarget(item.mapTarget, id);
    for (const key of ['outdatedLead','relatedMission']) if (item[key] !== undefined) mission[key] = text(item[key], key, 8192, true);
    const images = Array.isArray(item.images) && item.images.length ? item.images : [{ src: item.image, alt: item.imageAlt || '' }];
    if (images.length > 8) throw new Error('Too many mod-feed images');
    mission.images = [];
    for (const image of images) mission.images.push({ ...await prepare(image.src), alt: text(image.alt || '', 'alt', 512, true) });
    missions.push(mission);
  }
  const feed = { schemaVersion: 2, missions };
  feed.revision = hash(JSON.stringify(canonical(feed)));
  const json = Buffer.from(`${JSON.stringify(feed, null, 2)}\n`);
  if (json.length > 1024 * 1024) throw new Error('Mod feed exceeds 1 MiB');
  files.set('api/v2/missions.json', json);
  return [...files];
}
