/* Livre 01 — palette finale des dés de combat.
   Classique : crème chaud ; Défense : bleu ardoise désaturé ; Faucheuse : anthracite.
   Ce fichier est chargé après les autres overlays de dés afin d'imposer le même rendu
   dans l'inventaire, les règles et les résultats de combat. */
(function () {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `
    /* Dé classique : ivoire/parchemin, clairement distinct du blanc pur. */
    .combat-die-icon-white,
    .combat-choice-die.white{
      background:#f2e6c9!important;
      color:#2f241b!important;
      border-color:#5f503d!important;
    }
    .combat-die-icon-white i,
    .combat-choice-die.white .combat-pip-cell i{
      background:#2f241b!important;
    }

    /* Dé de défense : bleu ardoise, moins saturé. */
    .combat-die-icon-blue,
    .combat-choice-die.blue{
      background:#627480!important;
      color:#f5f1e7!important;
      border-color:#46545d!important;
    }
    .combat-die-icon-blue i,
    .combat-choice-die.blue .combat-pip-cell i{
      background:#f5f1e7!important;
    }

    /* Dé de la Faucheuse : anthracite plutôt que noir pur. */
    .combat-die-icon-reaper,
    .combat-choice-die.reaper{
      background:#404346!important;
      color:#f5efe4!important;
      border-color:#282a2c!important;
    }
    .combat-choice-die.reaper .combat-pip-cell i{
      background:#f5efe4!important;
    }

    /* Crâne plus grand et plus lisible dans les règles / inventaire. */
    .combat-die-icon-reaper b{
      display:block!important;
      font-size:1.18em!important;
      line-height:1!important;
      font-weight:900!important;
      transform:scale(1.12)!important;
      transform-origin:center!important;
      color:#f7f1e7!important;
      text-shadow:0 1px 1px rgba(0,0,0,.35)!important;
    }

    /* Crâne obtenu pendant un combat : occupe vraiment la face du dé. */
    .combat-choice-die.reaper:not(.combat-choice-die-pips){
      font-size:1.82rem!important;
      line-height:1!important;
      font-weight:900!important;
      color:#f7f1e7!important;
      text-shadow:0 1px 2px rgba(0,0,0,.42)!important;
    }
  `;
  document.head.appendChild(style);
})();
