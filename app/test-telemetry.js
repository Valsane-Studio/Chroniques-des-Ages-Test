/* APHANES TEST — collecte anonyme des parties terminées.
   Ce fichier n'est chargé que par le dépôt TEST. */
(function () {
  'use strict';

  const SUPABASE_URL = 'https://tlgbzpenhuooabcyrmvf.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_wb7-3q3UEsRfUU5xaWSbLA_MxQWVvaT';

  const SUCCESS_NODES = new Set(['c218']);
  const NARRATIVE_DEATH_NODES = new Set(['c215','c216','c217','c221','c225','c236']);
  const COMBAT_DEATH_NODES = new Set([
    'c25','c26','c27','c29','c33','c36','c38','c47',
    'c61','c62','c78','c79','c80','c97','c132','c133',
    'c134','c135','c149','c153','c154','c155','c156',
    'c161','c162','c191','c192','c201','c202','c230',
    'c231','c232','c237'
  ]);

  let getState = null;
  let persistState = null;
  let listenersBound = false;
  let visibleSince = document.visibilityState === 'visible' ? Date.now() : null;
  const inFlight = new Set();

  function makeUuid() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
    const bytes = new Uint8Array(16);
    globalThis.crypto?.getRandomValues?.(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map(v => v.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
  }

  function freshRun(state, origin) {
    const now = Date.now();
    state.__testAnalytics = {
      id: makeUuid(),
      origin: origin || 'start',
      startedAt: now,
      activeMs: 0,
      historyStart: origin === 'checkpoint' && Array.isArray(state.history) ? state.history.length : 0,
      sent: false,
      sentAt: null,
      retryCount: 0
    };
    visibleSince = document.visibilityState === 'visible' ? now : null;
    return state.__testAnalytics;
  }

  function ensureRun(state) {
    if (!state || typeof state !== 'object') return null;
    const current = state.__testAnalytics;
    if (!current || !isUuid(current.id)) return freshRun(state, 'start');
    if (!Number.isFinite(current.activeMs)) current.activeMs = 0;
    if (!Number.isFinite(current.startedAt)) current.startedAt = Date.now();
    if (!Number.isInteger(current.historyStart)) current.historyStart = 0;
    if (!Number.isInteger(current.retryCount)) current.retryCount = 0;
    return current;
  }

  function resetRun(state, origin) {
    return freshRun(state, origin || 'restart');
  }

  function touch(state) {
    const run = ensureRun(state);
    if (!run) return;
    const now = Date.now();
    if (visibleSince !== null && now >= visibleSince) {
      run.activeMs += now - visibleSince;
      visibleSince = now;
    }
  }

  function beforeSave(state) {
    touch(state);
  }

  function attach(stateGetter, persist) {
    getState = typeof stateGetter === 'function' ? stateGetter : null;
    persistState = typeof persist === 'function' ? persist : null;
    const state = getState?.();
    if (state) ensureRun(state);

    if (listenersBound) return;
    listenersBound = true;

    document.addEventListener('visibilitychange', () => {
      const stateNow = getState?.();
      if (document.visibilityState === 'hidden') {
        if (stateNow) touch(stateNow);
        visibleSince = null;
        try { persistState?.(); } catch (e) {}
      } else {
        visibleSince = Date.now();
      }
    });

    window.addEventListener('pagehide', () => {
      const stateNow = getState?.();
      if (stateNow) touch(stateNow);
      try { persistState?.(); } catch (e) {}
    });
  }

  function classifyResult(state, nodeId) {
    if (state?.flags?.blackEarthTransformed || nodeId === 'c219') return 'transformation_terre_noire';
    if (SUCCESS_NODES.has(nodeId)) return 'fin_histoire';
    if (NARRATIVE_DEATH_NODES.has(nodeId)) return 'mort_subite';
    if (Number(state?.hp) <= 0) {
      return COMBAT_DEATH_NODES.has(nodeId) ? 'mort_combat' : 'mort_subite';
    }
    return null;
  }

  function combatSummary(state) {
    let total = 0;
    let won = 0;
    const combats = state?.combats && typeof state.combats === 'object' ? state.combats : {};
    for (const combat of Object.values(combats)) {
      if (!combat || typeof combat !== 'object') continue;
      const started = Number(combat.round) > 0 || !!combat.last || !!combat.lastBlade;
      if (!started) continue;
      total += 1;
      if (Number(combat.hp) <= 0) won += 1;
    }

    const sentinels = state?.sentinelFight;
    if (sentinels && (Number(sentinels.round) > 0 || sentinels.last)) {
      total += 1;
      if (Array.isArray(sentinels.hp) && sentinels.hp.every(v => Number(v) <= 0)) won += 1;
    }

    const finalKnights = state?.flags?.finalKnights;
    if (finalKnights && (finalKnights.last || finalKnights.phase)) {
      total += 1;
      if (finalKnights.phase === 'cured') won += 1;
    }

    if (state?.flags?.cavernCombat) {
      total += 1;
      if (Number(state.hp) > 0) won += 1;
    }

    return { total, won };
  }

  function cleanInventory(state) {
    const source = state?.inventory && typeof state.inventory === 'object' ? state.inventory : {};
    const result = {};
    for (const [id, item] of Object.entries(source)) {
      result[id] = {
        name: item?.name || id,
        quantity: Number.isFinite(item?.quantity) ? item.quantity : 1
      };
    }
    if (Number(state?.throwingBlades) > 0) {
      result.__throwingBlades = { name: 'Lames à lancer', quantity: Number(state.throwingBlades) };
    }
    return result;
  }

  function currentStat(book, state, fn, fallback) {
    try {
      const value = book?.rules?.[fn]?.(state);
      return Number.isFinite(value) ? value : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function weaponLabel(book, state) {
    try {
      return book?.rules?.weaponLabel?.(state) || state?.weapon || 'none';
    } catch (e) {
      return state?.weapon || 'none';
    }
  }

  function loadedContentVersion(book) {
    try {
      const entries = performance.getEntriesByType('resource');
      const hit = [...entries].reverse().find(entry =>
        entry?.name?.includes('/books/Livre01-La-Grotte-de-Valombre/book.js')
      );
      if (hit?.name) {
        const value = new URL(hit.name).searchParams.get('v');
        if (value) return value;
      }
    } catch (e) {}
    return book?.contentVersion ?? '?';
  }

  function buildPayload({ state, book, renderNodeId, pageByNode }) {
    const run = ensureRun(state);
    touch(state);

    const history = Array.isArray(state.history) ? state.history : [];
    const start = Math.max(0, Math.min(history.length, run.historyStart || 0));
    const nodes = history.slice(start);
    if (!nodes.length || nodes[nodes.length - 1] !== renderNodeId) nodes.push(renderNodeId);
    const pages = nodes
      .map(node => Number.isInteger(pageByNode?.[node]) ? pageByNode[node] : null)
      .filter(page => page !== null);
    const uniquePages = new Set(pages);
    const combats = combatSummary(state);
    const protection = currentStat(book, state, 'currentProtection', 0);

    return {
      id: run.id,
      livre: book?.title || 'La Grotte de Valombre',
      version_jeu: `TEST-content${loadedContentVersion(book)}-map${book?.pageMapVersion ?? '?'}-save${book?.saveVersion ?? '?'}`,
      resultat: classifyResult(state, renderNodeId),
      page_finale: Number.isInteger(pageByNode?.[renderNodeId]) ? pageByNode[renderNodeId] : null,
      duree_secondes: Math.max(0, Math.round((run.activeMs || 0) / 1000)),
      vie: Number.isFinite(state?.hp) ? state.hp : null,
      vie_max: Number.isFinite(state?.maxHp) ? state.maxHp : null,
      force: currentStat(book, state, 'currentForce', Number(state?.baseForce) || null),
      dexterite: currentStat(book, state, 'currentDexterity', Number(state?.baseDexterity) || null),
      terre_noire: Number.isFinite(state?.contamination) ? state.contamination : 0,
      arme: weaponLabel(book, state),
      protection: String(protection),
      pages_visitees: uniquePages.size,
      combats_total: combats.total,
      combats_gagnes: combats.won,
      parcours: {
        origin: run.origin || 'start',
        started_at: new Date(run.startedAt).toISOString(),
        ended_at: new Date().toISOString(),
        checkpoint: state?.currentCheckpoint || null,
        nodes,
        pages,
        rolls: Number.isFinite(state?.rollCount) ? state.rollCount : 0
      },
      inventaire: cleanInventory(state)
    };
  }

  async function postRow(table, row) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=minimal'
      },
      body: JSON.stringify(row),
      keepalive: true
    });
    if (response.ok || response.status === 409) return true;
    let details = '';
    try { details = await response.text(); } catch (e) {}
    throw new Error(`Supabase ${response.status}${details ? ': ' + details : ''}`);
  }

  async function recordCompletion(context) {
    const state = context?.state;
    const book = context?.book;
    const renderNodeId = context?.renderNodeId;
    const result = classifyResult(state, renderNodeId);
    if (!result) return false;

    const run = ensureRun(state);
    if (!run || run.sent || inFlight.has(run.id)) return !!run?.sent;

    inFlight.add(run.id);
    try {
      const payload = buildPayload(context);
      await postRow('test_parties', payload);
      run.sent = true;
      run.sentAt = Date.now();
      run.lastError = null;
      try { context?.persist?.(); } catch (e) {}
      return true;
    } catch (error) {
      run.lastError = String(error?.message || error);
      run.retryCount = (run.retryCount || 0) + 1;
      if (run.retryCount <= 3) {
        const delay = Math.min(30000, 4000 * run.retryCount);
        setTimeout(() => recordCompletion(context), delay);
      }
      return false;
    } finally {
      inFlight.delete(run.id);
    }
  }

  async function submitQuestionnaire(answers) {
    const state = getState?.();
    const run = ensureRun(state);
    if (!run?.id) throw new Error('Aucune partie TEST active.');
    const row = {
      partie_id: run.id,
      difficulte: answers?.difficulte ?? null,
      duree: answers?.duree ?? null,
      comprehension: answers?.comprehension ?? null,
      envie_rejouer: answers?.envie_rejouer ?? null,
      commentaire: answers?.commentaire || null
    };
    return postRow('test_questionnaires', row);
  }

  function status() {
    const state = getState?.();
    const run = state?.__testAnalytics || null;
    return {
      enabled: true,
      connectedProject: 'APHANES-TEST',
      runId: run?.id || null,
      sent: !!run?.sent,
      sentAt: run?.sentAt || null,
      lastError: run?.lastError || null
    };
  }

  window.AphanesTestTelemetry = {
    attach,
    ensureRun,
    resetRun,
    beforeSave,
    recordCompletion,
    submitQuestionnaire,
    classifyResult,
    status
  };
})();
