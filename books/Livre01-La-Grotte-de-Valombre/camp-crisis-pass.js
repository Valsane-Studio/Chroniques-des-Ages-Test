/* DEV — Page 028 : une seule exploration avant que la situation autour d’Anselme bascule.
   Objectif : supprimer l’effet « je visite tout » et transformer la première branche choisie
   en vraie décision. Après cette visite, les cris d’Anselme ferment les autres détours. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const STORY = book?.story;
  if (!STORY) return;

  const CRISIS_ID = 'campCrisis';
  const AID_ID = 'campAidArrival';
  const TACTICS_ID = 'campAidTactics';
  const ESCAPE_ID = 'campEscapeResult';

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
    if (inv && typeof inv === 'object') return Boolean(inv[id]);
    return false;
  }

  function currentForce(state) {
    const itemBonus = hasItem(state, 'brassard_veilleurs') ? 1 : 0;
    return Math.max(3, Number(state.baseForce || 8) + Number(state.forceBonus || 0) + itemBonus);
  }

  function currentDexterity(state) {
    const weaponModifier = state.weapon === 'heavy' ? -4 :
      (state.weapon === 'light' || state.weapon === 'sorcerer_sword' ? -1 : 0);
    const itemBonus = (hasItem(state, 'anneau_veilleurs') ? 1 : 0) + (hasItem(state, 'bague_lueur') ? 2 : 0);
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

  function applyDamage(state, amount) {
    let remaining = Math.max(0, Math.floor(Number(amount) || 0));
    let absorbed = 0;
    const broken = [];
    const defs = [
      ['bouclier_chevalier', 'Bouclier du chevalier'],
      ['casque_cabosse', 'Casque cabossé'],
      ['gantelet_veilleur', 'Gantelet de Veilleur']
    ];

    if (!state.protectionItems || typeof state.protectionItems !== 'object') state.protectionItems = {};

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
      if (available > 0 && source.remaining <= 0) broken.push(name);
    }

    const hpLost = remaining;
    state.hp = Math.max(0, Number(state.hp || 0) - hpLost);
    return { incoming: amount, absorbed, hpLost, broken };
  }

  function diceHtml(dice, title, threshold, success) {
    const faces = ['⚀','⚁','⚂','⚃','⚄','⚅'];
    const total = dice.reduce((a, b) => a + b, 0);
    return `<div class="dice-result">
      <p class="roll-number">${title}</p>
      <div class="dice-faces">${dice.map(n => `<span class="die-visual">${faces[n - 1]}</span>`).join('')}</div>
      <p>Total : <strong>${total}</strong>${Number.isFinite(threshold) ? ` · Seuil : <strong>${threshold}</strong>` : ''}</p>
      <p><strong>${success ? 'Réussite' : 'Échec'}</strong></p>
    </div>`;
  }

  function damageHtml(result) {
    if (!result || result.incoming <= 0) return '';
    let text = '';
    if (result.absorbed > 0 && result.hpLost > 0) {
      text = `<p><strong>Ta protection absorbe ${result.absorbed} point${result.absorbed > 1 ? 's' : ''}.</strong> Tu perds <strong>${result.hpLost} Vie</strong>.</p>`;
    } else if (result.absorbed > 0) {
      text = `<p><strong>Ta protection absorbe entièrement le choc.</strong> Tu ne perds aucun point de Vie.</p>`;
    } else if (result.hpLost > 0) {
      text = `<p><strong>Tu perds ${result.hpLost} Vie.</strong></p>`;
    }
    if (result.broken?.length) text += result.broken.map(name => `<p><strong>${name} ne peut plus te protéger.</strong></p>`).join('');
    return text;
  }

  function crisisText() {
    return `
      <p>Un hurlement éclate soudain dans la cavité du camp.</p>
      <p>C’est Anselme.</p>
      <p>Un second cri, plus court, est suivi d’un bruit humide. Quelque chose se déchire. Des chocs résonnent contre la roche.</p>
      <p>Puis Anselme hurle de nouveau.</p>
    `;
  }

  function abandonAnselme(state) {
    state.flags.campCrisisStarted = true;
    state.flags.campCrisisResolved = true;
    state.flags.anselmeFate = 'abandoned';
    state.flags.campBranchesLocked = true;
  }

  function crisisChoices() {
    return [
      {
        label: 'Retourner voir ce qui arrive à Anselme',
        to: AID_ID,
        effect: state => {
          state.flags.campCrisisStarted = true;
          state.flags.campBranchesLocked = true;
        }
      },
      {
        label: 'Poursuivre au plus vite vers les profondeurs',
        to: 'c37',
        effect: abandonAnselme
      }
    ];
  }

  function resolveFirstRound(state) {
    const heroDice = [d6(), d6()];
    const enemyDice = [d6(), d6()];
    const force = currentForce(state);
    const dexterity = currentDexterity(state);
    const heroAttack = force + dexterity + heroDice[0] + heroDice[1];
    const enemyAttack = 10 + 8 + enemyDice[0] + enemyDice[1];
    const success = heroAttack >= enemyAttack;
    const damage = success ? { incoming: 0, absorbed: 0, hpLost: 0, broken: [] } : applyDamage(state, 2);

    state.flags.anselmeFirstRound = {
      heroDice, enemyDice, force, dexterity, heroAttack, enemyAttack, success, damage
    };
  }

  function resolveEscape(state, strategy) {
    const result = { strategy, success: true, dice: [], threshold: null, damage: null };

    if (strategy === 'force') {
      result.threshold = currentForce(state);
      result.dice = [d6(), d6(), d6()];
      result.success = result.dice.reduce((a,b) => a + b, 0) <= result.threshold;
      if (!result.success) result.damage = applyDamage(state, d6() % 3 + 2); // 2 à 4 dégâts
    } else if (strategy === 'dexterity') {
      result.threshold = currentDexterity(state);
      result.dice = [d6(), d6(), d6()];
      result.success = result.dice.reduce((a,b) => a + b, 0) <= result.threshold;
      if (!result.success) result.damage = applyDamage(state, (d6() % 3) + 1); // 1 à 3 dégâts
    } else {
      // Le feu garantit une ouverture, mais oblige à passer au ras des flammes.
      result.success = true;
      result.damage = applyDamage(state, 1);
    }

    state.flags.anselmeEscape = result;
    state.flags.campCrisisResolved = true;
    state.flags.campBranchesLocked = true;
    state.flags.anselmeFate = 'lost';
  }

  STORY[CRISIS_ID] = {
    number: 'PAGE 30',
    title: '',
    noImage: true,
    text: crisisText,
    choices: crisisChoices
  };

  STORY[AID_ID] = {
    number: 'PAGE 30',
    title: '',
    noImage: true,
    text: `
      <p>Tu fais demi-tour et cours vers le feu.</p>
      <p>Quatre silhouettes entourent Anselme. Des hommes, peut-être. Ils sont courts, trapus, terriblement maigres. Leur peau pend sur leurs épaules et leurs mouvements sont secs, désarticulés.</p>
      <p>Anselme est au sol. L’un d’eux le maintient tandis qu’un autre tire sur son bras.</p>
      <p>Deux têtes se tournent vers toi.</p>
      <p>Tu as à peine le temps de comprendre ce que tu regardes qu’ils se jettent sur toi.</p>
    `,
    choices: [{
      label: 'Jeter les dés',
      to: TACTICS_ID,
      inlineCombat: true,
      effect: resolveFirstRound
    }]
  };

  STORY[TACTICS_ID] = {
    number: 'PAGE 30',
    title: '',
    noImage: true,
    text: state => {
      const r = state.flags.anselmeFirstRound;
      if (!r) return '<p>Les deux premières silhouettes fondent sur toi.</p>';
      const heroSuccess = r.success
        ? '<p>Tu encaisses leur charge et réussis à les repousser assez longtemps pour reprendre appui.</p>'
        : `<p>Ils te frappent presque ensemble. Tu parviens à rester debout, mais le choc te fait reculer.</p>${damageHtml(r.damage)}`;
      return `
        <div class="combat-roll-result">
          <p class="roll-number">Deux contre un</p>
          <p>Ton attaque : <strong>${r.heroAttack}</strong> · Leur attaque : <strong>${r.enemyAttack}</strong></p>
          <p>TES DÉS : ${r.heroDice.join(' + ')} · LEURS DÉS : ${r.enemyDice.join(' + ')}</p>
        </div>
        ${heroSuccess}
        <p>Derrière eux, les deux autres abandonnent Anselme.</p>
        <p>Ils avancent maintenant vers toi.</p>
        <p>Quatre contre un. Si tu restes ici, ils vont t’encercler.</p>
        <p>À tes pieds, le feu d’Anselme brûle encore.</p>
      `;
    },
    choices: state => state.hp <= 0 ? [] : [
      {
        label: 'Repousser les deux premiers sur les deux autres — test de Force',
        to: ESCAPE_ID,
        effect: s => resolveEscape(s, 'force')
      },
      {
        label: 'Faire demi-tour et courir — test de Dextérité',
        to: ESCAPE_ID,
        effect: s => resolveEscape(s, 'dexterity')
      },
      {
        label: 'Renverser le feu du camp entre eux et toi',
        to: ESCAPE_ID,
        effect: s => resolveEscape(s, 'fire')
      }
    ]
  };

  STORY[ESCAPE_ID] = {
    number: 'PAGE 30',
    title: '',
    noImage: true,
    text: state => {
      const r = state.flags.anselmeEscape;
      if (!r) return '<p>Tu cherches une ouverture pour t’échapper.</p>';

      let body = '';
      if (r.strategy === 'force') {
        body = r.success
          ? '<p>Tu charges les deux premiers de l’épaule. Ils reculent l’un sur l’autre et percutent les deux silhouettes qui arrivaient derrière eux. Pendant quelques secondes, le passage est libre. Tu t’y engouffres.</p>'
          : '<p>Tu charges, mais ils cèdent à peine. Tu dois forcer le passage entre deux corps qui te frappent au moment où tu te dégages.</p>';
      } else if (r.strategy === 'dexterity') {
        body = r.success
          ? '<p>Tu pivotes avant qu’ils puissent refermer le cercle et pars en courant. Une main frôle ton dos, puis les pas s’éloignent derrière toi.</p>'
          : '<p>Tu te retournes trop tard. Une main s’accroche à ton vêtement et te tire en arrière. Tu frappes à l’aveugle, te dégages et cours sans regarder derrière toi.</p>';
      } else {
        body = '<p>D’un coup de botte, tu renverses le brasier. Les bûches et les braises roulent entre les silhouettes. Elles reculent devant les flammes. Tu traverses la fumée au plus près du feu et t’échappes pendant qu’elles hésitent.</p>';
      }

      const roll = r.dice?.length ? diceHtml(r.dice, r.strategy === 'force' ? 'Épreuve de Force' : 'Épreuve de Dextérité', r.threshold, r.success) : '';
      const damage = damageHtml(r.damage);
      const ending = state.hp <= 0
        ? '<p>Tu fais encore quelques pas dans la galerie avant que tes jambes ne cèdent.</p>'
        : '<p>Tu ne t’arrêtes que lorsque les cris et les pas ont disparu derrière toi. Anselme, lui, ne crie plus.</p>';
      return `${roll}${body}${damage}${ending}`;
    },
    choices: state => state.hp <= 0 ? [] : [{ label: 'Poursuivre vers les profondeurs', to: 'c37' }]
  };

  /* PAGE 030 — le vieux campement est une branche complète : récompense éventuelle,
     puis crise. Les autres détours ne restent plus disponibles après cette visite. */
  if (STORY.c30 && !STORY.c30.__campCrisisPass) {
    const oldText = STORY.c30.text;
    const oldChoices = STORY.c30.choices;

    STORY.c30.text = state => {
      const html = typeof oldText === 'function' ? oldText(state) : oldText;
      if (state.flags.campCrisisResolved) return html;
      return `${html || ''}${crisisText()}`;
    };

    STORY.c30.choices = state => {
      const source = typeof oldChoices === 'function' ? oldChoices(state) : (oldChoices || []);
      const localActions = source.filter(choice => choice?.stay);
      if (state.flags.campCrisisResolved) return source;
      return [...localActions, ...crisisChoices()];
    };

    STORY.c30.__campCrisisPass = true;
  }

  /* Pour les deux autres branches, on laisse vivre leur contenu interne (test de
     Force, rencontre du tunnel, combat éventuel), mais toute sortie vers le
     croisement déclenche désormais la crise au lieu de permettre une deuxième visite. */
  function redirectBranchExits(id) {
    const scene = STORY[id];
    if (!scene || scene.__campExitRedirected) return;
    const oldChoices = scene.choices;
    scene.choices = state => {
      const source = typeof oldChoices === 'function' ? oldChoices(state) : (oldChoices || []);
      if (state.flags.campCrisisResolved) return source;
      return source.map(choice => {
        if (!choice || choice.stay) return choice;
        if (!['c28','c30','c37'].includes(choice.to)) return choice;
        const oldEffect = choice.effect;
        return {
          ...choice,
          to: CRISIS_ID,
          effect: s => {
            if (typeof oldEffect === 'function') oldEffect(s);
            s.flags.campCrisisStarted = true;
            s.flags.campBranchesLocked = true;
          }
        };
      });
    };
    scene.__campExitRedirected = true;
  }

  ['c31','c32','c33','c34','c35','c36','c38'].forEach(redirectBranchExits);

  /* Si une ancienne sauvegarde revient sur la page 028 après le déclenchement,
     on ne réouvre jamais les trois visites. */
  if (STORY.c28 && !STORY.c28.__campLockPass) {
    const oldChoices = STORY.c28.choices;
    STORY.c28.choices = state => {
      if (state.flags.campBranchesLocked && !state.flags.campCrisisResolved) return crisisChoices();
      if (state.flags.campBranchesLocked && state.flags.campCrisisResolved) {
        return [{ label: 'Poursuivre vers les profondeurs', to: 'c37' }];
      }
      return typeof oldChoices === 'function' ? oldChoices(state) : (oldChoices || []);
    };
    STORY.c28.__campLockPass = true;
  }

  /* Le départ vers la page 037 tient compte de la manière dont Anselme a été laissé. */
  if (STORY.c37 && !STORY.c37.__campCrisisWording) {
    const oldText = STORY.c37.text;
    STORY.c37.text = state => {
      let html = typeof oldText === 'function' ? oldText(state) : oldText;
      if (!html) return html;
      if (state.flags.anselmeFate === 'abandoned') {
        html = html.replace('<p>Tu quittes enfin le camp d’Anselme et reprends la descente.</p>', '');
        return `<p>Tu t’éloignes sans te retourner. Les cris d’Anselme résonnent encore quelques secondes derrière toi, puis s’interrompent.</p>${html}`;
      }
      if (state.flags.anselmeFate === 'lost') {
        html = html.replace('<p>Tu quittes enfin le camp d’Anselme et reprends la descente.</p>', '');
        return `<p>Tu continues à courir longtemps après avoir quitté le camp. Lorsque tu ralentis enfin, aucun bruit ne te poursuit.</p>${html}`;
      }
      return html;
    };
    STORY.c37.__campCrisisWording = true;
  }
})();
