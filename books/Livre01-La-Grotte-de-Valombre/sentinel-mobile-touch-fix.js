/* Livre 01 — correctif tactile mobile pour le combat des deux sentinelles.
   Certains navigateurs mobiles peuvent conserver un bouton de combat désactivé
   après un tap interrompu ou laisser la barre de stats intercepter la zone tactile.
   Ce correctif ne s'active que sur l'écran des deux sentinelles. */
(function () {
  'use strict';

  const choices = document.getElementById('choices');
  const storyText = document.getElementById('storyText');
  const statusTags = document.getElementById('statusTags');
  if (!choices) return;

  function isSentinelScreen() {
    const text = `${storyText?.textContent || ''} ${choices.textContent || ''}`.toLowerCase();
    return text.includes('sentinelle') || text.includes('poste de garde');
  }

  function harden() {
    if (!isSentinelScreen()) return;

    if (choices.dataset.sentinelTouchLayer !== '1') {
      choices.dataset.sentinelTouchLayer = '1';
      choices.style.setProperty('position', 'relative', 'important');
      choices.style.setProperty('z-index', '60', 'important');
      choices.style.setProperty('pointer-events', 'auto', 'important');
      choices.style.setProperty('touch-action', 'manipulation', 'important');
    }

    // La barre de stats est purement informative : elle ne doit jamais intercepter
    // un tap destiné au bouton de combat situé juste derrière sur petit écran.
    if (statusTags && statusTags.dataset.sentinelTouchLayer !== '1') {
      statusTags.dataset.sentinelTouchLayer = '1';
      statusTags.style.setProperty('pointer-events', 'none', 'important');
    }

    choices.querySelectorAll('.combat-roll-btn').forEach(btn => {
      if (btn.disabled || btn.hasAttribute('disabled')) {
        btn.disabled = false;
        btn.removeAttribute('disabled');
      }
      if (btn.getAttribute('aria-disabled') === 'true') btn.setAttribute('aria-disabled', 'false');
      if (btn.dataset.sentinelTouchReady !== '1') {
        btn.dataset.sentinelTouchReady = '1';
        btn.setAttribute('autocomplete', 'off');
        btn.style.setProperty('pointer-events', 'auto', 'important');
        btn.style.setProperty('touch-action', 'manipulation', 'important');
        btn.style.setProperty('-webkit-tap-highlight-color', 'rgba(0,0,0,0)', 'important');
        btn.style.setProperty('position', 'relative', 'important');
        btn.style.setProperty('z-index', '61', 'important');
      }
    });
  }

  const observer = new MutationObserver(harden);
  observer.observe(choices, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['disabled']
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) setTimeout(harden, 0);
  });
  window.addEventListener('pageshow', () => setTimeout(harden, 0));
  window.addEventListener('focus', () => setTimeout(harden, 0));

  harden();
  setTimeout(harden, 50);
  setTimeout(harden, 250);
  setTimeout(harden, 800);
})();
