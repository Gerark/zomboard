'use strict';

const openButton = document.getElementById('open-board');
const saveButton = document.getElementById('save-quest');
const newButton = document.getElementById('new-quest');
const status = document.getElementById('status');
const list = document.getElementById('quest-list');
const detail = document.getElementById('quest-detail');
let board = null;
let selected = 0;
let draft = null;
let working = false;
let needsReload = false;
let creating = false;
let previousSelection = 0;
let idWasEdited = false;
const editableFields = { title: ['Quest title', 256], teaser: ['Card teaser', 512], description: ['Description', 8192], note: ['Field notes', 8192] };
const metadataFields = ['kicker', 'category', 'risk', 'location', 'crew', 'completed'];
const picker = document.getElementById('image-picker');
let availableImages = [];

function imageEntries(mission) { return mission.images?.length ? mission.images : mission.image ? [{ src: mission.image, alt: mission.imageAlt || '' }] : []; }
function makeDraft(mission, isNew = false) {
  return {
    ...Object.fromEntries([...Object.keys(editableFields), ...metadataFields].map(key => [key, mission[key]])),
    ...(isNew ? { id: mission.id, number: mission.number } : {}),
    objectives: mission.objectives.map((objective, sourceIndex) => ({ sourceIndex: isNew ? null : sourceIndex, text: objective.text })),
    images: imageEntries(mission).map((image, sourceIndex) => ({ sourceIndex: isNew ? null : sourceIndex, src: image.src, alt: image.alt || '' }))
  };
}

function isDirty() {
  return Boolean(board?.missions[selected] && draft && (creating || JSON.stringify(draft) !== JSON.stringify(makeDraft(board.missions[selected]))));
}

function resetDraft() {
  const mission = board?.missions[selected];
  draft = mission ? makeDraft(mission, creating) : null;
}

function updateControls() {
  const dirty = isDirty();
  openButton.disabled = working;
  newButton.disabled = working || !board || creating || needsReload || board.missions.length >= 128;
  saveButton.disabled = working || !dirty || needsReload;
  document.getElementById('board').inert = working;
  const discard = document.getElementById('discard-changes');
  if (discard) { discard.disabled = working || !dirty; discard.textContent = creating ? 'Cancel new quest' : 'Discard changes'; }
  const indicator = document.getElementById('draft-status');
  if (indicator) indicator.textContent = creating ? 'New quest — not saved yet' : dirty ? 'Unsaved changes' : 'Quest matches the loaded file.';
  for (const button of list.querySelectorAll('button')) {
    const modified = Number(button.dataset.index) === selected && dirty;
    button.classList.toggle('has-draft', modified);
    const mission = board.missions[Number(button.dataset.index)];
    const current = Number(button.dataset.index) === selected ? { ...mission, ...draft } : mission;
    button.querySelector('.quest-title').textContent = current.title || 'Untitled quest';
    button.querySelector('.quest-number').textContent = current.number || '??';
    const state = button.querySelector('.quest-state');
    state.textContent = `${creating && Number(button.dataset.index) === selected ? 'NEW · ' : ''}${current.completed ? 'COMPLETED' : 'ACTIVE'}${modified ? ' · UNSAVED' : ''}`;
    state.classList.toggle('completed', current.completed);
  }
  document.title = `${dirty ? '* ' : ''}ZomBoard Quest Editor`;
}

function syncDirty() {
  updateControls();
  window.questBrowser.setDirty(isDirty()).catch(error => showError(error.message));
}

function showError(message) {
  status.textContent = message;
  status.classList.add('error');
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function section(title, text) {
  const node = element('section', 'briefing-section');
  node.append(element('h3', '', title));
  if (text !== undefined) node.append(element('p', 'copy', text));
  return node;
}

function mapTarget(target) {
  return element('p', 'map-target', `Map target · X ${target.x} / Y ${target.y}${Object.hasOwn(target, 'zoom') ? ` / Zoom ${target.zoom}` : ''}`);
}

function textForm() {
  const node = section('Quest text');
  const tools = element('div', 'edit-tools');
  const indicator = element('span', 'muted');
  indicator.id = 'draft-status';
  const discard = element('button', 'secondary-button', 'Discard changes');
  discard.type = 'button';
  discard.id = 'discard-changes';
  tools.append(indicator, discard);
  node.append(tools);
  const form = element('form', 'text-form');
  form.id = 'quest-form';
  form.noValidate = true;
  for (const [key, [name, limit]] of Object.entries(editableFields)) {
    const row = element('div', 'text-field');
    const label = element('label', '', name);
    label.htmlFor = `field-${key}`;
    const input = element(key === 'title' ? 'input' : 'textarea');
    input.id = `field-${key}`;
    input.name = key;
    input.dataset.field = key;
    input.value = draft[key];
    input.maxLength = limit;
    input.required = true;
    if (key !== 'title') input.rows = key === 'description' ? 6 : 3;
    const help = element('p', 'field-help', `Up to ${limit.toLocaleString('en')} characters.`);
    help.id = `help-${key}`;
    input.setAttribute('aria-describedby', help.id);
    const error = element('p', 'field-error');
    error.id = `error-${key}`;
    error.hidden = true;
    row.append(label, input, help, error);
    form.append(row);
  }
  node.append(form);
  return node;
}

function fieldError(field) {
  const error = element('p', 'field-error'); error.id = `error-${field}`; error.hidden = true; return error;
}

function detailsForm() {
  const node = section('Quest details');
  const form = element('div', 'text-form details-form');
  const settings = [
    ['id', 'Stable link ID', 80], ['number', 'Display number', 2],
    ['kicker', 'Classification', 256], ['category', 'Category', ['field', 'base']],
    ['risk', 'Risk', ['LOW', 'MEDIUM', 'HIGH', 'SEVERE']], ['location', 'Location', 256], ['crew', 'Crew', 256]
  ];
  for (const [key, labelText, options] of settings) {
    const row = element('div', 'text-field');
    const label = element('label', '', labelText); label.htmlFor = `field-${key}`;
    const input = element(Array.isArray(options) ? 'select' : 'input');
    input.id = label.htmlFor; input.dataset.field = key;
    if (Array.isArray(options)) {
      for (const value of options) { const option = element('option', '', value === 'field' ? 'Field operation' : value === 'base' ? 'Homefront / base' : value); option.value = value; input.append(option); }
    } else input.maxLength = options;
    input.value = draft[key] ?? board.missions[selected][key];
    input.required = true;
    if (key === 'id' || key === 'number') input.disabled = !creating;
    if (key === 'number') input.inputMode = 'numeric';
    const help = element('p', 'field-help', key === 'id' ? (creating ? 'Unique lowercase ID. Shared links use this ID; it locks after saving.' : 'Locked to preserve shared links.') : key === 'number' ? (creating ? 'Two digits. Adding quests never renumbers existing quests.' : 'Locked to preserve numbering and narrative references.') : `Choose a ${labelText.toLowerCase()}${Array.isArray(options) ? '.' : '; up to 256 characters.'}`);
    help.id = `help-${key}`; input.setAttribute('aria-describedby', help.id);
    row.append(label, input, help, fieldError(key)); form.append(row);
  }
  const row = element('div', 'text-field completion-field');
  const label = element('label', '', 'Completed quest'); label.htmlFor = 'field-completed';
  const input = element('input'); input.type = 'checkbox'; input.id = label.htmlFor; input.dataset.field = 'completed'; input.checked = draft.completed;
  const help = element('p', 'field-help', 'Shared board status. New quests start active.'); help.id = 'help-completed'; input.setAttribute('aria-describedby', help.id);
  row.append(label, input, help, fieldError('completed')); form.append(row);
  node.append(form);
  return node;
}

function refreshSummary() {
  const mission = { ...board.missions[selected], ...draft };
  const heading = detail.querySelector('.quest-header');
  if (!heading) return;
  heading.querySelector('.label').textContent = `MISSION ${mission.number || '??'} / ${mission.id}`;
  heading.querySelector('h2').textContent = mission.title || 'Untitled quest';
  heading.querySelector('.kicker').textContent = mission.kicker;
  const completion = heading.querySelector('.completion'); completion.textContent = mission.completed ? 'Completed quest' : 'Active quest'; completion.classList.toggle('completed', mission.completed);
  const values = [mission.category === 'field' ? 'Field operation' : 'Homefront / base', mission.risk, mission.location, mission.crew];
  detail.querySelectorAll('.facts dd').forEach((node, index) => { node.textContent = values[index]; });
  if (creating) {
    const duplicate = board.missions.slice(0, -1).some(item => item.number === draft.number);
    document.getElementById('help-number').textContent = duplicate ? 'This display number is already used. You can choose another; IDs must be unique.' : 'Two digits. Adding quests never renumbers existing quests.';
  }
}

function renderCounts() {
  const completed = board.missions.reduce((count, mission, index) => count + Number(index === selected && draft ? draft.completed : mission.completed), 0);
  document.getElementById('quest-count').textContent = String(board.missions.length);
  document.getElementById('quest-totals').textContent = `${board.missions.length - completed} active · ${completed} completed${creating ? ' · includes draft' : ''}`;
}

function actions(kind, index, length) {
  const tools = element('div', 'row-actions');
  for (const [action, label] of [['up', 'Move up'], ['down', 'Move down'], ['remove', 'Remove']]) {
    const button = element('button', 'secondary-button', action === 'up' ? '↑' : action === 'down' ? '↓' : label);
    button.type = 'button'; button.dataset.list = kind; button.dataset.action = action; button.dataset.row = String(index);
    button.setAttribute('aria-label', `${label} ${kind === 'objectives' ? 'objective' : 'image'} ${index + 1}`);
    button.disabled = (action === 'up' && index === 0) || (action === 'down' && index === length - 1);
    tools.append(button);
  }
  return tools;
}

function objectiveEditor() {
  const node = section('Objectives'); node.id = 'objective-editor';
  const controls = element('div', 'edit-tools');
  controls.append(element('p', 'muted', '1–16 objectives. Existing map targets move with their objective.'));
  const add = element('button', 'secondary-button', '+ Objective'); add.id = 'add-objective'; add.type = 'button'; add.disabled = draft.objectives.length >= 16;
  controls.append(add); node.append(controls, fieldError('objectives'));
  const rows = element('ol', 'objectives editable-list'); rows.id = 'field-objectives'; rows.tabIndex = -1;
  draft.objectives.forEach((objective, index) => {
    const row = element('li', 'editable-row'); row.append(actions('objectives', index, draft.objectives.length));
    const label = element('label', '', `Objective ${index + 1}`); label.htmlFor = `field-objectives.${index}.text`;
    const input = element('textarea'); input.id = label.htmlFor; input.dataset.objective = String(index); input.value = objective.text; input.rows = 2; input.maxLength = 512;
    row.append(label, input, fieldError(`objectives.${index}.text`));
    const target = objective.sourceIndex === null ? null : board.missions[selected].objectives[objective.sourceIndex].mapTarget;
    if (target) row.append(mapTarget(target));
    rows.append(row);
  });
  node.append(rows); return node;
}

function imageEditor() {
  const node = section('Images'); node.id = 'image-editor';
  node.append(element('p', 'muted', '1–8 ordered images. The first is the card thumbnail. Removing an entry keeps its file.'));
  const controls = element('div', 'row-actions');
  for (const [id, text] of [['add-existing-image', 'Add existing'], ['import-image', 'Import PNG / SVG']]) {
    const button = element('button', 'secondary-button', text); button.id = id; button.type = 'button'; button.disabled = draft.images.length >= 8; controls.append(button);
  }
  node.append(controls, fieldError('images'));
  const rows = element('ol', 'image-references editable-list'); rows.id = 'field-images'; rows.tabIndex = -1;
  draft.images.forEach((image, index) => {
    const row = element('li', 'editable-row'); row.append(actions('images', index, draft.images.length));
    row.append(element('p', 'label accent', index === 0 ? 'CARD THUMBNAIL / IMAGE 1' : `BRIEFING IMAGE ${index + 1}`));
    const preview = element('img', 'image-preview'); preview.alt = `Preview of image ${index + 1}`;
    const previewStatus = element('p', 'muted', 'Loading preview…');
    const reference = element('code', 'image-path', image.src); reference.id = `field-images.${index}.src`; reference.tabIndex = -1;
    const label = element('label', '', 'Alternative text'); label.htmlFor = `field-images.${index}.alt`;
    const alt = element('textarea'); alt.id = label.htmlFor; alt.dataset.imageAlt = String(index); alt.rows = 2; alt.maxLength = 512; alt.value = image.alt;
    row.append(preview, previewStatus, reference, fieldError(`images.${index}.src`), label, alt, fieldError(`images.${index}.alt`));
    rows.append(row);
    window.questBrowser.previewImage(image.src).then(result => {
      if (!row.isConnected) return;
      if (!result.ok) { preview.hidden = true; previewStatus.textContent = result.error; return; }
      preview.src = result.preview; previewStatus.textContent = `${result.width} × ${result.height}`;
    }).catch(error => { if (row.isConnected) { preview.hidden = true; previewStatus.textContent = error.message; } });
  });
  node.append(rows); return node;
}

function renderEditors() {
  document.getElementById('objective-editor')?.replaceWith(objectiveEditor());
  document.getElementById('image-editor')?.replaceWith(imageEditor());
  syncDirty();
}

function renderList() {
  const entries = board.missions.map((mission, index) => {
    const row = element('li');
    const button = element('button', `quest-button${selected === index ? ' selected' : ''}`);
    button.type = 'button';
    button.dataset.index = String(index);
    button.setAttribute('aria-pressed', String(selected === index));
    button.append(element('span', 'quest-number', mission.number), element('span', 'quest-title', mission.title), element('span', `quest-state${mission.completed ? ' completed' : ''}`, mission.completed ? 'COMPLETED' : 'ACTIVE'));
    row.append(button);
    return row;
  });
  list.replaceChildren(...entries);
  renderCounts();
}

function renderDetail() {
  const mission = board.missions[selected];
  detail.replaceChildren();
  if (!mission) {
    detail.append(element('h2', '', 'An empty board.'), element('p', 'copy', 'Use + New quest to create the first quest.'));
    return;
  }
  const heading = element('header', 'quest-header');
  heading.append(element('p', 'label accent', `MISSION ${mission.number} / ${mission.id}`), element('h2', '', mission.title), element('p', 'kicker', mission.kicker), element('span', `completion${mission.completed ? ' completed' : ''}`, mission.completed ? 'Completed quest' : 'Active quest'));
  detail.append(heading);
  const facts = element('dl', 'facts');
  for (const [label, value] of [['Category', mission.category === 'field' ? 'Field operation' : 'Homefront / base'], ['Risk', mission.risk], ['Location', mission.location], ['Crew', mission.crew]]) {
    const row = element('div');
    row.append(element('dt', '', label), element('dd', '', value));
    facts.append(row);
  }
  detail.append(facts, textForm(), detailsForm());
  if (mission.outdatedLead) detail.append(section('Ruled-out lead', mission.outdatedLead));
  if (mission.relatedMission) {
    const related = board.missions.find(candidate => candidate.id === mission.relatedMission);
    detail.append(section('Related quest', `${related.number} · ${related.title} (${related.id})`));
  }
  if (mission.mapTarget) {
    const target = section('Quest map target');
    target.append(mapTarget(mission.mapTarget));
    detail.append(target);
  }
  detail.append(objectiveEditor(), imageEditor());
  refreshSummary();
}

list.addEventListener('click', async event => {
  const button = event.target.closest('button[data-index]');
  if (!button || !list.contains(button) || working || Number(button.dataset.index) === selected) return;
  if (isDirty()) {
    working = true;
    updateControls();
    let discard;
    try { discard = await window.questBrowser.confirmDiscard(); }
    catch (error) { showError(error.message); }
    finally { working = false; updateControls(); }
    if (!discard) return;
  }
  const target = Number(button.dataset.index);
  if (creating) { board.missions.pop(); creating = false; }
  selected = target;
  resetDraft();
  renderList();
  renderDetail();
  detail.scrollTop = 0;
  syncDirty();
});

openButton.addEventListener('click', async () => {
  if (working) return;
  working = true;
  updateControls();
  const previousStatus = status.textContent;
  const previousError = status.classList.contains('error');
  status.classList.remove('error');
  status.textContent = 'Choose a ZomBoard folder…';
  try {
    const result = await window.questBrowser.openBoard();
    if (!result.ok) throw new Error(result.error);
    if (result.canceled) { status.textContent = previousStatus; status.classList.toggle('error', previousError); return; }
    board = result.board;
    creating = false;
    selected = 0;
    needsReload = false;
    resetDraft();
    status.textContent = board.root;
    renderList();
    renderDetail();
    detail.scrollTop = 0;
    list.scrollTop = 0;
    document.getElementById('welcome').hidden = true;
    document.getElementById('board').hidden = false;
  } catch (error) {
    status.textContent = error.message;
    status.classList.add('error');
  } finally { working = false; updateControls(); }
});

newButton.addEventListener('click', async () => {
  if (working || !board || creating || needsReload || board.missions.length >= 128) return;
  working = true; updateControls();
  try {
    if (isDirty() && !await window.questBrowser.confirmDiscard()) return;
    await window.questBrowser.setDirty(false);
    previousSelection = selected;
    const identity = window.questIdentity.suggestIdentity(board.missions);
    board.missions.push({ ...identity, title: '', kicker: 'FIELD OPERATION', category: 'field', risk: 'MEDIUM', completed: false, location: '', crew: '', teaser: '', description: '', note: '', objectives: [{ text: '' }], images: [] });
    selected = board.missions.length - 1; creating = true; idWasEdited = false;
    resetDraft(); renderList(); renderDetail(); detail.scrollTop = 0;
    status.classList.remove('error'); status.textContent = 'New quest draft. Fill in the text, details, objectives and at least one image, then Save quest.';
    syncDirty(); document.getElementById('field-title').focus();
  } catch (error) { showError(error.message); }
  finally { working = false; updateControls(); }
});

detail.addEventListener('submit', event => event.preventDefault());
detail.addEventListener('input', event => {
  if (working) return;
  let field;
  if (event.target.hasAttribute('data-objective')) {
    const index = Number(event.target.dataset.objective); draft.objectives[index].text = event.target.value; field = `objectives.${index}.text`;
  } else if (event.target.hasAttribute('data-image-alt')) {
    const index = Number(event.target.dataset.imageAlt); draft.images[index].alt = event.target.value; field = `images.${index}.alt`;
  }
  if (field) {
    document.getElementById(`error-${field}`).hidden = true; event.target.removeAttribute('aria-invalid'); event.target.removeAttribute('aria-describedby'); syncDirty(); return;
  }
  const key = event.target.dataset.field;
  if (!Object.hasOwn(editableFields, key) && !metadataFields.includes(key) && !(creating && ['id', 'number'].includes(key))) return;
  draft[key] = key === 'completed' ? event.target.checked : event.target.value;
  if (creating && key === 'id') idWasEdited = true;
  if (creating && key === 'title' && !idWasEdited) {
    draft.id = window.questIdentity.suggestIdentity(board.missions.slice(0, -1), draft.title).id;
    document.getElementById('field-id').value = draft.id;
    document.getElementById('error-id').hidden = true;
    document.getElementById('field-id').removeAttribute('aria-invalid');
  }
  const error = document.getElementById(`error-${key}`);
  error.hidden = true;
  event.target.removeAttribute('aria-invalid');
  event.target.setAttribute('aria-describedby', `help-${key}`);
  refreshSummary(); renderCounts();
  syncDirty();
});

detail.addEventListener('click', async event => {
  if (working) return;
  const action = event.target.closest('button[data-list]');
  if (action) {
    const rows = draft[action.dataset.list], index = Number(action.dataset.row);
    let focus = index;
    if (action.dataset.action === 'remove') rows.splice(index, 1);
    else { focus = index + (action.dataset.action === 'up' ? -1 : 1); [rows[index], rows[focus]] = [rows[focus], rows[index]]; }
    renderEditors();
    detail.querySelector(action.dataset.list === 'objectives' ? `[data-objective="${Math.min(focus, rows.length - 1)}"]` : `[data-image-alt="${Math.min(focus, rows.length - 1)}"]`)?.focus();
    return;
  }
  if (event.target.closest('#add-objective')) {
    if (draft.objectives.length < 16) { draft.objectives.push({ sourceIndex: null, text: '' }); renderEditors(); document.getElementById(`field-objectives.${draft.objectives.length - 1}.text`)?.focus(); }
    return;
  }
  if (event.target.closest('#add-existing-image')) {
    working = true; updateControls();
    try {
      const result = await window.questBrowser.listImages(); if (!result.ok) throw new Error(result.error);
      availableImages = result.paths; document.getElementById('image-search').value = ''; renderImageOptions(); picker.showModal(); document.getElementById('image-search').focus();
    } catch (error) { showError(error.message); }
    finally { working = false; updateControls(); }
    return;
  }
  if (event.target.closest('#import-image')) {
    if (draft.images.length >= 8) return;
    working = true; updateControls();
    try {
      const result = await window.questBrowser.importImage(); if (!result.ok) throw new Error(result.error);
      if (!result.canceled) { draft.images.push({ sourceIndex: null, src: result.image.src, alt: '' }); renderEditors(); }
    } catch (error) { showError(error.message); }
    finally { working = false; updateControls(); }
    return;
  }
  if (!event.target.closest('#discard-changes') || working || !isDirty()) return;
  working = true;
  updateControls();
  try {
    if (!await window.questBrowser.confirmDiscard()) return;
    const scroll = detail.scrollTop;
    if (creating) { board.missions.pop(); creating = false; selected = Math.min(previousSelection, board.missions.length - 1); }
    resetDraft();
    renderList();
    renderDetail();
    detail.scrollTop = scroll;
    syncDirty();
  } catch (error) { showError(error.message); }
  finally { working = false; updateControls(); }
});

async function saveQuest() {
  if (working || !isDirty() || needsReload) return;
  working = true;
  updateControls();
  status.classList.remove('error');
  status.textContent = 'Validating the quest and images, backing up the source and saving…';
  try {
    const savedId = creating ? draft.id : board.missions[selected].id;
    const result = creating ? await window.questBrowser.createQuest(draft) : await window.questBrowser.saveQuest(savedId, draft);
    if (!result.ok) {
      needsReload = result.conflict === true;
      for (const [key, message] of Object.entries(result.fieldErrors || {})) {
        const error = document.getElementById(`error-${key}`);
        const input = document.getElementById(`field-${key}`);
        if (!error || !input) continue;
        error.textContent = message;
        error.hidden = false;
        input.setAttribute('aria-invalid', 'true');
        input.setAttribute('aria-describedby', `${document.getElementById(`help-${key}`) ? `help-${key} ` : ''}error-${key}`);
      }
      throw new Error(result.error);
    }
    const scroll = detail.scrollTop;
    const listScroll = list.scrollTop;
    board = result.board;
    creating = false;
    selected = board.missions.findIndex(mission => mission.id === savedId);
    resetDraft();
    renderList();
    renderDetail();
    detail.scrollTop = scroll;
    list.scrollTop = listScroll;
    status.textContent = result.saved ? `Quest saved locally. Backup: ${result.backup}${result.warning ? ` · ${result.warning}` : ''}` : 'No text changes to save.';
    syncDirty();
  } catch (error) { showError(error.message); }
  finally { working = false; updateControls(); }
}

saveButton.addEventListener('click', saveQuest);
document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    if (!picker.open) saveQuest();
  }
});

function renderImageOptions() {
  const query = document.getElementById('image-search').value.toLowerCase();
  const buttons = availableImages.filter(src => src.toLowerCase().includes(query)).map(src => {
    const button = element('button', 'asset-option', src); button.type = 'button'; button.dataset.asset = src; return button;
  });
  document.getElementById('image-options').replaceChildren(...buttons);
  document.getElementById('image-picker-status').textContent = buttons.length ? `${buttons.length} image files` : 'No matching PNG/SVG files in assets/.';
}
document.getElementById('image-search').addEventListener('input', renderImageOptions);
document.getElementById('close-image-picker').addEventListener('click', () => picker.close());
document.getElementById('image-options').addEventListener('click', event => {
  const button = event.target.closest('[data-asset]'); if (!button || draft.images.length >= 8) return;
  draft.images.push({ sourceIndex: null, src: button.dataset.asset, alt: '' });
  picker.close(); renderEditors(); document.getElementById(`field-images.${draft.images.length - 1}.alt`)?.focus();
});
