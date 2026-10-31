import { createHash } from 'node:crypto';
import { lstat, readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;

// Only the synthetic experiment is exported here. Mission content/runtime is untouched.
export async function prepareModProof(root, base) {
  const directory = path.join(root, 'mod-proof');
  try {
    const info = await lstat(directory);
    if (info.isSymbolicLink() || !info.isDirectory()) throw new Error('Invalid mod-proof directory.');
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const assetsInfo = await lstat(path.join(directory, 'assets'));
  if (assetsInfo.isSymbolicLink() || !assetsInfo.isDirectory()) throw new Error('Invalid mod-proof assets directory.');
  const files = new Map();
  for (const name of ['a.json', 'b.json', 'missions.json']) {
    const source = path.join(directory, name);
    if (!(await lstat(source)).isFile() || (await lstat(source)).isSymbolicLink()) throw new Error(`Invalid mod-proof file: ${name}`);
    const bytes = await readFile(source);
    if (bytes.length > 65536) throw new Error('Synthetic feed exceeds proof limit.');
    const feed = JSON.parse(bytes.toString('utf8'));
    if (feed.schemaVersion !== 1 || feed.missions?.length !== 1 || feed.missions[0].id !== 'https-proof' || feed.missions[0].images?.length !== 1)
      throw new Error('Expected the single synthetic https-proof mission.');
    const image = feed.missions[0].images[0];
    if (!/^[a-f0-9]{64}$/.test(image.sha256)) throw new Error('Invalid proof image hash.');
    const filename = `proof-${image.sha256}.png`;
    const imagePath = path.join(directory, 'assets', filename);
    const info = await lstat(imagePath);
    if (!info.isFile() || info.isSymbolicLink()) throw new Error('Invalid proof PNG path.');
    const png = await readFile(imagePath);
    const meta = await sharp(png).metadata();
    if (png.length > 4194304 || png.length !== image.bytes || digest(png) !== image.sha256 ||
        meta.format !== 'png' || meta.width !== image.width || meta.height !== image.height ||
        image.width > 2048 || image.height > 2048) throw new Error('Proof PNG metadata/hash mismatch.');
    image.url = new URL(`mod-proof/assets/${filename}`, base).href;
    delete feed.revision;
    feed.revision = digest(JSON.stringify(canonical(feed)));
    files.set(`mod-proof/${name}`, Buffer.from(`${JSON.stringify(feed, null, 2)}\n`));
    files.set(`mod-proof/assets/${filename}`, png);
  }
  return [...files];
}
