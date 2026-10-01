/* APHANES TEST — collecte anonyme des parties terminées.
   Ce fichier n'est chargé que par le dépôt TEST. */
(function () {
  'use strict';

  const SUPABASE_URL = 'https://tlgbzpenhuooabcyrmvf.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_wb7-3q3UEsRfUU5xaWSbLA_MxQWVvaT';
  const SESSION_META_KEY = 'aphanes.test.telemetry.session.v1';

  const SUCCESS_NODES = new Set(['c218','c23','c215','c217']);
  const TRUE_END_NODES = new Set(['c215','c217']);
  const NARRATIVE_DEATH_NODES = new Set(['c21','c216','c221','c225','c236']);
  const COMBAT_DEATH_NODES = new Set([
    'c25','c26','c27','c29','c33','c36','c38','c47',
    'c61','c62','c78','c79','c80','c97','c132','c133',
    'c134','c135','c149','c153','c154','c155','c156',
    'c161','c162','c191','c192','c201','c202','c230',
    'c231','c232','c237'
  ]);

  let getState = null;
  let persistState = null;
  let lastCompletionContext = null;
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

  function loadSessionMeta() {
    try {
      const value = JSON.parse(localStorage.getItem(SESSION_META_KEY) || 'null');
      return value && typeof value === 'object' ? value : null;
    } catch (e) {
      return null;
    }
  }

  function saveSessionMeta(run) {
    if (!run || typeof run !== 'object') return;
    try {
      localStorage.setItem(SESSION_META_KEY, JSON.stringify({
        startedAt: Number.isFinite(run.startedAt) ? run.startedAt : Date.now(),
        activeMs: Math.max(0, Number(run.activeMs) || 0),
        checkpointUses: Math.max(0, Number(run.checkpointUses) || 0)
      }));
    } catch (e) {}
  }

  function freshRun(state, origin) {
    const now = Date.now();
    const isCheckpoint = origin === 'checkpoint';
    const session = isCheckpoint ? loadSessionMeta() : null;
    state.__testAnalytics = {
      id: makeUuid(),
      origin: origin || 'start',
      startedAt: isCheckpoint && Number.isFinite(session?.startedAt) ? session.startedAt : now,
      activeMs: isCheckpoint ? Math.max(0, Number(session?.activeMs) || 0) : 0,
      checkpointUses: isCheckpoint ? Math.max(0, Number(session?.checkpointUses) || 0) + 1 : 0,
      historyStart: isCheckpoint && Array.isArray(state.history) ? state.history.length : 0,
      sent: false,
      sentAt: null,
      retryCount: isCheckpoint ? Math.max(0, Number(session?.checkpointUses) || 0) + 1 : 0,
      feedbackOpen: false,
      feedbackAnswers: {},
      questionnaireSent: false
    };
    visibleSince = document.visibilityState === 'visible' ? now : null;
    saveSessionMeta(state.__testAnalytics);
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
    if (!Number.isInteger(current.checkpointUses)) current.checkpointUses = current.retryCount || 0;
    saveSessionMeta(current);
    return current;
  }

  function resetRun(state, origin) {
    return freshRun(state, origin || 'restart');
  }

  function resumeRunFromCheckpoint(state) {
    if (!state || typeof state !== 'object') return null;
    const previous = state.__testAnalytics && typeof state.__testAnalytics === 'object'
      ? state.__testAnalytics
      : null;
    const now = Date.now();
    const carriedActiveMs = Math.max(0, Number(previous?.activeMs) || 0);
    const carriedStartedAt = Number.isFinite(previous?.startedAt)
      ? previous.startedAt
      : now - carriedActiveMs;
    const carriedHistoryStart = Number.isInteger(previous?.historyStart)
      ? previous.historyStart
      : 0;

    state.__testAnalytics = {
      id: makeUuid(),
      origin: 'checkpoint',
      startedAt: carriedStartedAt,
      activeMs: carriedActiveMs,
      historyStart: carriedHistoryStart,
      sent: false,
      sentAt: null,
      retryCount: Math.max(0, Number(previous?.retryCount) || 0) + 1,
      feedbackOpen: false,
      feedbackAnswers: {},
      questionnaireSent: false
    };
    visibleSince = document.visibilityState === 'visible' ? now : null;
    return state.__testAnalytics;
  }

  function openQuestionnaire(state) {
    const run = ensureRun(state);
    if (!run) return false;
    run.feedbackOpen = true;
    if (!run.feedbackAnswers || typeof run.feedbackAnswers !== 'object') run.feedbackAnswers = {};
    return true;
  }

  function isQuestionnaireOpen(state) {
    return !!state?.__testAnalytics?.feedbackOpen;
  }

  function touch(state) {
    const run = ensureRun(state);
    if (!run) return;
    const now = Date.now();
    if (visibleSince !== null && now >= visibleSince) {
      run.activeMs += now - visibleSince;
      visibleSince = now;
      saveSessionMeta(run);
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
        checkpoint_uses: Math.max(0, Number(run.checkpointUses) || 0),
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
        Prefer: 'return=minimal'
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
    lastCompletionContext = context || lastCompletionContext;
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

    if (!run.sent && lastCompletionContext) {
      const ok = await recordCompletion(lastCompletionContext);
      if (!ok) throw new Error('La partie n’a pas encore pu être enregistrée.');
    }

    const row = {
      partie_id: run.id,
      difficulte: answers?.difficulte ?? null,
      duree: answers?.duree ?? null,
      comprehension: answers?.comprehension ?? null,
      envie_rejouer: answers?.envie_rejouer ?? null,
      commentaire: typeof answers?.commentaire === 'string' && answers.commentaire.trim()
        ? answers.commentaire.trim().slice(0, 2000)
        : null
    };
    const ok = await postRow('test_questionnaires', row);
    if (ok) {
      run.questionnaireSent = true;
      run.questionnaireSentAt = Date.now();
      try { persistState?.(); } catch (e) {}
    }
    return ok;
  }

  const QUESTIONNAIRE = [
    {
      key: 'difficulte',
      title: 'Niveau de difficulté éprouvé',
      low: 'Trop facile',
      mid: 'Équilibré',
      high: 'Beaucoup trop difficile'
    },
    {
      key: 'duree',
      title: 'Durée du jeu',
      low: 'Trop court',
      mid: 'Équilibré',
      high: 'Beaucoup trop long'
    },
    {
      key: 'comprehension',
      title: 'Compréhension du scénario',
      low: 'Incompréhensible',
      mid: 'Agréable mais pas sûr d’avoir tout compris',
      high: 'Parfait'
    },
    {
      key: 'envie_rejouer',
      title: 'Envie de faire une deuxième partie',
      low: 'Pas du tout',
      mid: 'Pourquoi pas si j’ai le temps',
      high: 'Je relance tout de suite'
    }
  ];

  function ensureQuestionnaireStyle() {
    if (document.getElementById('testQuestionnaireStyle')) return;
    const style = document.createElement('style');
    style.id = 'testQuestionnaireStyle';
    style.textContent = `
      .test-feedback {
        margin: 28px 0 8px;
        padding: 22px 18px 20px;
        border: 1px solid rgba(84, 57, 30, .35);
        border-radius: 12px;
        background: rgba(236, 220, 181, .16);
      }
      .test-feedback h3 { margin: 0 0 10px; text-align: center; }
      .test-feedback-intro { margin: 0 auto 24px; max-width: 46rem; text-align: center; }
      .test-feedback-question {
        margin: 16px 0;
        padding: 18px 14px 20px;
        border: 1px solid rgba(84, 57, 30, .28);
        border-radius: 14px;
        background: rgba(255, 248, 224, .16);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,.18),
          0 2px 7px rgba(61, 42, 24, .06);
      }
      .test-feedback-question-title {
        margin: 0 0 14px;
        font-weight: 700;
        text-align: center;
      }
      .test-feedback-labels, .test-feedback-dots {
        display: grid;
        grid-template-columns: repeat(10, minmax(0, 1fr));
        gap: 5px;
        align-items: end;
      }
      .test-feedback-labels { margin-bottom: 7px; min-height: 2.8em; }
      .test-feedback-label {
        font-size: .7rem;
        line-height: 1.15;
        text-align: center;
        opacity: .86;
      }
      .test-feedback-label.low { grid-column: 1 / span 2; text-align: left; }
      .test-feedback-label.mid { grid-column: 4 / span 4; }
      .test-feedback-label.high { grid-column: 9 / span 2; text-align: right; }
      .test-feedback-dot {
        appearance: none;
        width: 100%;
        aspect-ratio: 1;
        max-width: 34px;
        justify-self: center;
        border-radius: 50%;
        border: 2px solid currentColor;
        background: transparent;
        color: inherit;
        cursor: pointer;
        position: relative;
        padding: 0;
      }
      .test-feedback-dot::after {
        content: attr(data-value);
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        font-size: .67rem;
        font-weight: 700;
      }
      .test-feedback-dot.filled { background: currentColor; }
      .test-feedback-dot.filled::after { color: rgba(245, 235, 208, .96); }
      .test-feedback-comment {
        display: block;
        margin: 8px 0 24px;
      }
      .test-feedback-comment > span {
        display: block;
        margin: 0 0 10px;
        font-weight: 700;
        text-align: center;
      }
      .test-feedback-comment textarea {
        display: block;
        width: 100%;
        min-height: 118px;
        box-sizing: border-box;
        resize: vertical;
        padding: 14px 16px;
        border: 1px solid rgba(92, 65, 35, .46);
        border-radius: 14px;
        background: rgba(255, 248, 224, .34);
        box-shadow:
          inset 0 1px 2px rgba(255,255,255,.28),
          inset 0 -2px 6px rgba(83,56,28,.08);
        color: inherit;
        font: inherit;
        line-height: 1.45;
        outline: none;
      }
      .test-feedback-comment textarea:focus {
        border-color: rgba(92, 65, 35, .72);
        box-shadow:
          0 0 0 2px rgba(126, 91, 49, .10),
          inset 0 1px 2px rgba(255,255,255,.28);
      }
      .test-feedback-comment textarea::placeholder {
        color: rgba(54, 40, 27, .58);
      }
      .test-feedback-comment textarea:disabled {
        opacity: .68;
      }
      .test-feedback-submit,
      .test-feedback-restart {
        width: 100% !important;
      }
      .test-feedback-submit:disabled {
        opacity: .45 !important;
        cursor: default !important;
      }
      .test-feedback-status { min-height: 1.4em; margin: 12px 0 0; text-align: center; }
      .test-feedback-thanks { text-align: center; font-weight: 700; margin: 12px 0 0; }
      .test-feedback-actions {
        display: grid;
        gap: 12px;
        margin: 20px 0 0;
        width: 100%;
      }
      .test-feedback-page .test-feedback {
        margin-top: 0;
      }
      body.test-feedback-open .status-tags {
        display: none !important;
      }
      body.test-feedback-open .app-shell {
        padding-bottom: max(24px, env(safe-area-inset-bottom)) !important;
      }
      @media (max-width: 520px) {
        .test-feedback { padding: 18px 10px; }
        .test-feedback-question { padding: 16px 10px 18px; margin: 14px 0; }
        .test-feedback-label { font-size: .62rem; }
        .test-feedback-labels, .test-feedback-dots { gap: 3px; }
        .test-feedback-dot { max-width: 30px; border-width: 1.5px; }
        .test-feedback-dot::after { font-size: .58rem; }
      }
    `;
    document.head.appendChild(style);
  }

  function renderQuestionnairePage(context) {
    lastCompletionContext = context || lastCompletionContext;
    const state = context?.state;
    const nodeId = context?.renderNodeId;
    const result = classifyResult(state, nodeId);
    if (!result || !isQuestionnaireOpen(state)) return false;

    ensureQuestionnaireStyle();
    document.body.classList.add('test-feedback-open');

    const chapterNumber = document.getElementById('chapterNumber');
    const chapterTitle = document.getElementById('chapterTitle');
    const storyText = document.getElementById('storyText');
    const choices = document.getElementById('choices');
    const imageFrame = document.getElementById('imageFrame');
    const statusTags = document.getElementById('statusTags');

    if (!storyText || !choices) return false;

    imageFrame?.classList.add('hidden');
    if (chapterNumber) chapterNumber.textContent = '';
    if (chapterTitle) {
      chapterTitle.textContent = '';
      chapterTitle.classList.add('hidden');
    }
    if (statusTags) statusTags.innerHTML = '';
    choices.innerHTML = '';

    const run = ensureRun(state);
    if (!run.feedbackAnswers || typeof run.feedbackAnswers !== 'object') run.feedbackAnswers = {};
    const values = run.feedbackAnswers;

    storyText.classList.add('test-feedback-page');
    storyText.innerHTML = `
      <section id="testFeedback" class="test-feedback">
        <h3>Merci d’avoir joué à La Grotte de Valombre.</h3>
        <p class="test-feedback-intro">Pour nous aider à améliorer le jeu, peux-tu nous donner ton ressenti ?</p>
        <div class="test-feedback-questions"></div>
        <label class="test-feedback-comment">
          <span>Commentaire ou bug à relever</span>
          <textarea class="test-feedback-comment-input" maxlength="2000" placeholder="Tu peux noter ici un bug, une incompréhension, une remarque ou une suggestion."></textarea>
        </label>
        <div class="test-feedback-actions">
          <button class="choice-btn test-feedback-submit" type="button">
            <span class="choice-arrow" aria-hidden="true"></span>
            <span class="choice-copy"><span>Envoyer mes réponses</span></span>
          </button>
        </div>
        <p class="test-feedback-status" aria-live="polite"></p>
        <div class="test-feedback-actions">
          ${TRUE_END_NODES.has(nodeId) ? '' : `
          <button class="choice-btn test-feedback-restart" type="button" data-test-restart="checkpoint">
            <span class="choice-arrow" aria-hidden="true"></span>
            <span class="choice-copy"><span>Recommencer au point de sauvegarde</span></span>
          </button>`}
          <button class="choice-btn test-feedback-restart" type="button" data-test-restart="start">
            <span class="choice-arrow" aria-hidden="true"></span>
            <span class="choice-copy"><span>Recommencer au début</span></span>
          </button>
        </div>
      </section>
    `;

    const section = storyText.querySelector('#testFeedback');
    const questions = section.querySelector('.test-feedback-questions');
    const submit = section.querySelector('.test-feedback-submit');
    const statusEl = section.querySelector('.test-feedback-status');
    const commentInput = section.querySelector('.test-feedback-comment-input');
    if (commentInput) commentInput.value = typeof values.commentaire === 'string' ? values.commentaire : '';

    for (const spec of QUESTIONNAIRE) {
      const block = document.createElement('div');
      block.className = 'test-feedback-question';
      block.innerHTML = `
        <p class="test-feedback-question-title">${spec.title}</p>
        <div class="test-feedback-labels" aria-hidden="true">
          <span class="test-feedback-label low">${spec.low}</span>
          <span class="test-feedback-label mid">${spec.mid}</span>
          <span class="test-feedback-label high">${spec.high}</span>
        </div>
        <div class="test-feedback-dots" role="radiogroup" aria-label="${spec.title}">
          ${Array.from({length:10}, (_, i) => `<button type="button" class="test-feedback-dot" data-question="${spec.key}" data-value="${i+1}" role="radio" aria-checked="false" aria-label="${i+1} sur 10"></button>`).join('')}
        </div>
      `;
      questions.appendChild(block);
    }

    function refreshQuestion(key) {
      const value = Number(values[key] || 0);
      section.querySelectorAll(`.test-feedback-dot[data-question="${key}"]`).forEach(dot => {
        const dotValue = Number(dot.dataset.value);
        dot.classList.toggle('filled', dotValue <= value);
        dot.setAttribute('aria-checked', dotValue === value ? 'true' : 'false');
      });
    }

    QUESTIONNAIRE.forEach(spec => refreshQuestion(spec.key));

    const allAnswered = () => QUESTIONNAIRE.every(q => Number.isInteger(Number(values[q.key])) && Number(values[q.key]) >= 1 && Number(values[q.key]) <= 10);

    if (run.questionnaireSent) {
      submit.disabled = true;
      const submitLabel = submit.querySelector('.choice-copy > span');
      if (submitLabel) submitLabel.textContent = 'Réponses envoyées';
      if (commentInput) commentInput.disabled = true;
      statusEl.textContent = 'Merci. Tes réponses ont bien été enregistrées.';
    } else {
      submit.disabled = !allAnswered();

      commentInput?.addEventListener('input', () => {
        values.commentaire = commentInput.value.slice(0, 2000);
        try { context?.persist?.(); } catch (e) {}
      });

      section.querySelectorAll('.test-feedback-dot').forEach(button => {
        button.addEventListener('click', () => {
          const key = button.dataset.question;
          values[key] = Number(button.dataset.value);
          refreshQuestion(key);
          submit.disabled = !allAnswered();
          try { context?.persist?.(); } catch (e) {}
        });
      });

      submit.addEventListener('click', async () => {
        if (submit.disabled) return;
        submit.disabled = true;
        statusEl.textContent = 'Envoi en cours…';
        try {
          await submitQuestionnaire(values);
          const submitLabel = submit.querySelector('.choice-copy > span');
          if (submitLabel) submitLabel.textContent = 'Réponses envoyées';
          statusEl.textContent = 'Merci. Tes réponses ont bien été enregistrées.';
        } catch (error) {
          submit.disabled = false;
          statusEl.textContent = 'L’envoi a échoué. Tu peux réessayer.';
        }
      });
    }

    section.querySelector('[data-test-restart="checkpoint"]')?.addEventListener('click', () => {
      context?.restartCheckpoint?.();
    });
    section.querySelector('[data-test-restart="start"]')?.addEventListener('click', () => {
      context?.restartGame?.();
    });

    return true;
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
    resumeRunFromCheckpoint,
    beforeSave,
    recordCompletion,
    submitQuestionnaire,
    openQuestionnaire,
    isQuestionnaireOpen,
    renderQuestionnairePage,
    classifyResult,
    status
  };
})();
