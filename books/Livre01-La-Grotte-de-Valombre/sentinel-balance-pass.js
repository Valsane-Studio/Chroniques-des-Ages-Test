/* DEV — Sentinelles noires : équilibrage et flux tactique final.
   - Stats : DEX 9 / FOR 9 / 6 Vie / 1 dégât.
   - Après le choix tactique, ne plus répéter l'introduction.
   - Renfoncement : Sentinelle 1 puis Sentinelle 2, cible imposée.
   - Affichage explicite Dextérité + Force + dés. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const STORY = book?.story;
  if (!book || !STORY?.c79 || !STORY?.c80) return;

  const STATS = { maxHp: 6, dexterity: 9, force: 9, damage: 1 };
  const VERSION = 4;

  const rules = book.rules || {};
  const currentDexterity = s => typeof rules.currentDexterity === 'function' ? rules.currentDexterity(s) : Number(s.baseDexterity || 13);
  const currentForce = s => typeof rules.currentForce === 'function' ? rules.currentForce(s) : Number(s.baseForce || 8);
  const currentProtection = s => typeof rules.currentProtection === 'function' ? rules.currentProtection(s) : 0;
  const contaminationLevel = s => Math.max(0, Math.min(13, Number.isFinite(s.contamination) ? Math.floor(s.contamination) : 0));

  function d6() {
    const a = new Uint32Array(1);
    if (window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(a);
      return (a[0] % 6) + 1;
    }
    return Math.floor(Math.random() * 6) + 1;
  }

  function roll2() { return [d6(), d6()]; }
  function sum(dice) { return dice.reduce((a,b)=>a+b,0); }

  function renderDie(value) {
    const patterns = {1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
    const pips = patterns[Math.max(1,Math.min(6,Number(value)||1))] || [];
    return `<span class="die-visual">${Array.from({length:9},(_,i)=>`<span class="die-cell">${pips.includes(i)?'<i></i>':''}</span>`).join('')}</span>`;
  }

  function ensureFight(state) {
    state.flags = state.flags || {};
    if (!state.sentinelFight || !Array.isArray(state.sentinelFight.hp)) {
      state.sentinelFight = { hp:[STATS.maxHp,STATS.maxHp], round:0, last:null, contaminated:false, balanceVersion:VERSION };
    }
    const f = state.sentinelFight;
    f.hp = [0,1].map(i => Math.max(0, Math.min(STATS.maxHp, Number(f.hp[i] ?? STATS.maxHp))));
    if (!Number.isInteger(f.round)) f.round = 0;
    if (f.balanceVersion !== VERSION) {
      f.last = null;
      f.balanceVersion = VERSION;
    }
    return f;
  }

  function heroDamage(state) {
    const power = state.weapon === 'none' ? 0 : (typeof rules.combatPower === 'function' ? rules.combatPower(state) : 0);
    return 2 + power;
  }

  function applyDamage(state, amount) {
    if (typeof rules.applyDamage === 'function') return rules.applyDamage(state, amount);
    state.hp = Math.max(0, Number(state.hp || 0) - amount);
    return { incoming:amount, absorbed:0, hpLost:amount, protectionAfter:0 };
  }

  function contaminateOnce(state, fight, resolution) {
    if ((resolution?.hpLost || 0) <= 0 || fight.contaminated) return;
    if (typeof rules.raiseContamination === 'function') rules.raiseContamination(state, 2);
    else state.contamination = Math.min(13, contaminationLevel(state) + 2);
    fight.contaminated = true;
  }

  function cardHtml(state) {
    const f = ensureFight(state);
    return `<div class="enemy-card" aria-label="Fiche des adversaires">
      <div class="enemy-card-title">DEUX SENTINELLES NOIRES</div>
      <div class="enemy-card-stats">
        <div><span class="enemy-icon">♥</span><span>Sentinelle 1</span><strong>${f.hp[0]}/${STATS.maxHp} Vie</strong></div>
        <div><span class="enemy-icon">♥</span><span>Sentinelle 2</span><strong>${f.hp[1]}/${STATS.maxHp} Vie</strong></div>
        <div><span class="enemy-icon">◆</span><span>Dextérité</span><strong>${STATS.dexterity} chacune</strong></div>
        <div><span class="enemy-icon">⚔</span><span>Force</span><strong>${STATS.force} chacune</strong></div>
        <div><span class="enemy-icon">✦</span><span>Dégâts</span><strong>${STATS.damage} chacune</strong></div>
      </div>
    </div>`;
  }

  function addAlcovePenalty(state) {
    state.flags = state.flags || {};
    if (state.flags.sentinelAlcovePenaltyApplied) return;
    state.dexPenalty = Number(state.dexPenalty || 0) + 1;
    state.flags.sentinelAlcovePenaltyApplied = true;
  }

  function clearAlcovePenalty(state) {
    if (!state.flags?.sentinelAlcovePenaltyApplied) return;
    state.dexPenalty = Math.max(0, Number(state.dexPenalty || 0) - 1);
    state.flags.sentinelAlcovePenaltyApplied = false;
  }

  function setTactic(state, tactic) {
    ensureFight(state);
    state.flags = state.flags || {};
    state.flags.sentinelTactic = tactic;
    state.flags.sentinelTacticVersion = VERSION;
    state.flags.sentinelOpeningResolved = tactic !== 'power';
    delete state.flags.sentinelStunnedIndex;
    if (tactic === 'alcove') addAlcovePenalty(state);
    else clearAlcovePenalty(state);
  }

  function activeAlcoveTarget(state) {
    const f = ensureFight(state);
    return f.hp[0] > 0 ? 0 : (f.hp[1] > 0 ? 1 : -1);
  }

  function oneEnemyExchange(state, target, options = {}) {
    const f = ensureFight(state);
    if (state.hp <= 0 || target < 0 || f.hp[target] <= 0) return;

    const heroDice = roll2();
    const targetDice = roll2();
    const heroDex = currentDexterity(state) + Number(options.extraDex || 0);
    const heroForce = currentForce(state);
    const heroScore = heroDex + heroForce + sum(heroDice);
    const targetScore = STATS.dexterity + STATS.force + sum(targetDice);
    const report = [];
    let hitTarget = false;

    if (heroScore > targetScore) {
      hitTarget = true;
      const raw = heroDamage(state) + Number(options.bonusDamage || 0);
      const dealt = Math.min(f.hp[target], Math.max(0, raw));
      f.hp[target] -= dealt;
      report.push(`Tu touches la sentinelle ${target+1} : ${dealt} dégât${dealt>1?'s':''}.`);
      if (f.hp[target] <= 0) report.push(`La sentinelle ${target+1} s’effondre.`);
    } else if (heroScore < targetScore && !options.targetCannotAttack) {
      const res = applyDamage(state, STATS.damage);
      contaminateOnce(state, f, res);
      report.push(`La sentinelle ${target+1} te touche : ${res.absorbed || 0} absorbé, ${res.hpLost || 0} Vie perdue.`);
    } else if (heroScore === targetScore || options.targetCannotAttack) {
      report.push(options.targetCannotAttack
        ? `La sentinelle ${target+1}, encore déséquilibrée, ne parvient pas à riposter.`
        : `Tu pares la sentinelle ${target+1} : égalité, aucun dégât.`);
    }

    f.round += 1;
    f.last = {
      kind:'melee', round:f.round, target, heroDice, targetDice,
      heroDexterity:heroDex, heroForce, heroScore, targetScore,
      report, hp:[...f.hp], hitTarget, powerOpening:!!options.powerOpening,
      bonusDamage:Number(options.bonusDamage || 0), otherRolls:[]
    };
    return f.last;
  }

  function normalRound(state, target, options = {}) {
    const f = ensureFight(state);
    const stunned = Number.isInteger(state.flags?.sentinelStunnedIndex) ? state.flags.sentinelStunnedIndex : null;
    const last = oneEnemyExchange(state, target, {
      ...options,
      targetCannotAttack: stunned === target
    });
    if (!last || state.hp <= 0) {
      delete state.flags.sentinelStunnedIndex;
      return;
    }

    const other = 1 - target;
    if (f.hp[other] > 0 && stunned !== other) {
      const dice = roll2();
      const score = STATS.dexterity + STATS.force + sum(dice);
      last.otherRolls.push({index:other,dice,score});
      if (score > last.heroScore) {
        const res = applyDamage(state, STATS.damage);
        contaminateOnce(state, f, res);
        last.report.push(`La sentinelle ${other+1} t’attaque : ${res.absorbed || 0} absorbé, ${res.hpLost || 0} Vie perdue.`);
      } else {
        last.report.push(`Tu évites l’attaque de la sentinelle ${other+1}.`);
      }
    } else if (f.hp[other] > 0 && stunned === other) {
      last.report.push(`La sentinelle ${other+1}, repoussée par ton coup précédent, ne peut pas intervenir pendant cet échange.`);
    }
    last.hp = [...f.hp];
    delete state.flags.sentinelStunnedIndex;
  }

  function powerOpening(state) {
    const f = ensureFight(state);
    if (state.flags?.sentinelOpeningResolved || f.hp[0] <= 0) return;
    const last = oneEnemyExchange(state, 0, { extraDex:-1, bonusDamage:2, powerOpening:true });
    if (!last) return;

    /* Pendant ce premier engagement, la seconde sentinelle peut tout de même profiter de l'ouverture. */
    if (state.hp > 0 && f.hp[1] > 0) {
      const dice = roll2();
      const score = STATS.dexterity + STATS.force + sum(dice);
      last.otherRolls.push({index:1,dice,score});
      if (score > last.heroScore) {
        const res = applyDamage(state, STATS.damage);
        contaminateOnce(state, f, res);
        last.report.push(`La sentinelle 2 profite de ton engagement : ${res.absorbed || 0} absorbé, ${res.hpLost || 0} Vie perdue.`);
      } else last.report.push('Tu parviens à garder la seconde sentinelle à distance.');
    }

    if (last.hitTarget && f.hp[0] > 0) {
      state.flags.sentinelStunnedIndex = 0;
      last.report.push('La première sentinelle est projetée en arrière et ne pourra pas intervenir pendant le prochain échange.');
    }
    last.hp = [...f.hp];
    state.flags.sentinelOpeningResolved = true;
  }

  function throwBlade(state, target) {
    const f = ensureFight(state);
    if ((state.throwingBlades || 0) <= 0 || f.hp[target] <= 0) return;
    state.throwingBlades -= 1;
    const dice = [d6(),d6(),d6()];
    const dex = currentDexterity(state);
    const total = sum(dice);
    const success = total <= dex;
    const dealt = success ? Math.min(2, f.hp[target]) : 0;
    f.hp[target] -= dealt;
    f.round += 1;
    f.last = {
      kind:'blade', round:f.round, target, heroDice:dice, heroDexterity:dex,
      success, report:[success ? `Ta lame touche la sentinelle ${target+1} : ${dealt} dégâts.` : `Ta lame manque la sentinelle ${target+1}.`, 'Tu restes hors de portée : aucune sentinelle ne riposte pendant ce lancer.'],
      hp:[...f.hp]
    };
  }

  function diceHtml(dice) { return `<div class="combat-dice">${(dice||[]).map(renderDie).join('')}</div>`; }

  function resultHtml(state) {
    const f = ensureFight(state);
    const r = f.last;
    if (!r) return '';
    if (r.kind === 'blade') {
      const total = sum(r.heroDice || []);
      return `<div class="combat-roll-result">
        <div class="combat-roll-title">Lame de jet</div>
        <div class="combat-side"><strong>TOI</strong>${diceHtml(r.heroDice)}<p>Dextérité ${r.heroDexterity} · dés ${total}</p><p class="combat-total"><strong>${r.success?'Réussite':'Échec'}</strong></p></div>
        <div class="combat-outcome">${r.report.map(x=>`<p>${x}</p>`).join('')}</div>
        <div class="combat-life-line">Ta Vie : <strong>${state.hp}/${state.maxHp}</strong> · Protection : <strong>${currentProtection(state)}</strong> · Terre noire : <strong>${contaminationLevel(state)}/13</strong></div>
      </div>`;
    }

    const heroDiceTotal = sum(r.heroDice || []);
    const foeDiceTotal = sum(r.targetDice || []);
    return `<div class="combat-roll-result">
      <div class="combat-roll-title">Échange n° ${r.round}</div>
      <div class="combat-roll-grid">
        <div class="combat-side"><strong>TOI</strong>${diceHtml(r.heroDice)}<p>Dextérité ${r.heroDexterity} + Force ${r.heroForce} + dés ${heroDiceTotal}</p><p class="combat-total">Attaque : <strong>${r.heroScore}</strong></p></div>
        <div class="combat-versus">VS</div>
        <div class="combat-side"><strong>SENTINELLE ${r.target+1}</strong>${diceHtml(r.targetDice)}<p>Dextérité ${STATS.dexterity} + Force ${STATS.force} + dés ${foeDiceTotal}</p><p class="combat-total">Attaque : <strong>${r.targetScore}</strong></p></div>
      </div>
      ${(r.otherRolls||[]).map(a=>`<div class="combat-secondary-roll"><strong>Attaque de la sentinelle ${a.index+1}</strong>${diceHtml(a.dice)}<p>Dextérité ${STATS.dexterity} + Force ${STATS.force} + dés ${sum(a.dice)} · Attaque : <strong>${a.score}</strong> contre ${r.heroScore}</p></div>`).join('')}
      <div class="combat-outcome">${r.report.map(x=>`<p>${x}</p>`).join('')}</div>
      <div class="combat-life-line">Ta Vie : <strong>${state.hp}/${state.maxHp}</strong> · Protection : <strong>${currentProtection(state)}</strong> · Terre noire : <strong>${contaminationLevel(state)}/13</strong></div>
    </div>`;
  }

  function victoryChoices(state) {
    return [{ label:'Fouiller l’armurerie', to:'c81', effect:s=>clearAlcovePenalty(s) }];
  }

  function combatChoices(state) {
    const f = ensureFight(state);
    if (state.hp <= 0) return [];
    if (f.hp.every(h=>h<=0)) return victoryChoices(state);

    const tactic = state.flags?.sentinelTactic || 'normal';

    if (tactic === 'power' && !state.flags?.sentinelOpeningResolved) {
      return [{ label:'Jeter les dés pour porter le coup', stay:true, inlineCombat:true, effect:powerOpening }];
    }

    if (tactic === 'alcove') {
      const target = activeAlcoveTarget(state);
      if (target < 0) return victoryChoices(state);
      const list = [{ label:'Jeter les dés', stay:true, inlineCombat:true, effect:s=>oneEnemyExchange(s,target) }];
      if ((state.throwingBlades||0)>0) list.push({ label:`Lancer une lame de jet — ${state.throwingBlades} restante${state.throwingBlades>1?'s':''}`, stay:true, inlineCombat:true, effect:s=>throwBlade(s,target) });
      return list;
    }

    const choices = [];
    f.hp.forEach((hp,i)=>{
      if (hp<=0) return;
      choices.push({ label:`Jeter les dés contre la sentinelle ${i+1}`, stay:true, inlineCombat:true, effect:s=>normalRound(s,i) });
      if ((state.throwingBlades||0)>0) choices.push({ label:`Lancer une lame sur la sentinelle ${i+1}`, stay:true, inlineCombat:true, effect:s=>throwBlade(s,i) });
    });
    return choices;
  }

  const introHtml = state => `
    <p>Deux silhouettes entrent dans le poste de garde. Elles portent les restes d’un uniforme.</p>
    <p>Leurs traits demeurent presque humains. Une terre noire et épaisse coule de leurs bouches.</p>
    <p>L’une avance devant toi. L’autre contourne le pupitre.</p>
    <p>Elles cherchent déjà à te prendre à deux. Tu n’as que quelques secondes pour choisir comment recevoir leur attaque.</p>
    ${cardHtml(state)}`;

  function tacticalHtml(state) {
    const tactic = state.flags?.sentinelTactic;
    if (tactic === 'alcove') {
      const target = activeAlcoveTarget(state);
      const active = target >= 0 ? `la sentinelle ${target+1}` : 'plus aucune sentinelle';
      return `<p>Tu recules jusqu’à un renfoncement étroit du mur.</p>
        <p>Les deux silhouettes ne peuvent plus passer de front. <strong>${active}</strong> doit venir seule jusqu’à toi ; l’autre reste bloquée derrière elle.</p>
        <p>Le prix de cette position est immédiat : les murs gênent tes mouvements. <strong>Dextérité −1 pendant tout le combat.</strong></p>
        ${cardHtml(state)}`;
    }
    if (tactic === 'power' && !state.flags?.sentinelOpeningResolved) {
      return `<p>Tu refuses de leur laisser le temps de t’encercler.</p>
        <p>Tu avances d’un pas et armes un coup de toutes tes forces contre la première sentinelle. En mettant toute ta puissance dans le mouvement, tu sacrifies de la précision : <strong>Dextérité −1 pour cet échange</strong>. Si ton coup porte, il inflige <strong>+2 dégâts</strong>.</p>
        <p>Si elle survit, l’impact devrait la projeter assez loin pour l’empêcher d’intervenir pendant l’échange suivant.</p>
        ${cardHtml(state)}`;
    }
    if (tactic === 'normal') {
      return `<p>Tu restes au centre du poste de garde, là où tu peux encore voir les deux adversaires.</p>
        <p>Tu ne prends aucun risque tactique supplémentaire. En revanche, tant qu’elles restent toutes les deux debout, la seconde pourra chercher à te frapper pendant que tu affrontes l’autre.</p>
        ${cardHtml(state)}`;
    }
    return introHtml(state);
  }

  STORY.c79.text = state => {
    const f = ensureFight(state);
    const tactic = state.flags?.sentinelTactic;
    if (!tactic && f.round===0) return introHtml(state);
    if (f.hp.every(h=>h<=0)) return `${cardHtml(state)}<p>Les deux sentinelles sont à terre. Le silence revient dans le poste de garde.</p>`;
    return `${tacticalHtml(state)}${resultHtml(state)}`;
  };

  STORY.c79.choices = state => {
    const f = ensureFight(state);
    if (state.hp<=0) return [];
    if (!state.flags?.sentinelTactic && f.round===0) {
      return [
        { label:'Reculer dans un renfoncement pour les obliger à venir une par une', stay:true, effect:s=>setTactic(s,'alcove') },
        { label:'Frapper la première de toutes tes forces pour tenter de la repousser', stay:true, effect:s=>setTactic(s,'power') },
        { label:'Rester au centre et combattre normalement', stay:true, effect:s=>setTactic(s,'normal') }
      ];
    }
    return combatChoices(state);
  };

  STORY.c80.text = state => {
    const f = ensureFight(state);
    const tactic = state.flags?.sentinelTactic || 'normal';
    if (f.hp.every(h=>h<=0)) return `${cardHtml(state)}${resultHtml(state)}<p>Les deux sentinelles sont tombées. Une porte ouverte au fond du poste mène à l’ancienne armurerie.</p>`;
    return `${tacticalHtml(state)}${resultHtml(state)}`;
  };
  STORY.c80.choices = state => combatChoices(state);

  /* Anciennes pages de résultat : garder les sauvegardes compatibles tout en utilisant le nouveau combat. */
  ['c132','c133','c134','c135'].forEach(id=>{
    if (!STORY[id]) return;
    STORY[id].text = state => `${tacticalHtml(state)}${resultHtml(state)}`;
    STORY[id].choices = state => combatChoices(state);
  });
})();
