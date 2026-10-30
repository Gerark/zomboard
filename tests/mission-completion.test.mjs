import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const data = readFileSync(new URL('../missions-data.js', import.meta.url), 'utf8');
const runtime = readFileSync(new URL('../missions.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const missions = JSON.parse(vm.runInNewContext(`${data}\nJSON.stringify(missions)`));

// Model the DOM operations used by the runtime; this does not verify browser layout.
function board({ setup = 'missions.forEach(m => m.completed = m.id === "vhs");', href = 'https://example.test/zomboard/?crew=2#notes' } = {}) {
  const elements = new Map();
  const timers = new Map();
  const scrolls = [];
  const windowHandlers = new Map();
  const location = new URL(href);
  const compact = { matches: false, addEventListener() {} };
  const reduced = { matches: false, addEventListener() {} };
  const document = { activeElement: null, getElementById: id => elements.get(id) };
  let timerId = 0;

  function element(id = '', dataset = {}) {
    let markup = '';
    const classes = new Set();
    return {
      id, dataset, handlers: new Map(), nodes: [], cards: [], buttons: [], isConnected: true, hidden: false, open: false,
      classList: { toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); }, contains: name => classes.has(name) },
      addEventListener(name, handler) {
        if (!this.handlers.has(name)) this.handlers.set(name, []);
        this.handlers.get(name).push(handler);
      },
      emit(name, event = {}) { for (const handler of this.handlers.get(name) || []) handler(event); },
      closest() { return this.dataset.open ? this : null; },
      contains(node) { return this.nodes.includes(node); },
      focus(options) { document.activeElement = this; this.focusOptions = options; },
      showModal() { this.open = true; },
      close() { this.open = false; },
      getBoundingClientRect: () => ({ top: 1200, bottom: 1500, height: 300 }),
      get innerHTML() { return markup; },
      set innerHTML(value) {
        markup = value;
        for (const node of this.nodes) node.isConnected = false;
        this.buttons = [...value.matchAll(/<button\b[^>]*\bdata-open="([^"]+)"/g)].map(match => element('', { open: match[1] }));
        this.cards = [...value.matchAll(/<article\b[^>]*\bdata-mission-id="([^"]+)"/g)].map(match => {
          const card = element('', { missionId: match[1] });
          card.buttons = this.buttons.filter(button => button.dataset.open === match[1]);
          return card;
        });
        this.nodes = [...this.cards, ...this.buttons];
        this.copyButton = value.includes('id="copy-mission"') ? element('copy-mission') : null;
      },
      querySelectorAll(selector) {
        if (selector === '[data-mission-id]') return this.cards;
        if (selector === 'button[data-open]') return this.buttons;
        throw new Error(`Unsupported selector: ${selector}`);
      },
      querySelector(selector) {
        if (selector === 'button') return this.buttons[0];
        if (selector === '#copy-mission') return this.copyButton;
        throw new Error(`Unsupported selector: ${selector}`);
      }
    };
  }

  for (const match of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)) {
    const node = element(match[1]);
    node.hidden = /\bhidden\b/.test(match[0]);
    elements.set(match[1], node);
  }
  const scope = vm.createContext({ document, navigator: {}, URL, URLSearchParams, window: {
    location, innerHeight: 900,
    matchMedia: query => query.includes('max-width') ? compact : reduced,
    setTimeout: handler => { timers.set(++timerId, handler); return timerId; },
    clearTimeout: id => timers.delete(id),
    scrollBy: options => scrolls.push(options),
    history: { replaceState: (_state, _title, url) => { location.href = url; } },
    addEventListener: (name, handler) => windowHandlers.set(name, handler)
  } });
  vm.runInContext(`${data}\n${setup}\n${runtime}`, scope);
  return {
    elements, compact, reduced, document, location, timers, scrolls, windowHandlers,
    run: source => vm.runInContext(source, scope),
    flushTimers() { const pending = [...timers.values()]; timers.clear(); pending.forEach(handler => handler()); }
  };
}

const cardIds = node => node.cards.map(card => card.dataset.missionId);
const listIds = node => node.buttons.map(button => button.dataset.open);

test('a completed VHS quest has separate sidebar and bottom-grid entries, preserving source order', () => {
  assert.ok(missions.every(mission => typeof mission.completed === 'boolean'));
  const f = board();
  const activeIds = missions.filter(mission => mission.id !== 'vhs').map(mission => mission.id);
  assert.deepEqual(cardIds(f.elements.get('mission-grid')), activeIds);
  assert.deepEqual(listIds(f.elements.get('mission-list')), activeIds);
  assert.deepEqual(cardIds(f.elements.get('completed-mission-grid')), ['vhs']);
  assert.deepEqual(listIds(f.elements.get('completed-mission-list')), ['vhs']);
  assert.equal(f.elements.get('completed-missions-section').hidden, false);
  assert.equal(f.elements.get('completed-quest-list-section').hidden, false);
  assert.equal(f.run('missionCards.size'), missions.length);
  assert.equal(f.run('missionEntries.size'), missions.length);
  assert.match(f.elements.get('completed-mission-grid').innerHTML, /NO\. 10/);
  assert.ok(html.indexOf('id="completed-missions-section"') > html.indexOf('id="mission-grid"'));
});

test('rendering handles no completed quests, all completed quests and regrouping without duplicating listeners', () => {
  const f = board({ setup: 'missions.forEach(m => m.completed = false);' });
  const ids = missions.map(mission => mission.id);
  assert.deepEqual(cardIds(f.elements.get('mission-grid')), ids);
  assert.equal(f.elements.get('completed-missions-section').hidden, true);
  assert.equal(f.elements.get('completed-quest-list-section').hidden, true);
  assert.deepEqual(cardIds(f.elements.get('completed-mission-grid')), []);

  f.run('missions.forEach(m => m.completed = true); render();');
  assert.equal(f.elements.get('mission-grid').hidden, true);
  assert.deepEqual(cardIds(f.elements.get('mission-grid')), []);
  assert.deepEqual(listIds(f.elements.get('mission-list')), []);
  assert.deepEqual(cardIds(f.elements.get('completed-mission-grid')), ids);
  assert.deepEqual(listIds(f.elements.get('completed-mission-list')), ids);
  assert.equal(f.elements.get('completed-missions-section').hidden, false);

  f.run('missions.forEach(m => m.completed = m.id === "vhs"); render();');
  assert.equal(f.elements.get('mission-grid').hidden, false);
  assert.deepEqual(cardIds(f.elements.get('completed-mission-grid')), ['vhs']);
  assert.equal(f.run('missionCards.size'), ids.length);
  for (const id of ['mission-grid', 'completed-mission-grid', 'mission-list', 'completed-mission-list']) {
    assert.equal(f.elements.get(id).handlers.get('click').length, 1);
  }
});

test('active and completed cards/lists open briefings; closing restores either list or its card after resizing', () => {
  for (const container of ['mission-grid', 'completed-mission-grid', 'mission-list', 'completed-mission-list']) {
    for (const compactAfterOpening of [false, true]) {
      const f = board();
      const node = f.elements.get(container);
      const button = node.buttons[0];
      button.focus();
      node.emit('click', { target: button });
      assert.equal(f.elements.get('mission-dialog').open, true);
      assert.equal(f.location.searchParams.get('mission'), button.dataset.open);
      assert.match(f.elements.get('dialog-content').innerHTML, new RegExp(missions.find(m => m.id === button.dataset.open).title));
      f.compact.matches = compactAfterOpening;
      f.elements.get('dialog-close').emit('click');
      assert.equal(f.elements.get('mission-dialog').open, false);
      assert.equal(f.location.searchParams.has('mission'), false);
      assert.equal(f.location.searchParams.get('crew'), '2');
      assert.equal(f.location.hash, '#notes');
      const expected = container.includes('list') && compactAfterOpening
        ? f.run(`missionCards.get(${JSON.stringify(button.dataset.open)}).querySelector('button')`) : button;
      assert.equal(f.document.activeElement, expected);
    }
  }
});

test('both sidebar groups highlight and scroll their cards, and opening a briefing clears pending scrolling', () => {
  for (const id of ['mission-list', 'completed-mission-list']) {
    const f = board();
    const list = f.elements.get(id);
    const button = list.buttons[0];
    const card = f.run(`missionCards.get(${JSON.stringify(button.dataset.open)})`);
    const pointer = { target: button, pointerType: 'mouse', clientX: 20, clientY: 40 };
    list.emit('pointermove', pointer);
    assert.equal(card.classList.contains('is-highlighted'), true);
    assert.equal(button.classList.contains('is-highlighted'), true);
    assert.equal(f.timers.size, 1);
    f.flushTimers();
    assert.equal(f.scrolls.length, 1);
    list.emit('pointerleave');
    assert.equal(card.classList.contains('is-highlighted'), false);
    list.emit('pointermove', pointer);
    assert.equal(f.timers.size, 0, 'A stationary pointer must not select another row');
    list.emit('focusin', { target: button });
    assert.equal(f.timers.size, 1);
    list.emit('click', { target: button });
    assert.equal(f.timers.size, 0);
    assert.equal(card.classList.contains('is-highlighted'), false);
  }
});

test('completed quest deep links work over HTTP and direct files, including navigation focus return', () => {
  for (const href of ['https://example.test/zomboard/?mission=vhs&crew=2#notes', 'file:///D:/zomboard/index.html?mission=vhs&crew=2#notes']) {
    const f = board({ href });
    assert.equal(f.elements.get('mission-dialog').open, true);
    assert.match(f.elements.get('dialog-content').innerHTML, /I MISS OLD MOVIES/);
    assert.match(f.elements.get('dialog-content').innerHTML, /DOSSIER 10 \/ 16/);
    assert.equal(f.location.href, href);
    f.elements.get('dialog-close').emit('click');
    const list = f.elements.get('completed-mission-list');
    const opener = list.buttons[0];
    list.emit('click', { target: opener });
    f.compact.matches = true;
    f.location.searchParams.delete('mission');
    f.windowHandlers.get('popstate')();
    assert.equal(f.elements.get('mission-dialog').open, false);
    assert.equal(f.document.activeElement, f.elements.get('completed-mission-grid').buttons[0]);
  }
});
