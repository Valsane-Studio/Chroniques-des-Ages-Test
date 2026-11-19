/* Livre 01 — protection des boutons de dés contre les calques tactiles.
   Aucun lancer n'est recalculé ici : on transmet le clic au bouton du lecteur.
   Ce correctif est limité à la zone réelle des commandes de dés. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const choices = document.getElementById('choices');
  const storyText = document.getElementById('storyText');
  const stats = document.getElementById('statusTags');
  if (!book || !choices || !storyText) return;

  const ROLL_LABEL = /^(?:Jeter|Relancer|Lancer)\s+(?:les?|trois|un)\s+d[ée]s?\b/i;
  const ROLL_ANY = /^(?:Jeter|Relancer|Lancer)\b.*\bd[ée]s?\b/i;

  function isRollButton(button) {
    if (!button || !button.classList?.contains('choice-btn')) return false;
    const label = (button.querySelector('.choice-copy')?.textContent || button.textContent || '').trim();
    return ROLL_LABEL.test(label) || ROLL_ANY.test(label) ||
      button.classList.contains('combat-roll-btn') ||
      button.classList.contains('fluid-roll-control') ||
      (storyText.querySelector('.dice-test-waiting') && /d[ée]s/i.test(label));
  }

  function activeRollButtons() {
    return Array.from(choices.querySelectorAll('.choice-btn')).filter(isRollButton);
  }

  function secureHitboxes() {
    const diceButtons = activeRollButtons();
    if (!diceButtons.length) return;

    // Les caractéristiques constituent un HUD informatif fixe, jamais un contrôle.
    // Leur calque ne doit en aucun cas intercepter une action placée plus haut.
    if (stats) stats.style.setProperty('pointer-events', 'none', 'important');

    choices.style.setProperty('position', 'relative', 'important');
    choices.style.setProperty('z-index', '80', 'important');
    choices.style.setProperty('pointer-events', 'auto', 'important');
    choices.style.setProperty('touch-action', 'manipulation', 'important');

    for (const button of diceButtons) {
      button.dataset.diceHitboxGuard = '1';
      button.style.setProperty('position', 'relative', 'important');
      button.style.setProperty('z-index', '81', 'important');
      button.style.setProperty('pointer-events', 'auto', 'important');
      button.style.setProperty('touch-action', 'manipulation', 'important');
    }
  }

  const style = document.createElement('style');
  style.id = 'livre01-dice-hitbox-guard';
  style.textContent = [
    '#choices .choice-btn[data-dice-hitbox-guard="1"] {',
    '  display: block !important;',
    '  visibility: visible !important;',
    '  pointer-events: auto !important;',
    '  touch-action: manipulation !important;',
    '}',
    '#choices .choice-btn[data-dice-hitbox-guard="1"]::before,',
    '#choices .choice-btn[data-dice-hitbox-guard="1"]::after {',
    '  pointer-events: none !important;',
    '}'
  ].join('\n');
  document.head.appendChild(style);

  // Si un élément transparent est malgré tout au premier plan (WebKit/Chrome
  // mobile, anciennes surcouches), le contact dans le rectangle du bouton
  // est transmis à celui-ci. Jamais de double lancer quand il reçoit déjà le tap.
  document.addEventListener('pointerup', event => {
    if (event.isPrimary === false || (event.button !== undefined && event.button !== 0)) return;
    if (!document.body.classList.contains('library-book-open')) return;
    if (event.target?.closest?.('.choice-btn, .inline-story-choice')) return;
    if (document.querySelector('#modal:not(.hidden), #drawer:not(.hidden), #journalPanel:not(.hidden), .library-preview-backdrop:not(.hidden)')) return;

    const x = event.clientX, y = event.clientY;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    const button = activeRollButtons().find(candidate => {
      if (candidate.disabled || candidate.getAttribute('aria-disabled') === 'true') return false;
      const rect = candidate.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 &&
        x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    });
    if (!button) return;

    const hit = document.elementFromPoint(x, y);
    if (hit === button || button.contains(hit)) return;
    // Un vrai contrôle différent (menu, modale, bouton de navigation) prime.
    if (hit?.closest?.('button, a, input, textarea, select, [role="button"]')) return;

    event.preventDefault();
    event.stopPropagation();
    button.click();
  }, { capture: true, passive: false });

  const observer = new MutationObserver(secureHitboxes);
  observer.observe(choices, { childList: true, subtree: true });
  window.addEventListener('pageshow', secureHitboxes);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) secureHitboxes();
  });

  // Diagnostic consultable dans la console, sans afficher de texte au joueur.
  window.__aphanesDiceHitboxCheck = () => activeRollButtons().map(button => {
    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const top = document.elementFromPoint(x, y);
    return {
      label: (button.textContent || '').trim(),
      disabled: button.disabled,
      blocked: !!top && top !== button && !button.contains(top),
      topElement: top?.tagName || null,
      topClass: top?.className || ''
    };
  });

  secureHitboxes();
})();