/* Livre 02 — Le Secret du Providence */
(function(){
'use strict';

function heroGender(s){return s.heroGender==='male'?'male':'female';}
function heroName(s){return heroGender(s)==='male'?'Edward':'Eleanor';}
function heroRank(){return 'Lieutenant de la Royal Navy';}
function setHeroIdentity(s,g){s.heroGender=g==='male'?'male':'female';s.heroName=heroName(s);}
function currentForce(s){return Math.max(3,(s.baseForce||8)+(s.forceBonus||0));}
function currentDexterity(s){return Math.max(3,(s.baseDexterity||13)+(s.dexBonus||0)-(s.dexPenalty||0));}
function beginCombatPowder(s,key){
  if(s.flags.combatPowderActiveKey)return s.flags.combatPowderActiveKey===key;
  if(!s.flags.combatPowderReady)return false;
  s.flags.combatPowderReady=false;
  s.flags.combatPowderActiveKey=key;
  return true;
}
function combatPowderActive(s,key){return s.flags.combatPowderActiveKey===key;}
function combatForce(s,key){return currentForce(s)+(combatPowderActive(s,key)?2:0);}
function combatDexterity(s,key){return currentDexterity(s)+(combatPowderActive(s,key)?2:0);}
function finishCombatPowder(s,key){
  if(s.flags.combatPowderActiveKey===key){
    delete s.flags.combatPowderActiveKey;
    s.flags.combatPowderUsed=true;
  }
  clearCombatPowderPrompt(s,key);
}
function useCombatPowder(s){
  if(!s.inventory?.poudre_combat||s.flags.combatPowderReady||s.flags.combatPowderActiveKey)return false;
  delete s.inventory.poudre_combat;
  s.flags.combatPowderReady=true;
  return true;
}
function combatPowderPromptNeeded(s,key){
  return !!(s.inventory?.poudre_combat&&!s.flags.combatPowderReady&&!s.flags.combatPowderActiveKey&&s.flags.combatPowderDeclinedKey!==key);
}
function combatPowderPromptChoices(s,key,normalChoices){
  if(!combatPowderPromptNeeded(s,key))return normalChoices;
  return[
    {label:'Prendre la poudre de combat — +2 Dextérité et +2 Force',stay:true,effect:x=>{useCombatPowder(x);x.flags.combatPowderAcceptedKey=key;}},
    {label:'La garder pour un prochain combat',stay:true,effect:x=>{x.flags.combatPowderDeclinedKey=key;}}
  ];
}
function clearCombatPowderPrompt(s,key){
  if(s.flags.combatPowderDeclinedKey===key)delete s.flags.combatPowderDeclinedKey;
  if(s.flags.combatPowderAcceptedKey===key)delete s.flags.combatPowderAcceptedKey;
}
function combatPowderReminderHtml(s,key){
  if(!combatPowderPromptNeeded(s,key))return '';
  return '<div class="combat-roll-result"><div class="combat-roll-title">Poudre de combat</div><p>Tu as encore la poudre trouvée dans la forêt.</p><p><strong>Veux-tu la prendre avant ce combat ?</strong></p><p>Effet : <strong>+2 Dextérité et +2 Force pendant tout ce combat</strong>. Usage unique.</p></div>';
}
function combatPower(s){return s.weapon==='naval_sword'?4:0;}
const HERO_BASE_DAMAGE=2;
function heroCombatDamage(s){return HERO_BASE_DAMAGE+(s.weapon==='none'?0:combatPower(s));}
function enemyCombatDamage(e){return e.damage+(Number.isFinite(e.weaponPower)?e.weaponPower:0);}
function weaponLabel(s){return s.weapon==='naval_sword'?'Sabre court de marine':'Aucune';}
const PROTECTION_ITEMS={
  brassard_avant_bras:{max:3,name:'Brassard d’avant-bras renforcé'},
  gantelets:{max:4,name:'Gantelets renforcés'}
};
function normalizeProtectionItems(s){
  if(!s.inventory)s.inventory={};
  if(s.inventory.gantelets_marchands&&!s.inventory.brassard_avant_bras){
    s.inventory.brassard_avant_bras={
      ...s.inventory.gantelets_marchands,
      name:'Brassard d’avant-bras renforcé',
      description:'Un large brassard de cuir épais renforcé de fines plaques métalliques rivetées. Protection +3.'
    };
    delete s.inventory.gantelets_marchands;
  }
}
function ensureProtectionState(s){
  normalizeProtectionItems(s);
  if(!s.protectionItems||typeof s.protectionItems!=='object')s.protectionItems={};
  for(const [id,def] of Object.entries(PROTECTION_ITEMS)){
    if(s.inventory?.[id]&&!s.protectionItems[id])s.protectionItems[id]={max:def.max,remaining:def.max};
    if(s.protectionItems[id]){
      s.protectionItems[id].max=def.max;
      s.protectionItems[id].remaining=Math.max(0,Math.min(def.max,Number(s.protectionItems[id].remaining)||0));
    }
  }
}
function addProtectiveItem(s,id,name,description,protection){
  addItem(s,id,name,description,{protection});
  ensureProtectionState(s);
  s.protectionItems[id]={max:protection,remaining:protection};
  s.protection=currentProtection(s);
}
function removeProtectiveItem(s,id){
  if(s.inventory?.[id])delete s.inventory[id];
  ensureProtectionState(s);
  delete s.protectionItems[id];
  s.protection=currentProtection(s);
}
function currentProtection(s){
  ensureProtectionState(s);
  let total=0;
  for(const [id] of Object.entries(PROTECTION_ITEMS)){
    if(!s.inventory?.[id])continue;
    total+=Math.max(0,Number(s.protectionItems[id]?.remaining)||0);
  }
  s.protection=total;
  return total;
}
function maxProtection(s){
  return Object.entries(PROTECTION_ITEMS).reduce((total,[id,def])=>total+(s.inventory?.[id]?def.max:0),0);
}
function syncProtection(s){
  s.protection=currentProtection(s);
  return s.protection;
}
function applyDamage(s,a){
  ensureProtectionState(s);
  const incoming=Math.max(0,Math.floor(Number(a)||0));
  let remaining=incoming;
  let absorbed=0;
  const before=currentProtection(s);
  const destroyedProtection=[];
  for(const [id,def] of Object.entries(PROTECTION_ITEMS)){
    if(!s.inventory?.[id]||remaining<=0)continue;
    const source=s.protectionItems[id];
    const available=Math.max(0,Number(source?.remaining)||0);
    const used=Math.min(available,remaining);
    if(used>0){
      source.remaining-=used;
      remaining-=used;
      absorbed+=used;
      if(available>0&&source.remaining<=0)destroyedProtection.push(def.name);
    }
  }
  const hpLost=remaining;
  s.hp=Math.max(0,s.hp-hpLost);
  const result={incoming,absorbed,hpLost,destroyedProtection,protectionBefore:before,protectionAfter:currentProtection(s),heroHp:s.hp};
  s.lastDamageResolution=result;
  return result;
}

function addGold(s,n){s.goldCoins=(s.goldCoins||0)+n;}
function pirateCrewSize(s){
  const n=Math.max(0,Math.floor(Number(s.soldiers)||0));
  if(n>=9)return 12;
  if(n>=7)return 10;
  if(n>=5)return 8;
  if(n>=3)return 6;
  return 5;
}
function pirateCountForBattle(s,key){
  const b=s.crewBattles&&s.crewBattles[key];
  return b&&Number.isFinite(b.initialEnemy)?b.initialEnemy:pirateCrewSize(s);
}
function loseSoldier(s,n=1){
  const loss=Math.min(Math.max(0,n),s.expeditionSoldiers||0);
  s.expeditionSoldiers=Math.max(0,(s.expeditionSoldiers||0)-loss);
  s.soldiers=Math.max(0,(s.soldiers||0)-loss);
  return loss;
}
function addBlueDiamond(s){
  if(!s.inventory.diamant_bleu)addItem(s,'diamant_bleu','Pierre bleue','Une pierre bleue taillée, à la transparence inhabituelle.',{quantity:1});
  else s.inventory.diamant_bleu.quantity=(s.inventory.diamant_bleu.quantity||1)+1;
}
function addRumCrate(s,n=1){
  if(!s.inventory.caisse_rhum)addItem(s,'caisse_rhum','Tonneau de rhum','Du rhum des Caraïbes conservé en tonneau. Une marchandise qui peut être offerte, troquée ou utilisée pour négocier.',{quantity:n});
  else {
    s.inventory.caisse_rhum.name='Tonneau de rhum';
    s.inventory.caisse_rhum.description='Du rhum des Caraïbes conservé en tonneau. Une marchandise qui peut être offerte, troquée ou utilisée pour négocier.';
    s.inventory.caisse_rhum.quantity=(s.inventory.caisse_rhum.quantity||1)+n;
  }
}
function rumCrateCount(s){
  const item=s.inventory?.caisse_rhum;
  return item?Math.max(0,Math.floor(Number(item.quantity)||1)):0;
}
function spendRumCrates(s,n){
  const item=s.inventory?.caisse_rhum;
  if(!item)return false;
  const have=rumCrateCount(s);
  if(have<n)return false;
  const left=have-n;
  if(left<=0)delete s.inventory.caisse_rhum;
  else item.quantity=left;
  return true;
}
function spendGold(s,n){
  const have=Math.max(0,Math.floor(Number(s.goldCoins)||0));
  if(have<n)return false;
  s.goldCoins=have-n;
  return true;
}
function prepareSecondIslandParty(s){
  if(s.flags.secondIslandPartyReady)return;
  s.flags.secondIslandPartyReady=true;s.flags.haleAlive=true;s.flags.companion='hale';
  const expedition=Math.max(0,Math.floor(Number(s.expeditionSoldiers)||0));
  const shipAnonymous=Math.max(0,Math.floor(Number(s.shipSoldiers)||0));
  if(s.flags.commander==='hale'){
    const anonymousLosses=Math.min(3,shipAnonymous);
    const survivors=Math.max(0,shipAnonymous-anonymousLosses);
    const volunteers=Math.min(Math.max(0,4-expedition),survivors);
    s.flags.pirateAnonymousLoss=anonymousLosses;
    s.flags.pirateAttackLoss=anonymousLosses+1;
    s.flags.pirateSailorLoss=5;
    s.flags.haleVolunteers=volunteers;
    s.flags.shipRepairSoldiers=Math.max(0,survivors-volunteers);
    s.expeditionSoldiers=expedition+volunteers;
    s.soldiers=s.expeditionSoldiers;
  }else{
    const haleEscort=shipAnonymous>0?1:0;
    s.flags.pirateAttackLoss=0;
    s.flags.haleVolunteers=0;
    s.flags.haleEscortSoldier=haleEscort;
    s.expeditionSoldiers=expedition+haleEscort;
    s.soldiers=s.expeditionSoldiers;
  }
  s.shipSoldiers=0;
}
function keepSecondIslandSoldiersTogether(s){s.flags.flankingSoldiers=0;}
function secondIslandLocalSoldiers(s){
  const expedition=Math.max(0,Math.floor(Number(s.expeditionSoldiers)||0));
  if(expedition>0)return expedition;
  if((s.flags.flankingSoldiers||0)>0)return 0;
  return Math.max(0,Math.floor(Number(s.soldiers)||0));
}
function canSplitSecondIslandParty(s){
  return s.flags.haleAlive!==false && secondIslandLocalSoldiers(s)>=2;
}
function sendSecondIslandSoldiersAround(s){
  const n=secondIslandLocalSoldiers(s);
  s.flags.flankingSoldiers=n;
  s.expeditionSoldiers=0;
}
function resolveIslandLogTrap(s){
  if(s.flags.islandLogTrapRolled)return;
  s.flags.islandLogTrapRolled=true;
  s.flags.islandHeroDex=rollDex(s);
  if(!s.flags.islandHeroDex)rollDamage(s,'islandLogTrapHero',3);

  const halePresent=s.flags.haleAlive!==false;
  const n=Math.max(0,Math.floor(Number(s.expeditionSoldiers)||0));
  const flanking=Math.max(0,Math.floor(Number(s.flags.flankingSoldiers)||0));
  let haleRoll=halePresent?cryptoDie6():null;
  const rolls=Array.from({length:n},()=>cryptoDie6());

  // À partir de l'approche de la deuxième île, le dernier allié ne peut pas
  // être éliminé par un piège avant l'arrivée au village.
  if(flanking===0){
    const localAllies=(halePresent?1:0)+n;
    const haleFatal=halePresent&&haleRoll<=2;
    const soldierFatal=rolls.filter(v=>v<=2).length;
    if(localAllies>0&&soldierFatal+(haleFatal?1:0)>=localAllies){
      if(halePresent)haleRoll=3;
      else if(rolls.length)rolls[rolls.length-1]=3;
      s.flags.islandLastAllyProtected=true;
    }
  }

  s.flags.islandHaleRoll=haleRoll;
  if(halePresent&&haleRoll<=2){
    s.flags.haleAlive=false;
    s.flags.companion=null;
  }

  const dead=rolls.filter(v=>v<=2).length;
  s.flags.islandSoldierRolls=rolls;
  s.flags.islandSoldierDeaths=dead;
  s.expeditionSoldiers=Math.max(0,n-dead);
  s.soldiers=Math.max(0,(s.soldiers||0)-dead);
}
function resolveNightRaid(s){
  if(s.flags.nightRaidRolled)return;
  s.flags.nightRaidRolled=true;
  s.flags.villageTime='night';
  const n=Math.max(0,displayedSoldierCount(s));
  const rolls=[];for(let i=0;i<n;i++)rolls.push(cryptoDie6());
  const b=initVillageAssault(s);
  const successfulAttacks=rolls.filter(v=>v<=4).length;
  const kills=Math.min(successfulAttacks,Math.max(0,Math.floor(Number(b.enemy)||0)));
  b.enemy=Math.max(0,b.enemy-kills);
  if(b.enemy<=0){b.enemy=0;b.enemyDefeated=true;}
  s.flags.nightRaidRolls=rolls;
  s.flags.nightRaidAlerts=rolls.filter(v=>v>=5).length;
  s.flags.nightRaidKills=kills;
  s.flags.nightRaidRuleVersion='night-raid-v2';
}

function normalizeNightRaidResult(s){
  if(!s.flags.nightRaidRolled||!Array.isArray(s.flags.nightRaidRolls))return;
  if(s.flags.nightRaidRuleVersion==='night-raid-v2')return;
  const rolls=s.flags.nightRaidRolls.map(v=>Math.max(1,Math.min(6,Math.floor(Number(v)||6))));
  const b=initVillageAssault(s);
  if((b.round||0)>0||b.pistolOpeningLoss)return;
  const successfulAttacks=rolls.filter(v=>v<=4).length;
  const baseEnemy=Number.isFinite(b.initialEnemy)?Math.max(0,Math.floor(Number(b.initialEnemy)||0)):Math.max(0,9-Math.max(0,Math.floor(Number(s.flags.paleAssaultLoss)||0)));
  const kills=Math.min(successfulAttacks,baseEnemy);
  b.enemy=Math.max(0,baseEnemy-kills);
  b.enemyDefeated=b.enemy<=0;
  s.flags.nightRaidKills=kills;
  s.flags.nightRaidAlerts=rolls.filter(v=>v>=5).length;
  s.flags.nightRaidRuleVersion='night-raid-v2';
}

function initVillageAssault(s){
  if(s.flags.villageAssaultBattle){
    s.flags.villageAssaultBattle.failed=false;
    s.flags.villageAssaultBattle.progress=0;
    if(!Number.isFinite(s.flags.providenceMarinesWithParty)&&Number.isFinite(s.flags.villageAssaultBattle.marines)){
      s.flags.providenceMarinesWithParty=Math.max(0,Math.floor(Number(s.flags.villageAssaultBattle.marines)||0));
    }
    s.flags.villageAssaultBattle.marines=providenceMarinesWithParty(s);
    return s.flags.villageAssaultBattle;
  }
  const initialEnemy=Math.max(0,9-Math.max(0,Math.floor(Number(s.flags.paleAssaultLoss)||0)));
  const b={
    initialEnemy,
    enemy:initialEnemy,
    round:0,
    progress:0,
    marines:providenceMarinesWithParty(s),
    marineLosses:0,
    flankUsed:false,
    moraleTurns:null,
    enemyFled:false,
    enemyDefeated:false,
    failed:false,
    last:null
  };
  s.flags.villageAssaultBattle=b;
  return b;
}
function haleWithParty(s){
  return !!(s.flags?.companion==='hale' && s.flags?.haleAlive!==false);
}
function providenceMarinesWithParty(s){
  if(Number.isFinite(s.flags?.providenceMarinesWithParty))return Math.max(0,Math.floor(Number(s.flags.providenceMarinesWithParty)||0));
  const b=s.flags?.villageAssaultBattle;
  return b&&Number.isFinite(b.marines)?Math.max(0,Math.floor(Number(b.marines)||0)):0;
}
function setProvidenceMarinesWithParty(s,n){
  const value=Math.max(0,Math.floor(Number(n)||0));
  s.flags.providenceMarinesWithParty=value;
  if(s.flags.villageAssaultBattle)s.flags.villageAssaultBattle.marines=value;
  return value;
}
function ensureProvidenceMarinesWithParty(s,n){
  return setProvidenceMarinesWithParty(s,Math.max(providenceMarinesWithParty(s),Math.max(0,Math.floor(Number(n)||0))));
}
function displayedSoldierCount(s){
  const anonymous=Math.max(0,Math.floor(Number(s.soldiers)||0));
  return anonymous+(haleWithParty(s)?1:0)+providenceMarinesWithParty(s);
}
function villageHeroAlone(s){
  return displayedSoldierCount(s)===0;
}
function villageBattleAllies(s,b){
  return Math.max(0,Math.floor(Number(s.soldiers)||0))+(haleWithParty(s)?1:0)+Math.max(0,Math.floor(Number(b.marines)||0));
}
function removeVillageAssaultSoldiers(s,n){
  let remaining=Math.max(0,Math.floor(Number(n)||0));
  const totalLoss=Math.min(Math.max(0,Math.floor(Number(s.soldiers)||0)),remaining);
  let local=Math.max(0,Math.floor(Number(s.expeditionSoldiers)||0));
  const localLoss=Math.min(local,remaining);
  s.expeditionSoldiers=Math.max(0,local-localLoss);
  remaining-=localLoss;
  let flank=Math.max(0,Math.floor(Number(s.flags.flankingSoldiers)||0));
  const flankLoss=Math.min(flank,remaining);
  s.flags.flankingSoldiers=Math.max(0,flank-flankLoss);
  remaining-=flankLoss;
  s.soldiers=Math.max(0,(s.soldiers||0)-totalLoss);
  return totalLoss;
}
function villageBattleDiceRow(dice,threshold){
  if(!dice||!dice.length)return '<span class="combat-detail">aucun dé</span>';
  return dice.map(v=>`<span class="crew-training-die ${v<=threshold?'success':'miss'}">${renderDie(v)}</span>`).join('');
}
function villageAssaultRound(s,action){
  const b=initVillageAssault(s);
  if(b.enemy<=0||b.enemyFled||s.hp<=0)return;

const enemyBefore=b.enemy;
  const soldiersBefore=Math.max(0,Math.floor(Number(s.soldiers)||0));
  const marinesBefore=Math.max(0,Math.floor(Number(b.marines)||0));
  const haleBefore=haleWithParty(s);
  const progressBefore=b.progress;
  const moraleBefore=b.moraleTurns;

  const flankCount=!b.flankUsed?Math.min(soldiersBefore,Math.max(0,Math.floor(Number(s.flags.flankingSoldiers)||0))):0;
  const localSoldiers=Math.max(0,soldiersBefore-flankCount);
  const soldierDice=Array.from({length:localSoldiers},()=>cryptoDie6());
  const haleDice=haleBefore?[cryptoDie6()]:[];
  const marineDice=Array.from({length:marinesBefore},()=>cryptoDie6());
  const flankDice=Array.from({length:flankCount},()=>cryptoDie6());
  if(flankCount>0)b.flankUsed=true;
  beginCombatPowder(s,'villageAssault');

  let actionSuccess=null;
  let actionDice=[];
  let actionTotal=null;
  let chargeDamage=null;
  let extraEnemyLoss=0;
  let coverCancel=0;
  const enemyCombat=1;

  if(action==='charge'){
    actionSuccess=roll3D6(s,'Force',combatForce(s,'villageAssault'));
    actionDice=Array.isArray(s.lastDice)?[...s.lastDice]:[];
    actionTotal=s.lastTotal;
    if(actionSuccess)extraEnemyLoss=1;
    else{
      const raw=Math.ceil(cryptoDie6()/2);
      const resolution=applyDamage(s,raw);
      chargeDamage={raw,absorbed:resolution.absorbed,hpLost:resolution.hpLost};
    }
  }else if(action==='cover'){
    actionSuccess=roll3D6(s,'Dextérité',combatDexterity(s,'villageAssault'));
    actionDice=Array.isArray(s.lastDice)?[...s.lastDice]:[];
    actionTotal=s.lastTotal;
    if(actionSuccess)coverCancel=1;
  }

  const soldierHits=soldierDice.filter(v=>v<=4).length;
  const haleHits=haleDice.filter(v=>v<=4).length;
  const marineHits=marineDice.filter(v=>v<=3).length;
  const flankHits=flankDice.filter(v=>v<=5).length;
  const alliedHits=soldierHits+haleHits+marineHits+flankHits+extraEnemyLoss;

  const enemyDice=Array.from({length:enemyBefore},()=>cryptoDie6());
  let enemyHits=enemyDice.filter(v=>v<=enemyCombat).length;
  const prevented=Math.min(enemyHits,coverCancel);
  enemyHits-=prevented;

  const enemyLoss=Math.min(enemyBefore,alliedHits);
  b.enemy=Math.max(0,enemyBefore-enemyLoss);

  let remainingHits=enemyHits;
  const soldierLoss=removeVillageAssaultSoldiers(s,remainingHits);
  remainingHits-=soldierLoss;

  const marineLoss=Math.min(marinesBefore,remainingHits);
  b.marines=Math.max(0,marinesBefore-marineLoss);
  setProvidenceMarinesWithParty(s,b.marines);
  b.marineLosses+=marineLoss;
  remainingHits-=marineLoss;

  let haleLost=false;
  if(remainingHits>0&&haleBefore){
    s.flags.haleAlive=false;
    s.flags.companion=null;
    haleLost=true;
    remainingHits--;
  }

  if(b.enemy<=0){
    b.enemy=0;
    b.enemyDefeated=true;
  }
  if(flankCount>0){
    s.flags.flankingSoldiers=0;
    s.expeditionSoldiers=Math.max(0,Math.floor(Number(s.soldiers)||0));
  }

  b.round++;
  b.last={
    action,
    actionSuccess,
    actionDice,
    actionTotal,
    chargeDamage,
    soldiersBefore,
    marinesBefore,
    haleBefore,
    soldierDice,
    haleDice,
    marineDice,
    flankDice,
    flankCount,
    soldierHits,
    haleHits,
    marineHits,
    flankHits,
    extraEnemyLoss,
    enemyBefore,
    enemyCombat,
    enemyDice,
    enemyHits,
    prevented,
    enemyLoss,
    soldierLoss,
    marineLoss,
    haleLost,
    progressBefore,
    progressAfter:b.progress
  };
  if(b.enemy<=0||villageHeroAlone(s)||s.hp<=0)finishCombatPowder(s,'villageAssault');
}
function markVillageEnemyLoss(s,n=1){
  const b=initVillageAssault(s);
  const loss=Math.min(Math.max(0,Math.floor(Number(b.enemy)||0)),Math.max(0,Math.floor(Number(n)||0)));
  b.enemy=Math.max(0,(b.enemy||0)-loss);
  if(b.enemy<=0){
    b.enemy=0;
    b.enemyDefeated=true;
  }
  return loss;
}

function nightGuardAttempt(s,index){
  const key='nightGuard'+String(index);
  if(s.flags[key]?.resolved)return;
  const success=roll3D6(s,'Dextérité',currentDexterity(s));
  const result={
    resolved:true,
    success,
    dice:Array.isArray(s.lastDice)?[...s.lastDice]:[],
    total:s.lastTotal,
    enemyLoss:0
  };
  if(success)result.enemyLoss=markVillageEnemyLoss(s,1);
  else s.flags.nightVillageAlerted=true;
  s.flags[key]=result;
}

function nightGuardResultHtml(s,index){
  const r=s.flags['nightGuard'+String(index)];
  if(!r?.resolved)return '';
  const b=initVillageAssault(s);
  let h='<div class="combat-roll-result crew-battle-result"><div class="combat-roll-title">Test de Dextérité</div>';
  h+='<div class="crew-training-dice">'+r.dice.map(v=>renderDie(v)).join('')+'</div>';
  h+='<p>Total : <strong>'+String(r.total)+'</strong> — <strong>'+(r.success?'réussite':'échec')+'</strong>.</p>';
  if(r.success){
    h+='<p>Tu atteins le garde avant qu’il ne puisse donner l’alerte. <strong>Un homme pâle de moins.</strong></p>';
    h+=b.enemy>0
      ?'<p>Il reste <strong>'+String(b.enemy)+'</strong> homme'+(b.enemy>1?'s pâles':' pâle')+'.</p>'
      :'<p><strong>Il ne reste plus aucun homme pâle.</strong></p>';
  }else{
    h+='<p>Le garde t’aperçoit. Son cri déchire le silence et des silhouettes surgissent dans tout le village.</p>';
    h+='<p><strong>'+String(b.enemy)+'</strong> homme'+(b.enemy>1?'s pâles sont encore debout':' pâle est encore debout')+'.</p>';
  }
  h+='</div>';
  return h;
}

const NIGHT_PALE={name:'HOMME PÂLE',hp:6,dex:9,force:8,damage:2,weaponPower:1};

function initNightVillageFight(s){
  const b=initVillageAssault(s);
  if(b.enemy>0&&(!Number.isFinite(b.nightEnemyHp)||b.nightEnemyHp<=0))b.nightEnemyHp=NIGHT_PALE.hp;
  return b;
}

function nightVillageFightRound(s){
  const b=initNightVillageFight(s);
  if(s.hp<=0||b.enemy<=0)return;
  beginCombatPowder(s,'nightVillageFight');

  const heroDice=[cryptoDie6(),cryptoDie6()];
  const enemyDice=[cryptoDie6(),cryptoDie6()];
  const heroDexterity=combatDexterity(s,'nightVillageFight');
  const heroForce=combatForce(s,'nightVillageFight');
  const enemyDexterity=NIGHT_PALE.dex;
  const enemyForce=NIGHT_PALE.force;
  const heroAttack=heroDexterity+heroForce+heroDice[0]+heroDice[1];
  const enemyAttack=enemyDexterity+enemyForce+enemyDice[0]+enemyDice[1];
  const heroWeaponPower=s.weapon&&s.weapon!=='none'?combatPower(s):0;
  const heroDamage=heroCombatDamage(s);
  const enemyWeaponPower=NIGHT_PALE.weaponPower;
  const enemyDamage=enemyCombatDamage(NIGHT_PALE);
  const enemyHpBefore=b.nightEnemyHp;

  let outcome='tie',damage=0,protectionAbsorbed=0,hpLost=0,enemyKilled=false,enemyHpAfter=enemyHpBefore;

  if(heroAttack>enemyAttack){
    outcome='hero';
    damage=heroDamage;
    enemyHpAfter=Math.max(0,enemyHpBefore-damage);
    if(enemyHpAfter<=0){
      enemyKilled=true;
      markVillageEnemyLoss(s,1);
      if(b.enemy>0)b.nightEnemyHp=NIGHT_PALE.hp;
      else b.nightEnemyHp=0;
    }else b.nightEnemyHp=enemyHpAfter;
  }else if(heroAttack<enemyAttack){
    outcome='enemy';
    damage=enemyDamage;
    const resolution=applyDamage(s,damage);
    protectionAbsorbed=resolution.absorbed;
    hpLost=resolution.hpLost;
  }

  b.nightFightRound=(b.nightFightRound||0)+1;
  b.nightFightLast={
    round:b.nightFightRound,heroDice,enemyDice,heroDexterity,heroForce,enemyDexterity,enemyForce,
    heroAttack,enemyAttack,heroWeaponPower,heroDamage,enemyWeaponPower,enemyDamage,
    enemyHpBefore,enemyHpAfter,enemyKilled,outcome,damage,protectionAbsorbed,hpLost,
    heroHp:s.hp,enemyRemaining:b.enemy
  };
  if(b.enemy<=0||s.hp<=0)finishCombatPowder(s,'nightVillageFight');
}

function nightVillageFightHtml(s){
  const b=initNightVillageFight(s);
  const r=b.nightFightLast;
  let h=combatPowderReminderHtml(s,'nightVillageFight')+'<p>Tu n’as plus personne pour tenir la ligne avec toi. Cette fois, tu affrontes toi-même les hommes pâles encore présents dans le village.</p>';
  h+='<div class="combat-roll-result"><div class="combat-roll-title">Combat de nuit</div>';
  h+='<p>Il reste <strong>'+String(b.enemy)+'</strong> homme'+(b.enemy>1?'s pâles':' pâle')+'.</p>';
  if(!r){
    h+='<p>Pour chaque échange, vous lancez chacun <strong>2 dés</strong> et ajoutez <strong>Dextérité + Force</strong>. Le meilleur score touche. En cas d’égalité, personne n’est blessé.</p>';
    h+='<p>Tes dégâts sont de <strong>2 + la Puissance de ton arme</strong>. Un homme pâle possède <strong>6 Vie</strong> et inflige <strong>3 dégâts</strong> lorsqu’il remporte l’échange.</p>';
    h+='</div>';
    return h;
  }

  h+='<div class="combat-roll-grid">';
  h+='<div class="combat-side"><strong>TOI</strong><div class="combat-dice">'+renderDie(r.heroDice[0])+renderDie(r.heroDice[1])+'</div><p>Dextérité '+String(r.heroDexterity)+' + Force '+String(r.heroForce)+' + dés '+String(r.heroDice[0]+r.heroDice[1])+'</p><p class="combat-total">Attaque : <strong>'+String(r.heroAttack)+'</strong></p></div>';
  h+='<div class="combat-versus">VS</div>';
  h+='<div class="combat-side"><strong>HOMME PÂLE</strong><div class="combat-dice">'+renderDie(r.enemyDice[0])+renderDie(r.enemyDice[1])+'</div><p>Dextérité '+String(r.enemyDexterity)+' + Force '+String(r.enemyForce)+' + dés '+String(r.enemyDice[0]+r.enemyDice[1])+'</p><p class="combat-total">Attaque : <strong>'+String(r.enemyAttack)+'</strong></p></div>';
  h+='</div>';

  if(r.outcome==='hero'){
    h+='<div class="combat-outcome"><strong>Tu remportes l’échange.</strong><br>Tu infliges <strong>'+String(r.damage)+'</strong> dégâts.';
    h+=r.enemyKilled?'<br><strong>L’homme pâle s’effondre.</strong>':'<br>Il lui reste <strong>'+String(r.enemyHpAfter)+'</strong> Vie.';
    h+='</div>';
  }else if(r.outcome==='enemy'){
    h+='<div class="combat-outcome"><strong>L’homme pâle remporte l’échange.</strong><br>Il inflige <strong>'+String(r.damage)+'</strong> dégâts.';
    if(r.protectionAbsorbed>0)h+=' Ta protection en absorbe <strong>'+String(r.protectionAbsorbed)+'</strong>.';
    if(r.hpLost>0)h+=' Tu perds <strong>'+String(r.hpLost)+'</strong> Vie.';
    else h+=' Tu ne perds aucun point de Vie.';
    h+='</div>';
  }else{
    h+='<div class="combat-outcome"><strong>Égalité.</strong><br>Aucun de vous ne parvient à toucher l’autre.</div>';
  }

  h+='<div class="combat-life-line">Ta Vie : <strong>'+String(s.hp)+'/'+String(s.maxHp)+'</strong> · Hommes pâles restants : <strong>'+String(b.enemy)+'</strong>';
  if(b.enemy>0)h+=' · Vie de l’adversaire actuel : <strong>'+String(b.nightEnemyHp)+'/'+String(NIGHT_PALE.hp)+'</strong>';
  h+='</div></div>';
  return h;
}

function nightVillageFightChoices(s){
  const b=initNightVillageFight(s);
  if(s.hp<=0){clearCombatPowderPrompt(s,'nightVillageFight');return[{label:'La fin du voyage',to:'death'}];}
  if(b.enemy<=0){clearCombatPowderPrompt(s,'nightVillageFight');return[{label:'Continuer',to:'villageNightAftermath'}];}
  const normal=[{label:'Jeter les dés — combattre',stay:true,inlineCombat:true,effect:x=>nightVillageFightRound(x)}];
  return combatPowderPromptChoices(s,'nightVillageFight',normal);
}

function villageAssaultRulesHtml(){
  return `<div class="village-assault-rules">
    <p>Comme lors des combats contre les pirates, chaque groupe possède une <strong>Valeur de combat</strong> qui représente à la fois son équipement et son entraînement.</p>
    <p>Tes soldats sont aguerris et bien équipés : <strong>Valeur de combat 4</strong>. Hale est compté parmi eux lorsqu’il combat à tes côtés. Chaque dé faisant <strong>1, 2, 3 ou 4</strong> est une réussite.</p>
    <p>Les hommes pâles sont moins entraînés et moins bien équipés : <strong>Valeur de combat 1</strong>. Seul un <strong>1</strong> est une réussite.</p>
    <p>Chaque combattant lance <strong>1D6</strong>. <strong>Chaque réussite met un adversaire hors de combat.</strong> À chaque nouvel assaut, tous les combattants encore debout relancent leur dé.</p>
    <p>À chaque tour, tu choisis aussi ton action :</p>
    <p><strong>Mener la charge :</strong> si ton test de Force réussit, tu neutralises <strong>1 homme pâle supplémentaire</strong>. En cas d’échec, tu subis <strong>1D3 dégâts</strong>.</p>
    <p><strong>Couvrir tes hommes :</strong> si ton test de Dextérité réussit, tu annules <strong>une perte dans ton groupe</strong> pendant ce tour.</p>
    <p>Si tous tes hommes tombent, l’assaut est perdu. Tu dois <strong>te replier dans la forêt</strong> avant que les hommes pâles ne se referment sur toi.</p>
  </div>`;
}
function villageAssaultHtml(s){
  const b=initVillageAssault(s);
  const l=b.last;
  const totalSoldiers=displayedSoldierCount(s);
  const soldierDetails=[];
  if(haleWithParty(s))soldierDetails.push('Hale');
  if(b.marines>0)soldierDetails.push(String(b.marines)+' marin'+(b.marines>1?'s':'')+' du Providence');
  const soldierDetail=soldierDetails.length?' · dont '+soldierDetails.join(' et '):'';
  let h=combatPowderReminderHtml(s,'villageAssault')+'<p>Le village éclate en mouvement. Les hommes pâles saisissent leurs armes pendant que tes hommes prennent position.</p>';
  if(b.initialEnemy<9)h+='<p>Grâce à leur hésitation devant la bague, <strong>trois hommes pâles sont déjà tombés</strong>. Il en reste <strong>'+String(b.enemy)+'</strong> au début de l’assaut.</p>';
  else h+='<p>Tu comptes <strong>'+String(b.enemy)+'</strong> hommes pâles capables de se battre.</p>';
  if(!b.flankUsed&&(s.flags.flankingSoldiers||0)>0)h+='<p>Tes <strong>'+String(s.flags.flankingSoldiers)+' soldat'+((s.flags.flankingSoldiers||0)>1?'s sont':' est')+' en position de l’autre côté du village</strong>. Au premier échange, ils attaqueront depuis le flanc : ils ne seront pas comptés une seconde fois dans ta ligne, mais leurs jets réussiront sur <strong>1 à 5</strong> au lieu de 1 à 4.</p>';

  if(b.round===0&&b.pistolOpeningLoss>0)h+='<p><strong>Tu dégaines les deux pistolets trouvés dans la grotte.</strong> Deux détonations éclatent presque en même temps. <strong>'+String(b.pistolOpeningLoss)+' homme'+(b.pistolOpeningLoss>1?'s pâles tombent':' pâle tombe')+'</strong> avant que la bataille ne commence vraiment.</p>';

  h+=`<div class="combat-roll-result crew-battle-result">
    <div class="combat-roll-title">Assaut du village</div>
    <div class="crew-strength-preview">
      <div><strong>Ton groupe</strong><span>Soldats : <strong>${totalSoldiers}</strong>${soldierDetail}</span></div>
      <div><strong>Adversaires</strong><span>Hommes pâles : <strong>${b.enemy}</strong></span></div>
    </div>
    ${b.round===0?villageAssaultRulesHtml():''}
  </div>`;

  if(b.round>0)h+='<div class="combat-rules-reminder-wrap"><button type="button" class="combat-rules-reminder" data-story-modal="village-assault-rules">Rappeler les règles du combat</button></div>';

  if(l){
    if(l.mode==='solo'){
      h+='<div class="combat-roll-result crew-battle-result"><div class="combat-roll-title">Tu combats seul — tour '+String(b.round)+'</div>';
      h+='<div class="crew-training-side"><strong>Charge solitaire — Dextérité</strong><div class="crew-training-dice">'+villageBattleDiceRow(l.actionDice,6)+'</div><p>Total : <strong>'+String(l.actionTotal)+'</strong> — <strong>'+(l.actionSuccess?'réussite':'échec')+'</strong>.</p>';
      if(l.actionSuccess)h+='<p>Tu trouves une ouverture et mets <strong>1 homme pâle</strong> hors de combat.</p>';
      else if(l.chargeDamage)h+='<p>Ta charge échoue. Tu encaisses <strong>'+String(l.chargeDamage.raw)+'</strong> dégât'+(l.chargeDamage.raw>1?'s':'')+'.'+(l.chargeDamage.absorbed>0?' Ta protection en absorbe <strong>'+String(l.chargeDamage.absorbed)+'</strong>.':'')+(l.chargeDamage.hpLost>0?' Tu perds <strong>'+String(l.chargeDamage.hpLost)+'</strong> Vie.':'')+'</p>';
      h+='</div>';
      h+='<div class="crew-battle-summary"><strong>Soldats restants : 0</strong> · <strong>Hommes pâles restants : '+String(b.enemy||0)+'</strong></div>';
      h+='</div>';
    }else{
      const actionTitle=l.action==='charge'?'Mener la charge':'Couvrir les hommes';
      h+='<div class="combat-roll-result crew-battle-result"><div class="combat-roll-title">'+actionTitle+' — tour '+String(b.round)+'</div>';

      if(l.action==='charge'||l.action==='cover'){
        h+='<div class="crew-training-side"><strong>Ton test — '+(l.action==='charge'?'Force':'Dextérité')+'</strong><div class="crew-training-dice">'+villageBattleDiceRow(l.actionDice,6)+'</div><p>Total : <strong>'+String(l.actionTotal)+'</strong> — <strong>'+(l.actionSuccess?'réussite':'échec')+'</strong>.</p>';
        if(l.action==='charge'){
          if(l.actionSuccess)h+='<p>Tu ouvres une brèche : <strong>1 homme pâle supplémentaire est neutralisé.</strong></p>';
          else if(l.chargeDamage)h+='<p>La charge échoue. Tu encaisses <strong>'+String(l.chargeDamage.raw)+'</strong> dégât'+(l.chargeDamage.raw>1?'s':'')+'.'+(l.chargeDamage.absorbed>0?' Ta protection en absorbe <strong>'+String(l.chargeDamage.absorbed)+'</strong>.':'')+(l.chargeDamage.hpLost>0?' Tu perds <strong>'+String(l.chargeDamage.hpLost)+'</strong> Vie.':'')+'</p>';
        }else h+='<p>'+(l.prevented?'<strong>Tu empêches une perte dans tes rangs.</strong>':'Tu ne parviens pas à protéger efficacement le groupe.')+'</p>';
        h+='</div>';
      }

      h+='<div class="crew-training-side"><div class="crew-training-heading"><strong>Ton groupe</strong><span>Garnison, Hale compris : réussite sur 1–4 · marins libérés : 1–3</span></div>';
      const regularDice=[...l.soldierDice,...l.haleDice];
      if(regularDice.length)h+='<p>Soldats'+(l.haleDice.length?' — Hale compris':'')+'</p><div class="crew-training-dice">'+villageBattleDiceRow(regularDice,4)+'</div>';
      if(l.flankDice.length)h+='<p>Feu croisé — réussite sur 1–5</p><div class="crew-training-dice">'+villageBattleDiceRow(l.flankDice,5)+'</div>';
      if(l.marineDice.length)h+='<p>Marins du Providence</p><div class="crew-training-dice">'+villageBattleDiceRow(l.marineDice,3)+'</div>';
      h+='<p><strong>'+String(l.enemyLoss)+' homme'+(l.enemyLoss>1?'s pâles tombent':' pâle tombe')+'.</strong></p></div>';

      h+='<div class="crew-training-side"><div class="crew-training-heading"><strong>Hommes pâles</strong><span>Réussite sur <strong>1</strong></span></div><div class="crew-training-dice">'+villageBattleDiceRow(l.enemyDice,1)+'</div>';
      if(l.prevented)h+='<p>Une de leurs réussites est annulée par ta couverture.</p>';
      if(l.soldierLoss)h+='<p><strong>Tu perds '+String(l.soldierLoss)+' soldat'+(l.soldierLoss>1?'s':'')+'.</strong></p>';
      if(l.marineLoss)h+='<p><strong>'+String(l.marineLoss)+' marin'+(l.marineLoss>1?'s du Providence tombent':' du Providence tombe')+'.</strong></p>';
      if(l.haleLost)h+='<p><strong>Hale tombe pendant l’affrontement.</strong></p>';
      if(!l.soldierLoss&&!l.marineLoss&&!l.haleLost)h+='<p>Personne ne tombe dans ton groupe.</p>';
      h+='</div>';

      h+='<div class="crew-battle-summary"><strong>Soldats restants : '+String(displayedSoldierCount(s))+'</strong> · <strong>Hommes pâles restants : '+String(b.enemy||0)+'</strong></div>';
      h+='</div>';
    }
  }

  if(b.enemyDefeated)h+='<p>Le dernier adversaire tombe. Pour quelques secondes, le village devient silencieux.</p>';
  else if(b.enemyFled)h+='<p>Les hommes pâles encore debout finissent par rompre le combat et disparaissent entre les huttes et les arbres. La place est à vous.</p>';

  if(!b.enemyDefeated&&!b.enemyFled&&villageHeroAlone(s)){
    h+=b.round===0
      ?'<p><strong>Tu es arrivé jusqu’ici sans aucun homme encore capable de se battre à tes côtés.</strong> Face au village entier, donner l’assaut seul serait suicidaire : il faut te replier.</p>'
      :'<p><strong>Le dernier de tes hommes vient de tomber.</strong> Les hommes pâles se tournent vers toi. Rester ici serait suicidaire : il faut te replier.</p>';
  }
  return h;
}
function useCavePistolsInAssault(s){
  const b=initVillageAssault(s);
  const shots=Math.min(2,pistolShotCount(s));
  if(shots<=0||b.enemy<=0)return;
  const loss=markVillageEnemyLoss(s,shots);
  for(let i=0;i<shots;i++)consumePistolShot(s);
  b.pistolOpeningLoss=loss;
}

function villageAssaultChoices(s){
  const b=initVillageAssault(s);
  if(s.hp<=0){clearCombatPowderPrompt(s,'villageAssault');return[{label:'La fin du voyage',to:'death'}];}
  if(b.enemyDefeated||b.enemyFled){clearCombatPowderPrompt(s,'villageAssault');return[{label:s.flags.villageTime==='night'?'Rejoindre la prison dans le village silencieux':'Rejoindre la prison',to:s.flags.villageTime==='night'?'villageNightAftermath':'villageAssaultVictory'}];}
  if(villageHeroAlone(s)){clearCombatPowderPrompt(s,'villageAssault');return[{label:'Fuir vers la forêt',to:'villageRetreat'}];}
  const out=[];
  if(b.round===0&&combatPowderPromptNeeded(s,'villageAssault'))return combatPowderPromptChoices(s,'villageAssault',[]);
  if(b.round===0&&pistolShotCount(s)>0){
    out.push({label:'Utiliser les pistolets — '+String(pistolShotCount(s))+' tir'+(pistolShotCount(s)>1?'s':'')+' disponible'+(pistolShotCount(s)>1?'s':''),stay:true,inlineCombat:true,effect:x=>useCavePistolsInAssault(x)});
  }
  out.push(
    {label:'Mener la charge — test de Force',stay:true,inlineCombat:true,effect:x=>villageAssaultRound(x,'charge')},
    {label:'Couvrir tes hommes — test de Dextérité',stay:true,inlineCombat:true,effect:x=>villageAssaultRound(x,'cover')}
  );
  return out;
}

function addThrowingBlades(s,n=1){
  if(!s.inventory.couteaux_jet)addItem(s,'couteaux_jet','Lames de lancer','De petites lames équilibrées, conçues pour être lancées avec précision.',{quantity:n});
  else {
    s.inventory.couteaux_jet.name='Lames de lancer';
    s.inventory.couteaux_jet.description='De petites lames équilibrées, conçues pour être lancées avec précision.';
    s.inventory.couteaux_jet.quantity=(s.inventory.couteaux_jet.quantity||1)+n;
  }
}
function grantSouthProtection(s){
  if(s.flags.southProtectionGift)return;
  s.flags.southProtectionGift=true;
  addProtectiveItem(s,'brassard_avant_bras','Brassard d’avant-bras renforcé','Un large brassard de cuir épais renforcé de fines plaques métalliques rivetées. Protection +3.',3);
}
function rollDex(s,bonus=0,label='Dextérité'){
  const target=currentDexterity(s)-Math.max(0,bonus);
  return roll3D6(s,bonus?label+' — malus +'+bonus:label,target);
}
function startCrewBattle(s,key,enemyCount=12,soldierPower=4,enemyPower=1,retreatAt=Math.floor(enemyCount/2)){
  if(!s.crewBattles)s.crewBattles={};
  s.crewBattles[key]={
    enemy:enemyCount,
    initialEnemy:enemyCount,
    round:0,
    last:null,
    soldierPower,
    enemyPower,
    retreatAt,
    ruleVersion:'combat-rating-dice-v1'
  };
}
function normalizeCrewBattle(b,enemyCount=12,soldierPower=4,enemyPower=1,retreatAt=Math.floor(enemyCount/2)){
  if(!b)return null;
  if(!Number.isFinite(b.initialEnemy))b.initialEnemy=enemyCount;
  if(!Number.isFinite(b.soldierPower))b.soldierPower=soldierPower;
  if(!Number.isFinite(b.enemyPower))b.enemyPower=enemyPower;
  if(!Number.isFinite(b.retreatAt))b.retreatAt=retreatAt;
  // Compatibilité avec les anciens essais de combat :
  // on garde les effectifs, mais on efface uniquement un ancien résultat de jet.
  if(b.last && (!Array.isArray(b.last.soldierDice) || !Array.isArray(b.last.enemyDice)))b.last=null;
  return b;
}
function ensureCrewBattle(s,key,enemyCount=12,soldierPower=4,enemyPower=1,retreatAt=Math.floor(enemyCount/2)){
  if(!s.crewBattles)s.crewBattles={};
  if(!s.crewBattles[key])startCrewBattle(s,key,enemyCount,soldierPower,enemyPower,retreatAt);
  const b=normalizeCrewBattle(s.crewBattles[key],enemyCount,soldierPower,enemyPower,retreatAt);
  if(b.ruleVersion!=='combat-rating-dice-v1'){
    b.ruleVersion='combat-rating-dice-v1';
    b.soldierPower=4;
    b.enemyPower=1;
    b.last=null;
    b.resolved=false;
  }
  return b;
}
function crewBattleRound(s,key,enemyCount=12){
  const b=ensureCrewBattle(s,key,enemyCount,4,1,0);
  if(b.enemy<=0||s.soldiers<=0)return;

  const soldierCount=s.soldiers;
  const enemyCountNow=b.enemy;

  const soldierDice=Array.from({length:soldierCount},()=>cryptoDie6());
  const enemyDice=Array.from({length:enemyCountNow},()=>cryptoDie6());

  // Valeur de combat = équipement + entraînement.
  // Un dé est réussi s'il est inférieur ou égal à cette valeur.
  const soldierCombat=b.soldierPower;
  const enemyCombat=b.enemyPower;

  const soldierHits=soldierDice.filter(v=>v<=soldierCombat).length;
  const enemyHits=enemyDice.filter(v=>v<=enemyCombat).length;

  const soldierLoss=Math.min(soldierCount,enemyHits);
  const enemyLoss=Math.min(enemyCountNow,soldierHits);

  s.soldiers=Math.max(0,s.soldiers-soldierLoss);
  b.enemy=Math.max(0,b.enemy-enemyLoss);
  b.round++;
  b.resolved=false;
  b.ruleVersion='combat-rating-dice-v1';
  b.last={
    mode:'combat_rating_dice',
    soldierCount,
    enemyCount:enemyCountNow,
    soldierCombat,
    enemyCombat,
    soldierDice,
    enemyDice,
    soldierHits,
    enemyHits,
    soldierLoss,
    enemyLoss
  };
}

function crewBattleHtml(s,key,enemyCount=12){
  const b=ensureCrewBattle(s,key,enemyCount,4,1,0);
  const l=b.last;
  const soldierCombat=Number.isFinite(b.soldierPower)?b.soldierPower:4;
  const enemyCombat=Number.isFinite(b.enemyPower)?b.enemyPower:1;
  const hasNewResult=!!(l&&l.mode==='combat_rating_dice');

  const diceRow=(dice,combat)=>dice.map(v=>`<span class="crew-training-die ${v<=combat?'success':'miss'}">${renderDie(v)}</span>`).join('');

  if(!hasNewResult){
    return `<div class="combat-roll-result crew-battle-result">
      <div class="combat-roll-title">Combat de groupe</div>
      <p><strong>${s.soldiers} soldats</strong> contre <strong>${b.enemy} pirates</strong></p>
      <div class="crew-strength-preview">
        <div><strong>Soldats</strong><span>Valeur de combat : <strong>${soldierCombat}</strong></span><span>Réussite sur <strong>1, 2, 3 ou 4</strong></span></div>
        <div><strong>Pirates</strong><span>Valeur de combat : <strong>${enemyCombat}</strong></span><span>Réussite sur <strong>1</strong></span></div>
      </div>
      <p>La Valeur de combat représente <strong>l’équipement et l’entraînement</strong>. Chaque combattant lance 1D6 : un résultat inférieur ou égal à sa Valeur de combat est une réussite.</p>
      <p><strong>Chaque réussite élimine un adversaire.</strong></p>
    </div>`;
  }

  const soldierAfter=Math.max(0,l.soldierCount-l.soldierLoss);
  const enemyAfter=Math.max(0,l.enemyCount-l.enemyLoss);

  return `<div class="combat-roll-result crew-battle-result">
    <div class="combat-roll-title">Résultat de l’assaut</div>

    <div class="crew-training-side">
      <div class="crew-training-heading">
        <strong>Soldats — ${l.soldierCount} combattants</strong>
        <span>Valeur de combat <strong>${l.soldierCombat}</strong> · réussite sur <strong>1, 2, 3 ou 4</strong></span>
      </div>
      <div class="crew-training-dice">${diceRow(l.soldierDice,l.soldierCombat)}</div>
      <p class="${l.enemyLoss>0?'crew-casualty-line':''}"><strong>${l.soldierHits} réussite${l.soldierHits>1?'s':''}</strong> → les pirates perdent <strong>${l.enemyLoss}</strong> homme${l.enemyLoss>1?'s':''}.</p>
    </div>

    <div class="crew-training-side">
      <div class="crew-training-heading">
        <strong>Pirates — ${l.enemyCount} combattants</strong>
        <span>Valeur de combat <strong>${l.enemyCombat}</strong> · réussite uniquement sur <strong>1</strong></span>
      </div>
      <div class="crew-training-dice">${diceRow(l.enemyDice,l.enemyCombat)}</div>
      <p class="${l.soldierLoss>0?'crew-casualty-line':''}"><strong>${l.enemyHits} réussite${l.enemyHits>1?'s':''}</strong> → tes soldats perdent <strong>${l.soldierLoss}</strong> homme${l.soldierLoss>1?'s':''}.</p>
    </div>

    <div class="crew-battle-summary">
      <strong>Bilan du combat</strong>
      <span>Soldats : <strong>${l.soldierCount} → ${soldierAfter}</strong></span>
      <span>Pirates : <strong>${l.enemyCount} → ${enemyAfter}</strong></span>
    </div>
  </div>`;
}

function throwingBladeCount(s){
  return Math.max(0,Math.floor(Number(s.inventory?.couteaux_jet?.quantity)||0));
}
function pistolShotCount(s){
  const item=s.inventory?.pistolets_silex;
  if(!item)return 0;
  if(Number.isFinite(Number(item.quantity)))return Math.max(0,Math.floor(Number(item.quantity)));
  // Compatibilité avec les sauvegardes où « deux pistolets » était un objet unique sans quantité.
  return s.flags.cavePistolsUsed?0:2;
}
function consumeThrowingBlade(s){
  const n=throwingBladeCount(s);
  if(n<=0)return false;
  if(n<=1)delete s.inventory.couteaux_jet;
  else s.inventory.couteaux_jet.quantity=n-1;
  return true;
}
function consumePistolShot(s){
  const n=pistolShotCount(s);
  if(n<=0)return false;
  if(n<=1){
    delete s.inventory.pistolets_silex;
    s.flags.cavePistolsUsed=true;
  }else{
    if(!s.inventory.pistolets_silex)s.inventory.pistolets_silex={name:'Pistolets à silex',description:'Deux pistolets à silex chargés.'};
    s.inventory.pistolets_silex.quantity=n-1;
  }
  return true;
}
function useRangedCombatItem(s,key,e,type,dexPenalty=0,consumeBalance=false){
  if(!s.combats)s.combats={};
  const combat=s.combats[key]||(s.combats[key]={hp:e.hp,round:0,last:null});
  if(s.hp<=0||combat.hp<=0)return;
  beginCombatPowder(s,key);

  const isPistol=type==='pistol';
  if(isPistol){
    if(!consumePistolShot(s))return;
  }else{
    if(!consumeThrowingBlade(s))return;
  }

  const dexterity=Math.max(3,combatDexterity(s,key)-Math.max(0,dexPenalty||0));
  const success=roll3D6(s,isPistol?'Dextérité — pistolet':'Dextérité — lame de lancer',dexterity);
  const damage=isPistol?4:2;
  const before=combat.hp;
  if(success)combat.hp=Math.max(0,combat.hp-damage);
  combat.last=null;
  combat.lastRanged={
    type,
    success,
    dice:Array.isArray(s.lastDice)?[...s.lastDice]:[],
    total:s.lastTotal,
    dexterity,
    dexPenalty:Math.max(0,dexPenalty||0),
    damage:before-combat.hp,
    enemyHp:combat.hp,
    bladesLeft:throwingBladeCount(s),
    pistolsLeft:pistolShotCount(s)
  };
  if(consumeBalance){
    combat.balance=null;
    combat.ready=false;
  }
  if(combat.hp<=0||s.hp<=0)finishCombatPowder(s,key);
}
function rangedCombatResultHtml(s,key,e){
  const combat=s.combats?.[key];
  const r=combat?.lastRanged;
  if(!r)return '';
  const pistol=r.type==='pistol';
  const label=pistol?'Pistolet à silex':'Lame de lancer';
  const remaining=pistol
    ?'Tirs de pistolet restants : <strong>'+String(r.pistolsLeft)+'</strong>'
    :'Lames restantes : <strong>'+String(r.bladesLeft)+'</strong>';
  const penalty=r.dexPenalty>0?' · malus de stabilité : <strong>−'+String(r.dexPenalty)+'</strong>':'';
  return '<div class="combat-roll-result"><div class="combat-roll-title">'+label+'</div>'+
    '<div class="combat-dice">'+r.dice.map(v=>renderDie(v)).join('')+'</div>'+
    '<p>Dextérité : <strong>'+String(r.dexterity)+'</strong>'+penalty+' · Total : <strong>'+String(r.total)+'</strong>.</p>'+
    '<div class="combat-outcome">'+(r.success
      ?'<strong>Le tir atteint sa cible.</strong> Tu infliges <strong>'+String(r.damage)+'</strong> dégât'+(r.damage>1?'s':'')+'.'+(combat.hp<=0&&r.damage>0?'<br><strong>Ton adversaire s’effondre.</strong>':'')
      :'<strong>Tu manques ta cible.</strong> Aucun dégât.')+
    '<br><strong>Tu restes hors de portée : aucune riposte sur cette attaque.</strong></div>'+
    '<div class="combat-life-line">'+remaining+' · Vie adverse : <strong>'+String(combat.hp)+'/'+String(e.hp)+'</strong></div></div>';
}
function rangedCombatChoices(s,key,e,dexPenalty=0,consumeBalance=false){
  const out=[];
  const blades=throwingBladeCount(s);
  const pistols=pistolShotCount(s);
  if(blades>0)out.push({
    label:'Lancer une lame — '+String(blades)+' restante'+(blades>1?'s':'')+' · Dextérité · 2 dégâts',
    stay:true,inlineCombat:true,
    effect:x=>useRangedCombatItem(x,key,e,'blade',dexPenalty,consumeBalance)
  });
  if(pistols>0)out.push({
    label:'Tirer au pistolet — '+String(pistols)+' tir'+(pistols>1?'s':'')+' restant'+(pistols>1?'s':'')+' · Dextérité · 4 dégâts',
    stay:true,inlineCombat:true,
    effect:x=>useRangedCombatItem(x,key,e,'pistol',dexPenalty,consumeBalance)
  });
  return out;
}
function standardFightChoices(s,key,e,deathChoice,winChoice){
  const combat=s.combats?.[key];
  if(s.hp<=0){clearCombatPowderPrompt(s,key);return[deathChoice];}
  if(combat&&combat.hp<=0){clearCombatPowderPrompt(s,key);return[winChoice];}
  const normal=[
    {label:'Jeter les dés — combattre',stay:true,inlineCombat:true,effect:x=>fightRound(x,key,e)},
    ...rangedCombatChoices(s,key,e)
  ];
  return combatPowderPromptChoices(s,key,normal);
}

function fightRound(s,key,e){
  if(!s.combats)s.combats={};
  const c=s.combats[key]||(s.combats[key]={hp:e.hp,round:0,last:null});
  if(s.hp<=0||c.hp<=0)return c.last;
  c.lastRanged=null;
  beginCombatPowder(s,key);

  const heroDice=[cryptoDie6(),cryptoDie6()];
  const enemyDice=[cryptoDie6(),cryptoDie6()];
  const heroDexterity=combatDexterity(s,key);
  const enemyDexterity=e.dex;
  const heroForce=combatForce(s,key);
  const enemyForce=e.force;
  const heroAttack=heroDexterity+heroForce+heroDice[0]+heroDice[1];
  const enemyAttack=enemyDexterity+enemyForce+enemyDice[0]+enemyDice[1];
  const heroWeaponPower=s.weapon&&s.weapon!=='none'?combatPower(s):0;
  const heroDamage=heroCombatDamage(s);
  const enemyWeaponPower=Number.isFinite(e.weaponPower)?e.weaponPower:0;
  const enemyDamage=enemyCombatDamage(e);

  let outcome='tie',damage=0,protectionAbsorbed=0,hpLost=0;

  if(heroAttack>enemyAttack){
    outcome='hero';
    damage=heroDamage;
    c.hp=Math.max(0,c.hp-damage);
  }else if(heroAttack<enemyAttack){
    outcome='enemy';
    damage=enemyDamage;
    const resolution=applyDamage(s,damage);
    protectionAbsorbed=resolution.absorbed;
    hpLost=resolution.hpLost;
  }

  c.round++;
  c.last={
    round:c.round,
    heroDice,
    enemyDice,
    heroDexterity,
    enemyDexterity,
    heroAttack,
    enemyAttack,
    heroForce,
    heroWeaponPower,
    heroDamage,
    enemyForce,
    enemyWeaponPower,
    enemyDamage,
    damage,
    protectionAbsorbed,
    hpLost,
    outcome,
    heroHp:s.hp,
    enemyHp:c.hp,
    ruleVersion:'book01-duel-v1'
  };
  if(c.hp<=0||s.hp<=0)finishCombatPowder(s,key);
  return c.last;
}

function fightHtml(s,key,e){
  const c=s.combats?.[key];
  if(!c)return '';
  const r=c.last;

  if(c.lastRanged)return rangedCombatResultHtml(s,key,e);

  if(!r){
    return combatPowderReminderHtml(s,key)+`<div class="combat-roll-result">
      <div class="combat-roll-title">${e.name}</div>
      <p>Ta Vie : <strong>${s.hp}/${s.maxHp}</strong> · Vie adverse : <strong>${c.hp}/${e.hp}</strong></p>
      <p>Lance les dés pour résoudre le prochain échange.</p>
    </div>`;
  }

  // Ancienne sauvegarde : on garde un affichage lisible jusqu'au prochain lancer.
  if(r.ruleVersion!=='book01-duel-v1'){
    const oldText=r.outcome==='hero'
      ? `Tu remportes l’échange et infliges <strong>${r.damage} dégâts</strong>.`
      : r.outcome==='enemy'
        ? `${e.name} remporte l’échange : tu subis <strong>${r.damage} dégâts</strong>.`
        : 'Égalité : aucun des deux combattants ne parvient à toucher l’autre.';
    return `<div class="combat-roll-result">
      <div class="combat-roll-title">${e.name}</div>
      <div class="combat-roll-grid">
        <div class="combat-side"><strong>TOI</strong><div class="combat-dice">${renderDie(r.heroDice[0])}${renderDie(r.heroDice[1])}</div><p>Dextérité ${r.heroBase} + dés ${r.heroDice[0]+r.heroDice[1]}</p><p class="combat-total">Attaque : <strong>${r.ha}</strong></p></div>
        <div class="combat-versus">VS</div>
        <div class="combat-side"><strong>${e.name}</strong><div class="combat-dice">${renderDie(r.enemyDice[0])}${renderDie(r.enemyDice[1])}</div><p>Dextérité ${r.enemyBase} + dés ${r.enemyDice[0]+r.enemyDice[1]}</p><p class="combat-total">Attaque : <strong>${r.ea}</strong></p></div>
      </div>
      <div class="combat-outcome"><strong>${oldText}</strong></div>
      <div class="combat-life-line">Ta Vie : <strong>${s.hp}/${s.maxHp}</strong> · Vie adverse : <strong>${c.hp}/${e.hp}</strong></div>
    </div>`;
  }

  const heroDamageDetail=r.heroWeaponPower>0
    ? `Dégâts de base ${HERO_BASE_DAMAGE} + Puissance de l’arme ${r.heroWeaponPower}`
    : `Dégâts de base ${HERO_BASE_DAMAGE}`;
  const enemyDamageDetail=r.enemyWeaponPower>0
    ? `Dégâts ${r.enemyDamage-r.enemyWeaponPower} + Puissance de l’arme ${r.enemyWeaponPower}`
    : `Dégâts ${r.enemyDamage}`;

  const outcomeText=r.outcome==='hero'
    ? `<strong>Tu remportes l’échange.</strong><br>Tu infliges <strong>${r.damage}</strong> point${r.damage>1?'s':''} de dégâts <span class="combat-detail">(${heroDamageDetail})</span>.${c.hp<=0&&r.damage>0?'<br><strong>Ton adversaire s’effondre.</strong>':''}`
    : r.outcome==='enemy'
      ? (() => {
          const protectionLine=r.protectionAbsorbed>0
            ? ` Ta protection absorbe <strong>${r.protectionAbsorbed}</strong>${r.hpLost>0?`, tu perds <strong>${r.hpLost}</strong> point${r.hpLost>1?'s':''} de Vie.`:', tu ne perds aucun point de Vie.'}`
            : ` Tu perds <strong>${r.hpLost}</strong> point${r.hpLost>1?'s':''} de Vie.`;
          return `<strong>${e.name} remporte l’échange.</strong><br>Il inflige <strong>${r.damage}</strong> point${r.damage>1?'s':''} de dégâts <span class="combat-detail">(${enemyDamageDetail})</span>.${protectionLine}`;
        })()
      : '<strong>Égalité.</strong><br>Les deux attaques se neutralisent. Aucun dégât.';

  return `<div class="combat-roll-result">
    <div class="combat-roll-title">Échange n° ${r.round}</div>
    <div class="combat-roll-grid">
      <div class="combat-side">
        <strong>TOI</strong>
        <div class="combat-dice">${renderDie(r.heroDice[0])}${renderDie(r.heroDice[1])}</div>
        <p>Dextérité ${r.heroDexterity} + Force ${r.heroForce} + dés ${r.heroDice[0]+r.heroDice[1]}</p>
        <p class="combat-total">Attaque : <strong>${r.heroAttack}</strong></p>
      </div>
      <div class="combat-versus">VS</div>
      <div class="combat-side">
        <strong>${e.name}</strong>
        <div class="combat-dice">${renderDie(r.enemyDice[0])}${renderDie(r.enemyDice[1])}</div>
        <p>Dextérité ${r.enemyDexterity} + Force ${r.enemyForce} + dés ${r.enemyDice[0]+r.enemyDice[1]}</p>
        <p class="combat-total">Attaque : <strong>${r.enemyAttack}</strong></p>
      </div>
    </div>
    <div class="combat-outcome">${outcomeText}</div>
    <div class="combat-life-line">Ta Vie : <strong>${s.hp}/${s.maxHp}</strong> · Protection : <strong>${currentProtection(s)}</strong> · Vie adverse : <strong>${c.hp}/${e.hp}</strong></div>
  </div>`;
}
const CAPTAIN={name:'CAPITAINE PIRATE',hp:10,dex:9,force:8,damage:2};
const NORTH_CAPTAIN={name:'CAPITAINE PIRATE',hp:10,dex:9,force:8,damage:2};
const BANDIT_CHIEF={name:'CHEF DES FAUX MARCHANDS',hp:9,dex:9,force:8,damage:2};
const ALLIGATOR={name:'ALLIGATOR',hp:8,dex:7,force:8,damage:3};
const DROWNED_SAILOR={name:'LE NOYÉ',hp:9,dex:8,force:10,damage:3};
const CAVE_DUAL_GUARD={name:'GARDIEN AUX DEUX SABRES',hp:8,dex:13,force:6,damage:2,weaponPower:1};
const CLIFF_GUARDIAN={name:'GARDIEN DE LA FALAISE',hp:16,dex:10,force:11,damage:3};

function prepareCliffGuardian(s,key){
  if(!s.combats)s.combats={};
  if(!s.combats[key])s.combats[key]={hp:CLIFF_GUARDIAN.hp,round:0,last:null,balance:null,ready:false};
  return s.combats[key];
}
function cliffGuardianBalanceCheck(s,key){
  const c=prepareCliffGuardian(s,key);
  if(s.hp<=0||c.hp<=0||c.ready)return;
  beginCombatPowder(s,key);
  const success=roll3D6(s,'Dextérité',combatDexterity(s,key));
  c.balance={
    success,
    dice:Array.isArray(s.lastDice)?[...s.lastDice]:[],
    total:s.lastTotal,
    penalty:success?0:2
  };
  c.ready=true;
}
function cliffGuardianRound(s,key){
  const c=prepareCliffGuardian(s,key);
  if(s.hp<=0||c.hp<=0||!c.ready)return;
  c.lastRanged=null;

  const balance=c.balance||{success:true,dice:[],total:null,penalty:0};
  const heroDice=[cryptoDie6(),cryptoDie6()];
  const enemyDice=[cryptoDie6(),cryptoDie6()];
  const heroDexterity=Math.max(3,combatDexterity(s,key)-(balance.penalty||0));
  const enemyDexterity=CLIFF_GUARDIAN.dex;
  const heroForce=combatForce(s,key);
  const enemyForce=CLIFF_GUARDIAN.force;
  const heroAttack=heroDexterity+heroForce+heroDice[0]+heroDice[1];
  const enemyAttack=enemyDexterity+enemyForce+enemyDice[0]+enemyDice[1];
  const heroWeaponPower=s.weapon&&s.weapon!=='none'?combatPower(s):0;
  const heroDamage=heroCombatDamage(s);
  const enemyDamage=enemyCombatDamage(CLIFF_GUARDIAN);

  let outcome='tie',damage=0,protectionAbsorbed=0,hpLost=0;
  if(heroAttack>enemyAttack){
    outcome='hero';
    damage=heroDamage;
    c.hp=Math.max(0,c.hp-damage);
  }else if(heroAttack<enemyAttack){
    outcome='enemy';
    damage=enemyDamage;
    const resolution=applyDamage(s,damage);
    protectionAbsorbed=resolution.absorbed;
    hpLost=resolution.hpLost;
  }

  c.round++;
  c.last={
    round:c.round,
    balanceSuccess:balance.success,
    balanceDice:[...(balance.dice||[])],
    balanceTotal:balance.total,
    dexPenalty:balance.penalty||0,
    heroDice,enemyDice,heroDexterity,enemyDexterity,heroForce,enemyForce,
    heroAttack,enemyAttack,heroWeaponPower,heroDamage,enemyDamage,
    outcome,damage,protectionAbsorbed,hpLost,heroHp:s.hp,enemyHp:c.hp
  };
  c.balance=null;
  c.ready=false;
  if(c.hp<=0||s.hp<=0)finishCombatPowder(s,key);
}
function cliffGuardianHtml(s,key){
  const c=prepareCliffGuardian(s,key);
  const r=c.last;
  let h=combatPowderReminderHtml(s,key)+'<div class="combat-roll-result"><div class="combat-roll-title">Le gardien de la falaise</div>';
  h+='<p>Ta Vie : <strong>'+String(s.hp)+'/'+String(s.maxHp)+'</strong> · Vie adverse : <strong>'+String(c.hp)+'/'+String(CLIFF_GUARDIAN.hp)+'</strong></p>';

  if(c.lastRanged){
    h+='</div>'+rangedCombatResultHtml(s,key,CLIFF_GUARDIAN);
    return h;
  }

  if(c.ready&&c.balance){
    h+='<div class="crew-training-side"><strong>Stabilité sur la falaise — Dextérité</strong><div class="crew-training-dice">'+c.balance.dice.map(v=>renderDie(v)).join('')+'</div>';
    h+='<p>Total : <strong>'+String(c.balance.total)+'</strong> — <strong>'+(c.balance.success?'réussite':'échec')+'</strong>.</p>';
    if(c.balance.success)h+='<p>Tu trouves un appui solide malgré le vent. Le prochain échange se joue normalement.</p>';
    else h+='<p>Un morceau de roche se dérobe sous ton pied. Tu te rattrapes de justesse, mais ta position est mauvaise : <strong>Dextérité −2 pour le prochain échange.</strong></p>';
    h+='</div>';
  }else if(!r){
    h+='<p>Le vent et le sol friable rendent chaque mouvement dangereux. Avant chaque échange, tu dois réussir un <strong>test de Dextérité</strong>.</p>';
    h+='<p>En cas d’échec, ton appui cède et tu subis <strong>−2 Dextérité</strong> pour l’échange qui suit.</p>';
  }else{
    h+='<div class="crew-training-side"><strong>Stabilité avant l’échange</strong><div class="crew-training-dice">'+r.balanceDice.map(v=>renderDie(v)).join('')+'</div>';
    h+='<p>Total : <strong>'+String(r.balanceTotal)+'</strong> — <strong>'+(r.balanceSuccess?'réussite':'échec')+'</strong>'+(r.dexPenalty?' · Dextérité −2 appliquée':'')+'.</p></div>';
    h+='<div class="combat-roll-grid">';
    h+='<div class="combat-side"><strong>TOI</strong><div class="combat-dice">'+renderDie(r.heroDice[0])+renderDie(r.heroDice[1])+'</div><p>Dextérité '+String(r.heroDexterity)+' + Force '+String(r.heroForce)+' + dés '+String(r.heroDice[0]+r.heroDice[1])+'</p><p class="combat-total">Attaque : <strong>'+String(r.heroAttack)+'</strong></p></div>';
    h+='<div class="combat-versus">VS</div>';
    h+='<div class="combat-side"><strong>GARDIEN</strong><div class="combat-dice">'+renderDie(r.enemyDice[0])+renderDie(r.enemyDice[1])+'</div><p>Dextérité '+String(r.enemyDexterity)+' + Force '+String(r.enemyForce)+' + dés '+String(r.enemyDice[0]+r.enemyDice[1])+'</p><p class="combat-total">Attaque : <strong>'+String(r.enemyAttack)+'</strong></p></div>';
    h+='</div>';
    if(r.outcome==='hero'){
      h+='<div class="combat-outcome"><strong>Tu remportes l’échange.</strong><br>Tu infliges <strong>'+String(r.damage)+'</strong> dégâts.'+(c.hp<=0?'<br><strong>Le gardien vacille puis s’effondre sur la pierre.</strong>':'')+'</div>';
    }else if(r.outcome==='enemy'){
      h+='<div class="combat-outcome"><strong>Le gardien remporte l’échange.</strong><br>Tu subis <strong>'+String(r.damage)+'</strong> dégâts.';
      if(r.protectionAbsorbed>0)h+=' Ta protection en absorbe <strong>'+String(r.protectionAbsorbed)+'</strong>.';
      if(r.hpLost>0)h+=' Tu perds <strong>'+String(r.hpLost)+'</strong> Vie.';
      else h+=' Tu ne perds aucun point de Vie.';
      h+='</div>';
    }else h+='<div class="combat-outcome"><strong>Égalité.</strong><br>Vos attaques se croisent sans qu’aucun de vous ne trouve l’ouverture.</div>';
    h+='<div class="combat-life-line">Ta Vie : <strong>'+String(s.hp)+'/'+String(s.maxHp)+'</strong> · Vie adverse : <strong>'+String(c.hp)+'/'+String(CLIFF_GUARDIAN.hp)+'</strong></div>';
  }
  h+='</div>';
  return h;
}
function cliffGuardianChoices(s,key,winNode){
  const c=prepareCliffGuardian(s,key);
  if(s.hp<=0){clearCombatPowderPrompt(s,key);return[{label:'La fin du voyage',to:'death'}];}
  if(c.hp<=0){clearCombatPowderPrompt(s,key);return[{label:'Approcher du bord de la falaise',to:winNode}];}
  if(c.ready){
    const penalty=c.balance?.penalty||0;
    return[
      {label:'Jeter les dés — combattre',stay:true,inlineCombat:true,effect:x=>cliffGuardianRound(x,key)},
      ...rangedCombatChoices(s,key,CLIFF_GUARDIAN,penalty,true)
    ];
  }
  const normal=[{label:'Tester ton équilibre — Dextérité',stay:true,diceTest:true,effect:x=>cliffGuardianBalanceCheck(x,key)}];
  return combatPowderPromptChoices(s,key,normal);
}


function stripCapturedEquipment(s){
  if(s.flags.captiveEquipmentRemoved)return;
  s.flags.captiveEquipmentRemoved=true;
  s.inventory={};
  s.goldCoins=0;
  s.weapon='none';
  s.protection=0;
  s.protectionItems={};
  s.forceBonus=0;
  delete s.flags.combatPowderReady;
  delete s.flags.combatPowderActiveKey;
  s.flags.skullRing=false;
  s.flags.gauntlets=false;
  s.flags.southProtectionGift=false;
  s.flags.forceBracelet=false;
  s.flags.ravineForceBracelet=false;
}
function equipFoundSabre(s){
  s.weapon='naval_sword';
  s.flags.captiveFoundSabre=true;
}
function leaveHaleBehind(s){
  s.flags.haleAlive=false;
  s.flags.companion=null;
}
function resolveCaptiveAmbush(s){
  if(s.flags.captiveAmbushRolled)return;
  s.flags.captiveAmbushRolled=true;
  s.flags.captiveAmbushSuccess=rollDex(s);
  if(!s.flags.captiveAmbushSuccess)rollDamage(s,'captiveAmbush',3);
  else{
    s.flags.cageSoloEscape=true;
    s.flags.haleCaptive=true;
    s.flags.haleAlive=true;
    s.flags.companion=null;
    s.flags.providenceSailorsFreed=false;
    s.flags.captivePrisonersEscaped=false;
    setProvidenceMarinesWithParty(s,0);
    equipFoundSabre(s);
  }
}

function resolveCaptiveCompanionRescue(s){
  if(s.flags.captiveCompanionRescueRolled)return;
  s.flags.captiveCompanionRescueRolled=true;
  s.flags.captiveCompanionRescueSuccess=rollDex(s,2,'Dextérité — évasion difficile');
  if(s.flags.captiveCompanionRescueSuccess){
    s.flags.captiveCompanionsFreed=true;
    s.flags.secondIslandPartyReady=true;
    s.flags.haleAlive=true;
    s.flags.companion='hale';
    ensureProvidenceMarinesWithParty(s,1);
    equipFoundSabre(s);
  }else{
    s.flags.captiveFirstEscapeFailed=true;
    s.flags.captiveProvidenceSailorKilled=true;
    s.flags.haleAlive=true;
    s.flags.companion='hale';
    setProvidenceMarinesWithParty(s,0);
  }
}
function resolveCaptiveSecondEscape(s){
  if(s.flags.captiveSecondEscapeRolled)return;
  s.flags.captiveSecondEscapeRolled=true;
  s.flags.captiveSecondEscapeSuccess=rollDex(s);
  if(s.flags.captiveSecondEscapeSuccess){
    s.flags.captiveCompanionsFreed=true;
    s.flags.secondIslandPartyReady=true;
    s.flags.haleAlive=true;
    s.flags.companion='hale';
    setProvidenceMarinesWithParty(s,0);
    equipFoundSabre(s);
  }else{
    s.flags.captiveSecondEscapeDeath=true;
    s.hp=0;
  }
}

function prepareDeepCaveRevenant(s){
  if(!s.combats)s.combats={};
  if(s.combats.deepCaveRevenant)return;
  let hp=DROWNED_SAILOR.hp;
  if(haleWithParty(s)){
    hp=Math.max(1,hp-3);
    s.flags.deepCaveHaleAssist=true;
  }
  s.combats.deepCaveRevenant={hp,round:0,last:null};
}
function prepareVictoryRescueRevenant(s){
  if(!s.combats)s.combats={};
  if(s.combats.victoryRescueRevenant)return;
  let hp=DROWNED_SAILOR.hp;
  if(haleWithParty(s)){
    hp=Math.max(1,hp-3);
    s.flags.victoryRescueHaleAssist=true;
  }
  s.combats.victoryRescueRevenant={hp,round:0,last:null};
}

function needsVictoryRescueAct(s){
  return !s.flags.victoryRescueCompleted;
}

function victoryRescuePartyDescription(s){
  const parts=[];
  const soldiers=Math.max(0,Math.floor(Number(s.soldiers)||0));
  const marines=providenceMarinesWithParty(s);
  if(haleWithParty(s))parts.push('Hale');
  if(soldiers>0)parts.push(String(soldiers)+' soldat'+(soldiers>1?'s':'')+' de la garnison');
  if(marines>0)parts.push(String(marines)+' marin'+(marines>1?'s':'')+' du Providence');
  if(parts.length===0)return '<p>Tu n’as plus aucun combattant valide à tes côtés. Tu prends une lampe et pars seul vers les rochers.</p>';
  const total=displayedSoldierCount(s);
  const list=parts.length===1?parts[0]:parts.slice(0,-1).join(', ')+' et '+parts[parts.length-1];
  return '<p>Les blessés et les rescapés trop faibles pour marcher restent au village. Tous les combattants encore valides partent avec toi : '+list+'.</p>';
}


function captivePursuitHtml(s){
  const marines=providenceMarinesWithParty(s);
  const group=haleWithParty(s)||marines>0;
  let who='Tu cours dans l’obscurité';
  if(haleWithParty(s)&&marines===1)who='Vous courez dans l’obscurité, Hale et le marin du Providence juste derrière toi';
  else if(haleWithParty(s)&&marines>1)who='Vous courez dans l’obscurité, Hale et '+String(marines)+' marins du Providence juste derrière toi';
  else if(haleWithParty(s))who='Vous courez dans l’obscurité, Hale juste derrière toi';
  else if(marines===1)who='Vous courez dans l’obscurité, le marin du Providence juste derrière toi';
  else if(marines>1)who='Vous courez dans l’obscurité avec '+String(marines)+' marins du Providence';
  return '<p>'+who+'.</p><p>Les hommes pâles '+(group?'vous suivent':'te suivent')+'. La lumière de leurs torches danse sur les parois et leurs pas résonnent de plus en plus près.</p><p>La galerie descend brutalement.</p><p>'+(group?'Vous franchissez':'Tu franchis')+' une ouverture étroite dans la roche.</p><p>Puis les bruits derrière '+(group?'vous':'toi')+' cessent.</p><p>Tu te retournes.</p><p>Les hommes pâles sont toujours là, quelques mètres plus haut.</p><p>Ils '+(group?'vous regardent':'te regardent')+' depuis l’entrée du passage.</p><p>Aucun ne franchit la limite.</p><p>Dans l’obscurité, leurs yeux renvoient ce faible éclat bleu.</p><p>Puis, lentement, ils reculent.</p><p>Quelque chose dans cette partie de la grotte semble les empêcher — ou les effrayer — d’aller plus loin.</p><p>Devant '+(group?'vous':'toi')+', une faible lueur bleue apparaît puis disparaît au fond de la roche.</p>';
}

function restoreCapturedSoldiers(s){
  if(s.flags.capturedSoldiersRecovered)return 0;
  const n=Math.max(0,Math.floor(Number(s.flags.capturedSoldiers)||0));
  if(n<=0)return 0;
  s.flags.capturedSoldiersRecovered=n;
  s.flags.capturedSoldiers=0;
  s.soldiers=Math.min(Math.max(0,Math.floor(Number(s.maxSoldiers)||10)),Math.max(0,Math.floor(Number(s.soldiers)||0))+n);
  s.expeditionSoldiers=Math.max(0,Math.floor(Number(s.expeditionSoldiers)||0))+n;
  return n;
}
function restoreHaleFromPrison(s){
  if(!s.flags.haleCaptive)return false;
  s.flags.haleCaptive=false;
  s.flags.haleRescuedFromCage=true;
  s.flags.haleAlive=true;
  s.flags.companion='hale';
  return true;
}
function liberatePrisonGroup(s){
  const soldiers=restoreCapturedSoldiers(s);
  const hale=restoreHaleFromPrison(s);
  s.flags.providenceSailorsFreed=true;
  s.flags.captivePrisonersEscaped=true;
  ensureProvidenceMarinesWithParty(s,3);
  s.flags.prisonLiberated=true;
  return {soldiers,hale};
}

function resolveVillageNightAftermath(s){
  s.flags.villageTime='night';
  if(!s.flags.providenceSailorsFreed){
    liberatePrisonGroup(s);
    s.flags.freedAtNight=true;
  }
}
function resolveVillageAssaultVictory(s){
  if(s.flags.villageTime!=='night')s.flags.villageTime='day';
  if(!s.flags.providenceSailorsFreed){
    liberatePrisonGroup(s);
  }
  s.flags.villageAssaultWon=true;
}
function resolveVillageDawn(s){
  s.flags.villageTime='dawn';
}

function resolveDeepCaveFlooded(s){
  if(s.flags.deepCaveFloodedRolled)return;
  s.flags.deepCaveFloodedRolled=true;
  s.flags.deepCaveFloodedDex=rollDex(s);
  if(!s.flags.deepCaveFloodedDex)rollDamage(s,'deepCaveFlooded',3);
}

function createInitialState(){
  return {
    node:'start',pageMapVersion:23,heroGender:'female',heroName:'Eleanor',
    inventory:{},flags:{},visited:{},history:[],journal:'',
    hp:18,maxHp:18,baseForce:8,baseDexterity:13,forceBonus:0,dexBonus:0,dexPenalty:0,
    weapon:'naval_sword',protection:0,protectionItems:{},goldCoins:0,
    soldiers:10,maxSoldiers:10,expeditionSoldiers:0,shipSoldiers:10,
    crewBattles:{},combats:{},damageRolls:{},damageRollResults:{},
    lastDice:null,lastTotal:null,lastStat:null,lastStatName:'',rollCount:0,currentCheckpoint:null
  };
}

const STORY={
 start:{sheet:true,number:'FICHE DU HÉROS',title:'Choisis ton personnage',text:s=>`
   <div class="hero-sheet">
   <div class="hero-selection-title">Qui veux-tu incarner ?</div>
   <div class="hero-selection-copy">La même aventure et les mêmes caractéristiques. Seuls ton identité et ton portrait changent.</div>
   <div class="hero-choice-grid">
    <label class="hero-choice-card ${heroGender(s)==='female'?'selected':''}"><input class="hero-gender-input" type="radio" name="heroGenderChoice" value="female" ${heroGender(s)==='female'?'checked':''}><span class="hero-choice-name">Eleanor</span><span class="hero-choice-rank">Lieutenant de la Royal Navy</span></label>
    <label class="hero-choice-card ${heroGender(s)==='male'?'selected':''}"><input class="hero-gender-input" type="radio" name="heroGenderChoice" value="male" ${heroGender(s)==='male'?'checked':''}><span class="hero-choice-name">Edward</span><span class="hero-choice-rank">Lieutenant de la Royal Navy</span></label>
   </div>
   <div class="hero-sheet-row"><span class="hero-label">Nom</span><span class="hero-value"><strong>${heroName(s)}</strong></span></div>
   <div class="hero-sheet-row"><span class="hero-label">Rang</span><span class="hero-value">${heroRank()}</span></div>
   <div class="hero-sheet-grid hero-sheet-tag-grid">
    <div class="tag"><span class="tag-copy"><small>Vie</small><strong>${s.hp}/${s.maxHp}</strong></span></div>
    <div class="tag"><span class="tag-copy"><small>Dextérité</small><strong>${currentDexterity(s)}</strong></span></div>
    <div class="tag"><span class="tag-copy"><small>Force</small><strong>${currentForce(s)}</strong></span></div>
    <div class="tag"><span class="tag-copy"><small>Arme</small><strong>+4</strong></span></div>
    <div class="tag"><span class="tag-copy"><small>Protection</small><strong>${currentProtection(s)}</strong></span></div>
    <div class="tag"><span class="tag-copy"><small>Soldats</small><strong>${s.soldiers}</strong></span></div>
   </div>
   </div>`,choices:[{label:'Continuer',to:'startRules',effect:s=>setHeroIdentity(s,heroGender(s))}]},

 startRules:{sheet:true,number:'RÈGLES DU JEU',title:'Avant de commencer',text:s=>`
   <div class="hero-sheet">
     <div class="combat-rules-card">
       <div class="combat-rules-title">Règles des combats individuels</div>
       <p>Personnage et adversaire lancent chacun <strong>2 dés</strong> et ajoutent leur <strong>Dextérité</strong> et leur <strong>Force</strong>.<br>Le meilleur score remporte l’échange. En cas d’égalité, personne n’est blessé.<br>La Force aide à remporter l’échange, mais ne modifie pas les dégâts. Tes dégâts sont de <strong>2 + la Puissance de ton arme</strong> si tu en possèdes une. Les dégâts adverses sont indiqués pendant le combat.</p>
     </div>
     <div class="hero-weapon">Au départ, tu portes un sabre court de marine · Puissance 4.</div>
     <div class="hero-characteristics" role="note">
       <div class="hero-info-title">Avant de commencer</div>
       <p>En bas de l’écran, tu peux consulter à tout moment tes caractéristiques, ton inventaire et ton journal de bord. Tu y retrouveras ton équipement ainsi que les objets découverts pendant l’aventure.</p>
       <p>Chaque chemin révèle une partie du mystère.</p>
       <p>Pour en percer tous les secrets, il te faudra peut-être vivre l’aventure plusieurs fois…</p>
     </div>
   </div>`,choices:[{label:'Commencer l’aventure',to:'c0'}]},
 c0:{title:'Avant le Providence',text:s=>heroGender(s)==='female'?`<p>Tu es née en 1691, près des quais de Portsmouth. Ton père travaillait autour des navires et, très tôt, tu as appris à reconnaître une voile mal réglée, le bruit d’un gréement fatigué et l’odeur du mauvais temps avant même que le ciel ne change.</p><p>Mais la mer n’était pas un avenir destiné aux femmes.</p><p>À quinze ans, tu as coupé tes cheveux, abandonné tes robes et pris une identité masculine. Pour la Royal Navy, tu es devenue Edward. Seules quelques personnes connaissent encore ton véritable prénom : Eleanor.</p><p>Les années ont passé. Tu as appris à vivre parmi les hommes sans jamais laisser tomber le masque. Tu as servi pendant la guerre, connu les tempêtes, les abordages et les longues traversées. Ton sang-froid et ton sens de la navigation t’ont permis de gravir lentement les échelons.</p><p>Aujourd’hui, à vingt-huit ans, tu portes le grade de lieutenant. Une belle carrière s’ouvre devant toi, à condition que personne ne découvre jamais qui tu es réellement.</p><p>Depuis plusieurs mois, tu sers dans les Caraïbes. Port Royal est devenu ton port d’attache.</p>`:`<p>Tu es né en 1691, près des quais de Portsmouth. Ton père travaillait autour des navires et, très tôt, tu as appris à reconnaître une voile mal réglée, le bruit d’un gréement fatigué et l’odeur du mauvais temps avant même que le ciel ne change.</p><p>À quinze ans, tu as rejoint la Royal Navy.</p><p>Les années ont passé. Tu as servi pendant la guerre, connu les tempêtes, les abordages et les longues traversées. Ton sang-froid et ton sens de la navigation t’ont permis de gravir lentement les échelons.</p><p>Aujourd’hui, à vingt-huit ans, tu portes le grade de lieutenant. Tu n’es pas encore un grand nom de la Navy, mais tes supérieurs savent que tu es capable de ramener un navire et ses hommes lorsque la situation tourne mal.</p><p>Depuis plusieurs mois, tu sers dans les Caraïbes. Port Royal est devenu ton port d’attache.</p>`,choices:[{label:'Port Royal — 1719',to:'c1'}]},
 c1:{title:'La mission',text:`<p>Port Royal, Jamaïque — 1719.</p><p>Le jour n’est pas encore complètement levé lorsque tu traverses les quais. L’air est déjà chaud. Entre les mâts serrés dans le port, les cris des dockers se mêlent au claquement des voiles, à l’odeur du goudron, du sel et du bois humide.</p><p>La Jamaïque vit dans une tension permanente. La Grande-Bretagne est en guerre contre l’Espagne, et les routes maritimes des Caraïbes attirent autant les corsaires que les pirates.</p><p>L’ordre qui t’attend porte l’autorité du gouverneur de l’île, Sir Nicholas Lawes. À Londres, le Board of Admiralty est dirigé par James Berkeley, comte de Berkeley, mais ici les décisions doivent parfois être prises sans attendre plusieurs mois qu’un courrier traverse l’Atlantique.</p><p>Si cette mission t’est confiée, ce n’est pas par hasard. Tu connais déjà ces eaux. Tu as escorté des navires marchands, poursuivi des navires suspects et, quelques mois plus tôt, ramené à Port Royal un navire endommagé qu’une partie de son équipage croyait perdu.</p><p>Cette fois, il ne s’agit pourtant pas d’un combat.</p><p>Le Providence, navire marchand appartenant à Edmund Harcourt, aurait dû rentrer depuis quatre jours. Vingt-sept hommes se trouvaient à bord. Aucun message. Aucun survivant. Aucune épave.</p><p>Tu parcours son manifeste avant de partir. Rien d’exceptionnel : sucre, indigo, outils, quelques caisses de tissus et des lettres commerciales. Aucune cargaison précieuse. Aucun trésor. S’il a quitté sa route, ce n’était donc pas pour livrer une marchandise secrète prévue au départ.</p><p>On te confie le Resolute, un petit sloop armé, rapide et suffisamment maniable pour s’approcher des côtes difficiles. Environ <strong>soixante-dix marins chevronnés</strong> assurent la navigation, les voiles et les canons.</p><p>À eux s’ajoutent <strong>dix soldats aguerris</strong> de la garnison de Port Royal. Tu les connais. Certains ont déjà combattu sous tes ordres. Tu leur fais confiance et, si des pirates tentent un abordage, ils sauront se défendre.</p><p>Comme avant chaque mission, tu décides d’étudier les différents chemins possibles afin d’arriver rapidement, mais aussi avec le moins de risques possible.</p><p>Chaque heure perdue risque de rendre le sauvetage plus compliqué et tu le sais. Malheureusement, certains passages sont dangereux à traverser.</p><p>Il va falloir prendre une décision.</p>`,choices:[{label:'Étudier la carte',to:'c2'}]},
 c2:{title:'Deux routes',text:`<p>Tu poses la carte sur une caisse et suis du doigt les deux routes possibles.</p><p>La première longe la côte.</p><p>Elle serpente entre les récifs, les hauts-fonds et de nombreuses petites îles. La navigation y est lente et demande une attention constante. Une erreur de quelques dizaines de mètres peut suffire à endommager la coque.</p><p>Mais tes marins sont expérimentés. Ils connaissent les courants et savent lire les changements de couleur de l’eau qui trahissent les récifs.</p><p>Surtout, cette route traverse plusieurs villages de pêcheurs et de petits ports. Si le Providence est passé dans la région, quelqu’un l’a peut-être vu. Tu pourrais y recueillir des témoignages, connaître sa direction ou apprendre ce qui s’est produit avant sa disparition.</p><p>Le problème est le temps. En longeant la côte, tu peux perdre presque une journée entière.</p><p>La seconde route passe directement par le large.</p><p>Elle est beaucoup plus courte. Avec un vent favorable, elle te mènera presque directement vers la dernière position connue du Providence.</p><p>Mais cette partie de la mer est peu surveillée. Les navires marchands qui s’y aventurent sans escorte sont des proies faciles, et les attaques de pirates y sont fréquentes.</p><p>Par cette route, tu gagnerais de précieuses heures.</p><p>À condition d’arriver jusqu’au bout.</p>`,choices:[{label:'Longer la côte et interroger les villages',to:'c3'},{label:'Prendre la route directe par le large',to:'c12'}]},
 c3:{title:'',text:`<p>Le Resolute longe la côte pendant plusieurs heures.</p><p>La navigation est exactement aussi délicate que la carte le laissait prévoir. Par endroits, les récifs remontent presque jusqu’à la surface et forment sous l’eau de longues lignes pâles que seuls les marins les plus expérimentés savent lire.</p><p>À plusieurs reprises, le sloop ralentit pour franchir un chenal étroit entre deux hauts-fonds.</p><p>Vous croisez plusieurs petits villages de pêcheurs. Quelques maisons de bois, des embarcations tirées sur le sable, parfois un quai sommaire.</p><p>Tu fais poser les mêmes questions partout.</p><p>Personne ne semble avoir vu le Providence.</p><p>Ou personne ne souhaite en parler.</p><p>Dans le troisième village, pourtant, un vieux calfateur s’arrête en entendant le nom du navire.</p><blockquote>« Providence ? J’ai vu son nom à la poupe. Il y a cinq jours. »</blockquote><p>Tu lui demandes où il allait.</p><p>L’homme pointe vers le large, puis fronce les sourcils.</p><blockquote>« C’est justement ce qui m’a surpris. Il ne remontait pas vers Port Royal. Il descendait vers le sud-est. »</blockquote><p>Il hésite, puis ajoute :</p><blockquote>« Juste avant qu’il change de cap, on a vu trois points bleutés très loin au sud-est. Ils restaient au même endroit, comme un signal sur une côte. Le Providence a viré dans leur direction quelques minutes plus tard. »</blockquote><p>Tu vérifies ta carte. Ce cap n’a aucun sens pour son voyage de retour.</p><p>Et aucun phare connu ne se trouve dans cette direction.</p><p>En fin d’après-midi, vous atteignez un village plus important. Une petite jetée permet au Resolute de mouiller à proximité sans risquer les récifs.</p><p>Le soleil descend déjà derrière les palmiers.</p><p>Sur la place, les habitants rangent leurs étals. Plusieurs hommes te regardent passer en uniforme avant de détourner les yeux.</p><p>Une enseigne de bois grince au-dessus d’une porte.</p><p>La taverne est encore ouverte.</p>`,choices:[{label:'Entrer dans la taverne',to:'c4'}]},

 c4:{title:'',text:s=>{
   const asked=(s.flags.tavernkeeperDone?1:0)+(s.flags.oldSailorDone?1:0)+(s.flags.spanishWomanDone?1:0);
   if(asked===0)return `<p>L’intérieur est sombre malgré les dernières lueurs du jour.</p><p>Une dizaine de marins boivent en silence autour de petites tables.</p><p>L’odeur du rhum, de la fumée et du poisson séché imprègne la pièce.</p><p>Ton uniforme attire immédiatement les regards.</p><p>Les conversations reprennent presque aussitôt, mais moins fort.</p><p>Trois personnes retiennent ton attention.</p><p>Le tavernier, un homme large d’épaules qui essuie depuis plusieurs minutes le même gobelet sans jamais vraiment te regarder.</p><p>Un vieux marin, assis seul dans un coin. Sa peau est brûlée par le soleil et une longue cicatrice traverse sa joue. Il a l’allure de quelqu’un qui a passé sa vie sur des bateaux dont il vaut mieux ne pas connaître le pavillon.</p><p>Et enfin une femme étrangère, installée près d’une fenêtre.</p><p>Ses vêtements sont simples, mais sa posture ne l’est pas.</p><p>Elle observe la salle comme un soldat observe un terrain avant une bataille.</p><p>Tu es presque certain qu’elle est espagnole.</p>`;
   if(asked<3)return `<p>Tu reprends un instant ta place dans la salle.</p><p>Autour de toi, les conversations continuent à voix basse. Personne ne semble vouloir attirer ton attention.</p><p>Tu peux encore décider d’interroger quelqu’un d’autre dans la taverne.</p><p>Mais la nuit est déjà bien avancée, et la journée de demain sera longue.</p><p>Tu peux aussi monter te reposer et reprendre la mer à l’aube.</p>`;
   return `<p>Tu restes encore quelques instants dans la salle.</p><p>Tu as interrogé toutes les personnes qui semblaient susceptibles de savoir quelque chose.</p><p>Il ne reste plus grand-chose à apprendre ici.</p><p>La nuit est avancée et la journée de demain sera longue.</p><p>Il est temps de monter te reposer.</p>`;
 },choices:s=>{
   const out=[];
   if(!s.flags.tavernkeeperDone)out.push({label:'Interroger le tavernier',to:'c5'});
   if(!s.flags.oldSailorDone)out.push({label:'Interroger le vieux marin',to:'c6'});
   if(!s.flags.spanishWomanDone)out.push({label:'Interroger la femme espagnole',to:'c7'});
   out.push({label:'Monter dans ta chambre et te reposer',to:'c8'});
   return out;
 }},

 c5:{title:'',text:s=>{
   if(s.flags.tavernkeeperApproach==='polite')return `<p>Tu poses quelques pièces sur le comptoir et adoptes un ton aussi calme que possible.</p><blockquote>« Je cherche un navire marchand, le Providence. Nous pensons qu’il est passé dans cette région il y a quelques jours. J’aimerais simplement savoir si vous l’avez aperçu, ou si quelqu’un ici a entendu quelque chose. »</blockquote><p>Le tavernier continue d’essuyer son gobelet.</p><p>Il réfléchit peut-être une seconde de trop.</p><blockquote>« Non, lieutenant. Désolé. Je n’ai rien vu. »</blockquote><p>Il se détourne immédiatement pour ranger une bouteille déjà parfaitement à sa place.</p><p>Tu comprends qu’il n’ajoutera rien.</p>`;
   if(s.flags.tavernkeeperApproach==='authority')return `<p>Tu poses les deux mains sur le comptoir.</p><p>Cette fois, ta voix n’a plus rien d’amical.</p><blockquote>« Je suis en mission pour la Couronne. Un navire et vingt-sept hommes ont disparu. Si vous savez quelque chose et que vous choisissez de me le cacher, j’aurai besoin d’une excellente raison. »</blockquote><p>Le tavernier s’immobilise.</p><p>Son regard passe rapidement vers les autres clients.</p><blockquote>« Non. Je n’ai pas vu votre bateau. »</blockquote><p>Il baisse encore la voix.</p><blockquote>« J’ai entendu ce qui arrive aux marins quand ils deviennent trop avides. »</blockquote><p>Il jette un regard vers la salle avant de poursuivre.</p><blockquote>« Certains racontent qu’une île apparaît à ceux qui cherchent des richesses avec trop d’insistance. Une île qu’on ne trouve jamais par hasard. »</blockquote><p>Il se penche légèrement vers toi.</p><blockquote>« Ceux qui partent à sa recherche finissent parfois par la trouver. Le problème, c’est qu’ils ne reviennent pas toujours. »</blockquote><p>Il essuie lentement le bord du comptoir.</p><blockquote>« Le plus étrange, c’est qu’on retrouve parfois leur bateau des semaines plus tard. Pas coulé. Pas pillé. Juste... vide. »</blockquote><p>Il se redresse brusquement.</p><blockquote>« Pour moi, ce ne sont que des histoires. Mais ici, personne n’aime en parler. »</blockquote>`;
   return `<p>Tu t’approches du comptoir.</p><p>Le tavernier te regarde enfin.</p><p>À cette distance, tu remarques qu’il évite soigneusement de regarder l’insigne de la Royal Navy sur ton uniforme.</p><p>Tu peux essayer de le mettre en confiance.</p><p>Ou lui rappeler que tu n’es pas ici en simple voyageur.</p>`;
 },choices:s=>s.flags.tavernkeeperDone?[{label:'Retourner dans la salle',to:'c4'}]:[
   {label:'L’amadouer poliment',stay:true,effect:s=>{s.flags.tavernkeeperDone=true;s.flags.tavernkeeperApproach='polite';}},
   {label:'Employer un ton grave et faire usage de ton autorité',stay:true,effect:s=>{s.flags.tavernkeeperDone=true;s.flags.tavernkeeperApproach='authority';s.flags.tavernkeeperAuthority=true;s.flags.islandRumor=true;}}
 ]},

 c6:{title:'',text:s=>{
   if(s.flags.oldSailorApproach==='polite')return `<p>Tu t’assieds en face de lui sans brusquer les choses.</p><blockquote>« Excusez-moi. Je cherche un navire marchand appelé le Providence. Il est possible qu’il soit passé près d’ici. Vous avez peut-être vu quelque chose ? »</blockquote><p>Le vieil homme lève lentement les yeux vers toi.</p><p>Il boit une gorgée de rhum.</p><blockquote>« Non. Rien vu qui ressemble à votre marchand. »</blockquote><p>Puis il regarde de nouveau son verre.</p><p>La conversation est terminée.</p>`;
   if(s.flags.oldSailorApproach==='authority')return `<p>Tu tires une chaise et t’assieds sans lui demander son avis.</p><blockquote>« Écoutez-moi bien. Je représente la Royal Navy. Des hommes ont disparu et je n’ai pas de temps à perdre avec les silences de cette salle. »</blockquote><p>Le vieux marin relève les yeux.</p><p>Un sourire fatigué apparaît sur son visage.</p><blockquote>« Non. Je n’ai pas vu le navire que vous cherchez. »</blockquote><p>Il fait tourner son verre entre ses doigts.</p><blockquote>« Mais des bateaux disparaissent dans cette région. Pas seulement des pêcheurs perdus dans une tempête. Des navires entiers. »</blockquote><p>Il lève enfin les yeux vers toi.</p><blockquote>« On retrouve parfois une chaloupe. Une voile. Un morceau de coque. Parfois rien du tout. Et quand un navire disparaît ici, les vieux du coin ne demandent même plus pourquoi. »</blockquote><p>Il marque une pause.</p><blockquote>« Certains parlent d’une île. Moi, je ne sais pas ce qu’il faut croire. Je sais seulement que trop de bateaux ont disparu au même endroit pour que ce soit un hasard. »</blockquote><p>Il baisse encore la voix.</p><blockquote>« Les coques qu’on retrouve sont souvent presque intactes. Comme si la mer avait voulu garder le navire... mais pas les hommes. »</blockquote><p>Il esquisse un sourire sans joie.</p><p>Il attrape soudain ta main.</p><p>Avant que tu ne la retires, il prend un morceau de charbon posé près d’une lampe et dessine lentement un cercle noir au centre de ta paume.</p><p>Un simple rond. Parfaitement fermé.</p><blockquote>« Retenez bien ce signe. »</blockquote><p>Tu lui demandes ce qu’il signifie.</p><p>Le vieux marin regarde autour de lui avant de répondre.</p><blockquote>« Je ne sais pas comment ils s’appellent. Mais certains hommes qui naviguent dans ces eaux le portent depuis des années. »</blockquote><blockquote>« Des pêcheurs. Des contrebandiers. Des marchands. Des hommes qui passent là où d’autres disparaissent... et qui reviennent toujours. »</blockquote><p>Son pouce referme tes doigts sur la marque.</p><blockquote>« Si vous revoyez ce cercle, ne croyez pas au hasard. »</blockquote><p>Lorsque tu relèves les yeux, le vieil homme a déjà repris son verre.</p>`;
   return `<p>Le vieux marin ne lève même pas les yeux lorsque tu approches.</p><p>Sa main gauche serre un verre de rhum. Deux doigts de sa main droite manquent à l’appel.</p><p>Tu peux essayer de gagner sa confiance.</p><p>Ou lui parler comme à un homme qui sait parfaitement ce que signifie un uniforme de la Royal Navy.</p>`;
 },choices:s=>s.flags.oldSailorDone?[{label:'Retourner dans la salle',to:'c4'}]:[
   {label:'L’interroger poliment',stay:true,effect:s=>{s.flags.oldSailorDone=true;s.flags.oldSailorApproach='polite';}},
   {label:'Faire usage de ton autorité',stay:true,effect:s=>{s.flags.oldSailorDone=true;s.flags.oldSailorApproach='authority';s.flags.blackCirclePalm=true;s.flags.islandRumor=true;}}
 ]},

 c7:{title:'',text:s=>{
   if(s.flags.spanishWomanApproach==='polite')return `<p>Tu t’arrêtes à quelques pas de sa table.</p><blockquote>« Pardonnez-moi de vous déranger. Je recherche le Providence, un navire marchand disparu depuis quelques jours. Peut-être l’avez-vous aperçu en arrivant dans la région ? »</blockquote><p>Elle te regarde longuement avant de répondre.</p><blockquote>« Je suis désolée, lieutenant. Je n’ai vu aucun navire de ce nom. »</blockquote><p>Son français est presque parfait, à peine marqué par son accent.</p><p>Elle baisse les yeux vers son verre.</p><p>Tu pourrais insister, mais tu comprends qu’elle ne dira rien de plus.</p>`;
   if(s.flags.spanishWomanApproach==='authority')return `<p>Tu restes debout devant sa table.</p><blockquote>« Vous savez qui je suis. Et vous savez également que nos deux pays sont en guerre. Je ne vous accuse de rien, mais un navire britannique et vingt-sept hommes ont disparu. Si vous possédez une information, c’est maintenant qu’il faut parler. »</blockquote><p>La femme ne semble pas impressionnée.</p><p>Elle te fixe quelques secondes, puis soupire.</p><blockquote>« Non. Je n’ai vu aucun navire correspondant à ce que vous cherchez. »</blockquote><p>Elle tourne lentement son verre entre ses doigts.</p><blockquote>« Vous autres marins pensez souvent que le danger vient des canons, des sabres ou des pirates. »</blockquote><p>Elle te regarde droit dans les yeux.</p><blockquote>« Mais la mer est bien plus dangereuse que n’importe quel guerrier. Elle tue les imprudents, les courageux et les meilleurs combattants sans faire de différence. »</blockquote><p>Elle baisse un instant les yeux vers ton uniforme.</p><blockquote>« Si vous comptez réellement poursuivre ce navire, vous aurez besoin de plus que de votre grade. »</blockquote><p>Elle plonge une main sous son manteau.</p><p>Instinctivement, ta main se rapproche de ton arme.</p><p>Mais elle dépose simplement sur la table un bracelet épais de cuir sombre, renforcé par une petite pièce de métal usée.</p><blockquote>« Prenez-le. »</blockquote><p>Tu ne bouges pas.</p><blockquote>« Je suis heureuse d’avoir croisé votre route, lieutenant. Mais je ne crois pas que nous vous reverrons. »</blockquote><p>Tu passes le bracelet autour de ton poignet.</p><p>Il serre fortement l’avant-bras et améliore immédiatement ta prise.</p><p><strong>Bracelet de force : Force +2.</strong></p>`;
   return `<p>La femme suit ton approche du regard.</p><p>Elle est plus jeune que tu ne le pensais. Une trentaine d’années tout au plus.</p><p>Ses vêtements n’ont rien d’un uniforme, pourtant sa façon de se tenir, de surveiller les portes et de garder une main libre ne laisse guère de doute.</p><p>Elle a reçu une formation militaire.</p><p>Tu peux t’adresser à elle avec courtoisie.</p><p>Ou utiliser ton grade et la situation politique pour la pousser à répondre.</p>`;
 },choices:s=>s.flags.spanishWomanDone?[{label:'Retourner dans la salle',to:'c4'}]:[
   {label:'L’interroger poliment',stay:true,effect:s=>{s.flags.spanishWomanDone=true;s.flags.spanishWomanApproach='polite';}},
   {label:'Parler avec autorité',stay:true,effect:s=>{s.flags.spanishWomanDone=true;s.flags.spanishWomanApproach='authority';s.flags.islandRumor=true;if(!s.flags.forceBracelet){s.flags.forceBracelet=true;s.forceBonus=(s.forceBonus||0)+2;addItem(s,'bracelet_force','Bracelet de force','Un bracelet de cuir sombre renforcé de métal. Force +2.');}}}
 ]},

 c8:{title:'',text:`<p>La nuit est tombée depuis longtemps.</p><p>Ta chambre se trouve à l’étage de la taverne. Une petite pièce étroite, un lit, une table et une fenêtre donnant sur la rue.</p><p>Tu as laissé ton sabre à portée de main.</p><p>Comme toujours lorsque tu dors loin d’un navire militaire, tu as également glissé un petit couteau sous ton oreiller.</p><p>Le village est silencieux.</p><p>Puis un bruit te réveille.</p><p>Un craquement très léger.</p><p>Le bois du plancher.</p><p>Tu ouvres les yeux.</p><p>Une silhouette se tient près de ton lit.</p><p>Tu aperçois le reflet d’une lame.</p><p>Elle s’abat vers toi.</p>`,choices:[{label:'Réagir — test de Dextérité',to:'c9',diceTest:true,effect:s=>{s.flags.nightDex=rollDex(s);if(!s.flags.nightDex)rollDamage(s,'night',3);}}]},

 c9:{title:'',text:s=>diceResultHtml(s)+(s.flags.nightDex?
   `<p>Ton corps réagit avant même que tu aies le temps de réfléchir.</p><p>Tu roules sur le côté. La lame frappe le matelas.</p><p>Ta main passe sous l’oreiller et se referme sur ton couteau.</p><p>Tu frappes.</p><p>L’homme recule brutalement et s’effondre contre le mur.</p>`:
   damageResultHtml(s,'night')+`<p>La lame te touche avant que tu ne parviennes à te dégager.</p><p>Tu arraches ton couteau de dessous l’oreiller et frappes à ton tour.</p><p>L’homme recule et tombe lourdement contre le mur.</p>`)
   +`<p>Tu allumes la petite lampe posée près du lit.</p><p>Tu ne reconnais pas ton agresseur.</p><p>Un homme du village, peut-être. Ou quelqu’un arrivé après vous.</p><p>Il essaie de respirer.</p><p>Tu t’accroupis près de lui.</p><blockquote>« Qui vous envoie ? »</blockquote><p>Il secoue lentement la tête.</p><p>Puis ses doigts se referment sur ta manche.</p><blockquote>« Abandonnez les recherches... »</blockquote><p>Sa voix n’est plus qu’un souffle.</p><blockquote>« Vous ne pouvez rien contre lui... Il est déjà trop puissant. »</blockquote><p>Il cherche encore son souffle.</p><p>Sa main retombe.</p><p>Il ne répond plus.</p><p>En desserrant ses doigts, tu remarques sur l’intérieur de son poignet une marque tatouée : un simple cercle noir, parfaitement fermé.</p>${s.flags.blackCirclePalm?'<p>Ton regard descend aussitôt vers ta propre paume. C’est exactement le signe que le vieux marin y a dessiné.</p>':'<p>Le symbole paraît volontairement banal, comme s’il ne devait rien signifier pour celui qui ne sait pas quoi regarder.</p>'}`,onEnter:s=>{s.flags.assassinCircle=true;},choices:[{label:'Fouiller son corps',to:'c10',effect:s=>{if(!s.flags.assassinLoot){s.flags.assassinLoot=true;addGold(s,8);addItem(s,'couteaux_jet','Deux couteaux équilibrés','Deux petits couteaux parfaitement équilibrés, adaptés au lancer.',{quantity:2});}}}]},

 c10:{title:'',text:s=>`<p>Tu fouilles rapidement les vêtements de l’homme.</p><p>Il ne porte aucun document.</p><p>Aucun signe permettant de connaître son origine.</p><p>Dans une petite bourse, tu trouves <strong>huit pièces d’or</strong>.</p><p>Sous son manteau sont dissimulés <strong>deux petits couteaux parfaitement équilibrés</strong>. Plus courts que ton arme de combat, mais conçus pour être lancés avec précision.</p><p>Tu les ajoutes à ton équipement.</p><p>Le reste de la nuit est court.</p><p>Lorsque tu redescends dans la salle, le jour commence à peine à entrer par les fenêtres.</p><p>Le tavernier est déjà là, mais il évite ton regard.</p>${s.flags.oldSailorDone?'<p>La table du vieux marin est vide.</p>':''}${s.flags.spanishWomanDone?'<p>La femme espagnole a elle aussi disparu.</p>':''}<p>Personne ne demande ce qui s’est passé dans ta chambre.</p><p>Personne ne semble surpris.</p><p>Quelques minutes plus tard, tu rejoins la jetée.</p><p>À bord du Resolute, les marins terminent de préparer les voiles. Tes dix soldats vérifient leurs armes.</p><p>Tu jettes un dernier regard vers le village.</p><p>Puis tu donnes l’ordre de larguer les amarres.</p><p>Le Providence vous attend quelque part au-delà de la côte.</p>`,choices:[{label:'Rejoindre la zone de disparition',to:'c20'}]},
 c12:{title:'Le pavillon noir',text:`<p>Le Resolute quitte progressivement les eaux côtières et prend la route du large.</p><p>Derrière vous, la ligne de terre s’efface peu à peu jusqu’à disparaître complètement.</p><p>Bientôt, il ne reste plus que la mer.</p><p>De l’eau dans toutes les directions, jusqu’à l’horizon.</p><p>Le vent est régulier et le sloop avance vite, mais à bord l’atmosphère est différente de celle des premières heures.</p><p>Les marins connaissent ces eaux.</p><p>Ils savent que loin des côtes, un navire isolé peut rester invisible pendant des jours.</p><p>Et ils savent surtout que les navires marchands ne sont pas les seuls à emprunter cette route.</p><p>Puis une voix éclate soudain au-dessus du pont.</p><blockquote>« Voile ! Voile à l’horizon ! »</blockquote><p>La vigie, installée dans la hune, pointe le bras vers l’avant tribord.</p><p>En quelques secondes, les conversations cessent.</p><p>Plusieurs hommes se tournent dans la même direction.</p><p>Au début, tu ne distingues presque rien.</p><p>Un point sombre seulement, posé sur la ligne de l’horizon.</p><p>Tu prends la longue-vue.</p><p>Sa structure est légère et rapide. Trop rapide pour un gros navire de commerce.</p><p>Et surtout, quelque chose flotte en haut du mât.</p><p>Une pièce de tissu noire.</p><p>Le doute disparaît.</p><p>Un pavillon noir.</p><p>Sur ton pont, les soldats se mettent en place.</p><p>Les marins cessent complètement de parler.</p><p>Le navire adverse continue d’approcher.</p><p>Il attend probablement que vous réduisiez la voilure et acceptiez de vous rendre.</p><p>Il en est évidemment hors de question. Tu le fais savoir sans attendre en donnant l’ordre de mettre toute la toile : le Resolute se lance à pleine vitesse droit sur le navire pirate.</p><p>Quelques instants plus tard, le pavillon noir descend.</p><p>Un autre monte lentement à sa place.</p><p>Rouge.</p><p>Cette fois, même les plus jeunes marins comprennent ce que cela signifie.</p><p>Pas de quartier.</p><p>Pas de prisonniers.</p><p>Le navire pirate accélère encore.</p>`,choices:[{label:'Préparer les soldats',to:'c13',effect:s=>startCrewBattle(s,'pirates1',pirateCrewSize(s),4,1,0)}]},
 c13:{title:'L’abordage',text:s=>`<p>Les pirates passent à l’abordage.</p>
  <div class="dice-result">
    <p class="roll-number">Règle du combat de groupe</p>
    <p>Chaque groupe possède une <strong>Valeur de combat</strong> qui représente à la fois son équipement et son entraînement.</p>
    <p>Tes soldats sont aguerris et bien équipés : <strong>Valeur de combat 4</strong>. Chaque dé faisant <strong>1, 2, 3 ou 4</strong> est une réussite.</p>
    <p>Les pirates sont plus nombreux mais moins disciplinés et moins bien équipés : <strong>Valeur de combat 1</strong>. Seul un <strong>1</strong> est une réussite.</p>
    <p>Chaque combattant lance <strong>1D6</strong>. <strong>Chaque réussite élimine un adversaire.</strong></p>
    <p>Après chaque assaut, les survivants relancent leurs dés jusqu’à l’élimination complète d’un des deux groupes.</p>
  </div>
  ${crewBattleHtml(s,'pirates1',pirateCountForBattle(s,'pirates1'))}`,choices:s=>{const b=ensureCrewBattle(s,'pirates1',pirateCountForBattle(s,'pirates1'),4,1,0);if(s.soldiers<=0)return[{label:'Tes soldats sont anéantis',to:'death'}];if(b.enemy<=0)return[{label:'Sauter sur le pont adverse — affronter le capitaine',to:'c15'}];return[{label:b.round?'Assaut suivant':'Lancer les dés — premier assaut',stay:true,inlineCombat:true,effect:x=>crewBattleRound(x,'pirates1',pirateCountForBattle(x,'pirates1'))}];}},
 c15:{title:'Le capitaine pirate',text:s=>`<p>Tu prends appui sur la rambarde et sautes sur le pont adverse.</p><p>Autour de toi, la mêlée se disperse entre les cordages et les canons. Des hommes reculent, d’autres se jettent les uns sur les autres dans le vacarme des lames et du bois frappé.</p><p>Puis tu le vois.</p><p>Le capitaine pirate ne ressemble pas aux hommes qui se battent autour de lui. Grand, massif, le visage mangé par une barbe noire, il porte un long manteau usé dont les manches sont tachées de sel. Une cicatrice épaisse part de sa pommette et disparaît sous sa barbe.</p><p>Il regarde ses hommes tomber sans bouger.</p><p>Quand ses yeux se posent sur toi, il sourit.</p><p>Il tire lentement son sabre d’abordage. La lame est large, ébréchée près de la pointe.</p><p>Du bout de l’arme, il te fait signe d’approcher.</p>${fightHtml(s,'captain',CAPTAIN)}`,choices:s=>{const c=s.combats?.captain;if(s.hp<=0)return[{label:'Tu t’effondres',to:'death'}];if(c&&c.hp<=0)return[{label:'Fouiller le capitaine',to:'c16'}];return standardFightChoices(s,'captain',CAPTAIN,{label:'Tu t’effondres',to:'death'},{label:'Fouiller le capitaine',to:'c16'});}},
 c16:{title:'Les gantelets',text:`<p>Le capitaine pirate est étendu sur le pont, inanimé.</p><p>En te penchant sur lui, tu remarques les gantelets qu’il porte encore aux avant-bras. Ils sont faits d’un cuir épais, renforcé de petites plaques de métal rivetées à la main.</p><p>Le travail est artisanal. Rien d’élégant, mais l’ensemble est solide et étonnamment bien conçu. Les plaques couvrent les zones les plus exposées sans gêner les mouvements.</p><p><strong>Protection +4.</strong></p><p>Avant de regagner le Resolute, tu ordonnes à quelques hommes de fouiller la cale du navire pirate.</p><p>Ils reviennent quelques minutes plus tard avec un petit coffre, plusieurs sacs et trois tonneaux marqués au fer.</p><p>Le coffre contient environ <strong>100 pièces d’or</strong>, probablement accumulées au fil de plusieurs prises.</p><p>Les tonneaux sont remplis de <strong>rhum</strong>. Une cargaison facile à transporter et surtout très utile dans les Caraïbes : elle pourra être offerte, troquée ou servir de monnaie d’échange si la situation l’exige.</p><p><strong>Tu récupères 100 pièces d’or et 3 tonneaux de rhum.</strong></p><p>Avant de quitter la cabine du capitaine, tu trouves aussi un petit carnet de prises. Une entrée récente retient ton attention :</p><blockquote>« Marchand anglais — PROVIDENCE. Aperçu trois nuits plus tôt. Cap au sud-est. Aucun feu. Aucun signal. Plusieurs hommes visibles sur le pont. »</blockquote><p>Quelques lignes plus bas, l’écriture devient plus serrée.</p><blockquote>« Avons tenté de l’approcher. À moins d’un mille, la mer a changé. Pas de vent contraire. Pas de courant visible. Pourtant le bateau avançait comme dans de l’huile. L’eau semblait retenir la coque. »</blockquote><p>La dernière partie a été écrite d’une main beaucoup moins assurée.</p><blockquote>« Une ombre est passée sous nous. Immense. Elle a frappé la coque par dessous. Deux membrures fendues. Avons viré de bord. Le Providence, lui, n’a pas bougé. »</blockquote><p>Tu relis l’entrée.</p><p>Le Providence était encore à flot après sa disparition officielle. Il suivait volontairement un cap qui n’avait aucun sens.</p><p>Mais surtout, quelque chose semblait empêcher les autres navires de l’approcher.</p>`,choices:[{label:'Récupérer le butin et repartir',to:'c20',effect:s=>{if(!s.flags.gauntlets){s.flags.gauntlets=true;addProtectiveItem(s,'gantelets','Gantelets renforcés','Gantelets artisanaux de cuir épais renforcés de plaques métalliques. Protection +4.',4);}if(!s.flags.firstPirateLoot){s.flags.firstPirateLoot=true;addGold(s,100);addRumCrate(s,3);}}}]},
 c20:{title:'',text:`<p>Le Resolute atteint enfin la zone où le Providence aurait dû être aperçu pour la dernière fois.</p><p>Tu fais réduire la voilure et ordonnes une recherche méthodique.</p><p>Deux hommes montent dans la mâture avec des longues-vues. D’autres scrutent l’eau à la recherche d’un débris, d’un tonneau, d’une voile déchirée.</p><p>Une heure passe.</p><p>Puis une autre.</p><p>Enfin, un marin repêche une planche qui dérive parmi les algues.</p><p>Elle porte encore un fragment de peinture blanche et deux lettres noires : ...VI...</p><p>Sur l’autre face, une marque au fer est encore lisible : E. HARCOURT — PORT ROYAL.</p><p>Le bois provient presque certainement du Providence.</p><p>Tu fais appeler le navigateur. Il observe le courant, consulte la carte puis secoue la tête.</p><blockquote>« Si cette planche s’est détachée récemment, elle vient du sud ou du sud-est. Pas de la route que le Providence devait suivre pour rentrer. »</blockquote><p>Ce n’est plus une simple disparition.</p><p>Le Providence a quitté sa route.</p><p>Un des matelots qui tient la gaffe regarde la planche dériver derrière vous.</p><blockquote>« Mon grand-père disait toujours la même chose à propos de ces eaux : l’île mange les marins et recrache les bateaux. »</blockquote><p>Personne ne rit.</p><p>Reste à comprendre pourquoi le Providence a choisi de s’en approcher.</p>`,choices:[{label:'Reporter l’indice sur la carte',to:'search2'}]},

 search2:{title:'',text:`<p>Le lendemain matin, tu étales de nouveau les cartes sur une caisse du pont.</p><p>Vous avez parcouru la dernière route connue du Providence, vérifié les récifs, interrogé les rares navires rencontrés et observé les courants.</p><p>La recherche au hasard ne peut pas continuer indéfiniment.</p><p>Trois zones restent plausibles.</p><p>Au nord, les routes se rapprochent d’un secteur notoirement fréquenté par les pirates. Si le Providence a été attaqué, c’est probablement là que vous avez le plus de chances de retrouver une trace. Mais y entrer revient presque à provoquer ceux qui y chassent.</p><p>À l’est, les voies marchandes sont plus fréquentées. Le Providence a moins de raisons de s’y être écarté de sa route, mais les navires qui y circulent pourraient avoir vu quelque chose.</p><p>Au sud, les cartes montrent une zone peu empruntée. Plusieurs courants et régimes de vents s’y rencontrent. Les marins la disent imprévisible, parfois dangereuse, mais une avarie ou une dérive aurait pu entraîner le Providence dans cette direction.</p><p>Tu replies la carte.</p><p>Il faut choisir où chercher maintenant.</p>`,choices:[
   {label:'Mettre le cap au nord — les eaux des pirates',to:'north1'},
   {label:'Partir vers l’est — les routes marchandes',to:'east1'},
   {label:'Descendre vers le sud — les eaux instables',to:'south1'}
 ]},

 north1:{title:'',text:`<p>Le Resolute remonte vers le nord.</p><p>Le paysage change peu à peu. De petites îles basses apparaissent, séparées par des chenaux profonds. Certaines ne sont que des bandes de sable couvertes de végétation. D’autres portent les restes de cabanes abandonnées.</p><p>Vous passez près d’une épave ancienne échouée sur un récif. Il ne reste de la coque que quelques membrures noircies dressées hors de l’eau.</p><p>Personne n’a besoin de rappeler pourquoi cette zone est évitée par les marchands isolés.</p><p>Vers le milieu de l’après-midi, une voile apparaît derrière une île.</p><p>Le navire ne porte aucun pavillon.</p><p>Il conserve d’abord sa route.</p><p>Puis il vire.</p><p>Droit vers vous.</p><p>Quelques minutes plus tard, un pavillon noir monte lentement au mât.</p><p>Sur le pont du Resolute, tes soldats prennent leurs armes sans attendre ton ordre.</p>`,choices:[{label:'Préparer la défense',to:'north2',effect:s=>startCrewBattle(s,'piratesNorth',pirateCrewSize(s),4,1,0)}]},

 north2:{title:'',text:s=>`<p>Le bateau ennemi se rapproche rapidement du Resolute, jusqu’à ce que les grappins passent d’un pont à l’autre.</p><p>Les premiers pirates franchissent la rambarde dans un fracas de bois et de métal.</p><p>Cette fois, il n’y a plus de négociation possible.</p>
  <div class="dice-result">
    <p class="roll-number">Combat de groupe</p>
    <p>Chaque groupe possède une <strong>Valeur de combat</strong> liée à son équipement et à son entraînement. Tes soldats ont <strong>4</strong> : ils réussissent sur <strong>1, 2, 3 ou 4</strong>. Les pirates ont <strong>1</strong> : ils ne réussissent que sur <strong>1</strong>.</p>
    <p>Chaque combattant lance <strong>1D6</strong>. <strong>Chaque réussite élimine un adversaire.</strong> Les survivants rejouent jusqu’à l’élimination d’un groupe.</p>
  </div>
  ${crewBattleHtml(s,'piratesNorth',pirateCountForBattle(s,'piratesNorth'))}`,choices:s=>{const b=ensureCrewBattle(s,'piratesNorth',pirateCountForBattle(s,'piratesNorth'),4,1,0);if(s.soldiers<=0)return[{label:'Tes soldats sont anéantis',to:'death'}];if(b.enemy<=0)return[{label:'Passer sur le navire pirate',to:'north3'}];return[{label:b.round?'Assaut suivant':'Lancer les dés — premier assaut',stay:true,inlineCombat:true,effect:x=>crewBattleRound(x,'piratesNorth',pirateCountForBattle(x,'piratesNorth'))}];}},

 north3:{title:'',text:s=>`<p>Le dernier groupe de pirates rompt enfin sous la pression. Certains jettent leurs armes, d’autres disparaissent derrière les caisses et les cordages.</p><p>Tu franchis la rambarde et poses le pied sur leur pont.</p><p>La bataille n’est pourtant pas terminée.</p><p>Un homme t’attend près du grand mât.</p><p>Il est plus grand que la plupart de ses hommes et porte un manteau de cuir sombre renforcé aux épaules. Son crâne est rasé sur les côtés, mais une longue tresse noire retombe dans son dos. Une ancienne brûlure lui couvre une partie du cou et remonte jusqu’à la mâchoire.</p><p>À ses pieds, un de ses propres hommes essaie de ramper hors de la mêlée.</p><p>Le capitaine le repousse brutalement du talon sans même baisser les yeux.</p><p>Puis il te regarde.</p><p>Il ne crie pas. Il ne menace pas.</p><p>Il sort simplement un lourd sabre d’abordage, fait rouler son épaule comme s’il s’échauffait, puis avance vers toi.</p><p>Son calme est plus inquiétant que les hurlements de tout son équipage.</p>${fightHtml(s,'northCaptain',NORTH_CAPTAIN)}`,choices:s=>{const c=s.combats?.northCaptain;if(s.hp<=0)return[{label:'Tu t’effondres',to:'death'}];if(c&&c.hp<=0)return[{label:'Fouiller le navire pirate',to:'north4'}];return standardFightChoices(s,'northCaptain',NORTH_CAPTAIN,{label:'Tu t’effondres',to:'death'},{label:'Fouiller le navire pirate',to:'north4'});}},

 north4:{title:'',text:s=>`<p>Une fois le capitaine à terre, les derniers pirates cessent de résister.</p><p>Tu fais fouiller rapidement leur navire avant de reprendre la recherche du Providence.</p><p>Dans une caisse dissimulée sous des toiles, tes hommes trouvent une petite bourse contenant <strong>dix pièces d’or</strong>.</p><p>À côté, cinq lames courtes ont été rangées dans un étui de cuir. Leur poids est parfaitement équilibré.</p><p><strong>Tu récupères 5 lames de lancer.</strong></p><p>Dans la cabine, sous un registre de prises, tu trouves une note datée de trois jours plus tôt :</p><blockquote>« Gros marchand anglais aperçu au sud. Aucun pavillon de détresse. Des hommes à la rambarde, raides comme des pendus. Cap sur l’île maudite. Celle qu’on contourne même quand le vent nous y pousse. Le capitaine a ordonné de virer. »</blockquote><p>Une seconde ligne a été ajoutée :</p><blockquote>« Trois lueurs bleues étaient visibles au loin, toujours au même endroit. Le marchand a corrigé son cap dans leur direction. »</blockquote><p>Dans la marge, quelqu’un a ajouté au charbon : PROVIDENCE ?</p><p>Tu comprends mieux leur prudence. Ce n’est pas le Providence qui les a effrayés, mais l’endroit vers lequel il se dirigeait.</p><p>Plus loin dans la cale, un petit tonnelet de rhum porte encore le sceau d’un négociant de Port Royal.</p><p>Il pourrait être bu, offert ou servir de marchandise si vous deviez négocier plus tard.</p>`,onEnter:s=>{if(!s.flags.northPirateLoot){s.flags.northPirateLoot=true;addGold(s,10);addThrowingBlades(s,5);}},choices:[
   {label:'Emporter le tonnelet de rhum',to:'c21',effect:s=>{if(!s.flags.northRum){s.flags.northRum=true;addRumCrate(s,1);}}},
   {label:'Laisser le rhum et repartir',to:'c21'}
 ]},

 east1:{title:'',text:`<p>Tu choisis la route de l’est.</p><p>Sur la carte, plusieurs voies marchandes se croisent dans cette direction. Tu t’attends à rencontrer des caboteurs, des navires chargés de sucre, peut-être un navire venant de Cuba ou des petites Antilles.</p><p>Mais les heures passent.</p><p>La mer reste étonnamment vide.</p><p>À midi, aucune voile.</p><p>Dans l’après-midi, toujours rien.</p><p>Cette absence finit par devenir plus étrange qu’une rencontre.</p><p>Le soleil touche presque l’horizon lorsqu’un petit sloop apparaît enfin au loin.</p><p>Il porte un pavillon marchand et avance lentement sous une voilure réduite.</p><p>Lorsque vous approchez, plusieurs hommes viennent à la rambarde.</p><p>Ils vous saluent avec de grands gestes.</p><p>Trop grands, peut-être.</p><p>Leur capitaine sourit avant même que les deux navires soient assez proches pour parler.</p><blockquote>« Royal Navy ! Voilà une compagnie qui se fait rare par ici. Venez donc boire un verre. Nous avons sûrement quelques histoires à échanger. »</blockquote>`,choices:[
   {label:'Accepter et monter à bord',to:'east2'},
   {label:'Refuser et rester sur le Resolute',to:'eastRefuse'}
 ]},

 east2:{title:'',text:`<p>Une planche est posée entre les deux navires et tu passes sur le petit sloop marchand.</p><p>L’accueil est presque excessivement chaleureux.</p><p>On t’installe près de la dunette. Un homme apporte une bouteille. Il est massif et trapu, les manches à moitié retroussées. Parmi plusieurs marques piquées à l’encre sur ses avant-bras, tu remarques un cercle parfaitement fermé, d’un noir profond.</p><p>Un autre homme apporte des gobelets. Tous semblent ravis de parler, mais aucun ne pose de question précise sur ta mission.</p><p>Lorsque tu mentionnes le Providence, le capitaine secoue immédiatement la tête.</p><blockquote>« Jamais entendu parler. »</blockquote><p>Il sourit encore.</p><blockquote>« Mais des navires qui disparaissent ici ? Ça, lieutenant, c’est monnaie courante. Les pirates en prennent certains. Les tempêtes en prennent d’autres. »</blockquote><p>Un marin derrière lui ricane.</p><blockquote>« Et la Bête aux Mille Bras prend ceux dont on ne retrouve même pas les planches. »</blockquote><p>Le rire s’arrête presque aussitôt.</p><p>Tu demandes ce qu’il veut dire.</p><p>Le capitaine hausse les épaules.</p><blockquote>« Des histoires pour enfants. Chaque port a les siennes. »</blockquote><p>Tu insistes, mais les hommes deviennent soudain beaucoup moins bavards.</p><p>Le capitaine remplit un gobelet et le pousse vers toi.</p><blockquote>« À votre mission. Vous en aurez besoin. »</blockquote>`,choices:[
   {label:'Boire avec eux',to:'east3',effect:s=>s.flags.eastDrank=true},
   {label:'Refuser poliment le verre',to:'east3',effect:s=>s.flags.eastDrank=false}
 ],onEnter:s=>{s.flags.blackCircleMerchant=true;}},

 east3:{title:'',text:s=>`<p>${s.flags.eastDrank?'Le rhum est fort, légèrement amer. Le capitaine lève son propre verre et boit avec toi.':'Tu repousses doucement le gobelet. Le capitaine te regarde une seconde de trop, puis retrouve son sourire.'}</p><p>La conversation reprend.</p><p>Ils parlent des ports où l’on paie mal, des tempêtes qui arrachent les voiles en quelques minutes, des équipages qui désertent dès qu’un meilleur salaire apparaît à quai.</p><p>Rien qui puisse réellement t’aider.</p><p>Avant votre départ, le capitaine fait rouler un petit tonnelet jusqu’au bord du pont.</p><blockquote>« Prenez-le. Un peu de courage liquide pour votre recherche. Cadeau de marins à marins. »</blockquote><p>Le tonnelet pourrait aussi servir de marchandise ou de présent si tu devais négocier plus tard.</p>`,choices:[
   {label:'Accepter le tonnelet de rhum',to:'east4',effect:s=>{s.flags.eastRum=true;addRumCrate(s,1);}},
   {label:'Refuser le tonnelet',to:'east4'}
 ]},

 eastRefuse:{title:'',text:`<p>Tu remercies le capitaine mais préfères rester à bord du Resolute.</p><p>Les deux navires restent bord à bord quelques minutes.</p><p>De son pont, il jure n’avoir jamais croisé le Providence.</p><p>Il ajoute cependant que des navires disparaissent régulièrement dans ces eaux.</p><blockquote>« Pirates, récifs, tempêtes... choisissez votre histoire. »</blockquote><p>Un de ses hommes lance depuis l’arrière :</p><blockquote>« Ou la Bête aux Mille Bras. »</blockquote><p>Quelques rires suivent, mais ils sonnent faux.</p><p>Lorsque tu demandes des précisions, personne ne répond vraiment.</p><p>Avant de s’éloigner, le capitaine propose de faire passer un petit tonnelet de rhum sur votre pont.</p><blockquote>« Pour vous porter chance. »</blockquote>`,choices:[
   {label:'Accepter le tonnelet',to:'east4',effect:s=>{s.flags.eastRum=true;addRumCrate(s,1);}},
   {label:'Refuser et reprendre la route',to:'east4'}
 ]},

 east4:{title:'',text:s=>`<p>La nuit tombe quelques heures après votre séparation.</p><p>Le Resolute poursuit lentement sa recherche sous un ciel sans lune.</p>${s.flags.eastDrank?`<p>Tu t’endors plus vite que d’habitude.</p><p>Lorsque tu ouvres enfin les yeux, tu ne comprends pas immédiatement ce qui t’a réveillé.</p><p>Des pas.</p><p>Des cris étouffés.</p><p>Ton corps paraît lourd et ta bouche est sèche.</p><p>Tu essaies de te lever. Tes jambes répondent avec un temps de retard.</p><p>Le verre.</p><p>Ils avaient mis quelque chose dedans.</p><p>Lorsque tu atteins le pont, un de tes soldats est déjà étendu près du grand mât.</p><p><strong>Vous avez perdu 1 soldat.</strong></p>`:`<p>Un choc contre la coque te réveille immédiatement.</p><p>Puis le bruit caractéristique d’un grappin qui accroche la rambarde.</p><p>Tu es debout avant même que la première alarme ne soit criée.</p><p>Le petit sloop marchand est revenu dans l’obscurité.</p><p>Ses hommes franchissent déjà le bord.</p>`}<p>Les sourires ont disparu.</p><p>Ce ne sont pas des marchands.</p><p>Autour de toi, tes marins et tes soldats se jettent sur les assaillants.</p><p>Le combat se répand sur le pont.</p>`,onEnter:s=>{if(s.flags.eastDrank&&!s.flags.eastDrugLoss){s.flags.eastDrugLoss=true;s.soldiers=Math.max(0,s.soldiers-1);}},choices:[{label:'Foncer défendre le pont',to:'east5'}]},

 east5:{title:'',text:s=>`<p>Ton équipage prend rapidement le dessus sur les hommes qui ont franchi la rambarde.</p><p>Au milieu du désordre, le faux capitaine te repère.</p><p>Il n’a plus rien du marchand affable rencontré quelques heures plus tôt.</p><p>Son sourire a disparu. Il tient une courte lame dans une main et un sabre dans l’autre.</p><blockquote>« J’aurais préféré que vous dormiez jusqu’au matin. »</blockquote><p>Il se débarrasse de la petite lame, serre son sabre à deux mains et se dirige vers toi pendant que ses hommes sont repoussés vers la rambarde.</p>${fightHtml(s,'eastBanditChief',BANDIT_CHIEF)}`,choices:s=>{const c=s.combats?.eastBanditChief;if(s.hp<=0)return[{label:'Tu t’effondres',to:'death'}];if(c&&c.hp<=0)return[{label:'Reprendre le contrôle du Resolute',to:'east6'}];return standardFightChoices(s,'eastBanditChief',BANDIT_CHIEF,{label:'Tu t’effondres',to:'death'},{label:'Reprendre le contrôle du Resolute',to:'east6'});}},

 east6:{title:'',text:`<p>Lorsque leur chef tombe, la résistance cesse presque immédiatement.</p><p>Les derniers assaillants encore debout jettent leurs armes ou regagnent leur navire avant que tes hommes ne coupent les grappins.</p><p>Le petit sloop s’éloigne dans la nuit avec ce qu’il reste de son équipage.</p><p>Quelques minutes plus tard, il n’est plus qu’une silhouette noire derrière vous.</p><p>Tu regardes la mer vide.</p><p>Un des assaillants capturés, le visage en sang, finit par parler lorsqu’on lui demande pourquoi son équipage connaît si bien cette zone.</p><blockquote>« On a vu votre marchand. Le Providence. Deux nuits avant vous. Il passait sans lanternes. »</blockquote><p>Tu lui demandes pourquoi ils ne l’ont pas attaqué.</p><p>L’homme détourne les yeux.</p><blockquote>« Parce qu’il y avait des lumières vertes sous sa coque. Deux. Comme des yeux. »</blockquote><p>Tu lui demandes où allait le Providence.</p><blockquote>« Vers une lumière bleue, au loin. Elle apparaissait, disparaissait, puis revenait plus loin. Comme si quelqu’un lui montrait la route. »</blockquote><p>Il refuse d’en dire davantage.</p><p>Vous n’avez toujours pas retrouvé le Providence, mais un second élément revient désormais avec insistance : quelque chose se déplace sous les navires.</p><p>Les paroles entendues plus tôt prennent un autre poids.</p><p><em>La Bête aux Mille Bras.</em></p><p>Tu ordonnes de reprendre les recherches dès que le pont est sécurisé.</p>`,choices:[{label:'Poursuivre la recherche du Providence',to:'c21'}]},

 south1:{title:'',text:`<p>Le Resolute met le cap au sud.</p><p>Les premières heures sont calmes.</p><p>Puis le vent change.</p><p>Une première fois, brutalement, avant de retomber presque aussitôt. Une heure plus tard, il revient d’une autre direction. Les voiles claquent, se gonflent, puis pendent sans force.</p><p>La mer elle-même semble hésiter entre plusieurs courants.</p><p>À plusieurs reprises, le sloop dérive légèrement malgré les corrections du timonier.</p><p>En fin d’après-midi, un marin appelle depuis l’avant.</p><p>Une zone sombre avance sous la surface.</p><p>Au début, tu crois à un banc de poissons.</p><p>Puis tu comprends que l’ombre est d’un seul bloc.</p><p>Elle est immense.</p><p>Bien plus longue que le Resolute.</p><p>La masse passe sous la coque.</p><p>Le navire se soulève légèrement.</p><p>Un tonneau roule sur le pont. Plusieurs hommes s’agrippent à ce qu’ils trouvent.</p><p>Pendant une seconde, tu as la sensation absurde que quelque chose, sous vos pieds, pourrait retourner le sloop d’un seul mouvement.</p><p>Puis l’ombre plonge.</p><p>L’eau se referme au-dessus d’elle.</p><p>Personne ne parle pendant un long moment.</p>`,choices:[{label:'Continuer vers le sud',to:'south2'}]},

 south2:{title:'',text:s=>`<p>Le jour baisse lorsqu’une petite voile apparaît enfin.</p><p>Il s’agit d’un navire marchand qui remonte vers le nord.</p><p>Son capitaine accepte de réduire sa voilure pour parler avec vous, mais avant même que tu ne l’interroges sur le Providence, il te pose une question.</p><blockquote>« Vous l’avez vue ? »</blockquote><p>Tu n’as pas besoin de demander de quoi il parle.</p><p>Ses hommes aussi sont nerveux. L’un d’eux ne cesse de regarder derrière leur navire.</p><p>Ils ont aperçu la même masse sous l’eau quelques heures plus tôt.</p><p>Le capitaine secoue la tête.</p><blockquote>« Mon grand-père racontait des histoires comme celle-là quand j’étais enfant. Une chose assez grande pour passer sous un navire sans qu’on voie où elle commence ni où elle finit. Je pensais qu’il racontait ça pour nous empêcher de partir en mer. »</blockquote><p>Il jette un regard vers le sud.</p><blockquote>« Nous, nous rentrons au port. »</blockquote><p>Lorsque tu lui expliques la disparition du Providence et ta mission, son expression change.</p><blockquote>« Providence... Attendez. Nous avons croisé un marchand anglais il y a deux jours. Même taille. Il filait vers le sud-est sous très peu de toile. Nous avons envoyé un signal. Personne n’a répondu. »</blockquote><p>Un de ses marins intervient derrière lui.</p><blockquote>« J’ai vu des hommes sur le pont. Ils étaient là. Ils nous regardaient. Mais aucun n’a bougé. »</blockquote><p>Le capitaine se tait un instant, puis regarde la mer.</p><blockquote>« Et cette chose était dans les parages. »</blockquote><p>Avant de repartir, il fait apporter un large brassard de cuir épais renforcé de fines plaques métalliques rivetées.</p><blockquote>« Prenez ça. Si ce que vous cherchez est encore vivant, autant garder un bras entier. »</blockquote><p><strong>Brassard d’avant-bras renforcé — Protection +3.</strong></p><p>Il vous offre également un petit tonnelet de rhum.</p><blockquote>« Pour les hommes. Ou pour négocier avec quelqu’un de moins généreux que nous. »</blockquote><p>Puis les deux navires se séparent.</p><p>Le marchand repart vers le nord.</p><p>Le Resolute reste seul sur cette mer devenue beaucoup trop silencieuse.</p>`,onEnter:s=>{if(!s.flags.southGifts){s.flags.southGifts=true;grantSouthProtection(s);addRumCrate(s,1);}},choices:[{label:'Reprendre la recherche',to:'c21'}]},


 c21:{title:'',text:`<p>Une heure passe. Puis une autre.</p><p>Peu à peu, le vent tombe et les voiles du Resolute se détendent. Autour de vous, la mer devient étrangement lisse.</p><p>Un marin appelle depuis l’avant.</p><p>Très loin, deux mâts se découpent sur l’horizon.</p><p>Tu prends la longue-vue.</p><p>Une coque sombre dérive dans le calme. Les voiles pendent sans force.</p><p>Le pont est vide.</p><p>Aucun mouvement.</p><p>Puis tu distingues enfin le nom peint à l’arrière.</p><p>PROVIDENCE.</p><p>Tu abaisses lentement la longue-vue.</p><p>Le navire que vous cherchez depuis le départ est là.</p><p>Entier.</p><p>À première vue, il ne semble même pas avoir subi de tempête.</p><p>Mais lorsque vous vous rapprochez encore, tu remarques les marques sur sa coque.</p><p>De longues traces sombres courent sur le bois.</p><p>Certaines commencent sous la ligne de flottaison et remontent presque jusqu’au pont.</p><p>Elles sont trop larges pour avoir été faites par des cordages.</p><p>Trop régulières pour ressembler à des chocs contre des récifs.</p><p>Elles donnent plutôt l’impression que quelque chose a entouré le navire.</p><p>Et serré.</p><p>Le Providence dérive dans un silence absolu.</p>`,choices:[{label:'Faire accoster le Resolute',to:'c27'}]},

c22:{title:'L’entrepont',text:`<p>Tu descends sous le pont avec une lampe.</p><p>Les hamacs sont encore suspendus. Des coffres personnels restent ouverts au pied des couchettes. Quelques chemises, des bottes et des effets sans valeur ont été abandonnés.</p><p>Mais quelque chose manque.</p><p>Tu ne trouves presque aucun équipement de marin.</p><p>Pas de sabres d’abordage. Presque aucun mousquet. Les ceinturons, couteaux et pièces de protection ont disparu avec leurs propriétaires.</p><p>Dans un petit coffre coincé sous une couchette, tu découvres un carnet couvert d’une écriture serrée.</p><p>Les dernières lignes ont été écrites à la hâte.</p><blockquote>« Depuis que le capitaine a trouvé cette carte, je ne reconnais plus les autres. Ils ne parlent que de la suivre. Des récifs, des pirates, des courants... plus rien ne semble les inquiéter. »</blockquote><blockquote>« J’ai toujours su que l’espoir de richesse pouvait rendre un homme fou, mais pas tout un équipage. Même ceux qui ont vu cette masse sombre sous l’eau refusent de changer de cap. »</blockquote><blockquote>« Si nous continuons ainsi, je doute que beaucoup d’entre nous revoient Port Royal. Les pirates nous prendront avant, ou cette chose dans les profondeurs nous enverra au fond. »</blockquote><p>Il n’y a rien après.</p>`,choices:[{label:'Remonter et aller dans la cabine du capitaine',to:'c29'}]},

c27:{title:'',text:'<p>Le Resolute avance lentement jusqu’au Providence.</p><p>Les marins utilisent les gaffes et les cordages pour maintenir les deux coques à distance.</p><p>Tu passes le premier sur le pont du Providence.</p><p>Derrière toi, plusieurs hommes te suivent pendant que le reste de l’équipage demeure à bord du Resolute.</p><p>À peine as-tu posé le pied sur les planches que quelque chose te trouble.</p><p>Le silence.</p><p>Un navire de cette taille ne devrait jamais être aussi silencieux.</p><p>Même à l’ancre, il devrait y avoir des pas, des ordres, des cordes qu’on tire, des hommes qui toussent ou jurent.</p><p>Ici, il n’y a rien.</p>',choices:[{label:'Explorer le navire',to:'c28'}]},

c28:{title:'',text:`<p>Tu avances lentement sur le pont.</p><p>Une chope repose près du grand mât.</p><p>Un morceau de pain durci est encore posé sur une caisse.</p><p>Une corde a été abandonnée au milieu d’un nœud.</p><p>Tout donne l’impression que les hommes travaillaient encore quelques instants avant de disparaître.</p><p>Mais quelque chose s’est aussi produit ici.</p><p>Une table est brisée.</p><p>Une chaise a été projetée contre la rambarde.</p><p>Plusieurs entailles profondes marquent le bois, comme des coups de sabre.</p><p>Près d’une écoutille, une tache brunâtre a séché entre les planches.</p><p>Tu préfères ne pas te demander ce que c’est.</p><p>Pourtant, il n’y a aucun corps.</p><p>Pas un seul.</p><p>À l’arrière, tu examines les bossoirs. Une des embarcations du Providence manque.</p><p>Les cordages n’ont pas été tranchés. Ils ont été détachés proprement puis lovés contre le bois.</p><p>Quelqu’un a donc mis une chaloupe à l’eau de manière organisée.</p><p>Puis un autre détail te trouble.</p><p>La barre est maintenue presque au centre par une aussière courte. Une voile a été laissée sous une toile réduite, juste assez pour que le navire conserve une lente erre. L’ancre n’est plus à poste.</p><p>Ce n’est pas ainsi qu’un équipage quitte précipitamment son navire.</p><p>Comme si quelqu’un était revenu à bord après le départ des hommes et avait volontairement remis le Providence à la mer.</p><p>La cabine du capitaine du Providence se trouve à l’arrière. Sa porte est entrouverte.</p><p>Une écoutille permet également de descendre dans l’entrepont.</p>`,choices:[{label:'Descendre dans l’entrepont',to:'c22'},{label:'Entrer dans la cabine du capitaine',to:'c29'}]},

c29:{title:'La cabine du capitaine',text:s=>`<p>La cabine est dans un état étrange.</p><p>Une bouteille renversée a séché contre le bois. Une chaise est couchée sur le côté. Des feuilles ont été arrachées puis clouées aux murs.</p><p>Au milieu de ce désordre, un détail détonne.</p><p>Une carte est parfaitement dépliée au centre du bureau.</p><p>À côté, posée bien en évidence, se trouve une pierre taillée d’un bleu profond.</p><p>Pas dans un coffre. Pas cachée dans un tiroir.</p><p>Comme si quelqu’un avait voulu être certain que le prochain homme entrant dans cette cabine la remarque.</p><p>Tu prends la pierre et examines la carte.</p><p>Une île y est entourée trois fois. Devant une petite crique, trois marques bleues ont été tracées sur la mer.</p><p>Sur les murs, plusieurs dessins reprennent les mêmes éléments : une masse gigantesque sous un navire, des tentacules, deux yeux verts, puis des pierres bleues accumulées au centre d’une île.</p><p>Tu regardes de nouveau le bureau.</p><p>Le reste de la cabine raconte une fuite. La carte et la pierre, elles, ressemblent à une mise en scène.</p>`,onEnter:s=>{if(!s.flags.baitStone){s.flags.baitStone=true;addBlueDiamond(s);}},choices:[{label:'Lire le journal du capitaine',to:'c30'}]},

c30:{title:'Le journal du Providence',text:`<p>Dans un tiroir du bureau, tu retrouves le journal du capitaine.</p><p>Les premières pages décrivent une traversée parfaitement normale.</p><p>Puis une entrée change tout.</p><blockquote>« 3 juin. Navire aperçu à la dérive. Aucun pavillon. Aucun homme visible sur le pont. »</blockquote><p>Le Providence s’était approché de ce navire abandonné et avait envoyé quelques hommes à bord.</p><p>Ils n’y avaient trouvé aucun corps, aucune trace de combat et une chaloupe manquante.</p><p>Mais dans la cabine du capitaine, ils avaient découvert une carte dépliée et une pierre bleue posée juste à côté.</p><p>Exactement ce que tu viens de trouver ici.</p><p>Une annotation figurait sur la carte :</p><blockquote>« Suivre les trois lumières. »</blockquote><p>Le capitaine du Providence avait changé de cap.</p><p>Deux jours plus tard :</p><blockquote>« Au sud-est, trois lueurs bleues sont visibles près de la côte. Elles restent fixes. Nous mettons le cap sur elles. »</blockquote><p>Puis :</p><blockquote>« Terre en vue. Petite île au sud-est. Nous irons reconnaître la crique demain. »</blockquote><p>Les dernières pages deviennent confuses. Elles parlent d’hommes très pâles aperçus sur la côte depuis le large, d’une immense ombre sous l’eau et d’un navire pirate qui aurait tenté d’approcher avant de fuir.</p><blockquote>« La chose ne nous attaque pas. Elle semble tenir les autres à distance. »</blockquote><p>Le journal s’interrompt peu après.</p><p>Tu poses la pierre bleue sur la carte.</p><p>Le Providence a trouvé un navire vide, une pierre et une carte. Il les a suivis.</p><p>Tu viens de trouver un navire vide, une pierre et une carte.</p><p>Sur ta propre carte marine, une seconde île se trouve à moins d’une demi-journée de navigation. Un vieux village de pêcheurs y est installé depuis plusieurs générations. Ses habitants connaissent les récifs et les îlots de cette région mieux que n’importe quel navigateur de passage.</p><p>Tu peux suivre immédiatement les trois lumières et aller droit vers l’île indiquée.</p><p>Ou perdre quelques heures pour interroger d’abord ceux qui vivent ici depuis toujours.</p>`,choices:[{label:'Suivre les trois lumières et aborder l’île',to:'directIsland'},{label:'Aller d’abord au village des anciens pêcheurs',to:'c31'}]},

directIsland:{title:'L’île aux pierres bleues',text:`<p>Tu décides de ne pas perdre davantage de temps.</p><p>Le Resolute met le cap sur l’île indiquée par la carte. En approchant de la côte, tu distingues trois lueurs bleues disposées autour d’une petite crique.</p><p>Un. Deux. Trois.</p><p>Elles restent fixes, exactement comme les trois marques portées sur la carte du Providence.</p><p>La crique est calme. Aucun canon. Aucun homme sur la plage. Aucun signe de danger.</p><p>Vous mettez les chaloupes à l’eau.</p><p>Tu es parmi les premiers à débarquer.</p><p>À peine ta botte touche-t-elle le sable qu’un claquement sec éclate dans les arbres.</p><p>Tout se déclenche à la fois.</p><p>Des filets lestés tombent depuis les branches. Des cordes se referment autour des jambes. Un tronc hérissé de pointes traverse le passage derrière vous et coupe toute retraite.</p><p>Puis les hommes pâles surgissent.</p><p>Des dizaines.</p><p>Ils sortent des rochers, des fourrés, de derrière les arbres. Beaucoup portent encore des vêtements de marins.</p><p>Tu tires ton sabre, mais une masse s’abat sur ton poignet.</p><p>Ton arme tombe dans le sable.</p><p>Tu aperçois une dernière fois les trois lueurs bleues au bord de l’eau.</p><p>Puis une lourde pièce de bois s’abat vers ton crâne.</p><p>Tout devient noir.</p><div class="ending">FIN DE L’AVENTURE</div>`,choices:[{label:'Recommencer',action:'restart'}]},

c31:{title:'Une voile sans pavillon',text:`<p>Le Resolute reprend la mer en remorquant le Providence.</p><p>Vous ne mettez pas le cap sur l’île aux trois lumières. Pas encore.</p><p>Votre destination est la petite île habitée indiquée sur les cartes, quelques milles plus au nord. Si ses habitants vivent ici depuis aussi longtemps qu’on le raconte, ils sauront peut-être ce que signifie cette pierre bleue.</p><p>À mi-chemin, une voile apparaît au loin.</p><p>Aucun pavillon ne se distingue.</p><p>Le navire conserve d’abord sa route, puis vire lentement vers vous.</p><p>Des marchands perdus sont encore possibles. Des pirates le sont davantage.</p><p>Le contourner vous fera perdre plusieurs heures.</p>`,choices:[{label:'Contourner le navire',to:'c34',effect:s=>s.flags.islandDelay=true},{label:'Maintenir le cap',to:'pirateApproach'}]},

pirateApproach:{title:'Droit sur les pirates',text:s=>`<p>Tu ordonnes de maintenir le cap.</p><p>La distance se réduit rapidement.</p><p>Cette fois, il n’y a plus de doute : des hommes montent sur le pont adverse, sabres et mousquets à la main. Des grappins sont déjà posés près de la rambarde.</p><p>Ils se préparent à vous prendre à l’abordage.</p><p>Le temps vous est compté. Tes hommes aussi.</p>${rumCrateCount(s)>0||s.goldCoins>=100?'<p>Vous transportez cependant de quoi tenter une négociation. Tu pourrais faire croire à une reddition, approcher sous pavillon blanc et acheter votre passage.</p>':''}<p>Ou donner immédiatement l’ordre de combattre.</p>`,choices:s=>{const out=[];if(rumCrateCount(s)>0||s.goldCoins>=100)out.push({label:'Tenter une approche douce et négocier',to:'pirateParley'});out.push({label:'Un soldat ne se rend jamais — lancer l’assaut',to:'c32',effect:x=>startCrewBattle(x,'pirates2',pirateCrewSize(x),4,1,0)});return out;}},

pirateParley:{title:'Sous pavillon blanc',text:s=>`<p>Tu fais réduire la voilure et hisser un morceau de toile blanche bien visible au-dessus du pont.</p><p>Les pirates ne tirent pas.</p><p>Le Resolute avance lentement jusqu’à ce que les deux navires soient assez proches pour s’entendre sans crier.</p><p>Sur l’autre pont, plusieurs hommes rient déjà. Leur capitaine s’appuie sur la rambarde et attend.</p><blockquote>« Alors, lieutenant ? Qu’est-ce que la Couronne nous offre pour qu’on vous laisse continuer votre promenade ? »</blockquote><p>Tu fais rapidement l’inventaire de ce que vous pouvez céder sans compromettre la mission.</p>`,choices:s=>{const r=rumCrateCount(s),g=Math.max(0,Math.floor(Number(s.goldCoins)||0)),out=[];
  if(r>=1)out.push({label:'Proposer 1 tonneau de rhum',to:'pirateOfferRejected',effect:x=>{x.flags.pirateOffer='1 tonneau de rhum';}});
  if(r>=2)out.push({label:'Proposer 2 tonneaux de rhum',to:'pirateDealAccepted',effect:x=>{spendRumCrates(x,2);x.flags.pirateOffer='2 tonneaux de rhum';x.flags.piratesBribed=true;}});
  if(r>=1&&g>=100)out.push({label:'Proposer 1 tonneau de rhum et 100 pièces d’or',to:'pirateDealAccepted',effect:x=>{spendRumCrates(x,1);spendGold(x,100);x.flags.pirateOffer='1 tonneau de rhum et 100 pièces d’or';x.flags.piratesBribed=true;}});
  if(r>=2&&g>=100)out.push({label:'Proposer 2 tonneaux de rhum et 100 pièces d’or',to:'pirateDealAccepted',effect:x=>{spendRumCrates(x,2);spendGold(x,100);x.flags.pirateOffer='2 tonneaux de rhum et 100 pièces d’or';x.flags.piratesBribed=true;}});
  if(r===0&&g>=100)out.push({label:'Proposer 100 pièces d’or',to:'pirateDealAccepted',effect:x=>{spendGold(x,100);x.flags.pirateOffer='100 pièces d’or';x.flags.piratesBribed=true;}});
  return out;}},

pirateOfferRejected:{title:'Pas assez',text:s=>`<p>Un de tes hommes fait rouler le tonneau jusqu’au bord du pont.</p><p>Le capitaine pirate le regarde, puis éclate de rire.</p><blockquote>« Un seul tonneau ? Pour tout mon équipage ? »</blockquote><p>Les rires se répandent sur son pont.</p><p>Le capitaine se redresse et fait un signe de la main.</p><p>Les mousquets se lèvent. Les grappins passent par-dessus la rambarde.</p><blockquote>« Un tonneau ? On prendra le reste avec le navire. »</blockquote><p>La négociation est terminée.</p>`,choices:[{label:'Se préparer à l’abordage',to:'c32',effect:s=>startCrewBattle(s,'pirates2',pirateCrewSize(s),4,1,0)}]},

pirateDealAccepted:{title:'Marché conclu',text:s=>`<p>Le capitaine pirate observe l’offre sans sourire.</p><p>Cette fois, personne ne rit.</p><p>Après quelques secondes, il lève la main.</p><blockquote>« Faites passer ça. Ensuite vous continuez votre route… et nous n’avons jamais vu votre pavillon. »</blockquote><p>La marchandise change de bord.</p><p>Les pirates récupèrent leurs grappins et leur navire s’écarte lentement du Resolute.</p><p>Vous avez acheté votre passage sans perdre de temps — ni d’hommes.</p>`,choices:[{label:'Reprendre la route vers l’île des pêcheurs',to:'c34'}]},

c32:{title:'Une seconde attaque',text:s=>`<p>Les pirates passent à l’attaque.</p>${crewBattleHtml(s,'pirates2',pirateCountForBattle(s,'pirates2'))}`,choices:s=>{const b=ensureCrewBattle(s,'pirates2',pirateCountForBattle(s,'pirates2'),4,1,0);if(s.soldiers<=0)return[{label:'Tes hommes sont anéantis',to:'death'}];if(b.enemy<=0)return[{label:'Reprendre la route',to:'c34'}];return[{label:b.round?'Assaut suivant':'Lancer les dés — premier assaut',stay:true,inlineCombat:true,effect:x=>crewBattleRound(x,'pirates2',pirateCountForBattle(x,'pirates2'))}];}},

c34:{title:'L’île du village',text:s=>`<p>La petite île apparaît enfin devant vous.</p><p>D’après les cartes, un village occupe cette côte depuis plusieurs générations. Tu t’attends à voir de la fumée, des barques de pêche, peut-être quelqu’un venir observer les deux navires qui approchent.</p><p>Tu ne vois rien.</p><p>Quelques toits dépassent pourtant des arbres, plus haut dans les terres.</p><p>Le Resolute mouille à faible distance de la côte, le Providence toujours remorqué derrière lui.</p><p>Il te reste <strong>${s.soldiers}</strong> soldats de la garnison disponibles pour descendre à terre. La majorité des marins du Resolute reste à bord : ils sont suffisamment nombreux pour manœuvrer le navire, surveiller le Providence et assurer la garde.</p><p>Briggs et Hale restent eux aussi à bord. Tu peux donc partir seul ou emmener jusqu’à trois soldats avec toi sans laisser les navires sans équipage. Avant de partir, tu devras simplement décider lequel des deux officiers en prendra le commandement pendant ton absence.</p>`,choices:s=>[0,1,2,3].filter(n=>n<=Math.max(0,s.soldiers)).map(n=>({label:n===0?'Descendre seul':`Emmener ${n} soldat${n>1?'s':''}`,to:'c35',effect:x=>{x.expeditionSoldiers=n;x.shipSoldiers=x.soldiers-n;}}))},

c35:{title:'À qui confier le commandement ?',text:`<p>Avant de quitter la plage, tu jettes un dernier regard vers le Resolute et le Providence.</p><p>William Briggs est bourru, courageux et efficace. S’il faut sauver l’équipage, il prendra la décision sans hésiter, même si cela signifie repartir sans toi.</p><p>Nathaniel Hale est plus réfléchi et profondément loyal. Il hésitera davantage, mais tu sais qu’il aura du mal à t’abandonner.</p><p>Même sur une île supposée habitée, quelqu’un doit rester maître à bord.</p>`,choices:[{label:'Choisir William Briggs',to:'c36',effect:s=>s.flags.commander='briggs'},{label:'Choisir Nathaniel Hale',to:'c36',effect:s=>s.flags.commander='hale'}]},

c36:{title:'Le ravin',text:`<p>Vous tirez la chaloupe sur le sable et suivez un ancien sentier qui s’enfonce sous les arbres.</p><p>La forêt devient rapidement dense. Les racines soulèvent la terre et les branches se referment derrière vous.</p><p>Après une vingtaine de minutes, le chemin s’interrompt devant un ravin étroit mais profond.</p><p>Un vieux pont de corde relie les deux versants. Plusieurs planches manquent et les cordes sont blanchies par le sel et l’humidité.</p><p>De l’autre côté, quelque chose bouge au pied d’un arbre.</p><p>Tu plisses les yeux.</p><p>Un homme est affaissé contre le tronc.</p><p>Il semble encore vivant.</p><p>Trois passages sont possibles : traverser le pont, descendre jusqu’au fond du ravin puis remonter de l’autre côté, ou contourner par la forêt.</p>`,choices:[{label:'Traverser le pont fragile',to:'c37'},{label:'Descendre dans le ravin',to:'ravineDown'},{label:'Contourner par la forêt',to:'c41'}]},

c37:{title:'Le pont fragile',text:s=>{if(!s.flags.villageBridgeRolled)return `<p>Tu poses une main sur la corde et t’engages prudemment.</p><p>Le pont balance au-dessus du ravin.</p><p>À chaque pas, les fibres grincent et les planches se dérobent légèrement sous tes bottes.</p><p>À mi-chemin, une latte casse net.</p><p>Tout le tablier se met à osciller.</p>`;return diceResultHtml(s)+(s.flags.villageBridgeDex?`<p>Tu retrouves ton équilibre et atteins l’autre rive sans lâcher la corde.</p><p>Les autres passent ensuite un par un, lentement.</p><p>Le pont tient.</p>`:(s.flags.villageBridgeSoldierLost?`<p>Tu réussis à gagner l’autre rive, mais derrière toi une seconde planche cède sous l’un de tes hommes.</p><p>La corde lui échappe. Il disparaît dans le ravin avant que quiconque puisse le retenir.</p><p>Tu perds 1 soldat.</p>`:damageResultHtml(s,'villageBridge')+`<p>Ton pied traverse les planches. Tu heurtes violemment le bord du pont avant de réussir à te hisser de l’autre côté.</p>`))+`<p>L’homme adossé à l’arbre n’est plus qu’à quelques mètres.</p>`;},choices:s=>!s.flags.villageBridgeRolled?[{label:'Traverser — Dextérité',stay:true,diceTest:true,effect:x=>{x.flags.villageBridgeRolled=true;x.flags.villageBridgeDex=rollDex(x);if(!x.flags.villageBridgeDex){if(x.expeditionSoldiers>0){x.flags.villageBridgeSoldierLost=true;loseSoldier(x,1);}else rollDamage(x,'villageBridge',3);}}}]:[{label:'Rejoindre l’homme',to:'c50'}]},

ravineDown:{title:'Au fond du ravin',text:s=>`<p>Vous laissez le pont au-dessus de vous et descendez prudemment entre les racines.</p><p>La pente est raide mais praticable.</p><p>Au fond, l’air devient plus frais. Une eau brune serpente entre les pierres et la boue monte presque jusqu’aux chevilles.</p><p>La remontée de l’autre côté est visible à quelques dizaines de mètres.</p><p>Vous commencez à traverser.</p><p>Puis la surface remue.</p>${s.flags.villageGatorSoldierLost?`<p>Une énorme gueule jaillit de l’eau et se referme sur la jambe de l’un de tes hommes.</p><p>Il disparaît dans la boue avant que vous puissiez le retenir.</p><p><strong>Tu perds 1 soldat.</strong></p>`:`<p>Tu es seul lorsque la gueule surgit devant toi et se referme sur ta botte.</p>`}`,onEnter:s=>{if(!s.flags.villageGatorEntered){s.flags.villageGatorEntered=true;if(s.expeditionSoldiers>0){s.flags.villageGatorSoldierLost=true;loseSoldier(s,1);}}},choices:s=>s.flags.villageGatorSoldierLost?[{label:'Affronter l’alligator',to:'ravineFight'}]:[{label:'Te dégager — Dextérité',to:'ravineMouth',diceTest:true,effect:x=>{x.flags.villageGatorDex=rollDex(x);if(!x.flags.villageGatorDex)rollDamage(x,'villageGatorBite',3);}}]},

ravineMouth:{title:'La mâchoire',text:s=>diceResultHtml(s)+(s.flags.villageGatorDex?`<p>Tu arraches ton pied au dernier instant. Les mâchoires claquent dans le vide et projettent de la boue sur tes jambes.</p>`:damageResultHtml(s,'villageGatorBite')+`<p>L’animal relâche sa prise, mais reste entre toi et l’autre versant.</p>`)+`<p>Sa queue frappe lentement l’eau sombre.</p>`,choices:[{label:'Combattre',to:'ravineFight'}]},

ravineFight:{title:'L’alligator',text:s=>`<p>L’animal se dresse à moitié hors de l’eau. Le ravin est trop étroit pour le contourner.</p>${fightHtml(s,'villageAlligator',ALLIGATOR)}`,choices:s=>{const f=s.combats?.villageAlligator;if(s.hp<=0)return[{label:'Tu succombes',to:'death'}];if(f&&f.hp<=0)return[{label:'Observer le corps dans la boue',to:'ravineCorpse'}];return standardFightChoices(s,'villageAlligator',ALLIGATOR,{label:'Tu succombes',to:'death'},{label:'Observer le corps dans la boue',to:'ravineCorpse'});}},

ravineCorpse:{title:'Le corps dans la boue',text:`<p>Lorsque l’alligator cesse enfin de bouger, le ravin retrouve son silence.</p><p>Un peu plus loin, tu aperçois un corps à moitié enfoui dans la boue.</p><p>Les vêtements sont ceux d’un marin, mais ils sont trop abîmés pour identifier son navire.</p><p>Autour de son poignet se trouve un bracelet épais de cuir et de métal, encore étonnamment solide malgré l’humidité.</p><p>Il pourrait renforcer ta prise et ton avant-bras au combat.</p>`,choices:[{label:'Prendre le bracelet',to:'ravineExit',effect:s=>{if(!s.flags.ravineForceBracelet){s.flags.ravineForceBracelet=true;s.forceBonus=(s.forceBonus||0)+2;addItem(s,'bracelet_force_ravin','Bracelet renforcé','Un bracelet de cuir et de métal trouvé dans le ravin. Force +2.');}}},{label:'Laisser le corps et remonter',to:'ravineExit'}]},

ravineExit:{title:'L’autre versant',text:`<p>L’alligator cesse enfin de bouger.</p><p>Vous traversez les derniers mètres de boue puis grimpez le versant opposé en vous aidant des racines.</p><p>Lorsque tu retrouves le sentier, le vieux pont est derrière toi.</p><p>L’homme aperçu de l’autre côté est toujours adossé contre son arbre.</p>`,choices:[{label:'Rejoindre l’homme',to:'c50'}]},

c41:{title:'Le détour par la forêt',text:s=>`<p>Vous renoncez au pont et longez le ravin sous les arbres.</p><p>Très vite, le sentier disparaît complètement.</p><p>La végétation devient si dense qu’il faut écarter les branches à chaque pas.</p><p>Puis un craquement retentit derrière vous.</p><p>Un second, beaucoup plus proche.</p>${s.flags.villageForestSoldierLost?`<p>Tu te retournes juste à temps pour voir l’un de tes hommes disparaître brutalement dans les fougères.</p><p>Un claquement de mâchoires coupe son cri.</p><p><strong>Tu perds 1 soldat.</strong></p><p>Vous courez sans chercher à comprendre ce qui vous suit.</p>`:`<p>Tu es seul. Quelque chose avance parallèlement à toi dans la végétation.</p><p>Tu accélères. Le bruit aussi.</p>`}`,onEnter:s=>{if(!s.flags.villageForestEntered){s.flags.villageForestEntered=true;if(s.expeditionSoldiers>0){s.flags.villageForestSoldierLost=true;loseSoldier(s,1);}}},choices:s=>s.flags.villageForestSoldierLost?[{label:'Continuer à courir',to:'forestCombatPowder'}]:[{label:'Courir — Dextérité',to:'forestCombatPowder',diceTest:true,effect:x=>{x.flags.villageForestDex=rollDex(x);if(!x.flags.villageForestDex)rollDamage(x,'villageForest',3);}}]},

c50:{title:'L’homme de l’autre côté',text:s=>{const prefix=(s.flags.villageForestEntered&&!s.flags.villageForestSoldierLost?diceResultHtml(s)+(s.flags.villageForestDex?'':''):'')+'<p>Vous finissez par rejoindre l’autre côté du ravin.</p>';if(s.flags.islandDelay)return prefix+'<p>L’homme aperçu depuis le pont est toujours adossé au même arbre.</p><p>Mais cette fois, il ne réagit pas lorsque tu t’approches.</p><p>Sa chemise est déchirée et le sang sur son épaule a eu le temps de sécher entièrement.</p><p>Tu t’accroupis près de lui.</p><p>Il est mort.</p><p>Sa main droite est refermée sur du sable et quelques fibres arrachées. Rien d’autre.</p><p>Vous avez perdu plusieurs heures en contournant les pirates. Elles ont suffi.</p><p>Tu regardes les toits du village visibles entre les arbres. Si tu veux comprendre ce qui s’est passé ici, il faudra chercher les réponses toi-même.</p>';return prefix+`<p>L’homme aperçu depuis le pont est toujours adossé au même arbre.</p><p>Il porte les vêtements simples d’un pêcheur. Sa chemise est déchirée et du sang a séché sur son épaule.</p><p>Lorsque tu t’approches, il ouvre les yeux.</p><blockquote>« Ils sont venus de la mer... »</blockquote><p>Sa voix est à peine audible.</p><blockquote>« Les hommes blancs. Trop nombreux. »</blockquote><p>Tu lui demandes ce qu’ils ont fait aux habitants.</p><p>Il secoue lentement la tête.</p><blockquote>« Ils ne les tuaient pas... Ils les attachaient. Ils les emmenaient vers les barques. »</blockquote><p>Il ouvre difficilement la main. Dans sa paume repose une petite bague de métal ornée d’une tête de mort.</p><blockquote>« Je l’ai arrachée à l’un d’eux pendant l’attaque. Quand un autre l’a vue dans ma main, il s’est arrêté une seconde... juste assez pour que je m’échappe. »</blockquote><p>Il te tend la bague.</p><blockquote>« Prenez-la. Elle signifie quelque chose pour eux. »</blockquote><p>Son regard se tourne vers les toits du village, visibles entre les arbres.</p><blockquote>« Le guetteur les observait depuis des semaines... Tout est dans ses cahiers. »</blockquote><p>Il essaie de se relever, puis retombe contre le tronc.</p><p>Il respire encore, mais il n’est pas en état de vous suivre.</p>`;},onEnter:s=>{if(!s.flags.islandDelay&&!s.flags.skullRing){s.flags.skullRing=true;addItem(s,'bague_crane','Bague au crâne','Une bague arrachée à un homme pâle. Les membres de leur groupe semblent reconnaître ce symbole.');}},choices:[{label:'Continuer vers le village',to:'c38'}]},

c38:{title:'Le village désert',text:s=>{const n=(s.flags.villageHomes?1:0)+(s.flags.villageWatch?1:0)+(s.flags.villageArchives?1:0)+(s.flags.villageShore?1:0);if(n===0)return `<p>La rue principale traverse une trentaine de maisons. Des affaires sont encore posées devant les portes. Un linge claque au vent. Une marmite noire repose sur un foyer froid.</p><p>Aucun corps.</p><p>Aucun habitant.</p><p>Tu ne pourras pas retourner chaque maison et chaque registre avant la nuit. Il faut choisir où chercher en priorité.</p><p>Quatre pistes se détachent : les maisons ravagées, le poste de guet, la maison commune où sont conservés les anciens registres, et la jetée à l’autre extrémité de la plage.</p>`;if(n===1)return `<p>Tu reviens au centre du village avec un premier élément.</p><p>Le soleil descend déjà derrière les arbres. Tu as encore le temps d’examiner une autre piste avant de rassembler ce que vous avez trouvé.</p><p>Il faut choisir laquelle.</p>`;return `<p>Vous vous retrouvez sur la place avec les indices recueillis.</p><p>Tu pourrais continuer à fouiller au hasard, mais personne ne sait si les assaillants reviendront.</p><p>Un de tes hommes appelle depuis une petite maison adossée au poste de guet. Il vient de trouver un carnet récent sous une table renversée.</p><p>Ce sont peut-être les dernières notes écrites avant l’attaque.</p>`;},choices:s=>{const n=(s.flags.villageHomes?1:0)+(s.flags.villageWatch?1:0)+(s.flags.villageArchives?1:0)+(s.flags.villageShore?1:0);if(n>=2)return[{label:'Lire le carnet retrouvé',to:'c51'}];const out=[];if(!s.flags.villageHomes)out.push({label:'Fouiller les maisons ravagées',to:'c39'});if(!s.flags.villageWatch)out.push({label:'Monter au poste de guet',to:'c42'});if(!s.flags.villageArchives)out.push({label:'Examiner les anciens registres',to:'c44'});if(!s.flags.villageShore)out.push({label:'Inspecter la jetée et la plage',to:'c48'});return out;}},

c39:{title:'Les maisons',text:`<p>Tu pousses la porte de la première maison.</p><p>Une table est renversée. Deux assiettes brisées couvrent le sol. Dans une chambre, un coffre est ouvert et les vêtements ont été jetés partout.</p><p>Pourtant, rien ne ressemble à un pillage.</p><p>Les pièces, les outils et même plusieurs bijoux modestes sont encore là.</p><p>Dans la maison voisine, même scène.</p><p>Et toujours aucun corps.</p><p>Sur le sol, plusieurs sillons traversent la poussière jusqu’à la porte, comme si quelqu’un avait été traîné dehors.</p>`,choices:[{label:'Examiner les dernières traces',to:'c40'}]},

c40:{title:'Emportés',text:`<p>Près d’un lit brisé, tu trouves une chemise arrachée et une longue marque de doigts sur le plancher.</p><p>Une chose devient difficile à ignorer : les habitants ne semblent pas avoir été massacrés ici.</p><p>Les marques donnent plutôt l’impression que plusieurs habitants ont été traînés hors des maisons.</p><p>Qui que soient les assaillants, ils ne semblent pas être venus pour piller.</p>`,onEnter:s=>s.flags.villageHomes=true,choices:[{label:'Retourner sur la place',to:'c38'}]},

c42:{title:'Le poste de guet',text:`<p>Un escalier de bois grimpe jusqu’à une petite plateforme au-dessus du village.</p><p>Une longue-vue est encore fixée sur son support.</p><p>Elle pointe vers une île basse visible au sud-est, séparée de vous par quelques milles de mer.</p><p>À côté se trouve un cahier de surveillance couvert de dates et de remarques.</p><blockquote>« Trois lumières bleues encore cette nuit. »</blockquote><blockquote>« Deux silhouettes sur la plage d’en face. Elles nous observaient. »</blockquote><blockquote>« Peau très claire. Vêtements de marins. Aucun pavillon. »</blockquote><p>Tu relèves les yeux vers l’île au loin.</p><p>La direction correspond exactement à celle indiquée sur la carte trouvée dans le Providence.</p>`,choices:[{label:'Lire les dernières notes',to:'c43'}]},

c43:{title:'Quelqu’un est venu',text:`<p>Les dernières notes sont plus courtes.</p><blockquote>« Ils nous regardent depuis des semaines. Toujours depuis la même côte. »</blockquote><blockquote>« Hier soir, Thomas a surpris l’un d’eux près des jardins. Un homme pâle. Il s’est enfui dès qu’on l’a vu et a gagné la plage. »</blockquote><blockquote>« Nous avons retrouvé une petite embarcation cachée entre les rochers. Il venait de l’autre île. »</blockquote><p>La dernière ligne date du lendemain matin.</p><blockquote>« Doubler la garde. Quelque chose ne va pas. »</blockquote>`,onEnter:s=>s.flags.villageWatch=true,choices:[{label:'Retourner sur la place',to:'c38'}]},

c44:{title:'Les anciens registres',text:`<p>La maison commune contient des cartes, des livres de comptes et plusieurs journaux tenus par les habitants au fil des années.</p><p>Tu cherches l’île située au sud-est.</p><p>Son nom change selon les documents. Certaines cartes ne la nomment même pas.</p><p>Mais un sujet revient régulièrement : des pierres bleues.</p><p>Un texte vieux de plusieurs décennies raconte qu’un pêcheur en aurait rapporté une, « plus claire que le verre et bleue comme la mer avant l’orage ».</p><p>Il serait reparti quelques semaines plus tard pour en chercher d’autres.</p><p>Son bateau aurait été retrouvé vide.</p>`,choices:[{label:'Continuer à lire',to:'c45'}]},

c45:{title:'L’île d’en face',text:`<p>D’autres passages sont plus récents.</p><blockquote>« Ne pas accoster sur l’île du sud-est. »</blockquote><blockquote>« Les hommes qui y vivent ne commercent pas. Ils observent. »</blockquote><blockquote>« Certains sont vêtus comme des marins étrangers. Pourtant personne ne les a jamais vus arriver. »</blockquote><p>Dans la marge, une autre main a ajouté :</p><blockquote>« Les pierres bleues attirent toujours quelqu’un. »</blockquote><p>Plus loin, un dessin montre trois points bleus alignés devant une crique.</p><p>Les mêmes trois marques que sur la carte du Providence.</p>`,choices:[{label:'Examiner la carte locale',to:'c46'}]},

c46:{title:'La carte locale',text:`<p>Une carte grossière de la région relie les deux îles.</p><p>Votre village est ici.</p><p>L’île aux trois lumières est seulement à quelques milles au sud-est.</p><p>Un ancien a tracé une croix sur sa crique et écrit :</p><blockquote>« On peut y entrer facilement. C’est en repartir qui pose problème. »</blockquote><p>Tu recopies les indications utiles.</p><p>Si vous devez finalement approcher cette île, vous savez désormais exactement où elle se trouve.</p>`,onEnter:s=>s.flags.villageArchives=true,choices:[{label:'Retourner sur la place',to:'c38'}]},



c48:{title:'La jetée',text:`<p>À l’autre extrémité du village, la petite jetée a été partiellement détruite.</p><p>Deux barques sont renversées. Une troisième a brûlé jusqu’à la ligne de flottaison.</p><p>Dans le sable humide, les traces sont nombreuses mais encore lisibles.</p><p>Plusieurs groupes sont arrivés depuis la mer.</p><p>Puis les mêmes pas repartent vers l’eau.</p><p>Entre eux, de longues marques parallèles traversent la plage.</p><p>Quelque chose de lourd a été traîné jusqu’aux embarcations.</p>`,choices:[{label:'Suivre les traces',to:'c49'}]},

c49:{title:'Vers la mer',text:`<p>Les sillons s’arrêtent exactement au bord de l’eau.</p><p>Dans l’un d’eux, tu retrouves un morceau de manche arraché à une chemise d’habitant.</p><p>Pas de tombe.</p><p>Pas de corps rejeté par la mer.</p><p>Les assaillants semblent être repartis par la mer en emportant quelque chose — ou quelqu’un — avec eux.</p><p>La direction des traces au bord de l’eau pointe vers l’île au sud-est.</p>`,onEnter:s=>s.flags.villageShore=true,choices:[{label:'Retourner sur la place',to:'c38'}]},

c51:{title:'Le journal du guetteur',text:`<p>Dans une petite maison adossée au poste de guet, tu finis par trouver un carnet récent sous une table renversée.</p><p>Son auteur surveillait régulièrement l’île voisine.</p><blockquote>« Les hommes pâles sont encore sur leur plage. Trois cette fois. Ils restent des heures sans bouger, tournés vers nous. »</blockquote><p>Quelques jours plus tard :</p><blockquote>« Encore les lumières bleues. Un navire inconnu a changé de cap dans leur direction. Nous ne l’avons jamais revu. »</blockquote><p>Puis :</p><blockquote>« Nous avons trouvé un homme pâle derrière les jardins. Il portait une vieille veste de marin espagnol. Quand Pierre l’a appelé, il a couru jusqu’à la côte et s’est enfui en barque. »</blockquote><p>La phrase suivante est soulignée :</p><blockquote>« Mauvais signe. Il ne venait pas observer. Il venait voir combien nous étions. »</blockquote>`,choices:[{label:'Lire les dernières pages',to:'c52'}]},

c52:{title:'Les derniers mots',text:`<p>Les dernières pages ont été écrites le lendemain.</p><blockquote>« Des barques ont quitté leur île avant l’aube. Beaucoup. »</blockquote><blockquote>« La cloche sonne. Tout le monde est dehors. »</blockquote><p>Puis l’écriture devient brusque, presque illisible.</p><blockquote>« Ils sont là. Trop nombreux. Je pars aider les autres. »</blockquote><p>Rien après.</p><p>Tu regardes par la fenêtre ouverte vers les maisons vides.</p><p>Les traces de lutte, l’absence de corps et les sillons jusqu’à la mer complètent le récit.</p><p>Les habitants ont été attaqués.</p><p>Et presque certainement emmenés vivants sur l’île voisine.</p>`,choices:[{label:'Rassembler les indices',to:'c53'}]},

c53:{title:'La même piste',text:`<p>Tu étales la carte du Providence à côté de la carte locale.</p><p>Les deux désignent la même île.</p><p>Les trois lumières bleues. Les pierres. Les hommes pâles.</p><p>Le Providence avait suivi ces signes sans savoir ce qu’il trouverait.</p><p>Vous étiez sur le point de faire la même chose.</p><p>Le détour par ce village change tout.</p><p>Vous savez maintenant que les hommes pâles surveillent les îles voisines, qu’ils viennent chercher des hommes et qu’ils les ramènent chez eux.</p><p>Si une partie de l’équipage du Providence a survécu, elle peut encore être là-bas.</p><p>La pierre bleue retrouvée près de la carte te paraît soudain beaucoup moins précieuse.</p><p>Elle ressemble davantage à un hameçon.</p><p>Une pensée s’impose :</p><p>Et si nous étions en train de faire exactement la même chose qu’eux ?</p><p>Cette fois, au moins, vous n’irez pas à l’aveugle.</p>`,choices:[{label:'Retourner aux navires',to:'c54'}]},

c54:{title:'Le retour',text:`<p>Vous quittez le village et reprenez le chemin de la plage.</p><p>Personne ne parle beaucoup.</p><p>À travers une ouverture entre les arbres, tu aperçois un instant l’île au sud-est.</p><p>Trois faibles lumières bleues brillent au même endroit, près d’une petite crique.</p><p>Un.</p><p>Deux.</p><p>Trois.</p><p>Maintenant, tu sais qu’elles correspondent aux trois marques de la carte du Providence.</p>`,choices:[{label:'Rejoindre la plage',to:'c55'}]},

c55:{title:'La plage',text:s=>'<p>La mer réapparaît enfin entre les arbres.</p>'+(Math.max(0,Math.floor(Number(s.expeditionSoldiers)||0))>0?'<p>Les hommes revenus avec toi vérifient leur équipement pendant que vous gagnez les embarcations.</p>':'<p>Tu reprends seul le chemin des embarcations.</p>')+'<p>Mais avant d’atteindre le sable, tu comprends que quelque chose a changé dans la crique.</p>',choices:[{label:'Voir ce qui s’est passé',to:'c56'}]},

c56:{title:'Retour à la plage',text:s=>{
  if(s.flags.commander==='hale'){
    let h='<p>Lorsque la mer réapparaît entre les arbres, le premier bruit que tu entends est celui des marteaux.</p><p>Le Resolute est toujours là, mais son gréement a été déchiqueté par les tirs et plusieurs impacts noirs marquent la coque.</p><p>Le Providence est toujours au mouillage un peu plus loin.</p><p>Sur le pont du Resolute, des hommes transportent les blessés.</p><p>Hale vient à ta rencontre, le visage fermé.</p><blockquote>« Les pirates sont arrivés avant votre retour. J’ai attendu trop longtemps. »</blockquote><p>Il baisse les yeux une seconde.</p><blockquote>« Briggs est mort pendant l’abordage. »</blockquote><p>Au total, l’attaque a coûté <strong>'+String(s.flags.pirateAttackLoss||1)+' soldat'+((s.flags.pirateAttackLoss||1)>1?'s':'')+'</strong>, Briggs compris. <strong>'+String(s.flags.pirateSailorLoss||5)+' marins</strong> ont également été tués pendant l’abordage.</p>';
    if((s.flags.haleVolunteers||0)>0){
      h+='<p>Parmi les survivants encore capables de se battre, <strong>'+String(s.flags.haleVolunteers)+' soldat'+((s.flags.haleVolunteers||0)>1?'s ont':' a')+' refusé de t’abandonner</strong>.</p>';
      if((s.soldiers||0)>0)h+='<p>Ils se préparent à repartir avec toi et Hale.</p>';
    }else h+='<p>Les hommes encore capables de tenir debout doivent rester avec les blessés et défendre le Resolute.</p>';
    h+='<p>Tu racontes ce que vous avez découvert dans le village et la possibilité que les marins du Providence soient encore retenus sur l’île voisine.</p><p>Hale se tourne vers une chaloupe intacte.</p><blockquote>« Alors on y va. »</blockquote><p>Pour la première fois depuis le début de la mission, ce n’est plus le navire que tu cherches. Ce sont ses hommes.</p>';
    return h;
  }

  const escort=Math.max(0,Math.floor(Number(s.flags.haleEscortSoldier)||0));
  const total=Math.max(0,Math.floor(Number(s.soldiers)||0));
  const returned=Math.max(0,total-escort);
  let h='<p>Lorsque tu retrouves la plage, la baie est presque vide.</p><p>Le Providence n’est plus là. Le Resolute non plus.</p><p>Hale t’attend près d’une chaloupe tirée sur le sable.</p>';
  if(escort>0)h+='<p>À son côté se tient <strong>un soldat de la garnison</strong> resté avec lui lorsque Briggs a repris la mer.</p>';
  else h+='<p>Il est seul.</p>';
  h+='<p>À ton approche, Hale se lève immédiatement.</p><blockquote>« Des pirates ont débouché au large peu après votre départ. Ils ont ouvert le feu. Briggs n’a pas attendu qu’ils ferment la baie. »</blockquote><p>Il t’explique que Briggs a fait reprendre le Providence en remorque et a forcé la sortie avec le Resolute et le gros de l’équipage.</p><blockquote>« Il voulait sauver les deux navires et éloigner les pirates d’ici. J’ai pris cette chaloupe avant leur départ. Je ne pouvais pas partir en vous laissant sur l’île. »</blockquote>';
  if(escort>0&&returned>0)h+='<p>Le soldat resté avec Hale rejoint les hommes revenus avec toi.</p>';
  else if(escort>0)h+='<p>Le soldat resté avec Hale prend son arme. Il vous accompagnera.</p>';
  else if(returned>0)h+='<p>Les hommes revenus avec toi se préparent à repartir.</p>';
  h+='<p>Tu racontes ce que vous avez découvert et la possibilité que les marins du Providence soient encore retenus sur l’île voisine.</p><p>Hale regarde la chaloupe.</p><blockquote>« Alors on va les chercher. »</blockquote><p>Pour la première fois depuis le début de la mission, ce n’est plus le navire que tu cherches. Ce sont ses hommes.</p>';
  return h;
},onEnter:s=>prepareSecondIslandParty(s),choices:[{label:'Prendre la chaloupe et rejoindre l’île voisine',to:'c57'}]},

c57:{title:'Vers l’île interdite',text:s=>'<p>La petite chaloupe s’éloigne de la côte avec Hale'+((s.soldiers||0)>0?' et <strong>'+String(s.soldiers)+' soldat'+(s.soldiers>1?'s':'')+'</strong>':'')+'.</p><p>L’île des hommes pâles se rapproche lentement.</p><p>Au loin, les trois lueurs bleues restent visibles au même endroit, près de la crique principale.</p><p>À cette distance, plusieurs approches semblent possibles.</p><p>La plage principale paraît presque déserte. Plus loin, une forêt dense descend jusqu’à la mer. En prenant le temps de contourner l’île, vous pourriez peut-être trouver une entrée plus discrète.</p>'+(s.flags.retreatTried?'<p>Après ce que vous venez de sentir sous la coque, tu sais désormais que reprendre simplement le large ne sera pas si facile.</p>':''),choices:s=>{const out=[{label:'Accoster sur la plage en espérant que ce ne soit pas un piège',to:'islandBeach'},{label:'Tenter d’accoster du côté de la forêt',to:'islandForestLanding'},{label:'Faire le tour de l’île pour repérer avant d’accoster',to:'islandRecon'}];if(!s.flags.retreatTried)out.push({label:'Faire demi-tour et prendre du recul',to:'islandRetreat'});return out;}},

islandRetreat:{title:'Le retour forcé',text:'<p>Tu donnes l’ordre de virer et de reprendre le large.</p><p>Les premières dizaines de mètres se passent normalement.</p><p>Puis les rames deviennent lourdes.</p><p>La mer paraît calme, mais la chaloupe avance comme dans de l’huile.</p><p>Sous vous, une ombre gigantesque passe lentement.</p><p>Une poussée soulève l’arrière de l’embarcation et la fait pivoter vers l’île.</p><p>Hale ordonne de ramer plus fort.</p><p>Inutile.</p><p>La chose sous la coque ne cherche pas à vous faire chavirer. Elle vous pousse.</p><p>La chaloupe est rabattue vers une grève rocheuse, loin de la plage aux trois lumières.</p><p>À peine la coque touche-t-elle les pierres que des silhouettes surgissent entre les arbres.</p><p>Une milice d’hommes pâles descend vers vous, armes en main. D’autres apparaissent déjà derrière la chaloupe.</p><p>Hale porte la main à son sabre, puis s’arrête. Vous êtes encerclés avant même d’avoir pu vous mettre en ordre.</p><p>On vous arrache vos armes. Un coup violent t’atteint derrière la tête.</p><p>Le rivage disparaît.</p>',onEnter:s=>{if(!s.flags.krakenForcedCapture){s.flags.krakenForcedCapture=true;s.flags.retreatTried=true;s.flags.beachCaptured=true;s.flags.capturedSoldiers=Math.max(0,Math.floor(Number(s.soldiers)||0));s.soldiers=0;s.expeditionSoldiers=0;}},choices:[{label:'Reprendre connaissance',to:'islandCaptured'}]},

islandBeach:{title:'La plage',text:'<p>Vous choisissez la plage principale.</p><p>La chaloupe glisse jusqu’au sable sans qu’aucun homme ne se montre.</p><p>Tu poses un pied à terre.</p><p>Puis des silhouettes apparaissent entre les arbres.</p><p>D’abord trois.</p><p>Puis six autres.</p><p><strong>Neuf hommes pâles</strong> ferment maintenant la plage derrière vous.</p><p>Ils ont le teint livide. Certains portent encore des vestes de marins anglais, espagnols ou hollandais. Tous sont armés.</p><p>Quelque chose te trouble immédiatement dans leur regard.</p><p>Dans l’ombre des arbres, leurs yeux accrochent parfois la lumière d’un reflet bleu très faible, presque animal.</p><p>L’un d’eux reste parfaitement immobile, trop longtemps, sans que tu voies sa poitrine se soulever.</p><p>La chaloupe est déjà hors d’atteinte.</p><p>Vous êtes encerclés.</p>',choices:[{label:'Se battre',to:'islandBeachFight'},{label:'Avancer vers eux sans attaquer',to:'islandBeachYield'}]},

islandBeachFight:{title:'Trop nombreux',text:s=>{const lost=(s.flags.beachSoldiersLost||0)>0;let h='<p>Tu tires ton sabre et cries l’ordre d’attaquer.</p><p>Les premiers hommes pâles reculent sous le choc.</p><p>Puis la masse se referme.</p>';if(lost)h+='<p>Un de tes soldats se jette sur un homme pâle qui s’approchait de Hale.</p><p>Il n’a pas le temps de porter son coup. Une lame le frappe violemment et il s’effondre sur le sable.</p><p><strong>Un de tes soldats vient de mourir.</strong></p>';else h+='<p>Hale se jette sur le premier homme pâle qui s’approche de toi, mais plusieurs autres le prennent immédiatement de côté.</p><p>Une crosse le frappe violemment au visage. Il s’effondre sur le sable, assommé.</p>';h+='<p>La résistance se brise presque aussitôt. Plusieurs armes se tournent vers toi à bout portant.</p><p>Tu essaies encore de lever ton sabre.</p><p>Puis quelque chose de lourd s’abat sur ton crâne.</p><p>Le ciel bascule.</p><p>Tout devient noir.</p>';return h;},onEnter:s=>{if(!s.flags.beachFightResolved){s.flags.beachFightResolved=true;s.flags.beachCaptured=true;const before=Math.max(0,Math.floor(Number(s.soldiers)||0));const lost=before>0?1:0;s.flags.beachSoldiersLost=lost;s.flags.beachFightCrewmanKilled=lost>0;s.flags.beachFightHaleKnockedOut=lost===0;s.flags.capturedSoldiers=Math.max(0,before-lost);s.soldiers=0;s.expeditionSoldiers=0;}},choices:[{label:'Reprendre connaissance',to:'islandCaptured'}]},

islandBeachYield:{title:'Ne pas provoquer le massacre',text:'<p>Tu lèves lentement les mains et ordonnes à tout le monde de garder ses armes basses.</p><p>Les hommes pâles avancent sans courir.</p><p>Aucun ne parle.</p><p>Ils viennent assez près pour que tu distingues les cicatrices, le sel incrusté dans leurs vêtements et les restes d’anciens uniformes.</p><p>Tu essaies de leur parler.</p><p>Un choc brutal derrière la tête coupe ta phrase.</p><p>Autour de toi, les autres s’effondrent presque au même instant.</p><p>Noir.</p>',onEnter:s=>{s.flags.beachCaptured=true;s.flags.beachYielded=true;s.flags.beachSoldiersLost=0;if(!Number.isFinite(s.flags.capturedSoldiers))s.flags.capturedSoldiers=Math.max(0,Math.floor(Number(s.soldiers)||0));s.soldiers=0;s.expeditionSoldiers=0;},choices:[{label:'Reprendre connaissance',to:'islandCaptured'}]},

islandCaptured:{title:'Prisonniers',text:s=>'<p>Tu reprends connaissance avec un goût de sang dans la bouche et les poignets liés.</p><p>Ton sabre a disparu. Tes poches ont été vidées et tout ton équipement a été retiré.</p><p>Hale est étendu non loin de toi. Il respire.</p>'+(s.flags.beachFightCrewmanKilled?'<p>Le souvenir du soldat tombé sur la plage te revient immédiatement. Lui ne se relèvera pas.</p>':'')+(s.flags.beachFightHaleKnockedOut?'<p>Hale porte une marque sombre sur la tempe, mais il reprend lentement connaissance.</p>':'')+((s.flags.capturedSoldiers||0)>0?'<p>Les autres soldats sont eux aussi ligotés. Les hommes pâles les relèvent un à un.</p>':'')+'<p>On vous pousse ensuite vers l’intérieur de l’île.</p><p>À travers les arbres apparaissent les premières huttes du village.</p><p>À mesure que vous approchez, tu remarques de nouveau cette étrangeté dans les regards : lorsqu’un homme pâle traverse la lumière d’une torche, ses yeux renvoient parfois un éclat bleu qui disparaît aussitôt.</p>',onEnter:s=>stripCapturedEquipment(s),choices:[{label:'Voir où ils vous emmènent',to:'c68'}]},

islandForestLanding:{title:'La côte boisée',text:s=>{const n=secondIslandLocalSoldiers(s);return '<p>Vous longez l’île jusqu’à une portion de côte où la forêt descend presque dans l’eau.</p><p>La chaloupe trouve un passage entre les racines et les rochers.</p><p>Devant vous, aucun chemin. Seulement une végétation épaisse.</p><p>Tu es avec Hale et <strong>'+String(n)+' soldat'+(n>1?'s':'')+'</strong>.</p><p>Vous pouvez débarquer tous ensemble.</p>'+(canSplitSecondIslandParty(s)?'<p>Vous êtes assez nombreux pour vous séparer. Hale et toi pouvez débarquer ici pendant que les soldats restent dans la chaloupe et poursuivent le tour de l’île pour chercher un autre point d’accès.</p>':'');},choices:s=>{const out=[{label:'Débarquer tous ensemble',to:'forestTrap',effect:x=>keepSecondIslandSoldiersTogether(x)}];if(canSplitSecondIslandParty(s))out.push({label:'Hale et toi débarquez — envoyer les soldats plus loin avec la chaloupe',to:'forestTrap',effect:x=>sendSecondIslandSoldiersAround(x)});return out;}},

forestTrap:{title:'Le piège dans les arbres',text:s=>{if(!s.flags.islandLogTrapRolled)return '<p>Vous progressez lentement sous les arbres.</p><p>Le sol est humide et presque aucun rayon de soleil n’atteint la terre.</p><p>Un claquement sec retentit au-dessus de vous.</p><p>Tu lèves les yeux.</p><p>Un énorme tronc hérissé de pointes vient de se libérer entre deux arbres et bascule droit sur le groupe.</p><p>Une fraction de seconde pour réagir.</p><p>Pour toi, il faut réussir un <strong>jet standard de Dextérité</strong>. En cas d’échec, le tronc te blesse : lance un dé à 3 faces pour déterminer les dégâts.</p><p>Pour Hale et chaque soldat présent, un dé est lancé séparément. Sur 1 ou 2, le piège est fatal.</p>';let h='<p>Le tronc traverse le passage dans un fracas de branches et de bois brisé.</p>'+diceResultHtml(s);if(s.flags.islandHeroDex)h+='<p>Tu te jettes de côté juste avant l’impact.</p>';else h+=damageResultHtml(s,'islandLogTrapHero')+'<p>Tu n’es pas assez rapide. Le tronc te heurte avant que tu parviennes à t’écarter.</p>';if(s.flags.islandHaleRoll)h+='<p>Hale : <strong>'+String(s.flags.islandHaleRoll)+'</strong> — '+(s.flags.islandHaleRoll>=3?'réussi':'échec')+'.</p>';if((s.flags.islandSoldierRolls||[]).length)h+='<p>Soldats : '+s.flags.islandSoldierRolls.map(v=>'<strong>'+v+'</strong>').join(' · ')+'.</p>';if(s.flags.islandSoldierDeaths)h+='<p><strong>'+String(s.flags.islandSoldierDeaths)+' soldat'+(s.flags.islandSoldierDeaths>1?'s meurent':' meurt')+' sous le piège.</strong></p>';if(s.flags.haleAlive===false)h+='<p>Hale n’a pas eu le temps de se jeter de côté. Le tronc l’emporte avec lui.</p>';if(s.hp>0)h+='<p>Quand le silence revient, vous repartez entre les arbres.</p>';return h;},choices:s=>!s.flags.islandLogTrapRolled?[{label:'Lancer les dés',stay:true,effect:x=>resolveIslandLogTrap(x)}]:s.hp<=0?[{label:'La fin du voyage',to:'death'}]:[{label:'Continuer dans la forêt',to:'forestAlligator'}]},

forestAlligator:{title:'La boue remue',text:s=>'<p>Le terrain descend vers une zone humide où l’eau brune recouvre les racines.</p><p>Quelque chose glisse sous la surface.</p><p>Une tête massive surgit devant vous, gueule ouverte.</p><p>Un alligator barre le seul passage praticable.</p>'+fightHtml(s,'islandAlligator',ALLIGATOR),choices:s=>{const f=s.combats?.islandAlligator;if(s.hp<=0)return[{label:'Tu succombes',to:'death'}];if(f&&f.hp<=0)return[{label:'Poursuivre vers l’intérieur de l’île',to:'villageRear'}];return standardFightChoices(s,'islandAlligator',ALLIGATOR,{label:'Tu succombes',to:'death'},{label:'Poursuivre vers l’intérieur de l’île',to:'villageRear'});}},

islandRecon:{title:'Faire le tour de l’île',text:s=>{const n=secondIslandLocalSoldiers(s);return '<p>Vous restez à distance de la côte et contournez lentement l’île.</p><p>La plage principale disparaît derrière vous.</p><p>Après près d’une heure, Hale aperçoit une ouverture minuscule entre deux parois rocheuses.</p><p>Une crique étroite se cache derrière. De la mer, elle est presque invisible.</p><p>Aucune silhouette. Aucun feu. Aucun bruit.</p><p>Tu es avec Hale et <strong>'+String(n)+' soldat'+(n>1?'s':'')+'</strong>.</p><p>Vous pouvez tous y débarquer.</p>'+(canSplitSecondIslandParty(s)?'<p>Vous êtes assez nombreux pour vous séparer. Hale et toi pouvez descendre ici pendant que les soldats poursuivent le tour de l’île en chaloupe pour chercher un second accès.</p>':'');},choices:s=>{const out=[{label:'Débarquer tous ensemble dans la crique',to:'coveClearing',effect:x=>keepSecondIslandSoldiersTogether(x)}];if(canSplitSecondIslandParty(s))out.push({label:'Hale et toi débarquez — envoyer les soldats poursuivre le tour de l’île',to:'coveClearing',effect:x=>sendSecondIslandSoldiersAround(x)});return out;}},

coveClearing:{title:'La crique cachée',text:s=>((s.flags.flankingSoldiers||0)>0?'<p>La chaloupe glisse dans la crique et vient toucher la roche.</p><p>Hale et toi descendez à terre. Les soldats reprennent aussitôt les rames et poursuivent le tour de l’île, comme prévu.</p><p>Vous vous enfoncez à pied sous les branches.</p>':'<p>Vous tirez la chaloupe sous les branches et avancez à pied.</p>')+'<p>Un passage naturel débouche bientôt sur une petite clairière encerclée de roche.</p><p>Dans la paroi, une ouverture sombre forme l’entrée d’une grotte.</p><p>Rien ne signale l’endroit depuis la mer. Sans la crique, vous seriez probablement passés devant sans le voir.</p>',choices:[{label:'Entrer dans la grotte',to:'caveTunnel'},{label:'Laisser la grotte et chercher le village',to:'villageRear'}]},

caveTunnel:{title:'Sous la roche',text:'<p>La lumière disparaît rapidement derrière vous.</p><p>Au bout de quelques mètres, la grotte cesse de ressembler à une cavité naturelle.</p><p>Les parois ont été égalisées. Des marches grossières ont été taillées dans le sol. De petits renfoncements réguliers longent les murs comme s’ils avaient autrefois accueilli des lampes.</p><p>Plus loin, une lumière verticale tombe depuis une ouverture très haute dans la roche.</p>',choices:[{label:'Avancer vers la lumière',to:'cavePistolGuardian'}]},

caveShrine:{title:'Le sanctuaire',text:s=>'<p>Le passage débouche dans une salle ronde.</p><p>Un rayon de lumière traverse une fissure du plafond et tombe sur les fresques qui couvrent les murs.</p><p>La première montre un navire en pleine mer, son pont rempli de marins. Sous la coque, un immense kraken suit le navire comme une ombre.</p><p>La deuxième représente plusieurs petites embarcations. Sur leurs voiles ou sur le bras des hommes qui les dirigent apparaît toujours le même symbole : un cercle noir fermé.</p><p>Ces marins laissent des pierres bleues et des cartes à bord d’autres navires. Sur la scène suivante, trois feux bleutés sont allumés autour d’une crique, toujours aux mêmes emplacements. Un navire étranger met le cap vers eux.</p><p>La scène suivante montre le navire étranger immobilisé près de la côte. Des hommes sont conduits vers la mer.</p><p>Plus loin, les tentacules emportent les prisonniers dans l’eau.</p><p>Mais les petites embarcations marquées du cercle noir repartent intactes.</p><p>Sur la dernière partie de la fresque, l’une d’elles traverse une mer agitée tandis que la silhouette du kraken passe sous sa coque sans la toucher.</p>'+((s.flags.blackCirclePalm||s.flags.assassinCircle||s.flags.blackCircleMerchant)?'<p>Tu reconnais le symbole. Le vieux marin. L’homme venu te tuer. Le faux marchand.</p>':'')+'<p>Le sens de la fresque devient difficile à ignorer : des marins de l’extérieur entretiennent le piège. Ils conduisent d’autres navires vers l’île et, en échange, la créature semble épargner les leurs.</p><p>Ce que montrent les fresques ne ressemble pas à une légende. C’est un système organisé.</p><p>Au pied des fresques, le sol est encombré d’affaires abandonnées : bottes, ceinturons, vestes de marin, sacs éventrés, sabres, mousquets et pièces d’équipement provenant de plusieurs équipages.</p><p>Certains objets portent les marques de la Royal Navy. D’autres appartenaient manifestement à des marchands ou à des flibustiers.</p><p>Tu comprends que les hommes pâles retirent à leurs prisonniers tout ce qui pourrait les encombrer avant de les emmener plus loin.</p><p>Sous une veste de cuir durcie par le sel, tu découvres <strong>deux pistolets à silex</strong> enveloppés dans un morceau de toile huilée.</p><p>Les mécanismes semblent encore fonctionner.</p><p>Et les deux armes sont chargées.</p>',onEnter:s=>{s.flags.caveTruth=true;s.flags.caveVisitedDay=true;s.flags.blackCircleBrotherhood=true;if(!s.inventory?.pistolets_silex&&!s.flags.cavePistolsUsed)addItem(s,'pistolets_silex','Deux pistolets à silex','Deux pistolets trouvés parmi les affaires abandonnées dans le sanctuaire. Les deux armes sont chargées.',{quantity:2});},choices:[{label:'Emporter les pistolets et quitter la grotte',to:'caveExit'}]},

caveExit:{title:'Vers le village',text:'<p>Vous quittez le sanctuaire par un passage étroit qui remonte derrière la paroi.</p><p>Quelques minutes plus tard, vous retrouvez la forêt.</p><p>Des voix arrivent de l’autre côté des arbres.</p><p>Vous ralentissez.</p><p>Le village est tout proche.</p>',choices:[{label:'Approcher discrètement',to:'villageRear'}]},

villageRear:{title:'Derrière le village',text:s=>{let h='<p>Depuis les arbres, tu découvres enfin le village des hommes pâles.</p><p>Ils sont nombreux. Ils se déplacent lentement entre des huttes construites avec des morceaux de navires.</p><p>Certains portent de vieux vêtements de marins. D’autres ont le torse nu. Plusieurs sont armés de sabres, de mousquets ou de longues lances.</p><p>Le calme du lieu est presque plus inquiétant que des cris.</p><p>À cette distance, quelque chose semble parfois luire dans leurs yeux. Un reflet bleu très faible qui disparaît dès qu’ils tournent la tête.</p><p>Certains restent immobiles pendant de longues secondes, sans le moindre mouvement visible de respiration.</p>';if((s.flags.flankingSoldiers||0)>0)h+='<p>Un mouvement attire ton regard de l’autre côté du village.</p><p>Des visages apparaissent entre les feuilles.</p><p><strong>Les '+String(s.flags.flankingSoldiers)+' soldat'+(s.flags.flankingSoldiers>1?'s':'')+' envoyés autour de l’île ont trouvé un autre passage.</strong></p><p>Tu lèves lentement la main. L’un d’eux te voit et répond au signe.</p><p>Vous pouvez agir des deux côtés.</p>';return h;},choices:s=>[{label:'Avancer dans le village pour comprendre ce qui se passe',to:'villageWalkIn'},{label:(s.flags.flankingSoldiers||0)>0?'Attaquer immédiatement de façon coordonnée':'Attaquer immédiatement le village',to:'villageAssault'},{label:'Attendre la nuit pour agir',to:'villageNight'}]},

villageWalkIn:{title:'Entrer à découvert',text:s=>{let h='<p>Tu ranges ton arme et quittes lentement la couverture des arbres.</p><p>Les premiers hommes pâles vous observent avec surprise, mais personne ne vous attaque.</p><p>On vous laisse avancer jusqu’au centre du village.</p><p>Un homme plus âgé vient à votre rencontre. Son regard reste calme.</p>';if(s.flags.skullRing){h+='<p>Les hommes continuent de s’approcher calmement.</p><p>Soudain, l’un d’eux aperçoit la bague au crâne et interpelle les autres.</p><p>Le groupe s’immobilise.</p><p>Un long moment d’hésitation passe entre eux. Les regards se croisent. Plusieurs visages se crispent.</p><p>Ils ne semblent plus savoir comment agir.</p><p>Tu dois réagir vite.</p>';return h;}return h+'<p>Quelque chose de froid vient alors se poser contre ton cou.</p><p>Tu n’as pas le temps de réagir.</p><p>Tes jambes cessent de te porter.</p><p>Les voix s’éloignent.</p><p>Tes yeux se ferment.</p><p>Noir.</p><div class="ending">FIN DE L’AVENTURE</div>';},onEnter:s=>{if(!s.flags.skullRing)s.hp=0;},choices:s=>s.flags.skullRing?[{label:'Les attaquer immédiatement',to:'villageAssault'},{label:'Leur tendre la bague pour la rendre',to:'villageRingReturn'},{label:'Lever la bague bien haut au-dessus de toi',to:'villageRingDominance'}]:[{label:'Recommencer',action:'restart'}]},



villageRingReturn:{title:'Rendre la bague',text:'<p>Tu avances lentement la main et leur présentes la bague, comme pour la rendre.</p><p>La tension semble retomber presque aussitôt.</p><p>Plusieurs hommes baissent leurs armes.</p><p>Le vieil homme s’approche et récupère la bague sans un mot.</p><p>Pendant une seconde, tu crois avoir désamorcé la situation.</p><p>Puis tout bascule.</p><p>Tu comprends trop tard que la bague était la seule chose qui les faisait hésiter.</p><p>Noir.</p><div class="ending">FIN DE L’AVENTURE</div>',onEnter:s=>{if(s.inventory?.bague_crane)delete s.inventory.bague_crane;s.flags.skullRing=false;s.hp=0;},choices:[{label:'Recommencer',action:'restart'}]},

villageRingDominance:{title:'Lever la bague',text:'<p>Tu lèves la bague bien haut au-dessus de ta tête.</p><p>La réaction est immédiate.</p><p>Les hommes pâles se figent, totalement déconcertés. Plusieurs baissent leurs armes. D’autres regardent leurs voisins comme s’ils attendaient un ordre qui ne vient pas.</p><p>Un silence pesant s’installe.</p><p>Au fond de la place, tu distingues une construction fermée par de lourds barreaux métalliques.</p><p>Tu dois profiter de leur hésitation.</p>',choices:s=>{const out=[{label:'Avancer vers la prison pour délivrer les prisonniers',to:'ringPrisonApproach'}];if((s.soldiers||0)>0)out.push({label:'Faire signe à tes hommes de les tuer',to:'ringKillThree'});return out;}},

ringPrisonApproach:{title:'Vers les barreaux',text:'<p>Tu gardes la bague levée et avances vers la prison.</p><p>Les hommes pâles vous laissent passer, encore trop déconcertés pour réagir.</p><p>Derrière les lourds barreaux, des silhouettes se redressent.</p><p>Ce sont les derniers marins du Providence.</p><p>Ils sont amaigris, couverts de blessures et visiblement épuisés.</p><p>Mais lorsqu’ils te reconnaissent, leurs visages changent.</p><p>Pour la première fois depuis votre arrivée, tu vois de l’espoir dans leurs yeux.</p>',choices:[{label:'Atteindre la cage',to:'ringPrisonRevolt'}]},

ringPrisonRevolt:{title:'La supercherie',text:'<p>Tu n’es plus qu’à quelques pas de la cage lorsqu’un cri éclate derrière toi.</p><p>Un des hommes pâles fixe la bague.</p><p>Puis ton visage.</p><p>Quelque chose vient de changer dans son regard.</p><p>Les autres comprennent à leur tour.</p><p>La bague ne t’appartient pas.</p><p>Elle a été volée.</p><p>Leur hésitation disparaît d’un seul coup. Les armes se lèvent autour de vous.</p><p>Le village entier se soulève.</p>',onEnter:s=>{s.flags.ringFraudDiscovered=true;},choices:[{label:'Se défendre',to:'villageAssault'}]},

ringKillThree:{title:'Profiter de leur hésitation',text:'<p>Tu fais un signe bref à tes hommes.</p><p>Ils comprennent immédiatement.</p><p>Trois hommes pâles tombent avant que le reste du groupe réalise ce qui se passe.</p><p>Puis un cri retentit.</p><p>La confusion disparaît.</p><p>Les hommes pâles saisissent leurs armes et se jettent sur vous.</p><p>La bataille générale commence, mais ils sont déjà trois de moins.</p>',onEnter:s=>{s.flags.paleAssaultLoss=3;s.flags.ringFraudDiscovered=true;},choices:[{label:'Combattre',to:'villageAssault'}]},

villageAssault:{title:'Donner l’assaut',text:s=>villageAssaultHtml(s),onEnter:s=>{if(!s.flags.villageTime)s.flags.villageTime='day';initVillageAssault(s);},choices:s=>villageAssaultChoices(s)},

villageRetreat:{title:'Le repli',noImage:true,text:s=>{let h='<p>Il ne reste plus personne pour tenir la ligne.</p><p>Les hommes pâles se tournent vers toi.</p><p>Tu recules de quelques pas, puis tu cours.</p><p>Tu t’enfonces dans la forêt sans regarder derrière toi. Des cris s’élèvent dans ton dos. Des branches craquent. Ils te poursuivent.</p><p>Tu quittes le sentier, descends une pente couverte de racines et te glisses derrière un énorme rocher.</p><p>Là, presque invisible dans un renfoncement de pierre, tu te plaques contre la roche.</p><p>Les bruits se rapprochent.</p><p>Des pas passent à quelques mètres de toi.</p><p>Puis s’éloignent.</p><p>Tu restes immobile. Longtemps.</p>';if(s.flags.villageTime==='night')h+='<p>Lorsque tu oses enfin bouger, la forêt est toujours plongée dans l’obscurité. Seules quelques lueurs du village apparaissent entre les arbres.</p>';else h+='<p>Lorsque tu oses enfin bouger, la lumière a presque disparu entre les arbres.</p><p>La nuit tombe sur l’île.</p>';return h;},choices:s=>[{label:s.flags.villageTime==='night'?'Attendre que les poursuivants s’éloignent':'Attendre que la nuit soit complète',to:'villageRetreatNight'}]},

villageRetreatNight:{title:'La nuit',noImage:true,text:'<p>La forêt est désormais plongée dans l’obscurité.</p><p>Au loin, quelques lueurs apparaissent entre les arbres. Le village des hommes pâles est toujours là.</p><p>Tu es seul.</p><p>Mais ils ignorent où tu te trouves.</p><p>Tu dois décider de ce que tu vas faire avant le lever du jour.</p>',onEnter:s=>{s.flags.villageTime='night';},choices:s=>[
  {label:'S’approcher discrètement du camp',to:'villageNightGuard1'},
  {label:'Tenter de fuir l’île à la nage',to:'villageNightSwim'},
  {label:'Fouiller l’île en espérant trouver quelque chose qui puisse t’aider',to:'villageNightSearch'}
]},

villageNightSwim:{title:'La traversée',noImage:true,text:'<p>L’autre île est très loin.</p><p>Mais tu as peut-être une chance de l’atteindre avant d’être totalement épuisé.</p><p>Sur la plage, tu retires tout ce qui pourrait gêner tes mouvements. Tu abandonnes ton équipement le plus lourd, puis tu entres dans l’eau.</p><p>Le froid te saisit immédiatement.</p><p>Tu commences à nager.</p><p>Au début, tout se passe bien. La mer est calme et tu progresses régulièrement vers la masse sombre de l’autre île.</p><p>Puis quelque chose change.</p><p>Un remous d’une puissance incroyable se forme sous toi.</p><p>Ton corps est brutalement projeté sur le côté, puis dans l’autre sens, comme si toute la mer se mettait à bouger sous tes jambes.</p><p>Tu t’arrêtes une fraction de seconde.</p><p>Ta jambe se bloque net.</p><p>Quelque chose d’épais et de souple vient de s’enrouler autour de ta cheville.</p><p>Tu n’as pas le temps de reprendre ton souffle.</p><p>Une tentacule gigantesque t’arrache vers le fond.</p><p>La surface disparaît au-dessus de toi.</p><div class="ending">FIN DE L’AVENTURE</div>',onEnter:s=>{s.hp=0;},choices:[{label:'Recommencer',action:'restart'}]},

villageNightGuard1:{title:'Aux abords du village',noImage:true,text:s=>(s.flags.returnFromCliff?'<p>Tu descends de la crête derrière les dernières huttes.</p><p>La prison est proche, mais une silhouette se tient entre vous et les premiers bâtiments.</p>':'<p>Tu progresses lentement entre les arbres.</p><p>À cette heure, le village est presque silencieux. Quelques feux brûlent encore entre les habitations.</p><p>Une silhouette se tient à l’écart.</p>')+'<p>Un homme pâle.</p><p>Seul.</p><p>Il monte la garde.</p><p>Tu peux tenter de t’approcher suffisamment pour le neutraliser avant qu’il ne donne l’alerte.</p>'+nightGuardResultHtml(s,1),choices:s=>{const r=s.flags.nightGuard1;if(!r?.resolved){const out=[{label:'Tenter de neutraliser le garde — test de Dextérité',stay:true,inlineCombat:true,effect:x=>nightGuardAttempt(x,1)}];if(!s.flags.returnFromCliff)out.push({label:'Faire demi-tour et tenter de fuir l’île à la nage',to:'villageNightSwim'});return out;}if(!r.success)return[{label:'Le village est alerté — combattre',to:'villageNightFight'}];const b=initVillageAssault(s);if(b.enemy<=0)return[{label:'Continuer',to:'villageNightAftermath'}];return[{label:'Continuer vers le village',to:'villageNightGuard2'}];}},

villageNightGuard2:{title:'Le second garde',noImage:true,text:s=>'<p>Tu laisses le premier garde derrière toi et continues vers le centre du village.</p><p>Tu n’as parcouru que quelques mètres lorsqu’une deuxième silhouette apparaît entre deux bâtiments.</p><p>Un autre garde.</p><p>Il ne t’a pas encore vu.</p>'+nightGuardResultHtml(s,2),choices:s=>{const r=s.flags.nightGuard2;if(!r?.resolved)return[{label:'Tenter de neutraliser le second garde — test de Dextérité',stay:true,inlineCombat:true,effect:x=>nightGuardAttempt(x,2)}];if(!r.success)return[{label:'Le village est alerté — combattre',to:'villageNightFight'}];const b=initVillageAssault(s);if(b.enemy<=0)return[{label:'Continuer',to:'villageNightAftermath'}];return[{label:'Attaquer les survivants de front',to:'villageNightFight'}];}},

villageNightFight:{title:'Le combat dans le village',noImage:true,text:s=>nightVillageFightHtml(s),choices:s=>nightVillageFightChoices(s)},

villageNightSearch:{title:'Fouiller l’île',noImage:true,text:s=>{if(s.flags.caveVisitedDay)return '<p>Tu parcours les sentiers, les plages et les hauteurs de l’île.</p><p>Rien.</p><p>Tu ne trouves ni embarcation, ni passage caché, ni autre refuge.</p><p>Une idée finit par s’imposer.</p><p>La grotte que tu as visitée plus tôt.</p><p>Tu n’avais pas eu le temps d’en examiner chaque recoin.</p><p>Tu retournes vers l’ouverture rocheuse découverte plus tôt.</p>';return '<p>Tu décides de rester loin du village.</p><p>Si quelque chose peut encore t’aider, tu dois le trouver avant le lever du jour.</p><p>Tu parcours l’île dans l’obscurité pendant de longues minutes.</p><p>Entre deux parois rocheuses, tu finis par apercevoir une ouverture sombre.</p><p>Une grotte, presque invisible entre les rochers.</p>';},choices:s=>{const out=[{label:s.flags.caveVisitedDay?'Retourner fouiller la grotte':'Entrer dans la grotte',to:'villageNightCave'}];if(s.flags.caveVisitedDay){out.push({label:'Tenter de fuir l’île à la nage',to:'villageNightSwim'},{label:'Attaquer le village de front',to:'villageNightFight'});}return out;}},

villageNightCave:{title:'Le sanctuaire dans la nuit',noImage:true,text:s=>{if(s.flags.captivePursued)return captivePursuitHtml(s);if(s.flags.caveVisitedDay)return '<p>Tu retrouves la salle des fresques découverte plus tôt.</p><p>Dans l’obscurité, elle semble différente.</p><p>Un courant d’air froid vient d’un passage que tu n’avais pas remarqué derrière les amas de vêtements et d’équipement.</p><p>Plus loin, quelque chose émet par instants une faible lueur bleue.</p><p>La grotte continue beaucoup plus profondément que tu ne l’imaginais.</p>';return '<p>Tu avances dans la grotte à tâtons.</p><p>Les parois deviennent régulières, puis des marches taillées dans la roche te conduisent jusqu’à une salle couverte de fresques.</p><p>Des navires y sont attirés vers l’île. Des prisonniers sont conduits vers la mer. Des navires repartent ensuite sans équipage.</p><p>Au pied des peintures s’entassent les affaires abandonnées de marins et de flibustiers.</p><p>Derrière cet amas, un passage descend encore dans la roche.</p><p>Une faible lueur bleue apparaît puis disparaît au loin.</p>';},onEnter:s=>{s.flags.caveTruth=true;s.flags.caveVisitedNight=true;if(s.flags.capturedRoute)s.flags.villageTime='night';},choices:[{label:'S’enfoncer dans la partie profonde de la grotte',to:'deepCaveFork'}]},

villageNightAftermath:{title:'Après le silence',noImage:true,text:s=>{if(s.flags.freedAtNight){let h='<p>Le village est enfin silencieux.</p><p>Tu rejoins la construction aux lourds barreaux aperçue plus tôt.</p><p>Derrière la grille, les derniers marins du Providence comprennent peu à peu que leurs gardiens ne reviendront pas.</p><p>Tu forces la serrure et les fais sortir.</p>';if(s.flags.haleRescuedFromCage)h+='<p><strong>Hale est toujours vivant. Il sort de la cage et te rejoint.</strong></p>';if((s.flags.capturedSoldiersRecovered||0)>0)h+='<p><strong>Tes '+String(s.flags.capturedSoldiersRecovered)+' soldat'+(s.flags.capturedSoldiersRecovered>1?'s capturés sont':' capturé est')+' également libéré'+(s.flags.capturedSoldiersRecovered>1?'s':'')+'.</strong></p>';h+='<p>La plupart des marins sont trop faibles pour se battre, mais <strong>trois marins</strong> sont encore capables de marcher et de tenir une arme. Ils restent avec toi.</p>';return h;}if(s.flags.cliffPrisonFreed)return '<p>Le village est enfin silencieux.</p><p>La cage que tu as ouverte juste avant le combat est maintenant vide.</p><p>Les prisonniers les plus faibles ont profité de l’affrontement pour gagner la forêt et se mettre à l’abri.</p><p>Hale, tes soldats survivants et les marins du Providence encore capables de se battre se regroupent avec toi au milieu du village.</p>';if(s.flags.captivePrisonersEscaped)return '<p>Le village est enfin silencieux.</p><p>La cage ouverte plus tôt est vide. Les prisonniers se sont dispersés dans la forêt pendant la confusion.</p><p>Les marins du Providence restés avec toi savent que plusieurs des leurs sont encore cachés sur l’île.</p><p>Vous décidez de ne pas tenter la mer avant le jour.</p>';return '<p>Le village est enfin silencieux.</p><p>La prison est déjà ouverte. Les marins du Providence libérés plus tôt se regroupent comme ils le peuvent autour de toi.</p>';},onEnter:s=>resolveVillageNightAftermath(s),choices:s=>needsVictoryRescueAct(s)?[{label:'Faire le point avec les rescapés',to:'victoryMissingSailors'}]:[{label:'Attendre le lever du jour',to:'villageDawnRegroup'}]},

villageAssaultVictory:{title:'Les derniers marins du Providence',text:s=>{const b=initVillageAssault(s);let h=b.enemyFled?'<p>Les hommes pâles encore debout ont disparu dans la forêt. Aucun ne revient défendre le village.</p>':'<p>Le combat est terminé. Plus aucun homme pâle ne se dresse devant vous.</p>';if(s.flags.providenceSailorsFreed){h+='<p>La prison a déjà été ouverte plus tôt. Les marins du Providence encore capables de marcher se regroupent avec vous.</p>';}else{h+='<p>Vous rejoignez maintenant la cage et attaquez la serrure. Après plusieurs coups, la lourde porte métallique finit par céder.</p><p>Derrière les barreaux se trouvent les derniers matelots du Providence.</p><p>Ils sont affamés, blessés et épuisés.</p>';if(s.flags.haleRescuedFromCage)h+='<p><strong>Hale sort de la cage et te rejoint.</strong></p>';if((s.flags.capturedSoldiersRecovered||0)>0)h+='<p><strong>Tes '+String(s.flags.capturedSoldiersRecovered)+' soldat'+(s.flags.capturedSoldiersRecovered>1?'s capturés sont':' capturé est')+' également libéré'+(s.flags.capturedSoldiersRecovered>1?'s':'')+'.</strong></p>';h+='<p>La plupart ne peuvent pas combattre, mais <strong>trois marins</strong> sont encore capables de marcher et de tenir une arme. Ils rejoignent ton groupe.</p>';}if(!needsVictoryRescueAct(s))h+='<p>Le soleil descend déjà. Entre les hommes épuisés, les blessés et la mer qui entoure l’île, repartir immédiatement serait imprudent.</p><p>Vous barricadez les constructions les plus solides et organisez les soins.</p><p>Vous attendrez le lever du jour pour décider comment quitter l’île.</p>';return h;},onEnter:s=>resolveVillageAssaultVictory(s),choices:s=>needsVictoryRescueAct(s)?[{label:'Faire le point avec les rescapés',to:'victoryMissingSailors'}]:[{label:'Passer la nuit à l’abri',to:'villageDawnRegroup'}]},

villageDawnRegroup:{title:'Au lever du jour',noImage:true,text:s=>{const marines=providenceMarinesWithParty(s);let h='<p>Une lumière grise finit par apparaître au-dessus de la mer.</p><p>Pour la première fois depuis votre arrivée sur l’île, personne ne vous poursuit.</p>';if(haleWithParty(s))h+='<p>Hale est toujours à tes côtés.</p>';else h+='<p>Hale n’est plus avec toi.</p>';if(marines>0)h+='<p><strong>'+String(marines)+' marin'+(marines>1?'s du Providence restent':' du Providence reste')+' en état de t’accompagner.</strong></p>';if((s.soldiers||0)>0)h+='<p>Tes <strong>'+String(s.soldiers)+' soldat'+(s.soldiers>1?'s survivants se regroupent':' survivant se regroupe')+'</strong> également près de la plage.</p>';h+='<p>Les autres rescapés sont blessés ou épuisés, mais ils sont libres.</p>';if(s.flags.secretCliffFound)h+='<p>Tu connais maintenant une sortie : le vieux bateau amarré sous la falaise.</p>';else if(needsVictoryRescueAct(s))h+='<p>Avant de chercher comment quitter l’île, il reste encore à retrouver les marins du Providence emmenés vers les rochers.</p>';else h+='<p>Vous savez que la grotte se prolonge vers la falaise. Il reste à suivre ce passage jusqu’à la mer et à trouver un moyen d’évacuer tout le monde.</p>';return h;},onEnter:s=>resolveVillageDawn(s),choices:s=>{if(s.flags.secretCliffFound)return[{label:'Conduire les rescapés jusqu’au bateau',to:'collectiveCliffEvacuation'}];if(needsVictoryRescueAct(s))return[{label:'Rechercher les marins manquants',to:'victoryMissingSailors'}];return[{label:'Retourner dans la grotte et chercher une sortie',to:'victoryCliffPassage'}];}},

villageNight:{title:'Attendre la nuit',text:s=>'<p>Vous restez cachés jusqu’à la disparition complète du soleil.</p><p>Peu à peu, les feux s’éteignent dans le village.</p><p>Les hommes pâles regagnent leurs huttes.</p><p>Deux sentinelles seulement restent visibles.</p>'+((s.flags.flankingSoldiers||0)>0?'<p>De l’autre côté, tu aperçois parfois le reflet discret d’une lame : l’autre groupe est toujours en position.</p>':'')+'<p>Vous attendez encore.</p><p>Le moment venu, chaque combattant de ton groupe progressera sans bruit. Chacun lancera un dé. <strong>Sur 1, 2, 3 ou 4, un homme pâle est neutralisé. Sur 5 ou 6, l’attaque échoue et l’alerte est donnée.</strong></p>',onEnter:s=>{s.flags.villageTime='night';},choices:[{label:'Lancer l’assaut',to:'villageNightResult',effect:s=>resolveNightRaid(s)}]},

villageNightResult:{title:'Dans le silence',text:s=>{normalizeNightRaidResult(s);const b=initVillageAssault(s);let h='<p>Les silhouettes se mettent en mouvement.</p>';if((s.flags.nightRaidRolls||[]).length)h+='<p>Jets du groupe : '+s.flags.nightRaidRolls.map(v=>'<strong>'+v+'</strong>').join(' · ')+'.</p>';else h+='<p>Tu n’as personne à envoyer en avant.</p>';h+='<p>'+String(s.flags.nightRaidKills||0)+' homme'+((s.flags.nightRaidKills||0)>1?'s pâles sont neutralisés':' pâle est neutralisé')+' dans les premières secondes.</p>';if((s.flags.nightRaidAlerts||0)===0)h+='<p>Aucun cri. Le village dort encore.</p>';else if(s.flags.nightRaidAlerts===1)h+='<p>Un seul homme parvient à pousser un cri avant de tomber. Une lumière s’allume dans une hutte.</p>';else h+='<p><strong>'+String(s.flags.nightRaidAlerts)+' alertes éclatent presque en même temps.</strong> Des portes s’ouvrent dans tout le village.</p>';if(b.enemy<=0)h+='<p>Plus aucun homme pâle ne se montre.</p>';else h+='<p>Il en reste <strong>'+String(b.enemy)+'</strong> capables de se battre.</p>';return h;},choices:s=>{const b=initVillageAssault(s);if(b.enemy<=0)return[{label:'Rejoindre la prison',to:'villageNightAftermath'}];return[{label:'Poursuivre l’attaque',to:'villageAssault'}];}},

c68:{title:'La cage',text:'<p>On vous enferme dans une grande cage faite de poutres de navires et de barreaux récupérés sur plusieurs navires.</p><p>À l’intérieur, des habitants du village voisin se serrent contre les parois.</p><p>Avec eux se trouvent plusieurs hommes portant encore les vêtements du Providence.</p><p>L’un d’eux reconnaît immédiatement ton uniforme.</p><blockquote>« Lieutenant... vous nous avez retrouvés. »</blockquote><p>Sa joie ne dure qu’une seconde.</p><p>Un homme pâle passe devant la cage.</p><p>Il porte une vieille veste du Providence.</p><p>Le marin près de toi devient livide.</p><blockquote>« Je le connais. »</blockquote><p>L’homme pâle s’arrête.</p><p>Il tourne lentement la tête vers la voix.</p><p>Dans l’ombre, ses yeux prennent un reflet bleu.</p><p>Mais son visage ne montre aucune reconnaissance.</p>',choices:[{label:'Demander au marin ce qu’il sait',to:'c69'}]},

c69:{title:'Ceux qui reviennent',text:'<p>Le marin attend que le garde se soit éloigné.</p><blockquote>« Il était des nôtres. Ils l’ont emmené il y a quatre nuits. »</blockquote><p>Tu lui demandes comment il peut en être certain.</p><blockquote>« Sa veste. Sa cicatrice à la joue. Sa façon de marcher. C’est lui. »</blockquote><p>Il baisse encore la voix.</p><blockquote>« Mais il ne me reconnaît plus. Il ne parle plus. Je ne l’ai jamais vu dormir. »</blockquote><p>Depuis leur capture, les hommes pâles viennent chercher quelques prisonniers chaque nuit.</p><p>Certains ne reviennent jamais.</p><p>D’autres réapparaissent plusieurs jours plus tard parmi les gardes.</p><p>La peau blanchie.</p><p>Le regard vide.</p><p>Et cette lueur bleue dans les yeux.</p><p>Le soleil disparaît derrière les arbres.</p><p>Autour de la cage, les torches commencent à s’allumer.</p>',choices:[{label:'Attendre et voir ce qu’ils font des prisonniers',to:'captiveTransfer'},{label:'Préparer les prisonniers à attaquer dès que la cage s’ouvrira',to:'captiveAmbush'}]},

captiveAmbush:{title:'À l’ouverture de la cage',noImage:true,text:s=>{if(!s.flags.captiveAmbushRolled)return '<p>Tu expliques ton plan à voix basse.</p><p>Lorsque les gardes ouvriront, il faudra agir avant qu’ils comprennent.</p><p>Hale se place près de la porte. Deux marins du Providence se rapprochent derrière lui.</p><p>Des pas approchent.</p><p>La serrure tourne.</p><p>Tu n’auras qu’une seconde.</p>';let h=diceResultHtml(s);if(s.flags.captiveAmbushSuccess){h+='<p>Au moment où la porte s’ouvre, tu frappes le premier garde et lui arraches son sabre.</p><p>Hale et les prisonniers se jettent à leur tour vers l’ouverture.</p><p>Un homme pâle tente de te barrer le passage. Tu le repousses et aperçois une faille sombre entre deux rochers derrière les huttes.</p><p>Tu n’as qu’une seconde.</p><p>Tu t’y engouffres et cours sans te retourner.</p>';return h;}h+=damageResultHtml(s,'captiveAmbush')+'<p>Tu bouges une fraction de seconde trop tard.</p><p>Une crosse te frappe contre les barreaux et le mouvement des prisonniers s’effondre avant même d’avoir commencé.</p><p>Les gardes referment la porte.</p><p>Quelques heures plus tard, ils reviennent.</p><p>Cette fois, ils te désignent directement.</p>';return h;},choices:s=>!s.flags.captiveAmbushRolled?[{label:'Attaquer à l’ouverture — Dextérité',stay:true,diceTest:true,effect:x=>resolveCaptiveAmbush(x)}]:s.hp<=0?[{label:'La fin du voyage',to:'death'}]:s.flags.captiveAmbushSuccess?[{label:'Courir dans la faille',to:'captiveSoloFlight'}]:[{label:'Se laisser emmener',to:'captiveTransfer'}]},

captiveTransfer:{title:'Choisis parmi les prisonniers',noImage:true,text:'<p>La nuit est complètement tombée lorsqu’un groupe d’hommes pâles arrive devant la cage.</p><p>Ils n’échangent presque aucun mot.</p><p>Un doigt te désigne.</p><p>Puis Hale.</p><p>Puis un marin du Providence.</p><p>La porte s’ouvre.</p><p>On vous lie les poignets derrière le dos et on vous entraîne hors du village.</p><p>Sur le chemin, une silhouette vous croise.</p><p>Le marin du Providence s’arrête net.</p><blockquote>« C’est lui... »</blockquote><p>L’homme pâle porte les restes d’un uniforme de son équipage.</p><p>Il tourne la tête.</p><p>Ses yeux brillent faiblement dans l’obscurité.</p><p>Il passe à côté de vous sans ralentir.</p>',choices:[{label:'Continuer jusqu’à leur destination',to:'captiveRitual'}]},

captiveRitual:{title:'Sous la roche',noImage:true,text:'<p>On vous conduit jusqu’à une ouverture basse dans la falaise.</p><p>À l’intérieur, l’air est froid et chargé d’embruns.</p><p>Le long des parois s’entassent les affaires retirées aux prisonniers : bottes, manteaux, sabres, mousquets, ceinturons et sacs provenant d’innombrables équipages.</p><p>Plus loin, quelque chose frappe lentement contre la roche.</p><p>Pas comme une vague.</p><p>Comme quelque chose d’immense qui bougerait sous l’eau.</p><p>Soudain, tout le sol tremble.</p><p>Les flammes vacillent.</p><p>Les hommes pâles se figent.</p><p>Plusieurs tombent à genoux en regardant vers les profondeurs de la grotte.</p><p>Un second grondement monte sous vos pieds.</p><p>Le marin du Providence se débat. Hale tourne la tête vers toi.</p><p>Une lampe tombe et s’éteint.</p><p>Dans l’obscurité, tu sens une arête de pierre contre tes liens.</p><p>C’est peut-être votre seule occasion.</p>',choices:[{label:'Tenter de vous échapper — Dextérité',to:'captiveFreeCompanions'}]},

captiveFreeCompanions:{title:'La première chance',noImage:true,text:s=>{if(!s.flags.captiveCompanionRescueRolled)return '<p>Tu frottes tes liens contre l’arête de pierre pendant que l’obscurité couvre encore la salle.</p><p>Hale et le marin du Providence sont à quelques pas.</p><p>Les hommes pâles commencent déjà à se relever.</p><p>Il faut te libérer, atteindre Hale et disparaître dans le passage avant qu’une torche ne soit rallumée.</p>';let h=diceResultHtml(s);if(s.flags.captiveCompanionRescueSuccess){h+='<p>La corde cède.</p><p>Tu libères Hale. Il se jette aussitôt sur les liens du marin pendant que tu récupères un sabre dans le tas d’équipement.</p><p>Quelques secondes plus tard, vous vous engouffrez tous les trois dans un passage latéral.</p><p>Derrière vous, une torche se rallume.</p><p>Un cri éclate.</p><p>Ils vous ont vus.</p><p>Des pas se lancent à votre poursuite dans la galerie.</p>';return h;}h+='<p>La corde ne cède pas assez vite.</p><p>Une torche se rallume juste au-dessus de toi.</p><p>Les hommes pâles vous saisissent avant que tu puisses atteindre Hale.</p><p>On vous sépare.</p><p>Le marin du Providence est emmené le premier derrière une paroi de roche.</p><p>Tu entends un bref cri, puis plus rien.</p><p>Quelques minutes plus tard, ils reviennent pour toi et Hale.</p><p>Vous êtes conduits dans une pièce plus profonde.</p><p>Tu comprends que tu n’auras plus qu’une seule occasion.</p>';return h;},choices:s=>!s.flags.captiveCompanionRescueRolled?[{label:'Tenter de se libérer — Dextérité',stay:true,diceTest:true,effect:x=>resolveCaptiveCompanionRescue(x)}]:s.flags.captiveCompanionRescueSuccess?[{label:'Fuir plus profondément dans la grotte',to:'villageNightCave',effect:x=>{x.flags.capturedRoute=true;x.flags.captivePursued=true;x.flags.villageTime='night';}}]:[{label:'Continuer dans la pièce suivante',to:'captiveSecondEscape'}]},

captiveSecondEscape:{title:'La dernière chance',noImage:true,text:s=>{if(!s.flags.captiveSecondEscapeRolled)return '<p>La pièce est plus étroite et presque entièrement plongée dans l’obscurité.</p><p>Hale est à genoux contre la paroi, les poignets toujours liés.</p><p>Deux hommes pâles gardent l’entrée.</p><p>Sur le sol, près de ta botte, un éclat de métal dépasse d’une vieille planche arrachée à un navire.</p><p>Tu parviens à le saisir du bout des doigts.</p><p>Si tu échoues cette fois, il n’y aura pas de troisième tentative.</p>';let h=diceResultHtml(s);if(s.flags.captiveSecondEscapeSuccess){h+='<p>Le métal tranche enfin la corde.</p><p>Tu te redresses d’un bond, frappes le premier garde avec la chaîne de tes liens et arraches un sabre posé contre la paroi.</p><p>Hale se libère à son tour dans la confusion.</p><p>Vous plongez dans un passage étroit avant que les autres puissent vous couper la route.</p><p>Des cris éclatent derrière vous.</p>';return h;}h+='<p>Le métal glisse de tes doigts et tombe sur la pierre.</p><p>Le bruit suffit.</p><p>Les deux gardes se retournent.</p><p>Cette fois, personne ne vous laisse une nouvelle chance.</p><p>Le dernier son que tu entends est Hale qui crie ton nom.</p><div class="ending">FIN DE L’AVENTURE</div>';return h;},choices:s=>!s.flags.captiveSecondEscapeRolled?[{label:'Tenter une dernière fois — Dextérité',stay:true,diceTest:true,effect:x=>resolveCaptiveSecondEscape(x)}]:s.flags.captiveSecondEscapeSuccess?[{label:'Fuir dans les profondeurs',to:'villageNightCave',effect:x=>{x.flags.capturedRoute=true;x.flags.captivePursued=true;x.flags.villageTime='night';}}]:[{label:'Recommencer',action:'restart'}]},

deepCaveFork:{title:'Deux passages',noImage:true,text:'<p>Le couloir descend jusqu’à une cavité où la roche se sépare en deux passages.</p><p>À gauche, une lueur bleue très faible pulse par instants au fond de la galerie.</p><p>À droite, tu entends de l’eau couler dans l’obscurité.</p><p>Puis un murmure traverse la grotte.</p><p>Tu ne comprends aucun mot.</p><p>Pourtant, pendant une seconde, tu as l’impression qu’il prononce ton nom.</p>',choices:[{label:'Suivre la lueur bleue',to:'deepCaveRevenant'},{label:'Suivre le bruit de l’eau',to:'deepCaveFlooded'}]},

deepCaveRevenant:{title:'Celui qui ne respire plus',noImage:true,text:s=>'<p>La lueur vient d’une petite chambre naturelle.</p><p>Un homme se tient debout au milieu.</p><p>Il porte les restes d’un uniforme de marin mangé par le sel.</p><p>Ses vêtements sont trempés alors qu’aucune eau ne tombe du plafond.</p><p>Sa peau a la couleur de la cire.</p><p>Ses yeux diffusent un reflet bleu beaucoup plus net que ceux des hommes du village.</p><p>Il te regarde.</p><p>Sa poitrine ne bouge pas.</p><p>Sa bouche s’ouvre lentement.</p><p>Aucun son n’en sort.</p><p>Puis il se jette sur toi.</p>'+(s.flags.deepCaveHaleAssist?'<p>Hale réagit avant toi. Son sabre frappe la créature à l’épaule et la repousse contre la roche. <strong>Son intervention lui a déjà infligé 3 dégâts.</strong></p>':'')+fightHtml(s,'deepCaveRevenant',DROWNED_SAILOR),onEnter:s=>prepareDeepCaveRevenant(s),choices:s=>{const f=s.combats?.deepCaveRevenant;if(s.hp<=0)return[{label:'La fin du voyage',to:'death'}];if(f&&f.hp<=0)return[{label:'Continuer au-delà de la chambre',to:'deepCaveSanctum'}];return standardFightChoices(s,'deepCaveRevenant',DROWNED_SAILOR,{label:'La fin du voyage',to:'death'},{label:'Continuer au-delà de la chambre',to:'deepCaveSanctum'});}},

deepCaveFlooded:{title:'Le passage noyé',noImage:true,text:s=>{if(!s.flags.deepCaveFloodedRolled)return '<p>Le passage descend rapidement.</p><p>L’eau te monte aux chevilles, puis aux genoux.</p><p>Elle est glacée.</p><p>Plus loin, la galerie se resserre et le courant devient brutalement plus fort.</p><p>Quelque chose remue sous la surface derrière toi.</p><p>Tu dois franchir les quelques mètres suivants avant que le niveau ne monte davantage.</p>';let h=diceResultHtml(s);if(s.flags.deepCaveFloodedDex)h+='<p>Tu trouves des prises dans la roche et traverses avant que le courant ne puisse t’emporter.</p>';else h+=damageResultHtml(s,'deepCaveFlooded')+'<p>Le courant te plaque contre la paroi et te fait heurter violemment la roche, mais tu parviens à te dégager.</p>';h+='<p>De l’autre côté, le passage remonte vers une salle parfaitement sèche.</p>';return h;},choices:s=>!s.flags.deepCaveFloodedRolled?[{label:'Traverser — Dextérité',stay:true,diceTest:true,effect:x=>resolveDeepCaveFlooded(x)}]:s.hp<=0?[{label:'La fin du voyage',to:'death'}]:[{label:'Entrer dans la salle',to:'deepCaveSanctum'}]},

deepCaveSanctum:{title:'Le cœur de la grotte',noImage:true,text:'<p>La salle est ronde et étrangement lisse.</p><p>Au centre, une petite plate-forme de pierre domine un bassin d’eau noire.</p><p>Rien ne tombe du plafond.</p><p>Pourtant, la surface du bassin se soulève lentement à intervalles réguliers.</p><p>Comme une respiration.</p><p>La face de la plate-forme est sculptée d’une créature marine au corps massif entouré d’une multitude de tentacules.</p><p>Sur la paroi derrière elle, un ancien relief montre plusieurs silhouettes humaines agenouillées. Leurs yeux ont été incrustés de petites pierres bleues. Toutes sont tournées vers cette effigie taillée dans la roche.</p><p>À l’écart du groupe, une silhouette de marin reste debout près d’un navire. Un cercle noir est gravé sur son avant-bras. Sous sa coque, la créature passe sans l’attaquer.</p><p>Cette figure n’est pas représentée comme une victime. Elle offre quelque chose aux hommes pâles, puis reprend la mer sous la protection de la créature.</p><p>Le cercle noir n’est donc pas seulement un signe de reconnaissance. Il marque ceux qui participent au piège et obtiennent en retour le droit de naviguer dans ces eaux.</p><p>Lorsque tu t’approches du bassin, les faibles reflets bleus dans la roche disparaissent tous en même temps.</p><p>Le silence devient absolu.</p><p>Derrière la plate-forme, un courant d’air humide passe par une fente suffisamment large pour continuer.</p>',onEnter:s=>{s.flags.caveTruth=true;s.flags.caveVisitedNight=true;s.flags.blackCircleBrotherhood=true;},choices:[{label:'Suivre le passage derrière le sanctuaire',to:'deepCaveCliffPassage'}]},

deepCaveCliffPassage:{title:'Plus loin sous la roche',noImage:true,text:'<p>Le passage monte d’abord doucement, puis devient un long couloir naturel taillé dans une roche noire et humide.</p><p>Par endroits, des marches ont été creusées à même la pierre.</p><p>Plus loin, tu découvres de vieux anneaux de fer scellés dans la paroi.</p><p>Certains sont mangés par le sel. D’autres portent encore des restes de corde.</p><p>Le bruit de l’eau devient de plus en plus présent.</p><p>Pas celui d’une rivière.</p><p>Celui de la mer.</p><p>Un souffle froid traverse soudain la galerie.</p><p>Tu continues.</p><p>Le couloir tourne une dernière fois et une lueur grise apparaît devant toi.</p>',choices:[{label:'Rejoindre l’ouverture',to:'deepCaveCliff'}]},

deepCaveCliff:{title:'La falaise',noImage:true,text:s=>{const group=haleWithParty(s)||providenceMarinesWithParty(s)>0;return '<p>Tu débouches soudain à l’air libre.</p><p>La falaise tombe presque à pic devant toi.</p><p>Le vide s’ouvre au-delà d’une étroite bande de roche humide.</p><p>Le vent te frappe au visage avec une violence inattendue. Un véritable souffle marin remonte de la mer et s’engouffre contre la paroi.</p><p>Tu avances avec précaution jusqu’au bord.</p><p>La roche est irrégulière, friable par endroits, couverte de sel.</p><p>Un mouvement sur le côté te fait te retourner.</p><p>Un homme pâle se tient contre la paroi.</p><p>Il est plus grand que ceux du village, plus large d’épaules, solidement bâti. Ses vêtements délavés et le vieux ceinturon qui lui barre la poitrine évoquent un ancien pirate.</p><p>Il ne recule pas.</p><p>Il garde ce passage.</p><p>La corniche est trop étroite pour le contourner. Sous '+(group?'vos':'tes')+' pieds, certaines plaques de roche bougent déjà sous les rafales.</p><p>Il tire son arme et avance.</p>';},choices:[{label:'Affronter le gardien de la falaise',to:'deepCliffGuardianFight'}]},

deepCliffGuardianFight:{title:'Le gardien de la falaise',noImage:true,text:s=>'<p>Le vent hurle contre la roche pendant que le gardien vient à ta rencontre.</p><p>Un faux pas suffirait à te faire perdre l’équilibre.</p>'+cliffGuardianHtml(s,'deepCliffGuardian'),onEnter:s=>prepareCliffGuardian(s,'deepCliffGuardian'),choices:s=>cliffGuardianChoices(s,'deepCliffGuardian','deepCaveBoat')},

deepCaveBoat:{title:'Sous la falaise',noImage:true,text:'<p>Le gardien ne bouge plus.</p><p>Tu reprends ton souffle et avances jusqu’au bord.</p><p>En te penchant au-dessus du vide, tu aperçois enfin ce que la paroi cachait jusque-là.</p><p>Une étroite anse s’enfonce sous la falaise.</p><p>Un vieux bateau y est amarré, presque invisible depuis le large.</p><p>Sa coque est usée, mais elle flotte encore.</p><p>Plus bas, un courant extrêmement puissant longe la paroi avant de partir droit vers la pleine mer.</p><p>Des anneaux de fer et une vieille échelle permettent de rejoindre l’eau.</p><p>Tu comprends alors comment les navires vides pouvaient réapparaître loin de l’île : ils étaient amenés jusqu’ici, puis abandonnés au courant.</p><p>La mer les entraînait au large.</p><p><strong>L’île mange les marins et recrache les bateaux.</strong></p><p>Le bateau devant toi offre un moyen de quitter l’île.</p><p>Mais au-dessus de l’anse, un étroit sentier longe aussi la crête. De là, les premières huttes du village sont visibles entre les arbres.</p>',onEnter:s=>{s.flags.secretCliffFound=true;},choices:[{label:'Prendre le vieux bateau et quitter l’île maintenant',to:'deepCaveEscapeEnding'},{label:'Suivre la crête pour revenir vers la prison',to:'deepCaveReturnPrison',effect:x=>{x.flags.returnFromCliff=true;x.flags.villageTime='night';}}]},

deepCaveReturnPrison:{title:'Au-dessus du village',noImage:true,text:s=>{const marines=providenceMarinesWithParty(s);const group=haleWithParty(s)||marines>0;let h='<p>Tu renonces au bateau et suis le sentier qui grimpe au-dessus de la falaise.</p><p>Le passage contourne les rochers et rejoint une crête étroite dominant le village.</p><p>Pour la première fois, tu vois clairement la prison depuis l’arrière des huttes.</p><p>Tu n’as pas besoin de repasser par la grotte ni de traverser l’entrée principale du village.</p>';if(haleWithParty(s))h+='<p>Hale reste à quelques pas derrière toi, sabre en main.</p>';if(marines>0)h+='<p>Le marin du Providence qui s’est échappé avec vous vous suit également.</p>';h+='<p>Mais le chemin n’est pas libre pour autant.</p><p>Des gardes circulent encore entre les bâtiments. Si '+(group?'vous parvenez':'tu parviens')+' jusqu’à la cage avant de donner l’alerte, '+(group?'vous pourrez':'tu pourras')+' libérer les prisonniers avant le combat.</p>';return h;},choices:[{label:'Descendre derrière les huttes et approcher de la prison',to:'cliffReturnGuard1'}]},

deepCaveEscapeEnding:{title:'Quitter l’île',noImage:true,text:s=>{const marines=providenceMarinesWithParty(s);const group=haleWithParty(s)||marines>0;let h=group?'<p>Vous descendez jusqu’au bateau et larguez les amarres.</p>':'<p>Tu descends jusqu’au bateau et largues les amarres.</p>';h+='<p>Le courant saisit immédiatement la coque.</p><p>La falaise glisse derrière '+(group?'vous':'toi')+', puis l’île commence à s’éloigner.</p><p>Pendant quelques minutes, personne ne parle.</p><p>Tu es vivant. Tu as trouvé le moyen de quitter cet endroit.</p><p>Mais les lueurs du village sont encore visibles entre les arbres.</p>';if(group)h+='<p>Ceux qui ont réussi à s’échapper avec toi sont sauvés.</p>';h+='<p>Les autres prisonniers, eux, sont toujours sur l’île.</p><p>Tu le sais au moment même où la côte disparaît dans la nuit : tu as survécu, mais tu as abandonné une partie de ta mission derrière toi.</p><div class="ending">FIN DE L’AVENTURE</div>';return h;},choices:[{label:'Recommencer',action:'restart'}]},

victoryMissingSailors:{title:'Trois hommes manquent',text:'<p>Les rescapés se regroupent dans le village pendant que vous comptez les hommes du Providence.</p><p>Un marin recommence le compte une seconde fois, puis une troisième.</p><p>Son visage se ferme.</p><blockquote>« Il en manque trois. »</blockquote><p>Il t’explique qu’ils ont été sortis de la cage peu avant l’attaque et emmenés vers les rochers derrière le village.</p><blockquote>« Ceux qu’ils emmènent là-bas ne reviennent pas toujours. Et quand certains reviennent... ils ne sont plus les mêmes. »</blockquote><p>Il regarde vers la masse sombre de la falaise.</p><blockquote>« Si on attend le matin, il sera peut-être trop tard. »</blockquote>',choices:[{label:'Partir à leur recherche',to:'victoryRescueCave'}]},

victoryRescueCave:{title:'Sous les rochers',text:s=>victoryRescuePartyDescription(s)+'<p>Tu prends une lampe et passes derrière les dernières huttes. Un sentier étroit rejoint une ouverture dans la roche.</p><p>À l’intérieur, l’air devient immédiatement plus froid.</p><p>Sur le sol, des traces récentes apparaissent dans la poussière : des pas, des marques de semelles traînées, puis un morceau de toile arraché.</p><p>Le tissu porte encore les couleurs du Providence.</p><p>Les traces descendent vers les profondeurs.</p>',choices:[{label:'Suivre les traces',to:'victoryRescueSurvivor'}]},

victoryRescueSurvivor:{title:'Encore vivant',text:'<p>Quelques dizaines de mètres plus bas, un souffle rauque te fait t’arrêter.</p><p>Dans un renfoncement de la galerie, un homme est recroquevillé contre la roche.</p><p>Sa veste est celle du Providence.</p><p>Il lève les yeux vers toi. Ils sont encore parfaitement humains.</p><p>Il est épuisé, mais vivant.</p><blockquote>« Les deux autres... plus bas. »</blockquote><p>Il raconte avoir profité d’un instant de confusion pour se dégager et ramper jusqu’ici.</p><blockquote>« L’un d’eux ne parlait déjà plus. Ils l’ont emmené vers la lumière bleue. L’autre était encore conscient. »</blockquote><p>Il est trop faible pour continuer. Tu l’installes à l’abri dans le renfoncement et lui promets de revenir.</p>',choices:[{label:'Continuer vers les deux autres',to:'victoryRescueRevenant'}]},

victoryRescueRevenant:{title:'L’un des leurs',text:s=>{const alreadyDead=s.combats?.deepCaveRevenant&&s.combats.deepCaveRevenant.hp<=0;if(alreadyDead)return '<p>La galerie débouche dans une petite chambre naturelle.</p><p>Tu reconnais immédiatement l’endroit.</p><p>Le corps que tu as affronté plus tôt est toujours étendu contre la roche.</p><p>À la lumière de la lampe, tu remarques ce que tu n’avais pas identifié dans la fuite : les restes de son uniforme portent encore les couleurs du Providence.</p><p>Tu comprends.</p><p>C’était l’un des trois marins emmenés hors de la cage.</p><p>Il en reste encore un à retrouver.</p>';return '<p>La galerie débouche dans une petite chambre naturelle.</p><p>Un homme se tient debout au milieu du passage.</p><p>Il porte l’uniforme déchiré du Providence.</p><p>Sa peau est pâle, ses vêtements sont trempés et ses yeux diffusent un reflet bleu froid.</p><p>Tu l’appelles.</p><p>Aucune réaction.</p><p>Sa poitrine ne se soulève pas.</p><p>Puis il tourne brusquement la tête vers toi et se jette en avant.</p>';},choices:s=>(s.combats?.deepCaveRevenant&&s.combats.deepCaveRevenant.hp<=0)?[{label:'Chercher le troisième marin',to:'victoryRescueLastSailor'}]:[{label:'Se défendre',to:'victoryRescueRevenantFight'}]},

victoryRescueRevenantFight:{title:'Le combat',text:s=>'<p>L’ancien marin fond sur toi.</p>'+(s.flags.victoryRescueHaleAssist?'<p>Hale réagit avant toi. Son sabre frappe l’ancien marin à l’épaule et le repousse contre la roche. <strong>Son intervention lui a déjà infligé 3 dégâts.</strong></p>':'')+fightHtml(s,'victoryRescueRevenant',DROWNED_SAILOR),onEnter:s=>prepareVictoryRescueRevenant(s),choices:s=>{const f=s.combats?.victoryRescueRevenant;if(s.hp<=0)return[{label:'La fin du voyage',to:'death'}];if(f&&f.hp<=0)return[{label:'Chercher le troisième marin',to:'victoryRescueLastSailor'}];return standardFightChoices(s,'victoryRescueRevenant',DROWNED_SAILOR,{label:'La fin du voyage',to:'death'},{label:'Chercher le troisième marin',to:'victoryRescueLastSailor'});}},

victoryRescueLastSailor:{title:'Le troisième marin',text:s=>{let h='<p>Le silence revient dans la galerie.</p><p>Tu continues à descendre.</p><p>Un peu plus loin, près d’un bassin naturel, tu retrouves le troisième marin du Providence.</p><p>Il est allongé contre la roche, les yeux fermés.</p><p>Aucune blessure évidente n’explique sa mort.</p>';if(s.flags.secretCliffFound)h+='<p>Tu reconnais les lieux. Au-delà se trouvent le sanctuaire, le passage vers la falaise et le vieux bateau que tu as déjà découvert.</p><p>Le sort des trois disparus est maintenant connu : un survivant, un homme transformé, et celui-ci.</p>';else h+='<p>À quelques pas de lui, le passage s’élargit vers une salle ronde. Une faible lueur bleue en éclaire les parois.</p><p>Quelque chose se trouve encore plus loin.</p>';return h;},onEnter:s=>{if(s.flags.secretCliffFound)s.flags.victoryRescueCompleted=true;},choices:s=>s.flags.secretCliffFound?[{label:'Revenir chercher le survivant',to:'victoryRescueReturn'}]:[{label:'Entrer dans la salle',to:'victoryRescueSanctum'}]},

victoryRescueSanctum:{title:'Le cœur du piège',text:'<p>La salle est ronde et étrangement lisse.</p><p>Au centre, une plate-forme de pierre domine un bassin d’eau noire. Sa surface se soulève lentement à intervalles réguliers, comme une respiration.</p><p>La face de la plate-forme est sculptée d’une créature marine massive entourée de tentacules.</p><p>Sur la paroi, un ancien relief montre des silhouettes humaines agenouillées, les yeux incrustés de petites pierres bleues.</p><p>À l’écart, une silhouette de marin se tient près d’un navire. Un cercle noir est gravé sur son avant-bras. Sous la coque, la créature passe sans l’attaquer.</p><p>Plus loin, le même marin remet quelque chose aux hommes pâles avant de reprendre la mer.</p><p>Tu comprends que le cercle ne sert pas seulement à se reconnaître. Il marque ceux qui participent au piège et dont les navires sont épargnés.</p><p>Les cartes, les pierres bleues, les trois feux de la crique : tout faisait partie du même système.</p><p>Tu repenses aux trois marins emmenés ici. L’un a réussi à fuir. L’un a été transformé. Le dernier n’a pas survécu.</p><p>Derrière le bassin, la roche se prolonge dans un couloir étroit où circule un courant d’air chargé de sel.</p>',onEnter:s=>{s.flags.caveTruth=true;s.flags.caveVisitedNight=true;s.flags.blackCircleBrotherhood=true;s.flags.victoryRescueCompleted=true;},choices:[{label:'Continuer dans le passage',to:'victoryCliffPassage'}]},

victoryCliffPassage:{title:'Le couloir des amarres',noImage:true,text:'<p>Vous vous engagez dans le passage.</p><p>La galerie remonte lentement sur plusieurs dizaines de mètres.</p><p>Les parois portent d’anciennes marques de frottement et, à intervalles réguliers, de gros anneaux de fer ont été scellés dans la roche.</p><p>Certains retiennent encore des fragments de corde durcie par le sel.</p><p>Plus vous avancez, plus le grondement de la mer devient fort.</p><p>L’air est humide. Le vent s’engouffre maintenant dans le tunnel par rafales.</p><p>Au bout du couloir, une ouverture découpe un morceau de ciel au-dessus de l’eau.</p>',choices:[{label:'Sortir sur la falaise',to:'victoryCliff'}]},

victoryCliff:{title:'La falaise',noImage:true,text:'<p>Vous débouchez brusquement à l’air libre.</p><p>La falaise plonge presque verticalement devant vous.</p><p>Le vent fouette ton visage et arrache les vêtements contre le corps. Le souffle marin remonte de la mer avec une force telle qu’il faut se pencher pour avancer.</p><p>Tu approches du bord.</p><p>Sous tes bottes, la roche est humide, irrégulière et fissurée.</p><p>Un bruit de pierre te fait tourner la tête.</p><p>Sur le côté de la corniche, un homme pâle vient de se redresser.</p><p>Il est nettement plus grand que les autres. Un gaillard massif, aux épaules épaisses, avec les restes d’un manteau de marin et un large ceinturon de cuir. À sa carrure et à sa façon de tenir son arme, tu imagines sans peine l’ancien pirate qu’il a pu être.</p><p>Il garde la falaise.</p><p>Le passage est trop étroit pour l’éviter, et personne ne peut le contourner sans s’exposer au vide.</p><p>Une rafale soulève de la poussière de roche entre vous.</p><p>L’homme avance.</p>',choices:[{label:'Affronter le gardien de la falaise',to:'victoryCliffGuardianFight'}]},

victoryCliffGuardianFight:{title:'Le gardien de la falaise',noImage:true,text:s=>'<p>Le duel commence sur la corniche instable.</p><p>Le vent vous pousse vers le vide et la pierre se fend sous les appuis les plus brutaux.</p>'+cliffGuardianHtml(s,'victoryCliffGuardian'),onEnter:s=>prepareCliffGuardian(s,'victoryCliffGuardian'),choices:s=>cliffGuardianChoices(s,'victoryCliffGuardian','victoryCliffBoat')},

victoryCliffBoat:{title:'Sous la falaise',noImage:true,text:'<p>Le gardien s’effondre.</p><p>Le vent continue de hurler autour de vous.</p><p>Tu avances jusqu’au bord de la corniche et regardes enfin en contrebas.</p><p>Une anse étroite est dissimulée sous la paroi.</p><p>Dans son ombre, un vieux bâtiment est encore amarré.</p><p>Sa coque a souffert, mais elle est toujours à flot.</p><p>Une échelle et plusieurs anneaux de fer descendent jusqu’à l’eau.</p><p>Un courant violent longe la falaise avant de filer directement vers le large.</p><p>Tu observes les amarres, puis la direction du courant.</p><p>Le mécanisme devient clair : les navires vidés de leurs équipages étaient conduits jusqu’ici puis relâchés. La mer les emportait loin de l’île.</p><p><strong>L’île mange les marins et recrache les bateaux.</strong></p><p>Le bâtiment paraît assez solide pour transporter les survivants.</p>',onEnter:s=>{s.flags.secretCliffFound=true;},choices:[{label:'Revenir chercher le marin et prévenir les autres rescapés',to:'victoryRescueReturn'}]},

victoryRescueReturn:{title:'Retour au village',text:'<p>Tu retrouves le marin vivant dans le renfoncement où tu l’avais laissé.</p><p>Il parvient à se relever avec de l’aide.</p><p>Vous remontez lentement vers le village.</p><p>Personne ne demande où sont les deux autres lorsqu’il apparaît à l’entrée de la grotte.</p><p>Les rescapés comprennent à vos visages.</p><p>Tu leur racontes alors ce que vous avez découvert au-delà du sanctuaire : la falaise, le courant et le vieux bateau encore amarré sous la roche.</p><p>Pour la première fois depuis votre arrivée sur l’île, vous avez un moyen de ramener tout le monde en mer.</p><p>Les hommes encore valides commencent immédiatement à préparer l’évacuation des blessés.</p>',onEnter:s=>{s.flags.victoryRescueCompleted=true;s.flags.victoryRescuedSailor=true;},choices:[{label:'Évacuer les survivants par la grotte',to:'collectiveCliffEvacuation'}]},

collectiveCliffEvacuation:{title:'Quitter l’île',noImage:true,text:'<p>Le trajet est lent.</p><p>Les hommes valides font plusieurs allers-retours entre le village et la grotte. Les plus faibles sont soutenus à deux. Les blessés incapables de marcher sont transportés sur des civières improvisées.</p><p>Un à un, les rescapés traversent les galeries et atteignent la falaise.</p><p>Le vieux bateau tient toujours contre la roche.</p><p>Lorsque le dernier homme est à bord, vous détachez les amarres.</p><p>Le courant saisit immédiatement la coque et l’arrache à l’anse.</p><p>La falaise recule.</p><p>Puis l’île entière commence à disparaître derrière vous.</p><p>Tu regardes longtemps la côte sombre.</p><p>Le bateau gagne le large avec les hommes du Providence à son bord.</p><p>Vous avez quitté l’île.</p><p>Mais ce que tu as découvert ne s’arrête pas à cette côte.</p><p>Le vieux marin, l’homme venu te tuer, les faux marchands, les cartes, les pierres bleues… le cercle noir apparaît trop souvent pour n’être qu’un signe isolé.</p><p>Quelque part dans cette région, d’autres hommes participent encore au même réseau. Ils attirent des navires, déplacent des prisonniers et entretiennent un piège qui dépasse largement cette île.</p><p>Lorsque les survivants seront en sécurité, tu mèneras une expédition pour mettre fin à ce réseau. Tu ne sais pas combien ils sont, ni quelle est leur force de frappe, mais tu es prêt à aller jusqu’au bout.</p><p>La côte disparaît derrière vous.</p><p><strong>L’aventure ne fait que commencer.</strong></p>',choices:[{label:'Recommencer',action:'restart'}]},


forestCombatPowder:{title:'Le mort sous les racines',noImage:true,text:s=>(s.flags.villageForestEntered&&!s.flags.villageForestSoldierLost?diceResultHtml(s)+(s.flags.villageForestDex?'':''):'')+'<p>Vous ralentissez enfin lorsque les bruits dans les fourrés cessent.</p><p>Sous les racines d’un arbre renversé, tu aperçois le corps d’un homme du village. Il porte encore des vêtements de pêcheur et semble avoir tenté de fuir l’attaque.</p><p>À sa ceinture est noué un petit sachet de toile cirée, fermé par une ficelle rouge.</p><p>À l’intérieur se trouve une poudre sombre à l’odeur âcre.</p><p>Tu en as déjà entendu parler dans les ports : certains pirates en avalent juste avant un abordage. Sa composition est jalousement gardée.</p><p><strong>Si tu la consommes, elle te donnera +2 Dextérité et +2 Force pendant ton prochain combat, puis son effet disparaîtra.</strong></p>',choices:[{label:'Prendre la poudre de combat',to:'c50',effect:s=>{if(!s.inventory?.poudre_combat&&!s.flags.combatPowderUsed&&!s.flags.combatPowderReady)addItem(s,'poudre_combat','Poudre de combat','Poudre utilisée par certains pirates avant un affrontement. Usage unique : +2 Dextérité et +2 Force pendant le prochain combat.');}},{label:'La laisser et continuer',to:'c50'}]},

cavePistolGuardian:{title:'Le gardien du sanctuaire',noImage:true,text:s=>'<p>Une silhouette se détache dans le rayon de lumière.</p><p>Un homme pâle, très grand et presque maigre au point de paraître fragile.</p><p>Il ne porte ni mousquet ni armure.</p><p>À la place, il tire deux sabres courts, un dans chaque main.</p><p>Ses épaules sont étroites et ses bras peu puissants, mais ses appuis changent sans cesse. Une lame couvre l’autre. Il est manifestement beaucoup plus rapide que fort.</p><p>Derrière lui, tu aperçois les fresques et les affaires abandonnées des prisonniers.</p><p>Il ne te laissera pas passer.</p>'+fightHtml(s,'caveDualGuard',CAVE_DUAL_GUARD),choices:s=>standardFightChoices(s,'caveDualGuard',CAVE_DUAL_GUARD,{label:'Tu t’effondres',to:'death'},{label:'Entrer dans le sanctuaire',to:'caveShrine'})},

cliffReturnGuard1:{title:'Derrière les huttes',noImage:true,text:s=>{const group=haleWithParty(s)||providenceMarinesWithParty(s)>0;let h=group?'<p>Vous descendez de la crête derrière les dernières huttes.</p>':'<p>Tu descends seul de la crête derrière les dernières huttes.</p>';h+='<p>La prison est proche. Entre '+(group?'vous':'toi')+' et les premiers bâtiments, un homme pâle monte la garde.</p>';if(haleWithParty(s))h+='<p>Hale se décale légèrement sur ta droite.</p>';h+='<p>Il faut neutraliser le garde avant qu’il puisse donner l’alerte.</p>';return h+nightGuardResultHtml(s,1);},choices:s=>{const r=s.flags.nightGuard1;if(!r?.resolved)return[{label:'Neutraliser le garde — Dextérité',stay:true,diceTest:true,effect:x=>nightGuardAttempt(x,1)}];return r.success?[{label:'Continuer vers la prison',to:'cliffReturnGuard2'}]:[{label:'Le village est alerté',to:'cliffReturnAlarm'}];}},

cliffReturnGuard2:{title:'À quelques mètres de la prison',noImage:true,text:s=>{const group=haleWithParty(s)||providenceMarinesWithParty(s)>0;let h=group?'<p>Vous progressez entre deux huttes.</p>':'<p>Tu progresses seul entre deux huttes.</p>';h+='<p>Les barreaux de la prison sont maintenant visibles.</p><p>Un deuxième garde apparaît au bout du passage. Il ne '+(group?'vous':'t')+'a pas encore vu'+(group?'s':'')+'.</p>';if(haleWithParty(s))h+='<p>Hale attend ton signal.</p>';return h+nightGuardResultHtml(s,2);},choices:s=>{const r=s.flags.nightGuard2;if(!r?.resolved)return[{label:'Neutraliser le second garde — Dextérité',stay:true,diceTest:true,effect:x=>nightGuardAttempt(x,2)}];return r.success?[{label:'Atteindre la cage avant l’alerte',to:'cliffReturnPrisonGate'}]:[{label:'Le village se réveille',to:'cliffReturnAlarm'}];}},

cliffReturnPrisonGate:{title:'La cage ouverte',noImage:true,text:s=>{let h='<p>Le second garde s’effondre sans avoir eu le temps de crier.</p><p>Tu atteins enfin la cage.</p><p>Tu récupères les clés à la ceinture du garde et ouvres la lourde serrure.</p><p>Les captifs comprennent immédiatement qu’ils doivent partir sans bruit.</p>';if(s.flags.haleRescuedFromCage)h+='<p><strong>Hale sort parmi les premiers et récupère une arme.</strong></p>';if((s.flags.capturedSoldiersRecovered||0)>0)h+='<p><strong>Tes '+String(s.flags.capturedSoldiersRecovered)+' soldat'+(s.flags.capturedSoldiersRecovered>1?'s capturés te rejoignent':' capturé te rejoint')+'.</strong></p>';h+='<p>Les plus faibles disparaissent entre les huttes et gagnent la forêt.</p><p>Trois marins du Providence sont encore capables de se battre. Ils ramassent les armes des gardes et restent avec vous.</p><p>Mais il est trop tard pour repartir discrètement. Une porte s’ouvre plus loin. Puis une autre.</p><p>Les hommes pâles ont compris.</p>';return h;},onEnter:s=>{if(!s.flags.cliffPrisonFreed){s.flags.cliffPrisonFreed=true;liberatePrisonGroup(s);s.flags.villageTime='night';}},choices:[{label:'Tenir la ligne avec les prisonniers libérés',to:'villageAssault'}]},

cliffReturnAlarm:{title:'L’alarme',noImage:true,text:s=>{const group=haleWithParty(s)||providenceMarinesWithParty(s)>0;let h='<p>Le cri du garde traverse le village.</p><p>Des portes s’ouvrent presque aussitôt et des silhouettes surgissent entre les huttes.</p>';if(haleWithParty(s))h+='<p>Hale vient se placer à ton côté et tire son sabre.</p>';if(providenceMarinesWithParty(s)>0)h+='<p>Le marin du Providence reste avec vous. Vous n’êtes pas seuls.</p>';if(!group)h+='<p>Personne n’est avec toi. Si tu veux atteindre la prison, tu vas devoir te frayer un passage seul.</p>';h+='<p>La prison est encore devant '+(group?'vous':'toi')+'.</p>';return h;},onEnter:s=>{s.flags.villageTime='night';},choices:s=>(haleWithParty(s)||providenceMarinesWithParty(s)>0)?[{label:'Combattre ensemble',to:'villageAssault'}]:[{label:'Te frayer un passage seul',to:'villageNightFight'}]},

captiveSoloFlight:{title:'Seul dans la faille',noImage:true,text:'<p>Tu cours courbé sous la roche, le sabre arraché au garde serré dans ta main.</p><p>Derrière toi, les cris résonnent encore.</p><p>Tu continues plusieurs dizaines de mètres avant de ralentir.</p><p>Aucun pas ne te suit.</p><p>Tu t’arrêtes et tends l’oreille.</p><p>Au loin, tu entends des ordres, le choc des armes, puis le bruit lourd de la grille qu’on referme.</p><p>Hale n’est pas derrière toi.</p><p>Aucun de tes soldats non plus.</p><p>Les marins du Providence ont été repris avec les autres prisonniers.</p><p>Tu pourrais revenir maintenant, mais seul, face à tout le village, ce serait te faire reprendre à ton tour.</p><p>Tu reprends ta course.</p><p>Il faut trouver un autre passage, comprendre où mène cette grotte, puis revenir les chercher.</p>',onEnter:s=>{s.flags.capturedRoute=true;s.flags.captivePursued=true;s.flags.villageTime='night';s.flags.cageSoloEscape=true;s.flags.haleCaptive=true;s.flags.haleAlive=true;s.flags.companion=null;setProvidenceMarinesWithParty(s,0);},choices:[{label:'Continuer seul dans la grotte',to:'villageNightCave'}]},

death:{title:'La fin du voyage',text:`<p>La douleur, la fatigue et les blessures finissent par avoir raison de toi.</p><p>Ton voyage s’arrête ici.</p><div class="ending">FIN DE L’AVENTURE</div>`,choices:[{label:'Recommencer',action:'restart'}]}
};

const PAGE_NAV_TITLES = {
  "c0": "Avant le Providence",
  "c1": "La mission à Port Royal",
  "c2": "Choisir la route",
  "c3": "La route côtière",
  "c4": "La taverne du village",
  "c5": "Interroger le tavernier",
  "c6": "Interroger le vieux marin",
  "c7": "Interroger la femme espagnole",
  "c8": "La chambre à l'étage",
  "c9": "L'attaque dans la nuit",
  "c10": "Après l'attaque",
  "c12": "Le pavillon noir",
  "c13": "L'abordage",
  "c15": "Le capitaine pirate",
  "c16": "Les gantelets du capitaine",
  "c20": "Début des recherches en mer",
  "search2": "Choisir une nouvelle zone",
  "north1": "Cap au nord — eaux des pirates",
  "north2": "Abordage dans les eaux du nord",
  "north3": "Le capitaine pirate du nord",
  "north4": "Fouiller le navire pirate",
  "east1": "Cap à l’est — route marchande vide",
  "east2": "À bord des faux marchands",
  "east3": "Le verre et le tonnelet",
  "eastRefuse": "Refuser de monter à bord",
  "east4": "L’attaque nocturne",
  "east5": "Le chef des faux marchands",
  "east6": "Après l’attaque nocturne",
  "south1": "Cap au sud — l’ombre sous le Resolute",
  "south2": "Les marchands effrayés",
  "c21": "Le Providence à l'horizon",
  "c22": "Seul vers le Providence",
  "c23": "La chose sous la chaloupe",
  "c24": "Entrer par la coque",
  "c25": "La porte de l'entrepont",
  "c26": "La réserve cachée",
  "c27": "Aborder avec le Resolute",
  "c28": "Le pont abandonné",
  "c29": "La cabine du capitaine",
  "c30": "Le journal du Providence",
  "directIsland": "L'île aux pierres bleues",
  "c31": "Vers le village voisin",
  "pirateApproach": "Droit sur les pirates",
  "pirateParley": "Sous pavillon blanc",
  "pirateOfferRejected": "Pas assez",
  "pirateDealAccepted": "Marché conclu",
  "c32": "Une seconde attaque",
  "c34": "L'île du village",
  "c35": "Choisir le commandement",
  "c36": "Le ravin",
  "c37": "Le pont fragile",
  "ravineDown": "Au fond du ravin",
  "ravineMouth": "La mâchoire",
  "ravineFight": "L'alligator",
  "ravineCorpse": "Le corps dans la boue",
  "ravineExit": "L'autre versant",
  "c41": "Le détour par la forêt",
  "c50": "L'homme de l'autre côté",
  "c38": "Le village désert",
  "c39": "Les maisons",
  "c40": "Emportés",
  "c42": "Le poste de guet",
  "c43": "Quelqu'un est venu",
  "c44": "Les anciens registres",
  "c45": "L'île d'en face",
  "c46": "La carte locale",
  "c48": "La jetée",
  "c49": "Vers la mer",
  "c51": "Le journal du guetteur",
  "c52": "Les derniers mots",
  "c53": "La même piste",
  "c54": "Le retour",
  "c55": "La plage",
  "c56": "Retour à la plage",
  "c57": "Vers l'île interdite",
  "islandRetreat": "Prendre du recul",
  "islandBeach": "La plage",
  "islandBeachFight": "Trop nombreux",
  "islandBeachYield": "Ne pas provoquer le massacre",
  "islandCaptured": "Prisonniers",
  "islandForestLanding": "La côte boisée",
  "forestTrap": "Le piège dans les arbres",
  "forestAlligator": "La boue remue",
  "islandRecon": "Faire le tour de l'île",
  "coveClearing": "La crique cachée",
  "caveTunnel": "Sous la roche",
  "caveShrine": "Le sanctuaire",
  "caveExit": "Vers le village",
  "villageRear": "Derrière le village",
  "villageWalkIn": "Entrer à découvert",
  "villageRingReturn": "Rendre la bague",
  "villageRingDominance": "Lever la bague",
  "ringPrisonApproach": "Vers les barreaux",
  "ringPrisonRevolt": "La supercherie",
  "ringKillThree": "Profiter de leur hésitation",
  "villageAssault": "Donner l'assaut",
  "villageRetreat": "Le repli",
  "villageRetreatNight": "La nuit",
  "villageNightSwim": "La traversée",
  "villageNightGuard1": "Aux abords du village",
  "villageNightGuard2": "Le second garde",
  "villageNightFight": "Le combat dans le village",
  "villageNightSearch": "Fouiller l’île",
  "villageNightCave": "Le sanctuaire dans la nuit",
  "villageNightAftermath": "Après le silence",
  "villageAssaultVictory": "Les marins du Providence",
  "villageDawnRegroup": "Au lever du jour",
  "villageNight": "Attendre la nuit",
  "villageNightResult": "Dans le silence",
  "c68": "Les captifs",
  "c69": "Ceux qui reviennent",
  "captiveAmbush": "À l’ouverture de la cage",
  "captiveTransfer": "Choisis parmi les prisonniers",
  "captiveRitual": "Sous la roche",
  "captiveFreeCompanions": "La première chance",
  "captiveSecondEscape": "La dernière chance",
  "deepCaveFork": "Deux passages",
  "deepCaveRevenant": "Celui qui ne respire plus",
  "deepCaveFlooded": "Le passage noyé",
  "deepCaveSanctum": "Le cœur de la grotte",
  "deepCaveCliffPassage": "Plus loin sous la roche",
  "deepCaveCliff": "La falaise",
  "deepCliffGuardianFight": "Le gardien de la falaise",
  "deepCaveBoat": "Sous la falaise",
  "deepCaveReturnPrison": "Au-dessus du village",
  "deepCaveEscapeEnding": "Quitter l’île",
  "victoryMissingSailors": "Trois hommes manquent",
  "victoryRescueCave": "Sous les rochers",
  "victoryRescueSurvivor": "Encore vivant",
  "victoryRescueRevenant": "L’un des leurs",
  "victoryRescueRevenantFight": "Le combat",
  "victoryRescueLastSailor": "Le troisième marin",
  "victoryRescueSanctum": "Le cœur du piège",
  "victoryCliffPassage": "Le couloir des amarres",
  "victoryCliff": "La falaise",
  "victoryCliffGuardianFight": "Le gardien de la falaise",
  "victoryCliffBoat": "Sous la falaise",
  "victoryRescueReturn": "Retour au village",
  "collectiveCliffEvacuation": "Quitter l’île",
  "forestCombatPowder": "Le mort sous les racines",
  "cavePistolGuardian": "Le gardien du sanctuaire",
  "cliffReturnGuard1": "Derrière les huttes",
  "cliffReturnGuard2": "À quelques mètres de la prison",
  "cliffReturnPrisonGate": "La cage ouverte",
  "cliffReturnAlarm": "L’alarme",
  "captiveSoloFlight": "Seul dans la faille",
  "death": "La fin du voyage"
};
const PAGE_ORDER=['c0','c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','c12','c13','c15','c16','c20','search2','north1','north2','north3','north4','east1','east2','east3','eastRefuse','east4','east5','east6','south1','south2','c21','c27','c28','c22','c29','c30','directIsland','c31','pirateApproach','pirateParley','pirateOfferRejected','pirateDealAccepted','c32','c34','c35','c36','c37','ravineDown','ravineMouth','ravineFight','ravineCorpse','ravineExit','c41','c50','c38','c39','c40','c42','c43','c44','c45','c46','c48','c49','c51','c52','c53','c54','c55','c56','c57','islandRetreat','islandBeach','islandBeachFight','islandBeachYield','islandCaptured','islandForestLanding','forestTrap','forestAlligator','islandRecon','coveClearing','caveTunnel','caveShrine','caveExit','villageRear','villageWalkIn','villageRingReturn','villageRingDominance','ringPrisonApproach','ringPrisonRevolt','ringKillThree','villageAssault','villageRetreat','villageRetreatNight','villageNightSwim','villageNightGuard1','villageNightGuard2','villageNightFight','villageNightSearch','villageNightCave','villageNightAftermath','villageAssaultVictory','villageDawnRegroup','villageNight','villageNightResult','c68','c69','captiveAmbush','captiveTransfer','captiveRitual','captiveFreeCompanions','captiveSecondEscape','deepCaveFork','deepCaveRevenant','deepCaveFlooded','deepCaveSanctum','deepCaveCliffPassage','deepCaveCliff','deepCliffGuardianFight','deepCaveBoat','deepCaveReturnPrison','deepCaveEscapeEnding','victoryMissingSailors','victoryRescueCave','victoryRescueSurvivor','victoryRescueRevenant','victoryRescueRevenantFight','victoryRescueLastSailor','victoryRescueSanctum','victoryCliffPassage','victoryCliff','victoryCliffGuardianFight','victoryCliffBoat','victoryRescueReturn','collectiveCliffEvacuation','forestCombatPowder','cavePistolGuardian','cliffReturnGuard1','cliffReturnGuard2','cliffReturnPrisonGate','cliffReturnAlarm','captiveSoloFlight','death'];
const PAGE_BY_NODE=Object.fromEntries(PAGE_ORDER.map((id,i)=>[id,i]));
const padPage=n=>String(n).padStart(3,'0');

const DEV_TOOLS_ENABLED=typeof window==='undefined'||window.__APHANES_DEV_TOOLS__!==false;

const DEV_TEST_ITEM_CATALOG=[
 {id:'diamant_bleu',name:'Pierre bleue',description:'La pierre laissée près de la carte du Providence.',flag:'baitStone'},
 {id:'couteaux_jet',name:'Lames de lancer',description:'Cinq lames équilibrées pour tester les passages qui les utilisent.',special:'blades'},
 {id:'caisse_rhum',name:'Tonneaux de rhum',description:'Marchandise de négociation avec les pirates.',special:'rum'},
 {id:'gold_test',name:'100 pièces d’or',description:'Réserve de test pour les achats et négociations.',special:'gold'},
 {id:'brassard_avant_bras',name:'Brassard d’avant-bras renforcé · Protection +3',description:'Protection de cuir et de métal donnée par les marchands.',protection:3,flag:'southProtectionGift'},
 {id:'gantelets',name:'Gantelets renforcés · Protection +4',description:'Protection récupérée sur les pirates.',protection:4,flag:'gauntlets'},
 {id:'bracelet_force',name:'Bracelet de force · Force +2',description:'Bracelet obtenu au début de l’enquête.',force:2,flag:'forceBracelet'},
 {id:'bracelet_force_ravin',name:'Bracelet du ravin · Force +2',description:'Bracelet trouvé sur le corps au fond du ravin.',force:2,flag:'ravineForceBracelet'},
 {id:'bague_crane',name:'Bague au crâne',description:'La bague reconnue par les hommes pâles.',flag:'skullRing'},
 {id:'poudre_combat',name:'Poudre de combat',description:'Usage unique : +2 Dextérité et +2 Force pendant le prochain combat.'},
 {id:'pistolets_silex',name:'Deux pistolets à silex',description:'Deux pistolets chargés trouvés dans le sanctuaire.'}
];

function devTestItemOwned(s,e){
 if(e.special==='gold')return (s.goldCoins||0)>=100;
 if(e.special==='rum')return rumCrateCount(s)>0;
 if(e.special==='blades')return !!s.inventory?.couteaux_jet;
 return !!s.inventory?.[e.id];
}
function recalcDevProtection(s){
 ensureProtectionState(s);
 s.protection=currentProtection(s);
}
function setDevTestItem(s,e,enabled){
 if(e.special==='gold'){
   s.goldCoins=enabled?Math.max(100,s.goldCoins||0):0;
   return;
 }
 if(e.special==='rum'){
   if(enabled)s.inventory.caisse_rhum={name:'Tonneau de rhum',description:'Du rhum des Caraïbes conservé en tonneau. Une marchandise qui peut être offerte, troquée ou utilisée pour négocier.',quantity:3};
   else delete s.inventory.caisse_rhum;
   return;
 }
 if(e.special==='blades'){
   if(enabled)s.inventory.couteaux_jet={name:'Lames de lancer',description:'De petites lames équilibrées, conçues pour être lancées avec précision.',quantity:5};
   else delete s.inventory.couteaux_jet;
   return;
 }
 const owned=!!s.inventory?.[e.id];
 if(enabled&&!owned){
   if(e.protection)addProtectiveItem(s,e.id,e.name.replace(/ ·.*$/,''),e.description,e.protection);
   else addItem(s,e.id,e.name.replace(/ ·.*$/,''),e.description,e.id==='pistolets_silex'?{quantity:2}:undefined);
   if(e.force)s.forceBonus=(s.forceBonus||0)+e.force;
 }else if(!enabled&&owned){
   if(e.protection)removeProtectiveItem(s,e.id);
   else delete s.inventory[e.id];
   if(e.force)s.forceBonus=Math.max(0,(s.forceBonus||0)-e.force);
 }
 if(e.flag)s.flags[e.flag]=enabled;
 if(e.protection)recalcDevProtection(s);
}
function devSoldierCountHtml(s){
 const options=[0,1,2,3,4].map(n=>`
   <label class="test-weapon-option">
     <input type="radio" name="devSoldierCount" data-action="dev-set-soldiers:${n}" ${Number(s.soldiers||0)===n&&Number(s.expeditionSoldiers||0)===n&&(s.flags.flankingSoldiers||0)===0?'checked':''}>
     <span>${n} soldat${n>1?'s':''}</span>
   </label>`).join('');
 return `<div class="test-inventory-panel">
   <div class="test-inventory-title">Mode DEV · autres soldats avec toi</div>
   <p class="test-inventory-note">Choisis le nombre de soldats de la garnison présents avec toi pour tester l’assaut final. Hale est ajouté automatiquement à l’effectif s’il est encore avec toi. Ce réglage annule une éventuelle séparation en tenaille.</p>
   <div class="test-weapon-list">${options}</div>
 </div>`;
}

function devTestInventoryHtml(s){
 const rows=DEV_TEST_ITEM_CATALOG.map(e=>{
   const checked=devTestItemOwned(s,e);
   const qty=e.special==='rum'&&checked?' × '+rumCrateCount(s):e.special==='blades'&&checked?' × '+(s.inventory.couteaux_jet.quantity||1):'';
   return `<label class="test-item-row">
     <input type="checkbox" data-action="dev-toggle-item:${e.id}" ${checked?'checked':''}>
     <span class="test-item-box" aria-hidden="true"></span>
     <span class="test-item-copy"><strong>${e.name}${qty}</strong><small>${e.description}</small></span>
   </label>`;
 }).join('');
 const weapons=[
   ['naval_sword','Sabre court de marine · Puissance 4'],
   ['none','Aucune arme']
 ].map(([value,label])=>`<label class="test-weapon-option">
   <input type="radio" name="devTestWeapon" data-action="dev-equip-weapon:${value}" ${s.weapon===value?'checked':''}>
   <span>${label}</span>
 </label>`).join('');
 return `<div class="test-inventory-panel">
   <div class="test-inventory-title">Mode DEV · objets disponibles</div>
   <p class="test-inventory-note">Coche ou décoche librement les objets pour tester les différentes branches du Livre 02.</p>
   <div class="test-item-list">${rows}</div>
   <div class="test-weapon-panel"><strong>Arme équipée</strong><div class="test-weapon-list">${weapons}</div></div>
 </div>`;
}

function showInventoryEffectResult(api,title,html,terminal=false){
 api.showModal(title,`
   <div class="inventory-effect-result">${html}</div>
   <div class="inventory-actions">
     <button class="inventory-action-btn" data-action="${terminal?'close-effect-result':'back-inventory'}">
       ${terminal?'Continuer':'Retour à l’inventaire'}
     </button>
   </div>`);
}

const inventory={
 topLine:s=>`Or : ${s.goldCoins||0} · Arme : ${weaponLabel(s)} · Soldats : ${displayedSoldierCount(s)}`,
 extraHtml:s=>`<div class="inventory-equipment-card"><div class="inventory-equipment-title">État de l’expédition</div><div class="inventory-equipment-row"><span>Soldats survivants</span><strong>${s.soldiers}/${s.maxSoldiers}</strong></div><div class="inventory-equipment-row"><span>Avec toi sur l’île</span><strong>${displayedSoldierCount(s)}</strong></div><div class="inventory-equipment-row"><span>Protection restante</span><strong>${currentProtection(s)} / ${maxProtection(s)}</strong></div>${s.flags.combatPowderReady?'<div class="inventory-equipment-row"><span>Poudre de combat</span><strong>Prête pour le prochain combat</strong></div>':''}</div>`+(DEV_TOOLS_ENABLED?devSoldierCountHtml(s)+devTestInventoryHtml(s):''),
 actionHtml:(id,item,s)=>{if(id==='poudre_combat')return '<div class="inventory-actions"><button class="inventory-action-btn" data-action="use-combat-powder">Consommer : +2 Dextérité et +2 Force au prochain combat</button></div>';if(PROTECTION_ITEMS[id]){ensureProtectionState(s);const source=s.protectionItems[id]||{remaining:0,max:PROTECTION_ITEMS[id].max};return '<div class="inventory-protection-state">Protection restante : <strong>'+String(source.remaining)+' / '+String(source.max)+'</strong>'+(source.remaining<=0?'<br><strong>État : endommagé — désormais inutilisable.</strong>':'')+'</div>';}return '';},handleAction(action,s,api){
   if(action==='close-effect-result'){
     api.closeModal();
     return true;
   }
   if(action==='use-combat-powder'){
     if(useCombatPowder(s)){
       api.saveState();api.render();
       api.showModal('Poudre de combat utilisée','<p>Tu avales la poudre au goût âcre. Ton rythme cardiaque s’accélère et tes gestes deviennent plus vifs.</p><p><strong>Au prochain combat : +2 Dextérité et +2 Force pendant toute la durée du combat.</strong></p>');
     }
     return true;
   }
   if(!DEV_TOOLS_ENABLED&&action.startsWith('dev-'))return false;
   if(action.startsWith('dev-set-soldiers:')){
     const n=Math.max(0,Math.min(4,Math.floor(Number(action.slice('dev-set-soldiers:'.length))||0)));
     s.soldiers=n;
     s.expeditionSoldiers=n;
     s.shipSoldiers=0;
     s.flags.flankingSoldiers=0;
     delete s.flags.villageAssaultBattle;
     delete s.flags.nightRaidRolled;
     delete s.flags.nightRaidRolls;
     delete s.flags.nightRaidAlerts;
     delete s.flags.nightRaidKills;
     delete s.flags.nightRaidRuleVersion;
     api.saveState();api.render();api.openInventory();
     return true;
   }
   if(action.startsWith('dev-toggle-item:')){
     const id=action.slice('dev-toggle-item:'.length);
     const entry=DEV_TEST_ITEM_CATALOG.find(e=>e.id===id);
     if(entry){
       setDevTestItem(s,entry,!devTestItemOwned(s,entry));
       api.saveState();api.render();api.openInventory();
     }
     return true;
   }
   if(action.startsWith('dev-equip-weapon:')){
     const weapon=action.slice('dev-equip-weapon:'.length);
     if(['naval_sword','none'].includes(weapon)){
       s.weapon=weapon;
       api.saveState();api.render();api.openInventory();
     }
     return true;
   }
   return false;
 }
};

function normalizeProvidenceLoadedState(s){
 let changed=false;
 if(s.inventory?.statue_gardien){delete s.inventory.statue_gardien;changed=true;}
 if(s.flags){
   for(const key of ['guardianStatue','nightStatueVictims','nightStatueActivated']){
     if(Object.prototype.hasOwnProperty.call(s.flags,key)){delete s.flags[key];changed=true;}
   }
 }
 if(s.node==='villageNightStatue'){s.node='villageNightGuard1';changed=true;}
 if(s.visited?.villageNightStatue){delete s.visited.villageNightStatue;changed=true;}
 if(s.flags?.returnFromCliff&&s.node==='villageNightGuard1'){s.node='cliffReturnGuard1';changed=true;}
 if(s.flags?.returnFromCliff&&s.node==='villageNightGuard2'){s.node='cliffReturnGuard2';changed=true;}
 if(s.flags?.returnFromCliff&&s.node==='villageNightFight'){s.node='cliffReturnAlarm';changed=true;}
 if(s.flags?.captiveAmbushSuccess&&!s.flags?.prisonLiberated&&!s.flags?.cliffPrisonFreed&&!s.flags?.villageAssaultWon&&!s.flags?.freedAtNight){
   s.flags.cageSoloEscape=true;
   s.flags.haleCaptive=true;
   s.flags.haleAlive=true;
   s.flags.companion=null;
   s.flags.providenceSailorsFreed=false;
   s.flags.captivePrisonersEscaped=false;
   setProvidenceMarinesWithParty(s,0);
   changed=true;
 }
 ensureProtectionState(s);
 s.protection=currentProtection(s);
 return changed;
}

function characterSheetHtml(s){
 return `<div class="character-modal-sheet"><div class="character-modal-name">${heroName(s)}</div><div class="character-modal-rank">${heroRank()}</div><div class="character-modal-stats">
 <div><span class="tag-copy"><small>Vie</small><strong>${s.hp}/${s.maxHp}</strong></span></div><div><span class="tag-copy"><small>Dextérité</small><strong>${currentDexterity(s)}</strong></span></div><div><span class="tag-copy"><small>Force</small><strong>${currentForce(s)}</strong></span></div><div><span class="tag-copy"><small>Arme</small><strong>+4</strong></span></div><div><span class="tag-copy"><small>Protection</small><strong>${currentProtection(s)}</strong></span></div><div><span class="tag-copy"><small>Soldats</small><strong>${displayedSoldierCount(s)}</strong></span></div>
 </div></div>`+(DEV_TOOLS_ENABLED?devSoldierCountHtml(s):'');
}

BookRegistry.register({
 id:'providence-02',initialMaxHp:18,seriesId:'providence',seriesLabel:'PROVIDENCE',episode:1,orderInSeries:1,
 slug:'le-secret-du-providence',title:'Le Secret du Providence',description:'Une mission maritime de la Royal Navy en 1719.',access:'free',
 contentVersion:143,pageMapVersion:17,saveVersion:1,libraryNumber:2,libraryLabel:'Livre 02',sheetLabel:'FICHE DU PERSONNAGE',
 readerEyebrow:'Chroniques d’un autre temps - Livre 02',
 assetBase:'./books/Livre02-Le-Secret-du-Providence/images',assetBases:['./books/Livre02-Le-Secret-du-Providence/images'],uiAssetBase:'./books/Livre02-Le-Secret-du-Providence/assets',
 seriesProfileDefaults:{heroGender:'female',heroName:'Eleanor',baseStats:{maxHp:18,force:8,dexterity:13}},
 normalizeSeriesProfile(p){p.heroName=p.heroGender==='male'?'Edward':'Eleanor';p.baseStats={maxHp:18,force:8,dexterity:13};},
 syncSeriesProfile(s,p){p.heroGender=s.heroGender==='male'?'male':'female';p.heroName=heroName(s);p.baseStats={maxHp:18,force:8,dexterity:13};p.memory={...(p.memory||{})};},
 normalizeLoadedState(s){return normalizeProvidenceLoadedState(s);},
 normalizeCheckpoint(s){return normalizeProvidenceLoadedState(s);},
 handleProfileInputChange(s,input){if(input?.classList.contains('hero-gender-input'))setHeroIdentity(s,input.value);},
 statusStats(s){const r=s.maxHp>0?s.hp/s.maxHp:0;return[
  {icon:'♥',label:'Vie',value:`${s.hp}/${s.maxHp}`,cls:r<=.3?'status-critical':r<=.55?'status-warning':''},
  {icon:'◆',label:'Dextérité',value:String(currentDexterity(s))},{icon:'⚔',label:'Force',value:String(currentForce(s))},{icon:'†',label:'Arme',value:s.weapon&&s.weapon!=='none'?('+'+String(combatPower(s))):'0'},{icon:'🛡',label:'Protection',value:String(currentProtection(s))},{icon:'●',label:'Soldats',value:`${displayedSoldierCount(s)}/${s.maxSoldiers}`}];},
 resetSeriesOnRestart:true,showMissingIllustrationPlaceholder:true,story:STORY,pageOrder:PAGE_ORDER,pageByNode:PAGE_BY_NODE,navigationTitles:PAGE_NAV_TITLES,padPage,
 imageBaseForPage:n=>`Le-Secret-du-Providence-${padPage(n)}`,imageCandidatesForPage:n=>[`Le-Secret-du-Providence-${padPage(n)}`,`pages/Le-Secret-du-Providence-${padPage(n)}`],imageExtensions:['jpg','jpeg','png'],
 createInitialState,rules:{currentForce,currentDexterity,combatPower,weaponLabel,currentProtection,applyDamage},characterSheetHtml,inventory,
 storyModals:{'village-assault-rules':{title:'Règles du combat',html:villageAssaultRulesHtml}},
 checkpoints:[{node:'c20',label:'Zone de disparition',onlyIfNone:true},{node:'c34',label:'Arrivée sur l’île'},{node:'c57',label:'Retour sur le Providence'}],
 conclusion:{successNodes:[],deathNodes:['death'],successTitle:'À suivre',deathTitle:'Votre aventure s’achève ici',successText:'Vous avez atteint la fin de cette version de test du Secret du Providence.',deathText:'Votre mission s’arrête ici. Vous pouvez reprendre au dernier point de sauvegarde ou recommencer.',showJournalRecap:true},
 exportSeriesMemory(){return {};}
});
})();