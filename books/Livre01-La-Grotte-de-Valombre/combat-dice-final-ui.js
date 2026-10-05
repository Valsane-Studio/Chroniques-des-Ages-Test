/* Livre 01 — finition UI des dés de combat.
   - Le dé classique réutilise exactement le composant standard .die-visual/.die-cell du moteur.
   - Défense et Offensif gardent la même géométrie, seule la couleur change.
   - Ajout d'un rappel des règles de combat depuis l'inventaire.
   - Boutons de choix de dé alignés visuellement sur les choix narratifs, sans texture.
*/
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const STORY = book?.story;
  const inventory = book?.inventory;
  if (!book || !STORY || !inventory) return;

  const PIPS = {
    0: [], 1: [5], 2: [1,9], 3: [1,5,9],
    4: [1,3,7,9], 5: [1,3,5,7,9], 6: [1,3,4,6,7,9]
  };

  function standardDie(value, extraClass = '', label = '') {
    const v = Math.max(0, Math.min(6, Number(value) || 0));
    const active = new Set(PIPS[v] || []);
    const cells = Array.from({length:9}, (_,i) =>
      `<span class="die-cell">${active.has(i+1) ? '<i></i>' : ''}</span>`
    ).join('');
    return `<span class="die-visual${extraClass ? ' ' + extraClass : ''}"${label ? ` aria-label="${label}"` : ''}>${cells}</span>`;
  }

  function offensiveSkull(label = 'Dé offensif : crâne') {
    return `<span class="die-visual combat-die-offensive combat-die-skull" aria-label="${label}"><b>☠</b></span>`;
  }

  function nodeFromHtml(html) {
    const t = document.createElement('template');
    t.innerHTML = String(html).trim();
    return t.content.firstElementChild;
  }

  function finalizeDiceHtml(html) {
    const t = document.createElement('template');
    t.innerHTML = String(html || '');
    const root = t.content;

    /* Résultats de combat : on remplace le composant custom par le vrai composant standard. */
    root.querySelectorAll('.combat-dice-custom .combat-choice-die').forEach(el => {
      const isBlue = el.classList.contains('blue');
      const isOffensive = el.classList.contains('reaper');
      const text = (el.textContent || '').trim();

      if (isOffensive && text.includes('☠')) {
        el.replaceWith(nodeFromHtml(offensiveSkull()));
        return;
      }

      const m = text.match(/[0-6]/);
      const value = m ? Number(m[0]) : 0;
      if (isBlue) {
        const wrap = document.createElement('span');
        wrap.className = 'combat-die-with-bonus';
        wrap.appendChild(nodeFromHtml(standardDie(value, 'combat-die-defense', `Dé de défense : ${value}`)));
        const bonus = document.createElement('small');
        bonus.className = 'combat-standard-defense-bonus';
        bonus.textContent = '+1';
        wrap.appendChild(bonus);
        el.replaceWith(wrap);
      } else if (isOffensive) {
        el.replaceWith(nodeFromHtml(standardDie(value, 'combat-die-offensive', `Dé offensif : ${value}`)));
      } else {
        /* Aucun style ajouté : c'est exactement le même .die-visual que les dés adverses. */
        el.replaceWith(nodeFromHtml(standardDie(value, '', `Dé classique : ${value}`)));
      }
    });

    /* Inventaire + prologue : mêmes vrais dés standards, pas une imitation. */
    root.querySelectorAll('.combat-die-icon-white').forEach(el => {
      el.replaceWith(nodeFromHtml(standardDie(4, '', 'Dé classique')));
    });
    root.querySelectorAll('.combat-die-icon-blue').forEach(el => {
      el.replaceWith(nodeFromHtml(standardDie(4, 'combat-die-defense', 'Dé de défense')));
    });
    root.querySelectorAll('.combat-die-icon-reaper').forEach(el => {
      el.replaceWith(nodeFromHtml(offensiveSkull('Dé offensif')));
    });

    /* Le classique ne mérite aucun panneau d'effet après un échange. */
    root.querySelectorAll('.combat-die-effect.white').forEach(el => el.remove());

    return t.innerHTML;
  }

  function rulesContent() {
    return `
      <p><strong>Combats :</strong> ton personnage et l’adversaire lancent chacun <strong>2 dés</strong>, puis ajoutent leur Dextérité et leur Force. Le meilleur score remporte l’échange. En cas d’égalité, personne n’est blessé.</p>
      <p>Ton <strong>premier dé est toujours le dé classique</strong>. Tu choisis librement le deuxième depuis l’inventaire, et tu peux le changer entre deux échanges.</p>
      <div class="combat-rules-die-row">${standardDie(4)}<div><strong>Dé classique</strong><br>1 · 2 · 3 · 4 · 5 · 6<br>Position de combat classique, régulière et équilibrée.</div></div>
      <div class="combat-rules-die-row">${standardDie(4,'combat-die-defense')}<div><strong>Dé de défense</strong><br>0 · 1 · 2 · 3 · 4 · 5<br>Ton attaque est moins puissante, mais tu absorbes <strong>1 point de dégâts à chaque échange perdu</strong>.</div></div>
      <div class="combat-rules-die-row">${offensiveSkull()}<div><strong>Dé offensif</strong><br>1 · 1 · 3 · 3 · ☠ · ☠<br>Tu adoptes une attitude offensive en prenant davantage de risques. Si ☠ apparaît, tu <strong>remportes automatiquement l’échange</strong>, quels que soient les dés adverses.</div></div>
      <p>La Force aide à remporter l’échange mais ne modifie pas les dégâts. Tes dégâts sont de <strong>2 + la Puissance de ton arme</strong> si tu en possèdes une. Les dégâts adverses sont indiqués sur leur fiche.</p>
    `;
  }

  function closeRulesModal() {
    document.querySelector('.combat-rules-overlay')?.remove();
  }

  function openRulesModal() {
    closeRulesModal();
    const overlay = document.createElement('div');
    overlay.className = 'combat-rules-overlay';
    overlay.innerHTML = `
      <section class="combat-rules-dialog" role="dialog" aria-modal="true" aria-labelledby="combat-rules-title">
        <div class="combat-rules-head">
          <h3 id="combat-rules-title">Règles des combats</h3>
          <button type="button" class="combat-rules-close" aria-label="Fermer">×</button>
        </div>
        <div class="combat-rules-body">${rulesContent()}</div>
      </section>`;
    overlay.addEventListener('click', e => {
      if (e.target === overlay || e.target.closest('.combat-rules-close')) closeRulesModal();
    });
    document.body.appendChild(overlay);
  }

  /* Inventaire : bouton de rappel juste avant le choix du deuxième dé. */
  const previousExtraHtml = typeof inventory.extraHtml === 'function' ? inventory.extraHtml.bind(inventory) : null;
  if (previousExtraHtml) {
    inventory.extraHtml = state => {
      const t = document.createElement('template');
      t.innerHTML = finalizeDiceHtml(previousExtraHtml(state));
      const card = t.content.querySelector('.combat-die-inventory-card');
      if (card && !t.content.querySelector('[data-action="combat-rules-open"]')) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'inventory-action-btn combat-rules-button';
        button.dataset.action = 'combat-rules-open';
        button.textContent = 'Règles des combats';
        card.before(button);
      }
      return t.innerHTML;
    };
  }

  const previousHandleAction = typeof inventory.handleAction === 'function' ? inventory.handleAction.bind(inventory) : null;
  inventory.handleAction = function(action, state, api) {
    if (action === 'combat-rules-open') {
      openRulesModal();
      return true;
    }
    return previousHandleAction ? previousHandleAction(action, state, api) : false;
  };

  /* Toutes les scènes passent une dernière fois par le rendu final des dés. */
  for (const scene of Object.values(STORY)) {
    if (!scene) continue;
    if (typeof scene.text === 'function') {
      const previousText = scene.text;
      scene.text = state => finalizeDiceHtml(previousText(state));
    } else if (typeof scene.text === 'string') {
      scene.text = finalizeDiceHtml(scene.text);
    }
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.querySelector('.combat-rules-overlay')) closeRulesModal();
  });

  const style = document.createElement('style');
  style.textContent = `
    /* Le classique n'a AUCUNE règle visuelle propre : il hérite intégralement de .die-visual. */
    .combat-die-defense{background:#627480!important;color:#f5f1e7!important;border-color:#33261b!important}
    .combat-die-defense .die-cell i{background:#f5f1e7!important}
    .combat-die-offensive{background:#404346!important;color:#f7f1e7!important;border-color:#33261b!important}
    .combat-die-offensive .die-cell i{background:#f7f1e7!important}
    .combat-die-skull{display:inline-flex!important;align-items:center!important;justify-content:center!important}
    .combat-die-skull b{font-size:2rem!important;line-height:1!important;font-weight:900!important}
    .combat-die-with-bonus{position:relative;display:inline-flex}
    .combat-standard-defense-bonus{position:absolute;right:-5px;bottom:-5px;min-width:18px;height:18px;display:grid;place-items:center;border-radius:50%;background:#26343b;color:#fff;font-size:10px;font-weight:700;border:1px solid #efe4c7}

    /* Les boutons de l'inventaire reprennent l'esprit des choix narratifs : parchemin, trait fin, aucune texture. */
    .combat-rules-button,
    .combat-die-select{
      width:100%!important;
      min-height:66px!important;
      padding:12px 14px!important;
      border:1px solid rgba(63,49,34,.68)!important;
      border-radius:4px!important;
      background:rgba(255,255,255,.035)!important;
      background-image:none!important;
      color:#2f2418!important;
      box-shadow:none!important;
      text-shadow:none!important;
      cursor:pointer!important;
    }
    .combat-rules-button{text-align:center!important;font-weight:700!important;margin:8px 0 12px!important}
    .combat-die-options{display:grid!important;gap:10px!important}
    .combat-die-select{text-align:center!important}
    .combat-die-select strong{display:flex!important;align-items:center!important;justify-content:center!important;gap:12px!important;color:#2f2418!important;font-size:1.05em!important}
    .combat-die-select small{display:block!important;margin-top:8px!important;color:#5d4b39!important;font-size:.92em!important}
    .combat-die-select.combat-die-selected{outline:2px solid rgba(117,83,46,.78)!important;outline-offset:-3px!important;background:rgba(83,60,35,.08)!important}
    .combat-die-inventory-card{background:transparent!important;background-image:none!important}

    .combat-rules-overlay{position:fixed;inset:0;z-index:120;background:rgba(0,0,0,.68);display:grid;place-items:center;padding:16px}
    .combat-rules-dialog{width:min(680px,96vw);max-height:88vh;overflow:auto;background:#eadfbe;color:#2a1e15;border:1px solid #8e724b;padding:18px;box-shadow:0 18px 55px rgba(0,0,0,.45)}
    .combat-rules-head{display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid rgba(80,61,42,.32);padding-bottom:10px}
    .combat-rules-head h3{margin:0;font-weight:500;font-size:1.45rem}
    .combat-rules-close{width:38px;height:38px;border:1px solid rgba(63,49,34,.55);background:transparent;color:#2f2418;font-size:28px;line-height:1;cursor:pointer}
    .combat-rules-body{padding-top:8px;line-height:1.45}
    .combat-rules-die-row{display:grid;grid-template-columns:52px 1fr;align-items:center;gap:12px;padding:10px 0;border-top:1px solid rgba(80,61,42,.18)}
    .combat-rules-die-row:first-of-type{margin-top:8px}
  `;
  document.head.appendChild(style);
})();
