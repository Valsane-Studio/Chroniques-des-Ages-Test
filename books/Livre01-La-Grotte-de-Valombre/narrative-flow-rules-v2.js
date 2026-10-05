/* DEV — Règles éditoriales finales du flux narratif.
   Convention :
   - choix unique de continuation = fin de scène, introduit naturellement par le récit ;
   - plusieurs chemins = peuvent être intégrés au moment où ils sont décrits ;
   - objets = peuvent être pris/interrogés au moment de leur découverte ;
   - choix tactiques de combat + lancers de dés gardent leurs cadres transparents.
   Ce fichier est chargé après les prototypes précédents et a le dernier mot. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  if (!book?.story) return;

  function ink(index, copy) {
    return `<span class="inline-story-choice inline-story-choice-in-text inline-story-pill narrative-v2-choice" data-choice-index="${index}" role="button" tabindex="0">${copy}</span>`;
  }

  function patch(id, transform) {
    const scene = book.story[id];
    if (!scene || scene.__narrativeFlowV2) return;
    const previous = scene.text;
    scene.text = state => {
      const html = typeof previous === 'function' ? previous(state) : previous;
      return html ? transform(String(html), state, scene) : html;
    };
    scene.__narrativeFlowV2 = true;
  }

  /* PAGE 057 — le gantelet appartient à la découverte ; la porte introduit la suite. */
  patch('c57', html => {
    if (html.includes('Tu as déjà ajouté le gantelet à ton équipement.')) {
      html = html.replace(/\s*<span[^>]*data-choice-index="0"[^>]*>.*?<\/span>\.?/g, '');
      return html.replace(
        '<p>Tu as déjà ajouté le gantelet à ton équipement.</p>',
        `<p>Tu as déjà ajouté le gantelet à ton équipement.</p><p>Au-delà du squelette, ${ink(0, 'la porte des quartiers hauts')} ouvre sur la suite du passage.</p>`
      );
    }

    html = html.replace(/\s*<span[^>]*data-choice-index="0"[^>]*>.*?<\/span>\.?/g, '');
    html = html.replace(/\s*<span[^>]*data-choice-index="1"[^>]*>.*?<\/span>\.?/g, '');
    html = html.replace(
      '<p>Les plaques sont fines, mais intactes.</p>',
      `<p>Les plaques sont fines, mais intactes. ${ink(0, 'Tu peux prendre le gantelet')}.</p>`
    );
    return html.replace(
      '<p>Il pourrait encore encaisser un coup à ta place.</p>',
      `<p>Il pourrait encore encaisser un coup à ta place.</p><p>Tu peux aussi ${ink(1, 'le laisser et franchir la porte')}.</p>`
    );
  });

  /* PAGE 069 — la fresque n'est proposée qu'après toute la scène. */
  patch('c69', html => {
    html = html.replace(/\s*<span[^>]*data-choice-index="0"[^>]*>.*?<\/span>\.?/g, '');
    html = html.replace('<p>Tu traverses la place pour examiner ces scènes.</p>', '');
    return html.replace(
      '<p>La dernière figure visible depuis ici porte le symbole de l\'œil fermé.</p>',
      `<p>La dernière figure visible depuis ici porte le symbole de l'œil fermé.</p><p>De l'autre côté de la place, ${ink(0, 'les grandes gravures')} prolongent le récit des Veilleurs.</p>`
    );
  });

  /* PAGE 073 — le décor porte directement le choix. */
  patch('c73', html => {
    html = html.replace(/\s*<span[^>]*data-choice-index="0"[^>]*>.*?<\/span>\.?/g, '');
    return html.replace(
      '<p>Sur ta droite, un passage rejoint les anciennes salles habitées. Deux autres ouvertures s’enfoncent sous les bâtiments.</p>',
      `<p>Sur ta droite, un passage rejoint les anciennes salles habitées. Deux autres ouvertures s’enfoncent ${ink(0, 'sous les bâtiments')}.</p>`
    );
  });

  /* PAGE 078 — l'action prolonge directement la scène, sans ordre au joueur. */
  patch('c78', html => {
    html = html.replace(/\s*<span[^>]*data-choice-index="0"[^>]*>.*?<\/span>\.?/g, '');
    return html.replace(
      '<p>La poignée s\'abaisse.</p>',
      `<p>La poignée s'abaisse. ${ink(0, 'Tu dégaines et fais face')}.</p>`
    );
  });

  /* PAGE 082 — ordre narratif explicite, aucun entrecroisement automatique. */
  patch('c82', html => {
    html = html.replace(/\s*<span[^>]*data-choice-index="[01]"[^>]*>.*?<\/span>\.?/g, '');
    html = html.replace(/<p>Tu peux tenter ta chance, ou poursuivre les recherches d'Aldren\.<\/p>/, '');
    return html.replace(
      '<p>Des marques de coups autour du verrou montrent que quelqu\'un a déjà essayé de forcer l\'entrée.</p>',
      `<p>Des marques de coups autour du verrou montrent que quelqu'un a déjà essayé de forcer l'entrée.</p><p>Tu peux tenter ta chance, ou poursuivre les recherches d'Aldren. Tu peux ${ink(0, 'tenter d’enfoncer la porte')}.</p><p>Tu peux aussi ${ink(1, 'laisser la porte et gagner les appartements')}.</p>`
    );
  });

  /* PAGE 112 — sortie simple, sans phrase d'introduction artificielle. */
  patch('c105', html => `${html}<p>${ink(0, 'Quitter le registre')}.</p>`);

  /* PAGE 113 — les deux pièces sont des détours possibles avant la descente principale. */
  patch('c106', html => {
    html = html.replace(/<p>Le couloir se sépare devant .*?<\/p>/, '');
    return `<p>Le couloir débouche devant ${ink(2, 'un escalier qui s’enfonce vers les niveaux inférieurs')}. Avant de descendre, deux portes s’ouvrent encore sur le côté : l’une mène à ${ink(0, 'un poste de secours')}, l’autre à ${ink(1, 'une petite réserve')}.</p>` + html;
  });

  /* PAGE 125 — une fois le rat abattu, le sac est directement l'interaction. */
  patch('c192', html => html.replace(
    '<p>La créature s’affaisse sur le sol. Le silence revient. Quelque chose brille dans le petit sac où elle se cachait.</p>',
    `<p>La créature s’affaisse sur le sol. Le silence revient. Quelque chose brille ${ink(0, 'dans le petit sac où elle se cachait')}.</p>`
  ));
})();
