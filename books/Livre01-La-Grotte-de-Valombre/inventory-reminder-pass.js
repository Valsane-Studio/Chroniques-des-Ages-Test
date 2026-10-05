/* PAGE 112 — rappeler que les préparations conservées restent utilisables depuis l'inventaire. */
(function () {
  'use strict';
  const book = window.BookRegistry?.get?.('ecuyer-01');
  const scene = book?.story?.c105;
  if (!scene || scene.__inventoryReminderV1) return;

  const previous = scene.text;
  scene.text = state => {
    const html = typeof previous === 'function' ? previous(state) : previous;
    return String(html || '').replace(
      '<p>Tu reconnais enfin la fiole blanche d’Aldren et la potion sombre retrouvée sur Gaspard, si tu les as conservées.</p>',
      '<p>Tu reconnais enfin la fiole blanche d’Aldren et la potion sombre retrouvée sur Gaspard, si tu les as conservées. <strong>Tu peux les consommer à tout moment depuis ton inventaire.</strong></p>'
    );
  };

  scene.__inventoryReminderV1 = true;
})();
