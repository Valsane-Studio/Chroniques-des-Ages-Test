/* DEV — Prototype 3 du labyrinthe final : un seul jet, trois issues, puis sortie. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  if (!book?.story?.c209 || !book?.story?.c153) return;

  const VERSION = 3;
  const DIE = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

  function freshMaze() {
    return {
      version: VERSION,
      phase: 'roll',
      die: null,
      outcome: null,
      rewardGranted: false
    };
  }

  function maze(state) {
    state.flags = state.flags || {};
    if (!state.flags.mazePrototype || state.flags.mazePrototype.version !== VERSION) {
      state.flags.mazePrototype = freshMaze();
      state.flags.finalMazeTurns = 0;
      state.flags.finalMazeFound = false;
      state.flags.finalMazeLast = null;
      delete state.flags.finalMazeCombatActive;
    }
    return state.flags.mazePrototype;
  }

  function rollD6() {
    try {
      const a = new Uint32Array(1);
      crypto.getRandomValues(a);
      return (a[0] % 6) + 1;
    } catch (e) {
      return Math.floor(Math.random() * 6) + 1;
    }
  }

  function rollMaze(state) {
    const m = maze(state);
    if (m.die) return;
    m.die = rollD6();
    if (m.die >= 5) {
      m.outcome = 'direct';
      m.phase = 'resolved';
    } else if (m.die >= 3) {
      m.outcome = 'reward';
      m.phase = 'await-combat';
    } else {
      m.outcome = 'empty';
      m.phase = 'await-combat';
    }
  }

  function dieHtml(value) {
    return `<div class="maze-roll-card">
      <div class="maze-roll-die" aria-label="Résultat du dé : ${value}">${DIE[value] || value}</div>
      <div class="maze-roll-number">Résultat : <strong>${value}</strong></div>
    </div>`;
  }

  function introHtml() {
    return `<p>Tu franchis la porte et t’enfonces dans le labyrinthe. Les galeries se ressemblent au point que tu perds rapidement tout sens de l’orientation.</p>
      <p>Impossible de savoir si ton intuition te mène vers l’issue ou plus profondément encore sous la cité.</p>
      <p><strong>Lance un dé pour savoir ce que le dédale te réserve.</strong></p>`;
  }

  function outcomeHtml(state) {
    const m = maze(state);
    if (!m.die) return introHtml();

    if (m.outcome === 'direct') {
      return `${dieHtml(m.die)}
        <p>Après plusieurs détours, un souffle d’air plus froid glisse sur ton visage. Tu le suis entre deux piliers et découvres une ouverture que rien ne semblait annoncer.</p>
        <p><strong>Tu as trouvé l’issue sans rencontrer d’autre obstacle.</strong></p>`;
    }

    if (m.phase === 'post-combat' && m.outcome === 'reward') {
      return `${dieHtml(m.die)}
        <p>La créature gît maintenant au milieu de la salle. En fouillant les affaires abandonnées contre un mur, tu trouves un petit étui de cuir contenant <strong>deux lames de jet</strong>.</p>
        <p>Au fond de la pièce, un passage étroit laisse passer un courant d’air. Le labyrinthe touche enfin à sa fin.</p>
        <p><strong>Lames de jet : ${state.throwingBlades || 0}</strong></p>`;
    }

    if (m.phase === 'post-combat' && m.outcome === 'empty') {
      return `${dieHtml(m.die)}
        <p>La créature s’effondre. Tu fouilles rapidement la salle : pierres brisées, ossements secs, morceaux de tissu pourri… <strong>rien qui puisse t’être utile.</strong></p>
        <p>Derrière elle, un passage s’ouvre vers un air plus froid. Tu as perdu du temps et peut-être du sang, mais tu as enfin trouvé l’issue.</p>`;
    }

    if (m.outcome === 'reward') {
      return `${dieHtml(m.die)}
        <p>Tu tournes longtemps avant de déboucher dans une ancienne salle encombrée de débris. Des sacs éventrés et des objets rouillés jonchent le sol.</p>
        <p>Tu n’as pas le temps d’examiner davantage : une silhouette massive se redresse dans l’ombre et te barre le passage.</p>
        <p><strong>Il faudra combattre pour traverser la salle. Quelque chose d’utile semble avoir été abandonné ici.</strong></p>`;
    }

    return `${dieHtml(m.die)}
      <p>Les galeries te conduisent dans une salle nue aux murs noircis. Un bruit lourd résonne derrière toi.</p>
      <p>Une silhouette presque humaine s’avance et te coupe toute retraite.</p>
      <p><strong>Tu devras la vaincre pour continuer, mais la pièce ne semble rien contenir d’utile.</strong></p>`;
  }

  function beginMazeCombat(state) {
    const m = maze(state);
    state.flags.finalMazeCombatActive = m.outcome;
    state.combats = state.combats || {};
    delete state.combats.labyrinthWanderer;
    m.phase = 'combat';
  }

  function finishMazeCombat(state) {
    const m = maze(state);
    if (m.outcome === 'reward' && !m.rewardGranted) {
      state.throwingBlades = (state.throwingBlades || 0) + 2;
      state.inventory = state.inventory || {};
      state.inventory.lames_jet = {
        name: 'Lames de jet',
        description: 'De petites lames destinées à être lancées au visage pour gagner quelques secondes.',
        quantity: state.throwingBlades
      };
      m.rewardGranted = true;
    }
    delete state.flags.finalMazeCombatActive;
    m.phase = 'post-combat';
  }

  function markExit(state) {
    state.flags = state.flags || {};
    state.flags.finalMazeFound = true;
  }

  const mazeScene = book.story.c209;
  mazeScene.title = 'Le labyrinthe impossible';
  mazeScene.text = state => outcomeHtml(state);
  mazeScene.choices = state => {
    const m = maze(state);
    if (m.phase === 'roll') {
      return [{ label: 'Lancer le dé', stay: true, effect: rollMaze }];
    }
    if (m.outcome === 'direct') {
      return [{ label: 'Suivre le passage vers la faille', to: 'c223', effect: markExit }];
    }
    if (m.phase === 'await-combat') {
      return [{ label: 'Entrer dans la salle', to: 'c153', effect: beginMazeCombat }];
    }
    if (m.phase === 'post-combat') {
      return [{ label: 'Quitter le labyrinthe', to: 'c223', effect: markExit }];
    }
    return [];
  };

  // Réutilise le vrai moteur de combat du livre sans modifier les autres combats.
  const combatScene = book.story.c153;
  const originalCombatText = combatScene.text;
  const originalCombatChoices = combatScene.choices;

  combatScene.text = state => {
    if (!state.flags?.finalMazeCombatActive) {
      return typeof originalCombatText === 'function' ? originalCombatText(state) : originalCombatText;
    }
    const reward = state.flags.finalMazeCombatActive === 'reward';
    const intro = reward
      ? '<p>Tu avances entre les débris. La créature te fonce dessus avant que tu puisses atteindre les objets abandonnés au fond de la salle.</p>'
      : '<p>La salle est vide, mais la créature qui en garde le passage ne te laissera pas repartir sans combattre.</p>';
    const body = typeof originalCombatText === 'function' ? originalCombatText(state) : originalCombatText;
    return intro + body;
  };

  combatScene.choices = state => {
    if (!state.flags?.finalMazeCombatActive) {
      return typeof originalCombatChoices === 'function' ? originalCombatChoices(state) : originalCombatChoices;
    }

    if (state.hp <= 0) {
      return typeof originalCombatChoices === 'function' ? originalCombatChoices(state) : originalCombatChoices;
    }

    const fight = state.combats?.labyrinthWanderer;
    if (fight && fight.hp <= 0) {
      const reward = state.flags.finalMazeCombatActive === 'reward';
      return [{
        label: reward ? 'Fouiller la salle' : 'Quitter la salle',
        to: 'c209',
        effect: finishMazeCombat
      }];
    }

    return typeof originalCombatChoices === 'function' ? originalCombatChoices(state) : originalCombatChoices;
  };

  const style = document.createElement('style');
  style.id = 'maze-prototype-dev-style';
  style.textContent = `
    .maze-roll-card {
      margin: 22px auto;
      padding: 18px 20px;
      max-width: 260px;
      text-align: center;
      border: 1px solid rgba(117,84,47,.55);
      background: rgba(75,52,29,.07);
    }
    .maze-roll-die {
      font-size: 64px;
      line-height: 1;
      margin-bottom: 8px;
    }
    .maze-roll-number {
      font-size: 14px;
      letter-spacing: .04em;
    }
  `;
  document.head.appendChild(style);
})();
