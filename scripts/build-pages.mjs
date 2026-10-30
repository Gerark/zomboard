import { createHash } from 'node:crypto';
import { cp, lstat, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import vm from 'node:vm';
import sharp from 'sharp';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const marker = '<!-- MISSION_SHARE_CONFIG -->';
const escapeHtml = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const hash = value => createHash('sha256').update(value).digest('hex').slice(0, 16);

function siteUrl(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('The site URL must be an HTTP(S) URL without credentials, a query or a hash.');
  }
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url;
}

async function assetPath(root, src) {
  if (typeof src !== 'string' || !/^assets\/[a-zA-Z0-9_./-]+\.(png|svg)$/.test(src) || src.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error(`Expected a local PNG or SVG asset path: ${src}`);
  }
  let current = root;
  for (const part of src.split('/')) {
    if (!(await readdir(current)).includes(part)) throw new Error(`Missing or case-mismatched asset: ${src}`);
    current = path.join(current, part);
    if ((await lstat(current)).isSymbolicLink()) throw new Error(`Asset symlinks are unsupported: ${src}`);
  }
  return current;
}

function imagesFor(mission) {
  return Array.isArray(mission.images) && mission.images.length
    ? mission.images : [{ src: mission.image, alt: mission.imageAlt || '' }];
}

async function readMissions(root) {
  const source = await readFile(path.join(root, 'missions-data.js'), 'utf8');
  // Keep the browser's classic-script data format; this evaluates only curated repository code.
  const missions = vm.runInNewContext(`${source}\n;missions`, Object.create(null), { timeout: 1000 });
  if (!Array.isArray(missions) || !missions.length) throw new Error('Expected a nonempty missions array.');
  const ids = new Set();
  for (const mission of missions) {
    if (typeof mission.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(mission.id) || ids.has(mission.id)) throw new Error(`Invalid or duplicate mission ID: ${mission.id}`);
    ids.add(mission.id);
    for (const field of ['number', 'title', 'kicker', 'teaser', 'location', 'crew', 'description', 'note']) {
      if (typeof mission[field] !== 'string' || !mission[field].trim()) throw new Error(`Missing ${field} in ${mission.id}.`);
    }
    if (!/^\d{2}$/.test(mission.number) || !['field', 'base'].includes(mission.category) || !['LOW', 'MEDIUM', 'HIGH', 'SEVERE'].includes(mission.risk)) throw new Error(`Invalid mission classification or number: ${mission.id}`);
    if (typeof mission.completed !== 'boolean') throw new Error(`Invalid completed flag: ${mission.id}`);
    if (!Array.isArray(mission.objectives) || !mission.objectives.length || mission.objectives.some(item => typeof item !== 'string' || !item.trim())) throw new Error(`Invalid objectives: ${mission.id}`);
    for (const image of imagesFor(mission)) await assetPath(root, image.src);
  }
  for (const mission of missions) {
    if (mission.relatedMission && (!ids.has(mission.relatedMission) || mission.relatedMission === mission.id)) throw new Error(`Invalid related mission: ${mission.id}`);
  }
  return missions;
}

function sharePage(mission, image, shareUrl, baseUrl) {
  const briefing = `../index.html?mission=${encodeURIComponent(mission.id)}`;
  const imageUrl = new URL(image.src, baseUrl).href;
  const imageAlt = imagesFor(mission)[0].alt || mission.title;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="theme-color" content="#ef6846">
  <title>${escapeHtml(mission.title)} — ZomBoard</title>
  <meta name="description" content="${escapeHtml(mission.teaser)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="ZomBoard">
  <meta property="og:title" content="${escapeHtml(mission.title)}">
  <meta property="og:description" content="${escapeHtml(mission.teaser)}">
  <meta property="og:url" content="${escapeHtml(shareUrl)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="${image.width}">
  <meta property="og:image:height" content="${image.height}">
  <meta property="og:image:alt" content="${escapeHtml(imageAlt)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(mission.title)}">
  <meta name="twitter:description" content="${escapeHtml(mission.teaser)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  <link rel="canonical" href="${escapeHtml(shareUrl)}">
  <link rel="icon" type="image/svg+xml" href="../assets/favicon.svg">
  <link rel="stylesheet" href="../styles.css">
  <script src="../share.js" defer></script>
</head>
<body>
  <main class="mission-section wrapper">
    <h1>${escapeHtml(mission.title)}</h1>
    <p>${escapeHtml(mission.teaser)}</p>
    <p><a id="open-mission" class="copy-button" href="${escapeHtml(briefing)}">OPEN MISSION BRIEFING ↗</a></p>
    <div class="dossier-image"><img src="../${escapeHtml(image.src)}" alt="${escapeHtml(imageAlt)}"></div>
  </main>
</body>
</html>
`;
}

export async function buildPages({ root = repositoryRoot, baseUrl = process.env.SITE_URL } = {}) {
  if (!baseUrl) throw new Error('Set SITE_URL or pass --base-url (including the repository path, e.g. https://gerark.github.io/zomboard/).');
  const base = siteUrl(baseUrl);
  const missions = await readMissions(root);
  let index = await readFile(path.join(root, 'index.html'), 'utf8');
  if (index.split(marker).length !== 2) throw new Error('Expected exactly one MISSION_SHARE_CONFIG marker in index.html.');
  const output = path.resolve(root, '_site');
  const outputMarker = path.join(output, '.zomboard-output');
  // Only replace this generator's own fixed output directory, never an arbitrary path.
  try {
    if ((await lstat(output)).isSymbolicLink()) throw new Error('Refusing to overwrite a symlink at _site.');
    await readFile(outputMarker);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    try {
      await lstat(output);
      throw new Error('Refusing to overwrite _site without its .zomboard-output marker.');
    } catch (missing) {
      if (missing.code !== 'ENOENT') throw missing;
    }
  }
  await rm(output, { recursive: true, force: true });
  await mkdir(path.join(output, 'share'), { recursive: true });
  await writeFile(outputMarker, 'Generated by scripts/build-pages.mjs\n');
  for (const file of ['styles.css', 'missions-data.js', 'missions.js', 'share.js', '.nojekyll']) await cp(path.join(root, file), path.join(output, file));
  await cp(path.join(root, 'assets'), path.join(output, 'assets'), { recursive: true });

  const preparedImages = new Map();
  async function prepareImage(src) {
    if (preparedImages.has(src)) return preparedImages.get(src);
    const input = await readFile(await assetPath(root, src));
    const png = src.endsWith('.svg') ? await sharp(input).png().toBuffer() : input;
    const metadata = await sharp(png).metadata();
    if (metadata.format !== 'png' || !metadata.width || !metadata.height) throw new Error(`Invalid preview PNG: ${src}`);
    const digest = hash(png);
    let imagePath = src;
    if (src.endsWith('.svg')) {
      imagePath = `assets/share/${path.basename(src, '.svg')}-${digest}.png`;
      await mkdir(path.join(output, 'assets', 'share'), { recursive: true });
      await writeFile(path.join(output, imagePath), png);
    }
    const image = { src: `${imagePath}?v=${digest}`, width: metadata.width, height: metadata.height, digest };
    preparedImages.set(src, image);
    return image;
  }

  const shareLinks = {};
  for (const mission of missions) {
    const image = await prepareImage(imagesFor(mission)[0].src);
    const revision = hash(JSON.stringify([1, mission.id, mission.title, mission.teaser, imagesFor(mission)[0], image.digest]));
    const relativeUrl = `share/${mission.id}.html?v=${revision}`;
    shareLinks[mission.id] = relativeUrl;
    await writeFile(path.join(output, 'share', `${mission.id}.html`), sharePage(mission, image, new URL(relativeUrl, base).href, base));
  }
  const hero = await prepareImage('assets/hero-mccoy.svg');
  index = index.replace(/(<meta property="og:image" content=")[^"]*(">)/, (_match, start, end) => `${start}${escapeHtml(new URL(hero.src, base).href)}${end}`);
  index = index.replace(marker, `<script type="application/json" id="mission-share-config">${JSON.stringify(shareLinks)}</script>`);
  await writeFile(path.join(output, 'index.html'), index);
  return { output, missionCount: missions.length, shareLinks };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: { 'base-url': { type: 'string' } } });
    const result = await buildPages({ baseUrl: values['base-url'] || process.env.SITE_URL });
    console.log(`Built ${result.missionCount} mission share pages and the website in ${result.output}`);
  } catch (error) {
    console.error(`Build failed: ${error.message}`);
    process.exitCode = 1;
  }
}
