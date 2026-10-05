/* DEV — Page 016 : formulation plus naturelle du choix entre dire la vérité et se taire. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const scene = book?.story?.c16;
  if (!scene || scene.__interactiveInkPage16Wording) return;

  const originalText = scene.text;
  scene.text = state => {
    let html = typeof originalText === 'function' ? originalText(state) : originalText;
    if (!html) return html;

    return html.replace(
      /<p>Le nom de Gaspard reste suspendu entre vous\.[\s\S]*?<\/p>/,
      '<p>Le nom de Gaspard reste suspendu entre vous. Tu peux <span class="inline-story-choice inline-story-choice-in-text inline-story-pill" data-choice-index="0" role="button" tabindex="0">lui annoncer ce que tu as trouvé sur le chemin</span>, au risque de l’accabler davantage, ou <span class="inline-story-choice inline-story-choice-in-text inline-story-pill" data-choice-index="1" role="button" tabindex="0">garder le silence</span> et préserver encore un instant son ignorance.</p>'
    );
  };

  scene.__interactiveInkPage16Wording = true;
})();
