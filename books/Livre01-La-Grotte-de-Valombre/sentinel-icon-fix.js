/* DEV — Sentinelles noires : utiliser les vraies icônes PNG des caractéristiques. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const STORY = book?.story;
  if (!book || !STORY) return;

  function replaceSentinelIcons(html) {
    return String(html || '')
      .replace(/<span class="enemy-icon">♥<\/span><span>Sentinelle 1<\/span>/g,
        '<span class="enemy-icon icon-jpg icon-vie" aria-hidden="true"></span><span>Sentinelle 1</span>')
      .replace(/<span class="enemy-icon">♥<\/span><span>Sentinelle 2<\/span>/g,
        '<span class="enemy-icon icon-jpg icon-vie" aria-hidden="true"></span><span>Sentinelle 2</span>')
      .replace(/<span class="enemy-icon">◆<\/span><span>Dextérité<\/span>/g,
        '<span class="enemy-icon icon-jpg icon-dexterite" aria-hidden="true"></span><span>Dextérité</span>')
      .replace(/<span class="enemy-icon">⚔<\/span><span>Force<\/span>/g,
        '<span class="enemy-icon icon-jpg icon-force" aria-hidden="true"></span><span>Force</span>')
      .replace(/<span class="enemy-icon">✦<\/span><span>Dégâts<\/span>/g,
        '<span class="enemy-icon icon-jpg icon-arme" aria-hidden="true"></span><span>Dégâts</span>');
  }

  ['c79','c80','c132','c133','c134','c135'].forEach(id => {
    const scene = STORY[id];
    if (!scene || scene.__sentinelPngIconsV1) return;
    if (typeof scene.text === 'function') {
      const oldText = scene.text;
      scene.text = state => replaceSentinelIcons(oldText(state));
    } else if (typeof scene.text === 'string') {
      scene.text = replaceSentinelIcons(scene.text);
    }
    scene.__sentinelPngIconsV1 = true;
  });
})();
