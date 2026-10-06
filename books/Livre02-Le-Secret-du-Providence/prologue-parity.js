/* Livre 02 — Prologue : parité visuelle avec la dernière version du Livre 01.
   La page des règles reprend exactement le composant, les couleurs et la disposition
   des dés du Livre 01 (.die-visual / .die-cell). */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('providence-02');
  const story = book?.story;
  if (!book || !story) return;

  const PIPS = {
    0: [], 1: [5], 2: [1, 9], 3: [1, 5, 9],
    4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9]
  };

  function standardDie(value, extraClass = '', label = '') {
    const v = Math.max(0, Math.min(6, Number(value) || 0));
    const active = new Set(PIPS[v] || []);
    const cells = Array.from({ length: 9 }, (_, i) =>
      `<span class="die-cell">${active.has(i + 1) ? '<i></i>' : ''}</span>`
    ).join('');
    return `<span class="die-visual${extraClass ? ' ' + extraClass : ''}"${label ? ` aria-label="${label}"` : ''}>${cells}</span>`;
  }

  function offensiveSkull(label = 'Dé offensif') {
    return `<span class="die-visual combat-die-offensive combat-die-skull" aria-label="${label}"><b>☠</b></span>`;
  }

  function diePreview(type) {
    if (type === 'blue') return standardDie(4, 'combat-die-defense', 'Dé de défense');
    if (type === 'reaper') return offensiveSkull('Dé offensif');
    return standardDie(4, '', 'Dé classique');
  }

  function rulesHtml() {
    return `
      <div class="combat-rules-recap">
        <p><strong>Combats :</strong> ton personnage et l’adversaire lancent chacun <strong>2 dés</strong>, puis ajoutent leur Dextérité et leur Force. Le meilleur score remporte l’échange. En cas d’égalité, personne n’est blessé.</p>
        <p>Ton <strong>premier dé est toujours le dé classique</strong>. Pour le deuxième dé, tu choisis ta position de combat. Tu peux le changer à tout moment depuis l’inventaire, même entre deux échanges.</p>

        <div class="combat-rules-die-row">
          ${diePreview('white')}
          <div><strong>Dé classique</strong><br>1 · 2 · 3 · 4 · 5 · 6<br>Tu adoptes une <strong>position de combat classique</strong>, régulière et équilibrée.</div>
        </div>

        <div class="combat-rules-die-row">
          ${diePreview('blue')}
          <div><strong>Dé de défense</strong><br>0 · 1 · 2 · 3 · 4 · 5<br>Tu adoptes une <strong>position défensive</strong>. Ton attaque est moins puissante, mais en contrepartie tu absorbes <strong>1 point de dégâts à chaque échange perdu</strong>.</div>
        </div>

        <div class="combat-rules-die-row">
          ${diePreview('reaper')}
          <div><strong>Dé offensif</strong><br>1 · 1 · 3 · 3 · ☠ · ☠<br>Tu adoptes une <strong>attitude offensive</strong>, en prenant davantage de risques. Si ☠ apparaît, tu <strong>remportes automatiquement l’échange</strong>, quels que soient les dés adverses.</div>
        </div>

        <p>La Force aide à remporter l’échange mais ne modifie pas les dégâts. Tes dégâts sont de <strong>2 + la Puissance de ton arme</strong>. Les dégâts adverses sont indiqués sur leur fiche.</p>
      </div>`;
  }

  const start = story.start;
  if (start && !start.__prologueParityIcons) {
    const previousText = start.text;
    start.text = state => {
      let html = String(typeof previousText === 'function' ? previousText(state) : previousText || '');
      const icons = {
        'Vie': 'icon-vie',
        'Dextérité': 'icon-dexterite',
        'Force': 'icon-force',
        'Arme': 'icon-arme',
        'Protection': 'icon-protection',
        'Soldats': 'icon-special'
      };
      for (const [label, iconClass] of Object.entries(icons)) {
        html = html.replace(
          `<small>${label}</small>`,
          `<small><span class="tag-icon icon-jpg ${iconClass}" aria-hidden="true"></span><span class="tag-label">${label}</span></small>`
        );
      }
      return html;
    };
    start.__prologueParityIcons = true;
  }

  const rulesPage = story.startRules;
  if (rulesPage && !rulesPage.__prologueParityRules) {
    rulesPage.text = () => `
      <div class="hero-sheet">
        <div class="hero-characteristics" role="note">
          <div class="hero-info-title">Tests de caractéristiques</div>
          <p>Lorsque l’aventure te demande un test de <strong>Dextérité</strong> ou de <strong>Force</strong>, tu lances <strong>3 dés</strong>. Si leur total est <strong>inférieur ou égal</strong> à la caractéristique testée, le test est réussi. S’il est supérieur, le test échoue.</p>
        </div>

        <div class="combat-rules-card">
          <div class="combat-rules-title">Règles des combats</div>
          ${rulesHtml()}
        </div>

        <div class="hero-weapon">Au départ, tu portes un sabre court de marine · Puissance 4.</div>

        <div class="hero-characteristics" role="note">
          <div class="hero-info-title">Avant de commencer</div>
          <p>En bas de l’écran, tu peux consulter à tout moment tes caractéristiques, ton inventaire et ton journal de bord. Tu y retrouveras ton équipement ainsi que les objets découverts pendant l’aventure.</p>
          <p>Les combats de groupe avec tes soldats utilisent leurs propres règles, rappelées au moment où ils commencent.</p>
        </div>
      </div>`;
    rulesPage.__prologueParityRules = true;
  }

  if (!document.getElementById('providence-prologue-dice-book01-final')) {
    const style = document.createElement('style');
    style.id = 'providence-prologue-dice-book01-final';
    style.textContent = `
      .die-visual.combat-die-defense{background:#74828a!important;color:#f5f1e7!important}
      .die-visual.combat-die-defense .die-cell i{background:#f5f1e7!important}
      .die-visual.combat-die-offensive{background:#434649!important;color:#f7f1e7!important}
      .die-visual.combat-die-offensive .die-cell i{background:#f7f1e7!important}
      .die-visual.combat-die-skull{display:inline-flex!important;align-items:center!important;justify-content:center!important}
      .die-visual.combat-die-skull b{font-size:2rem!important;line-height:1!important;font-weight:900!important;color:#f7f1e7!important}
      .combat-rules-recap{line-height:1.45}
      .combat-rules-die-row{display:grid;grid-template-columns:52px 1fr;align-items:center;gap:12px;padding:11px 0;border-top:1px solid rgba(80,61,42,.22)}
    `;
    document.head.appendChild(style);
  }
})();
