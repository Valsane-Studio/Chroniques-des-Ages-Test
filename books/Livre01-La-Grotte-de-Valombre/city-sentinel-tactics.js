/* DEV — Cité morte / Sentinelles noires.
   - PAGE 69 : échantillon mystérieux prélevable, identifié plus tard comme terre noire.
   - PAGE 79–80 : ouverture tactique avant le combat des deux sentinelles.
   - Fiche ennemie : mêmes repères visuels que les autres combats.
   - Résultat : affiche séparément Dextérité et Force réellement utilisées. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const STORY = book?.story;
  if (!book || !STORY) return;

  const POWDER_ID = 'poudre_cite_inconnue';
  const TACTIC_VERSION = 1;

  function choicesOf(source, state) {
    return typeof source === 'function' ? (source(state) || []) : (source || []);
  }

  function hasItem(state, id) {
    const inv = state.inventory;
    if (Array.isArray(inv)) return inv.some(item => (typeof item === 'string' ? item === id : item?.id === id));
    return !!(inv && typeof inv === 'object' && inv[id]);
  }

  function currentForce(state) {
    return Math.max(3,
      Number(state.baseForce || 8) +
      Number(state.forceBonus || 0) +
      (hasItem(state, 'brassard_veilleurs') ? 1 : 0)
    );
  }

  function currentDexterity(state) {
    const weaponModifier = state.weapon === 'heavy' ? -4 :
      (state.weapon === 'light' || state.weapon === 'sorcerer_sword' ? -1 : 0);
    const itemBonus = (hasItem(state, 'anneau_veilleurs') ? 1 : 0) +
      (hasItem(state, 'bague_lueur') ? 2 : 0);
    const shieldRemaining = Number(state.protectionItems?.bouclier_chevalier?.remaining || 0);
    const shieldPenalty = hasItem(state, 'bouclier_chevalier') && shieldRemaining > 0 ? 1 : 0;
    return Math.max(3,
      Number(state.baseDexterity || 13) +
      Number(state.dexBonus || 0) +
      itemBonus -
      Number(state.dexPenalty || 0) -
      (state.flags?.collarEquipped ? 1 : 0) -
      shieldPenalty +
      weaponModifier
    );
  }

  function contaminationLevel(state) {
    return Math.max(0, Math.min(13,
      Number.isFinite(state.contamination)
        ? Math.floor(state.contamination)
        : (state.flags?.blackEarthContamination ? 2 : 0)
    ));
  }

  function raiseContamination(state, amount) {
    state.flags = state.flags || {};
    state.contamination = Math.min(13, contaminationLevel(state) + Math.max(0, Number(amount) || 0));
    state.flags.blackEarthContamination = state.contamination > 0;
    if (state.contamination >= 13) state.flags.blackEarthTransformed = true;
  }

  /* ----------------------------------------------------------------------
     PAGE 69 — petit échantillon de poudre inconnue.
     ---------------------------------------------------------------------- */
  function updatePowderKnowledge(state) {
    if (!hasItem(state, POWDER_ID)) return;
    const known = !!state.flags?.physicianNotesRead;
    state.inventory[POWDER_ID].name = known
      ? 'Terre noire — échantillon de la Cité morte'
      : 'Échantillon de poudre sombre';
    state.inventory[POWDER_ID].description = known
      ? 'Quelques grains de terre noire prélevés dans la vasque de la Cité morte. Usage unique : +1 Terre noire.'
      : 'Quelques grains noirs prélevés sans contact direct dans la Cité morte. Leur nature et leur dangerosité sont inconnues.';
  }

  function takeCityPowder(state) {
    state.flags = state.flags || {};
    state.inventory = state.inventory || {};
    if (state.flags.cityPowderTaken || hasItem(state, POWDER_ID)) return;
    state.flags.cityPowderTaken = true;
    state.inventory[POWDER_ID] = {
      name: 'Échantillon de poudre sombre',
      description: 'Quelques grains noirs prélevés sans contact direct dans la Cité morte. Leur nature et leur dangerosité sont inconnues.'
    };
  }

  if (STORY.c69 && !STORY.c69.__cityPowderV1) {
    const oldText = STORY.c69.text;
    const oldChoices = STORY.c69.choices;

    STORY.c69.text = state => {
      updatePowderKnowledge(state);
      let html = typeof oldText === 'function' ? oldText(state) : oldText;
      const sample = state.flags?.cityPowderTaken || hasItem(state, POWDER_ID)
        ? `<p>Tu as conservé quelques grains dans une petite poche de cuir, sans les toucher directement. Tu ignores toujours ce qu’ils sont — et s’il était prudent de les emporter.</p>`
        : `<p>Quelques grains sont restés isolés sur le rebord de la vasque. Avec un morceau d’étoffe, tu pourrais en faire glisser une petite quantité dans une poche de cuir sans les toucher directement.</p><p>Tu n’as aucune idée de ce que cette poudre peut provoquer.</p>`;
      return String(html || '').replace('<p>Qui vient de t’arrêter ?</p>', `<p>Qui vient de t’arrêter ?</p>${sample}`);
    };

    STORY.c69.choices = state => {
      const source = choicesOf(oldChoices, state);
      if (state.flags?.cityPowderTaken || hasItem(state, POWDER_ID)) return source;
      return [
        { label: 'Prélever délicatement quelques grains sans les toucher', stay: true, effect: takeCityPowder },
        ...source
      ];
    };

    STORY.c69.__cityPowderV1 = true;
  }

  /* PAGE 112 — moment où la nature de l’échantillon devient certaine. */
  if (STORY.c105 && !STORY.c105.__cityPowderKnowledgeV1) {
    const oldEnter = STORY.c105.onEnter;
    const oldText = STORY.c105.text;

    STORY.c105.onEnter = state => {
      if (typeof oldEnter === 'function') oldEnter(state);
      updatePowderKnowledge(state);
    };

    STORY.c105.text = state => {
      updatePowderKnowledge(state);
      const html = typeof oldText === 'function' ? oldText(state) : oldText;
      if (!hasItem(state, POWDER_ID)) return html;
      return `${html || ''}<p>Tu repenses aussitôt aux grains prélevés dans la vasque de la Cité morte. Il n’y a plus de doute : <strong>c’était de la terre noire.</strong></p><p>Dans ton inventaire, l’échantillon est désormais identifié. Tu peux choisir d’en absorber une petite quantité quand tu le souhaites — en sachant désormais qu’elle augmente la contamination.</p>`;
    };

    STORY.c105.__cityPowderKnowledgeV1 = true;
  }

  /* L’échantillon n’est utilisable qu’une fois identifié. Petite quantité : +1. */
  if (book.inventory && !book.inventory.__cityPowderV1) {
    const oldActionHtml = book.inventory.actionHtml;
    const oldHandleAction = book.inventory.handleAction;

    book.inventory.actionHtml = function (id, item, state) {
      if (id === POWDER_ID) {
        updatePowderKnowledge(state);
        if (!state.flags?.physicianNotesRead) {
          return '<div class="inventory-actions"><p>Nature inconnue. Tu ignores encore si cette poudre peut être utilisée sans danger.</p></div>';
        }
        return `<div class="inventory-actions"><p>Usage unique : +1 Terre noire. Après absorption : ${Math.min(13, contaminationLevel(state) + 1)}/13.</p><button class="inventory-action-btn" data-action="use-city-powder">Absorber une petite quantité</button></div>`;
      }
      return typeof oldActionHtml === 'function' ? oldActionHtml.call(this, id, item, state) : '';
    };

    book.inventory.handleAction = function (action, state, api) {
      if (action === 'use-city-powder') {
        if (state.flags?.physicianNotesRead && hasItem(state, POWDER_ID)) {
          delete state.inventory[POWDER_ID];
          raiseContamination(state, 1);
          state.flags.cityPowderConsumed = true;
          api.saveState();
          api.render();
          if (typeof api.openInventory === 'function') api.openInventory();
        }
        return true;
      }
      return typeof oldHandleAction === 'function' ? oldHandleAction.call(this, action, state, api) : false;
    };

    book.inventory.__cityPowderV1 = true;
  }

  /* ----------------------------------------------------------------------
     PAGES 79–80 — deux Sentinelles noires.
     ---------------------------------------------------------------------- */
  const SENTINEL_SCENES = ['c79', 'c80', 'c132', 'c133', 'c134', 'c135'];

  function decorateSentinelCard(html) {
    return String(html || '')
      .replace(/<div><span>Sentinelle 1<\/span>/g, '<div><span class="enemy-icon">♥</span><span>Sentinelle 1</span>')
      .replace(/<div><span>Sentinelle 2<\/span>/g, '<div><span class="enemy-icon">♥</span><span>Sentinelle 2</span>')
      .replace(/<div><span>Dextérité<\/span>/g, '<div><span class="enemy-icon">◆</span><span>Dextérité</span>')
      .replace(/<div><span>Force<\/span>/g, '<div><span class="enemy-icon">⚔</span><span>Force</span>')
      .replace(/<div><span>Dégâts<\/span>/g, '<div><span class="enemy-icon">✦</span><span>Dégâts</span>');
  }

  function fight(state) {
    return state.sentinelFight && Array.isArray(state.sentinelFight.hp) ? state.sentinelFight : null;
  }

  function targetOf(choice) {
    const m = String(choice?.label || '').match(/sentinelle\s+(\d)/i);
    return m ? Math.max(0, Number(m[1]) - 1) : null;
  }

  function isBladeChoice(choice) {
    return /lame/i.test(String(choice?.label || ''));
  }

  function addAlcovePenalty(state) {
    state.flags = state.flags || {};
    if (state.flags.sentinelAlcovePenaltyApplied) return;
    state.dexPenalty = Number(state.dexPenalty || 0) + 1;
    state.flags.sentinelAlcovePenaltyApplied = true;
  }

  function clearAlcovePenalty(state) {
    if (!state.flags?.sentinelAlcovePenaltyApplied) return;
    state.dexPenalty = Math.max(0, Number(state.dexPenalty || 0) - 1);
    state.flags.sentinelAlcovePenaltyApplied = false;
  }

  function setSentinelTactic(state, tactic) {
    state.flags = state.flags || {};
    state.flags.sentinelTactic = tactic;
    state.flags.sentinelTacticVersion = TACTIC_VERSION;
    state.flags.sentinelOpeningResolved = tactic !== 'power';
    delete state.flags.sentinelStunnedIndex;
    if (tactic === 'alcove') addAlcovePenalty(state);
  }

  function attachUsedStats(state, dexterity, force) {
    const f = fight(state);
    if (!f?.last) return;
    f.last.heroDexterity = dexterity;
    f.last.heroForce = force;
    f.last.heroBase = dexterity + force;
  }

  function runPowerOpening(state, choice) {
    const f = fight(state);
    if (!f || typeof choice?.effect !== 'function') return;
    const before = f.hp[0];
    const oldPenalty = Number(state.dexPenalty || 0);
    state.dexPenalty = oldPenalty + 1;
    const usedDexterity = currentDexterity(state);
    const usedForce = currentForce(state);

    choice.effect(state);

    state.dexPenalty = oldPenalty;
    attachUsedStats(state, usedDexterity, usedForce);

    const afterNormal = f.hp[0];
    if (afterNormal < before) {
      const bonus = Math.min(2, Math.max(0, f.hp[0]));
      f.hp[0] = Math.max(0, f.hp[0] - bonus);
      if (f.last?.report) {
        f.last.report.push(`Tu as mis toute ta puissance dans ce premier coup : +${bonus} dégât${bonus > 1 ? 's' : ''}.`);
        if (f.hp[0] > 0) f.last.report.push('La sentinelle 1 est projetée en arrière. Elle ne pourra pas intervenir pendant le prochain échange.');
        else f.last.report.push('Le choc supplémentaire abat la sentinelle 1.');
      }
      if (f.hp[0] > 0) state.flags.sentinelStunnedIndex = 0;
    }
    if (f.last) f.last.hp = [...f.hp];
    state.flags.sentinelOpeningResolved = true;
  }

  function wrapSentinelChoice(choice, state) {
    if (!choice) return choice;

    /* Sortie : le malus du renfoncement n’existe que dans ce combat. */
    if (choice.to === 'c81') {
      const oldEffect = choice.effect;
      return {
        ...choice,
        effect: s => {
          if (typeof oldEffect === 'function') oldEffect(s);
          clearAlcovePenalty(s);
        }
      };
    }

    if (typeof choice.effect !== 'function') return choice;
    const target = targetOf(choice);
    if (target == null) return choice;
    const blade = isBladeChoice(choice);
    const originalEffect = choice.effect;

    return {
      ...choice,
      effect: s => {
        const f = fight(s);
        if (!f) return originalEffect(s);

        const tactic = s.flags?.sentinelTactic || 'normal';
        const stunned = Number.isInteger(s.flags?.sentinelStunnedIndex) ? s.flags.sentinelStunnedIndex : null;
        let hiddenIndex = null;
        let hiddenHp = null;

        /* Dans le renfoncement, une seule sentinelle peut atteindre le héros. */
        if (tactic === 'alcove' && !blade) {
          const other = 1 - target;
          if (f.hp[other] > 0) {
            hiddenIndex = other;
            hiddenHp = f.hp[other];
            f.hp[other] = 0;
          }
        }

        /* Une sentinelle repoussée est hors de portée pendant l’échange suivant. */
        if (stunned != null && stunned !== target && !blade && f.hp[stunned] > 0 && hiddenIndex == null) {
          hiddenIndex = stunned;
          hiddenHp = f.hp[stunned];
          f.hp[stunned] = 0;
        }

        const usedDexterity = currentDexterity(s);
        const usedForce = currentForce(s);
        originalEffect(s);

        if (hiddenIndex != null) {
          f.hp[hiddenIndex] = hiddenHp;
          if (f.last) f.last.hp = [...f.hp];
        }
        attachUsedStats(s, usedDexterity, usedForce);

        if (stunned != null && target !== stunned) delete s.flags.sentinelStunnedIndex;
      }
    };
  }

  function filterStunnedChoices(list, state) {
    const f = fight(state);
    const stunned = Number.isInteger(state.flags?.sentinelStunnedIndex) ? state.flags.sentinelStunnedIndex : null;
    if (!f || stunned == null) return list;
    const other = 1 - stunned;
    if (f.hp[other] <= 0) {
      delete state.flags.sentinelStunnedIndex;
      return list;
    }
    return list.filter(choice => targetOf(choice) !== stunned);
  }

  function tacticalChoices(base, state) {
    let list = base.map(choice => wrapSentinelChoice(choice, state));
    list = filterStunnedChoices(list, state);
    return list;
  }

  /* PAGE 79 : avant le premier lancer, choisir la manière d’engager le 2 contre 1. */
  if (STORY.c79 && !STORY.c79.__sentinelTacticsV1) {
    const oldText = STORY.c79.text;
    const oldChoices = STORY.c79.choices;

    STORY.c79.text = state => {
      let html = typeof oldText === 'function' ? oldText(state) : oldText;
      html = decorateSentinelCard(html);
      const tactic = state.flags?.sentinelTactic;
      if (tactic === 'alcove') {
        html = html.replace(/<p>Au corps à corps,[\s\S]*?<\/p>/,
          '<p>Tu recules dans un renfoncement du poste de garde. Elles ne peuvent plus arriver côte à côte : une seule sentinelle pourra t’atteindre à la fois. En revanche, les murs gênent chacun de tes mouvements. <strong>Dextérité −1 pendant ce combat.</strong></p>');
      } else if (tactic === 'power' && !state.flags?.sentinelOpeningResolved) {
        html += '<p>Tu décides de frapper la première sentinelle avec toute ta puissance. Sur ce premier échange, tu sacrifies un peu de précision : <strong>Dextérité −1</strong>, mais un coup réussi infligera <strong>+2 dégâts</strong>. Si elle reste debout, l’impact la repoussera hors de l’échange suivant.</p>';
      } else if (tactic === 'normal') {
        html += '<p>Tu gardes de l’espace autour de toi et choisis de combattre sans modifier ta garde ni tes appuis.</p>';
      }
      return html;
    };

    STORY.c79.choices = state => {
      const base = choicesOf(oldChoices, state);
      const f = fight(state);
      if (!f || f.hp.every(hp => hp <= 0) || state.hp <= 0) return tacticalChoices(base, state);

      const tactic = state.flags?.sentinelTactic;
      if (!tactic && f.round === 0) {
        return [
          { label: 'Reculer dans un renfoncement pour les obliger à venir une par une', stay: true, effect: s => setSentinelTactic(s, 'alcove') },
          { label: 'Frapper la première de toutes tes forces pour tenter de la repousser', stay: true, effect: s => setSentinelTactic(s, 'power') },
          { label: 'Rester au centre et combattre normalement', stay: true, effect: s => setSentinelTactic(s, 'normal') }
        ];
      }

      if (tactic === 'power' && !state.flags?.sentinelOpeningResolved && f.round === 0) {
        const first = base.find(choice => targetOf(choice) === 0 && !isBladeChoice(choice));
        if (!first) return tacticalChoices(base, state);
        return [{
          ...first,
          label: 'Frapper la sentinelle 1 de toutes tes forces',
          effect: s => runPowerOpening(s, first)
        }];
      }

      return tacticalChoices(base, state);
    };

    STORY.c79.__sentinelTacticsV1 = true;
  }

  /* Les pages de résultat et la suite du combat héritent de la tactique. */
  for (const id of SENTINEL_SCENES) {
    const scene = STORY[id];
    if (!scene || id === 'c79' || scene.__sentinelWrappedV1) continue;
    const oldText = scene.text;
    const oldChoices = scene.choices;

    scene.text = state => {
      let html = typeof oldText === 'function' ? oldText(state) : oldText;
      html = decorateSentinelCard(html);
      const last = fight(state)?.last;
      if (last && !last.blade && Number.isFinite(last.heroDexterity) && Number.isFinite(last.heroForce)) {
        const diceTotal = Array.isArray(last.heroDice) ? last.heroDice.reduce((a, b) => a + b, 0) : 0;
        html = String(html || '').replace(
          /Dextérité \+ Force \d+ \+ dés \d+/,
          `Dextérité ${last.heroDexterity} + Force ${last.heroForce} + dés ${diceTotal}`
        );
      }
      if (state.flags?.sentinelTactic === 'alcove' && id === 'c80') {
        html += '<p><em>Le renfoncement empêche toujours la seconde sentinelle de t’atteindre en même temps, mais tes mouvements restent gênés : Dextérité −1.</em></p>';
      }
      return html;
    };

    scene.choices = state => tacticalChoices(choicesOf(oldChoices, state), state);
    scene.__sentinelWrappedV1 = true;
  }
})();
