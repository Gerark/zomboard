'use strict';

// Edit titles, descriptions, crew sizes and image paths here.
// To replace an illustration, put a new image in assets/ and update its image property.
const missions = [
  {
    id: 'bunker', number: '01', title: 'THE BUNKER MYSTERY',
    kicker: 'RECONNAISSANCE', category: 'field', status: 'available', risk: 'HIGH',
    image: 'assets/bunker.svg', location: 'Unknown bunker · Knox County', crew: '3 recommended / 1 stealth specialist',
    teaser: 'Could be full of supplies. Could be absolutely nothing. Only one way to find out.',
    description: 'Rumors of a bunker nearby. Maybe military supplies, maybe forgotten treasures, maybe three cans of beans and a dead rat. Get eyes on the entrance and find out whether it is worth the trip. Go in loud with a squad, or send one sneaky bastard to scout it out.',
    objectives: ['Locate the bunker entrance', 'Scout the surroundings and assess the risk', 'Bring back any valuable supplies — and preferably everyone who went in'],
    note: 'A solo run is for someone who can move quietly, not someone who thinks they can.'
  },
  {
    id: 'groceries', number: '02', title: "DEAD MAN'S SHOPPING LIST",
    kicker: 'SUPPLY RUN', category: 'field', status: 'available', risk: 'SEVERE',
    image: 'assets/grocery.svg', location: 'Grocery Store · Muldraugh', crew: '3 recommended / 2 if we are smart',
    teaser: 'The shelves might have food. The previous customers definitely never left.',
    description: 'The grocery store is crawling with zombies. Unfortunately, it is also crawling with the possibility of actual food. Assemble a squad, sweep the perimeter, clear the aisles and take everything useful before the local population notices the sale.',
    objectives: ['Clear a safe approach to the storefront', 'Sweep the store without getting surrounded', 'Bring home non-perishables and useful supplies'],
    note: 'No coupons accepted. No refunds. Do not split up in aisle three.'
  },
  {
    id: 'palisade', number: '03', title: 'FORTIFY McCOY',
    kicker: 'BASE CONSTRUCTION', category: 'base', status: 'claimed', risk: 'LOW',
    image: 'assets/palisade.svg', location: 'McCoy Logging Co. · Safehouse', crew: '1 contractor',
    teaser: 'Finish the palisade. Barricade the entrances. Keep the dead outside.',
    description: 'A fortress is only as strong as its weakest entrance. Complete the palisade, reinforce the external doors and barricade the vulnerable approaches. The only zombies allowed inside should be the ones we accidentally brought home.',
    objectives: ['Finish the perimeter palisade', 'Barricade every external entrance', 'Inspect the walls for gaps and weak points'],
    note: 'JOB ALREADY CLAIMED by our resident contractor. Respect the craftsmanship.'
  },
  {
    id: 'coop', number: '04', title: 'OPERATION CLUCK FORTRESS',
    kicker: 'BASE CONSTRUCTION', category: 'base', status: 'available', risk: 'LOW',
    image: 'assets/chicken-coop.svg', location: 'McCoy Logging Co. · Safehouse', crew: '1 survivor minimum',
    teaser: 'The apocalypse took civilization. Not our right to fresh eggs.',
    description: 'Establish our very own feathered fortress. Build a chicken house and a secure first fence so future residents have somewhere to sleep, eat, and silently judge us from. Make it cozy. Make it sturdy. Do not let the chickens run the place.',
    objectives: ['Choose a safe spot for the enclosure', 'Build a fence and chicken house', 'Prepare the area for incoming livestock'],
    note: 'Chickens are future coworkers. Please act professionally.'
  },
  {
    id: 'chickens', number: '05', title: 'THE GREAT CHICKEN HEIST',
    kicker: 'LIVESTOCK RECOVERY', category: 'field', status: 'available', risk: 'MEDIUM',
    image: 'assets/chickens.svg', location: 'Farms around Knox County', crew: '2 survivors minimum',
    teaser: 'We have a coop to fill. Time to liberate some feathered survivors.',
    description: 'The coop is useless without tenants. Search nearby farms for chickens, secure them, and bring the little idiots back home alive. Remember: you are stealing chickens during a zombie apocalypse. Keep your priorities straight.',
    objectives: ['Locate a farm with living chickens', 'Find a safe way to transport them', 'Return to McCoy with livestock and all limbs intact'],
    note: 'The chickens must survive. You should make an effort as well.'
  },
  {
    id: 'mechanics', number: '06', title: 'PIMP MY APOCALYPSE RIDE',
    kicker: 'VEHICLE MAINTENANCE', category: 'base', status: 'available', risk: 'LOW',
    image: 'assets/mechanic.svg', location: 'McCoy Logging Co. · Vehicle yard', crew: '1 mechanic minimum',
    teaser: 'Our vans are held together by hope, rust, and incredibly bad decisions.',
    description: 'We need someone with grease on their hands and a vague understanding of how engines work. Inspect our fleet, replace the worst parts, repair what can be repaired and make sure the vans start when the screaming begins.',
    objectives: ['Inspect vehicle condition and identify failing parts', 'Salvage or acquire replacement components', 'Repair and refuel the vans for future supply runs'],
    note: 'Kicking the tires is not a full mechanical inspection.'
  },
  {
    id: 'police', number: '07', title: 'THE SOUND OF FREEDOM',
    kicker: 'AMMUNITION & DRILLS', category: 'field', status: 'available', risk: 'SEVERE',
    image: 'assets/police.svg', location: 'Muldraugh Police Station / McCoy Base', crew: '3 survivors minimum',
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
    id: 'garden', number: '09', title: 'GARDEN OF THE DEAD',
    kicker: 'FOOD PRODUCTION', category: 'base', status: 'available', risk: 'LOW',
    image: 'assets/rooftop.svg', location: 'McCoy Logging Co. · Rooftop', crew: '1 green-thumbed survivor minimum',
    teaser: 'A little greenery. A little hope. A beautiful view of the undead below.',
    description: 'Once the supplies arrive, turn the McCoy rooftop into our first proper garden. Fresh vegetables, a sustainable food source and one more excuse to stay home instead of visiting zombie-infested supermarkets.',
    objectives: ['Prepare the rooftop growing area', 'Set up planters and an accessible water supply', 'Plant crops and organize ongoing maintenance'],
    note: 'Depends on farming supplies from mission 08. Zombies may not harvest without permission.'
  }
];

const grid = document.getElementById('mission-grid');
const filters = document.getElementById('filters');
const search = document.getElementById('search');
const dialog = document.getElementById('mission-dialog');
const dialogContent = document.getElementById('dialog-content');
let activeFilter = 'all';
let priorFocus = null;

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (ch) => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[ch]));
const pad = (n) => String(n).padStart(2, '0');

function cardHTML(m) {
  const claimed = m.status === 'claimed';
  const field = m.category === 'field';
  return `<article class="mission-card ${claimed ? 'is-claimed' : ''}">
    <button class="card-button" type="button" data-open="${escapeHtml(m.id)}" aria-label="Read mission ${escapeHtml(m.title)}">
      <div class="card-image">
        <img src="${escapeHtml(m.image)}" alt="" loading="lazy">
        <div class="card-image-grain"></div>
        <span class="card-num">NO. ${m.number}</span>
        ${claimed ? '<span class="claimed-stamp">ASSIGNED</span>' : ''}
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
  const query = search.value.trim().toLocaleLowerCase();
  const visible = missions.filter((m) => {
    const matchesTab = activeFilter === 'all' || m.category === activeFilter || (activeFilter === 'claimed' && m.status === 'claimed');
    const haystack = [m.title, m.kicker, m.location, m.teaser, m.crew, m.risk].join(' ').toLocaleLowerCase();
    return matchesTab && (!query || haystack.includes(query));
  });
  grid.innerHTML = visible.map(cardHTML).join('');
  document.getElementById('no-results').hidden = visible.length > 0;
  document.getElementById('display-count').textContent = `SHOWING ${pad(visible.length)} / ${pad(missions.length)} ASSIGNMENTS`;
}

function showMission(id, updateUrl = true) {
  const m = missions.find((item) => item.id === id);
  if (!m) return;
  priorFocus = document.activeElement;
  dialogContent.innerHTML = `<div class="dossier-image"><img src="${escapeHtml(m.image)}" alt=""><span>DOSSIER ${m.number} / 09</span><span class="dossier-classification">${m.status === 'claimed' ? 'ALREADY ASSIGNED' : 'AVAILABLE FOR DUTY'}</span></div>
    <div class="dossier-body">
      <div class="dossier-overline">MCCOY LOGGING CO. / MISSION BRIEFING / ${m.number}</div>
      <h2 id="dialog-title">${escapeHtml(m.title)}</h2>
      <div class="dossier-badges"><span>${escapeHtml(m.kicker)}</span><span class="risk-${m.risk.toLowerCase()}">${escapeHtml(m.risk)} RISK</span><span>${m.status === 'claimed' ? '● CLAIMED' : '○ AVAILABLE'}</span></div>
      <p class="dossier-description">${escapeHtml(m.description)}</p>
      <div class="dossier-details"><div><small>LOCATION</small><strong>${escapeHtml(m.location)}</strong></div><div><small>CREW REQUIREMENT</small><strong>${escapeHtml(m.crew)}</strong></div></div>
      <h3>MISSION OBJECTIVES</h3><ol class="objective-list">${m.objectives.map((o, i) => `<li><span>${pad(i + 1)}</span>${escapeHtml(o)}</li>`).join('')}</ol>
      <div class="dossier-note"><strong>FIELD NOTES /</strong> ${escapeHtml(m.note)}</div>
      <div class="dossier-actions"><button type="button" id="copy-mission" class="copy-button">⧉ COPY MISSION LINK</button><span>RETURN ALIVE. REPORT BACK.</span></div>
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

function closeMission() {
  dialog.close();
  const url = new URL(window.location.href);
  url.searchParams.delete('mission');
  window.history.replaceState(null, '', url);
  if (priorFocus && priorFocus.isConnected) priorFocus.focus();
}

filters.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-filter]');
  if (!button) return;
  activeFilter = button.dataset.filter;
  for (const node of filters.querySelectorAll('button[data-filter]')) {
    const active = node === button;
    node.classList.toggle('active', active);
    node.setAttribute('aria-pressed', String(active));
  }
  render();
});
search.addEventListener('input', render);
grid.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-open]');
  if (button) showMission(button.dataset.open);
});
document.getElementById('dialog-close').addEventListener('click', closeMission);
dialog.addEventListener('click', (event) => { if (event.target === dialog) closeMission(); });
dialog.addEventListener('cancel', (event) => { event.preventDefault(); closeMission(); });
window.addEventListener('popstate', () => {
  const missionId = new URLSearchParams(window.location.search).get('mission');
  if (missionId) showMission(missionId, false);
  else if (dialog.open) dialog.close();
});
render();
const linkedMission = new URLSearchParams(window.location.search).get('mission');
if (linkedMission) showMission(linkedMission, false);
