'use strict';

// Crawlers read the static metadata; visitors continue to the existing briefing.
const missionLinkElement = document.getElementById('open-mission');
if (missionLinkElement) {
  const destination = new URL(missionLinkElement.href);
  const missionId = destination.searchParams.get('mission');
  destination.search = window.location.search;
  destination.searchParams.set('mission', missionId);
  destination.hash = window.location.hash;
  window.location.replace(destination.toString());
}
