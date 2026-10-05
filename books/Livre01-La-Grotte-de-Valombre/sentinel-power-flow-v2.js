/* DEV — Sentinelles noires : flux tactique V2.
   - L'introduction n'apparait qu'avant le premier choix tactique.
   - Coup puissant rate : texte d'echec, puis choix renfoncement / combat normal.
   - Coup puissant reussi : sentinelle 1 projetee hors de portee pendant 2 echanges.
   - Pendant ces 2 echanges, seule la sentinelle 2 peut etre ciblee / attaquer.
   - Icones : memes PNG que les autres caracteristiques. */
(function () {
  'use strict';

  const book = window.BookRegistry?.get?.('ecuyer-01');
  const STORY = book?.story;
  if (!book || !STORY?.c79 || !STORY?.c80) return;

  const STATS = { maxHp:6, dexterity:9, force:9, damage:1 };
  const VERSION = 2;
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
  const roll2 = () => [d6(), d6()];
  const sum = dice => (dice || []).reduce((a,b)=>a+b,0);

  function renderDie(value) {
    const patterns={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
    const pips=patterns[Math.max(1,Math.min(6,Number(value)||1))]||[];
    return `<span class="die-visual">${Array.from({length:9},(_,i)=>`<span class="die-cell">${pips.includes(i)?'<i></i>':''}</span>`).join('')}</span>`;
  }

  function ensureFight(state) {
    state.flags = state.flags || {};
    if (!state.sentinelFight || !Array.isArray(state.sentinelFight.hp)) {
      state.sentinelFight = { hp:[STATS.maxHp,STATS.maxHp], round:0, last:null, contaminated:false, balanceVersion:5 };
    }
    const f=state.sentinelFight;
    f.hp=[0,1].map(i=>Math.max(0,Math.min(STATS.maxHp,Number(f.hp[i] ?? STATS.maxHp))));
    if (!Number.isInteger(f.round)) f.round=0;

    if (state.flags.sentinelPowerFlowVersion !== VERSION) {
      state.flags.sentinelPowerFlowVersion = VERSION;
      state.flags.sentinelPowerAwayExchanges = 0;
      state.flags.sentinelPowerOpeningSuccess = false;
      state.flags.sentinelPowerOpeningFailed = false;
      if (f.round > 0 && state.flags.sentinelTactic === 'power') state.flags.sentinelTactic = 'normal';
    }
    return f;
  }

  function heroDamage(state) {
    const power = state.weapon === 'none' ? 0 : (typeof rules.combatPower === 'function' ? rules.combatPower(state) : 0);
    return 2 + power;
  }

  function applyDamage(state, amount) {
    if (typeof rules.applyDamage === 'function') return rules.applyDamage(state, amount);
    state.hp=Math.max(0,Number(state.hp||0)-amount);
    return { incoming:amount, absorbed:0, hpLost:amount, protectionAfter:0 };
  }

  function contaminateOnce(state, fight, resolution) {
    if ((resolution?.hpLost || 0) <= 0 || fight.contaminated) return;
    if (typeof rules.raiseContamination === 'function') rules.raiseContamination(state,2);
    else state.contamination=Math.min(13,contaminationLevel(state)+2);
    fight.contaminated=true;
  }

  function cardHtml(state) {
    const f=ensureFight(state);
    return `<div class="enemy-card" aria-label="Fiche des adversaires">
      <div class="enemy-card-title">DEUX SENTINELLES NOIRES</div>
      <div class="enemy-card-stats">
        <div><span class="enemy-icon icon-jpg icon-vie" aria-hidden="true"></span><span>Sentinelle 1</span><strong>${f.hp[0]}/${STATS.maxHp} Vie</strong></div>
        <div><span class="enemy-icon icon-jpg icon-vie" aria-hidden="true"></span><span>Sentinelle 2</span><strong>${f.hp[1]}/${STATS.maxHp} Vie</strong></div>
        <div><span class="enemy-icon icon-jpg icon-dexterite" aria-hidden="true"></span><span>Dextérité</span><strong>${STATS.dexterity} chacune</strong></div>
        <div><span class="enemy-icon icon-jpg icon-force" aria-hidden="true"></span><span>Force</span><strong>${STATS.force} chacune</strong></div>
        <div><span class="enemy-icon icon-jpg icon-arme" aria-hidden="true"></span><span>Dégâts</span><strong>${STATS.damage} chacune</strong></div>
      </div>
    </div>`;
  }

  function addAlcovePenalty(state) {
    state.flags=state.flags||{};
    if (state.flags.sentinelAlcovePenaltyApplied) return;
    state.dexPenalty=Number(state.dexPenalty||0)+1;
    state.flags.sentinelAlcovePenaltyApplied=true;
  }
  function clearAlcovePenalty(state) {
    if (!state.flags?.sentinelAlcovePenaltyApplied) return;
    state.dexPenalty=Math.max(0,Number(state.dexPenalty||0)-1);
    state.flags.sentinelAlcovePenaltyApplied=false;
  }

  function setTactic(state,tactic,{clearResult=true}={}) {
    const f=ensureFight(state);
    state.flags.sentinelTactic=tactic;
    if (tactic==='alcove') addAlcovePenalty(state); else clearAlcovePenalty(state);
    if (clearResult) f.last=null;
  }

  function activeAlcoveTarget(state) {
    const f=ensureFight(state);
    return f.hp[0]>0?0:(f.hp[1]>0?1:-1);
  }

  function oneEnemyExchange(state,target,options={}) {
    const f=ensureFight(state);
    if (state.hp<=0 || target<0 || f.hp[target]<=0) return null;
    const heroDice=roll2();
    const targetDice=roll2();
    const heroDex=currentDexterity(state)+Number(options.extraDex||0);
    const heroForce=currentForce(state);
    const heroScore=heroDex+heroForce+sum(heroDice);
    const targetScore=STATS.dexterity+STATS.force+sum(targetDice);
    const report=[];
    let hitTarget=false;

    if (heroScore>targetScore) {
      hitTarget=true;
      const raw=heroDamage(state)+Number(options.bonusDamage||0);
      const dealt=Math.min(f.hp[target],Math.max(0,raw));
      f.hp[target]-=dealt;
      report.push(`Tu touches la sentinelle ${target+1} : ${dealt} dégât${dealt>1?'s':''}.`);
      if (f.hp[target]<=0) report.push(`La sentinelle ${target+1} s’effondre.`);
    } else if (heroScore<targetScore && !options.targetCannotAttack) {
      const res=applyDamage(state,STATS.damage);
      contaminateOnce(state,f,res);
      report.push(`La sentinelle ${target+1} te touche : ${res.absorbed||0} absorbé, ${res.hpLost||0} Vie perdue.`);
    } else {
      report.push(options.targetCannotAttack
        ? `La sentinelle ${target+1}, encore trop loin, ne peut pas riposter.`
        : `Tu pares la sentinelle ${target+1} : égalité, aucun dégât.`);
    }

    f.round+=1;
    f.last={kind:'melee',round:f.round,target,heroDice,targetDice,heroDexterity:heroDex,heroForce,heroScore,targetScore,report,hp:[...f.hp],hitTarget,otherRolls:[]};
    return f.last;
  }

  function normalRound(state,target) {
    const f=ensureFight(state);
    const last=oneEnemyExchange(state,target);
    if (!last || state.hp<=0) return;
    const other=1-target;
    if (f.hp[other]>0) {
      const dice=roll2();
      const score=STATS.dexterity+STATS.force+sum(dice);
      last.otherRolls.push({index:other,dice,score});
      if (score>last.heroScore) {
        const res=applyDamage(state,STATS.damage);
        contaminateOnce(state,f,res);
        last.report.push(`La sentinelle ${other+1} t’attaque : ${res.absorbed||0} absorbé, ${res.hpLost||0} Vie perdue.`);
      } else {
        last.report.push(`Tu évites l’attaque de la sentinelle ${other+1}.`);
      }
    }
    last.hp=[...f.hp];
  }

  function powerOpening(state) {
    const f=ensureFight(state);
    if (state.hp<=0 || f.hp[0]<=0 || state.flags.sentinelPowerOpeningResolved) return;

    const heroDice=roll2();
    const targetDice=roll2();
    const heroDex=currentDexterity(state)-1;
    const heroForce=currentForce(state);
    const heroScore=heroDex+heroForce+sum(heroDice);
    const targetScore=STATS.dexterity+STATS.force+sum(targetDice);
    const report=[];
    let hitTarget=false;

    if (heroScore>targetScore) {
      hitTarget=true;
      const raw=heroDamage(state)+2;
      const dealt=Math.min(f.hp[0],raw);
      f.hp[0]=Math.max(0,f.hp[0]-dealt);
      report.push(`Ton coup inflige ${dealt} dégât${dealt>1?'s':''}.`);
      state.flags.sentinelPowerOpeningSuccess=true;
      state.flags.sentinelPowerOpeningFailed=false;
      if (f.hp[0]>0) {
        state.flags.sentinelPowerAwayExchanges=2;
        state.flags.sentinelTactic='power_success';
      } else {
        state.flags.sentinelPowerAwayExchanges=0;
        state.flags.sentinelTactic='normal';
        report.push('La violence du coup abat la sentinelle 1 avant qu’elle puisse se relever.');
      }
    } else {
      const res=applyDamage(state,STATS.damage);
      contaminateOnce(state,f,res);
      state.flags.sentinelPowerOpeningSuccess=false;
      state.flags.sentinelPowerOpeningFailed=true;
      state.flags.sentinelPowerAwayExchanges=0;
      state.flags.sentinelTactic='power_failed';
      report.push(`Tu encaisses le contre : ${res.absorbed||0} absorbé, ${res.hpLost||0} Vie perdue.`);
    }

    state.flags.sentinelPowerOpeningResolved=true;
    f.round+=1;
    f.last={kind:'power',round:f.round,target:0,heroDice,targetDice,heroDexterity:heroDex,heroForce,heroScore,targetScore,report,hp:[...f.hp],hitTarget,otherRolls:[]};
  }

  function powerFollowupRound(state) {
    const f=ensureFight(state);
    if (state.flags?.sentinelTactic!=='power_success' || f.hp[1]<=0) return;
    const last=oneEnemyExchange(state,1);
    if (!last) return;

    let remaining=Math.max(0,Number(state.flags.sentinelPowerAwayExchanges||0)-1);
    state.flags.sentinelPowerAwayExchanges=remaining;

    if (f.hp[1]<=0 && f.hp[0]>0 && remaining>0) {
      remaining=0;
      state.flags.sentinelPowerAwayExchanges=0;
      state.flags.sentinelTactic='normal';
      last.report.push('La sentinelle 2 tombe. La première a déjà repris appui et revient vers toi.');
    } else if (remaining<=0) {
      state.flags.sentinelTactic='normal';
      if (f.hp[0]>0 && f.hp[1]>0) last.report.push('La sentinelle 1 retrouve enfin son équilibre et revient au combat. Elles sont de nouveau toutes les deux face à toi.');
    } else {
      last.report.push(`La sentinelle 1 est toujours hors de portée. Il reste ${remaining} échange${remaining>1?'s':''} avant son retour.`);
    }
    last.hp=[...f.hp];
  }

  function throwBlade(state,target) {
    const f=ensureFight(state);
    if ((state.throwingBlades||0)<=0 || f.hp[target]<=0) return;
    state.throwingBlades-=1;
    const dice=[d6(),d6(),d6()];
    const dex=currentDexterity(state);
    const total=sum(dice);
    const success=total<=dex;
    const dealt=success?Math.min(2,f.hp[target]):0;
    f.hp[target]-=dealt;
    f.round+=1;
    f.last={kind:'blade',round:f.round,target,heroDice:dice,heroDexterity:dex,success,report:[success?`Ta lame touche la sentinelle ${target+1} : ${dealt} dégâts.`:`Ta lame manque la sentinelle ${target+1}.`,'Tu restes hors de portée : aucune sentinelle ne riposte pendant ce lancer.'],hp:[...f.hp]};
  }

  function diceHtml(dice){return `<div class="combat-dice">${(dice||[]).map(renderDie).join('')}</div>`;}

  function resultHtml(state) {
    const f=ensureFight(state); const r=f.last;
    if (!r) return '';
    if (r.kind==='blade') {
      return `<div class="combat-roll-result"><div class="combat-roll-title">Lame de jet</div><div class="combat-side"><strong>TOI</strong>${diceHtml(r.heroDice)}<p>Dextérité ${r.heroDexterity} · dés ${sum(r.heroDice)}</p><p class="combat-total"><strong>${r.success?'Réussite':'Échec'}</strong></p></div><div class="combat-outcome">${r.report.map(x=>`<p>${x}</p>`).join('')}</div><div class="combat-life-line">Ta Vie : <strong>${state.hp}/${state.maxHp}</strong> · Protection : <strong>${currentProtection(state)}</strong> · Terre noire : <strong>${contaminationLevel(state)}/13</strong></div></div>`;
    }
    return `<div class="combat-roll-result">
      <div class="combat-roll-title">Échange n° ${r.round}</div>
      <div class="combat-roll-grid">
        <div class="combat-side"><strong>TOI</strong>${diceHtml(r.heroDice)}<p>Dextérité ${r.heroDexterity} + Force ${r.heroForce} + dés ${sum(r.heroDice)}</p><p class="combat-total">Attaque : <strong>${r.heroScore}</strong></p></div>
        <div class="combat-versus">VS</div>
        <div class="combat-side"><strong>SENTINELLE ${r.target+1}</strong>${diceHtml(r.targetDice)}<p>Dextérité ${STATS.dexterity} + Force ${STATS.force} + dés ${sum(r.targetDice)}</p><p class="combat-total">Attaque : <strong>${r.targetScore}</strong></p></div>
      </div>
      ${(r.otherRolls||[]).map(a=>`<div class="combat-secondary-roll"><strong>Attaque de la sentinelle ${a.index+1}</strong>${diceHtml(a.dice)}<p>Dextérité ${STATS.dexterity} + Force ${STATS.force} + dés ${sum(a.dice)} · Attaque : <strong>${a.score}</strong> contre ${r.heroScore}</p></div>`).join('')}
      <div class="combat-outcome">${r.report.map(x=>`<p>${x}</p>`).join('')}</div>
      <div class="combat-life-line">Ta Vie : <strong>${state.hp}/${state.maxHp}</strong> · Protection : <strong>${currentProtection(state)}</strong> · Terre noire : <strong>${contaminationLevel(state)}/13</strong></div>
    </div>`;
  }

  function introHtml(state) {
    return `<p>Deux silhouettes entrent dans le poste de garde. Elles portent les restes d’un uniforme.</p>
      <p>Leurs traits demeurent presque humains. Une terre noire et épaisse coule de leurs bouches.</p>
      <p>L’une avance devant toi. L’autre contourne le pupitre.</p>
      <p>Elles cherchent déjà à te prendre à deux. Tu n’as que quelques secondes pour choisir comment recevoir leur attaque.</p>${cardHtml(state)}`;
  }

  function tacticalHtml(state) {
    const tactic=state.flags?.sentinelTactic;
    const f=ensureFight(state);
    if (tactic==='alcove') {
      const target=activeAlcoveTarget(state);
      return `<p>Tu recules jusqu’à un renfoncement étroit du mur.</p><p>Les deux silhouettes ne peuvent plus passer de front. <strong>${target>=0?`La sentinelle ${target+1}`:'Aucune sentinelle'}</strong> peut t’atteindre ; l’autre reste bloquée derrière elle.</p><p>Les murs gênent tes mouvements : <strong>Dextérité −1 pendant tout le combat.</strong></p>${cardHtml(state)}`;
    }
    if (tactic==='power' && !state.flags?.sentinelPowerOpeningResolved) {
      return `<p>Tu refuses de leur laisser le temps de t’encercler.</p><p>Tu armes un coup de toutes tes forces contre la première sentinelle. <strong>Dextérité −1 pour cet échange</strong>, mais si ton coup porte il inflige <strong>+2 dégâts</strong>.</p>${cardHtml(state)}`;
    }
    if (tactic==='power_failed') {
      return `<p><strong>Malgré toute ta force, la sentinelle dévie ton coup et parvient à t’atteindre.</strong></p><p>Elles sont désormais toutes les deux face à toi. Tu dois immédiatement choisir une nouvelle position.</p>${cardHtml(state)}`;
    }
    if (tactic==='power_success') {
      const remaining=Math.max(0,Number(state.flags?.sentinelPowerAwayExchanges||0));
      const firstLine=f.last?.kind==='power'
        ? '<p><strong>Tu parviens à projeter la sentinelle 1 en arrière. Elle ne pourra pas intervenir pendant les deux prochains échanges.</strong></p>'
        : '<p><strong>La sentinelle 1 est encore trop loin pour intervenir.</strong></p>';
      return `${firstLine}<p>Tu as la sentinelle 2 seule face à toi${remaining?` pendant encore ${remaining} échange${remaining>1?'s':''}`:''}.</p>${cardHtml(state)}`;
    }
    if (tactic==='normal') {
      return `<p>Tu restes au centre du poste de garde, là où tu peux surveiller les adversaires encore debout.</p><p>Si elles sont toutes les deux face à toi, la seconde cherchera à te frapper pendant que tu affrontes l’autre.</p>${cardHtml(state)}`;
    }
    return introHtml(state);
  }

  function victoryChoices(state){return [{label:'Fouiller l’armurerie',to:'c81',effect:s=>clearAlcovePenalty(s)}];}

  function combatChoices(state) {
    const f=ensureFight(state);
    if (state.hp<=0) return [];
    if (f.hp.every(h=>h<=0)) return victoryChoices(state);
    const tactic=state.flags?.sentinelTactic;

    if (!tactic && f.round===0) {
      return [
        {label:'Reculer dans un renfoncement pour les obliger à venir une par une',stay:true,effect:s=>setTactic(s,'alcove')},
        {label:'Frapper la première de toutes tes forces pour tenter de la repousser',stay:true,effect:s=>{setTactic(s,'power');s.flags.sentinelPowerOpeningResolved=false;s.flags.sentinelPowerOpeningFailed=false;s.flags.sentinelPowerOpeningSuccess=false;}},
        {label:'Rester au centre et combattre normalement',stay:true,effect:s=>setTactic(s,'normal')}
      ];
    }

    if (tactic==='power' && !state.flags?.sentinelPowerOpeningResolved) {
      return [{label:'Jeter les dés pour porter le coup',stay:true,inlineCombat:true,effect:powerOpening}];
    }

    if (tactic==='power_failed') {
      return [
        {label:'Reculer dans le renfoncement pour les obliger à venir une par une',stay:true,effect:s=>setTactic(s,'alcove')},
        {label:'Rester au centre et les combattre normalement',stay:true,effect:s=>setTactic(s,'normal')}
      ];
    }

    if (tactic==='power_success') {
      if (f.hp[1]<=0) {
        state.flags.sentinelPowerAwayExchanges=0;
        state.flags.sentinelTactic='normal';
        return combatChoices(state);
      }
      const list=[{label:'Jeter les dés contre la sentinelle 2',stay:true,inlineCombat:true,effect:powerFollowupRound}];
      if ((state.throwingBlades||0)>0) list.push({label:'Lancer une lame sur la sentinelle 2',stay:true,inlineCombat:true,effect:s=>throwBlade(s,1)});
      return list;
    }

    if (tactic==='alcove') {
      const target=activeAlcoveTarget(state);
      if (target<0) return victoryChoices(state);
      const list=[{label:'Jeter les dés',stay:true,inlineCombat:true,effect:s=>oneEnemyExchange(s,target)}];
      if ((state.throwingBlades||0)>0) list.push({label:`Lancer une lame de jet — ${state.throwingBlades} restante${state.throwingBlades>1?'s':''}`,stay:true,inlineCombat:true,effect:s=>throwBlade(s,target)});
      return list;
    }

    const list=[];
    f.hp.forEach((hp,i)=>{
      if (hp<=0) return;
      list.push({label:`Jeter les dés contre la sentinelle ${i+1}`,stay:true,inlineCombat:true,effect:s=>normalRound(s,i)});
      if ((state.throwingBlades||0)>0) list.push({label:`Lancer une lame sur la sentinelle ${i+1}`,stay:true,inlineCombat:true,effect:s=>throwBlade(s,i)});
    });
    return list.length?list:victoryChoices(state);
  }

  function textFor(state) {
    const f=ensureFight(state);
    if (!state.flags?.sentinelTactic && f.round===0) return introHtml(state);
    if (f.hp.every(h=>h<=0)) return `${cardHtml(state)}${resultHtml(state)}<p>Les deux sentinelles sont à terre. Le silence revient dans le poste de garde.</p>`;
    return `${tacticalHtml(state)}${resultHtml(state)}`;
  }

  ['c79','c80','c132','c133','c134','c135'].forEach(id=>{
    if (!STORY[id]) return;
    STORY[id].text=textFor;
    STORY[id].choices=combatChoices;
  });
})();
