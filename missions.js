'use strict';

// Edit titles, descriptions, crew sizes and image paths here.
// To replace an illustration, put a new image in assets/ and update its image property.
const missions = [
  {
    id: 'bunker', number: '01', title: 'THE BUNKER MYSTERY',
    kicker: 'RECONNAISSANCE', category: 'field', status: 'available', risk: 'HIGH',
    image: 'assets/bunker.png', imageAlt: 'Annotated in-game map marking a possible bunker location in Knox County.',
    location: 'Unknown bunker · Knox County', crew: '3 recommended / 1 stealth specialist',
    teaser: 'Could be full of supplies. Could be absolutely nothing. Only one way to find out.',
    description: 'Rumors of a bunker nearby. Maybe military supplies, maybe forgotten treasures, maybe three cans of beans and a dead rat. Get eyes on the entrance and find out whether it is worth the trip. Go in loud with a squad, or send one sneaky bastard to scout it out.',
    objectives: ['Locate the bunker entrance', 'Scout the surroundings and assess the risk', 'Bring back any valuable supplies — and preferably everyone who went in'],
    note: 'A solo run is for someone who can move quietly, not someone who thinks they can.'
  },
  {
    id: 'groceries', number: '02', title: 'THE PRICE OF GROCERIES',
    kicker: 'SUPPLY RUN', category: 'field', status: 'available', risk: 'SEVERE',
    image: 'assets/grocery.png', imageAlt: 'Annotated map marking a canned-food location in Muldraugh and the McCoy safehouse.',
    location: 'Grocery Store · Muldraugh', crew: '3 recommended / 2 if we are smart',
    teaser: 'The shelves might have food. The previous customers definitely never left.',
    description: 'The grocery store is crawling with zombies. Unfortunately, it is also crawling with the possibility of actual food. Assemble a squad, sweep the perimeter, clear the aisles and take everything useful before the local population notices the sale.',
    objectives: ['Clear a safe approach to the storefront', 'Sweep the store without getting surrounded', 'Bring home non-perishables and useful supplies'],
    note: 'No coupons accepted. No refunds. Do not split up in aisle three.'
  },
  {
    id: 'palisade', number: '03', title: 'FORTIFY McCOY',
    kicker: 'BASE CONSTRUCTION', category: 'base', status: 'claimed', risk: 'LOW',
    image: 'assets/palisade.png', imageAlt: 'The McCoy safehouse yard with a partially built wooden palisade.',
    location: 'Safehouse', crew: '1 contractor',
    teaser: 'Finish the palisade. Barricade the entrances. Keep the dead outside.',
    description: 'A fortress is only as strong as its weakest entrance. Complete the palisade, reinforce the external doors and barricade the vulnerable approaches. The only zombies allowed inside should be the ones we accidentally brought home.',
    objectives: ['Finish the perimeter palisade', 'Barricade every external entrance', 'Inspect the walls for gaps and weak points'],
    note: 'Our contractor has taken this job. Respect the craftsmanship.'
  },
  {
    id: 'coop', number: '04', title: 'OPERATION CLUCK FORTRESS',
    kicker: 'BASE CONSTRUCTION', category: 'base', status: 'available', risk: 'LOW',
    image: 'assets/chicken-coop.svg', location: 'Safehouse', crew: '1 survivor minimum',
    teaser: 'The apocalypse took civilization. Not our right to fresh eggs.',
    description: 'Establish our very own feathered fortress. Build a chicken house and a secure first fence so future residents have somewhere to sleep, eat, and silently judge us from. Make it cozy. Make it sturdy. Do not let the chickens run the place.',
    objectives: ['Choose a safe spot for the enclosure', 'Build a fence and chicken house', 'Prepare the area for incoming livestock'],
    note: 'Chickens are future coworkers. Please act professionally.'
  },
  {
    id: 'chickens', number: '05', title: 'THE GREAT CHICKEN HEIST',
    kicker: 'LIVESTOCK RECOVERY', category: 'field', status: 'available', risk: 'MEDIUM',
    image: 'assets/chickens.png', imageAlt: 'Annotated map marking a possible chicken location near Muldraugh.',
    location: 'Farms around Knox County', crew: '2 survivors minimum',
    teaser: 'We have a coop to fill. Time to liberate some feathered survivors.',
    description: 'The coop is useless without tenants. Search nearby farms for chickens, secure them, and bring the little idiots back home alive. Remember: you are stealing chickens during a zombie apocalypse. Keep your priorities straight.',
    objectives: ['Locate a farm with living chickens', 'Find a safe way to transport them', 'Return to McCoy with livestock and all limbs intact'],
    note: 'The chickens must survive. You should make an effort as well.'
  },
  {
    id: 'mechanics', number: '06', title: 'PIMP MY APOCALYPSE RIDE',
    kicker: 'VEHICLE MAINTENANCE', category: 'base', status: 'available', risk: 'LOW',
    image: 'assets/mechanics.png', imageAlt: 'An overturned van beside a survivor in a parking lot.',
    location: 'Safehouse vehicle yard', crew: '1 mechanic minimum',
    teaser: 'Our vans are held together by hope, rust, and incredibly bad decisions.',
    description: 'We need someone with grease on their hands and a vague understanding of how engines work. Inspect our fleet, replace the worst parts, repair what can be repaired and make sure the vans start when the screaming begins.',
    objectives: ['Inspect vehicle condition and identify failing parts', 'Salvage or acquire replacement components', 'Repair and refuel the vans for future supply runs'],
    note: 'Kicking the tires is not a full mechanical inspection.'
  },
  {
    id: 'police', number: '07', title: 'THE SOUND OF FREEDOM',
    kicker: 'AMMUNITION & DRILLS', category: 'field', status: 'available', risk: 'SEVERE',
    image: 'assets/police.png', imageAlt: 'Annotated map marking Muldraugh Police Station near Wilson Street.',
    location: 'Muldraugh Police Station / Safehouse', crew: '3 survivors minimum',
    teaser: 'First we find bullets. Then we find out whether our walls actually work.',
    description: 'Our ammunition stash is looking sad. Raid the Muldraugh police station for supplies, then arrange a controlled test of our defenses back at McCoy. Lure a small group of zombies toward the base and practise holding the line. Emphasis on small.',
    objectives: ['Recover ammunition and useful police equipment', 'Prepare the safehouse firing positions', 'Conduct a controlled defense drill with a manageable horde'],
    note: 'This is a test of the defenses, not an invitation to attract half of Kentucky.'
  },
  {
    id: 'greenes', number: '08', title: 'GREEN THUMBS, RED STREETS',
    kicker: 'FARMING SUPPLIES', category: 'field', status: 'available', risk: 'MEDIUM',
    image: 'assets/greenes.svg', location: "Greene's · Muldraugh", crew: '1 survivor minimum',
    teaser: 'We cannot live on canned beans forever. Probably.',
    description: 'The rooftop garden needs a proper start. Head into Muldraugh and search Greene’s for useful gardening supplies, tools, seeds and anything else that might convince a potato to grow above a lumber yard.',
    objectives: ['Search the store for seeds and gardening tools', 'Collect useful farming supplies', 'Bring everything back for the rooftop project'],
    note: 'No one is allowed to eat the seeds on the way home.'
  },
  {
    id: 'garden', number: '09', title: 'SALAD WITH A VIEW',
    kicker: 'FOOD PRODUCTION', category: 'base', status: 'available', risk: 'LOW',
    image: 'assets/rooftop-garden.png', imageAlt: 'The McCoy Logging Company rooftop and surrounding yard.',
    location: 'Safehouse rooftop', crew: '1 green-thumbed survivor minimum',
    teaser: 'A little greenery. A little hope. A beautiful view of the undead below.',
    description: 'Once the supplies arrive, turn the McCoy rooftop into our first proper garden. Fresh vegetables, a sustainable food source and one more excuse to stay home instead of visiting zombie-infested supermarkets.',
    objectives: ['Prepare the rooftop growing area', 'Set up planters and an accessible water supply', 'Plant crops and organize ongoing maintenance'],
    note: 'Depends on farming supplies from mission 08. Zombies may not harvest without permission.'
  },
  {
    id: 'vhs', number: '10', title: 'I MISS OLD MOVIES',
    kicker: 'VHS COLLECTION', category: 'field', status: 'available', risk: 'MEDIUM',
    image: 'assets/vhs.png', imageAlt: 'A survivor beside a television displaying color bars.',
    location: 'Movie Store · Muldraugh', crew: '2 survivors recommended',
    teaser: 'The world ended. Movie night did not. Bring the VHS collection home.',
    description: 'Raid the movie store in Muldraugh and collect its VHS tapes for the safehouse. Sweep the shop, check the shelves and storage areas, then bring the collection back to McCoy. A quiet evening in front of the TV beats another evening counting canned beans.',
    objectives: ['Reach the movie store and secure a safe route inside', 'Collect VHS tapes from the shelves and storage areas', 'Return the tapes to McCoy and organize the collection'],
    note: 'Late fees have been suspended indefinitely. Getting bitten still carries a penalty.'
  },
  {
    id: 'dumbbell', number: '11', title: 'OPERATION DUMBBELL',
    kicker: 'GYM SUPPLY RUN', category: 'field', status: 'available', risk: 'MEDIUM',
    image: 'assets/dumbbell.svg',
    location: 'Gyms · Muldraugh / surrounding towns', crew: '2 survivors + cargo vehicle recommended',
    teaser: 'Running for your life counts as cardio. We could use some strength training.',
    description: 'McCoy needs a gym corner. Apparently hauling logs and sprinting from the neighbors does not count as a balanced routine. Find a gym leaflet or brochure to locate a promising gym in Muldraugh or another town, scout the place, and bring home dumbbells, barbells and any portable training gear worth the space. Sweep the shelves for energy drinks and granola bars, then turn a corner of the safehouse into somewhere we can lift things on purpose.',
    objectives: ['Find a gym leaflet or brochure and mark a location in Muldraugh or another town', 'Scout the gym and secure a safe approach and loading route', 'Recover dumbbells, barbells, portable gym equipment, energy drinks and granola bars', 'Haul the supplies back to McCoy and set up a dedicated workout area'],
    note: 'Bring a vehicle with cargo space. A personal best is less impressive if you cannot carry it home.'
  }
];

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

function cardHTML(m) {
  const field = m.category === 'field';
  return `<article class="mission-card" data-mission-id="${escapeHtml(m.id)}">
    <button class="card-button" type="button" data-open="${escapeHtml(m.id)}" aria-label="Read mission ${escapeHtml(m.title)}">
      <div class="card-image">
        <img src="${escapeHtml(m.image)}" alt="" loading="lazy">
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
      <h3>MISSION OBJECTIVES</h3><ol class="objective-list">${m.objectives.map((o, i) => `<li><span>${pad(i + 1)}</span>${escapeHtml(o)}</li>`).join('')}</ol>
      <div class="dossier-note"><strong>FIELD NOTES /</strong> ${escapeHtml(m.note)}</div>
      <div class="dossier-image"><img src="${escapeHtml(m.image)}" alt="${escapeHtml(m.imageAlt || '')}"><span>DOSSIER ${escapeHtml(m.number)} / ${pad(missions.length)}</span></div>
      <div class="dossier-actions"><button type="button" id="copy-mission" class="copy-button">⧉ COPY MISSION LINK</button><a class="copy-button" href="${escapeHtml(m.image)}" target="_blank" rel="noopener">VIEW FULL IMAGE ↗</a><span>RETURN ALIVE. REPORT BACK.</span></div>
    </div>`;

  if (!dialog.open) dialog.showModal();
  if (updateUrl) {
    const url = new URL(window.location.href);
    url.searchParams.set('mission', m.id);
    window.history.replaceState(null, '', url);
  }
  dialogContent.querySelector('#copy-mission').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const link = new URL(window.location.href);
    link.searchParams.set('mission', m.id);
    try {
      await navigator.clipboard.writeText(link.toString());
      button.textContent = '✓ LINK COPIED';
    } catch {
      button.textContent = 'SELECT URL TO COPY';
      window.prompt('Copy this mission link:', link.toString());
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
