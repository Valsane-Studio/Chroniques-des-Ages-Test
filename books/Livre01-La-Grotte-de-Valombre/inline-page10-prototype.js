/* DEV — Page 010 : les deux réactions sont intégrées aux dernières phrases du récit. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const scene = book?.story?.c10;
  if (!scene || scene.__interactiveInkPage10) return;

  const originalText = scene.text;

  scene.text = state => {
    let html = typeof originalText === 'function' ? originalText(state) : originalText;
    if (!html) return html;

    return html.replace(
      '<p>Sa bouche s’entrouvre.</p>\n\n      <p>La terre noire craque entre ses dents.</p>',
      `<p>Sa bouche s’entrouvre.</p>

      <p>La terre noire craque entre ses dents. Instinctivement, tu resserres la main sur ton épée, prêt à <span class="inline-story-choice inline-story-choice-in-text inline-story-pill" data-choice-index="0" role="button" tabindex="0">lui asséner un coup de pommeau</span>. Mais quelque chose dans son regard te retient encore : <span class="inline-story-choice inline-story-choice-in-text inline-story-pill" data-choice-index="1" role="button" tabindex="0">essayer de lui parler</span> pourrait être ta dernière chance de comprendre ce qui lui arrive.</p>`
    );
  };

  scene.__interactiveInkPage10 = true;
})();
