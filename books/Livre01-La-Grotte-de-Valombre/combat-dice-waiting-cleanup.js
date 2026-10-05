/* Livre 01 — état d'attente avant un combat.
   Aucun dé ne doit être visible avant que le joueur ait réellement cliqué sur « Jeter les dés ».
*/
(function () {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `
    .combat-roll-waiting .combat-dice{
      display:none!important;
    }
    .combat-roll-waiting .combat-side{
      min-height:0!important;
    }
  `;
  document.head.appendChild(style);
})();
