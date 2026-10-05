/* Livre 02 — parité des dés de combat avec le Livre 01.
   Aucun texte narratif, embranchement ou choix n'est remplacé :
   seuls les lancers de duels individuels et leur présentation sont enrichis. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('providence-02');
  const STORY = book?.story;
  const rules = book?.rules || {};
  const inventory = book?.inventory;
  if (!book || !STORY || !inventory) return;

  const VERSION = 1;
  const VALID = new Set(['white', 'blue', 'reaper']);
  const PIPS = {
    0: [], 1: [5], 2: [1, 9], 3: [1, 5, 9],
    4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9]
  };

  function clone(value) {
    if (typeof structuredClone === 'function') {
      try { return structuredClone(value); } catch (_) {}
    }
    return JSON.parse(JSON.stringify(value));
  }

  function d6() {
    const a = new Uint32Array(1);
    if (window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(a);
      return (a[0] % 6) + 1;
    }
    return Math.floor(Math.random() * 6) + 1;
  }

  function dieType(state) {
    return VALID.has(state.combatSecondDie) ? state.combatSecondDie : 'white';
  }

  function ensureDie(state) {
    if (!VALID.has(state.combatSecondDie)) state.combatSecondDie = 'white';
    return state.combatSecondDie;
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

  function standardDie(value, extraClass = '', label = '') {
    const v = Math.max(0, Math.min(6, Number(value) || 0));
    const active = new Set(PIPS[v] || []);
    const cells = Array.from({ length:9 }, (_, i) =>
      `<span class="die-cell">${active.has(i + 1) ? '<i></i>' : ''}</span>`
    ).join('');
    return `<span class="die-visual${extraClass ? ' ' + extraClass : ''}"${label ? ` aria-label="${label}"` : ''}>${cells}</span>`;
  }

  function offensiveSkull(label = 'Dé offensif : crâne') {
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
        <p><strong>Combats individuels :</strong> ton personnage et l’adversaire lancent chacun <strong>2 dés</strong>, puis ajoutent leur Dextérité et leur Force. Le meilleur score remporte l’échange. En cas d’égalité, personne n’est blessé.</p>
        <p>Ton <strong>premier dé est toujours le dé classique</strong>. Pour le deuxième dé, tu choisis ta position de combat. Tu peux la changer à tout moment depuis l’inventaire, même entre deux échanges.</p>

        <div class="combat-rules-die-row">
          ${diePreview('white')}
          <div><strong>Dé classique</strong><br>1 · 2 · 3 · 4 · 5 · 6<br>Position régulière et équilibrée.</div>
        </div>

        <div class="combat-rules-die-row">
          ${diePreview('blue')}
          <div><strong>Dé de défense</strong><br>0 · 1 · 2 · 3 · 4 · 5<br>Si l’adversaire remporte l’échange, tu absorbes <strong>1 point de dégâts</strong> avant ta protection.</div>
        </div>

        <div class="combat-rules-die-row">
          ${diePreview('reaper')}
          <div><strong>Dé offensif</strong><br>1 · 1 · 3 · 3 · ☠ · ☠<br>Si ☠ apparaît, tu <strong>remportes automatiquement l’échange</strong>. Les dégâts infligés restent normaux.</div>
        </div>

        <p>La Force aide à remporter l’échange mais ne modifie pas les dégâts. Tes dégâts restent ceux prévus par le Providence : <strong>2 + la Puissance de ton arme</strong>.</p>
        <p><em>Les combats de groupe avec tes soldats conservent leurs règles propres.</em></p>
        <button type="button" class="inventory-action-btn combat-rules-back" data-action="back-inventory">Retour à l’inventaire</button>
      </div>`;
  }

  function selectorButton(state, id, title, detail) {
    const selected = dieType(state) === id;
    return `<button type="button" class="inventory-action-btn combat-die-select${selected ? ' combat-die-selected' : ''}" data-action="combat-second-die:${id}" aria-pressed="${selected ? 'true' : 'false'}">
      <span class="combat-die-select-visual">${diePreview(id)}</span>
      <span class="combat-die-select-copy"><strong>${title}</strong><small>${detail}</small></span>
    </button>`;
  }

  function selectionCard(state) {
    const type = ensureDie(state);
    const current = type === 'blue' ? 'Dé de défense' : type === 'reaper' ? 'Dé offensif' : 'Dé classique';
    return `
      <button type="button" class="inventory-action-btn combat-rules-open" data-action="combat-rules-open">Règles des combats</button>
      <div class="inventory-equipment-card combat-die-inventory-card">
        <div class="inventory-equipment-title">Deuxième dé de combat</div>
        <div class="inventory-actions combat-die-options">
          ${selectorButton(state, 'white', 'Classique', '1 · 2 · 3 · 4 · 5 · 6')}
          ${selectorButton(state, 'blue', 'Défense', '0 · 1 · 2 · 3 · 4 · 5 · +1 défense')}
          ${selectorButton(state, 'reaper', 'Offensif', '1 · 1 · 3 · 3 · ☠ · ☠')}
        </div>
        <p class="combat-die-current"><strong>Actuel : ${current}</strong>${type === 'reaper' ? ' · ☠ remporte automatiquement l’échange.' : ''}${type === 'blue' ? ' · 1 dégât est absorbé à chaque échange perdu.' : ''}</p>
      </div>`;
  }

  const previousExtraHtml = typeof inventory.extraHtml === 'function'
    ? inventory.extraHtml.bind(inventory)
    : null;
  inventory.extraHtml = state => selectionCard(state) + (previousExtraHtml ? previousExtraHtml(state) : '');

  const previousHandleAction = typeof inventory.handleAction === 'function'
    ? inventory.handleAction.bind(inventory)
    : null;
  inventory.handleAction = function(action, state, api) {
    if (typeof action === 'string' && action.startsWith('combat-second-die:')) {
      const next = action.slice('combat-second-die:'.length);
      if (VALID.has(next)) state.combatSecondDie = next;
      api?.saveState?.();
      api?.render?.();
      api?.openInventory?.();
      return true;
    }
    if (action === 'combat-rules-open') {
      api?.showModal?.('Règles des combats', rulesHtml());
      return true;
    }
    return previousHandleAction ? previousHandleAction(action, state, api) : false;
  };

  function changedCombatKey(before, after) {
    const beforeCombats = before.combats || {};
    const afterCombats = after.combats || {};
    for (const key of Object.keys(afterCombats)) {
      const b = beforeCombats[key];
      const a = afterCombats[key];
      const beforeRound = Number(b?.round || 0);
      const afterRound = Number(a?.round || 0);
      if (a?.last && afterRound > beforeRound && Array.isArray(a.last.heroDice) && Array.isArray(a.last.enemyDice)) {
        return key;
      }
    }
    return null;
  }

  function powderWasInvolved(before, after, key) {
    return before.flags?.combatPowderReady === true
      || before.flags?.combatPowderActiveKey === key
      || after.flags?.combatPowderActiveKey === key
      || (after.flags?.combatPowderUsed === true && before.flags?.combatPowderUsed !== true);
  }

  function reconcilePowder(before, state, key, ended) {
    if (!powderWasInvolved(before, state, key)) return;
    state.flags = state.flags || {};
    state.flags.combatPowderReady = false;
    if (ended) {
      delete state.flags.combatPowderActiveKey;
      state.flags.combatPowderUsed = true;
      if (state.flags.combatPowderDeclinedKey === key) delete state.flags.combatPowderDeclinedKey;
      if (state.flags.combatPowderAcceptedKey === key) delete state.flags.combatPowderAcceptedKey;
    } else {
      state.flags.combatPowderActiveKey = key;
      if (before.flags?.combatPowderUsed !== true) delete state.flags.combatPowderUsed;
    }
  }

  function restoreHeroBeforeRound(before, state) {
    state.hp = before.hp;
    state.protection = before.protection;
    state.protectionItems = clone(before.protectionItems || {});
  }

  function recalcStandardDuel(before, state, key) {
    const combat = state.combats?.[key];
    const previousCombat = before.combats?.[key];
    const last = combat?.last;
    if (!combat || !last || !Array.isArray(last.enemyDice)) return false;
    if (!Number.isFinite(last.heroDexterity) || !Number.isFinite(last.heroForce)
        || !Number.isFinite(last.enemyDexterity) || !Number.isFinite(last.enemyForce)) return false;

    let enemyHpBefore;
    if (Number.isFinite(previousCombat?.hp)) enemyHpBefore = Number(previousCombat.hp);
    else if (last.outcome === 'hero') enemyHpBefore = Number(combat.hp || 0) + Number(last.damage || last.heroDamage || 0);
    else enemyHpBefore = Number(combat.hp || last.enemyHp || 0);
    if (!Number.isFinite(enemyHpBefore)) return false;

    restoreHeroBeforeRound(before, state);
    combat.hp = enemyHpBefore;

    const first = d6();
    const second = rollSecond(dieType(state));
    const enemyDice = [...last.enemyDice];
    const enemyAttack = Number(last.enemyDexterity) + Number(last.enemyForce)
      + enemyDice.reduce((sum, value) => sum + Number(value || 0), 0);
    const heroAttack = Number(last.heroDexterity) + Number(last.heroForce) + first + second.value;
    const heroDamage = Number(last.heroDamage || (2 + Number(rules.combatPower?.(state) || 0)));
    const rawEnemyDamage = Number(last.enemyDamage || last.damage || 0);

    let outcome = 'tie';
    if (second.skull || heroAttack > enemyAttack) outcome = 'hero';
    else if (heroAttack < enemyAttack) outcome = 'enemy';

    let damage = 0;
    let protectionAbsorbed = 0;
    let hpLost = 0;
    let bluePrevented = 0;
    let protectionBefore = Number(rules.currentProtection?.(state) || 0);
    let protectionAfter = protectionBefore;

    if (outcome === 'hero') {
      damage = heroDamage;
      combat.hp = Math.max(0, enemyHpBefore - heroDamage);
    } else if (outcome === 'enemy') {
      let incoming = rawEnemyDamage;
      if (second.type === 'blue' && incoming > 0) {
        incoming = Math.max(0, incoming - 1);
        bluePrevented = rawEnemyDamage - incoming;
      }
      damage = incoming;
      const resolution = typeof rules.applyDamage === 'function'
        ? rules.applyDamage(state, incoming)
        : { absorbed:0, hpLost:incoming, protectionBefore, protectionAfter };
      protectionAbsorbed = Number(resolution?.absorbed || 0);
      hpLost = Number(resolution?.hpLost || 0);
      protectionBefore = Number(resolution?.protectionBefore ?? protectionBefore);
      protectionAfter = Number(resolution?.protectionAfter ?? rules.currentProtection?.(state) ?? 0);
    }

    combat.last = {
      ...last,
      heroDice:[first, second.value],
      enemyDice,
      heroAttack,
      enemyAttack,
      damage,
      protectionAbsorbed,
      hpLost,
      outcome,
      heroHp:state.hp,
      enemyHp:combat.hp,
      protectionBefore,
      protectionAfter,
      combatDiceProvidenceVersion:VERSION,
      secondDieType:second.type,
      secondDieDisplay:second.display,
      secondDieValue:second.value,
      reaperSkull:second.skull,
      blueDefensePrevented:bluePrevented
    };
    state.combatDiceDisplay = {
      node:state.node, kind:'combat', key, round:Number(combat.round || 0),
      type:second.type, first, second:second.display, value:second.value,
      skull:second.skull, bluePrevented
    };

    reconcilePowder(before, state, key, combat.hp <= 0 || state.hp <= 0);
    return true;
  }

  function recalcNightVillageDuel(before, state) {
    const battle = state.flags?.villageAssaultBattle;
    const beforeBattle = before.flags?.villageAssaultBattle;
    const last = battle?.nightFightLast;
    if (!battle || !last || !Array.isArray(last.enemyDice)) return false;
    const beforeRound = Number(beforeBattle?.nightFightRound || 0);
    const afterRound = Number(battle.nightFightRound || 0);
    if (afterRound <= beforeRound) return false;

    const enemyHpBefore = Number.isFinite(beforeBattle?.nightEnemyHp) && Number(beforeBattle.nightEnemyHp) > 0
      ? Number(beforeBattle.nightEnemyHp)
      : Number(last.enemyHpBefore || 6);
    const enemiesBefore = Number.isFinite(beforeBattle?.enemy)
      ? Number(beforeBattle.enemy)
      : Number(battle.enemy || 0) + (last.enemyKilled ? 1 : 0);

    restoreHeroBeforeRound(before, state);
    battle.enemy = enemiesBefore;
    battle.enemyDefeated = enemiesBefore <= 0;
    battle.nightEnemyHp = enemyHpBefore;

    const first = d6();
    const second = rollSecond(dieType(state));
    const enemyDice = [...last.enemyDice];
    const enemyAttack = Number(last.enemyDexterity) + Number(last.enemyForce)
      + enemyDice.reduce((sum, value) => sum + Number(value || 0), 0);
    const heroAttack = Number(last.heroDexterity) + Number(last.heroForce) + first + second.value;
    const heroDamage = Number(last.heroDamage || (2 + Number(rules.combatPower?.(state) || 0)));
    const rawEnemyDamage = Number(last.enemyDamage || last.damage || 0);

    let outcome = 'tie';
    if (second.skull || heroAttack > enemyAttack) outcome = 'hero';
    else if (heroAttack < enemyAttack) outcome = 'enemy';

    let damage = 0;
    let protectionAbsorbed = 0;
    let hpLost = 0;
    let bluePrevented = 0;
    let enemyHpAfter = enemyHpBefore;
    let enemyKilled = false;

    if (outcome === 'hero') {
      damage = heroDamage;
      enemyHpAfter = Math.max(0, enemyHpBefore - heroDamage);
      if (enemyHpAfter <= 0) {
        enemyKilled = true;
        battle.enemy = Math.max(0, enemiesBefore - 1);
        battle.enemyDefeated = battle.enemy <= 0;
        battle.nightEnemyHp = battle.enemy > 0 ? 6 : 0;
      } else {
        battle.nightEnemyHp = enemyHpAfter;
      }
    } else if (outcome === 'enemy') {
      let incoming = rawEnemyDamage;
      if (second.type === 'blue' && incoming > 0) {
        incoming = Math.max(0, incoming - 1);
        bluePrevented = rawEnemyDamage - incoming;
      }
      damage = incoming;
      const resolution = typeof rules.applyDamage === 'function'
        ? rules.applyDamage(state, incoming)
        : { absorbed:0, hpLost:incoming };
      protectionAbsorbed = Number(resolution?.absorbed || 0);
      hpLost = Number(resolution?.hpLost || 0);
    }

    battle.nightFightLast = {
      ...last,
      heroDice:[first, second.value],
      enemyDice,
      heroAttack,
      enemyAttack,
      enemyHpBefore,
      enemyHpAfter,
      enemyKilled,
      enemyRemaining:battle.enemy,
      damage,
      protectionAbsorbed,
      hpLost,
      outcome,
      heroHp:state.hp,
      combatDiceProvidenceVersion:VERSION,
      secondDieType:second.type,
      secondDieDisplay:second.display,
      secondDieValue:second.value,
      reaperSkull:second.skull,
      blueDefensePrevented:bluePrevented
    };
    state.combatDiceDisplay = {
      node:state.node, kind:'night', key:'nightVillageFight', round:afterRound,
      type:second.type, first, second:second.display, value:second.value,
      skull:second.skull, bluePrevented
    };

    reconcilePowder(before, state, 'nightVillageFight', battle.enemy <= 0 || state.hp <= 0);
    return true;
  }

  function applySelectedCombatRoll(state, originalEffect) {
    const before = clone(state);
    originalEffect(state);

    const key = changedCombatKey(before, state);
    if (key && recalcStandardDuel(before, state, key)) return;

    if (recalcNightVillageDuel(before, state)) return;

    // Combat de groupe ou autre mécanique spéciale : le résultat d'origine est conservé.
    delete state.combatDiceDisplay;
  }

  function decorateCombatHtml(html, state) {
    const marker = state.combatDiceDisplay;
    if (!html || !marker || marker.node !== state.node) return html;

    const template = document.createElement('template');
    template.innerHTML = String(html);
    const sides = [...template.content.querySelectorAll('.combat-side')];
    const heroSide = sides.find(side => {
      const strong = side.querySelector(':scope > strong');
      return strong && /^TOI$/i.test((strong.textContent || '').trim());
    });
    if (!heroSide) return html;

    const dice = heroSide.querySelector('.combat-dice');
    if (!dice) return html;

    const firstVisual = standardDie(marker.first, '', `Dé classique : ${marker.first}`);
    let secondVisual;
    if (marker.skull) secondVisual = offensiveSkull();
    else if (marker.type === 'blue') {
      secondVisual = `<span class="combat-die-with-bonus">${standardDie(marker.value, 'combat-die-defense', `Dé de défense : ${marker.value}`)}<small class="combat-defense-bonus-v2">+1</small></span>`;
    } else if (marker.type === 'reaper') {
      secondVisual = standardDie(marker.value, 'combat-die-offensive', `Dé offensif : ${marker.value}`);
    } else {
      secondVisual = standardDie(marker.value, '', `Dé classique : ${marker.value}`);
    }
    dice.innerHTML = firstVisual + secondVisual;

    if (marker.skull) {
      const total = heroSide.querySelector('.combat-total');
      if (total) total.innerHTML = '<strong>☠ ÉCHANGE REMPORTÉ</strong>';
    }

    const result = heroSide.closest('.combat-roll-result');
    if (result && marker.type !== 'white' && !result.querySelector('.combat-die-effect')) {
      const note = document.createElement('div');
      note.className = `combat-die-effect ${marker.type === 'blue' ? 'blue' : 'reaper'}`;
      if (marker.type === 'blue') {
        note.innerHTML = `<strong>Défense :</strong> ${marker.bluePrevented ? '<strong>1 dégât absorbé avant la protection.</strong>' : 'le bonus défensif ne s’applique que si l’adversaire remporte l’échange.'}`;
      } else {
        note.innerHTML = marker.skull
          ? '<strong>☠ Offensif :</strong> échange remporté automatiquement. Les dégâts restent normaux.'
          : '<strong>Dé offensif :</strong> résultat appliqué normalement.';
      }
      result.appendChild(note);
    }

    return template.innerHTML;
  }

  for (const scene of Object.values(STORY)) {
    if (!scene || scene.__providenceCombatDiceV1) continue;

    if (typeof scene.text === 'function') {
      const previousText = scene.text;
      scene.text = state => decorateCombatHtml(previousText(state), state);
    } else if (typeof scene.text === 'string') {
      const previousText = scene.text;
      scene.text = state => decorateCombatHtml(previousText, state);
    }

    const previousChoices = scene.choices;
    if (typeof previousChoices === 'function') {
      scene.choices = state => {
        const list = previousChoices(state) || [];
        return list.map(choice => {
          if (!choice || !choice.inlineCombat || typeof choice.effect !== 'function'
              || !/^Jeter les dés/i.test(choice.label || '')) return choice;
          const originalEffect = choice.effect;
          return { ...choice, effect:s => applySelectedCombatRoll(s, originalEffect) };
        });
      };
    } else if (Array.isArray(previousChoices)) {
      scene.choices = previousChoices.map(choice => {
        if (!choice || !choice.inlineCombat || typeof choice.effect !== 'function'
            || !/^Jeter les dés/i.test(choice.label || '')) return choice;
        const originalEffect = choice.effect;
        return { ...choice, effect:s => applySelectedCombatRoll(s, originalEffect) };
      });
    }

    scene.__providenceCombatDiceV1 = true;
  }

  const style = document.createElement('style');
  style.id = 'providence-combat-dice-ui';
  style.textContent = `
    .combat-roll-waiting .combat-dice { display:none!important; }
    .combat-roll-waiting .combat-side { min-height:0!important; }

    .die-visual.combat-die-defense { background:#74828a!important; color:#f5f1e7!important; }
    .die-visual.combat-die-defense .die-cell i { background:#f5f1e7!important; }
    .die-visual.combat-die-offensive { background:#434649!important; color:#f7f1e7!important; }
    .die-visual.combat-die-offensive .die-cell i { background:#f7f1e7!important; }
    .die-visual.combat-die-skull {
      display:inline-flex!important;
      align-items:center!important;
      justify-content:center!important;
    }
    .die-visual.combat-die-skull b {
      font-size:2rem!important;
      line-height:1!important;
      font-weight:900!important;
      color:#f7f1e7!important;
    }
    .combat-die-with-bonus { position:relative; display:inline-flex; vertical-align:middle; }
    .combat-defense-bonus-v2 {
      position:absolute;
      right:-5px;
      bottom:-5px;
      min-width:18px;
      height:18px;
      display:grid;
      place-items:center;
      border-radius:50%;
      background:#35434b;
      color:#fff;
      font-size:10px;
      font-weight:700;
      border:1px solid #efe4c7;
    }

    #modal[data-panel="inventory"] .inventory-action-btn,
    .combat-rules-recap .inventory-action-btn {
      background:rgba(255,255,255,.04)!important;
      background-image:none!important;
      color:#2f2418!important;
      border:1px solid #7d6546!important;
      border-radius:3px!important;
      box-shadow:none!important;
      text-shadow:none!important;
      filter:none!important;
      cursor:pointer!important;
    }
    #modal[data-panel="inventory"] .inventory-action-btn:hover,
    .combat-rules-recap .inventory-action-btn:hover {
      background:rgba(87,65,40,.07)!important;
      filter:none!important;
    }

    .combat-die-select,
    .combat-die-select:hover,
    .combat-rules-open,
    .combat-rules-open:hover { filter:none!important; }
    .combat-die-select .die-visual { filter:none!important; }

    .combat-rules-open {
      width:100%!important;
      min-height:52px!important;
      padding:10px 14px!important;
      margin:4px 0 10px!important;
      text-align:center!important;
      font-weight:700!important;
      font-size:1.02rem!important;
    }
    .combat-die-inventory-card {
      background:transparent!important;
      background-image:none!important;
    }
    #modal[data-panel="inventory"] .combat-die-options {
      display:grid!important;
      gap:6px!important;
    }
    #modal[data-panel="inventory"] .combat-die-select {
      width:100%!important;
      min-height:48px!important;
      padding:4px 10px!important;
      display:grid!important;
      grid-template-columns:42px 1fr!important;
      align-items:center!important;
      gap:8px!important;
      text-align:left!important;
    }
    .combat-die-select-visual { display:grid!important; place-items:center!important; }
    #modal[data-panel="inventory"] .combat-die-select-visual .die-visual {
      width:38px!important;
      height:38px!important;
      min-width:38px!important;
      min-height:38px!important;
      padding:4px!important;
      box-sizing:border-box!important;
    }
    #modal[data-panel="inventory"] .combat-die-select-visual .die-cell i {
      width:5px!important;
      height:5px!important;
    }
    #modal[data-panel="inventory"] .combat-die-select-visual .combat-die-skull b {
      font-size:1.35rem!important;
    }
    .combat-die-select-copy { display:block!important; }
    .combat-die-select-copy strong {
      display:block!important;
      color:#2f2418!important;
      font-size:1.02rem!important;
      line-height:1.05!important;
    }
    .combat-die-select-copy small {
      display:block!important;
      margin-top:1px!important;
      color:#5d4b39!important;
      font-size:.88rem!important;
      line-height:1.1!important;
      opacity:1!important;
    }
    .combat-die-selected {
      outline:2px solid rgba(117,83,46,.82)!important;
      outline-offset:-4px!important;
      background:rgba(83,60,35,.09)!important;
    }
    .combat-die-current { margin:7px 0 0!important; }

    .combat-rules-recap { line-height:1.45; }
    .combat-rules-die-row {
      display:grid;
      grid-template-columns:52px 1fr;
      align-items:center;
      gap:12px;
      padding:11px 0;
      border-top:1px solid rgba(80,61,42,.22);
    }
    .combat-rules-back {
      width:100%;
      min-height:52px;
      padding:10px 14px;
      margin-top:8px;
    }

    .combat-die-effect {
      margin-top:.65rem;
      padding:.6rem .75rem;
      border:1px solid rgba(0,0,0,.20);
      border-radius:.3rem;
      text-align:left;
    }
    .combat-die-effect.blue { background:rgba(86,112,128,.10); }
    .combat-die-effect.reaper { background:rgba(0,0,0,.07); }
  `;
  document.head.appendChild(style);
})();
