/* Lecteur commun de la collection. Il charge un livre enregistré dans BookRegistry. */
(function () {
'use strict';

const catalog = window.COLLECTION_CATALOG;
const BOOK = BookRegistry.get(catalog.defaultBookId);
if (!BOOK) throw new Error(`Livre introuvable : ${catalog.defaultBookId}`);
GameRuntime.setActiveBook(BOOK);

const STORY = BOOK.story;
const PAGE_BY_NODE = BOOK.pageByNode;
const padPage = BOOK.padPage;
const STORAGE_KEY = `ldveh.book.${BOOK.id}.save.v${BOOK.saveVersion || 1}`;
const CHECKPOINT_KEY = `ldveh.book.${BOOK.id}.checkpoint.v${BOOK.saveVersion || 1}`;
const SERIES_KEY = `ldveh.series.${BOOK.seriesId || BOOK.id}.profile.v2`;

const chapterNumber = document.getElementById('chapterNumber');
const chapterTitle = document.getElementById('chapterTitle');
const storyText = document.getElementById('storyText');
const choices = document.getElementById('choices');
const storyImage = document.getElementById('storyImage');
const imageFrame = document.getElementById('imageFrame');
const imagePlaceholder = document.getElementById('imagePlaceholder');
const imageLabel = document.getElementById('imageLabel');
const statusTags = document.getElementById('statusTags');
const inventoryCount = document.getElementById('inventoryCount');
const inventoryBtn = document.getElementById('inventoryBtn');
const characterBtn = document.getElementById('characterBtn');
const restartBtn = document.getElementById('restartBtn');
const menuBtn = document.getElementById('menuBtn');
const drawer = document.getElementById('drawer');
const drawerBackdrop = document.getElementById('drawerBackdrop');
const closeDrawerBtn = document.getElementById('closeDrawerBtn');
const pageNavList = document.getElementById('pageNavList');
const modalBackdrop = document.getElementById('modalBackdrop');
const modal = document.getElementById('modal');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalTitle = document.getElementById('modalTitle');
const modalContent = document.getElementById('modalContent');
const journalBtn = document.getElementById('journalBtn');
const journalPanel = document.getElementById('journalPanel');
const journalCloseBtn = document.getElementById('journalCloseBtn');
const bookTitle = document.getElementById('bookTitle');
const bookEyebrow = document.getElementById('bookEyebrow');

const manifest = window.ACTIVE_BOOK_MANIFEST || {};
bookTitle.textContent = BOOK.title;
bookEyebrow.textContent = manifest.kicker || BOOK.libraryLabel || `Livre ${String(manifest.number || BOOK.libraryNumber || BOOK.episode || 1).padStart(2,'0')}`;
document.title = `${BOOK.title} — Chroniques des Âges`;

document.querySelectorAll('.book-page-banner-kicker').forEach(el => {
  el.textContent = manifest.kicker || BOOK.libraryLabel || `Livre ${String(manifest.number || BOOK.libraryNumber || BOOK.episode || 1).padStart(2,'0')}`;
});
document.querySelectorAll('.book-page-banner-title').forEach(el => {
  el.textContent = BOOK.title;
});
const journalKicker = document.querySelector('#journalPanel .journal-kicker');
if (journalKicker) journalKicker.textContent = `${BOOK.title.toUpperCase()} · TES DÉCOUVERTES`;
const drawerTitle = document.querySelector('#drawer .drawer-head h3');
if (drawerTitle) drawerTitle.textContent = `Pages · TEST — ${BOOK.title}`;

function defaultSeriesProfile() {
  const base = {
    version: 2,
    seriesId: BOOK.seriesId || BOOK.id,
    memory: {},
    completedBooks: []
  };
  if (BOOK.seriesProfileDefaults && typeof BOOK.seriesProfileDefaults === 'object') {
    return {
      ...base,
      ...BOOK.seriesProfileDefaults,
      baseStats: {
        ...(BOOK.seriesProfileDefaults.baseStats || {})
      }
    };
  }
  return {
    ...base,
    baseStats: {
      maxHp: Number.isFinite(BOOK.initialMaxHp) ? BOOK.initialMaxHp : 18
    }
  };
}

function loadSeriesProfile() {
  try {
    const saved = localStorage.getItem(SERIES_KEY);
    const profile = saved ? { ...defaultSeriesProfile(), ...JSON.parse(saved) } : defaultSeriesProfile();
    if (typeof BOOK.normalizeSeriesProfile === 'function') BOOK.normalizeSeriesProfile(profile);
    return profile;
  } catch { return defaultSeriesProfile(); }
}
let seriesProfile = loadSeriesProfile();

function defaultState() { return BOOK.createInitialState(seriesProfile); }

function normalizeLoadedState(loaded) {
  if (typeof BOOK.normalizeLoadedState !== 'function') return false;
  try { return !!BOOK.normalizeLoadedState(loaded); }
  catch (e) { return false; }
}

function migrateLegacySaveIfNeeded() {
  try {
    if (!localStorage.getItem(STORAGE_KEY)) {
      for (const key of (BOOK.legacyStorageKeys || [])) {
        const legacy = localStorage.getItem(key);
        if (legacy) {
          localStorage.setItem(STORAGE_KEY, legacy);
          break;
        }
      }
    }
    if (!localStorage.getItem(CHECKPOINT_KEY)) {
      for (const key of (BOOK.legacyCheckpointKeys || [])) {
        const legacy = localStorage.getItem(key);
        if (legacy) {
          localStorage.setItem(CHECKPOINT_KEY, legacy);
          break;
        }
      }
    }
  } catch (e) {}
}
migrateLegacySaveIfNeeded();

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultState();
    const previous = JSON.parse(saved);
    if (typeof BOOK.migrateState === 'function' && previous.pageMapVersion !== (BOOK.pageMapVersion || 58)) {
      try {
        if (!localStorage.getItem(`${STORAGE_KEY}.backup-v68`)) localStorage.setItem(`${STORAGE_KEY}.backup-v68`, saved);
      } catch (e) {}
      BOOK.migrateState(previous);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(previous));
    }
    const loaded = { ...defaultState(), ...previous };
    if (normalizeLoadedState(loaded)) localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));
    return loaded;
  } catch { return defaultState(); }
}
let state = loadState();

function saveSeriesProfile() {
  try { localStorage.setItem(SERIES_KEY, JSON.stringify(seriesProfile)); } catch (e) {}
}
function syncSeriesFromState() {
  if (typeof BOOK.syncSeriesProfile === 'function') {
    BOOK.syncSeriesProfile(state, seriesProfile);
    saveSeriesProfile();
    return;
  }

  if ('heroGender' in state) seriesProfile.heroGender = state.heroGender;
  if ('heroName' in state) seriesProfile.heroName = state.heroName;

  if (!seriesProfile.baseStats || typeof seriesProfile.baseStats !== 'object') {
    seriesProfile.baseStats = {};
  }
  if (Number.isFinite(BOOK.initialMaxHp)) seriesProfile.baseStats.maxHp = BOOK.initialMaxHp;
  if (Number.isFinite(state.baseForce)) seriesProfile.baseStats.force = state.baseForce;
  if (Number.isFinite(state.baseDexterity)) seriesProfile.baseStats.dexterity = state.baseDexterity;

  if (typeof BOOK.exportSeriesMemory === 'function') {
    seriesProfile.memory = { ...seriesProfile.memory, ...BOOK.exportSeriesMemory(state) };
  }
  saveSeriesProfile();
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  syncSeriesFromState();
}

function setCheckpoint(targetState, label) {
  targetState.currentCheckpoint = label;
  try { localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(targetState)); } catch (e) {}
}
window.setCheckpoint = setCheckpoint;

function hasCheckpoint() {
  try { return !!localStorage.getItem(CHECKPOINT_KEY); } catch (e) { return false; }
}

function restartFromCheckpoint() {
  try {
    const saved = localStorage.getItem(CHECKPOINT_KEY);
    if (!saved) return restartGame();
    const journalBackup = state.journal || '';
    const previous = JSON.parse(saved);
    if (typeof BOOK.migrateState === 'function' && previous.pageMapVersion !== (BOOK.pageMapVersion || 58)) {
      try {
        if (!localStorage.getItem(`${CHECKPOINT_KEY}.backup-v68`)) localStorage.setItem(`${CHECKPOINT_KEY}.backup-v68`, saved);
      } catch (e) {}
      BOOK.migrateState(previous);
      localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(previous));
    }
    state = { ...defaultState(), ...previous };
    if (normalizeLoadedState(state)) localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(state));
    state.journal = journalBackup || state.journal || '';
    saveState(); closeDrawer(); closeModal(); closeJournal(); render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (e) { restartGame(); }
}

function maybeAutoCheckpoint(id) {
  const config = (BOOK.checkpoints || []).find(cp => cp.node === id);
  if (!config) return;
  if (config.onlyIfNone && hasCheckpoint()) return;
  setCheckpoint(state, config.label);
}

function enterNode(id) {
  const node = STORY[id];
  if (!node) return;
  // An unfinished dice challenge is valid only on its destination page.
  if (state.pendingDice && state.pendingDice.destination !== id) state.pendingDice = null;
  state.node = id;
  if (!state.visited[id]) {
    state.visited[id] = true;
    if (typeof node.onEnter === 'function') node.onEnter(state);
  } else if (typeof BOOK.onReenterNode === 'function') {
    BOOK.onReenterNode(id, state, node);
  }
  state.history.push(id);
  maybeAutoCheckpoint(id);
  saveState(); render(); window.scrollTo({ top: 0, behavior: 'smooth' });
}

let pageImageLoadToken = 0;
function loadPageImage(pageNumber, title) {
  const token = ++pageImageLoadToken;
  const base = BOOK.imageBaseForPage(pageNumber);
  const candidates = typeof BOOK.imageCandidatesForPage === 'function'
    ? BOOK.imageCandidatesForPage(pageNumber, state)
    : [base];
  imageLabel.textContent = candidates[0]?.split('/').pop() || base;
  storyImage.classList.add('hidden');
  imagePlaceholder.style.display = 'grid';
  storyImage.alt = title ? `Illustration — ${title}` : `Illustration page ${padPage(pageNumber)}`;
  const extensions = BOOK.imageExtensions || ['webp','png','jpg','jpeg'];
  const assetBases = Array.isArray(BOOK.assetBases) && BOOK.assetBases.length
    ? BOOK.assetBases
    : [BOOK.assetBase];
  const attempts = assetBases.flatMap(assetBase =>
    candidates.flatMap(candidate => extensions.map(ext => `${assetBase}/${candidate}.${ext}`))
  );
  let index = 0;
  const tryNext = () => {
    if (token !== pageImageLoadToken) return;
    if (index >= attempts.length) {
      // En Travail, distinguer visuellement une illustration manquante
      // d'une illustration que Bruno a explicitement demandé de masquer.
      // Pour les Joueurs, conserver l'ancien comportement discret.
      storyImage.removeAttribute('src');
      storyImage.classList.add('hidden');
      if (BOOK.showMissingIllustrationPlaceholder) {
        imageFrame.classList.remove('hidden');
        imagePlaceholder.style.display = 'grid';
      } else {
        imagePlaceholder.style.display = 'none';
        imageFrame.classList.add('hidden');
      }
      return;
    }
    storyImage.onload = () => {
      if (token !== pageImageLoadToken) return;
      storyImage.classList.remove('hidden');
      imagePlaceholder.style.display = 'none';
    };
    storyImage.onerror = tryNext;
    storyImage.src = attempts[index++];
  };
  tryNext();
}

/* Journal de bord : uniquement les découvertes de la partie en cours.
   La sauvegarde du récit contient déjà history/visited/flags : aucun stockage
   cumulatif séparé, ni réimport des indices d'une tentative antérieure. */
const JOURNAL_ENTRIES = Array.isArray(BOOK.journalEntries) ? BOOK.journalEntries : [];
const journalList = document.getElementById('journalList');
const journalCount = document.getElementById('journalCount');
function currentRunJournalEntries() {
  const encountered = new Set(Array.isArray(state.history) ? state.history : []);
  if (state.node && state.node !== 'start') encountered.add(state.node);
  for (const [nodeId, seen] of Object.entries(state.visited || {})) if (seen) encountered.add(nodeId);
  const recorded = new Set();
  const entries = [];
  for (const page of encountered) {
    for (const entry of JOURNAL_ENTRIES) {
      if (entry.page !== page || recorded.has(entry.id)) continue;
      if (entry.requiresFlag && !state.flags?.[entry.requiresFlag]) continue;
      entries.push(entry);
      recorded.add(entry.id);
    }
  }
  return entries;
}

function appendAdventureConclusion(renderNodeId) {
  const cfg = BOOK.conclusion;
  if (!cfg) return;

  const successNodes = new Set(cfg.successNodes || []);
  const deathNodes = new Set(cfg.deathNodes || []);
  const success = successNodes.has(renderNodeId);

  let death = !success && deathNodes.has(renderNodeId);
  if (!success && !death && cfg.deathOnZeroHp !== false && Number(state.hp) <= 0) death = true;
  if (!success && !death && typeof cfg.isDeath === 'function') {
    try { death = !!cfg.isDeath(state, renderNodeId); } catch (e) {}
  }

  if (!success && !death) return;

  const notice = document.createElement('section');
  notice.className = `adventure-conclusion ${success ? 'adventure-conclusion-success' : 'adventure-conclusion-death'}`;

  const title = document.createElement('h3');
  title.textContent = success ? (cfg.successTitle || 'Une fin possible') : (cfg.deathTitle || 'Votre aventure s’achève ici');

  const copy = document.createElement('p');
  copy.textContent = success
    ? (cfg.successText || 'Vous avez découvert l’une des fins possibles de cette aventure.')
    : (cfg.deathText || 'C’est la fin de votre aventure. Vous pouvez recommencer et tenter d’autres choix.');

  notice.append(title, copy);
  storyText.appendChild(notice);

  if (!success || cfg.showJournalRecap === false) return;

  const recap = document.createElement('section');
  recap.className = 'ending-journal-recap';
  const recapTitle = document.createElement('h3');
  recapTitle.textContent = cfg.journalTitle || 'Ce que votre journal révèle';
  const entries = currentRunJournalEntries();
  recap.appendChild(recapTitle);

  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'ending-journal-empty';
    empty.textContent = cfg.journalEmptyText || 'Vous avez atteint cette fin sans consigner de découverte majeure dans votre journal.';
    recap.appendChild(empty);
  } else {
    const list = document.createElement('div');
    list.className = 'ending-journal-list';
    entries.forEach(entry => {
      const item = document.createElement('article');
      item.className = 'ending-journal-entry';
      const heading = document.createElement('h4');
      heading.textContent = STORY[entry.page]?.title?.trim() || entry.title;
      const text = document.createElement('p');
      text.textContent = entry.text;
      item.append(heading, text);
      list.appendChild(item);
    });
    recap.appendChild(list);
  }

  storyText.appendChild(recap);
}
function renderJournal() {
  journalList.replaceChildren();
  const entries = currentRunJournalEntries();
  journalCount.textContent = entries.length === 0 ? 'Aucune découverte pour le moment.'
    : `${entries.length} découverte${entries.length > 1 ? 's' : ''} consignée${entries.length > 1 ? 's' : ''}`;
  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'journal-empty';
    empty.textContent = 'Tes découvertes importantes apparaîtront ici au fil de l’aventure.';
    journalList.appendChild(empty);
    return;
  }
  entries.forEach((entry, index) => {
    const section = document.createElement('article');
    section.className = 'journal-entry';
    const heading = document.createElement('h4');
    // Une scène conserve son intitulé, même si son numéro éditorial change.
    heading.textContent = STORY[entry.page]?.title?.trim() || entry.title;
    const copy = document.createElement('p');
    copy.textContent = entry.text;
    section.append(heading, copy);
    journalList.appendChild(section);
  });
}
function openJournal() {
  renderJournal();
  journalPanel.classList.remove('hidden');
  journalPanel.setAttribute('aria-hidden', 'false');
  journalCloseBtn.focus();
}
function closeJournal() {
  journalPanel.classList.add('hidden');
  journalPanel.setAttribute('aria-hidden', 'true');
}

function resolvePendingDice() {
  const pending = state.pendingDice;
  if (!pending || pending.destination !== state.node) return;
  const origin = STORY[pending.source];
  const sourceChoices = origin ? (typeof origin.choices === 'function' ? origin.choices(state) : origin.choices || []) : [];
  const original = sourceChoices[pending.index];
  // Rebuild the callback after a reload; never roll twice, even after multiple taps.
  if (!original || original.to !== pending.destination || original.label !== pending.label || typeof original.effect !== 'function') {
    state.pendingDice = null;
    saveState(); render();
    return;
  }
  state.pendingDice = null;
  original.effect(state);
  state.lastDicePage = state.node;
  saveState(); render();
  const dicePanel = storyText.querySelector('.dice-result');
  if (dicePanel && typeof dicePanel.scrollIntoView === 'function') dicePanel.scrollIntoView({ behavior:'smooth', block:'center' });
}

function render() {
  const renderNodeId = typeof BOOK.resolveRenderNode === 'function'
    ? (BOOK.resolveRenderNode(state, state.node) || state.node)
    : state.node;
  const alternateView = renderNodeId !== state.node;
  const node = STORY[renderNodeId] || STORY.start;
  const pendingDice = !alternateView && state.pendingDice?.destination === state.node ? state.pendingDice : null;
  if (node.sheet) {
    ++pageImageLoadToken; // annule une éventuelle image de la page précédente
    chapterNumber.textContent = BOOK.sheetLabel || 'FICHE DU PERSONNAGE';
    imageFrame.classList.add('hidden');
  } else {
    const mappedPage = PAGE_BY_NODE[renderNodeId];
    const declaredPage = node.number ? parseInt(String(node.number).replace(/\D/g, ''), 10) : NaN;
    const pageNumber = Number.isInteger(mappedPage) ? mappedPage : (Number.isFinite(declaredPage) ? declaredPage : 1);
    chapterNumber.textContent = pageNumber === 0 ? 'PROLOGUE · 000' : `PAGE ${padPage(pageNumber)}`;
    if (node.noImage || pendingDice || (state.lastDicePage === renderNodeId && renderNodeId !== 'c202')) {
      ++pageImageLoadToken;
      imageFrame.classList.add('hidden');
      storyImage.removeAttribute('src');
      storyImage.classList.add('hidden');
    } else {
      imageFrame.classList.remove('hidden');
      loadPageImage(pageNumber, node.title || '');
    }
  }
  chapterTitle.textContent = node.title || '';
  chapterTitle.classList.toggle('hidden', !node.title);
  storyText.innerHTML = pendingDice
    ? `<div class="dice-result dice-test-waiting"><p class="roll-number">Épreuve de Dextérité</p><div class="dice-faces"><span class="die-visual combat-die-pending">?</span><span class="die-visual combat-die-pending">?</span><span class="die-visual combat-die-pending">?</span></div></div>`
    : (typeof node.text === 'function' ? node.text(state) : node.text);
  // On a solved dice page, show the actual three dice first, then the narrative resolution below.
  if (!pendingDice && state.lastDicePage === renderNodeId && Array.isArray(state.lastDice)) {
    let panel = storyText.querySelector('.dice-result');
    if (!panel) {
      const holder = document.createElement('div');
      holder.innerHTML = diceResultHtml(state);
      panel = holder.firstElementChild;
      if (panel) storyText.prepend(panel);
    } else if (panel !== storyText.firstElementChild) {
      storyText.prepend(panel);
    }
    if (panel && Number.isFinite(state.lastTotal) && Number.isFinite(state.lastStat)
        && !/Réussite|Échec/.test(panel.textContent)) {
      const verdict = document.createElement('p');
      verdict.innerHTML = `<strong>${state.lastTotal <= state.lastStat ? 'Réussite' : 'Échec'}</strong>`;
      panel.append(verdict);
    }
  }

  appendAdventureConclusion(renderNodeId);

  document.querySelectorAll('[data-book-profile-input], .hero-gender-input').forEach(input => {
    input.addEventListener('change', event => {
      if (typeof BOOK.handleProfileInputChange === 'function') {
        BOOK.handleProfileInputChange(state, event.target);
      } else if (event.target.classList.contains('hero-gender-input')) {
        state.heroGender = event.target.value;
      }
      saveState();
      render();
    });
  });

  inventoryCount.textContent = Object.keys(state.inventory).length;
  statusTags.innerHTML = '';
  if (!node.sheet) {
    const stats = typeof BOOK.statusStats === 'function' ? (BOOK.statusStats(state) || []) : [];
    stats.forEach(stat => {
      const tag = document.createElement('span');
      tag.className = `tag ${stat.cls || ''}`.trim();
      tag.innerHTML = `<span class="tag-copy"><small><span class="tag-icon">${stat.icon || ''}</span><span class="tag-label">${stat.label || ''}</span></small><strong>${stat.value ?? ''}</strong></span>`;
      statusTags.appendChild(tag);
    });
  }

  let availableChoices;
  if (pendingDice) {
    availableChoices = [{label:'Jeter les dés', action:'resolveDice'}];
  } else {
    const override = typeof BOOK.choiceOverride === 'function'
      ? BOOK.choiceOverride(state, node, renderNodeId)
      : null;
    availableChoices = Array.isArray(override)
      ? override
      : (Number(state.hp) <= 0 && !node.sheet
          ? fatalChoices()
          : (typeof node.choices === 'function' ? node.choices(state) : (node.choices || [])));
  }
  choices.innerHTML = '';
  availableChoices.forEach((choice, i) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    if (choice.inlineCombat) btn.classList.add('combat-roll-btn');
    const destinationPage = choice.stay ? null : PAGE_BY_NODE[choice.to];
    const destination = destinationPage === 0 ? '<span class="choice-dest">Lire le prologue</span>' : destinationPage ? `<span class="choice-dest">Rendez-vous à la page ${padPage(destinationPage)}</span>` : '';
    btn.innerHTML = `<span class="choice-copy"><span>${choice.label}</span></span>${destination}`;
    btn.addEventListener('click', () => {
      if (choice.action === 'resolveDice') { btn.disabled = true; return resolvePendingDice(); }
      if (choice.action === 'checkpoint') return restartFromCheckpoint();
      if (choice.action === 'restart') return restartGame();
      if (choice.action === 'damage') {
        const key = choice.damageKey || state.node;
        rollDamage(state, key, choice.damageSides || 6);
        if (typeof BOOK.afterDamageRoll === 'function') {
          BOOK.afterDamageRoll(state, key);
        }
        saveState(); render(); return;
      }
      // A Dextérité roll happens on the destination dice page, not when choosing a route.
      const deferredDex = typeof choice.diceTest === 'function' ? choice.diceTest(state) : Boolean(choice.diceTest);
      if (deferredDex && choice.to && !choice.stay) {
        btn.disabled = true;
        state.pendingDice = {source: state.node, destination: choice.to, index: i, label: choice.label};
        state.lastDicePage = null;
        enterNode(choice.to);
        return;
      }
      // Disable the previous action immediately; repeated taps cannot produce two rolls.
      if (choice.inlineCombat) btn.disabled = true;
      if (typeof choice.effect === 'function') choice.effect(state);
      if (choice.stay) {
        saveState(); render();
        if (choice.inlineCombat) {
          const dicePanel = storyText.querySelector('.combat-roll-result');
          if (dicePanel && typeof dicePanel.scrollIntoView === 'function')
            dicePanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
      enterNode(choice.to);
    });
    choices.appendChild(btn);
  });
}

function restartGame() {
  state = defaultState();
  try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(CHECKPOINT_KEY); } catch (e) {}
  saveState(); closeDrawer(); closeModal(); closeJournal(); render();
  try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0,0); }
}

function showModal(title, html) {
  modal.dataset.panel = title === 'Fiche perso' ? 'character' : 'plain';
  modalTitle.textContent = title;
  modalContent.innerHTML = html;
  modal.classList.remove('hidden');
  modalBackdrop.classList.remove('hidden');
}

function openCharacterSheet() {
  const html = typeof BOOK.characterSheetHtml === 'function'
    ? BOOK.characterSheetHtml(state)
    : '<p>Fiche indisponible.</p>';
  showModal('Fiche perso', html);
}

function openInventory() {
  modal.dataset.panel = 'inventory';
  modalTitle.textContent = 'Inventaire';
  const items = Object.entries(state.inventory);
  const topText = BOOK.inventory && BOOK.inventory.topLine ? BOOK.inventory.topLine(state) : '';
  const moneyLine = topText ? `<div class="inventory-topline">${topText}</div>` : '';
  const extraLine = BOOK.inventory && BOOK.inventory.extraHtml ? BOOK.inventory.extraHtml(state) : '';
  const list = items.length
    ? `<div class="inventory-owned-section"><div class="inventory-owned-title">Objets</div><div class="inventory-list">${items.map(([id,item]) => {
        const action = BOOK.inventory && BOOK.inventory.actionHtml ? BOOK.inventory.actionHtml(id,item,state) : '';
        return `<div class="inventory-item"><strong>${item.name}${item.quantity ? ` × ${item.quantity}` : ''}</strong><p>${item.description}</p>${action}</div>`;
      }).join('')}</div></div>`
    : `<div class="inventory-empty">Ton inventaire est vide.</div>`;
  modalContent.innerHTML = moneyLine + extraLine + list;
  modal.classList.remove('hidden'); modalBackdrop.classList.remove('hidden');
}

function closeModal() { modal.classList.add('hidden'); modalBackdrop.classList.add('hidden'); }

function pageNavigationEntries() {
  return Object.entries(PAGE_BY_NODE)
    .map(([nodeId, pageNumber]) => ({
      nodeId,
      pageNumber,
      // Le titre visible du récit est la source de vérité. Le libellé TEST
      // sert uniquement de description quand la page n'a pas de titre.
      // Le prologue conserve son libellé explicite dans la navigation.
      title: (pageNumber === 0 ? BOOK.navigationTitles?.[nodeId] : STORY[nodeId]?.title?.trim())
        || BOOK.navigationTitles?.[nodeId]
        || `Page ${padPage(pageNumber)}`
    }))
    .sort((a, b) => a.pageNumber - b.pageNumber);
}

function renderPageNavigation() {
  if (!pageNavList) return;
  const entries = pageNavigationEntries();
  pageNavList.innerHTML = '';
  entries.forEach(entry => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `page-nav-btn${state.node === entry.nodeId ? ' current' : ''}`;
    btn.dataset.node = entry.nodeId;
    btn.innerHTML = `<span class="page-nav-number">${padPage(entry.pageNumber)}</span><span class="page-nav-title"></span>`;
    btn.querySelector('.page-nav-title').textContent = entry.title;
    btn.addEventListener('click', () => jumpToPageForTest(entry.nodeId));
    pageNavList.appendChild(btn);
  });
}

function jumpToPageForTest(nodeId) {
  if (!STORY[nodeId] || !Number.isInteger(PAGE_BY_NODE[nodeId])) return;
  // Outil de test : on change uniquement la page courante.
  // Aucun effet de choix/onEnter/checkpoint antérieur n'est déclenché automatiquement.
  state.pendingDice = null;
  state.node = nodeId;
  state.history.push(nodeId);
  saveState();
  closeDrawer();
  render();
  try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0,0); }
}

function openDrawer() {
  renderPageNavigation();
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden','false');
  drawerBackdrop.classList.remove('hidden');
  requestAnimationFrame(() => {
    const current = pageNavList && pageNavList.querySelector('.page-nav-btn.current');
    if (current) current.scrollIntoView({ block: 'center' });
  });
}
function closeDrawer() {
  if (drawer) {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden','true');
  }
  if (drawerBackdrop) drawerBackdrop.classList.add('hidden');
}

const bookApi = { book: BOOK, saveState, render, openInventory, showModal, closeModal };
modalContent.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'back-inventory') return openInventory();
  if (BOOK.inventory && typeof BOOK.inventory.handleAction === 'function') BOOK.inventory.handleAction(action, state, bookApi);
});

inventoryBtn.addEventListener('click', openInventory);
characterBtn.addEventListener('click', openCharacterSheet);
journalBtn.addEventListener('click', openJournal);
journalCloseBtn.addEventListener('click', closeJournal);
restartBtn.addEventListener('click', restartGame);
if (menuBtn) menuBtn.addEventListener('click', openDrawer);
if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeDrawer);
if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);
closeModalBtn.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', closeModal);
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeDrawer(); closeModal(); closeJournal(); } });

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(() => {});
render();
})();
