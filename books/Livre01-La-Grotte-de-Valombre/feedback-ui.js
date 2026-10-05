/* Livre 01 — retours testeurs : tests de Dextérité, inventaire, potions de guérison. */
(function () {
  'use strict';

  const BOOK_ID = 'ecuyer-01';
  const book = window.BookRegistry?.get?.(BOOK_ID);
  if (!book) return;

  /* ---------------------------------------------------------
     1) Toutes les potions de guérison identiques sont affichées
        comme une seule pile, sans modifier les sauvegardes.
     --------------------------------------------------------- */
  const HEALING_POTION_IDS = ['potion_guerison', 'potion_corniche', 'potion_femme'];
  const inventory = book.inventory;

  if (inventory) {
    const originalDisplayEntries = typeof inventory.displayEntries === 'function'
      ? inventory.displayEntries.bind(inventory)
      : state => Object.entries(state.inventory || {});
    const originalActionHtml = typeof inventory.actionHtml === 'function'
      ? inventory.actionHtml.bind(inventory)
      : () => '';
    const originalHandleAction = typeof inventory.handleAction === 'function'
      ? inventory.handleAction.bind(inventory)
      : null;

    const owns = (state, id) => !!state?.inventory && Object.prototype.hasOwnProperty.call(state.inventory, id);
    const itemQuantity = item => {
      const q = Number(item?.quantity);
      return Number.isFinite(q) && q > 0 ? Math.floor(q) : 1;
    };

    inventory.displayEntries = function displayEntriesWithHealingStack(state) {
      const entries = originalDisplayEntries(state);
      const ownedIds = HEALING_POTION_IDS.filter(id => owns(state, id));
      if (!ownedIds.length) return entries;

      const firstPotionIndex = entries.findIndex(([id]) => HEALING_POTION_IDS.includes(id));
      const filtered = entries.filter(([id]) => !HEALING_POTION_IDS.includes(id));
      const quantity = ownedIds.reduce((total, id) => total + itemQuantity(state.inventory[id]), 0);
      const insertAt = firstPotionIndex < 0 ? filtered.length : Math.min(firstPotionIndex, filtered.length);

      filtered.splice(insertAt, 0, ['healing_potions', {
        name: quantity > 1 ? 'Potions de guérison' : 'Potion de guérison',
        quantity,
        description: 'Chaque potion restaure 1 dé de Vie. Elles sont regroupées ici quelle que soit leur provenance.'
      }]);

      return filtered;
    };

    inventory.actionHtml = function healingStackActionHtml(id, item, state) {
      if (id === 'healing_potions') {
        return `<div class="inventory-actions"><button class="inventory-action-btn" data-action="use-healing-stack" ${state.hp >= state.maxHp ? 'disabled' : ''}>Boire une potion (1 dé de Vie)</button></div>`;
      }
      return originalActionHtml(id, item, state);
    };

    inventory.handleAction = function healingStackHandleAction(action, state, api) {
      if (action === 'use-healing-stack') {
        if (state.hp >= state.maxHp) {
          api.openInventory();
          return true;
        }

        const id = HEALING_POTION_IDS.find(potionId => owns(state, potionId));
        if (!id) {
          api.openInventory();
          return true;
        }

        if (!originalHandleAction) return true;
        const mappedAction = id === 'potion_guerison'
          ? 'use-potion'
          : `use-labyrinth-heal:${id}`;
        return originalHandleAction(mappedAction, state, api);
      }

      return originalHandleAction ? originalHandleAction(action, state, api) : false;
    };
  }

  /* ---------------------------------------------------------
     2) Règle des tests de Dextérité : rappel au début du livre
        et avant chaque lancer de DEX, sans polluer les tests de Force.
     --------------------------------------------------------- */
  const DEX_RULE_HTML = 'Lance les <strong>trois dés</strong> et additionne-les. Si le total est <strong>inférieur ou égal à ta Dextérité</strong>, le test est réussi.';

  const startRules = book.story?.startRules;
  if (startRules && !startRules.__dexterityRuleAdded) {
    const originalRulesText = startRules.text;
    startRules.text = state => {
      const html = typeof originalRulesText === 'function' ? originalRulesText(state) : originalRulesText;
      if (!html || html.includes('combat-rules-title">Tests de Dextérité')) return html;
      const block = `
        <div class="combat-rules-card dexterity-rules-card">
          <div class="combat-rules-title">Tests de Dextérité</div>
          <p>${DEX_RULE_HTML}</p>
        </div>

        `;
      return html.replace('<div class="hero-weapon">', `${block}<div class="hero-weapon">`);
    };
    startRules.__dexterityRuleAdded = true;
  }

  const storyText = document.getElementById('storyText');

  function addDexterityHelp() {
    const panel = storyText?.querySelector('.dice-test-waiting');
    if (!panel || panel.querySelector('.dice-test-help')) return;

    // Un test de Force utilise le même composant visuel : ne rappeler la règle
    // de Dextérité que lorsque le panneau concerne effectivement la Dextérité.
    const panelText = panel.textContent || '';
    if (!/Dext[ée]rit[ée]/i.test(panelText)) return;

    const help = document.createElement('p');
    help.className = 'dice-test-help';
    help.innerHTML = DEX_RULE_HTML;

    const diceFaces = panel.querySelector('.dice-faces');
    if (diceFaces) panel.insertBefore(help, diceFaces);
    else panel.appendChild(help);
  }

  if (storyText) {
    new MutationObserver(addDexterityHelp).observe(storyText, { childList: true, subtree: true, characterData: true });
    addDexterityHelp();
  }

  /* ---------------------------------------------------------
     3) Inventaire : croix toujours accessible + fermeture en
        cliquant/tapant hors de la carte (et touche Échap).
     --------------------------------------------------------- */
  const modal = document.getElementById('modal');
  const closeModalBtn = document.getElementById('closeModalBtn');

  if (modal && closeModalBtn) {
    modal.addEventListener('click', event => {
      if (modal.dataset.panel === 'inventory' && event.target === modal) closeModalBtn.click();
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && modal.dataset.panel === 'inventory' && !modal.classList.contains('hidden')) {
        closeModalBtn.click();
      }
    });
  }

  const style = document.createElement('style');
  style.id = 'livre01-feedback-ui';
  style.textContent = `
    #modal[data-panel="inventory"] > .modal-card > .drawer-head {
      position: sticky;
      top: -18px;
      z-index: 25;
      margin: -18px -18px 12px;
      padding: 18px 18px 12px;
      background: #eadfbe;
      border-bottom: 1px solid rgba(97, 73, 42, .22);
    }

    #modal[data-panel="inventory"] #closeModalBtn {
      position: relative;
      z-index: 26;
    }

    .dice-test-waiting .dice-test-help {
      max-width: 520px;
      margin: 8px auto 14px;
      line-height: 1.45;
    }

    .dexterity-rules-card {
      margin-top: 14px;
    }
  `;
  document.head.appendChild(style);
})();
