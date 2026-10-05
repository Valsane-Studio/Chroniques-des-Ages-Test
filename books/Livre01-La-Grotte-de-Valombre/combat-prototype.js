/* DEV — Prototype combat interactif : événement technique unique de la Masse dans l’ombre, page 26. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const scene = book?.story?.c26;
  if (!scene) return;

  const VERSION = 3;
  const KEY = 'shadowMass';
  const MAX_HP = 8;

  const originalText = scene.text;
  const originalChoices = scene.choices;

  function combat(state) {
    // Les choix d’origine initialisent normalement le combat via book.js.
    if (!state.combats?.[KEY]) {
      try { if (typeof originalChoices === 'function') originalChoices(state); } catch (e) {}
    }
    if (!state.combats) state.combats = {};
    if (!state.combats[KEY]) state.combats[KEY] = { hp: MAX_HP, round: 0, last: null, lastBlade: null };
    return state.combats[KEY];
  }

  function normalWeaponDamage(state) {
    // Même formule que le combat normal du Livre 01 : 2 dégâts de base + puissance de l’arme.
    const power =
      state.weapon === 'heavy' ? 5 :
      state.weapon === 'light' ? 2 :
      state.weapon === 'black_blade' ? 6 :
      state.weapon === 'sorcerer_sword' ? 8 : 0;
    return 2 + power;
  }

  function tech(state) {
    const c = combat(state);
    if (!c.shadowMassTechnique || c.shadowMassTechnique.version !== VERSION) {
      c.shadowMassTechnique = {
        version: VERSION,
        resolved: false,
        choice: null,
        enemyDamage: 0,
        heroDamage: 0,
        baseWeaponDamage: 0,
        bonusDamage: 0,
        resultVisible: false
      };
    }
    return c.shadowMassTechnique;
  }

  function eventIsPending(state) {
    const c = combat(state);
    const t = tech(state);
    return state.hp > 0 && c.hp > 0 && c.round >= 1 && !t.resolved;
  }

  function applyTechnique(state, choice) {
    const c = combat(state);
    const t = tech(state);
    if (t.resolved || state.hp <= 0 || c.hp <= 0) return;

    const baseWeaponDamage = normalWeaponDamage(state);
    let enemyDamage = 0;
    let heroDamage = 0;
    let bonusDamage = 0;

    if (choice === 'dodge') {
      // L’arme n’intervient pas : c’est la collision contre la roche qui blesse la créature.
      enemyDamage = 2;
    } else if (choice === 'brace') {
      bonusDamage = 2;
      enemyDamage = baseWeaponDamage + bonusDamage;
      heroDamage = 1;
    } else if (choice === 'lateral') {
      bonusDamage = 1;
      enemyDamage = baseWeaponDamage + bonusDamage;
    }

    c.hp = Math.max(0, c.hp - enemyDamage);
    state.hp = Math.max(0, state.hp - heroDamage);

    t.resolved = true;
    t.choice = choice;
    t.enemyDamage = enemyDamage;
    t.heroDamage = heroDamage;
    t.baseWeaponDamage = baseWeaponDamage;
    t.bonusDamage = bonusDamage;
    t.resultVisible = true;
  }

  function eventPromptHtml() {
    return `
      <section class="shadow-tech-event" aria-label="Moment technique du combat">
        <div class="shadow-tech-kicker">La créature change de comportement</div>
        <p>La masse s’immobilise une fraction de seconde.</p>
        <p>Puis son corps se tasse vers l’avant. Ses épaules s’abaissent, ses jambes se contractent.</p>
        <p><strong>Elle semble chercher à se jeter sur toi de tout son poids.</strong></p>
      </section>`;
  }

  function resultHtml(state) {
    const c = combat(state);
    const t = tech(state);
    if (!t.resolved || !t.resultVisible) return '';

    let text = '';
    if (t.choice === 'dodge') {
      text = `
        <p>Tu te jettes sur le côté au dernier instant.</p>
        <p>La masse passe devant toi et percute la paroi de plein fouet. La roche tremble sous le choc. Quand elle se redresse, son épaule pend plus bas qu’avant.</p>
        <p><strong>La Masse dans l’ombre perd 2 points de Vie.</strong></p>`;
    } else if (t.choice === 'brace') {
      text = `
        <p>Tu plantes tes appuis et tends ton épée droit devant toi.</p>
        <p>La masse vient s’empaler sur la lame sans ralentir. Le choc t’arrache du sol et te projette brutalement contre la paroi.</p>
        <p><strong>Ton arme inflige ses ${t.baseWeaponDamage} dégâts habituels, auxquels s’ajoutent 2 dégâts bonus : la Masse dans l’ombre perd ${t.enemyDamage} points de Vie. La violence du choc te projette contre la paroi : tu perds 1 point de Vie.</strong></p>`;
    } else if (t.choice === 'lateral') {
      text = `
        <p>Tu attends qu’elle soit presque sur toi et frappes de toutes tes forces sur le côté.</p>
        <p>La lame mord profondément dans son cou. La masse dévie dans son élan, trébuche et s’écrase lourdement au sol.</p>
        <p><strong>Ton arme inflige ses ${t.baseWeaponDamage} dégâts habituels, auxquels s’ajoute 1 dégât bonus : la Masse dans l’ombre perd ${t.enemyDamage} points de Vie.</strong></p>`;
    }

    const end = c.hp <= 0
      ? '<p><strong>Cette fois, elle ne se relève pas.</strong></p>'
      : state.hp <= 0
        ? '<p>Le choc est trop violent. Tes jambes cèdent sous toi.</p>'
        : '<p>Elle se remet pourtant en mouvement. Le combat reprend.</p>';

    return `
      <section class="shadow-tech-result">
        ${text}
        <p class="shadow-tech-life">Ta Vie : <strong>${state.hp}</strong> · Vie adverse : <strong>${c.hp} / ${MAX_HP}</strong></p>
        ${end}
      </section>`;
  }

  function wrapNormalChoices(state, base) {
    return (base || []).map(choice => {
      if (!choice || typeof choice.effect !== 'function') return choice;
      if (!choice.inlineCombat && !/lame de jet/i.test(choice.label || '')) return choice;
      const originalEffect = choice.effect;
      return {
        ...choice,
        effect: s => {
          const current = tech(s);
          current.resultVisible = false;
          originalEffect(s);
        }
      };
    });
  }

  scene.text = state => {
    const c = combat(state);
    const t = tech(state);

    if (t.resolved && t.resultVisible) {
      return resultHtml(state);
    }

    const base = typeof originalText === 'function' ? originalText(state) : originalText;

    if (eventIsPending(state)) {
      return `${base}${eventPromptHtml()}`;
    }

    return base;
  };

  scene.choices = state => {
    const c = combat(state);
    const base = typeof originalChoices === 'function' ? originalChoices(state) : (originalChoices || []);

    if (state.hp <= 0 || c.hp <= 0) return base;

    if (eventIsPending(state)) {
      return [
        {
          label: 'Te jeter sur le côté pour esquiver',
          stay: true,
          inlineCombat: true,
          effect: s => applyTechnique(s, 'dodge')
        },
        {
          label: 'Tendre ton épée face à toi et tenir ta position',
          stay: true,
          inlineCombat: true,
          effect: s => applyTechnique(s, 'brace')
        },
        {
          label: 'Frapper de toutes tes forces latéralement',
          stay: true,
          inlineCombat: true,
          effect: s => applyTechnique(s, 'lateral')
        }
      ];
    }

    return wrapNormalChoices(state, base);
  };

  const style = document.createElement('style');
  style.id = 'interactive-combat-shadowmass-dev-style';
  style.textContent = `
    .shadow-tech-event,
    .shadow-tech-result {
      margin: 18px 0 12px;
      padding: 14px 16px;
      border-left: 3px solid rgba(92, 62, 34, .72);
      background: rgba(73, 48, 27, .07);
    }
    .shadow-tech-event p,
    .shadow-tech-result p { margin: 7px 0; }
    .shadow-tech-kicker {
      margin-bottom: 7px;
      font-size: 11px;
      letter-spacing: .11em;
      text-transform: uppercase;
      opacity: .62;
    }
    .shadow-tech-life {
      margin-top: 12px !important;
      padding-top: 9px;
      border-top: 1px solid rgba(92, 62, 34, .25);
      font-size: 1.05em;
      line-height: 1.45;
      opacity: .9;
    }

    /* DEV — le résultat d'un échange doit être immédiatement lisible. */
    .combat-roll-result .combat-outcome {
      margin-top: 18px;
      padding: 15px 17px;
      border-left: 3px solid rgba(92, 62, 34, .72);
      background: rgba(73, 48, 27, .075);
      font-size: clamp(1.05rem, 2.2vw, 1.22rem);
      line-height: 1.55;
    }
    .combat-roll-result .combat-outcome > strong:first-child {
      font-size: 1.18em;
      line-height: 1.3;
    }
    .combat-roll-result .combat-detail {
      font-size: .82em;
      opacity: .76;
    }
    .combat-roll-result .combat-life-line {
      margin-top: 11px;
      padding: 12px 14px;
      border-top: 1px solid rgba(92, 62, 34, .28);
      font-size: clamp(1rem, 2vw, 1.12rem);
      line-height: 1.45;
      font-weight: 500;
    }
    .combat-roll-result .combat-life-line strong {
      font-size: 1.08em;
    }
    .shadow-tech-result p > strong {
      font-size: 1.08em;
      line-height: 1.45;
    }
  `;
  document.head.appendChild(style);
})();
