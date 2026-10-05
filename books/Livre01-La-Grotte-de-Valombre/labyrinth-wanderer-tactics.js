/* Livre 01 — Errant du dédale : événement tactique après le premier échange. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const STORY = book?.story;
  const rules = book?.rules;
  if (!STORY || !rules) return;

  const KEY = 'labyrinthWanderer';
  const OLD_MAX_HP = 11;
  const MAX_HP = 15;
  const BASE_FORCE = 10;
  const BASE_DEX = 8;
  const ENEMY_DAMAGE = 2;
  const VERSION = 2;
  const SCENES = ['c153', 'c154', 'c156'];

  function d6() {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return (a[0] % 6) + 1;
  }

  function combat(state) {
    state.combats = state.combats || {};
    if (!state.combats[KEY]) {
      state.combats[KEY] = {
        hp: MAX_HP,
        round: 0,
        last: null,
        lastBlade: null,
        wandererHpVersion: VERSION
      };
    }
    const c = state.combats[KEY];
    if (!Number.isFinite(c.hp)) c.hp = MAX_HP;
    if (!Number.isInteger(c.round)) c.round = 0;

    if (c.wandererHpVersion !== VERSION) {
      if (c.hp > 0) c.hp = Math.min(MAX_HP, c.hp + (MAX_HP - OLD_MAX_HP));
      c.wandererHpVersion = VERSION;
    }
    return c;
  }

  function tactic(state) {
    const c = combat(state);
    const old = c.wandererTactic;
    if (!old || old.version !== VERSION) {
      c.wandererTactic = {
        version: VERSION,
        resolved: !!old?.resolved,
        choice: old?.choice || null,
        resultVisible: !!old?.resultVisible,
        forceModifier: Number(old?.forceModifier || 0),
        dexterityModifier: Number(old?.dexterityModifier || 0),
        armTest: old?.armTest || null,
        enemyDamage: Number(old?.enemyDamage || 0),
        heroDamage: Number(old?.heroDamage || 0)
      };
    }
    return c.wandererTactic;
  }

  function enemyForce(state) {
    return Math.max(0, BASE_FORCE + (tactic(state).forceModifier || 0));
  }

  function enemyDex(state) {
    return Math.max(0, BASE_DEX + (tactic(state).dexterityModifier || 0));
  }

  function eventPending(state) {
    const c = combat(state);
    const t = tactic(state);
    return state.hp > 0 && c.hp > 0 && c.round >= 1 && !t.resolved;
  }

  function heroWeaponPower(state) {
    if (!state.weapon || state.weapon === 'none') return 0;
    return Number(rules.combatPower?.(state) || 0);
  }

  function normalRound(state) {
    const c = combat(state);
    const t = tactic(state);
    if (state.hp <= 0 || c.hp <= 0) return;

    t.resultVisible = false;
    const heroDice = [d6(), d6()];
    const foeDice = [d6(), d6()];
    const heroDex = Number(rules.currentDexterity(state));
    const heroForce = Number(rules.currentForce(state));
    const foeDex = enemyDex(state);
    const foeForce = enemyForce(state);
    const heroAttack = heroDex + heroForce + heroDice[0] + heroDice[1];
    const enemyAttack = foeDex + foeForce + foeDice[0] + foeDice[1];
    const weaponPower = heroWeaponPower(state);
    const heroDamage = 2 + weaponPower;

    let outcome = 'tie';
    let damage = 0;
    let protectionAbsorbed = 0;
    let hpLost = 0;
    let protectionBefore = Number(rules.currentProtection?.(state) || 0);
    let protectionAfter = protectionBefore;

    if (heroAttack > enemyAttack) {
      outcome = 'hero';
      damage = heroDamage;
      c.hp = Math.max(0, c.hp - damage);
    } else if (heroAttack < enemyAttack) {
      outcome = 'enemy';
      damage = ENEMY_DAMAGE;
      const resolution = rules.applyDamage(state, ENEMY_DAMAGE);
      protectionAbsorbed = Number(resolution?.absorbed || 0);
      hpLost = Number(resolution?.hpLost || 0);
      protectionBefore = Number(resolution?.protectionBefore ?? protectionBefore);
      protectionAfter = Number(resolution?.protectionAfter ?? rules.currentProtection?.(state) ?? 0);
      if (hpLost > 0 && !c.contaminated) {
        rules.raiseContamination(state, 2);
        c.contaminated = true;
      }
    }

    c.round += 1;
    c.lastBlade = null;
    c.last = {
      round: c.round,
      heroDice,
      enemyDice: foeDice,
      heroDexterity: heroDex,
      enemyDexterity: foeDex,
      heroAttack,
      enemyAttack,
      heroForce,
      heroWeaponPower: weaponPower,
      heroDamage,
      enemyForce: foeForce,
      enemyWeaponPower: 0,
      enemyDamage: ENEMY_DAMAGE,
      damage,
      protectionAbsorbed,
      hpLost,
      protectionBefore,
      protectionAfter,
      outcome,
      heroHp: state.hp,
      enemyHp: c.hp
    };
    state.lastCombatKey = KEY;
    state.lastCombatOutcome = outcome;
  }

  function armRoll(state) {
    const dice = [d6(), d6(), d6()];
    const total = dice[0] + dice[1] + dice[2];
    const dexterity = Number(rules.currentDexterity(state));
    return { dice, total, dexterity, success: total <= dexterity };
  }

  function applyTactic(state, choice) {
    const c = combat(state);
    const t = tactic(state);
    if (t.resolved || state.hp <= 0 || c.hp <= 0) return;

    t.resolved = true;
    t.choice = choice;
    t.resultVisible = true;
    t.enemyDamage = 0;
    t.heroDamage = 0;
    c.last = null;
    c.lastBlade = null;

    if (choice === 'stone') {
      t.enemyDamage = Math.min(2, c.hp);
      c.hp = Math.max(0, c.hp - 2);
      t.forceModifier = 1;
    } else if (choice === 'charge') {
      t.heroDamage = Math.min(2, state.hp);
      state.hp = Math.max(0, state.hp - 2);
      t.enemyDamage = c.hp;
      c.hp = 0;
    } else if (choice === 'arm') {
      t.armTest = armRoll(state);
      if (t.armTest.success) {
        t.dexterityModifier = -4;
        t.forceModifier = -3;
      }
    }
  }

  function cardHtml(state) {
    const c = combat(state);
    return `<div class="enemy-card" aria-label="Fiche de l’adversaire">
      <div class="enemy-card-title">ERRANT DU DÉDALE</div>
      <div class="enemy-card-stats">
        <div><span class="enemy-icon">♥</span><span>Vie</span><strong>${c.hp} / ${MAX_HP}</strong></div>
        <div><span class="enemy-icon">◆</span><span>Dextérité</span><strong>${enemyDex(state)}</strong></div>
        <div><span class="enemy-icon">⚔</span><span>Force</span><strong>${enemyForce(state)}</strong></div>
        <div><span class="enemy-icon">†</span><span>Arme</span><strong>Aucune</strong></div>
        <div><span class="enemy-icon">✦</span><span>Dégâts</span><strong>${ENEMY_DAMAGE}</strong></div>
      </div>
    </div>`;
  }

  function promptHtml() {
    return `<section class="wanderer-tactic-event">
      <p><strong>L’Errant semble soudain agacé par ce combat.</strong> Il serre les poings et balaye l’espace devant lui avec une puissance dont le souffle te glace le sang.</p>
      <p>Tu n’as qu’un instant pour profiter de l’ouverture créée par ses mouvements.</p>
    </section>`;
  }

  function resultHtml(state) {
    const c = combat(state);
    const t = tactic(state);
    if (!t.resolved || !t.resultVisible) return '';

    let html = '';
    if (t.choice === 'stone') {
      html = `<p>Tu recules vivement, arraches une pierre au sol et la projettes de toutes tes forces.</p>
        <p>Elle frappe le côté de son crâne et lui arrache violemment un morceau de chair. <strong>L’Errant perd 2 points de Vie.</strong></p>
        <p>Mais la douleur ne fait que décupler sa rage. Ses épaules se contractent et ses coups deviennent encore plus lourds. <strong>Force +1.</strong></p>`;
    } else if (t.choice === 'charge') {
      html = `<p>Tu fonces, l’épée pointée vers son abdomen.</p>
        <p>Tu ne peux pas totalement esquiver ses mouvements : un poing te percute de plein fouet au moment où ta lame s’enfonce dans son ventre.</p>
        <p>La chair cède presque comme du papier. Tu poursuis le mouvement jusqu’à l’abattre. <strong>Tu perds 2 points de Vie, mais l’Errant est tué.</strong></p>`;
    } else if (t.choice === 'arm') {
      const r = t.armTest;
      html = `<p>Tu attends le passage de son bras et frappes au moment où son mouvement l’emporte.</p>
        <p><strong>Test de Dextérité :</strong> ${r.dice.join(' + ')} = ${r.total} · Dextérité ${r.dexterity}.</p>
        ${r.success
          ? `<p><strong>Réussite.</strong> Ta lame tranche le bras net. L’Errant ne semble même pas comprendre ce qui vient de se produire et poursuit sa charge comme si son membre était encore là.</p>
             <p>Son équilibre et sa puissance sont pourtant profondément diminués. <strong>Dextérité −4 · Force −3 pour le reste du combat.</strong></p>`
          : `<p><strong>Échec.</strong> Sa gestuelle chaotique te force à retirer ta lame avant de pouvoir frapper. Tu retrouves ta garde : le combat continue normalement.</p>`}`;
    }

    const end = c.hp <= 0
      ? '<p><strong>La masse s’effondre et ne se relève plus.</strong></p>'
      : state.hp <= 0
        ? '<p>Le choc te coupe les jambes. Tu t’effondres à ton tour.</p>'
        : '<p>L’Errant se remet face à toi. Le combat reprend.</p>';

    return `${cardHtml(state)}<section class="wanderer-tactic-result">${html}${end}</section>`;
  }

  function renderOriginalText(state, originalText) {
    const c = combat(state);
    const hpBefore = c.hp;
    const html = typeof originalText === 'function' ? originalText(state) : originalText;
    c.hp = hpBefore;
    return html;
  }

  function patchCard(html, state) {
    if (!html) return html;
    const c = combat(state);
    return String(html)
      .replace(/(<span>Vie<\/span><strong>)[^<]*(<\/strong>)/, `$1${c.hp} / ${MAX_HP}$2`)
      .replace(/(Vie adverse\s*:\s*<strong>)[^<]*(<\/strong>)/g, `$1${c.hp} / ${MAX_HP}$2`)
      .replace(/(<span>Dextérité<\/span><strong>)[^<]*(<\/strong>)/, `$1${enemyDex(state)}$2`)
      .replace(/(<span>Force<\/span><strong>)[^<]*(<\/strong>)/, `$1${enemyForce(state)}$2`);
  }

  function originalChoicesPreservingHp(state, originalChoices) {
    const c = combat(state);
    const hpBefore = c.hp;
    const base = typeof originalChoices === 'function' ? (originalChoices(state) || []) : (originalChoices || []);
    c.hp = hpBefore;
    return base;
  }

  function bladeChoices(state, originalChoices) {
    const base = originalChoicesPreservingHp(state, originalChoices);
    return base
      .filter(ch => ch && /lame de jet/i.test(ch.label || '') && typeof ch.effect === 'function')
      .map(ch => {
        const oldEffect = ch.effect;
        return {
          ...ch,
          effect: s => {
            const c = combat(s);
            const before = c.hp;
            tactic(s).resultVisible = false;
            oldEffect(s);
            const blade = c.lastBlade;
            const dealt = blade?.success ? Math.min(2, before) : 0;
            c.hp = Math.max(0, before - dealt);
            c.wandererHpVersion = VERSION;
            if (blade) {
              blade.damage = dealt;
              blade.enemyHp = c.hp;
            }
          }
        };
      });
  }

  function combatChoices(state, originalChoices) {
    const c = combat(state);
    return [{
      label: c.round === 0 ? 'Jeter les dés' : 'Jeter les dés — tour suivant',
      stay: true,
      inlineCombat: true,
      effect: normalRound
    }, ...bladeChoices(state, originalChoices)];
  }

  for (const id of SCENES) {
    const scene = STORY[id];
    if (!scene || scene.__wandererTacticsV2) continue;
    const originalText = scene.text;
    const originalChoices = scene.choices;

    scene.text = state => {
      const c = combat(state);
      const t = tactic(state);

      if (t.resolved && t.resultVisible) return resultHtml(state);

      const base = renderOriginalText(state, originalText);
      const patched = patchCard(base, state);
      if (eventPending(state)) return `${patched || ''}${promptHtml()}`;
      return patched;
    };

    scene.choices = state => {
      const c = combat(state);
      const t = tactic(state);
      const base = originalChoicesPreservingHp(state, originalChoices);

      if (state.hp <= 0 || c.hp <= 0) return base;

      if (eventPending(state)) {
        return [
          { label:'Reculer rapidement, ramasser une pierre et la lui jeter', stay:true, inlineCombat:true, effect:s=>applyTactic(s,'stone') },
          { label:'Foncer, l’épée en avant, vers son abdomen', stay:true, inlineCombat:true, effect:s=>applyTactic(s,'charge') },
          { label:'Tenter de trancher un bras pendant ses mouvements — test de Dextérité', stay:true, inlineCombat:true, diceTest:true, effect:s=>applyTactic(s,'arm') }
        ];
      }

      return combatChoices(state, originalChoices);
    };

    scene.__wandererTacticsV2 = true;
  }

  const style = document.createElement('style');
  style.id = 'labyrinth-wanderer-tactics-style';
  style.textContent = `
    .wanderer-tactic-event,
    .wanderer-tactic-result {
      margin: 18px 0 12px;
      padding: 14px 16px;
      border-left: 3px solid rgba(92, 62, 34, .72);
      background: rgba(73, 48, 27, .07);
    }
    .wanderer-tactic-event p,
    .wanderer-tactic-result p { margin: 7px 0; }
  `;
  document.head.appendChild(style);
})();
