import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const data = readFileSync(new URL('../missions-data.js', import.meta.url), 'utf8');
const runtime = readFileSync(new URL('../missions.js', import.meta.url), 'utf8');
const bridge = readFileSync(new URL('../share.js', import.meta.url), 'utf8');

function runtimeFixture({ href, config, clipboard } = {}) {
  const handlers = {};
  const elements = new Map();
  const make = id => ({ id, innerHTML: '', open: false, addEventListener() {}, querySelectorAll: () => [], querySelector: () => ({ addEventListener: (name, handler) => { handlers[name] = handler; } }), contains: () => false, showModal() { this.open = true; } });
  for (const id of ['mission-grid', 'mission-list', 'mission-dialog', 'dialog-content', 'dialog-close']) elements.set(id, make(id));
  if (config) elements.set('mission-share-config', { textContent: JSON.stringify(config) });
  let prompt;
  const scope = vm.createContext({
    document: { getElementById: id => elements.get(id), activeElement: null },
    navigator: { clipboard }, URL, URLSearchParams,
    window: { location: { href, search: '' }, matchMedia: () => ({ matches: false, addEventListener() {} }), clearTimeout() {}, addEventListener() {}, prompt: (_label, value) => { prompt = value; } }
  });
  vm.runInContext(`${data}\n${runtime}`, scope);
  vm.runInContext('showMission("greenes", false)', scope);
  return { scope, handlers, getPrompt: () => prompt };
}

test('deployed copy links use per-mission URLs and preserve unrelated query parameters and hashes', async () => {
  let copied;
  const f = runtimeFixture({ href: 'https://example.test/zomboard/?mission=greenes&crew=2#notes', config: { greenes: 'share/greenes.html?v=revision' }, clipboard: { writeText: async text => { copied = text; } } });
  const button = {};
  await f.handlers.click({ currentTarget: button });
  const url = new URL(copied);
  assert.equal(url.pathname, '/zomboard/share/greenes.html');
  assert.equal(url.searchParams.get('v'), 'revision');
  assert.equal(url.searchParams.get('crew'), '2');
  assert.equal(url.searchParams.has('mission'), false);
  assert.equal(url.hash, '#notes');
  assert.equal(button.textContent, '✓ LINK COPIED');
});

test('clipboard failures and unavailable clipboard use the same mission URL in the prompt', async () => {
  for (const clipboard of [undefined, { writeText: async () => { throw new Error('Denied'); } }]) {
    const f = runtimeFixture({ href: 'https://example.test/zomboard/index.html', config: { greenes: 'share/greenes.html?v=revision' }, clipboard });
    await f.handlers.click({ currentTarget: {} });
    assert.equal(f.getPrompt(), 'https://example.test/zomboard/share/greenes.html?v=revision');
  }
});

test('unbuilt HTTP sources and direct-file previews retain working query-string links', () => {
  for (const href of ['http://127.0.0.1:8000/index.html?crew=2#notes', 'file:///D:/zomboard/index.html?crew=2#notes']) {
    const f = runtimeFixture({ href });
    const url = new URL(vm.runInContext('missionLink("greenes")', f.scope));
    assert.equal(url.pathname, new URL(href).pathname);
    assert.equal(url.searchParams.get('mission'), 'greenes');
    assert.equal(url.searchParams.get('crew'), '2');
    assert.equal(url.hash, '#notes');
  }
  const f = runtimeFixture({ href: 'file:///D:/zomboard/_site/index.html', config: { greenes: 'share/greenes.html?v=revision' } });
  assert.equal(vm.runInContext('missionLink("greenes")', f.scope), 'file:///D:/zomboard/_site/index.html?mission=greenes');
});

test('share-page visitors reach the existing briefing, retaining extra parameters and the hash', () => {
  for (const href of ['https://example.test/zomboard/share/greenes.html?v=revision&crew=2&mission=wrong#notes', 'file:///D:/zomboard/_site/share/greenes.html?crew=2#notes']) {
    let redirected;
    const original = new URL(href);
    const scope = vm.createContext({ URL, document: { getElementById: () => ({ href: new URL('../index.html?mission=greenes', original).href }) }, window: { location: { search: original.search, hash: original.hash, replace: value => { redirected = new URL(value); } } } });
    vm.runInContext(bridge, scope);
    assert.ok(!redirected.pathname.includes('/share/'));
    assert.ok(redirected.pathname.endsWith('/index.html'));
    assert.equal(redirected.searchParams.get('mission'), 'greenes');
    assert.equal(redirected.searchParams.get('crew'), '2');
    assert.equal(redirected.hash, '#notes');
  }
});
