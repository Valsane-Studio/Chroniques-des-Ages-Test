/* DEV — Nettoyage éditorial du récit, indépendant de la présentation des choix.
   Tous les choix sont désormais affichés dans des panneaux transparents.
   Ce fichier conserve uniquement les corrections de texte déjà validées. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  if (!book?.story) return;

  function wrap(id, transform) {
    const scene = book.story[id];
    if (!scene || scene.__narrativeFlowCleanup) return;
    const previous = scene.text;
    scene.text = state => {
      const html = typeof previous === 'function' ? previous(state) : previous;
      return html ? transform(String(html), state, scene) : html;
    };
    scene.__narrativeFlowCleanup = true;
  }

  /* PAGE 040 — supprimer l'explication de la pulsion à continuer. */
  wrap('c40', html => html.replace(
    '<p>Tu éprouves le besoin de continuer, de t’enfoncer plus profondément. Cette envie te surprend : tu étais venu pour retrouver Aldren, pas pour obéir à une direction que tu ne comprends pas.</p>',
    ''
  ));

  /* PAGE 044 — ne pas répéter le choix déjà effectué. */
  wrap('c44', html => html.replace('<p>Tu choisis l’escalier.</p>', ''));

  /* PAGE 049 — ne pas raconter la continuation avant le clic. */
  wrap('c49', html => html
    .replace('<p>Tu continues.</p>', '')
    .replace(
      '<p>Puis tu trouves une nouvelle prise et reprends l’ascension, beaucoup plus lentement.</p>',
      '<p>Puis tu trouves une nouvelle prise.</p>'
    ));

  /* PAGE 058 — commencer directement par la corniche. */
  wrap('c58', html => html
    .replace('<p>Tu choisis la corniche.</p>', '')
    .replace('<p>Elle ne fait parfois pas plus de deux pieds de large.</p>', '<p>La corniche ne fait parfois pas plus de deux pieds de large.</p>')
    .replace('<p>Tu commences la traversée.</p>', '')
  );

  /* PAGE 069 — ne pas effectuer l’action avant le choix. */
  wrap('c69', html => html.replace('<p>Tu traverses la place pour examiner ces scènes.</p>', ''));

  /* PAGE 070 — même principe. */
  wrap('c70', html => html.replace('<p>Tu avances vers la scène suivante.</p>', ''));

  /* PAGE 073 — le décor suffit, sans phrase explicative sur les accès. */
  wrap('c73', html => html.replace(/\s*Tu peux rejoindre les trois accès\.?/g, ''));

  /* PAGE 075 — ne pas entrer avant que le joueur ait cliqué. */
  wrap('c75', html => html.replace('<p>Tu entres dans le réfectoire.</p>', ''));

  /* PAGE 084 — présenter la sortie sans effectuer le déplacement. */
  wrap('c84', html => html.replace(
    '<p>Tu traverses les appartements vers la sortie.</p>',
    '<p>La galerie de sortie se trouve au bout des appartements.</p>'
  ));

  /* PAGE 113 — clarifier que les deux pièces sont des détours avant la descente. */
  wrap('c106', html => html.replace(
    '<p>Le couloir se sépare devant un escalier descendant. Une porte donne sur un poste de secours, l’autre sur une petite réserve.</p>',
    '<p>Le couloir débouche devant un escalier qui s’enfonce vers les niveaux inférieurs. Avant de descendre, deux portes s’ouvrent encore sur le côté : l’une mène à un poste de secours, l’autre à une petite réserve.</p>'
  ));

  /* Retours et continuations : ne pas raconter l’action avant le choix. */
  wrap('c118', html => html.replace('<p>Tu rejoins la place du village.</p>', ''));
  wrap('c121', html => html.replace('<p>Tu la remercies et ressors sur la place.</p>', '<p>Tu la remercies.</p>'));
  wrap('c127', html => html.replace('<p>Tu regagnes la barque.</p>', ''));

  wrap('c128', html => html.replace(
    'tu l’ajustes à ton bras avant de franchir la porte du quartier haut.',
    'tu l’ajustes à ton bras.'
  ));

  wrap('c136', html => html.replace(
    '<p>Tu enveloppes les cinq lames dans un morceau de tissu et les glisses dans ton équipement. Tu repars vers les bureaux.</p>',
    '<p>Tu enveloppes les cinq lames dans un morceau de tissu et les glisses dans ton équipement.</p>'
  ));

  wrap('c137', html => html.replace(
    '<p>Tu t’écartes et reprends le couloir vers l’arche.</p>',
    '<p>Tu t’écartes de la cellule.</p>'
  ));

  wrap('c177', html => html.replace(
    '<p>Tu reprends la galerie. Derrière toi, la flamme ne vacille pas.</p>',
    '<p>Derrière toi, la flamme ne vacille pas.</p>'
  ));

  /* PAGE 239 — formulation déjà validée, sans ajouter un choix dans le texte. */
  wrap('c239', html => html.replace(
    '<p>Alors que tu viens de blesser le deuxième chevalier, tu entends un grincement sur le côté.</p>',
    '<p>Alors que tu viens de blesser le deuxième chevalier, un grincement retentit sur le côté.</p>'
  ));
})();
