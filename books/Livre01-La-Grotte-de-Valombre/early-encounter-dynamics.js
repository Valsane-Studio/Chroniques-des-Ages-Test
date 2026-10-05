/* DEV — Dynamique des premières rencontres.
   - PAGE 39 : deux façons actives de franchir les fissures, avec jet volontaire.
   - PAGE 47 : trois tactiques d'ouverture distinctes contre le Rampant de l'îlot. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const STORY = book?.story;
  if (!STORY) return;

  const ISLET_MAX_HP = 12;
  const ISLET_DAMAGE = 4;
  const VERSION = 1;

  function d6() {
    const a = new Uint32Array(1);
    if (window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(a);
      return (a[0] % 6) + 1;
    }
    return Math.floor(Math.random() * 6) + 1;
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

  function weaponPower(state) {
    return state.weapon === 'heavy' ? 5 :
      state.weapon === 'light' ? 2 :
      state.weapon === 'black_blade' ? 6 :
      state.weapon === 'sorcerer_sword' ? 8 : 0;
  }

  function heroDamage(state) {
    return 2 + (state.weapon === 'none' ? 0 : weaponPower(state));
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
    state.contamination = Math.min(13, contaminationLevel(state) + Math.max(0, amount || 0));
    state.flags.blackEarthContamination = state.contamination > 0;
    if (state.contamination >= 13) state.flags.blackEarthTransformed = true;
  }

  function applyDamage(state, amount) {
    let remaining = Math.max(0, Math.floor(Number(amount) || 0));
    let absorbed = 0;
    const destroyedProtection = [];
    const defs = [
      ['bouclier_chevalier', 'Bouclier du chevalier'],
      ['casque_cabosse', 'Casque cabossé'],
      ['gantelet_veilleur', 'Gantelet de Veilleur']
    ];

    state.protectionItems = state.protectionItems || {};
    for (const [id, name] of defs) {
      if (!hasItem(state, id) || remaining <= 0) continue;
      const source = state.protectionItems[id];
      if (!source) continue;
      const available = Math.max(0, Number(source.remaining || 0));
      const used = Math.min(available, remaining);
      if (!used) continue;
      source.remaining = available - used;
      remaining -= used;
      absorbed += used;
      if (available > 0 && source.remaining <= 0) destroyedProtection.push(name);
    }

    const hpLost = remaining;
    state.hp = Math.max(0, Number(state.hp || 0) - hpLost);
    return { incoming: amount, absorbed, hpLost, destroyedProtection };
  }

  function renderDie(value) {
    const patterns = {
      1:[4], 2:[0,8], 3:[0,4,8], 4:[0,2,6,8], 5:[0,2,4,6,8], 6:[0,2,3,5,6,8]
    };
    const pips = patterns[Math.max(1, Math.min(6, Number(value) || 1))] || [];
    return `<span class="die-visual">${Array.from({length:9}, (_, i) =>
      `<span class="die-cell">${pips.includes(i) ? '<i></i>' : ''}</span>`).join('')}</span>`;
  }

  function waitingHtml(stat) {
    return `<div class="dice-result dice-test-waiting">
      <p class="roll-number">Épreuve de ${stat}</p>
      <div class="dice-faces"><span class="die-visual combat-die-pending">?</span><span class="die-visual combat-die-pending">?</span><span class="die-visual combat-die-pending">?</span></div>
      <p>Jette les dés pour connaître le résultat.</p>
    </div>`;
  }

  function rollHtml(result) {
    if (!result) return '';
    return `<div class="dice-result">
      <p class="roll-number">Épreuve de ${result.statName}</p>
      <div class="dice-faces">${result.dice.map(renderDie).join('')}</div>
      <p>Total : <strong>${result.total}</strong> · Seuil : <strong>${result.threshold}</strong></p>
      <p><strong>${result.success ? 'Réussite' : 'Échec'}</strong></p>
    </div>`;
  }

  function protectionHtml(result) {
    if (!result || result.incoming <= 0) return '';
    let html = '';
    if (result.absorbed > 0 && result.hpLost > 0) {
      html += `<p><strong>Ta protection absorbe ${result.absorbed} point${result.absorbed > 1 ? 's' : ''}.</strong> Tu perds <strong>${result.hpLost} Vie</strong>.</p>`;
    } else if (result.absorbed > 0) {
      html += `<p><strong>Ta protection absorbe entièrement le choc.</strong></p>`;
    } else if (result.hpLost > 0) {
      html += `<p><strong>Tu perds ${result.hpLost} Vie.</strong></p>`;
    }
    if (result.destroyedProtection?.length) {
      html += result.destroyedProtection.map(name => `<p><strong>${name} ne peut plus te protéger.</strong></p>`).join('');
    }
    return html;
  }

  function fatalChoices(state) {
    const source = STORY.c39?.choices;
    return typeof source === 'function' ? (source(state) || []) : [];
  }

  /* ----------------------------------------------------------------------
     PAGE 37 -> PAGE 39 : le joueur choisit COMMENT franchir les fissures.
     ---------------------------------------------------------------------- */
  if (STORY.c37 && !STORY.c37.__fissureTacticsV1) {
    const oldText = STORY.c37.text;
    STORY.c37.text = state => {
      let html = typeof oldText === 'function' ? oldText(state) : oldText;
      html = String(html || '').replace(/<p><strong>Ta Dextérité actuelle[^<]*<\/strong><\/p>/, '');
      return `${html}<p>Le passage continue entre les fissures. Tu dois décider comment t’y engager.</p>`;
    };
    STORY.c37.choices = [
      { label: 'Avancer lentement sans provoquer ce qui vit dans les parois', to: 'fissureDexTest' },
      { label: 'Garder ta lame entre toi et les fissures et forcer le passage', to: 'fissureForceTest' }
    ];
    STORY.c37.__fissureTacticsV1 = true;
  }

  function resolveFissure(state, approach) {
    state.flags = state.flags || {};
    if (state.flags.fissureApproachRoll?.approach === approach) return;

    const dice = [d6(), d6(), d6()];
    const threshold = approach === 'force' ? currentForce(state) : currentDexterity(state);
    const total = dice[0] + dice[1] + dice[2];
    const success = total <= threshold;
    let damage = null;

    if (!state.flags.fissureDustExposure) {
      state.flags.fissureDustExposure = true;
      raiseContamination(state, 1);
    }
    if (!success) damage = applyDamage(state, 1);

    state.flags.fissureApproach = approach;
    state.flags.fissurePass = success ? 'success' : 'fail';
    state.flags.fissureDamage = damage;
    state.flags.fissureApproachRoll = {
      approach,
      statName: approach === 'force' ? 'Force' : 'Dextérité',
      dice, threshold, total, success, damage
    };
  }

  function fissureNarrative(state, approach) {
    const r = state.flags?.fissureApproachRoll;
    if (!r || r.approach !== approach) return waitingHtml(approach === 'force' ? 'Force' : 'Dextérité');

    const dust = '<p>Une fine poussière noire se détache des fissures et s’infiltre sous tes vêtements et dans ta respiration. <strong>Terre noire : +1.</strong></p>';

    if (approach === 'dexterity') {
      return `${rollHtml(r)}${r.success ? `
        <p>Tu avances centimètre par centimètre, sans répondre aux mouvements dans la pierre.</p>
        ${dust}
        <p>Des doigts pâles apparaissent parfois dans une fente, puis se retirent dès que tu t’immobilises.</p>
        <p>Tu résistes à l’envie d’accélérer. Peu à peu, le passage s’élargit.</p>
        <p>Derrière toi, plusieurs petits coups secs résonnent encore dans la roche.</p>` : `
        <p>Ton équipement accroche la paroi une fraction de seconde.</p>
        ${dust}
        <p>Une main grisâtre jaillit aussitôt et se referme sur ton avant-bras. Tu arraches ton bras et te jettes en avant.</p>
        ${protectionHtml(r.damage)}
        <p>Lorsque le passage s’élargit enfin, les frottements continuent derrière toi.</p>`}`;
    }

    return `${rollHtml(r)}${r.success ? `
      <p>Tu présentes la lame devant les fissures et avances en la faisant glisser contre la roche.</p>
      ${dust}
      <p>Une main se tend brusquement vers toi. Tu la repousses du plat de l’épée avant qu’elle ne puisse se refermer.</p>
      <p>Un cri étouffé répond derrière la paroi.</p>
      <p>Ce n’est pas le cri d’une bête. Pendant une seconde, il ressemble terriblement à une voix humaine.</p>
      <p>D’autres doigts apparaissent plus loin, mais ta lame les tient à distance jusqu’à ce que le passage s’élargisse.</p>` : `
      <p>Tu gardes la lame devant toi et tentes de repousser les premières mains.</p>
      ${dust}
      <p>La pointe se coince entre deux pierres. Dans le même instant, des doigts se referment sur ton poignet.</p>
      <p>Tu dois abandonner ton appui pour arracher la lame et te dégager.</p>
      ${protectionHtml(r.damage)}
      <p>Tu franchis les derniers mètres en frappant la roche au hasard, jusqu’à ce que les fissures deviennent trop étroites pour laisser passer les mains.</p>`}`;
  }

  function fissureChoices(state) {
    if (state.hp <= 0) return fatalChoices(state);
    return [{ label: 'Poursuivre vers le courant d’air froid', to: 'c40' }];
  }

  STORY.fissureDexTest = {
    number: 'PAGE 39', title: '', noImage: true, image: 'Ce qui vit entre les pierres',
    text: state => fissureNarrative(state, 'dexterity'),
    choices: state => state.flags?.fissureApproachRoll?.approach === 'dexterity'
      ? fissureChoices(state)
      : [{ label: 'Jeter les dés', stay: true, inlineCombat: true, effect: s => resolveFissure(s, 'dexterity') }]
  };

  STORY.fissureForceTest = {
    number: 'PAGE 39', title: '', noImage: true, image: 'Ce qui vit entre les pierres',
    text: state => fissureNarrative(state, 'force'),
    choices: state => state.flags?.fissureApproachRoll?.approach === 'force'
      ? fissureChoices(state)
      : [{ label: 'Jeter les dés', stay: true, inlineCombat: true, effect: s => resolveFissure(s, 'force') }]
  };

  /* ----------------------------------------------------------------------
     PAGE 47 : trois tactiques d'ouverture contre le Rampant de l'îlot.
     ---------------------------------------------------------------------- */
  if (STORY.c47 && !STORY.c47.__isletTacticsV1) {
    const scene = STORY.c47;
    const oldText = scene.text;
    const oldChoices = scene.choices;

    function choicesOf(state) {
      return typeof oldChoices === 'function' ? (oldChoices(state) || []) : (oldChoices || []);
    }

    function combat(state) {
      state.combats = state.combats || {};
      if (!state.combats.isletCrawler) {
        try { choicesOf(state); } catch (e) {}
      }
      if (!state.combats.isletCrawler) {
        state.combats.isletCrawler = { hp: ISLET_MAX_HP, round: 0, last: null, lastBlade: null };
      }
      const c = state.combats.isletCrawler;
      if (!Number.isFinite(c.hp)) c.hp = ISLET_MAX_HP;
      c.hp = Math.max(0, Math.min(ISLET_MAX_HP, c.hp));
      if (!Number.isInteger(c.round)) c.round = 0;
      return c;
    }

    function resetTactic(state) {
      state.flags = state.flags || {};
      delete state.flags.isletTactic;
      delete state.flags.isletTacticResolved;
      delete state.flags.isletOpeningDamage;
      delete state.flags.isletCircleRoll;
      state.flags.isletTacticVersion = VERSION;
    }

    function standardRollChoice(state) {
      return choicesOf(state).find(choice => choice && choice.inlineCombat && /^Jeter les dés/i.test(choice.label || ''));
    }

    function applyBraceOpening(state) {
      const c = combat(state);
      if (state.flags?.isletTacticResolved) return;
      c.hp = Math.max(0, c.hp - 3);
      state.flags.isletTactic = 'brace';
      state.flags.isletTacticResolved = true;
      state.flags.isletOpeningDamage = 3;
    }

    function prepareVertical(state) {
      state.flags = state.flags || {};
      state.flags.isletTactic = 'vertical';
      state.flags.isletTacticResolved = false;
    }

    function resolveVertical(state) {
      const rollChoice = standardRollChoice(state);
      if (!rollChoice || typeof rollChoice.effect !== 'function') return;
      const c = combat(state);
      const before = c.hp;
      rollChoice.effect(state);
      const r = c.last;
      if (r?.outcome === 'hero') {
        const normalDamage = Math.max(0, before - c.hp);
        const reducedDamage = Math.max(0, normalDamage - 2);
        const refund = normalDamage - reducedDamage;
        c.hp = Math.min(ISLET_MAX_HP, c.hp + refund);
        r.damage = reducedDamage;
        r.heroDamage = reducedDamage;
        r.heroWeaponPower = Math.max(0, Number(r.heroWeaponPower || 0) - 2);
        r.enemyHp = c.hp;
      }
      state.flags.isletTacticResolved = true;
    }

    function prepareCircle(state) {
      state.flags = state.flags || {};
      state.flags.isletTactic = 'circle';
      state.flags.isletTacticResolved = false;
      delete state.flags.isletCircleRoll;
    }

    function resolveCircle(state) {
      if (state.flags?.isletCircleRoll) return;
      const c = combat(state);
      const dice = [d6(), d6(), d6()];
      const threshold = currentDexterity(state);
      const total = dice.reduce((a, b) => a + b, 0);
      const success = total <= threshold;
      let damage = 0;
      let received = null;

      if (success) {
        damage = heroDamage(state) + 2;
        c.hp = Math.max(0, c.hp - damage);
      } else {
        received = applyDamage(state, ISLET_DAMAGE);
        if (received.hpLost > 0 && !c.contaminated) {
          raiseContamination(state, 2);
          c.contaminated = true;
        }
      }

      state.flags.isletCircleRoll = {
        statName: 'Dextérité', dice, threshold, total, success,
        damage, received, enemyHp: c.hp
      };
      state.flags.isletTacticResolved = true;
    }

    scene.text = state => {
      const c = combat(state);
      const base = typeof oldText === 'function' ? oldText(state) : oldText;
      const tactic = state.flags?.isletTactic;

      if (c.round === 0 && !c.lastBlade && !tactic) {
        return `${base}
          <p>La créature avance lentement et lourdement. Elle ne se précipite pas encore.</p>
          <p>Tu as quelques secondes pour décider comment l’engager.</p>`;
      }

      if (tactic === 'brace' && state.flags.isletTacticResolved && c.round === 0) {
        return `${base}
          <p>Tu plantes tes appuis et gardes la pointe de ton épée droit devant toi.</p>
          <p>La chose continue d’avancer sans chercher à éviter la lame. Tu attends le dernier instant et la piques avant qu’elle ne puisse bondir.</p>
          <p><strong>Le Rampant perd 3 points de Vie avant le début du combat.</strong></p>`;
      }

      if (tactic === 'vertical' && !state.flags.isletTacticResolved && c.round === 0) {
        return `${base}
          <p>Tu lèves ton épée au-dessus de toi et choisis ce qui ressemble le plus à une tête.</p>
          <p>Mais sa forme se déplace lorsque tu essaies de la fixer. Tu vas devoir frapper sans savoir exactement où viser.</p>`;
      }

      if (tactic === 'vertical' && state.flags.isletTacticResolved && c.last) {
        return `${base}
          <p>Ton attaque verticale visait une anatomie que tu ne parviens pas à comprendre. Même lorsqu’elle porte, elle est moins efficace qu’un coup placé normalement.</p>`;
      }

      return base;
    };

    scene.choices = state => {
      const c = combat(state);
      if (state.hp <= 0 || c.hp <= 0 || c.round > 0 || c.lastBlade) return choicesOf(state);

      const tactic = state.flags?.isletTactic;
      if (!tactic) {
        return [
          { label: 'Garder la pointe de ton épée face à elle et attendre qu’elle s’approche', stay: true, effect: applyBraceOpening },
          { label: 'Lever ton épée et frapper verticalement ce qui semble être sa tête', stay: true, effect: prepareVertical },
          { label: 'Tourner rapidement autour d’elle pour chercher son angle mort', to: 'isletCircleTest', effect: prepareCircle }
        ];
      }

      if (tactic === 'vertical' && !state.flags.isletTacticResolved) {
        return [{ label: 'Jeter les dés', stay: true, inlineCombat: true, effect: resolveVertical }];
      }

      return choicesOf(state);
    };

    STORY.isletCircleTest = {
      number: 'PAGE 47', title: '', noImage: true,
      text: state => {
        const r = state.flags?.isletCircleRoll;
        if (!r) {
          return `<p>Tu commences à tourner autour du Rampant. Sa gueule suit chacun de tes déplacements, mais son corps massif pivote avec lenteur.</p>${waitingHtml('Dextérité')}`;
        }
        return `${rollHtml(r)}${r.success ? `
          <p>Tu changes brusquement de direction. La gueule continue son mouvement une fraction de seconde trop longtemps.</p>
          <p>Tu passes sur son flanc et frappes avant qu’elle puisse se retourner.</p>
          <p><strong>Ton coup porte sans riposte et inflige ${r.damage} dégâts : dégâts normaux + 2.</strong></p>
          <p>Le Rampant se retourne lourdement vers toi. Le combat commence réellement.</p>` : `
          <p>Tu accélères pour passer sur son flanc, mais la gueule pivote plus vite que tu ne l’avais prévu.</p>
          <p>Elle te percute avant que tu puisses frapper.</p>
          ${protectionHtml(r.received)}
          <p>Tu te dégages. Le Rampant te fait de nouveau face.</p>`}`;
      },
      choices: state => {
        if (!state.flags?.isletCircleRoll) {
          return [{ label: 'Jeter les dés', stay: true, inlineCombat: true, effect: resolveCircle }];
        }
        if (state.hp <= 0) return fatalChoices(state);
        return [{ label: 'Engager le combat', to: 'c47' }];
      }
    };

    /* Un nouveau passage par « Accoster l’îlot » réinitialise l'ouverture tactique. */
    for (const otherScene of Object.values(STORY)) {
      if (!otherScene?.choices || otherScene === scene || otherScene === STORY.isletCircleTest) continue;
      const sourceChoices = otherScene.choices;
      otherScene.choices = state => {
        const list = typeof sourceChoices === 'function' ? (sourceChoices(state) || []) : (sourceChoices || []);
        return list.map(choice => {
          if (!choice || choice.to !== 'c47' || !/Accoster/i.test(choice.label || '')) return choice;
          const oldEffect = choice.effect;
          return {
            ...choice,
            effect: s => {
              if (typeof oldEffect === 'function') oldEffect(s);
              resetTactic(s);
            }
          };
        });
      };
    }

    scene.__isletTacticsV1 = true;
  }
})();
