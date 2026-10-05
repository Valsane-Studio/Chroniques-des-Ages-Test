/* Livre 01 — inventaire : sélecteur de dés plus compact.
   Ne modifie pas la fenêtre « Règles des combats » ni son contenu. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const inventory = book?.inventory;
  if (!inventory) return;

  const previousExtraHtml = typeof inventory.extraHtml === 'function'
    ? inventory.extraHtml.bind(inventory)
    : null;

  if (previousExtraHtml) {
    inventory.extraHtml = state => {
      const template = document.createElement('template');
      template.innerHTML = String(previousExtraHtml(state) || '');
      const card = template.content.querySelector('.combat-die-inventory-card');
      if (card) {
        Array.from(card.children).forEach(child => {
          if (child.tagName === 'P' && child.textContent.includes('Le premier dé est toujours le dé classique')) {
            child.remove();
          }
        });
      }
      return template.innerHTML;
    };
  }

  const style = document.createElement('style');
  style.textContent = `
    #modal[data-panel="inventory"] .combat-die-options{
      gap:7px!important;
    }
    #modal[data-panel="inventory"] .combat-die-select{
      min-height:58px!important;
      padding:6px 12px!important;
      grid-template-columns:48px 1fr!important;
      gap:10px!important;
    }
    #modal[data-panel="inventory"] .combat-die-select-copy small{
      margin-top:2px!important;
    }
    #modal[data-panel="inventory"] .combat-die-current{
      margin-top:8px!important;
    }
  `;
  document.head.appendChild(style);
})();
