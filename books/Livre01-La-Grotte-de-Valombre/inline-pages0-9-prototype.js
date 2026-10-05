/* DEV — Pages 000 à 009 : chaque choix narratif est intégré directement dans la prose. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  if (!book) return;

  function choicesFor(scene, state) {
    return typeof scene?.choices === 'function' ? scene.choices(state) : (scene?.choices || []);
  }

  function indexFor(scene, state, labels) {
    const wanted = Array.isArray(labels) ? labels : [labels];
    return choicesFor(scene, state).findIndex(choice => wanted.includes(choice?.label));
  }

  function ink(scene, state, labels, copy) {
    const index = indexFor(scene, state, labels);
    if (index < 0) return '';
    return `<span class="inline-story-choice inline-story-choice-in-text inline-story-pill" data-choice-index="${index}" role="button" tabindex="0">${copy}</span>`;
  }

  function wrap(id, transform) {
    const scene = book.story?.[id];
    if (!scene || scene.__integratedChoices09) return;
    const originalText = scene.text;
    scene.text = state => {
      const html = typeof originalText === 'function' ? originalText(state) : originalText;
      return html ? transform(html, state, scene) : html;
    };
    scene.__integratedChoices09 = true;
  }

  wrap('c0', (html, state, scene) => {
    const go = ink(scene, state, 'Rejoindre les écuries', 'tu rejoins aussitôt les écuries');
    if (!go) return html;
    return html.replace(
      '<p>Ce matin, des sabots résonnent soudain au bout de la rue.</p>',
      `<p>Ce matin, des sabots résonnent soudain au bout de la rue. Sans attendre, ${go}.</p>`
    );
  });

  wrap('c1', (html, state, scene) => {
    const bag = ink(scene, state, 'Fouiller la sacoche de Sir Aldren', 'la sacoche maculée de sang');
    const village = ink(scene, state, 'Aller au village demander de l’aide', 'retourner sur la place pour demander de l’aide');
    const cave = ink(scene, state, 'Partir immédiatement vers la grotte', 'le chemin qui mène directement vers la grotte');

    if (bag) {
      html = html.replace(
        '<p>De l’écume couvre son poitrail. La selle est entaillée. Du sang séché macule une sacoche.</p>',
        `<p>De l’écume couvre son poitrail. La selle est entaillée. Du sang séché macule ${bag}.</p>`
      );
    }
    if (cave) {
      html = html.replace(
        '<p>Tu regardes le chemin qui mène hors du village.</p>',
        `<p>Tu regardes ${cave}.</p>`
      );
    }
    if (village) {
      html = html.replace(
        '<p><strong>Tu vas retrouver Aldren.</strong></p>',
        `<p><strong>Tu vas retrouver Aldren.</strong> Avant de quitter Valombre, ${village} reste encore possible.</p>`
      );
    }
    return html;
  });

  wrap('c2', (html, state, scene) => {
    const vial = ink(scene, state, 'Prendre la fiole', 'la prendre avec toi');
    const village = ink(scene, state, 'Aller au village', 'les rues de Valombre');
    const cave = ink(scene, state, 'Partir vers la grotte', 'le chemin qui monte vers la grotte');

    if (vial) {
      html = html.replace(
        '<p>La fiole blanche reste dans la sacoche. Tu ignores encore à quoi elle sert.</p>',
        `<p>La fiole blanche reste dans la sacoche. ${vial} serait peut-être prudent, même si tu ignores encore à quoi elle sert.</p>`
      );
    }

    if (village || cave) {
      html += `<p>Lorsque tu refermes la sacoche, ${village || 'le village'} sont encore tout proches derrière toi, tandis que ${cave || 'la route de la grotte'} s’élève déjà vers les collines.</p>`;
    }
    return html;
  });

  /* c3 possède déjà sa réécriture spécifique : les actions sont dispersées dans la description de la place. */

  wrap('c4', (html, state, scene) => {
    const buy = ink(scene, state, 'Acheter la potion de guérison', 'l’acheter');
    const leave = ink(scene, state, 'Ne rien acheter et repartir', 'repartir sans rien acheter');
    const back = ink(scene, state, 'Retourner sur la place', 'tu retournes sur la place');

    if (buy || leave) {
      html += `<p>La fiole reste posée entre vous. ${buy ? `Les trois pièces d’Aldren suffisent pour ${buy}` : ''}${buy && leave ? '. Pourtant, rien ne t’oblige à dépenser cet argent : ' : ''}${leave || ''}.</p>`;
    } else if (back) {
      html += `<p>Le marchand n’a plus rien à ajouter. ${back}.</p>`;
    }
    return html;
  });

  wrap('c5', (html, state, scene) => {
    const heavy = ink(scene, state,
      ['Choisir l’épée lourde de Sir Aldren', 'Garder l’épée lourde de Sir Aldren'],
      'Épée lourde de Sir Aldren');
    const light = ink(scene, state,
      ['Choisir l’épée de la forgeronne', 'Accepter l’échange'],
      'Épée de la forgeronne');

    if (heavy) html = html.replace(/<strong>Épée lourde de Sir Aldren<\/strong>/g, heavy);
    if (light) html = html.replace(/<strong>Épée de la forgeronne<\/strong>/g, light);
    return html;
  });

  wrap('c6', (html, state, scene) => {
    const closer = ink(scene, state, 'S’approcher encore davantage', 'faire encore quelques pas vers elle');
    const back = ink(scene, state, 'Repartir vers la place', 'revenir vers la place');
    if (!closer && !back) return html;
    return html.replace(
      '<p><strong>Du soufre.</strong></p>',
      `<p><strong>Du soufre.</strong> ${closer ? `${closer} te rapprocherait de la silhouette` : ''}${closer && back ? ' ; ' : ''}${back ? `${back} te permettrait de t’éloigner de cette odeur` : ''}.</p>`
    );
  });

  wrap('c7', (html, state, scene) => {
    const retreat = ink(scene, state, 'Reculer lentement et retourner sur la place', 'reculer lentement vers la place');
    const leave = ink(scene, state, 'Quitter Valombre et partir vers la grotte', 'la route de la grotte qui quitte Valombre');
    if (!retreat && !leave) return html;
    return html.replace(
      '<p>Et soudain, quelque chose remue sous la peau de son cou.</p>',
      `<p>Et soudain, quelque chose remue sous la peau de son cou.</p><p>Ton premier réflexe est de ${retreat || 'reculer'}. Pourtant, au bout de la rue, ${leave || 'la route de la grotte'} reste ouverte.</p>`
    );
  });

  /* c8 possède déjà sa réécriture spécifique : corps, grotte et forêt sont cliquables là où ils sont décrits. */

  wrap('c9', (html, state, scene) => {
    const inspect = ink(scene, state, 'T’approcher encore et l’examiner', 'vérifier s’il respire encore');
    const cave = ink(scene, state, 'T’éloigner et continuer vers la grotte', 'le sentier principal qui continue vers la grotte');
    const forest = ink(scene, state, 'Partir vers la forêt', 'l’autre branche qui descend vers la forêt');

    if (cave || forest) {
      html = html.replace(
        '<p>Tu t’approches lentement.</p>',
        `<p>Tu t’approches lentement. Derrière toi, ${cave || 'le sentier principal'} poursuit son ascension, tandis que ${forest || 'l’autre branche'} s’enfonce entre les arbres.</p>`
      );
    }

    if (inspect) {
      html = html.replace(
        '<p>Tu ne saurais dire pourquoi, mais tu as soudain la certitude désagréable que <strong>Gaspard Vellin n’est peut-être pas mort</strong>.</p>',
        `<p>Tu ne saurais dire pourquoi, mais tu as soudain la certitude désagréable que <strong>Gaspard Vellin n’est peut-être pas mort</strong>. ${inspect} devient presque une nécessité.</p>`
      );
    }
    return html;
  });
})();
