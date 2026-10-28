'use strict';

const grid = document.getElementById('mission-grid');
const missionList = document.getElementById('mission-list');
const dialog = document.getElementById('mission-dialog');
const dialogContent = document.getElementById('dialog-content');
const compactLayout = window.matchMedia('(max-width: 1100px)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let missionCards = new Map();
let missionEntries = new Map();
let hoveredMission = null;
let focusedMission = null;
let hoverTimer = null;
let lastPointer = null;
let priorFocus = null;
let restoringFocus = false;

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (ch) => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[ch]));
const pad = (n) => String(n).padStart(2, '0');
const missionShareLinks = JSON.parse(document.getElementById('mission-share-config')?.textContent || '{}');

function missionLink(id) {
  const url = new URL(window.location.href);
  if (missionShareLinks[id] && (url.protocol === 'https:' || url.protocol === 'http:')) {
    const shareUrl = new URL(missionShareLinks[id], url);
    url.pathname = shareUrl.pathname;
    url.searchParams.delete('mission');
    shareUrl.searchParams.forEach((value, key) => url.searchParams.set(key, value));
  } else {
    url.searchParams.set('mission', id);
  }
  return url.toString();
}

function getMissionImages(m) {
  return Array.isArray(m.images) && m.images.length
    ? m.images
    : [{ src: m.image, alt: m.imageAlt || '' }];
}

function cardHTML(m) {
  const field = m.category === 'field';
  const image = getMissionImages(m)[0];
  return `<article class="mission-card" data-mission-id="${escapeHtml(m.id)}">
    <button class="card-button" type="button" data-open="${escapeHtml(m.id)}" aria-label="Read mission ${escapeHtml(m.title)}">
      <div class="card-image">
        <img src="${escapeHtml(image.src)}" alt="" loading="lazy">
        <div class="card-image-grain"></div>
        <span class="card-num">NO. ${escapeHtml(m.number)}</span>
        <span class="card-type">${field ? '↗ FIELD OPERATION' : '⌂ HOMEFRONT'}</span>
      </div>
      <div class="card-body">
        <div class="card-kicker"><span>${escapeHtml(m.kicker)}</span><span class="card-risk risk-${m.risk.toLowerCase()}"><i></i>${escapeHtml(m.risk)} RISK</span></div>
        <h2>${escapeHtml(m.title)}</h2>
        <p>${escapeHtml(m.teaser)}</p>
        <div class="card-bottom"><span class="crew-icon" aria-hidden="true">♟</span><span>${escapeHtml(m.crew)}</span><span class="open-arrow" aria-hidden="true">↗</span></div>
      </div>
    </button>
  </article>`;
}

function render() {
  clearSidebarInteraction();
  grid.innerHTML = missions.map(cardHTML).join('');
  missionList.innerHTML = missions.map((m) => `<li><button class="mission-list-button" type="button" data-open="${escapeHtml(m.id)}" aria-label="Read mission ${escapeHtml(m.title)}"><span class="mission-list-number">${escapeHtml(m.number)}</span><span class="mission-list-title">${escapeHtml(m.title)}</span></button></li>`).join('');
  missionCards = new Map(Array.from(grid.querySelectorAll('[data-mission-id]'), (card) => [card.dataset.missionId, card]));
  missionEntries = new Map(Array.from(missionList.querySelectorAll('button[data-open]'), (button) => [button.dataset.open, button]));
}

function updateSidebarHighlight() {
  const activeId = !compactLayout.matches && !dialog.open ? hoveredMission || focusedMission : null;
  missionCards.forEach((card, id) => card.classList.toggle('is-highlighted', id === activeId));
  missionEntries.forEach((button, id) => button.classList.toggle('is-highlighted', id === activeId));
}

function cancelSidebarScroll() {
  window.clearTimeout(hoverTimer);
  hoverTimer = null;
}

function clearSidebarInteraction() {
  cancelSidebarScroll();
  hoveredMission = null;
  focusedMission = null;
  updateSidebarHighlight();
}

function scrollToMission(id) {
  const card = missionCards.get(id);
  if (compactLayout.matches || dialog.open || !card) return;
  const rect = card.getBoundingClientRect();
  const viewportBottom = window.innerHeight - 24;
  let offset = 0;
  if (rect.height > window.innerHeight - 48 || rect.top < 24) offset = rect.top - 24;
  else if (rect.bottom > viewportBottom) offset = rect.bottom - viewportBottom;
  if (Math.abs(offset) > 1) {
    window.scrollBy({ top: offset, left: 0, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  }
}

function scheduleSidebarScroll(id) {
  cancelSidebarScroll();
  hoverTimer = window.setTimeout(() => {
    hoverTimer = null;
    if ((hoveredMission || focusedMission) === id) scrollToMission(id);
  }, 150);
}

function showMission(id, updateUrl = true, opener = document.activeElement) {
  const m = missions.find((item) => item.id === id);
  if (!m) return;
  const images = getMissionImages(m);
  const relatedMission = missions.find((item) => item.id === m.relatedMission);
  if (!dialog.open) priorFocus = opener;
  clearSidebarInteraction();
  dialogContent.innerHTML = `<div class="dossier-body">
      <h2 id="dialog-title">${escapeHtml(m.title)}</h2>
      <dl class="dossier-facts">
        <div><dt class="sr-only">Category:</dt><dd class="dossier-category">${escapeHtml(m.kicker)}</dd></div>
        <div><dt>Risk:</dt><dd class="risk-${m.risk.toLowerCase()}">${escapeHtml(m.risk)}</dd></div>
        <div><dt>Location:</dt><dd>${escapeHtml(m.location)}</dd></div>
        <div><dt>Crew:</dt><dd>${escapeHtml(m.crew)}</dd></div>
      </dl>
      <p class="dossier-description">${escapeHtml(m.description)}</p>
      ${m.outdatedLead ? `<p class="dossier-outdated-lead"><strong>RULED-OUT LEAD:</strong> <s>${escapeHtml(m.outdatedLead)}</s></p>` : ''}
      ${relatedMission ? `<div class="dossier-related"><span>RELATED MISSION /</span><button type="button" class="copy-button" data-open="${escapeHtml(relatedMission.id)}">${escapeHtml(relatedMission.number)} · ${escapeHtml(relatedMission.title)} ↗</button></div>` : ''}
      <h3>MISSION OBJECTIVES</h3><ol class="objective-list">${m.objectives.map((o, i) => `<li><span>${pad(i + 1)}</span>${escapeHtml(o)}</li>`).join('')}</ol>
      <div class="dossier-note"><strong>FIELD NOTES /</strong> ${escapeHtml(m.note)}</div>
      ${images.map((image, i) => `<div class="dossier-image"><img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt || '')}"><span>DOSSIER ${escapeHtml(m.number)} / ${pad(missions.length)}${images.length > 1 ? ` · IMAGE ${i + 1} / ${images.length}` : ''}</span></div>`).join('')}
      <div class="dossier-actions"><button type="button" id="copy-mission" class="copy-button">⧉ COPY MISSION LINK</button>${images.map((image, i) => `<a class="copy-button" href="${escapeHtml(image.src)}" target="_blank" rel="noopener">VIEW FULL IMAGE${images.length > 1 ? ` ${i + 1} / ${images.length}` : ''} ↗</a>`).join('')}<span>RETURN ALIVE. REPORT BACK.</span></div>
    </div>`;

  if (!dialog.open) dialog.showModal();
  if (updateUrl) {
    const url = new URL(window.location.href);
    url.searchParams.set('mission', m.id);
    window.history.replaceState(null, '', url);
  }
  dialogContent.querySelector('#copy-mission').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const link = missionLink(m.id);
    try {
      await navigator.clipboard.writeText(link);
      button.textContent = '✓ LINK COPIED';
    } catch {
      button.textContent = 'SELECT URL TO COPY';
      window.prompt('Copy this mission link:', link);
    }
  });
}

function closeMission(updateUrl = true) {
  restoringFocus = true;
  dialog.close();
  if (updateUrl) {
    const url = new URL(window.location.href);
    url.searchParams.delete('mission');
    window.history.replaceState(null, '', url);
  }
  let focusTarget = priorFocus;
  const hiddenListOpener = missionList.contains(priorFocus) && compactLayout.matches;
  if (hiddenListOpener) {
    focusTarget = missionCards.get(priorFocus.dataset.open)?.querySelector('button');
  }
  if (focusTarget && focusTarget.isConnected) focusTarget.focus({ preventScroll: !hiddenListOpener });
  restoringFocus = false;
}

grid.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-open]');
  if (button) showMission(button.dataset.open, true, button);
});
missionList.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-open]');
  if (button && !compactLayout.matches) showMission(button.dataset.open, true, button);
});
dialogContent.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-open]');
  if (!button) return;
  showMission(button.dataset.open);
  dialog.scrollTop = 0;
  document.getElementById('dialog-close').focus({ preventScroll: true });
});
missionList.addEventListener('pointermove', (event) => {
  if (compactLayout.matches || dialog.open || event.pointerType === 'touch') return;
  // Scroll can move rows under a stationary pointer. Only physical movement selects a new row.
  if (lastPointer && lastPointer.x === event.clientX && lastPointer.y === event.clientY) return;
  lastPointer = { x: event.clientX, y: event.clientY };
  const id = event.target.closest('button[data-open]')?.dataset.open || null;
  if (id === hoveredMission) return;
  hoveredMission = id;
  updateSidebarHighlight();
  cancelSidebarScroll();
  if (id) scheduleSidebarScroll(id);
});
missionList.addEventListener('pointerleave', () => {
  hoveredMission = null;
  cancelSidebarScroll();
  updateSidebarHighlight();
});
missionList.addEventListener('focusin', (event) => {
  focusedMission = event.target.closest('button[data-open]')?.dataset.open || null;
  hoveredMission = null;
  cancelSidebarScroll();
  updateSidebarHighlight();
  if (focusedMission && !compactLayout.matches && !dialog.open && !restoringFocus) scheduleSidebarScroll(focusedMission);
});
missionList.addEventListener('focusout', () => {
  focusedMission = null;
  cancelSidebarScroll();
  updateSidebarHighlight();
});
compactLayout.addEventListener('change', clearSidebarInteraction);
document.getElementById('dialog-close').addEventListener('click', () => closeMission());
dialog.addEventListener('click', (event) => { if (event.target === dialog) closeMission(); });
dialog.addEventListener('cancel', (event) => { event.preventDefault(); closeMission(); });
window.addEventListener('popstate', () => {
  const missionId = new URLSearchParams(window.location.search).get('mission');
  if (missionId) showMission(missionId, false);
  else if (dialog.open) closeMission(false);
});
render();
const linkedMission = new URLSearchParams(window.location.search).get('mission');
if (linkedMission) showMission(linkedMission, false);
