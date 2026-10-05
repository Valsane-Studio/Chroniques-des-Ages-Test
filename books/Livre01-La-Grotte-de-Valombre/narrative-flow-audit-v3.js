/* DEV — Audit narratif V3.
   Règle sûre : aucun choix ne doit interrompre une scène par déduction automatique.
   Les exceptions au placement de fin sont écrites explicitement ici ou dans les
   prototypes de référence (pages 003 / 008).
*/
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  if (!book?.story) return;

  function ink(index, copy) {
    return `<span class="inline-story-choice inline-story-choice-in-text inline-story-pill narrative-audit-choice" data-choice-index="${index}" role="button" tabindex="0">${copy}</span>`;
  }

  function unwrapIndexes(html, indexes) {
    const group = indexes.join('');
    const re = new RegExp(`<span[^>]*data-choice-index="[${group}]"[^>]*>(.*?)<\\/span>`, 'g');
    return html.replace(re, '$1');
  }

  function patch(id, transform) {
    const scene = book.story[id];
    if (!scene || scene.__narrativeAuditV3) return;
    const previous = scene.text;
    scene.text = state => {
      const html = typeof previous === 'function' ? previous(state) : previous;
      return html ? transform(String(html), state, scene) : html;
    };
    scene.__narrativeAuditV3 = true;
  }

  /* PAGE 085 — référence positive : deux possibilités révélées naturellement
     au fil du récit. La fissure devient interactive lorsqu'elle apparaît ; la
     sortie reste interactive dans la dernière phrase. */
  patch('c85', html => {
    html = unwrapIndexes(html, [0, 1]);
    html = html.replace(
      '<p>Une fissure étroite traverse la pierre, presque dissimulée par une armoire renversée.</p>',
      `<p>${ink(0, 'Une fissure étroite')} traverse la pierre, presque dissimulée par une armoire renversée.</p>`
    );
    return html.replace(
      '<p>L\'ouverture paraît juste assez large pour t\'y glisser de profil. La sortie des quartiers est derrière toi.</p>',
      `<p>L'ouverture paraît juste assez large pour t'y glisser de profil. ${ink(1, 'La sortie des quartiers')} est derrière toi.</p>`
    );
  });

  /* PAGE 087 — toute la menace doit être comprise AVANT que les deux réactions
     soient proposées. */
  patch('c87', html => {
    html = unwrapIndexes(html, [0, 1]);
    return html.replace(
      '<p>Tu ne sais pas s\'il cherche à t\'atteindre ou simplement à se lever.</p>',
      `<p>Tu ne sais pas s'il cherche à t'atteindre ou simplement à se lever. Tu peux ${ink(0, 'fuir par la fissure')} ou ${ink(1, 'tenter de frapper avant qu’il se relève')}.</p>`
    );
  });
})();