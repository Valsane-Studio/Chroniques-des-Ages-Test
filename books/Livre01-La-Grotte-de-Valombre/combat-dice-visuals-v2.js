/* Livre 01 — dés de combat : texte V3 + vrais dés à points. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const STORY = book?.story;
  const inventory = book?.inventory;
  if (!book || !STORY || !inventory) return;

  const PIPS = {
    0: [],
    1: [5],
    2: [1,9],
    3: [1,5,9],
    4: [1,3,7,9],
    5: [1,3,5,7,9],
    6: [1,3,4,6,7,9]
  };

  function pipGrid(value) {
    const active = new Set(PIPS[Math.max(0, Math.min(6, Number(value) || 0))] || []);
    return `<span class="combat-pip-grid" aria-hidden="true">${Array.from({length:9},(_,i)=>`<span class="combat-pip-cell">${active.has(i+1)?'<i></i>':''}</span>`).join('')}</span>`;
  }

  function rolledDie(type, value, defenseBonus = false) {
    const label = type === 'blue' ? `Dé de défense : ${value}, +1 défense` : type === 'reaper' ? `Dé de la Faucheuse : ${value}` : `Dé classique : ${value}`;
    return `<span class="combat-choice-die ${type} combat-choice-die-pips" aria-label="${label}">${pipGrid(value)}${defenseBonus?'<small class="combat-defense-bonus">+1</small>':''}</span>`;
  }

  function decorateRolledDice(html) {
    return String(html || '')
      .replace(/<span class="combat-choice-die white">([1-6])<\/span>/g, (_,v) => rolledDie('white', Number(v)))
      .replace(/<span class="combat-choice-die blue">([0-5])<small>\+1<\/small><\/span>/g, (_,v) => rolledDie('blue', Number(v), true))
      .replace(/<span class="combat-choice-die reaper">([13])<\/span>/g, (_,v) => rolledDie('reaper', Number(v)));
  }

  function dieIcon(type) {
    if (type === 'reaper') {
      return '<span class="combat-die-icon combat-die-icon-reaper" aria-hidden="true"><b>☠</b></span>';
    }
    return `<span class="combat-die-icon combat-die-icon-${type}" aria-hidden="true"><i></i><i></i><i></i><i></i></span>`;
  }

  function decorateDiceLabels(html) {
    const labelled = String(html || '')
      .replace(/<strong>⚪ Blanc<\/strong>/g, `<strong>${dieIcon('white')} Classique</strong>`)
      .replace(/<strong>🔵 Défense<\/strong>/g, `<strong>${dieIcon('blue')} Défense</strong>`)
      .replace(/<strong>⚫ Faucheuse<\/strong>/g, `<strong>${dieIcon('reaper')} Faucheuse</strong>`)
      .replace(/<strong>⚪ Deuxième dé blanc\.<\/strong>/g, `<strong>${dieIcon('white')} Deuxième dé classique.</strong>`)
      .replace(/<strong>🔵 Défense :<\/strong>/g, `<strong>${dieIcon('blue')} Défense :</strong>`)
      .replace(/<strong>⚫ Dé de la Faucheuse<\/strong>/g, `<strong>${dieIcon('reaper')} Dé de la Faucheuse</strong>`)
      .replace(/<strong>🔵 Dé de défense<\/strong>/g, `<strong>${dieIcon('blue')} Dé de défense</strong>`)
      .replace(/<strong>⚪ Dé blanc<\/strong>/g, `<strong>${dieIcon('white')} Dé classique</strong>`)
      .replace(/<strong>Actuel : Dé blanc<\/strong>/g, '<strong>Actuel : Dé classique</strong>')
      .replace(/Le premier dé reste toujours blanc\./g, 'Le premier dé est toujours le dé classique.');
    return decorateRolledDice(labelled);
  }

  const previousExtraHtml = typeof inventory.extraHtml === 'function' ? inventory.extraHtml.bind(inventory) : null;
  if (previousExtraHtml) {
    inventory.extraHtml = state => decorateDiceLabels(previousExtraHtml(state));
  }

  for (const scene of Object.values(STORY)) {
    if (!scene) continue;

    if (scene.number === 'RÈGLES DU JEU') {
      const previousText = scene.text;
      scene.text = state => {
        const html = typeof previousText === 'function' ? previousText(state) : previousText;
        const rulesHtml = `<div class="combat-dice-rules-v2">
          <p><strong>Combats :</strong> ton personnage et l’adversaire lancent chacun <strong>2 dés</strong>, puis ajoutent leur Dextérité et leur Force. Le meilleur score remporte l’échange. En cas d’égalité, personne n’est blessé.</p>
          <p>Ton <strong>premier dé est toujours le dé classique</strong>. Pour le deuxième dé, tu choisis ta position de combat :</p>
          <p><strong>${dieIcon('white')} Dé classique</strong> — 1 · 2 · 3 · 4 · 5 · 6<br>Tu adoptes une <strong>position de combat classique</strong>, régulière et équilibrée.</p>
          <p><strong>${dieIcon('blue')} Dé de défense</strong> — 0 · 1 · 2 · 3 · 4 · 5<br>Tu adoptes une <strong>position défensive</strong>. Ton attaque est moins puissante, mais en contrepartie tu absorbes <strong>1 point de dégâts à chaque échange perdu</strong>.</p>
          <p><strong>${dieIcon('reaper')} Dé de la Faucheuse</strong> — 1 · 1 · 3 · 3 · ☠ · ☠<br>Tu adoptes une <strong>attitude offensive</strong>, en prenant davantage de risques. Si ☠ apparaît, tu <strong>remportes automatiquement l’échange</strong>, quels que soient les dés adverses.</p>
          <p>Tu peux <strong>changer ton deuxième dé à tout moment depuis l’inventaire</strong>, même entre deux échanges d’un même combat.</p>
          <p>La Force aide à remporter l’échange, mais ne modifie pas les dégâts. Tes dégâts sont de <strong>2 + la Puissance de ton arme</strong> si tu en possèdes une. Les dégâts adverses sont indiqués sur leur fiche.</p>
        </div>`;
        return String(html || '').replace(/<p><strong>Combats :<\/strong>[\s\S]*?<\/p>/, rulesHtml);
      };
      continue;
    }

    if (typeof scene.text === 'function') {
      const previousText = scene.text;
      scene.text = state => decorateDiceLabels(previousText(state));
    }
  }

  const style = document.createElement('style');
  style.textContent = `
    .combat-die-icon{
      width:1.35em;height:1.35em;display:inline-grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);
      vertical-align:-.28em;margin-right:.28em;border-radius:.28em;border:1px solid rgba(0,0,0,.45);box-shadow:inset 0 0 0 1px rgba(255,255,255,.18),0 1px 2px rgba(0,0,0,.25);position:relative;
    }
    .combat-die-icon-white{background:#d8b54f}.combat-die-icon-blue{background:#315f8d}.combat-die-icon-reaper{background:#171717;color:#f2eee3;display:inline-flex;align-items:center;justify-content:center;font-size:.9em}
    .combat-die-icon i{width:.22em;height:.22em;border-radius:50%;background:#20180c;align-self:center;justify-self:center}
    .combat-die-icon-blue i{background:#f5f1e7}
    .combat-die-icon i:nth-child(1){grid-column:1;grid-row:1}.combat-die-icon i:nth-child(2){grid-column:3;grid-row:1}.combat-die-icon i:nth-child(3){grid-column:1;grid-row:3}.combat-die-icon i:nth-child(4){grid-column:3;grid-row:3}
    .combat-die-icon-reaper b{font-size:.82em;line-height:1;font-weight:700}
    .combat-dice-rules-v2 p{margin:.75rem 0}.combat-dice-rules-v2 .combat-die-icon{font-size:1.1em}
    .combat-die-select .combat-die-icon{font-size:1.08em}

    .combat-choice-die.white{background:#d8b54f!important;color:#20180c!important}
    .combat-choice-die-pips{position:relative;padding:0!important}
    .combat-pip-grid{width:72%;height:72%;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr)}
    .combat-pip-cell{display:flex;align-items:center;justify-content:center}
    .combat-pip-cell i{display:block;width:.38rem;height:.38rem;border-radius:50%;background:currentColor;box-shadow:0 1px 1px rgba(0,0,0,.18)}
    .combat-choice-die.blue .combat-pip-cell i,.combat-choice-die.reaper .combat-pip-cell i{background:#f5f1e7}
    .combat-defense-bonus{position:absolute;right:.16rem;bottom:.07rem;font-size:.47rem!important;line-height:1;font-weight:800;margin:0!important;background:rgba(0,0,0,.24);padding:.08rem .12rem;border-radius:.16rem;color:#fff}
  `;
  document.head.appendChild(style);
})();
