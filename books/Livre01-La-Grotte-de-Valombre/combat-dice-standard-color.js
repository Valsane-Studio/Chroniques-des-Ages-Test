/* Livre 01 — le dé classique reprend exactement la palette des dés standards Force/Dextérité. */
(function () {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `
    .combat-die-icon-white{
      background:#fff8e5!important;
    }
    .combat-die-icon-white i{
      background:#2f241b!important;
    }
    .combat-choice-die.white{
      background:#fff8e5!important;
      color:#2f241b!important;
    }
  `;
  document.head.appendChild(style);
})();
