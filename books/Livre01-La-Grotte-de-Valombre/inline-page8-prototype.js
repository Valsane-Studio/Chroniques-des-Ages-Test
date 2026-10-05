/* DEV — Page 008 : les issues deviennent interactives exactement au moment où le récit les décrit. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const scene = book?.story?.c8;
  if (!scene || scene.__interactiveInkPage8) return;

  const originalText = scene.text;

  scene.text = state => {
    let html = typeof originalText === 'function' ? originalText(state) : originalText;
    if (!html) return html;

    html = html.replace(
      '<p>Un homme est étendu dans l’herbe.</p>',
      '<p><span class="inline-story-choice inline-story-choice-in-text inline-story-pill" data-choice-index="0" role="button" tabindex="0">Un homme est étendu dans l’herbe</span>.</p>'
    );

    html = html.replace(
      '<p>Le sentier principal continue de monter vers la montagne et l’entrée des grottes.</p>',
      '<p><span class="inline-story-choice inline-story-choice-in-text inline-story-pill" data-choice-index="1" role="button" tabindex="0">Le sentier principal continue de monter vers la montagne et l’entrée des grottes</span>.</p>'
    );

    html = html.replace(
      '<p>L’autre chemin descend vers la forêt.</p>',
      '<p><span class="inline-story-choice inline-story-choice-in-text inline-story-pill" data-choice-index="2" role="button" tabindex="0">L’autre chemin descend vers la forêt</span>.</p>'
    );

    return html;
  };

  scene.__interactiveInkPage8 = true;
})();
