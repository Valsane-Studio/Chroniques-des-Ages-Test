/* Livre 02 — finitions visuelles de combat communes au Livre 01. */
(function(){
  'use strict';
  const style=document.createElement('style');
  style.id='providence-combat-visual-parity';
  style.textContent=`
    .combat-roll-result .combat-outcome {
      margin-top:18px;
      padding:15px 17px;
      border-left:3px solid rgba(92,62,34,.72);
      background:rgba(73,48,27,.075);
      font-size:clamp(1.05rem,2.2vw,1.22rem);
      line-height:1.55;
      text-align:left;
    }
    .combat-roll-result .combat-outcome > strong:first-child {
      font-size:1.18em;
      line-height:1.3;
    }
    .combat-roll-result .combat-detail {
      font-size:.82em;
      opacity:.76;
    }
    .combat-roll-result .combat-life-line {
      margin-top:11px;
      padding:12px 14px;
      border-top:1px solid rgba(92,62,34,.28);
      font-size:clamp(1rem,2vw,1.12rem);
      line-height:1.45;
      font-weight:500;
    }
    .combat-roll-result .combat-life-line strong {
      font-size:1.08em;
    }
  `;
  document.head.appendChild(style);
})();
