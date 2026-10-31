import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { prepareModProof } from '../scripts/build-mod-proof.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
async function fixture(t) {
  const parent = path.join(root, '.cache');
  await mkdir(parent, { recursive: true });
  const dir = await mkdtemp(path.join(parent, 'mod-proof-test-'));
  t.after(async () => {
    const relative = path.relative(parent, dir);
    assert.ok(relative.startsWith('mod-proof-test-') && !relative.includes(path.sep));
    await rm(dir, { recursive: true, force: true });
  });
  await cp(path.join(root, 'mod-proof'), path.join(dir, 'mod-proof'), { recursive: true });
  return dir;
}

test('proof fixture resolves under project paths/custom domains, has valid PNG identities, and exports only explicit public files', async t => {
  const dir = await fixture(t);
  await writeFile(path.join(dir, 'mod-proof', 'private.txt'), 'not public');
  for (const base of ['https://example.test/zomboard/', 'https://board.example/']) {
    const files = new Map(await prepareModProof(dir, new URL(base)));
    assert.equal(files.size, 5);
    assert.ok(!files.has('mod-proof/private.txt'));
    const a = JSON.parse(files.get('mod-proof/a.json'));
    const b = JSON.parse(files.get('mod-proof/b.json'));
    assert.equal(a.missions[0].title, 'REMOTE PROOF A');
    assert.equal(b.missions[0].title, 'REMOTE PROOF B');
    assert.notEqual(a.revision, b.revision);
    assert.deepEqual(JSON.parse(files.get('mod-proof/missions.json')), a);
    for (const feed of [a, b]) {
      const image = feed.missions[0].images[0];
      assert.ok(image.url.startsWith(`${base}mod-proof/assets/`));
      const png = files.get(new URL(image.url).pathname.replace(new URL(base).pathname, ''));
      assert.ok(png);
      assert.equal(createHash('sha256').update(png).digest('hex'), image.sha256);
      assert.equal(png.length, image.bytes);
    }
    assert.deepEqual(await prepareModProof(dir, new URL(base)), [...files]);
  }
});

test('proof fixture rejects corrupt images and changes revision for real text changes', async t => {
  const dir = await fixture(t);
  const base = new URL('https://example.test/zomboard/');
  const before = new Map(await prepareModProof(dir, base));
  const a = JSON.parse(await readFile(path.join(dir, 'mod-proof/a.json'), 'utf8'));
  a.missions[0].description += ' A changed remote briefing.';
  await writeFile(path.join(dir, 'mod-proof/a.json'), JSON.stringify(a));
  const after = new Map(await prepareModProof(dir, base));
  assert.notEqual(JSON.parse(before.get('mod-proof/a.json')).revision, JSON.parse(after.get('mod-proof/a.json')).revision);
  assert.equal(JSON.parse(before.get('mod-proof/b.json')).revision, JSON.parse(after.get('mod-proof/b.json')).revision);
  await writeFile(path.join(dir, 'mod-proof/assets', `proof-${a.missions[0].images[0].sha256}.png`), 'not a PNG');
  await assert.rejects(prepareModProof(dir, base));
});
