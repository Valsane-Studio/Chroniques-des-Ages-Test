/* Livre 01 — harmonisation visuelle des dés + suppression des panneaux inutiles. */
(function () {
  'use strict';
  const style = document.createElement('style');
  style.textContent = `
    /* Le dé classique n'a aucun effet spécial : aucun panneau d'information. */
    .combat-die-effect.white{
      display:none!important;
    }

    /* Les dés du joueur reprennent exactement la géométrie des dés standards/ennemis. */
    .combat-dice-custom .combat-choice-die{
      width:44px!important;
      height:44px!important;
      min-width:44px!important;
      min-height:44px!important;
      box-sizing:border-box!important;
      border:2px solid #33261b!important;
      border-radius:4px!important;
      padding:6px!important;
      margin:0!important;
      box-shadow:none!important;
      display:inline-flex!important;
      align-items:center!important;
      justify-content:center!important;
      overflow:hidden!important;
    }

    .combat-dice-custom .combat-choice-die.white{
      background:#fff8e5!important;
      color:#2f241b!important;
    }
    .combat-dice-custom .combat-choice-die.blue{
      background:#627480!important;
      color:#f5f1e7!important;
    }
    .combat-dice-custom .combat-choice-die.reaper{
      background:#404346!important;
      color:#f7f1e7!important;
    }

    .combat-dice-custom .combat-choice-die-pips .combat-pip-grid{
      width:100%!important;
      height:100%!important;
      display:grid!important;
      grid-template-columns:repeat(3,1fr)!important;
      grid-template-rows:repeat(3,1fr)!important;
      gap:1px!important;
    }
    .combat-dice-custom .combat-pip-cell{
      display:grid!important;
      place-items:center!important;
    }
    .combat-dice-custom .combat-pip-cell i{
      width:6px!important;
      height:6px!important;
      border-radius:50%!important;
      box-shadow:none!important;
    }

    /* Même palette pour les petits dés des règles et de l'inventaire. */
    .combat-die-icon-white{
      background:#fff8e5!important;
      color:#2f241b!important;
      border:2px solid #33261b!important;
    }
    .combat-die-icon-white i{background:#2f241b!important}
    .combat-die-icon-blue{
      background:#627480!important;
      color:#f5f1e7!important;
      border:2px solid #46545d!important;
    }
    .combat-die-icon-blue i{background:#f5f1e7!important}
    .combat-die-icon-reaper{
      background:#404346!important;
      color:#f7f1e7!important;
      border:2px solid #282a2c!important;
    }

    /* Le crâne doit occuper franchement la face du dé offensif. */
    .combat-die-icon-reaper b{
      font-size:1.3em!important;
      line-height:1!important;
      transform:scale(1.16)!important;
      transform-origin:center!important;
    }
    .combat-dices-custom .combat-choice-die.reaper:not(.combat-choice-die-pips),
    .combat-dice-custom .combat-choice-die.reaper:not(.combat-choice-die-pips){
      font-size:2rem!important;
      line-height:1!important;
    }
  `;
  document.head.appendChild(style);
})();
