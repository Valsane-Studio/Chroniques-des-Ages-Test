/* Livre 01 — pages 185–188 : arche, poursuivant et traversée des dalles. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const STORY = book?.story;
  const rules = book?.rules;
  if (!STORY || !rules || !STORY.c168 || !STORY.c169 || !STORY.c170 || !STORY.c171) return;
  if (STORY.c168.__slabChoiceV1) return;

  const oldFatalSource = STORY.c171.choices;
  const FLOW_KEY = 'labyrinthSlabSequenceV1';

  function d6() {
    try {
      const a = new Uint32Array(1);
      crypto.getRandomValues(a);
      return (a[0] % 6) + 1;
    } catch (_) {
      return Math.floor(Math.random() * 6) + 1;
    }
  }

  function d3() {
    return Math.ceil(d6() / 2);
  }

  function ensureFlags(state) {
    if (!state.flags || typeof state.flags !== 'object') state.flags = {};
    return state.flags;
  }

  function flow(state) {
    const flags = ensureFlags(state);
    if (!flags[FLOW_KEY] || typeof flags[FLOW_KEY] !== 'object') flags[FLOW_KEY] = { version: 1 };
    return flags[FLOW_KEY];
  }

  function resetFlow(state) {
    ensureFlags(state)[FLOW_KEY] = { version: 1 };
  }

  function nextNode(state) {
    return state.flags?.labyrinthWomanGiftTaken ? 'c179' : 'c172';
  }

  function hasItem(state, id) {
    return !!(state.inventory && state.inventory[id]);
  }

  function removeItem(state, id) {
    if (state.inventory && state.inventory[id]) delete state.inventory[id];
  }

  function hasShield(state) {
    return hasItem(state, 'bouclier_chevalier');
  }

  function abandonShield(state) {
    const f = flow(state);
    removeItem(state, 'bouclier_chevalier');
    if (state.protectionItems && state.protectionItems.bouclier_chevalier) {
      delete state.protectionItems.bouclier_chevalier;
    }
    f.shieldAbandoned = true;
    f.archPassed = true;
  }

  function loseHpDirect(state, amount) {
    const loss = Math.max(0, Math.floor(Number(amount) || 0));
    const before = Number(state.hp || 0);
    state.hp = Math.max(0, before - loss);
    return before - state.hp;
  }

  function dexRoll(state) {
    const dice = [d6(), d6(), d6()];
    const total = dice.reduce((a, b) => a + b, 0);
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
      if (Array.isArray(choices) && choices.length) return choices;
    } catch (_) {}
    return [{ label: 'Recommencer depuis le début', action: 'restart' }];
  }

  function contaminationCritical(state) {
    return Number(state.contamination || 0) >= 13 || !!state.flags?.blackEarthTransformed;
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

  function rushAcross(state) {
    const f = flow(state);
    if (f.rushRoll) return;
    f.route = 'rush';
    f.rushRoll = dexRoll(state);
    if (!f.rushRoll.success) f.rushHpLost = loseHpDirect(state, 1);
  }

  function fightMonster(state, method) {
    const f = flow(state);
    if (f.monsterDead) return;
    f.stage = 'after-combat';
    f.monsterDead = true;
    f.combatMethod = method;

    if (method === 'edge') {
      f.edgeRoll = dexRoll(state);
      if (!f.edgeRoll.success) {
        rules.raiseContamination(state, 3);
        f.contaminationGained = 3;
      }
    } else if (method === 'power') {
      rules.raiseContamination(state, 3);
      f.contaminationGained = 3;
    }
  }

  function loseBrassardIfPresent(state) {
    const f = flow(state);
    if (!hasItem(state, 'brassard_veilleurs')) return null;
    removeItem(state, 'brassard_veilleurs');
    f.lostItem = 'brassard_veilleurs';
    f.lostItemName = 'Brassard des Veilleurs';
    return f.lostItemName;
  }

  function chooseObservedRoute(state, choice) {
    const f = flow(state);
    if (f.observationChoice) return;
    f.observationChoice = choice;
    f.route = 'observed';
    if (choice === 'traces') {
      f.fallDie = d3();
      f.fallHpLost = loseHpDirect(state, f.fallDie);
      loseBrassardIfPresent(state);
    }
  }

  STORY.c168.number = 'PAGE 185';
  STORY.c168.title = '';
  STORY.c168.text = state => {
    flow(state);
    return `<p>Après deux virages, une ancienne arche effondrée barre la galerie. Sous les pierres, une ouverture à peine assez large pour ramper subsiste. À côté, une succession de dalles disjointes traverse un gouffre.</p>
      <p>Alors un bruit revient derrière toi.</p>
      <p>Un pas lourd, irrégulier. Comme une marche bancale. À chaque enjambée, quelque chose de métallique racle la pierre.</p>
      <p>Le bruit se rapproche.</p>
      <p>Tu peux tenter de ramper sous l’arche, en espérant que cette chose ne puisse pas y passer, ou sauter de dalle en dalle dans l’espoir qu’aucune ne s’effondre sous ton poids.</p>`;
  };
  STORY.c168.choices = [
    { label: 'Ramper sous l’arche effondrée', to: 'c169', effect: state => { flow(state).route = 'arch'; } },
    { label: 'Tenter le passage par les dalles', to: 'c170', effect: state => { flow(state).route = 'slabs'; flow(state).stage = 'approach'; } }
  ];
  STORY.c168.onEnter = state => resetFlow(state);
  STORY.c168.__slabChoiceV1 = true;

  STORY.c169.number = 'PAGE 186';
  STORY.c169.title = '';
  STORY.c169.noImage = true;
  STORY.c169.text = state => {
    const f = flow(state);
    if (f.archPassed) {
      if (f.shieldAbandoned) {
        return `<p>Tu poses le bouclier contre la roche et t’allonges aussitôt dans l’ouverture.</p>
          <p>Tu avances sur les coudes. Derrière toi, le pas bancal se rapproche encore. Le métal racle la pierre, puis un choc brutal résonne contre l’arche.</p>
          <p>Tu te forces à ne pas regarder en arrière. Quelques mètres plus loin, le passage s’élargit enfin.</p>
          <p>Un second choc secoue les blocs derrière toi, mais rien ne passe. <strong>Le bouclier est resté de l’autre côté.</strong></p>`;
      }
      return `<p>Tu te glisses sous l’arche et avances lentement sur les coudes.</p>
        <p>Tu es heureusement équipé assez légèrement : rien ne se coince dans l’étroiture. Sans cela, il aurait fallu faire demi-tour.</p>
        <p>Le bruit métallique se rapproche jusqu’à résonner juste derrière les pierres. Un choc fait tomber de la poussière sur ton dos.</p>
        <p>Tu continues sans t’arrêter. Lorsque tu atteins enfin l’autre côté, un second choc retentit derrière toi. La chose est trop massive pour te suivre.</p>`;
    }

    if (hasShield(state)) {
      return `<p>Tu t’engages sous l’arche, mais le passage se resserre presque aussitôt.</p>
        <p>Le bord de ton bouclier accroche la pierre. Tu essaies de le tourner, puis de le pousser devant toi : impossible. Il ne passera pas.</p>
        <p>Derrière toi, le pas irrégulier est maintenant beaucoup plus proche. Le raclement du métal ne s’interrompt plus que quelques secondes entre chaque enjambée.</p>
        <p>Si tu veux continuer sous l’arche, tu dois abandonner ton bouclier. Sinon, il faut faire demi-tour.</p>`;
    }

    return `<p>Tu t’allonges devant l’ouverture. Elle est étroite, mais tu es équipé assez légèrement pour y passer sans difficulté.</p>
      <p>Heureusement. Avec un équipement plus encombrant, il aurait fallu faire demi-tour.</p>
      <p>Derrière toi, le bruit métallique se rapproche. Tu n’as aucune raison de rester ici plus longtemps.</p>`;
  };
  STORY.c169.choices = state => {
    const f = flow(state);
    if (state.hp <= 0) return deathChoices(state);
    if (f.archPassed) return [{ label: 'Poursuivre dans la galerie', to: nextNode(state) }];
    if (hasShield(state)) {
      return [
        { label: 'Abandonner le bouclier et continuer sous l’arche', stay: true, effect: abandonShield },
        { label: 'Garder le bouclier et faire demi-tour', to: 'c170', effect: turnBackIntoMonster }
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
        <p>La brûlure est immédiate. La terre noire se propage sous ta peau jusqu’à atteindre son seuil critique.</p>
        <p><strong>Tu ne contrôles déjà plus complètement tes mouvements.</strong></p>`;
    }

    if (f.monsterDead) {
      const combat = f.combatMethod === 'edge'
        ? (f.edgeRoll?.success
          ? `${diceHtml(f.edgeRoll, 'Épreuve de Dextérité')}
             <p>La créature se jette sur toi. Tu attends jusqu’au dernier instant, puis te déportes d’un pas et la pousses de toutes tes forces.</p>
             <p>Elle cherche un appui qui n’existe plus. Sa silhouette bascule dans le vide et disparaît. Quelques secondes plus tard, un choc sourd remonte du fond du gouffre.</p>`
          : `${diceHtml(f.edgeRoll, 'Épreuve de Dextérité')}
             <p>Tu t’écartes trop tard. La créature t’agrippe et vous vacillez tous les deux au bord du vide.</p>
             <p>Tu frappes le membre qui te retient. La lame le tranche de justesse. Le corps bascule dans le gouffre, mais la chair noire éclate contre ton bras et s’enfonce sous ta peau.</p>
             <p><strong>+3 Terre noire.</strong></p>`)
        : `<p>Tu n’essaies ni d’esquiver ni de calculer. Tu rassembles toute ta force dans un seul coup.</p>
           <p>La lame traverse la créature avec une violence telle que son sang noir asperge les pierres autour de toi. Elle s’effondre sur place.</p>
           <p>Une partie de cette matière s’est déjà glissée sous ta peau. <strong>+3 Terre noire.</strong></p>`;

      return `${combat}
        <p>Le silence revient enfin. Tu as payé ces quelques secondes, mais désormais rien ne te force à te jeter au hasard sur les dalles.</p>
        <p>Tu t’accroupis au bord du gouffre et les examines réellement.</p>
        <p>Près de la paroi, plusieurs dalles sont profondément engagées dans la roche. Elles sont fissurées et leurs bords s’effritent, mais toute leur base semble prise dans la montagne.</p>
        <p>Plus au centre, d’autres pierres sont couvertes d’une épaisse poussière intacte. Personne ne semble les avoir empruntées depuis très longtemps. Sous la poussière, leurs points d’appui sont encore visibles : de larges blocs de pierre, secs et immobiles.</p>
        <p>Enfin, une troisième ligne porte de longues marques claires. À première vue, elles ressemblent aux traces laissées par des passages répétés. Pourtant elles se prolongent jusque sur les supports métalliques, dont certaines parties ont été polies par frottement. Quelque chose est bien passé par là… ou a glissé.</p>`;
    }

    if (f.stage === 'combat') {
      if (f.cameFromArch) {
        return `<p>Tu fais demi-tour.</p>
          <p>La chose est déjà là.</p>
          <p>Mi-homme, mi-monstre, elle porte encore des morceaux d’une ancienne armure de Veilleur. Une jambe traîne derrière elle ; une plaque de métal fixée au tibia racle la pierre à chaque pas.</p>
          <p>Elle te percute avant que tu puisses reprendre complètement ta garde. <strong>−2 Vie.</strong></p>
          <p>Le gouffre est à quelques pas derrière toi. Tu n’as plus le temps d’observer les dalles.</p>`;
      }
      return `<p>Tu renonces à sauter au hasard et te retournes.</p>
        <p>La chose débouche dans la galerie. Mi-homme, mi-monstre, elle porte encore des morceaux d’une ancienne armure de Veilleur. Une jambe traîne derrière elle ; une plaque de métal fixée au tibia racle la pierre à chaque pas.</p>
        <p>Tu te places entre elle et le gouffre. Si tu veux avoir le temps d’étudier les dalles, il faut d’abord l’abattre.</p>`;
    }

    return `<p>Tu arrives au bord des premières dalles et hésites.</p>
      <p>Certaines semblent encore solides. D’autres penchent légèrement vers le vide. Il te faudrait quelques secondes pour comprendre comment elles reposent — quelques secondes que tu n’as pas.</p>
      <p>Derrière toi, le pas lourd débouche dans la galerie. Le raclement métallique est si proche que tu peux presque sentir le souffle de la créature.</p>
      <p>Tu peux foncer de dalle en dalle sans réfléchir, ou te retourner et affronter la chose pour gagner le temps nécessaire à l’observation.</p>`;
  };
  STORY.c170.choices = state => {
    const f = flow(state);
    if (state.hp <= 0) return deathChoices(state);
    if (contaminationCritical(state)) return [{ label: 'La terre noire envahit ton corps', to: 'c219' }];

    if (f.monsterDead) {
      return [
        { label: 'Suivre les dalles proches de la paroi, profondément prises dans la roche', to: 'c171', effect: s => chooseObservedRoute(s, 'wall') },
        { label: 'Choisir les dalles couvertes de poussière intacte', to: 'c171', effect: s => chooseObservedRoute(s, 'dust') },
        { label: 'Suivre les longues traces claires laissées sur les pierres', to: 'c171', effect: s => chooseObservedRoute(s, 'traces') }
      ];
    }

    if (f.stage === 'combat') {
      return [
        { label: 'Te jeter sur les dalles sans réfléchir pour lui échapper', to: 'c171', diceTest: true, effect: rushAcross },
        { label: 'Tenter de l’attirer vers le bord — test de Dextérité', stay: true, diceTest: true, effect: s => fightMonster(s, 'edge') },
        { label: 'Frapper de toutes tes forces sans réfléchir', stay: true, effect: s => fightMonster(s, 'power') }
      ];
    }

    return [
      { label: 'Foncer de dalle en dalle — test de Dextérité', to: 'c171', diceTest: true, effect: rushAcross },
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
          <p>Tu n’essaies même pas de comprendre quelles dalles sont fiables. Tu prends ton élan et cours.</p>
          <p>Une pierre s’incline sous ton premier appui, une autre se fend derrière toi, mais tu continues avant qu’elles aient le temps de céder.</p>
          <p>Tu bondis une dernière fois et roules sur la roche de l’autre côté du gouffre.</p>`;
      }
      return `${diceHtml(f.rushRoll, 'Épreuve de Dextérité')}
        <p>Tu vas trop vite. Une dalle pivote sous ton pied et ta jambe disparaît dans le vide.</p>
        <p>Tu te jettes en avant et accroches le bord d’une autre pierre. Elle t’entaille le bras tandis que tu te hisses de l’autre côté.</p>
        <p><strong>−${f.rushHpLost || 1} Vie.</strong></p>`;
    }

    if (f.observationChoice === 'wall') {
      return `<p>Tu choisis les pierres qui disparaissent profondément dans la paroi.</p>
        <p>À ton deuxième appui, une fissure s’ouvre sous ta botte. La dalle craque et son bord extérieur se détache dans le vide.</p>
        <p>Ton cœur se serre, mais la partie engagée dans la roche ne bouge pas.</p>
        <p>Tu continues au plus près du mur. Les pierres s’effritent encore sous tes pieds, sans jamais céder complètement. Tu atteins l’autre côté.</p>`;
    }

    if (f.observationChoice === 'dust') {
      return `<p>Tu choisis les grandes dalles couvertes de poussière intacte.</p>
        <p>Le premier pas soulève un nuage gris. La pierre reste parfaitement immobile.</p>
        <p>Tu avances vers la suivante. Les larges blocs qui les soutiennent encaissent ton poids sans vibrer.</p>
        <p>Quelques secondes plus tard, tu poses le pied sur la roche ferme de l’autre côté du gouffre.</p>`;
    }

    if (f.observationChoice === 'traces') {
      const lost = f.lostItemName
        ? `<p>Dans ta chute, <strong>${f.lostItemName}</strong> accroche une arête. Tu n’as pas le temps de le retenir : il se détache et disparaît dans le gouffre.</p>`
        : '';
      return `<p>Tu suis les marques claires. Quelque chose est déjà passé par ici : tu décides de faire confiance à cette piste.</p>
        <p>Au premier appui, la dalle glisse brutalement sous ton poids.</p>
        <p>Tu comprends trop tard ce que tu avais pris pour des traces de passage. <strong>Ce n’étaient pas des pas : c’était la pierre elle-même qui frottait sur le métal en se déplaçant.</strong></p>
        <p>Tu bascules contre les blocs coupants et t’agrippes désespérément à tout ce que tes mains rencontrent.</p>
        <div class="dice-result"><p class="roll-number">Dégâts de la chute</p><div class="dice-faces"><strong>${f.fallDie}</strong></div><p><strong>−${f.fallHpLost} Vie.</strong></p></div>
        ${lost}
        <p>Tu parviens finalement à te hisser de l’autre côté, couvert de poussière et de sang.</p>`;
    }

    return '<p>Tu retrouves la roche ferme de l’autre côté du gouffre.</p>';
  };
  STORY.c171.choices = state => state.hp <= 0
    ? deathChoices(state)
    : [{ label: 'Poursuivre dans la galerie', to: nextNode(state) }];

  if (book.navigationTitles) {
    book.navigationTitles.c168 = 'L’arche et les dalles';
    book.navigationTitles.c169 = 'Sous l’arche';
    book.navigationTitles.c170 = 'Le poursuivant';
    book.navigationTitles.c171 = 'Le passage du gouffre';
  }
})();
