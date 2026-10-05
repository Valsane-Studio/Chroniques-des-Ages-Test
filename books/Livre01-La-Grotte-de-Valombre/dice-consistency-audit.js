/* DEV — Cohérence globale des jets de dés du Livre 01.
   Règle : une action narrative ne résout jamais elle-même une épreuve.
   Si un test est nécessaire, le lecteur arrive d'abord devant l'épreuve puis
   clique explicitement sur « Jeter les dés ». Tous les résultats utilisent
   le même dé graphique à points que le moteur commun. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const STORY = book?.story;
  if (!STORY) return;

  function pipDie(value) {
    const layouts = {1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
    const active = new Set(layouts[Math.max(1, Math.min(6, Number(value) || 1))] || []);
    let cells = '';
    for (let i = 1; i <= 9; i++) {
      cells += `<span class="die-cell">${active.has(i) ? '<i></i>' : ''}</span>`;
    }
    return `<span class="die-visual" aria-label="Dé : ${value}">${cells}</span>`;
  }

  function waitingHtml(statName, count = 3) {
    return `<div class="dice-result dice-test-waiting">
      <p class="roll-number">Épreuve de ${statName}</p>
      <div class="dice-faces">${Array.from({length:count}, () => '<span class="die-visual combat-die-pending">?</span>').join('')}</div>
      <p>Jette les dés pour connaître le résultat.</p>
    </div>`;
  }

  function choicesOf(source, state) {
    return typeof source === 'function' ? (source(state) || []) : (source || []);
  }

  function stripTestWording(label) {
    let text = String(label || '').trim();
    text = text
      .replace(/\s*[—-]\s*(?:test|épreuve) de (?:Force|Dextérité)\s*$/i, '')
      .replace(/\s*[—-]\s*tester (?:ta |la )?(?:Force|Dextérité)\s*$/i, '')
      .replace(/\s*[—-]\s*lancer les trois dés de (?:Force|Dextérité)\s*$/i, '')
      .replace(/\s*[—-]\s*lancer les trois dés\s*$/i, '')
      .replace(/\s*\((?:test|épreuve) de (?:Force|Dextérité)\)\s*$/i, '')
      .trim();
    return text;
  }

  /* Transforme les rares anciens tests directs en vrai flux à deux temps :
     action -> page d'épreuve -> bouton Jeter les dés -> résultat. */
  function deferDirectTest(config) {
    const scene = STORY[config.sceneId];
    if (!scene || scene.__diceAuditDeferred) return;
    const originalChoices = scene.choices;

    scene.choices = state => choicesOf(originalChoices, state).map(choice => {
      if (!choice || !config.match(choice, state)) return choice;
      return {
        ...choice,
        label: stripTestWording(choice.label),
        to: config.testId,
        stay: false,
        diceTest: false,
        inlineCombat: false,
        effect: undefined,
        redirectAfterEffect: undefined
      };
    });

    STORY[config.testId] = {
      number: STORY[config.finalId]?.number || scene.number || '',
      title: '',
      noImage: true,
      text: () => waitingHtml(config.statName),
      choices: state => [{
        label: 'Jeter les dés',
        to: config.finalId,
        inlineCombat: true,
        effect: s => {
          const original = choicesOf(originalChoices, s).find(choice => choice && config.match(choice, s));
          if (original && typeof original.effect === 'function') original.effect(s);
        }
      }]
    };

    scene.__diceAuditDeferred = true;
  }

  deferDirectTest({
    sceneId: 'c31', testId: 'diceAuditGalleryForce', finalId: 'c32', statName: 'Force',
    match: choice => choice.to === 'c32' && /déplacer le bloc|déplacement/i.test(choice.label || '')
  });

  deferDirectTest({
    sceneId: 'c82', testId: 'diceAuditOfficeForce', finalId: 'c83', statName: 'Force',
    match: choice => choice.to === 'c83' && /enfoncer la porte/i.test(choice.label || '')
  });

  deferDirectTest({
    sceneId: 'c238', testId: 'diceAuditKnightDash', finalId: 'c232', statName: 'Dextérité',
    match: choice => choice.to === 'c232' && /courir jusqu/i.test(choice.label || '')
  });

  /* Crise d'Anselme : les deux options tactiques ne lancent plus le test au clic
     sur l'action. Elles ouvrent d'abord une véritable page d'épreuve. */
  const campSources = new Map();
  function patchCampTactics(sceneId) {
    const scene = STORY[sceneId];
    if (!scene || scene.__diceAuditCamp) return;
    const originalChoices = scene.choices;
    campSources.set(sceneId, originalChoices);

    scene.choices = state => choicesOf(originalChoices, state).map(choice => {
      if (!choice || choice.to !== 'campEscapeResult') return choice;
      const label = stripTestWording(choice.label);
      let strategy = null;
      let testId = null;
      if (/^Repousser les deux premiers/i.test(label)) {
        strategy = 'force'; testId = 'diceAuditCampForce';
      } else if (/^Faire demi-tour et courir/i.test(label)) {
        strategy = 'dexterity'; testId = 'diceAuditCampDexterity';
      }
      if (!strategy) return {...choice, label};
      return {
        ...choice,
        label,
        to: testId,
        stay: false,
        diceTest: false,
        inlineCombat: false,
        effect: s => {
          s.flags = s.flags || {};
          s.flags.diceAuditCampSource = sceneId;
          s.flags.diceAuditCampStrategy = strategy;
        },
        redirectAfterEffect: undefined
      };
    });
    scene.__diceAuditCamp = true;
  }

  patchCampTactics('campAidArrival');
  patchCampTactics('campAidTactics');

  function resolveCampTest(state, strategy) {
    const sourceId = state.flags?.diceAuditCampSource || 'campAidArrival';
    const source = campSources.get(sourceId) || campSources.get('campAidArrival');
    const original = choicesOf(source, state).find(choice => {
      if (!choice || choice.to !== 'campEscapeResult') return false;
      const label = stripTestWording(choice.label);
      return strategy === 'force'
        ? /^Repousser les deux premiers/i.test(label)
        : /^Faire demi-tour et courir/i.test(label);
    });
    if (original && typeof original.effect === 'function') original.effect(state);
    if (state.flags) {
      delete state.flags.diceAuditCampSource;
      delete state.flags.diceAuditCampStrategy;
    }
  }

  STORY.diceAuditCampForce = {
    number: 'PAGE 30', title: '', noImage: true,
    text: () => waitingHtml('Force'),
    choices: [{label:'Jeter les dés', to:'campEscapeResult', inlineCombat:true, effect:s=>resolveCampTest(s,'force')}]
  };
  STORY.diceAuditCampDexterity = {
    number: 'PAGE 30', title: '', noImage: true,
    text: () => waitingHtml('Dextérité'),
    choices: [{label:'Jeter les dés', to:'campEscapeResult', inlineCombat:true, effect:s=>resolveCampTest(s,'dexterity')}]
  };

  /* L'ancien prototype Anselme utilisait encore ⚀ ⚁… pour le résultat de fuite.
     On conserve exactement les mêmes résultats mais avec le dé standard. */
  if (STORY.campEscapeResult && !STORY.campEscapeResult.__standardDice) {
    const oldText = STORY.campEscapeResult.text;
    const unicodeValue = {'⚀':1,'⚁':2,'⚂':3,'⚃':4,'⚄':5,'⚅':6};
    STORY.campEscapeResult.text = state => {
      let html = typeof oldText === 'function' ? oldText(state) : oldText;
      html = String(html || '').replace(/<span class="die-visual">([⚀⚁⚂⚃⚄⚅])<\/span>/g,
        (_all, face) => pipDie(unicodeValue[face]));
      return html;
    };
    STORY.campEscapeResult.__standardDice = true;
  }

  /* Dédale final : le lancer était déjà volontaire mais son unique dé était un
     caractère Unicode. Il utilise désormais le même composant que tous les autres. */
  if (STORY.c209 && !STORY.c209.__standardMazeDie) {
    const oldText = STORY.c209.text;
    STORY.c209.text = state => {
      let html = typeof oldText === 'function' ? oldText(state) : oldText;
      const value = Number(state.flags?.mazePrototype?.die || 0);
      if (value >= 1 && value <= 6) {
        html = String(html || '').replace(
          /<div class="maze-roll-die"[^>]*>[\s\S]*?<\/div>/,
          `<div class="dice-faces" aria-label="Résultat du dé : ${value}">${pipDie(value)}</div>`
        );
      }
      return html;
    };
    STORY.c209.__standardMazeDie = true;
  }

  /* Deux blessures du lac étaient encore tirées automatiquement. Une blessure
     aléatoire doit elle aussi être lancée par le lecteur. */
  for (const scene of Object.values(STORY)) {
    if (!scene?.choices || scene.__lakeAutoDamagePatched) continue;
    const originalChoices = scene.choices;
    scene.choices = state => choicesOf(originalChoices, state).map(choice => {
      if (!choice) return choice;
      if (choice.to === 'c45' && /Ne pas regarder et recommencer à ramer/i.test(choice.label || '')) {
        return {
          ...choice,
          effect: s => { s.flags.lakeTentacleOutcome = 'surprised'; }
        };
      }
      if (choice.to === 'c46' && choice.diceTest && /tentacule/i.test(choice.label || '')) {
        return {
          ...choice,
          effect: s => {
            const success = roll3D6(s, 'Dextérité', currentDexterity(s));
            s.flags.lakeTentacleOutcome = success ? 'counter' : 'lookHit';
          }
        };
      }
      return choice;
    });
    scene.__lakeAutoDamagePatched = true;
  }

  function patchLakeDamagePage(sceneId, key) {
    const scene = STORY[sceneId];
    if (!scene || scene.__manualLakeDamage) return;
    const oldText = scene.text;
    const oldChoices = scene.choices;
    scene.text = state => {
      const html = typeof oldText === 'function' ? oldText(state) : oldText;
      if (!hasDamageRoll(state, key)) return `${html || ''}${damageResultHtml(state, key)}`;
      return html;
    };
    scene.choices = state => {
      if (!hasDamageRoll(state, key)) {
        return [{label:'Lancer le dé de blessure', action:'damage', damageKey:key, damageSides:3}];
      }
      return choicesOf(oldChoices, state);
    };
    scene.__manualLakeDamage = true;
  }

  patchLakeDamagePage('c45', 'lakeTentacleSurprised');

  if (STORY.c46 && !STORY.c46.__manualLakeLookDamage) {
    const oldText = STORY.c46.text;
    const oldChoices = STORY.c46.choices;
    STORY.c46.text = state => {
      const html = typeof oldText === 'function' ? oldText(state) : oldText;
      if (state.flags?.lakeTentacleOutcome === 'lookHit' && !hasDamageRoll(state, 'lakeTentacleLookHit')) {
        return `${html || ''}${damageResultHtml(state, 'lakeTentacleLookHit')}`;
      }
      return html;
    };
    STORY.c46.choices = state => {
      if (state.flags?.lakeTentacleOutcome === 'lookHit' && !hasDamageRoll(state, 'lakeTentacleLookHit')) {
        return [{label:'Lancer le dé de blessure', action:'damage', damageKey:'lakeTentacleLookHit', damageSides:3}];
      }
      return choicesOf(oldChoices, state);
    };
    STORY.c46.__manualLakeLookDamage = true;
  }

  /* Nettoyage éditorial : le choix raconte l'action, pas la mécanique.
     Le type d'épreuve est dévoilé seulement sur l'écran de lancer. */
  for (const [id, scene] of Object.entries(STORY)) {
    if (!scene?.choices || scene.__diceAuditLabels) continue;
    const originalChoices = scene.choices;
    scene.choices = state => choicesOf(originalChoices, state).map(choice => {
      if (!choice) return choice;
      let label = stripTestWording(choice.label);
      if (id === 'c29' && /^Lancer les trois dés$/i.test(label)) label = 'Continuer le combat';
      if (id === 'c227' && /^Jeter les dés\s*[—-]\s*Dextérité$/i.test(label)) label = 'Jeter les dés';
      return label === choice.label ? choice : {...choice, label};
    });
    scene.__diceAuditLabels = true;
  }
})();
