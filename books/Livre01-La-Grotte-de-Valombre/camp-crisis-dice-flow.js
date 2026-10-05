/* DEV — Crise d’Anselme : premier échange avec exactement le langage visuel des combats du Livre 01. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const STORY = book?.story;
  if (!STORY?.campAidArrival || !STORY?.campAidTactics) return;

  const arrival = STORY.campAidArrival;
  const tactics = STORY.campAidTactics;
  const arrivalIntro = arrival.text;
  const tacticalChoices = tactics.choices;
  const VERSION = 4;
  const ENEMY = { name:'DEUX ASSAILLANTS', maxHp:8, force:10, dexterity:8, damage:2 };

  function d6() {
    const a = new Uint32Array(1);
    if (window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(a);
      return (a[0] % 6) + 1;
    }
    return Math.floor(Math.random() * 6) + 1;
  }

  function hasItem(state, id) {
    const inv = state.inventory;
    if (Array.isArray(inv)) return inv.some(item => (typeof item === 'string' ? item === id : item?.id === id));
    if (inv && typeof inv === 'object') return Boolean(inv[id]);
    return false;
  }

  function currentForce(state) {
    return Math.max(3, Number(state.baseForce || 8) + Number(state.forceBonus || 0) + (hasItem(state,'brassard_veilleurs') ? 1 : 0));
  }

  function currentDexterity(state) {
    const weaponModifier = state.weapon === 'heavy' ? -4 : (state.weapon === 'light' || state.weapon === 'sorcerer_sword' ? -1 : 0);
    const itemBonus = (hasItem(state,'anneau_veilleurs') ? 1 : 0) + (hasItem(state,'bague_lueur') ? 2 : 0);
    const shieldRemaining = Number(state.protectionItems?.bouclier_chevalier?.remaining || 0);
    const shieldPenalty = hasItem(state,'bouclier_chevalier') && shieldRemaining > 0 ? 1 : 0;
    return Math.max(3, Number(state.baseDexterity || 13) + Number(state.dexBonus || 0) + itemBonus - Number(state.dexPenalty || 0) - (state.flags?.collarEquipped ? 1 : 0) - shieldPenalty + weaponModifier);
  }

  function weaponPower(state) {
    return state.weapon === 'heavy' ? 5 :
      state.weapon === 'light' ? 2 :
      state.weapon === 'black_blade' ? 6 :
      state.weapon === 'sorcerer_sword' ? 8 : 0;
  }

  function currentProtection(state) {
    return ['bouclier_chevalier','casque_cabosse','gantelet_veilleur'].reduce((sum,id) => {
      if (!hasItem(state,id)) return sum;
      return sum + Math.max(0,Number(state.protectionItems?.[id]?.remaining || 0));
    },0);
  }

  function applyDamage(state, amount) {
    let remaining = Math.max(0, Math.floor(Number(amount) || 0));
    let absorbed = 0;
    const destroyedProtection = [];
    const defs = [
      ['bouclier_chevalier','Bouclier du chevalier'],
      ['casque_cabosse','Casque cabossé'],
      ['gantelet_veilleur','Gantelet de Veilleur']
    ];
    if (!state.protectionItems || typeof state.protectionItems !== 'object') state.protectionItems = {};
    for (const [id,name] of defs) {
      if (!hasItem(state,id) || remaining <= 0) continue;
      const source = state.protectionItems[id];
      if (!source) continue;
      const available = Math.max(0,Number(source.remaining || 0));
      const used = Math.min(available,remaining);
      if (!used) continue;
      source.remaining = available - used;
      remaining -= used;
      absorbed += used;
      if (available > 0 && source.remaining <= 0) destroyedProtection.push(name);
    }
    const hpLost = remaining;
    state.hp = Math.max(0,Number(state.hp || 0) - hpLost);
    return { absorbed, hpLost, destroyedProtection };
  }

  /* Même structure DOM que renderDie() du livre : grille 3x3 et points CSS. */
  function renderDie(value) {
    const patterns = {
      1:[4], 2:[0,8], 3:[0,4,8], 4:[0,2,6,8], 5:[0,2,4,6,8], 6:[0,2,3,5,6,8]
    };
    const pips = patterns[Math.max(1,Math.min(6,Number(value)||1))] || [];
    return `<span class="die-visual">${Array.from({length:9},(_,i)=>`<span class="die-cell">${pips.includes(i)?'<i></i>':''}</span>`).join('')}</span>`;
  }

  function enemyCard(state) {
    const hp = Number(state.flags.anselmeRaidersHp ?? ENEMY.maxHp);
    return `<div class="enemy-card" aria-label="Fiche de l’adversaire">
      <div class="enemy-card-title">${ENEMY.name}</div>
      <div class="enemy-card-stats">
        <div><span class="enemy-icon">♥</span><span>Vie</span><strong>${hp} / ${ENEMY.maxHp}</strong></div>
        <div><span class="enemy-icon">◆</span><span>Dextérité</span><strong>${ENEMY.dexterity}</strong></div>
        <div><span class="enemy-icon">⚔</span><span>Force</span><strong>${ENEMY.force}</strong></div>
        <div><span class="enemy-icon">†</span><span>Arme</span><strong>Aucune</strong></div>
        <div><span class="enemy-icon">✦</span><span>Dégâts</span><strong>${ENEMY.damage}</strong></div>
      </div>
    </div>`;
  }

  function resetEncounter(state) {
    delete state.flags.anselmeFirstRound;
    delete state.flags.anselmeEscape;
    state.flags.anselmeRaidersHp = ENEMY.maxHp;
    state.flags.anselmeCombatVisualVersion = VERSION;
  }

  function resolveFirstRound(state) {
    if (state.flags.anselmeFirstRound) return;
    const heroDice = [d6(),d6()];
    const enemyDice = [d6(),d6()];
    const heroDexterity = currentDexterity(state);
    const heroForce = currentForce(state);
    const heroAttack = heroDexterity + heroForce + heroDice[0] + heroDice[1];
    const enemyAttack = ENEMY.dexterity + ENEMY.force + enemyDice[0] + enemyDice[1];
    const heroWeaponPower = weaponPower(state);
    const heroDamage = 2 + heroWeaponPower;
    let outcome = 'tie';
    let damage = 0;
    let protectionAbsorbed = 0;
    let hpLost = 0;
    let destroyedProtection = [];

    if (heroAttack > enemyAttack) {
      outcome = 'hero';
      damage = heroDamage;
      state.flags.anselmeRaidersHp = Math.max(0,ENEMY.maxHp - damage);
    } else if (heroAttack < enemyAttack) {
      outcome = 'enemy';
      damage = ENEMY.damage;
      const hit = applyDamage(state,damage);
      protectionAbsorbed = hit.absorbed;
      hpLost = hit.hpLost;
      destroyedProtection = hit.destroyedProtection;
    }

    state.flags.anselmeFirstRound = {
      round:1, heroDice, enemyDice, heroDexterity, heroForce,
      enemyDexterity:ENEMY.dexterity, enemyForce:ENEMY.force,
      heroAttack, enemyAttack, heroWeaponPower, heroDamage,
      enemyDamage:ENEMY.damage, damage, protectionAbsorbed, hpLost,
      destroyedProtection, outcome,
      enemyHp:Number(state.flags.anselmeRaidersHp ?? ENEMY.maxHp)
    };
  }

  function resultHtml(state) {
    const r = state.flags.anselmeFirstRound;
    if (!r) return '';
    const heroDamageDetail = r.heroWeaponPower > 0 ? `Dégâts de base 2 + Puissance de l’arme ${r.heroWeaponPower}` : 'Dégâts de base 2';
    const outcomeText = r.outcome === 'hero'
      ? `<strong>Tu remportes l’échange.</strong><br>Tu infliges <strong>${r.damage}</strong> point${r.damage>1?'s':''} de dégâts <span class="combat-detail">(${heroDamageDetail})</span>.`
      : r.outcome === 'enemy'
        ? `<strong>${ENEMY.name} remportent l’échange.</strong><br>Ils infligent <strong>${r.damage}</strong> points de dégâts.${r.protectionAbsorbed>0?` Ta protection en absorbe <strong>${r.protectionAbsorbed}</strong>.`:''}${r.hpLost>0?` Tu perds <strong>${r.hpLost}</strong> point${r.hpLost>1?'s':''} de Vie.`:' Tu ne perds aucun point de Vie.'}`
        : '<strong>Égalité.</strong><br>Les deux attaques se neutralisent. Aucun dégât.';

    return `<div class="combat-roll-result">
      <div class="combat-roll-title">Échange n° 1</div>
      <div class="combat-roll-grid">
        <div class="combat-side">
          <strong>TOI</strong>
          <div class="combat-dice">${renderDie(r.heroDice[0])}${renderDie(r.heroDice[1])}</div>
          <p>Dextérité ${r.heroDexterity} + Force ${r.heroForce} + dés ${r.heroDice[0]+r.heroDice[1]}</p>
          <p class="combat-total">Attaque : <strong>${r.heroAttack}</strong></p>
        </div>
        <div class="combat-versus">VS</div>
        <div class="combat-side">
          <strong>${ENEMY.name}</strong>
          <div class="combat-dice">${renderDie(r.enemyDice[0])}${renderDie(r.enemyDice[1])}</div>
          <p>Dextérité ${r.enemyDexterity} + Force ${r.enemyForce} + dés ${r.enemyDice[0]+r.enemyDice[1]}</p>
          <p class="combat-total">Attaque : <strong>${r.enemyAttack}</strong></p>
        </div>
      </div>
      <div class="combat-outcome">${outcomeText}</div>
      <div class="combat-life-line">Ta Vie : <strong>${state.hp} / ${state.maxHp}</strong> · Protection : <strong>${currentProtection(state)}</strong> · Vie adverse : <strong>${r.enemyHp} / ${ENEMY.maxHp}</strong></div>
    </div>
    ${(r.destroyedProtection||[]).map(name=>`<p><strong>${name} est désormais trop endommagé pour te protéger.</strong></p>`).join('')}
    <p>Derrière eux, les deux autres abandonnent Anselme.</p>
    <p>Ils avancent maintenant vers toi.</p>
    <p>Quatre contre un. Si tu restes ici, ils vont t’encercler.</p>
    <p>À tes pieds, le feu d’Anselme brûle encore.</p>`;
  }

  /* Anciennes sauvegardes : la première ouverture avec cette version revient AVANT le jet. */
  arrival.text = state => {
    if (state.flags.anselmeCombatVisualVersion !== VERSION) resetEncounter(state);
    const intro = typeof arrivalIntro === 'function' ? arrivalIntro(state) : arrivalIntro;
    return `${intro || ''}${state.flags.anselmeFirstRound ? resultHtml(state) : enemyCard(state)}`;
  };

  arrival.choices = state => {
    if (!state.flags.anselmeFirstRound) {
      return [{ label:'Jeter les dés', stay:true, inlineCombat:true, effect:resolveFirstRound }];
    }
    if (state.hp <= 0) return [];
    return typeof tacticalChoices === 'function' ? tacticalChoices(state) : (tacticalChoices || []);
  };

  tactics.text = state => resultHtml(state) || `${enemyCard(state)}<p>Les deux premières silhouettes fondent sur toi.</p>`;

  /* Chaque nouveau choix « retourner aider Anselme » recommence bien AVANT le lancer. */
  ['c30','campCrisis','c28'].forEach(id => {
    const scene = STORY[id];
    if (!scene || scene.__anselmeResetWrapped) return;
    const oldChoices = scene.choices;
    scene.choices = state => {
      const source = typeof oldChoices === 'function' ? oldChoices(state) : (oldChoices || []);
      return source.map(choice => {
        if (!choice || choice.to !== 'campAidArrival') return choice;
        const oldEffect = choice.effect;
        return {
          ...choice,
          effect:s => {
            if (typeof oldEffect === 'function') oldEffect(s);
            resetEncounter(s);
          }
        };
      });
    };
    scene.__anselmeResetWrapped = true;
  });
})();
