/* TEST — retire uniquement les outils d'inventaire réservés à la version DEV.
   Les fonctions joueur (équipement réel, potions, choix du deuxième dé de combat) restent intactes. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const inventory = book?.inventory;
  if (!inventory || inventory.__testRuntimeCleanup) return;

  const previousExtraHtml = typeof inventory.extraHtml === 'function'
    ? inventory.extraHtml.bind(inventory)
    : null;

  inventory.extraHtml = state => {
    const html = previousExtraHtml ? String(previousExtraHtml(state) || '') : '';
    if (!html || !html.includes('test-inventory-panel')) return html;

    const template = document.createElement('template');
    template.innerHTML = html;
    template.content.querySelectorAll('.test-inventory-panel').forEach(node => node.remove());
    return template.innerHTML;
  };

  inventory.__testRuntimeCleanup = true;
})();
