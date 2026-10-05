/* Livre 01 — correctifs V2 pages 185–188 : dés manuels, équipement et raccord après les dalles. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const STORY = book?.story;
  const rules = book?.rules;
  if (!STORY || !rules || !STORY.c169 || !STORY.c170 || !STORY.c171) return;
  if (STORY.c169.__slabFixesV2) return;

  const FLOW_KEY = 'labyrinthSlabSequenceV1';
  const oldFatalSource = STORY.c171.choices;

  function d6() {
    try {
      const a = new Uint32Array(1);
      crypto.getRandomValues(a);
      return (a[0] % 6) + 1;
    } catch (_) {
      return Math.floor(Math.random() * 6) + 1;
    }
  }

  function d3() { return Math.ceil(d6() / 2); }

  function ensureFlags(state) {
    if (!state.flags || typeof state.flags !== 'object') state.flags = {};
    return state.flags;
  }

  function flow(state) {
    const flags = ensureFlags(state);
    if (!flags[FLOW_KEY] || typeof flags[FLOW_KEY] !== 'object') flags[FLOW_KEY] = { version: 1 };
    return flags[FLOW_KEY];
  }

  function hasItem(state, id) {
    return !!(state.inventory && state.inventory[id]);
  }

  function removeItem(state, id) {
    if (state.inventory && state.inventory[id]) delete state.inventory[id];
  }

  function removeProtectionState(state, id) {
    if (state.protectionItems && state.protectionItems[id]) delete state.protectionItems[id];
  }

  function loseHpDirect(state, amount) {
    const loss = Math.max(0, Math.floor(Number(amount) || 0));
    const before = Number(state.hp || 0);
    state.hp = Math.max(0, before - loss);
    return before - state.hp;
  }

  function dexRoll(state) {
    const dice = [d6(), d6(), d6()];
    const total = dice[0] + dice[1] + dice[2];
    const dexterity = Number(rules.currentDexterity(state));
    return { dice, total, dexterity, success: total <= dexterity };
  }

  function diceHtml(result, label) {
    if (!result) return '';
    return `<div class="dice-result">
      <p class="roll-number">${label}</p>
      <div class="dice-faces"><strong>${result.dice.join(' · ')}</strong></div>
      <p>Total : <strong>${result.total}</strong> · Seuil : <strong>${result.dexterity}</strong></p>
      <p><strong>${result.success ? 'Réussite' : 'Échec'}</strong></p>
    </div>`;
  }

  function deathChoices(state) {
    try {
      const choices = typeof oldFatalSource === 'function' ? oldFatalSource(state) : null;
      if (Array.isArray(choices) && choices.length && !choices.some(ch => ch?.label === 'Lancer le dé')) return choices;
    } catch (_) {}
    return [{ label: 'Recommencer depuis le début', action: 'restart' }];
  }

  function contaminationCritical(state) {
    return Number(state.contamination || 0) >= 13 || !!state.flags?.blackEarthTransformed;
  }

  function nextNode() { return 'c179'; }

  function archBlocker(state) {
    const f = flow(state);
    if (f.archBlocker) return f.archBlocker;
    if (hasItem(state, 'bouclier_chevalier')) f.archBlocker = 'shield';
    else if (hasItem(state, 'casque_cabosse')) f.archBlocker = 'helmet';
    else f.archBlocker = 'none';
    return f.archBlocker;
  }

  function abandonArchBlocker(state) {
    const f = flow(state);
    const blocker = archBlocker(state);
    if (blocker === 'shield') {
      removeItem(state, 'bouclier_chevalier');
      removeProtectionState(state, 'bouclier_chevalier');
      f.shieldAbandoned = true;
    } else if (blocker === 'helmet') {
      removeItem(state, 'casque_cabosse');
      removeProtectionState(state, 'casque_cabosse');
      f.helmetAbandoned = true;
    }
    f.archPassed = true;
  }

  function turnBackIntoMonster(state) {
    const f = flow(state);
    f.route = 'arch-return';
    f.stage = 'combat';
    f.cameFromArch = true;
    if (!f.archReturnHitApplied) {
      f.archReturnHitApplied = true;
      f.archReturnHpLost = loseHpDirect(state, 2);
    }
  }

  function prepareRush(state) {
    const f = flow(state);
    f.route = 'rush';
    f.pendingRoll = 'rush';
  }

  function resolveRush(state) {
    const f = flow(state);
    if (f.rushRoll) return;
    f.rushRoll = dexRoll(state);
    f.pendingRoll = null;
    if (!f.rushRoll.success) f.rushHpLost = loseHpDirect(state, 1);
  }

  function prepareEdge(state) {
    const f = flow(state);
    f.pendingRoll = 'edge';
    f.combatMethod = 'edge';
  }

  function resolveEdge(state) {
    const f = flow(state);
    if (f.edgeRoll) return;
    f.edgeRoll = dexRoll(state);
    f.pendingRoll = null;
    f.monsterDead = true;
    f.stage = 'after-combat';
    f.combatMethod = 'edge';
    if (!f.edgeRoll.success) {
      rules.raiseContamination(state, 3);
      f.contaminationGained = 3;
    }
  }

  function powerStrike(state) {
    const f = flow(state);
    if (f.monsterDead) return;
    f.pendingRoll = null;
    f.stage = 'after-combat';
    f.monsterDead = true;
    f.combatMethod = 'power';
    rules.raiseContamination(state, 3);
    f.contaminationGained = 3;
  }

  function chooseObservedRoute(state, choice) {
    const f = flow(state);
    if (f.observationChoice) return;
    f.observationChoice = choice;
    f.route = 'observed';
  }

  function loseBrassardIfPresent(state) {
    const f = flow(state);
    if (!hasItem(state, 'brassard_veilleurs')) return;
    removeItem(state, 'brassard_veilleurs');
    f.lostItem = 'brassard_veilleurs';
    f.lostItemName = 'Brassard des Veilleurs';
  }

  function resolveTraceFall(state) {
    const f = flow(state);
    if (f.fallDie) return;
    f.fallDie = d3();
    f.fallHpLost = loseHpDirect(state, f.fallDie);
    loseBrassardIfPresent(state);
  }

  STORY.c169.number = 'PAGE 186';
  STORY.c169.title = '';
  STORY.c169.noImage = true;
  STORY.c169.text = state => {
    const f = flow(state);
    const blocker = archBlocker(state);

    if (f.archPassed) {
      if (f.shieldAbandoned) {
        return `<p>Tu poses le bouclier contre la roche et t'allonges aussitôt dans l'ouverture.</p>
          <p>Tu avances sur les coudes. Derrière toi, le pas bancal se rapproche encore. Le métal racle la pierre, puis un choc brutal résonne contre l'arche.</p>
          <p>Tu te forces à ne pas regarder en arrière. Quelques mètres plus loin, le passage s'élargit enfin.</p>
          <p>Un second choc secoue les blocs derrière toi, mais rien ne passe. <strong>Le bouclier est resté de l'autre côté.</strong></p>`;
      }
      if (f.helmetAbandoned) {
        return `<p>Tu retires le casque cabossé et le poses derrière toi. Avec lui, impossible de garder la tête assez basse dans l'étroiture.</p>
          <p>Tu t'enfonces sous l'arche sur les coudes. Le métal racle la galerie derrière toi, de plus en plus près.</p>
          <p>Un choc secoue les pierres au moment où tu atteins l'autre côté. La chose est trop massive pour passer.</p>
          <p><strong>Le casque cabossé est resté derrière toi.</strong></p>`;
      }
      return `<p>Tu te glisses sous l'arche et avances lentement sur les coudes.</p>
        <p>Tu es heureusement équipé assez légèrement : rien ne se coince dans l'étroiture. Sans cela, il aurait fallu faire demi-tour.</p>
        <p>Le bruit métallique se rapproche jusqu'à résonner juste derrière les pierres. Un choc fait tomber de la poussière sur ton dos.</p>
        <p>Tu continues sans t'arrêter. Lorsque tu atteins enfin l'autre côté, un second choc retentit derrière toi. La chose est trop massive pour te suivre.</p>`;
    }

    if (blocker === 'shield') {
      return `<p>Tu t'engages sous l'arche, mais le passage se resserre presque aussitôt.</p>
        <p>Le bord de ton bouclier accroche la pierre. Tu essaies de le tourner, puis de le pousser devant toi : impossible. Il ne passera pas.</p>
        <p>Derrière toi, le pas irrégulier est maintenant beaucoup plus proche. Le raclement du métal ne s'interrompt plus que quelques secondes entre chaque enjambée.</p>
        <p>Si tu veux continuer sous l'arche, tu dois abandonner ton bouclier. Sinon, il faut faire demi-tour.</p>`;
    }

    if (blocker === 'helmet') {
      return `<p>Tu t'engages sous l'arche. Ton corps passe, mais le sommet du casque cabossé racle aussitôt la voûte et te bloque la tête.</p>
        <p>Tu essaies de te coucher davantage : impossible d'avancer ainsi.</p>
        <p>Derrière toi, le pas bancal se rapproche. Si tu veux continuer sous l'arche, tu dois retirer le casque et le laisser ici. Sinon, il faut faire demi-tour.</p>`;
    }

    return `<p>Tu t'allonges devant l'ouverture. Elle est étroite, mais tu es équipé assez légèrement pour y passer sans difficulté.</p>
      <p>Heureusement. Avec un équipement plus encombrant, il aurait fallu faire demi-tour.</p>
      <p>Derrière toi, le bruit métallique se rapproche. Tu n'as aucune raison de rester ici plus longtemps.</p>`;
  };

  STORY.c169.choices = state => {
    const f = flow(state);
    const blocker = archBlocker(state);
    if (state.hp <= 0) return deathChoices(state);
    if (f.archPassed) return [{ label: 'Poursuivre dans la galerie', to: nextNode() }];

    if (blocker === 'shield') {
      return [
        { label: 'Abandonner le bouclier et continuer sous l’arche', stay: true, effect: abandonArchBlocker },
        { label: 'Garder le bouclier et faire demi-tour', to: 'c170', effect: turnBackIntoMonster }
      ];
    }

    if (blocker === 'helmet') {
      return [
        { label: 'Laisser le casque cabossé et continuer sous l’arche', stay: true, effect: abandonArchBlocker },
        { label: 'Garder le casque et faire demi-tour', to: 'c170', effect: turnBackIntoMonster }
      ];
    }

    return [{ label: 'Ramper sous l’arche avant que la chose arrive', stay: true, effect: s => { flow(s).archPassed = true; } }];
  };

  STORY.c170.number = 'PAGE 187';
  STORY.c170.title = '';
  STORY.c170.noImage = true;
  STORY.c170.text = state => {
    const f = flow(state);

    if (contaminationCritical(state)) {
      return `<p>La chair noire de la créature éclabousse ta peau.</p>
        <p>La brûlure est immédiate. La terre noire se propage sous ta peau jusqu'à atteindre son seuil critique.</p>
        <p><strong>Tu ne contrôles déjà plus complètement tes mouvements.</strong></p>`;
    }

    if (f.pendingRoll === 'rush' && !f.rushRoll) {
      return `<p>Tu te retournes vers le gouffre. Plus le temps d'analyser quoi que ce soit.</p>
        <p>Tu prends ton élan. Derrière toi, la créature arrive presque à portée de bras.</p>
        <p>Il faut partir maintenant.</p>`;
    }

    if (f.pendingRoll === 'edge' && !f.edgeRoll) {
      return `<p>Tu recules lentement vers le bord du gouffre et attends la charge.</p>
        <p>La créature baisse l'épaule et se jette sur toi. Tu dois attendre le dernier instant pour t'écarter et utiliser son propre élan contre elle.</p>`;
    }

    if (f.monsterDead) {
      const combat = f.combatMethod === 'edge'
        ? (f.edgeRoll?.success
          ? `${diceHtml(f.edgeRoll, 'Épreuve de Dextérité')}
             <p>Tu attends jusqu'au dernier instant, puis te déportes d'un pas et pousses violemment la créature.</p>
             <p>Elle cherche un appui qui n'existe plus. Sa silhouette bascule dans le vide et disparaît. Quelques secondes plus tard, un choc sourd remonte du fond du gouffre.</p>`
          : `${diceHtml(f.edgeRoll, 'Épreuve de Dextérité')}
             <p>Tu t'écartes trop tard. La créature t'agrippe et vous vacillez tous les deux au bord du vide.</p>
             <p>Tu frappes le membre qui te retient. La lame le tranche de justesse. Le corps bascule dans le gouffre, mais la chair noire éclate contre ton bras et s'enfonce sous ta peau.</p>
             <p><strong>+3 Terre noire.</strong></p>`)
        : `<p>Tu n'essaies ni d'esquiver ni de calculer. Tu rassembles toute ta force dans un seul coup.</p>
           <p>La lame traverse la créature avec une violence telle que son sang noir asperge les pierres autour de toi. Elle s'effondre sur place.</p>
           <p>Une partie de cette matière s'est déjà glissée sous ta peau. <strong>+3 Terre noire.</strong></p>`;

      return `${combat}
        <p>Le silence revient enfin. Tu as payé ces quelques secondes, mais désormais rien ne te force à te jeter au hasard sur les dalles.</p>
        <p>Tu t'accroupis au bord du gouffre et les examines réellement.</p>
        <p>Près de la paroi, plusieurs dalles sont profondément engagées dans la roche. Elles sont fissurées et leurs bords s'effritent, mais toute leur base semble prise dans la montagne.</p>
        <p>Plus au centre, d'autres pierres sont couvertes d'une épaisse poussière intacte. Personne ne semble les avoir empruntées depuis très longtemps. Sous la poussière, leurs points d'appui sont encore visibles : de larges blocs de pierre, secs et immobiles.</p>
        <p>Enfin, une troisième ligne porte de longues marques claires. À première vue, elles ressemblent aux traces laissées par des passages répétés. Pourtant elles se prolongent jusque sur les supports métalliques, dont certaines parties ont été polies par frottement. Quelque chose est bien passé par là… ou a glissé.</p>`;
    }

    if (f.stage === 'combat') {
      if (f.cameFromArch) {
        return `<p>Tu fais demi-tour.</p>
          <p>La chose est déjà là.</p>
          <p>Mi-homme, mi-monstre, elle porte encore des morceaux d'une ancienne armure de Veilleur. Une jambe traîne derrière elle ; une plaque de métal fixée au tibia racle la pierre à chaque pas.</p>
          <p>Elle te percute avant que tu puisses reprendre complètement ta garde. <strong>−2 Vie.</strong></p>
          <p>Le gouffre est à quelques pas derrière toi. Tu n'as plus le temps d'observer les dalles.</p>`;
      }
      return `<p>Tu renonces à sauter au hasard et te retournes.</p>
        <p>La chose débouche dans la galerie. Mi-homme, mi-monstre, elle porte encore des morceaux d'une ancienne armure de Veilleur. Une jambe traîne derrière elle ; une plaque de métal fixée au tibia racle la pierre à chaque pas.</p>
        <p>Tu te places entre elle et le gouffre. Si tu veux avoir le temps d'étudier les dalles, il faut d'abord l'abattre.</p>`;
    }

    return `<p>Tu arrives au bord des premières dalles et hésites.</p>
      <p>Certaines semblent encore solides. D'autres penchent légèrement vers le vide. Il te faudrait quelques secondes pour comprendre comment elles reposent — quelques secondes que tu n'as pas.</p>
      <p>Derrière toi, le pas lourd débouche dans la galerie. Le raclement métallique est si proche que tu peux presque sentir le souffle de la créature.</p>
      <p>Tu peux foncer de dalle en dalle sans réfléchir, ou te retourner et affronter la chose pour gagner le temps nécessaire à l'observation.</p>`;
  };

  STORY.c170.choices = state => {
    const f = flow(state);
    if (state.hp <= 0) return deathChoices(state);
    if (contaminationCritical(state)) return [{ label: 'La terre noire envahit ton corps', to: 'c219' }];

    if (f.pendingRoll === 'rush' && !f.rushRoll) {
      return [{ label: 'Lancer les dés', to: 'c171', effect: resolveRush }];
    }

    if (f.pendingRoll === 'edge' && !f.edgeRoll) {
      return [{ label: 'Lancer les dés', stay: true, effect: resolveEdge }];
    }

    if (f.monsterDead) {
      return [
        { label: 'Suivre les dalles proches de la paroi, profondément prises dans la roche', to: 'c171', effect: s => chooseObservedRoute(s, 'wall') },
        { label: 'Choisir les dalles couvertes de poussière intacte', to: 'c171', effect: s => chooseObservedRoute(s, 'dust') },
        { label: 'Suivre les longues traces claires laissées sur les pierres', to: 'c171', effect: s => chooseObservedRoute(s, 'traces') }
      ];
    }

    if (f.stage === 'combat') {
      const choices = [];
      if (f.cameFromArch) choices.push({ label: 'Te jeter sur les dalles sans réfléchir pour lui échapper', stay: true, effect: prepareRush });
      choices.push(
        { label: 'Tenter de l’attirer vers le bord', stay: true, effect: prepareEdge },
        { label: 'Frapper de toutes tes forces sans réfléchir', stay: true, effect: powerStrike }
      );
      return choices;
    }

    return [
      { label: 'Foncer de dalle en dalle', stay: true, effect: prepareRush },
      { label: 'Affronter la créature pour gagner quelques secondes et observer', stay: true, effect: s => { flow(s).stage = 'combat'; } }
    ];
  };

  STORY.c171.number = 'PAGE 188';
  STORY.c171.title = '';
  STORY.c171.noImage = true;
  STORY.c171.text = state => {
    const f = flow(state);

    if (f.route === 'rush' && f.rushRoll) {
      if (f.rushRoll.success) {
        return `${diceHtml(f.rushRoll, 'Épreuve de Dextérité')}
          <p>Tu n'essaies même pas de comprendre quelles dalles sont fiables. Tu prends ton élan et cours.</p>
          <p>Une pierre s'incline sous ton premier appui, une autre se fend derrière toi, mais tu continues avant qu'elles aient le temps de céder.</p>
          <p>Tu bondis une dernière fois et roules sur la roche de l'autre côté du gouffre.</p>`;
      }
      return `${diceHtml(f.rushRoll, 'Épreuve de Dextérité')}
        <p>Tu vas trop vite. Une dalle pivote sous ton pied et ta jambe disparaît dans le vide.</p>
        <p>Tu te jettes en avant et accroches le bord d'une autre pierre. Elle t'entaille le bras tandis que tu te hisses de l'autre côté.</p>
        <p><strong>−${f.rushHpLost || 1} Vie.</strong></p>`;
    }

    if (f.observationChoice === 'wall') {
      return `<p>Tu choisis les pierres qui disparaissent profondément dans la paroi.</p>
        <p>À ton deuxième appui, une fissure s'ouvre sous ta botte. La dalle craque et son bord extérieur se détache dans le vide.</p>
        <p>Ton cœur se serre, mais la partie engagée dans la roche ne bouge pas.</p>
        <p>Tu continues au plus près du mur. Les pierres s'effritent encore sous tes pieds, sans jamais céder complètement. Tu atteins l'autre côté.</p>`;
    }

    if (f.observationChoice === 'dust') {
      return `<p>Tu choisis les grandes dalles couvertes de poussière intacte.</p>
        <p>Le premier pas soulève un nuage gris. La pierre reste parfaitement immobile.</p>
        <p>Tu avances vers la suivante. Les larges blocs qui les soutiennent encaissent ton poids sans vibrer.</p>
        <p>Quelques secondes plus tard, tu poses le pied sur la roche ferme de l'autre côté du gouffre.</p>`;
    }

    if (f.observationChoice === 'traces') {
      if (!f.fallDie) {
        return `<p>Tu suis les marques claires. Quelque chose est déjà passé par ici : tu décides de faire confiance à cette piste.</p>
          <p>Au premier appui, la dalle glisse brutalement sous ton poids.</p>
          <p>Tu comprends trop tard ce que tu avais pris pour des traces de passage. <strong>Ce n'étaient pas des pas : c'était la pierre elle-même qui frottait sur le métal en se déplaçant.</strong></p>
          <p>Tu bascules contre les blocs coupants et t'agrippes désespérément à tout ce que tes mains rencontrent.</p>
          <p>La chute va te coûter cher.</p>`;
      }

      const lost = f.lostItemName
        ? `<p>Dans ta chute, <strong>${f.lostItemName}</strong> accroche une arête. Tu n'as pas le temps de le retenir : il se détache et disparaît dans le gouffre.</p>`
        : '';
      return `<p>Tu suis les marques claires. Quelque chose est déjà passé par ici : tu décides de faire confiance à cette piste.</p>
        <p>Au premier appui, la dalle glisse brutalement sous ton poids.</p>
        <p>Tu comprends trop tard ce que tu avais pris pour des traces de passage. <strong>Ce n'étaient pas des pas : c'était la pierre elle-même qui frottait sur le métal en se déplaçant.</strong></p>
        <p>Tu bascules contre les blocs coupants et t'agrippes désespérément à tout ce que tes mains rencontrent.</p>
        <div class="dice-result"><p class="roll-number">Dégâts de la chute</p><div class="dice-faces"><strong>${f.fallDie}</strong></div><p><strong>−${f.fallHpLost} Vie.</strong></p></div>
        ${lost}
        <p>Tu parviens finalement à te hisser de l'autre côté, couvert de poussière et de sang.</p>`;
    }

    return '<p>Tu retrouves la roche ferme de l’autre côté du gouffre.</p>';
  };

  STORY.c171.choices = state => {
    const f = flow(state);
    if (state.hp <= 0) return deathChoices(state);
    if (f.observationChoice === 'traces' && !f.fallDie) {
      return [{ label: 'Lancer le dé', stay: true, effect: resolveTraceFall }];
    }
    return [{ label: 'Poursuivre dans la galerie', to: nextNode() }];
  };

  STORY.c169.__slabFixesV2 = true;
})();