/* Livre 01 — nom joueur du dé noir : Dé offensif. L'identifiant interne "reaper" reste inchangé pour préserver les sauvegardes. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const STORY = book?.story;
  const inventory = book?.inventory;
  if (!book || !STORY || !inventory) return;

  function rename(html) {
    return String(html || '')
      .replace(/Dé de la Faucheuse/g, 'Dé offensif')
      .replace(/Faucheuse/g, 'Offensif');
  }

  const previousExtraHtml = typeof inventory.extraHtml === 'function' ? inventory.extraHtml.bind(inventory) : null;
  if (previousExtraHtml) inventory.extraHtml = state => rename(previousExtraHtml(state));

  for (const scene of Object.values(STORY)) {
    if (!scene) continue;
    if (typeof scene.text === 'function') {
      const previousText = scene.text;
      scene.text = state => rename(previousText(state));
    } else if (typeof scene.text === 'string') {
      scene.text = rename(scene.text);
    }
  }
})();
