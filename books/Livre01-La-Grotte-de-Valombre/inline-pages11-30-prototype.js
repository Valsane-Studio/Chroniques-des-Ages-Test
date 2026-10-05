/* DEV — Pages 011 à 030 : les choix narratifs existent directement dans la prose. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  if (!book) return;

  function choicesFor(scene, state) {
    return typeof scene?.choices === 'function' ? scene.choices(state) : (scene?.choices || []);
  }

  function indexFor(scene, state, matcher) {
    const list = choicesFor(scene, state);
    if (typeof matcher === 'function') return list.findIndex(matcher);
    const labels = Array.isArray(matcher) ? matcher : [matcher];
    return list.findIndex(choice => labels.includes(choice?.label));
  }

  function ink(scene, state, matcher, copy) {
    const index = indexFor(scene, state, matcher);
    if (index < 0) return '';
    return `<span class="inline-story-choice inline-story-choice-in-text inline-story-pill" data-choice-index="${index}" role="button" tabindex="0">${copy}</span>`;
  }

  function wrap(id, transform) {
    const scene = book.story?.[id];
    if (!scene || scene.__integratedChoices1130) return;
    const originalText = scene.text;
    scene.text = state => {
      const html = typeof originalText === 'function' ? originalText(state) : originalText;
      return html ? transform(html, state, scene) : html;
    };
    scene.__integratedChoices1130 = true;
  }

  /* 011 — le corps et les deux routes existent dans le décor, pas dans un menu. */
  wrap('c11', (html, state, scene) => {
    const search = ink(scene, state, 'Fouiller le corps de Gaspard Vellin', 'fouiller ses vêtements');
    const cave = ink(scene, state, 'Continuer vers la grotte', 'le sentier qui poursuit sa montée vers la grotte');
    const forest = ink(scene, state, 'Partir vers la forêt', 'les traces de bottes qui descendent vers la forêt');
    if (!search && !cave && !forest) return html;

    return html.replace(
      '<p>Il ne bouge plus.</p>',
      `<p>Il ne bouge plus.${search ? ` Son manteau s’est entrouvert dans sa chute ; ${search} permettrait peut-être de comprendre d’où il vient.` : ''}</p>
      ${(cave || forest) ? `<p>Autour de toi, ${cave || 'le sentier principal'} continue vers la montagne, tandis que ${forest || 'les traces dans la boue'} s’éloignent entre les arbres.</p>` : ''}`
    );
  });

  /* 012 — le jet de blessure reste mécanique. Une fois résolu, les suites apparaissent dans le récit. */
  wrap('c12', (html, state, scene) => {
    const search = ink(scene, state, 'Fouiller le corps', 'fouiller son manteau');
    const cave = ink(scene, state, 'Continuer vers la grotte', 'le chemin qui remonte vers la grotte');
    const forest = ink(scene, state, 'Partir vers la forêt', 'les traces qui partent vers la forêt');
    if (!search && !cave && !forest) return html;

    return html.replace(
      '<p>tu ne vois plus rien qui ressemble encore à de la vie.</p>',
      `<p>tu ne vois plus rien qui ressemble encore à de la vie.${search ? ` Dans sa chute, son manteau s’est ouvert ; ${search} pourrait encore t’apprendre quelque chose.` : ''}</p>
      ${(cave || forest) ? `<p>Au-delà du corps, ${cave || 'le sentier principal'} reste visible. Plus bas, ${forest || 'les traces dans la boue'} disparaissent sous les arbres.</p>` : ''}`
    );
  });

  /* 013 — les deux directions sont replacées dans le paysage au moment où l’on se redresse. */
  wrap('c13', (html, state, scene) => {
    const cave = ink(scene, state, 'Continuer vers la grotte', 'la route qui continue vers la grotte');
    const forest = ink(scene, state, 'Suivre les traces vers la forêt', 'les traces de bottes qui s’enfoncent vers la forêt');
    if (!cave && !forest) return html;

    return html.replace(
      '<p>Tu ranges néanmoins la fiole.</p>',
      `<p>Tu ranges néanmoins la fiole. En te redressant, ${cave || 'la route de la grotte'} se poursuit devant toi, tandis que ${forest || 'les traces'} quittent le chemin et descendent entre les arbres.</p>`
    );
  });

  /* 014 — entrer dans Rochebrume devient le mouvement naturel de la phrase. */
  wrap('c14', (html, state, scene) => {
    const enter = ink(scene, state, 'Entrer dans Rochebrume', 'tu atteins les premières maisons de Rochebrume');
    if (!enter) return html;
    return html.replace(
      '<p>Quelques minutes plus tard, les premières maisons de Rochebrume apparaissent enfin entre les troncs.</p>',
      `<p>Quelques minutes plus tard, ${enter}, qui apparaissent enfin entre les troncs.</p>`
    );
  });

  /* 015 — la taverne, l’étranger et la route sont cliquables là où le village les montre. */
  wrap('c15', (html, state, scene) => {
    const tavern = ink(scene, state, 'Entrer dans la taverne de Gaspard', 'la taverne de Gaspard Vellin est encore ouverte');
    const stranger = ink(scene, state, 'Parler à la personne dans la rue', 'une personne se tient seule au milieu de la rue');
    const cave = ink(scene, state, 'Quitter Rochebrume et repartir vers la grotte', 'la route qui quitte Rochebrume et remonte vers la grotte');

    if (tavern) {
      html = html.replace('<p>La taverne de Gaspard Vellin est encore ouverte.</p>', `<p>${tavern}.</p>`);
    }
    if (stranger) {
      html = html
        .replace('<p>Et plus loin, une personne se tient seule au milieu de la rue.</p>', `<p>Et plus loin, ${stranger}.</p>`)
        .replace('<p>Tu as déjà parlé à Élias. Plus loin, la personne aperçue dans la rue est encore là.</p>', `<p>Tu as déjà parlé à Élias. Plus loin, ${stranger}.</p>`);
    }
    if (cave) html += `<p>Au-delà des dernières maisons, ${cave}.</p>`;
    return html;
  });

  /* 016 — dire la vérité ou se taire est contenu dans la tension de la conversation. */
  wrap('c16', (html, state, scene) => {
    const tell = ink(scene, state, 'Lui annoncer que Gaspard est mort', 'lui annoncer ce que tu as trouvé sur le chemin');
    const silence = ink(scene, state, 'Ne rien lui dire', 'garder le silence');
    if (!tell && !silence) return html;

    const anchor = '<blockquote>« Avec lui, ça ne veut pas forcément dire grand-chose. Quand il trouve quelqu’un avec qui boire, il oublie parfois jusqu’au chemin de sa propre maison. »</blockquote>';
    return html.replace(
      anchor,
      `${anchor}<p>Le nom de Gaspard reste suspendu entre vous. ${tell ? `${tell} te serre la gorge.` : ''}${tell && silence ? ' ' : ''}${silence ? `${silence} laisse encore son sourire intact.` : ''}</p>`
    );
  });

  /* 017 — la sortie de la taverne se prolonge immédiatement vers les deux lieux accessibles. */
  wrap('c17', (html, state, scene) => {
    const street = ink(scene, state, 'Retourner dans la rue', 'la rue déserte de Rochebrume');
    const cave = ink(scene, state, 'Quitter Rochebrume et repartir vers la grotte', 'la route qui repart vers la grotte');
    if (!street && !cave) return html;

    return html.replace(
      '<p>Il refuse désormais de répondre.</p>',
      `<p>Il refuse désormais de répondre.</p><p>La porte s’ouvre sur ${street || 'la rue déserte'}. Au-delà des maisons, ${cave || 'la route de la grotte'} reprend son ascension.</p>`
    );
  });

  /* 018 — les quantités de lames sont dans la scène du comptoir ; les deux sorties restent dans le décor. */
  wrap('c18', (html, state, scene) => {
    const one = ink(scene, state, choice => /^Acheter 1 lame de jet\b/.test(choice?.label || ''), 'en prendre une');
    const two = ink(scene, state, choice => /^Acheter 2 lames de jet\b/.test(choice?.label || ''), 'en prendre deux');
    const three = ink(scene, state, choice => /^Acheter 3 lames de jet\b/.test(choice?.label || ''), 'prendre les trois');
    const street = ink(scene, state, ['Ne rien acheter et retourner dans la rue', 'Retourner dans la rue'], 'la rue de Rochebrume');
    const cave = ink(scene, state, ['Ne rien acheter et repartir vers la grotte', 'Repartir vers la grotte'], 'la route qui remonte vers la grotte');

    const buys = [one, two, three].filter(Boolean);
    if (buys.length) {
      const pieces = [];
      if (one) pieces.push(`${one} te coûterait une pièce d’or`);
      if (two) pieces.push(`${two} en coûteraient deux`);
      if (three) pieces.push(`${three} en coûteraient trois`);
      html += `<p>Élias laisse les lames alignées sur le comptoir. ${pieces.join(' ; ')}.</p>`;
    }

    if (street || cave) {
      html += `<p>Derrière toi, la porte donne sur ${street || 'la rue'}. Au-delà du village, ${cave || 'la route de la montagne'} reste visible.</p>`;
    }
    return html;
  });

  /* 019 — après la disparition de l’étranger, les seules directions restantes sont physiquement décrites. */
  wrap('c19', (html, state, scene) => {
    const back = ink(scene, state, 'Retourner sur la place', 'la rue qui te ramène vers le centre de Rochebrume');
    const cave = ink(scene, state, 'Repartir vers la grotte', 'la route qui repart vers la montagne et la grotte');
    if (!back && !cave) return html;

    return html.replace(
      '<p>Seulement la route vide.</p>',
      `<p>Seulement la route vide.${back ? ` D’un côté, ${back}.` : ''}${cave ? ` De l’autre, ${cave}.` : ''}</p>`
    );
  });

  /* 020 est déjà gérée par inline-choice-prototype.js. */
  /* 021 : reprise checkpoint / recommencer = contrôles système, conservés comme boutons. */

  /* 022 — le grondement transforme immédiatement le couloir et l’épée en possibilités. */
  wrap('c22', (html, state, scene) => {
    const flee = ink(scene, state, 'Retourner en arrière en courant', 'faire demi-tour et courir');
    const stand = ink(scene, state, 'Rester sur place et dégainer son épée', 'rester sur place et dégainer');
    if (!flee && !stand) return html;

    return html.replace(
      '<p>C’est alors qu’un <strong>grondement</strong> retentit sur le côté.</p>',
      `<p>C’est alors qu’un <strong>grondement</strong> retentit sur le côté. Le passage par lequel tu es venu est encore à portée : ${flee || 'faire demi-tour'} te ramènerait vers l’entrée. Ta main trouve déjà la garde de ton épée ; ${stand || 'rester ici'} signifie attendre ce qui approche.</p>`
    );
  });

  /* 023 : fin de partie, les contrôles de reprise restent des boutons. */

  /* 024 — la lame de jet et la charge naissent directement de ce que le personnage a en main. */
  wrap('c24', (html, state, scene) => {
    const blade = ink(scene, state, choice => /^Lancer une lame dans l’ombre\b/.test(choice?.label || ''), 'la lancer dans l’ombre');
    const charge = ink(scene, state, 'Te jeter en avant, l’épée levée', 'te jeter en avant, l’épée levée');
    if (!blade && !charge) return html;

    if (blade) {
      html = html.replace(
        /<p>Tu possèdes encore <strong>([^<]+)<\/strong>\.<\/p>/,
        `<p>Tu possèdes encore <strong>$1</strong>. Une lame est déjà à portée de tes doigts : ${blade} te donnerait l’initiative avant que la forme n’arrive sur toi.${charge ? ` Mais elle se rapproche assez vite pour ${charge}.` : ''}</p>`
      );
    } else if (charge) {
      html = html.replace(
        '<p>Tu n’as rien d’autre que ton épée.</p>',
        `<p>Tu n’as rien d’autre que ton épée. La masse réduit encore la distance ; il ne reste bientôt plus assez d’espace pour autre chose que ${charge}.</p>`
      );
    }
    return html;
  });

  /* 025 — la transition vers le combat est elle-même l’action cliquable. */
  wrap('c25', (html, state, scene) => {
    const fight = ink(scene, state, 'Lever ton épée et combattre', 'tu lèves ton épée et engages le combat');
    if (!fight) return html;
    return html.replace('<p>Tu lèves ton épée. Le combat va commencer.</p>', `<p>${fight}.</p>`);
  });

  /* 026 : lancer les dés / lame de jet = actions mécaniques, conservées comme boutons. */

  /* 027 — une fois la créature morte, le passage de sortie réapparaît naturellement derrière elle. */
  wrap('c27', (html, state, scene) => {
    const exit = ink(scene, state, 'Quitter la salle et poursuivre dans la grotte', 'le passage qui s’enfonce plus loin dans la grotte');
    if (!exit) return html;
    return html + `<p>Derrière la masse effondrée, ${exit} reste ouvert.</p>`;
  });

  /* 028 — le camp devient un véritable espace à lire : chaque lieu décrit est directement accessible. */
  wrap('c28', (html, state, scene) => {
    const oldCamp = ink(scene, state, 'Examiner le vieux campement', 'les restes d’un ancien campement');
    const gallery = ink(scene, state, 'Explorer la galerie condamnée', 'une galerie presque entièrement barrée par un énorme bloc de pierre');
    const tunnel = ink(scene, state, 'Explorer le tunnel voisin', 'un tunnel étroit qui s’enfonce dans l’obscurité');
    const depths = ink(scene, state, 'Quitter le camp et poursuivre vers les profondeurs', 'un passage plus sombre qui poursuit la descente');

    const anchor = '<p>La cavité se prolonge dans plusieurs directions. À quelques mètres du feu, tu distingues les restes d’un <strong>ancien campement</strong>. Sur la droite, une galerie est presque entièrement <strong>barrée par un énorme bloc de pierre</strong>. Plus loin, un <strong>tunnel étroit</strong> s’enfonce dans l’obscurité.</p>';
    if (!html.includes(anchor)) return html;

    const campCopy = oldCamp || 'les restes d’un ancien campement';
    const galleryCopy = gallery || 'une galerie presque entièrement barrée par un énorme bloc de pierre';
    const tunnelCopy = tunnel || 'un tunnel étroit qui s’enfonce dans l’obscurité';
    const depthCopy = depths || 'un passage plus sombre qui poursuit la descente';

    return html.replace(
      anchor,
      `<p>La cavité se prolonge dans plusieurs directions. À quelques mètres du feu, tu distingues ${campCopy}. Sur la droite s’ouvre ${galleryCopy}. Plus loin, ${tunnelCopy}. Derrière le feu, ${depthCopy} disparaît sous la roche.</p>`
    );
  });

  /* 029 : jet de Dextérité = mécanique, le bouton reste volontairement visible. */

  /* 030 — casque et galeries sont cliquables à l’endroit où le journal te ramène dans l’espace. */
  wrap('c30', (html, state, scene) => {
    const helmet = ink(scene, state, 'Ramasser le casque cabossé (+2 Protection)', 'casque de fer cabossé');
    const gallery = ink(scene, state, 'Explorer la galerie condamnée', 'la galerie condamnée');
    const tunnel = ink(scene, state, 'Explorer le tunnel voisin', 'le tunnel voisin');
    const depths = ink(scene, state, 'Poursuivre vers les profondeurs', 'la descente vers les profondeurs');

    if (helmet) {
      html = html
        .replace('<strong>casque de fer cabossé</strong>', helmet)
        .replace('<p>Le casque cabossé repose encore près de la couverture.</p>', `<p>Près de la couverture repose encore un ${helmet}.</p>`);
    }

    if (html.includes('<p>La galerie condamnée et le tunnel voisin s’ouvrent de part et d’autre.</p>')) {
      html = html.replace(
        '<p>La galerie condamnée et le tunnel voisin s’ouvrent de part et d’autre.</p>',
        `<p>${gallery || 'La galerie condamnée'} et ${tunnel || 'le tunnel voisin'} s’ouvrent de part et d’autre.</p>`
      );

      html = html
        .replace(
          '<p>Il reste un passage que tu peux explorer avant de poursuivre la descente.</p>',
          `<p>Entre les deux, ${depths || 'la descente vers les profondeurs'} continue sous la roche.</p>`
        )
        .replace(
          '<p>Tu as terminé ton exploration des alentours. La descente se poursuit devant toi.</p>',
          `<p>${depths || 'La descente vers les profondeurs'} se poursuit devant toi.</p>`
        );
    } else if (gallery || tunnel || depths) {
      const returnToRoutes = `<p>Lorsque tu reviens vers le feu, ${gallery || 'la galerie condamnée'} s’ouvre sur la droite${tunnel ? `, tandis que ${tunnel} disparaît plus loin dans l’obscurité` : ''}. ${depths ? `${depths} continue entre les deux.` : ''}</p>`;
      html += returnToRoutes;
    }

    return html;
  });
})();
