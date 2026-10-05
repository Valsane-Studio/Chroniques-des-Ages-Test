/* Livre 01 — choix du deuxième dé de combat.
   1 dé blanc est toujours obligatoire. Le second est sélectionnable depuis l'inventaire :
   blanc 1–6, défense bleu 0–5 +1 défense, Faucheuse 1/1/3/3/☠/☠.
*/
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const STORY = book?.story;
  const rules = book?.rules || {};
  const inventory = book?.inventory;
  if (!book || !STORY || !inventory) return;

  const VERSION = 1;
  const VALID = new Set(['white','blue','reaper']);
  const NO_CONTAMINATION = new Set(['reserveRat']);

  function d6() {
    const a = new Uint32Array(1);
    if (window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(a);
      return (a[0] % 6) + 1;
    }
    return Math.floor(Math.random() * 6) + 1;
  }

  function clone(value) {
    if (typeof structuredClone === 'function') {
      try { return structuredClone(value); } catch (_) {}
    }
    return JSON.parse(JSON.stringify(value));
  }

  function dieType(state) {
    return VALID.has(state.combatSecondDie) ? state.combatSecondDie : 'white';
  }

  function ensureDie(state) {
    if (!VALID.has(state.combatSecondDie)) state.combatSecondDie = 'white';
    return state.combatSecondDie;
  }

  function dieName(type) {
    return type === 'blue' ? 'Dé de défense' : type === 'reaper' ? 'Dé de la Faucheuse' : 'Dé blanc';
  }

  function rollSecond(type) {
    if (type === 'blue') {
      const value = d6() - 1;
      return { type, value, display:String(value), defense:1, skull:false };
    }
    if (type === 'reaper') {
      const face = d6();
      if (face >= 5) return { type, value:0, display:'☠', defense:0, skull:true };
      const value = face <= 2 ? 1 : 3;
      return { type, value, display:String(value), defense:0, skull:false };
    }
    const value = d6();
    return { type:'white', value, display:String(value), defense:0, skull:false };
  }

  function selectionCard(state) {
    const type = ensureDie(state);
    const button = (id, label, detail) => `<button class="inventory-action-btn combat-die-select ${type===id?'combat-die-selected':''}" data-action="combat-second-die:${id}" ${type===id?'aria-pressed="true"':'aria-pressed="false"'}><strong>${label}</strong><small>${detail}</small></button>`;
    return `<div class="inventory-equipment-card combat-die-inventory-card">
      <div class="inventory-equipment-title">Deuxième dé de combat</div>
      <p>Le premier dé reste toujours blanc. Tu peux changer le second à tout moment, y compris entre deux échanges.</p>
      <div class="inventory-actions combat-die-options">
        ${button('white','⚪ Blanc','1 · 2 · 3 · 4 · 5 · 6')}
        ${button('blue','🔵 Défense','0 · 1 · 2 · 3 · 4 · 5  ·  +1 défense')}
        ${button('reaper','⚫ Faucheuse','1 · 1 · 3 · 3 · ☠ · ☠')}
      </div>
      <p><strong>Actuel : ${dieName(type)}</strong>${type==='reaper'?' · ☠ remporte automatiquement l’échange.':''}${type==='blue'?' · Si l’adversaire gagne, 1 dégât est annulé avant la protection.':''}</p>
    </div>`;
  }

  const previousExtraHtml = typeof inventory.extraHtml === 'function' ? inventory.extraHtml.bind(inventory) : null;
  inventory.extraHtml = state => selectionCard(state) + (previousExtraHtml ? previousExtraHtml(state) : '');

  const previousHandleAction = typeof inventory.handleAction === 'function' ? inventory.handleAction.bind(inventory) : null;
  inventory.handleAction = function (action, state, api) {
    if (typeof action === 'string' && action.startsWith('combat-second-die:')) {
      const next = action.slice('combat-second-die:'.length);
      if (VALID.has(next)) state.combatSecondDie = next;
      api?.saveState?.();
      api?.render?.();
      api?.openInventory?.();
      return true;
    }
    return previousHandleAction ? previousHandleAction(action, state, api) : false;
  };

  for (const scene of Object.values(STORY)) {
    if (!scene || scene.number !== 'RÈGLES DU JEU') continue;
    const originalText = scene.text;
    scene.text = state => {
      const html = typeof originalText === 'function' ? originalText(state) : originalText;
      const rulesHtml = `<p><strong>Combats :</strong> ton personnage et l’adversaire ajoutent leur Dextérité, leur Force et leurs dés. Le meilleur score remporte l’échange. En cas d’égalité, personne n’est blessé.<br><br>
        Tu lances toujours <strong>un premier dé blanc</strong> classique (1 à 6). Pour le deuxième dé, tu choisis ta manière de combattre :<br>
        <strong>⚪ Dé blanc</strong> — 1 · 2 · 3 · 4 · 5 · 6 : régulier et équilibré.<br>
        <strong>🔵 Dé de défense</strong> — 0 · 1 · 2 · 3 · 4 · 5 : sa valeur s’ajoute normalement à ton attaque et, si l’adversaire remporte l’échange, il annule <strong>1 point de dégâts</strong> avant ta protection.<br>
        <strong>⚫ Dé de la Faucheuse</strong> — 1 · 1 · 3 · 3 · ☠ · ☠ : si ☠ apparaît, tu <strong>remportes automatiquement l’échange</strong>, quels que soient les dés adverses. Tu infliges alors tes dégâts normaux.<br><br>
        Tu peux <strong>changer ton deuxième dé à tout moment depuis l’inventaire</strong>, même entre deux échanges d’un même combat.<br><br>
        La Force aide à remporter l’échange, mais ne modifie pas les dégâts. Tes dégâts sont de <strong>2 + la Puissance de ton arme</strong> si tu en possèdes une. Les dégâts adverses sont indiqués sur leur fiche.</p>`;
      return String(html || '').replace(/<p><strong>Combats :<\/strong>[\s\S]*?<\/p>/, rulesHtml);
    };
    break;
  }

  function priorEnemyHp(realState, key, simulatedCombat, last) {
    const existing = realState.combats?.[key];
    if (existing && Number.isFinite(existing.hp)) return existing.hp;
    if (last?.outcome === 'hero') return Math.max(0, Number(simulatedCombat.hp || 0) + Number(last.damage || last.heroDamage || 0));
    return Number(simulatedCombat.hp || last?.enemyHp || 0);
  }

  function applySelectedCombatRoll(state, originalEffect) {
    const simulated = clone(state);
    originalEffect(simulated);
    const key = simulated.lastCombatKey;
    const simCombat = key && simulated.combats?.[key];
    const simLast = simCombat?.last;
    if (!key || !simCombat || !simLast || !Array.isArray(simLast.enemyDice) || !Number.isFinite(simLast.enemyAttack)) {
      originalEffect(state);
      return;
    }

    ensureDie(state);
    state.combats = state.combats || {};
    const current = state.combats[key] || {};
    const hpBefore = priorEnemyHp(state, key, simCombat, simLast);
    const contaminatedBefore = !!current.contaminated;
    const combat = clone(simCombat);
    combat.hp = hpBefore;
    combat.contaminated = contaminatedBefore;
    combat.lastBlade = null;

    const firstWhite = d6();
    const second = rollSecond(dieType(state));
    const heroDexterity = Number(rules.currentDexterity?.(state) ?? simLast.heroDexterity ?? 0);
    const heroForce = Number(rules.currentForce?.(state) ?? simLast.heroForce ?? 0);
    const enemyDexterity = Number(simLast.enemyDexterity || 0);
    const enemyForce = Number(simLast.enemyForce || 0);
    const enemyDice = [...simLast.enemyDice];
    const enemyAttack = enemyDexterity + enemyForce + enemyDice.reduce((a,b)=>a+Number(b||0),0);
    const naturalHeroAttack = heroDexterity + heroForce + firstWhite + second.value;
    const heroDamage = Number(simLast.heroDamage || (2 + Number(rules.combatPower?.(state) || 0)));
    const originalEnemyDamage = Number(simLast.enemyDamage || simLast.damage || 0);

    let outcome = 'tie';
    if (second.skull || naturalHeroAttack > enemyAttack) outcome = 'hero';
    else if (naturalHeroAttack < enemyAttack) outcome = 'enemy';

    let damage = 0;
    let protectionAbsorbed = 0;
    let hpLost = 0;
    let protectionBefore = Number(rules.currentProtection?.(state) || 0);
    let protectionAfter = protectionBefore;
    let bluePrevented = 0;

    if (outcome === 'hero') {
      damage = heroDamage;
      combat.hp = Math.max(0, hpBefore - heroDamage);
    } else if (outcome === 'enemy') {
      let incoming = originalEnemyDamage;
      if (second.type === 'blue' && incoming > 0) {
        incoming = Math.max(0, incoming - 1);
        bluePrevented = originalEnemyDamage - incoming;
      }
      damage = incoming;
      const resolution = typeof rules.applyDamage === 'function'
        ? rules.applyDamage(state, incoming)
        : { absorbed:0, hpLost:incoming, protectionBefore, protectionAfter };
      protectionAbsorbed = Number(resolution?.absorbed || 0);
      hpLost = Number(resolution?.hpLost || 0);
      protectionBefore = Number(resolution?.protectionBefore ?? protectionBefore);
      protectionAfter = Number(resolution?.protectionAfter ?? rules.currentProtection?.(state) ?? 0);
      if (hpLost > 0 && !combat.contaminated && !NO_CONTAMINATION.has(key)) {
        rules.raiseContamination?.(state, 2);
        combat.contaminated = true;
      }
    }

    const round = Number(simCombat.round || current.round || 0);
    combat.last = {
      ...simLast,
      round,
      heroDice:[firstWhite, second.value],
      enemyDice,
      heroDexterity,
      enemyDexterity,
      heroForce,
      enemyForce,
      heroAttack:naturalHeroAttack,
      enemyAttack,
      heroDamage,
      enemyDamage:originalEnemyDamage,
      damage,
      protectionAbsorbed,
      hpLost,
      protectionBefore,
      protectionAfter,
      outcome,
      heroHp:state.hp,
      enemyHp:combat.hp,
      combatDiceVersion:VERSION,
      secondDieType:second.type,
      secondDieDisplay:second.display,
      secondDieValue:second.value,
      reaperSkull:second.skull,
      blueDefensePrevented:bluePrevented
    };

    state.combats[key] = combat;
    state.lastCombatKey = key;
    state.lastCombatOutcome = outcome;
  }

  function decorateCombatHtml(html, state) {
    if (!html || !state.lastCombatKey) return html;
    const last = state.combats?.[state.lastCombatKey]?.last;
    if (!last || last.combatDiceVersion !== VERSION || !String(html).includes('combat-roll-result')) return html;

    const type = last.secondDieType || 'white';
    const first = Number(last.heroDice?.[0] || 0);
    const second = last.reaperSkull ? '☠' : String(last.secondDieDisplay ?? last.heroDice?.[1] ?? '');
    const secondClass = type === 'blue' ? 'blue' : type === 'reaper' ? 'reaper' : 'white';
    const secondSuffix = type === 'blue' ? '<small>+1</small>' : '';
    const dice = `<div class="combat-dice combat-dice-custom"><span class="combat-choice-die white">${first}</span><span class="combat-choice-die ${secondClass}">${second}${secondSuffix}</span></div>`;

    let result = String(html).replace(/(<div class="combat-side">\s*<strong>TOI<\/strong>)\s*<div class="combat-dice">[\s\S]*?<\/div>/, `$1${dice}`);
    if (last.reaperSkull) {
      result = result.replace(/(<div class="combat-side">\s*<strong>TOI<\/strong>[\s\S]*?)<p class="combat-total">Attaque : <strong>[^<]*<\/strong><\/p>/, `$1<p class="combat-total"><strong>☠ ÉCHANGE REMPORTÉ</strong></p>`);
    }

    const note = last.reaperSkull
      ? '<div class="combat-die-effect reaper"><strong>☠ Faucheuse :</strong> l’échange est remporté automatiquement. Les dégâts restent normaux.</div>'
      : type === 'blue'
        ? `<div class="combat-die-effect blue"><strong>🔵 Défense :</strong> résultat ${second}. ${last.blueDefensePrevented ? '<strong>1 dégât annulé.</strong>' : 'Le bonus défensif ne s’applique que si l’adversaire remporte l’échange.'}</div>`
        : '<div class="combat-die-effect white"><strong>⚪ Deuxième dé blanc.</strong></div>';
    return result + note;
  }

  for (const scene of Object.values(STORY)) {
    if (!scene || scene.__combatDiceChoiceV1) continue;
    if (typeof scene.text === 'function') {
      const previousText = scene.text;
      scene.text = state => decorateCombatHtml(previousText(state), state);
    }
    const previousChoices = scene.choices;
    if (typeof previousChoices === 'function') {
      scene.choices = state => {
        const list = previousChoices(state) || [];
        return list.map(choice => {
          if (!choice || !choice.inlineCombat || typeof choice.effect !== 'function' || !/^Jeter les dés/i.test(choice.label || '')) return choice;
          const originalEffect = choice.effect;
          return { ...choice, effect:s => applySelectedCombatRoll(s, originalEffect) };
        });
      };
    } else if (Array.isArray(previousChoices)) {
      scene.choices = previousChoices.map(choice => {
        if (!choice || !choice.inlineCombat || typeof choice.effect !== 'function' || !/^Jeter les dés/i.test(choice.label || '')) return choice;
        const originalEffect = choice.effect;
        return { ...choice, effect:s => applySelectedCombatRoll(s, originalEffect) };
      });
    }
    scene.__combatDiceChoiceV1 = true;
  }

  const style = document.createElement('style');
  style.textContent = `
    .combat-die-options{display:grid;gap:.55rem}.combat-die-select{display:flex;flex-direction:column;align-items:flex-start;gap:.15rem}.combat-die-select small{opacity:.8}.combat-die-selected{outline:2px solid currentColor;outline-offset:2px}
    .combat-dice-custom{gap:.55rem}.combat-choice-die{width:2.7rem;height:2.7rem;border-radius:.55rem;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:1.15rem;box-shadow:inset 0 0 0 1px rgba(0,0,0,.28),0 2px 5px rgba(0,0,0,.25)}
    .combat-choice-die.white{background:#f4f1e8;color:#171717}.combat-choice-die.blue{background:#315f8e;color:white}.combat-choice-die.reaper{background:#111;color:#eee}.combat-choice-die small{font-size:.55rem;margin-left:.1rem}
    .combat-die-effect{margin-top:.65rem;padding:.6rem .75rem;border:1px solid rgba(0,0,0,.25);border-radius:.4rem}.combat-die-effect.blue{background:rgba(49,95,142,.12)}.combat-die-effect.reaper{background:rgba(0,0,0,.1)}
  `;
  document.head.appendChild(style);
})();
