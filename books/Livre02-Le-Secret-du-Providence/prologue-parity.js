/* Livre 02 — Prologue : parité avec le Livre 01.
   Ajoute les icônes de caractéristiques et rappelle les règles communes,
   notamment les tests, les combats et le choix du deuxième dé. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('providence-02');
  const story = book?.story;
  if (!story) return;

  /* Reprend strictement le composant de dés du Livre 01. */
  function dieIcon(type) {
    if (type === 'reaper') {
      return '<span class="combat-die-icon combat-die-icon-reaper" aria-hidden="true"><b>☠</b></span>';
    }
    return `<span class="combat-die-icon combat-die-icon-${type}" aria-hidden="true"><i></i><i></i><i></i><i></i></span>`;
  }

  if (!document.getElementById('providence-prologue-dice-visuals')) {
    const style = document.createElement('style');
    style.id = 'providence-prologue-dice-visuals';
    style.textContent = `
      .combat-die-icon{
        width:1.35em;height:1.35em;display:inline-grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);
        vertical-align:-.28em;margin-right:.28em;border-radius:.28em;border:1px solid rgba(0,0,0,.45);box-shadow:inset 0 0 0 1px rgba(255,255,255,.18),0 1px 2px rgba(0,0,0,.25);position:relative;
      }
      .combat-die-icon-white{background:#d8b54f}
      .combat-die-icon-blue{background:#315f8d}
      .combat-die-icon-reaper{background:#171717;color:#f2eee3;display:inline-flex;align-items:center;justify-content:center;font-size:.9em}
      .combat-die-icon i{width:.22em;height:.22em;border-radius:50%;background:#20180c;align-self:center;justify-self:center}
      .combat-die-icon-blue i{background:#f5f1e7}
      .combat-die-icon i:nth-child(1){grid-column:1;grid-row:1}
      .combat-die-icon i:nth-child(2){grid-column:3;grid-row:1}
      .combat-die-icon i:nth-child(3){grid-column:1;grid-row:3}
      .combat-die-icon i:nth-child(4){grid-column:3;grid-row:3}
      .combat-die-icon-reaper b{font-size:.82em;line-height:1;font-weight:700}
      .combat-dice-rules-v2 p{margin:.75rem 0}
      .combat-dice-rules-v2 .combat-die-icon{font-size:1.1em}
    `;
    document.head.appendChild(style);
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

        <div class="combat-rules-card combat-dice-rules-v2">
          <div class="combat-rules-title">Règles des combats individuels</div>
          <p><strong>Toi et ton adversaire lancez chacun 2 dés</strong> et ajoutez votre <strong>Dextérité + Force</strong>. Le meilleur score remporte l’échange. En cas d’égalité, personne n’est blessé.</p>
          <p>Ton <strong>premier dé est toujours le dé classique</strong>. Pour le deuxième dé, tu choisis ta manière de combattre depuis l’inventaire, et tu peux la changer entre deux échanges :</p>
          <p><strong>${dieIcon('white')} Dé classique</strong> — 1 · 2 · 3 · 4 · 5 · 6<br>Régulier et équilibré.</p>
          <p><strong>${dieIcon('blue')} Dé de défense</strong> — 0 · 1 · 2 · 3 · 4 · 5<br>Si l’adversaire remporte l’échange, il annule <strong>1 point de dégâts</strong> avant ta protection.</p>
          <p><strong>${dieIcon('reaper')} Dé offensif</strong> — 1 · 1 · 3 · 3 · ☠ · ☠<br>Si ☠ apparaît, tu <strong>remportes automatiquement l’échange</strong>. Tu infliges ensuite tes dégâts normaux.</p>
          <p>La <strong>Force</strong> aide à remporter l’échange mais ne modifie pas les dégâts. Tes dégâts sont de <strong>2 + la Puissance de ton arme</strong>. Les dégâts adverses sont indiqués pendant le combat.</p>
          <p>Ta <strong>Protection</strong> absorbe les dégâts avant qu’ils ne retirent des points de Vie.</p>
          <p><em>Les combats de groupe avec tes soldats utilisent leurs propres règles, qui sont rappelées au moment où ils commencent.</em></p>
        </div>

        <div class="hero-weapon">Au départ, tu portes un sabre court de marine · Puissance 4.</div>

        <div class="hero-characteristics" role="note">
          <div class="hero-info-title">Pendant l’aventure</div>
          <p>En bas de l’écran, tu peux consulter à tout moment tes caractéristiques, ton inventaire et ton journal de bord. L’inventaire contient aussi le rappel des règles de combat et le choix de ton deuxième dé.</p>
          <p>Chaque chemin révèle une partie du mystère. Pour en percer tous les secrets, il te faudra peut-être vivre l’aventure plusieurs fois…</p>
        </div>
      </div>`;
    rulesPage.__prologueParityRules = true;
  }
})();
