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
      gap:6px!important;
    }
    #modal[data-panel="inventory"] .combat-die-select{
      min-height:48px!important;
      padding:4px 10px!important;
      grid-template-columns:42px 1fr!important;
      gap:8px!important;
    }

    /* Même dé que dans les règles, mais affiché plus petit uniquement dans le sélecteur. */
    #modal[data-panel="inventory"] .combat-die-select-visual .die-visual{
      width:38px!important;
      height:38px!important;
      min-width:38px!important;
      min-height:38px!important;
      padding:4px!important;
      box-sizing:border-box!important;
    }
    #modal[data-panel="inventory"] .combat-die-select-visual .die-cell i{
      width:5px!important;
      height:5px!important;
    }
    #modal[data-panel="inventory"] .combat-die-select-visual .combat-die-skull b{
      font-size:1.35rem!important;
    }

    #modal[data-panel="inventory"] .combat-die-select-copy strong{
      line-height:1.05!important;
    }
    #modal[data-panel="inventory"] .combat-die-select-copy small{
      margin-top:1px!important;
      line-height:1.1!important;
    }
    #modal[data-panel="inventory"] .combat-die-current{
      margin-top:7px!important;
    }
  `;
  document.head.appendChild(style);
})();
