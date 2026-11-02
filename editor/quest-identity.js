(function () {
  function suggestIdentity(missions, title = '') {
    const ids = new Set(missions.map(mission => mission.id));
    const stem = title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/g, '') || 'new-quest';
    let id = stem, counter = 2;
    while (ids.has(id)) {
      const suffix = `-${counter++}`;
      id = stem.slice(0, 80 - suffix.length).replace(/-+$/g, '') + suffix;
    }
    const used = new Set(missions.map(mission => Number(mission.number)));
    const next = Math.max(0, ...used) + 1;
    const number = next <= 99 ? next : Array.from({ length: 99 }, (_, index) => index + 1).find(value => !used.has(value));
    return { id, number: number === undefined ? '' : String(number).padStart(2, '0') };
  }
  const api = Object.freeze({ suggestIdentity });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else globalThis.questIdentity = api;
})();
