/* Livre 01 — correctif direct du combat des deux sentinelles.
   Ce script est chargé après les surcouches générales de combat et rétablit
   des actions de lancer propres à sentinelFight. Il évite qu'un ancien combat
   standard ou une surcouche de dés n'intercepte le bouton « Jeter les dés ».
*/
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const STORY = book?.story;
  const rules = book?.rules || {};
  if (!book || !STORY) return;

  const IDS = ['c79','c80','c132','c133','c134','c135'];
  const STATS = { maxHp:6, dexterity:9, force:9, damage:1 };

  function d6() {
    const a = new Uint32Array(1);
    if (window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(a);
      return (a[0] % 6) + 1;
    }
    return Math.floor(Math.random() * 6) + 1;
  }

  const roll2 = () => [d6(), d6()];
  const sum = dice => (dice || []).reduce((a,b) => a + Number(b || 0), 0);
  const currentDexterity = state => typeof rules.currentDexterity === 'function' ? rules.currentDexterity(state) : Number(state.baseDexterity || 13);
  const currentForce = state => typeof rules.currentForce === 'function' ? rules.currentForce(state) : Number(state.baseForce || 8);

  function ensureFight(state) {
    state.flags = state.flags || {};
    if (!state.sentinelFight || !Array.isArray(state.sentinelFight.hp)) {
      state.sentinelFight = { hp:[STATS.maxHp, STATS.maxHp], round:0, last:null, contaminated:false, balanceVersion:5 };
    }
    const fight = state.sentinelFight;
    fight.hp = [0,1].map(i => Math.max(0, Math.min(STATS.maxHp, Number(fight.hp[i] ?? STATS.maxHp))));
    if (!Number.isInteger(fight.round)) fight.round = 0;
    return fight;
  }

  function heroDamage(state) {
    const power = state.weapon === 'none' ? 0 : (typeof rules.combatPower === 'function' ? rules.combatPower(state) : 0);
    return 2 + Number(power || 0);
  }

  function applyDamage(state, amount) {
    if (typeof rules.applyDamage === 'function') return rules.applyDamage(state, amount);
    state.hp = Math.max(0, Number(state.hp || 0) - amount);
    return { incoming:amount, absorbed:0, hpLost:amount, protectionAfter:0 };
  }

  function contaminationLevel(state) {
    return Math.max(0, Math.min(13, Number.isFinite(state.contamination) ? Math.floor(state.contamination) : 0));
  }

  function contaminateOnce(state, fight, resolution) {
    if ((resolution?.hpLost || 0) <= 0 || fight.contaminated) return;
    if (typeof rules.raiseContamination === 'function') rules.raiseContamination(state, 2);
    else state.contamination = Math.min(13, contaminationLevel(state) + 2);
    fight.contaminated = true;
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
    const fight = ensureFight(state);
    state.flags.sentinelTactic = tactic;
    if (tactic === 'alcove') addAlcovePenalty(state);
    else clearAlcovePenalty(state);
    fight.last = null;
  }

  function activeAlcoveTarget(state) {
    const fight = ensureFight(state);
    return fight.hp[0] > 0 ? 0 : (fight.hp[1] > 0 ? 1 : -1);
  }

  function oneEnemyExchange(state, target, options = {}) {
    const fight = ensureFight(state);
    if (state.hp <= 0 || target < 0 || fight.hp[target] <= 0) return null;

    const heroDice = roll2();
    const targetDice = roll2();
    const heroDexterity = currentDexterity(state) + Number(options.extraDex || 0);
    const heroForce = currentForce(state);
    const heroScore = heroDexterity + heroForce + sum(heroDice);
    const targetScore = STATS.dexterity + STATS.force + sum(targetDice);
    const report = [];
    let hitTarget = false;

    if (heroScore > targetScore) {
      hitTarget = true;
      const raw = heroDamage(state) + Number(options.bonusDamage || 0);
      const dealt = Math.min(fight.hp[target], Math.max(0, raw));
      fight.hp[target] -= dealt;
      report.push(`Tu touches la sentinelle ${target + 1} : ${dealt} dégât${dealt > 1 ? 's' : ''}.`);
      if (fight.hp[target] <= 0) report.push(`La sentinelle ${target + 1} s’effondre.`);
    } else if (heroScore < targetScore && !options.targetCannotAttack) {
      const resolution = applyDamage(state, STATS.damage);
      contaminateOnce(state, fight, resolution);
      report.push(`La sentinelle ${target + 1} te touche : ${resolution?.absorbed || 0} absorbé, ${resolution?.hpLost || 0} Vie perdue.`);
    } else {
      report.push(options.targetCannotAttack
        ? `La sentinelle ${target + 1}, encore trop loin, ne peut pas riposter.`
        : `Tu pares la sentinelle ${target + 1} : égalité, aucun dégât.`);
    }

    fight.round += 1;
    fight.last = {
      kind:'melee', round:fight.round, target,
      heroDice, targetDice, heroDexterity, heroForce, heroScore, targetScore,
      report, hp:[...fight.hp], hitTarget, otherRolls:[]
    };
    state.lastCombatKey = null;
    state.lastCombatOutcome = null;
    return fight.last;
  }

  function normalRound(state, target) {
    const fight = ensureFight(state);
    const last = oneEnemyExchange(state, target);
    if (!last || state.hp <= 0) return;

    const other = 1 - target;
    if (fight.hp[other] > 0) {
      const dice = roll2();
      const score = STATS.dexterity + STATS.force + sum(dice);
      last.otherRolls.push({ index:other, dice, score });
      if (score > last.heroScore) {
        const resolution = applyDamage(state, STATS.damage);
        contaminateOnce(state, fight, resolution);
        last.report.push(`La sentinelle ${other + 1} t’attaque : ${resolution?.absorbed || 0} absorbé, ${resolution?.hpLost || 0} Vie perdue.`);
      } else {
        last.report.push(`Tu évites l’attaque de la sentinelle ${other + 1}.`);
      }
    }
    last.hp = [...fight.hp];
  }

  function powerOpening(state) {
    const fight = ensureFight(state);
    if (state.hp <= 0 || fight.hp[0] <= 0 || state.flags?.sentinelPowerOpeningResolved) return;

    const heroDice = roll2();
    const targetDice = roll2();
    const heroDexterity = currentDexterity(state) - 1;
    const heroForce = currentForce(state);
    const heroScore = heroDexterity + heroForce + sum(heroDice);
    const targetScore = STATS.dexterity + STATS.force + sum(targetDice);
    const report = [];
    let hitTarget = false;

    if (heroScore > targetScore) {
      hitTarget = true;
      const raw = heroDamage(state) + 2;
      const dealt = Math.min(fight.hp[0], raw);
      fight.hp[0] = Math.max(0, fight.hp[0] - dealt);
      report.push(`Ton coup inflige ${dealt} dégât${dealt > 1 ? 's' : ''}.`);
      state.flags.sentinelPowerOpeningSuccess = true;
      state.flags.sentinelPowerOpeningFailed = false;
      if (fight.hp[0] > 0) {
        state.flags.sentinelPowerAwayExchanges = 2;
        state.flags.sentinelTactic = 'power_success';
      } else {
        state.flags.sentinelPowerAwayExchanges = 0;
        state.flags.sentinelTactic = 'normal';
        report.push('La violence du coup abat la sentinelle 1 avant qu’elle puisse se relever.');
      }
    } else {
      const resolution = applyDamage(state, STATS.damage);
      contaminateOnce(state, fight, resolution);
      state.flags.sentinelPowerOpeningSuccess = false;
      state.flags.sentinelPowerOpeningFailed = true;
      state.flags.sentinelPowerAwayExchanges = 0;
      state.flags.sentinelTactic = 'power_failed';
      report.push(`Tu encaisses le contre : ${resolution?.absorbed || 0} absorbé, ${resolution?.hpLost || 0} Vie perdue.`);
    }

    state.flags.sentinelPowerOpeningResolved = true;
    fight.round += 1;
    fight.last = {
      kind:'power', round:fight.round, target:0,
      heroDice, targetDice, heroDexterity, heroForce, heroScore, targetScore,
      report, hp:[...fight.hp], hitTarget, otherRolls:[]
    };
    state.lastCombatKey = null;
    state.lastCombatOutcome = null;
  }

  function powerFollowupRound(state) {
    const fight = ensureFight(state);
    if (state.flags?.sentinelTactic !== 'power_success' || fight.hp[1] <= 0) return;
    const last = oneEnemyExchange(state, 1);
    if (!last) return;

    let remaining = Math.max(0, Number(state.flags.sentinelPowerAwayExchanges || 0) - 1);
    state.flags.sentinelPowerAwayExchanges = remaining;

    if (fight.hp[1] <= 0 && fight.hp[0] > 0 && remaining > 0) {
      remaining = 0;
      state.flags.sentinelPowerAwayExchanges = 0;
      state.flags.sentinelTactic = 'normal';
      last.report.push('La sentinelle 2 tombe. La première a déjà repris appui et revient vers toi.');
    } else if (remaining <= 0) {
      state.flags.sentinelTactic = 'normal';
      if (fight.hp[0] > 0 && fight.hp[1] > 0) last.report.push('La sentinelle 1 retrouve enfin son équilibre et revient au combat. Elles sont de nouveau toutes les deux face à toi.');
    } else {
      last.report.push(`La sentinelle 1 est toujours hors de portée. Il reste ${remaining} échange${remaining > 1 ? 's' : ''} avant son retour.`);
    }
    last.hp = [...fight.hp];
  }

  function throwBlade(state, target) {
    const fight = ensureFight(state);
    if ((state.throwingBlades || 0) <= 0 || fight.hp[target] <= 0) return;
    state.throwingBlades -= 1;
    const dice = [d6(), d6(), d6()];
    const dexterity = currentDexterity(state);
    const total = sum(dice);
    const success = total <= dexterity;
    const dealt = success ? Math.min(2, fight.hp[target]) : 0;
    fight.hp[target] -= dealt;
    fight.round += 1;
    fight.last = {
      kind:'blade', round:fight.round, target,
      heroDice:dice, heroDexterity:dexterity, success,
      report:[
        success ? `Ta lame touche la sentinelle ${target + 1} : ${dealt} dégâts.` : `Ta lame manque la sentinelle ${target + 1}.`,
        'Tu restes hors de portée : aucune sentinelle ne riposte pendant ce lancer.'
      ],
      hp:[...fight.hp]
    };
    state.lastCombatKey = null;
    state.lastCombatOutcome = null;
  }

  function victoryChoices() {
    return [{ label:'Fouiller l’armurerie', to:'c81', effect:clearAlcovePenalty }];
  }

  function combatChoices(state) {
    const fight = ensureFight(state);
    if (state.hp <= 0) return [];
    if (fight.hp.every(hp => hp <= 0)) return victoryChoices();
    const tactic = state.flags?.sentinelTactic;

    if (!tactic && fight.round === 0) {
      return [
        { label:'Reculer dans un renfoncement pour les obliger à venir une par une', stay:true, effect:s => setTactic(s, 'alcove') },
        { label:'Frapper la première de toutes tes forces pour tenter de la repousser', stay:true, effect:s => {
          setTactic(s, 'power');
          s.flags.sentinelPowerOpeningResolved = false;
          s.flags.sentinelPowerOpeningFailed = false;
          s.flags.sentinelPowerOpeningSuccess = false;
        }},
        { label:'Rester au centre et combattre normalement', stay:true, effect:s => setTactic(s, 'normal') }
      ];
    }

    if (tactic === 'power' && !state.flags?.sentinelPowerOpeningResolved) {
      return [{ label:'Jeter les dés pour porter le coup', stay:true, inlineCombat:true, effect:powerOpening }];
    }

    if (tactic === 'power_failed') {
      return [
        { label:'Reculer dans le renfoncement pour les obliger à venir une par une', stay:true, effect:s => setTactic(s, 'alcove') },
        { label:'Rester au centre et les combattre normalement', stay:true, effect:s => setTactic(s, 'normal') }
      ];
    }

    if (tactic === 'power_success') {
      if (fight.hp[1] <= 0) {
        state.flags.sentinelPowerAwayExchanges = 0;
        state.flags.sentinelTactic = 'normal';
        return combatChoices(state);
      }
      const list = [{ label:'Jeter les dés contre la sentinelle 2', stay:true, inlineCombat:true, effect:powerFollowupRound }];
      if ((state.throwingBlades || 0) > 0) list.push({ label:'Lancer une lame sur la sentinelle 2', stay:true, inlineCombat:true, effect:s => throwBlade(s, 1) });
      return list;
    }

    if (tactic === 'alcove') {
      const target = activeAlcoveTarget(state);
      if (target < 0) return victoryChoices();
      const list = [{ label:'Jeter les dés', stay:true, inlineCombat:true, effect:s => oneEnemyExchange(s, target) }];
      if ((state.throwingBlades || 0) > 0) list.push({ label:`Lancer une lame de jet — ${state.throwingBlades} restante${state.throwingBlades > 1 ? 's' : ''}`, stay:true, inlineCombat:true, effect:s => throwBlade(s, target) });
      return list;
    }

    const list = [];
    fight.hp.forEach((hp, index) => {
      if (hp <= 0) return;
      list.push({ label:`Jeter les dés contre la sentinelle ${index + 1}`, stay:true, inlineCombat:true, effect:s => normalRound(s, index) });
      if ((state.throwingBlades || 0) > 0) list.push({ label:`Lancer une lame sur la sentinelle ${index + 1}`, stay:true, inlineCombat:true, effect:s => throwBlade(s, index) });
    });
    return list.length ? list : victoryChoices();
  }

  for (const id of IDS) {
    const scene = STORY[id];
    if (!scene) continue;
    scene.choices = combatChoices;
    scene.__sentinelDirectRollFixV2 = true;
  }
})();