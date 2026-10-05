/* Livre 01 — UI consolidée des dés de combat.
   Le dé classique réutilise STRICTEMENT le composant standard .die-visual/.die-cell du lecteur.
   Aucun style de couleur, bordure, rayon ou ombre spécifique n'est appliqué au dé classique.
*/
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const STORY = book?.story;
  const inventory = book?.inventory;
  if (!book || !STORY || !inventory) return;

  const VALID = new Set(['white', 'blue', 'reaper']);
  const PIPS = {
    0: [], 1: [5], 2: [1, 9], 3: [1, 5, 9],
    4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9]
  };

  function dieType(state) {
    return VALID.has(state.combatSecondDie) ? state.combatSecondDie : 'white';
  }

  function standardDie(value, extraClass = '', label = '') {
    const v = Math.max(0, Math.min(6, Number(value) || 0));
    const active = new Set(PIPS[v] || []);
    const cells = Array.from({ length: 9 }, (_, i) =>
      `<span class="die-cell">${active.has(i + 1) ? '<i></i>' : ''}</span>`
    ).join('');
    return `<span class="die-visual${extraClass ? ' ' + extraClass : ''}"${label ? ` aria-label="${label}"` : ''}>${cells}</span>`;
  }

  function offensiveSkull(label = 'Dé offensif : crâne') {
    return `<span class="die-visual combat-die-offensive combat-die-skull" aria-label="${label}"><b>☠</b></span>`;
  }

  function rulesHtml() {
    return `
      <div class="combat-rules-recap">
        <p><strong>Combats :</strong> ton personnage et l’adversaire lancent chacun <strong>2 dés</strong>, puis ajoutent leur Dextérité et leur Force. Le meilleur score remporte l’échange. En cas d’égalité, personne n’est blessé.</p>
        <p>Ton <strong>premier dé est toujours le dé classique</strong>. Pour le deuxième dé, tu choisis ta position de combat. Tu peux le changer à tout moment depuis l’inventaire, même entre deux échanges.</p>

        <div class="combat-rules-die-row">
          ${standardDie(4, '', 'Dé classique')}
          <div><strong>Dé classique</strong><br>1 · 2 · 3 · 4 · 5 · 6<br>Tu adoptes une <strong>position de combat classique</strong>, régulière et équilibrée.</div>
        </div>

        <div class="combat-rules-die-row">
          ${standardDie(4, 'combat-die-defense', 'Dé de défense')}
          <div><strong>Dé de défense</strong><br>0 · 1 · 2 · 3 · 4 · 5<br>Tu adoptes une <strong>position défensive</strong>. Ton attaque est moins puissante, mais en contrepartie tu absorbes <strong>1 point de dégâts à chaque échange perdu</strong>.</div>
        </div>

        <div class="combat-rules-die-row">
          ${offensiveSkull('Dé offensif')}
          <div><strong>Dé offensif</strong><br>1 · 1 · 3 · 3 · ☠ · ☠<br>Tu adoptes une <strong>attitude offensive</strong>, en prenant davantage de risques. Si ☠ apparaît, tu <strong>remportes automatiquement l’échange</strong>, quels que soient les dés adverses.</div>
        </div>

        <p>La Force aide à remporter l’échange mais ne modifie pas les dégâts. Tes dégâts sont de <strong>2 + la Puissance de ton arme</strong> si tu en possèdes une. Les dégâts adverses sont indiqués sur leur fiche.</p>
        <button type="button" class="inventory-action-btn combat-rules-back" data-action="back-inventory">Retour à l’inventaire</button>
      </div>`;
  }

  function selectorButton(state, id, title, detail, die) {
    const selected = dieType(state) === id;
    return `<button type="button" class="inventory-action-btn combat-die-select${selected ? ' combat-die-selected' : ''}" data-action="combat-second-die:${id}" aria-pressed="${selected ? 'true' : 'false'}">
      <span class="combat-die-select-visual">${die}</span>
      <span class="combat-die-select-copy"><strong>${title}</strong><small>${detail}</small></span>
    </button>`;
  }

  function selectionCard(state) {
    const type = dieType(state);
    const current = type === 'blue' ? 'Dé de défense' : type === 'reaper' ? 'Dé offensif' : 'Dé classique';
    return `
      <button type="button" class="inventory-action-btn combat-rules-open" data-action="combat-rules-open">Règles des combats</button>
      <div class="inventory-equipment-card combat-die-inventory-card">
        <div class="inventory-equipment-title">Deuxième dé de combat</div>
        <p>Le premier dé est toujours le dé classique. Tu peux changer le deuxième à tout moment, y compris entre deux échanges.</p>
        <div class="inventory-actions combat-die-options">
          ${selectorButton(state, 'white', 'Classique', '1 · 2 · 3 · 4 · 5 · 6', standardDie(4, '', 'Dé classique'))}
          ${selectorButton(state, 'blue', 'Défense', '0 · 1 · 2 · 3 · 4 · 5 · +1 défense', standardDie(4, 'combat-die-defense', 'Dé de défense'))}
          ${selectorButton(state, 'reaper', 'Offensif', '1 · 1 · 3 · 3 · ☠ · ☠', offensiveSkull('Dé offensif'))}
        </div>
        <p class="combat-die-current"><strong>Actuel : ${current}</strong>${type === 'reaper' ? ' · ☠ remporte automatiquement l’échange.' : ''}${type === 'blue' ? ' · 1 dégât est absorbé à chaque échange perdu.' : ''}</p>
      </div>`;
  }

  function nodeFromHtml(html) {
    const t = document.createElement('template');
    t.innerHTML = String(html || '').trim();
    return t.content.firstElementChild;
  }

  function patchCombatHtml(html) {
    if (!html) return html;
    const t = document.createElement('template');
    t.innerHTML = String(html);
    const root = t.content;

    root.querySelectorAll('.combat-dice-custom .combat-choice-die').forEach(el => {
      const isBlue = el.classList.contains('blue');
      const isOffensive = el.classList.contains('reaper');
      const text = (el.textContent || '').trim();

      if (isOffensive && text.includes('☠')) {
        el.replaceWith(nodeFromHtml(offensiveSkull()));
        return;
      }

      const match = text.match(/[0-6]/);
      const value = match ? Number(match[0]) : 0;

      if (isBlue) {
        const holder = document.createElement('span');
        holder.className = 'combat-die-with-bonus';
        holder.appendChild(nodeFromHtml(standardDie(value, 'combat-die-defense', `Dé de défense : ${value}`)));
        const bonus = document.createElement('small');
        bonus.className = 'combat-defense-bonus-v2';
        bonus.textContent = '+1';
        holder.appendChild(bonus);
        el.replaceWith(holder);
      } else if (isOffensive) {
        el.replaceWith(nodeFromHtml(standardDie(value, 'combat-die-offensive', `Dé offensif : ${value}`)));
      } else {
        /* Exactement le composant standard, sans aucune classe visuelle supplémentaire. */
        el.replaceWith(nodeFromHtml(standardDie(value, '', `Dé classique : ${value}`)));
      }
    });

    root.querySelectorAll('.combat-die-effect.white').forEach(el => el.remove());

    return t.innerHTML
      .replace(/Dé de la Faucheuse/g, 'Dé offensif')
      .replace(/Faucheuse/g, 'Offensif')
      .replace(/Deuxième dé blanc/g, 'Deuxième dé classique');
  }

  /* Remplace directement l’ancien bloc de choix du deuxième dé produit par combat-dice-choice.js. */
  const previousExtraHtml = typeof inventory.extraHtml === 'function' ? inventory.extraHtml.bind(inventory) : null;
  inventory.extraHtml = state => {
    const html = previousExtraHtml ? previousExtraHtml(state) : '';
    const t = document.createElement('template');
    t.innerHTML = String(html || '');
    const oldCard = t.content.querySelector('.combat-die-inventory-card');
    const replacement = document.createElement('template');
    replacement.innerHTML = selectionCard(state).trim();
    const fragment = replacement.content;
    if (oldCard) oldCard.replaceWith(fragment);
    else t.content.prepend(fragment);
    return t.innerHTML;
  };

  /* Bouton natif dans l’inventaire : utilise le modal commun du lecteur. */
  const previousHandleAction = typeof inventory.handleAction === 'function' ? inventory.handleAction.bind(inventory) : null;
  inventory.handleAction = function(action, state, api) {
    if (action === 'combat-rules-open') {
      api?.showModal?.('Règles des combats', rulesHtml());
      return true;
    }
    return previousHandleAction ? previousHandleAction(action, state, api) : false;
  };

  /* Prologue : texte final unique des règles de combat. */
  for (const scene of Object.values(STORY)) {
    if (!scene) continue;

    if (scene.number === 'RÈGLES DU JEU') {
      const previousText = scene.text;
      scene.text = state => {
        const html = typeof previousText === 'function' ? previousText(state) : previousText;
        return patchCombatHtml(String(html || '').replace(/<p><strong>Combats :<\/strong>[\s\S]*?<\/p>/, rulesHtml().replace(/<button[\s\S]*?<\/button>/, '')));
      };
      continue;
    }

    if (typeof scene.text === 'function') {
      const previousText = scene.text;
      scene.text = state => patchCombatHtml(previousText(state));
    } else if (typeof scene.text === 'string') {
      scene.text = patchCombatHtml(scene.text);
    }
  }

  const style = document.createElement('style');
  style.textContent = `
    /* CLASSIQUE : aucune surcharge. .die-visual/.die-cell viennent du lecteur commun. */

    /* Défense / Offensif : même géométrie et même contour que le dé standard, seule la teinte change. */
    .die-visual.combat-die-defense{background:#74828a!important;color:#f5f1e7!important}
    .die-visual.combat-die-defense .die-cell i{background:#f5f1e7!important}
    .die-visual.combat-die-offensive{background:#434649!important;color:#f7f1e7!important}
    .die-visual.combat-die-offensive .die-cell i{background:#f7f1e7!important}
    .die-visual.combat-die-skull{display:inline-flex!important;align-items:center!important;justify-content:center!important}
    .die-visual.combat-die-skull b{font-size:2rem!important;line-height:1!important;font-weight:900!important;color:#f7f1e7!important}
    .combat-die-with-bonus{position:relative;display:inline-flex;vertical-align:middle}
    .combat-defense-bonus-v2{position:absolute;right:-5px;bottom:-5px;min-width:18px;height:18px;display:grid;place-items:center;border-radius:50%;background:#35434b;color:#fff;font-size:10px;font-weight:700;border:1px solid #efe4c7}

    /* INVENTAIRE : aucun bouton texturé. Même logique visuelle que les choix narratifs : cadre simple sur parchemin. */
    #modal[data-panel="inventory"] .inventory-action-btn,
    .combat-rules-recap .inventory-action-btn{
      background:rgba(255,255,255,.04)!important;
      background-image:none!important;
      color:#2f2418!important;
      border:1px solid #7d6546!important;
      border-radius:3px!important;
      box-shadow:none!important;
      text-shadow:none!important;
      cursor:pointer!important;
    }
    #modal[data-panel="inventory"] .inventory-action-btn:hover,
    .combat-rules-recap .inventory-action-btn:hover{background:rgba(87,65,40,.07)!important}

    .combat-rules-open{width:100%!important;min-height:58px!important;padding:12px 16px!important;margin:4px 0 12px!important;text-align:center!important;font-weight:700!important;font-size:1.05rem!important}
    .combat-die-inventory-card{background:transparent!important;background-image:none!important}
    .combat-die-options{display:grid!important;gap:10px!important}
    .combat-die-select{width:100%!important;min-height:72px!important;padding:10px 14px!important;display:grid!important;grid-template-columns:52px 1fr!important;align-items:center!important;gap:12px!important;text-align:left!important}
    .combat-die-select-visual{display:grid!important;place-items:center!important}
    .combat-die-select-copy{display:block!important}
    .combat-die-select-copy strong{display:block!important;color:#2f2418!important;font-size:1.05rem!important}
    .combat-die-select-copy small{display:block!important;margin-top:5px!important;color:#5d4b39!important;font-size:.92rem!important;opacity:1!important}
    .combat-die-selected{outline:2px solid rgba(117,83,46,.82)!important;outline-offset:-4px!important;background:rgba(83,60,35,.09)!important}
    .combat-die-current{margin-bottom:0!important}

    .combat-rules-recap{line-height:1.45}
    .combat-rules-die-row{display:grid;grid-template-columns:52px 1fr;align-items:center;gap:12px;padding:11px 0;border-top:1px solid rgba(80,61,42,.22)}
    .combat-rules-back{width:100%;min-height:52px;padding:10px 14px;margin-top:8px}
  `;
  document.head.appendChild(style);
})();