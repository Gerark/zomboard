const { readFile, readdir, lstat, mkdir, open, copyFile, unlink } = require('node:fs/promises');
const { constants } = require('node:fs');
const { createHash, randomUUID } = require('node:crypto');
const path = require('node:path');

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const imagePath = src => typeof src === 'string' && /^assets\/[a-zA-Z0-9_./-]+\.(png|svg)$/.test(src) && !src.split('/').some(part => !part || part === '.' || part === '..');
const imageList = mission => mission.images?.length ? mission.images : [{ src: mission.image, ...(mission.imageAlt !== undefined ? { alt: mission.imageAlt } : {}) }];

async function assetPath(root, src, allowMissing = false) {
  if (!imagePath(src)) throw new Error('Choose a local PNG or SVG inside assets/.');
  let current = root;
  const parts = src.split('/');
  for (let i = 0; i < parts.length; i++) {
    const names = await readdir(current);
    const part = parts[i];
    if (!names.includes(part)) {
      if (names.some(name => name.toLowerCase() === part.toLowerCase())) throw new Error(`Case-mismatched image path: ${src}`);
      if (allowMissing && i === parts.length - 1) return path.join(current, part);
      throw new Error(`Missing image: ${src}`);
    }
    current = path.join(current, part);
    if ((await lstat(current)).isSymbolicLink()) throw new Error('Linked image paths are unsupported.');
  }
  return current;
}

function checkImageBytes(bytes, extension) {
  if (!bytes.length || bytes.length > 8 * 1024 * 1024) throw new Error('Images must be at most 8 MiB.');
  if (extension === '.png') {
    if (bytes.length < 33 || !bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || bytes.toString('ascii',12,16) !== 'IHDR') throw new Error('The file is not a PNG image.');
    const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
    if (!width || !height || width > 4096 || height > 4096 || width * height > 8_000_000) throw new Error('Images must fit 4096 per dimension and 8,000,000 pixels.');
  } else if (extension === '.svg') {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('SVG document types and entities are unsupported.');
  } else throw new Error('Choose a PNG screenshot or SVG illustration.');
}

class AssetLibrary {
  constructor(root, inspect) {
    this.root = root;
    this.inspect = inspect;
    this.staged = new Map();
    this.snapshots = new Map();
    this.previews = new Map();
  }

  clearStaged() { this.staged.clear(); }

  async list() {
    const result = [];
    let info;
    try { info = await lstat(path.join(this.root, 'assets')); } catch (error) { if (error.code === 'ENOENT') return [...this.staged.keys()]; throw error; }
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('assets/ must be a real directory.');
    const walk = async directory => {
      for (const entry of await readdir(path.join(this.root, directory), { withFileTypes: true })) {
        if (entry.isSymbolicLink()) continue;
        const src = `${directory}/${entry.name}`;
        if (entry.isDirectory()) await walk(src);
        else if (entry.isFile() && imagePath(src)) result.push(src);
      }
    };
    await walk('assets');
    return [...new Set([...result, ...this.staged.keys()])].sort();
  }

  async bytes(src) {
    if (!imagePath(src)) throw new Error('Invalid image path.');
    if (this.staged.has(src)) return this.staged.get(src);
    const filename = await assetPath(this.root, src);
    const info = await lstat(filename);
    if (!info.isFile() || info.size > 8 * 1024 * 1024) throw new Error('Images must be regular files of at most 8 MiB.');
    const bytes = await readFile(filename);
    checkImageBytes(bytes, path.extname(src));
    return bytes;
  }

  async preview(src) {
    const bytes = await this.bytes(src), digest = hash(bytes);
    if (!this.staged.has(src) && !this.snapshots.has(src)) this.snapshots.set(src, digest);
    if (!this.previews.has(digest)) {
      checkImageBytes(bytes, path.extname(src));
      this.previews.set(digest, await this.inspect(bytes, path.extname(src)));
      // Only a small number of thumbnails need to stay cached.
      if (this.previews.size > 32) this.previews.delete(this.previews.keys().next().value);
    }
    return this.previews.get(digest);
  }

  async stage(filename) {
    const info = await lstat(filename);
    if (!info.isFile() || info.isSymbolicLink() || info.size > 8 * 1024 * 1024) throw new Error('Choose a regular PNG/SVG file of at most 8 MiB.');
    const bytes = await readFile(filename), extension = path.extname(filename).toLowerCase();
    checkImageBytes(bytes, extension);
    const preview = await this.inspect(bytes, extension);
    const digest = hash(bytes), src = `assets/editor-${digest}${extension}`;
    try {
      const existing = await this.bytes(src);
      if (hash(existing) !== digest) throw new Error('Image filename collision. The existing file was not overwritten.');
    } catch (error) {
      if (!/Missing image|ENOENT/.test(error.message)) throw error;
      if (!this.staged.has(src) && [...this.staged.values()].reduce((sum, value) => sum + value.length, bytes.length) > 64 * 1024 * 1024) throw new Error('Staged imports exceed 64 MiB. Save or discard the current quest first.');
      this.staged.set(src, bytes);
    }
    this.previews.set(digest, preview);
    return { src, ...preview };
  }

  async prepare(images) {
    const plan = [];
    for (const [index, image] of images.entries()) {
      try {
        const bytes = await this.bytes(image.src), digest = hash(bytes);
        if (this.snapshots.has(image.src) && this.snapshots.get(image.src) !== digest) throw new Error(`CONFLICT: ${image.src} changed outside the app. Reopen the folder before saving.`);
        await this.preview(image.src);
        plan.push({ src: image.src, digest, bytes: this.staged.get(image.src) });
      } catch (error) { error.fieldErrors = { [`images.${index}.src`]: error.message }; throw error; }
    }
    return plan;
  }

  async install(plan, cacheDirectory) {
    const temporary = [];
    try {
      if (plan.some(image => image.bytes)) {
        const assets = path.join(this.root, 'assets');
        try { await mkdir(assets); } catch (error) { if (error.code !== 'EEXIST') throw error; }
        const info = await lstat(assets);
        if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('assets/ must be a real directory.');
      }
      for (const image of plan) {
        if (!image.bytes) continue;
        const target = await assetPath(this.root, image.src, true);
        const temp = path.join(cacheDirectory, `${randomUUID()}.image`);
        temporary.push(temp);
        const handle = await open(temp, 'wx');
        try { await handle.writeFile(image.bytes); await handle.sync(); } finally { await handle.close(); }
        try { await copyFile(temp, target, constants.COPYFILE_EXCL); }
        catch (error) {
          if (error.code !== 'EEXIST') throw error;
          if (hash(await readFile(await assetPath(this.root, image.src))) !== image.digest) throw new Error('Image filename collision. The existing file was not overwritten.');
        }
      }
      await this.assertPlan(plan);
    } finally {
      for (const filename of temporary) await unlink(filename).catch(() => {});
    }
  }

  async assertPlan(plan) {
    for (const image of plan) {
      const bytes = await readFile(await assetPath(this.root, image.src));
      if (hash(bytes) !== image.digest) throw new Error(`CONFLICT: ${image.src} changed before saving.`);
    }
  }
}

module.exports = { AssetLibrary, imageList, imagePath, checkImageBytes };
