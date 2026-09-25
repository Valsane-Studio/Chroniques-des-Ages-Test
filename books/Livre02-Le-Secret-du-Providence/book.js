/* Livre 02 — Le Secret du Providence */
(function(){
'use strict';

function heroGender(s){return s.heroGender==='male'?'male':'female';}
function heroName(s){return heroGender(s)==='male'?'Edward':'Eleanor';}
function heroRank(){return 'Lieutenant de la Royal Navy';}
function setHeroIdentity(s,g){s.heroGender=g==='male'?'male':'female';s.heroName=heroName(s);}
function currentForce(s){return Math.max(3,(s.baseForce||8)+(s.forceBonus||0));}
function currentDexterity(s){return Math.max(3,(s.baseDexterity||13)+(s.dexBonus||0)-(s.dexPenalty||0));}
function combatPower(s){return s.weapon==='naval_sword'?4:0;}
function weaponLabel(s){return s.weapon==='naval_sword'?'Sabre court de marine':'Aucune';}
function currentProtection(s){return Math.max(0,Number(s.protection||0));}
function applyDamage(s,a){
  const incoming=Math.max(0,Math.floor(Number(a)||0));
  const absorbed=Math.min(currentProtection(s),incoming);
  const hpLost=incoming-absorbed;
  s.hp=Math.max(0,s.hp-hpLost);
  return {incoming,absorbed,hpLost,heroHp:s.hp};
}
function addGold(s,n){s.goldCoins=(s.goldCoins||0)+n;}
function loseSoldier(s,n=1){
  const loss=Math.min(Math.max(0,n),s.expeditionSoldiers||0);
  s.expeditionSoldiers=Math.max(0,(s.expeditionSoldiers||0)-loss);
  s.soldiers=Math.max(0,(s.soldiers||0)-loss);
  return loss;
}
function addBlueDiamond(s){
  if(!s.inventory.diamant_bleu)addItem(s,'diamant_bleu','Diamant bleu','Une pierre bleue taillée, d’un éclat anormalement profond.',{quantity:1});
  else s.inventory.diamant_bleu.quantity=(s.inventory.diamant_bleu.quantity||1)+1;
}
function rollDex(s,bonus=0,label='Dextérité'){
  const target=currentDexterity(s)-Math.max(0,bonus);
  return roll3D6(s,bonus?label+' — malus +'+bonus:label,target);
}
function crewBattleRound(s,key,enemyCount=12){
  if(!s.crewBattles)s.crewBattles={};
  const b=s.crewBattles[key]||(s.crewBattles[key]={enemy:enemyCount,round:0,last:null});
  if(b.enemy<=0||s.soldiers<=0)return;
  const hd=[cryptoDie6(),cryptoDie6()],ed=[cryptoDie6(),cryptoDie6()];
  const hs=8+4+s.soldiers+hd[0]+hd[1],es=6+2+b.enemy+ed[0]+ed[1];
  let loss=0,side='tie';
  if(hs!==es){
    const gap=Math.abs(hs-es);loss=gap>=9?3:gap>=5?2:1;
    if(hs>es){side='pirates';b.enemy=Math.max(0,b.enemy-loss);}
    else{side='soldiers';s.soldiers=Math.max(0,s.soldiers-loss);}
  }
  b.round++;b.last={hs,es,loss,side};
}
function crewBattleHtml(s,key){
  const b=s.crewBattles?.[key];if(!b)return '';
  const l=b.last;
  return `<div class="combat-roll-result"><div class="combat-roll-title">Combat d’équipage</div>
    <p>Soldats : <strong>${s.soldiers}</strong> · Pirates : <strong>${b.enemy}</strong></p>
    ${l?`<p>Tes hommes : <strong>${l.hs}</strong> · Pirates : <strong>${l.es}</strong></p>
    <p>${l.side==='tie'?'Égalité. Aucun camp ne cède.':l.side==='pirates'?`Les pirates perdent ${l.loss} homme${l.loss>1?'s':''}.`:`Tu perds ${l.loss} soldat${l.loss>1?'s':''}.`}</p>`:''}</div>`;
}
function fightRound(s,key,e){
  if(!s.combats)s.combats={};
  const c=s.combats[key]||(s.combats[key]={hp:e.hp,round:0,last:null});
  const hd=[cryptoDie6(),cryptoDie6()],ed=[cryptoDie6(),cryptoDie6()];
  const ha=currentDexterity(s)+hd[0]+hd[1],ea=e.dex+ed[0]+ed[1];
  let outcome='tie',damage=0;
  if(ha>ea){outcome='hero';damage=Math.max(1,Math.floor(currentForce(s)/4))+combatPower(s);c.hp=Math.max(0,c.hp-damage);}
  else if(ha<ea){outcome='enemy';damage=e.damage;applyDamage(s,damage);}
  c.round++;c.last={ha,ea,outcome,damage};
}
function fightHtml(s,key,e){
  const c=s.combats?.[key];if(!c)return '';
  const r=c.last;
  return `<div class="combat-roll-result"><div class="combat-roll-title">${e.name}</div>
  <p>Ta Vie : <strong>${s.hp}/${s.maxHp}</strong> · Vie adverse : <strong>${c.hp}/${e.hp}</strong></p>
  ${r?`<p>Attaque : ${r.ha} contre ${r.ea}</p><p>${r.outcome==='hero'?`Tu infliges ${r.damage} dégâts.`:r.outcome==='enemy'?`Tu subis ${r.damage} dégâts.`:'Égalité, aucun dégât.'}</p>`:''}</div>`;
}
const CAPTAIN={name:'CAPITAINE PIRATE',hp:10,dex:9,damage:2};
const ALLIGATOR={name:'ALLIGATOR',hp:8,dex:7,damage:3};

function createInitialState(){
  return {
    node:'start',pageMapVersion:1,heroGender:'female',heroName:'Eleanor',
    inventory:{},flags:{},visited:{},history:[],journal:'',
    hp:18,maxHp:18,baseForce:8,baseDexterity:13,forceBonus:0,dexBonus:0,dexPenalty:0,
    weapon:'naval_sword',protection:0,goldCoins:0,
    soldiers:8,maxSoldiers:8,expeditionSoldiers:0,shipSoldiers:8,
    crewBattles:{},combats:{},damageRolls:{},damageRollResults:{},
    lastDice:null,lastTotal:null,lastStat:null,lastStatName:'',rollCount:0,currentCheckpoint:null
  };
}

const STORY={
 start:{sheet:true,title:'Choisis ton personnage',text:s=>`
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
   </div></div>`,choices:[{label:'Commencer l’aventure',to:'c1'}]},
 c1:{title:'La mission',text:`<p>1719. À Port Royal, l’Amirauté te confie une mission inhabituelle.</p><p>Le <strong>Providence</strong>, navire marchand appartenant à Edmund Harcourt, aurait dû rejoindre la Jamaïque il y a quatre jours. Vingt-sept hommes se trouvaient à bord.</p><p>Aucun message. Aucun survivant. Aucune épave.</p><p>Tu prends le commandement du <strong>Resolute</strong>, un sloop armé. Huit soldats embarquent avec toi.</p>`,choices:[{label:'Étudier la carte',to:'c2'}]},
 c2:{title:'Deux routes',text:`<p>Une route côtière permet de passer par un village proche de la dernière position connue du Providence.</p><p>Une route directe par le large ferait gagner presque une journée, mais les pirates y sont nombreux.</p>`,choices:[{label:'Longer la côte',to:'c3'},{label:'Couper par le large',to:'c12'}]},
 c3:{title:'Le village',text:`<p>À la tombée du jour, vous amarrez le Resolute dans un petit village côtier.</p><p>Une taverne est encore ouverte.</p>`,choices:[{label:'Entrer dans la taverne',to:'c4'}]},
 c4:{title:'La taverne',text:`<p>Trois personnes peuvent avoir entendu parler du Providence : le tavernier, un vieux marin et une femme étrangère au maintien presque militaire.</p>`,choices:[{label:'Interroger le tavernier',to:'c5'},{label:'Interroger le vieux marin',to:'c6'},{label:'Interroger l’Espagnole',to:'c7'},{label:'Quitter la taverne',to:'c8'}]},
 c5:{title:'Le tavernier',text:`<p>Il nie d’abord tout savoir. Lorsque tu invoques ton autorité, il cède.</p><blockquote>« Il est passé. Un pêcheur disait ensuite que le bateau était maudit. N’allez pas le chercher. »</blockquote>`,choices:[{label:'Regagner ta chambre',to:'c8'}]},
 c6:{title:'Le vieux marin',text:`<blockquote>« Votre Royal Navy devrait repartir. Il y a quelque chose dans cette partie de la mer. »</blockquote><p>Tu évoques les pirates.</p><blockquote>« Si seulement. »</blockquote>`,choices:[{label:'Regagner ta chambre',to:'c8'}]},
 c7:{title:'L’Espagnole',text:`<p>Elle finit par céder.</p><blockquote>« Votre bateau cherchait quelque chose. Quelque chose qui n’aurait jamais dû être trouvé. »</blockquote>`,choices:[{label:'Regagner ta chambre',to:'c8'}]},
 c8:{title:'Un bruit dans la chambre',text:`<p>Un craquement te réveille. Une silhouette surgit dans l’obscurité, lame levée.</p>`,choices:[{label:'Réagir — test de Dextérité',to:'c9',diceTest:true,effect:s=>{s.flags.nightDex=rollDex(s);if(!s.flags.nightDex)rollDamage(s,'night',3);}}]},
 c9:{title:'L’assaillant',text:s=>diceResultHtml(s)+(s.flags.nightDex?'<p>Tu évites la lame et frappes avec le couteau caché sous ton oreiller.</p>':damageResultHtml(s,'night')+'<p>Malgré ta blessure, tu parviens à frapper.</p>')+`<blockquote>« Abandonnez les recherches... le trésor doit disparaître à jamais. »</blockquote>`,choices:[{label:'Fouiller son corps',to:'c10',effect:s=>{if(!s.flags.assassinLoot){s.flags.assassinLoot=true;addGold(s,8);addItem(s,'couteaux_jet','Deux couteaux équilibrés','Deux petits couteaux pouvant être lancés.',{quantity:2});}}}]},
 c10:{title:'À l’aube',text:`<p>Tu récupères huit pièces d’or et deux petits couteaux équilibrés.</p><p>À l’aube, le Resolute reprend la mer.</p>`,choices:[{label:'Rejoindre la zone de disparition',to:'c20'}]},
 c12:{title:'Le pavillon noir',text:`<p>Un bâtiment rapide approche. Un pavillon noir monte.</p><p>Vous refusez de vous rendre. Le noir redescend. Un pavillon rouge prend sa place.</p>`,choices:[{label:'Préparer les soldats',to:'c13',effect:s=>{s.crewBattles.pirates1={enemy:12,round:0,last:null};}}]},
 c13:{title:'L’abordage',text:s=>`<p>Les pirates passent à l’abordage.</p>${crewBattleHtml(s,'pirates1')}`,choices:s=>{const b=s.crewBattles.pirates1;if(s.soldiers<=0)return[{label:'Le Resolute est submergé',to:'death'}];if(b.enemy<=0)return[{label:'Passer sur le navire pirate',to:'c15'}];return[{label:'Lancer les dés — assaut suivant',stay:true,inlineCombat:true,effect:x=>crewBattleRound(x,'pirates1',12)}];}},
 c15:{title:'Le capitaine pirate',text:s=>`<p>Tu bondis sur le pont adverse. Le capitaine tire son sabre.</p>${fightHtml(s,'captain',CAPTAIN)}`,choices:s=>{const c=s.combats?.captain;if(s.hp<=0)return[{label:'Tu t’effondres',to:'death'}];if(c&&c.hp<=0)return[{label:'Fouiller le capitaine',to:'c16'}];return[{label:'Jeter les dés — combattre',stay:true,inlineCombat:true,effect:x=>fightRound(x,'captain',CAPTAIN)}];}},
 c16:{title:'Les gantelets',text:`<p>Le capitaine porte des gantelets de cuir renforcés de petites plaques métalliques rivetées.</p><p><strong>Protection +4.</strong></p>`,choices:[{label:'Les prendre et repartir',to:'c20',effect:s=>{if(!s.flags.gauntlets){s.flags.gauntlets=true;s.protection=4;addItem(s,'gantelets','Gantelets renforcés','Gantelets de cuir renforcés. Protection +4.');}}}]},
 c20:{title:'La zone de disparition',text:`<p>Une immense forme sombre passe sous le Resolute. Elle est plus longue que le navire.</p><p>Les vieilles histoires de marins te reviennent en mémoire. Le Kraken.</p>`,choices:[{label:'Continuer les recherches',to:'c21'}]},
 c21:{title:'Le Providence',text:`<p>Le Providence apparaît enfin. Pont désert. De longues marques sombres couvrent la coque.</p>`,choices:[{label:'Approcher seul en chaloupe',to:'c22'},{label:'Accoster directement avec le Resolute',to:'c27'}]},
 c22:{title:'La chaloupe',text:`<p>Une masse passe sous l’embarcation et la soulève.</p>`,choices:[{label:'Garder l’équilibre — Dextérité',to:'c23',diceTest:true,effect:s=>{s.flags.boatDex=rollDex(s);if(!s.flags.boatDex)rollDamage(s,'boat',3);}}]},
 c23:{title:'Sous l’eau',text:s=>diceResultHtml(s)+(s.flags.boatDex?'<p>Tu restes à bord.</p>':damageResultHtml(s,'boat')+'<p>Quelque chose te tire sous l’eau avant que ton couteau te libère.</p>'),choices:[{label:'Rejoindre le navire',to:'c24'}]},
 c24:{title:'Le sabord',text:`<p>Un sabord est ouvert. Tu entres dans un entrepont sombre. La porte est verrouillée.</p>`,choices:[{label:'Forcer la porte — Dextérité',to:'c25',diceTest:true,effect:s=>s.flags.doorDex=rollDex(s)},{label:'Chercher une autre issue',to:'c26'}]},
 c25:{title:'La porte',text:s=>diceResultHtml(s)+(s.flags.doorDex?'<p>Le verrou cède.</p>':'<p>Le verrou tient.</p>'),choices:s=>s.flags.doorDex?[{label:'Monter vers le pont',to:'c28'}]:[{label:'Chercher une autre issue',to:'c26'}]},
 c26:{title:'Entre les planches',text:`<p>Une cloison fendue permet de rejoindre la pièce voisine.</p><p>Sous un banc se trouve un sachet de poudre verte. Dans un coffre, un diamant bleu.</p>`,choices:[{label:'Prendre les deux objets',to:'c28',effect:s=>{addItem(s,'poudre_verte','Poudre verte','Une poudre verte très fine.');addBlueDiamond(s);}},{label:'Prendre seulement le diamant',to:'c28',effect:addBlueDiamond},{label:'Ne rien prendre',to:'c28'}]},
 c27:{title:'Bord à bord',text:`<p>Les deux navires se placent bord à bord. Tes hommes montent les premiers. Personne ne les attaque.</p>`,choices:[{label:'Explorer le Providence',to:'c28'}]},
 c28:{title:'Le pont désert',text:`<p>Tout semble avoir été abandonné en quelques secondes. Pas un seul corps.</p>`,choices:[{label:'Entrer dans la cabine du capitaine',to:'c29'}]},
 c29:{title:'Les dessins',text:`<p>Les murs sont couverts de dessins : une créature gigantesque, deux yeux verts, une île parsemée de <strong>pierres bleues</strong> et un coffre d’où jaillit une <strong>lumière bleue</strong>.</p>`,choices:[{label:'Fouiller le coffre du capitaine',to:'c30'}]},
 c30:{title:'Les cartes',text:`<p>Des dizaines de cartes représentent la même île.</p><blockquote>« Là où elle dort. »</blockquote><blockquote>« Nous n’aurions jamais dû ouvrir le coffre. »</blockquote><p>Le journal confirme que le Providence revenait de l’île lorsqu’une chose a commencé à le suivre.</p>`,choices:[{label:'Mettre le cap sur l’île',to:'c31'}]},
 c31:{title:'Le navire sans pavillon',text:`<p>Un navire apparaît. Aucun pavillon.</p><p>Le contourner ferait perdre plusieurs heures.</p>`,choices:[{label:'Contourner le navire',to:'c34',effect:s=>s.flags.islandDelay=true},{label:'Maintenir le cap',to:'c32',effect:s=>{s.crewBattles.pirates2={enemy:9,round:0,last:null};}}]},
 c32:{title:'Une seconde attaque',text:s=>`<p>Le navire révèle ses pirates.</p>${crewBattleHtml(s,'pirates2')}`,choices:s=>{const b=s.crewBattles.pirates2;if(s.soldiers<=0)return[{label:'Tes hommes sont anéantis',to:'death'}];if(b.enemy<=0)return[{label:'Reprendre la route',to:'c34'}];return[{label:'Lancer les dés — assaut suivant',stay:true,inlineCombat:true,effect:x=>crewBattleRound(x,'pirates2',9)}];}},
 c34:{title:'La crique',text:s=>`<p>L’île est petite, sauvage et couverte d’une jungle dense.</p><p>Il te reste <strong>${s.soldiers}</strong> soldats. Tu peux en emmener jusqu’à trois. Au moins deux doivent rester sur les navires.</p>`,choices:s=>[0,1,2,3].filter(n=>n<=Math.max(0,s.soldiers-2)).map(n=>({label:n===0?'Partir seul':`Emmener ${n} soldat${n>1?'s':''}`,to:'c35',effect:x=>{x.expeditionSoldiers=n;x.shipSoldiers=x.soldiers-n;}}))},
 c35:{title:'À qui confier le commandement ?',text:`<p><strong>William Briggs</strong> est bourru, courageux et efficace. Il prendra la bonne décision, même si elle consiste à partir sans toi.</p><p><strong>Nathaniel Hale</strong> est intelligent et loyal. Il hésite davantage, mais ne t’abandonnera pas.</p>`,choices:[{label:'Choisir William Briggs',to:'c36',effect:s=>s.flags.commander='briggs'},{label:'Choisir Nathaniel Hale',to:'c36',effect:s=>s.flags.commander='hale'}]},
 c36:{title:'Le premier piège',text:s=>`<p>Un énorme tronc hérissé de pieux bascule entre les arbres.</p>${s.expeditionSoldiers>0?'<p>Un de tes hommes est frappé de plein fouet.</p>':'<p>Le tronc fonce vers toi.</p>'}`,onEnter:s=>{if(!s.flags.firstTrap){s.flags.firstTrap=true;if(s.expeditionSoldiers>0)loseSoldier(s,1);}},choices:s=>s.expeditionSoldiers===0?[{label:'Éviter le piège — Dextérité',to:'c37',diceTest:true,effect:x=>{x.flags.trapDex=rollDex(x);if(!x.flags.trapDex)rollDamage(x,'jungleTrap',3);}}]:[{label:'Continuer',to:'c38'}]},
 c37:{title:'À quelques centimètres',text:s=>diceResultHtml(s)+(s.flags.trapDex?'<p>Tu te jettes au sol juste à temps.</p>':damageResultHtml(s,'jungleTrap')),choices:[{label:'Continuer',to:'c38'}]},
 c38:{title:'Le ravin',text:`<p>Un vieux pont de corde franchit un ravin.</p>`,choices:[{label:'Passer un par un',to:'c39'},{label:'Passer tous ensemble',to:'c42'},{label:'Descendre dans le ravin',to:'c44'},{label:'Contourner par la forêt',to:'c48'}]},
 c39:{title:'Un par un',text:`<p>Chaque planche craque sous ton poids.</p>`,choices:[{label:'Traverser — Dextérité',to:'c40',diceTest:true,effect:s=>s.flags.bridgeHero=rollDex(s)}]},
 c40:{title:'Le pont cède',text:s=>diceResultHtml(s)+`<p>Une corde finit par céder. Un homme disparaît avec les planches. Ceux restés de l’autre côté annoncent qu’ils contourneront par la forêt.</p><p>Au fond de toi, tu le sais déjà : <strong>tu ne les reverras jamais.</strong></p>`,onEnter:s=>{if(!s.flags.bridgeLoss){s.flags.bridgeLoss=true;if(s.expeditionSoldiers>0)loseSoldier(s,1);s.expeditionSoldiers=0;}},choices:[{label:'Continuer',to:'c51'}]},
 c42:{title:'Tous ensemble',text:`<p>Vous courez. Le pont s’effondre. Tes compagnons disparaissent dans le ravin.</p>`,onEnter:s=>{if(!s.flags.bridgeRushLoss){s.flags.bridgeRushLoss=true;while(s.expeditionSoldiers>0)loseSoldier(s,1);}},choices:[{label:'Savoir si tu es blessé — Dextérité',to:'c43',diceTest:true,effect:s=>{s.flags.bridgeRushDex=rollDex(s);if(!s.flags.bridgeRushDex)rollDamage(s,'bridgeRush',3);}}]},
 c43:{title:'Suspendu à la corde',text:s=>diceResultHtml(s)+(s.flags.bridgeRushDex?'<p>Tu te hisses sans autre blessure.</p>':damageResultHtml(s,'bridgeRush')),choices:[{label:'Continuer',to:'c51'}]},
 c44:{title:'Le fond du ravin',text:s=>`<p>La boue bouge.</p>${s.expeditionSoldiers>0?'<p>Une énorme gueule entraîne un de tes hommes sous l’eau.</p>':'<p>Une énorme gueule se referme sur ta botte.</p>'}`,onEnter:s=>{if(!s.flags.gatorFirst){s.flags.gatorFirst=true;if(s.expeditionSoldiers>0)loseSoldier(s,1);}},choices:s=>s.expeditionSoldiers===0?[{label:'Te libérer — Dextérité',to:'c45',diceTest:true,effect:x=>{x.flags.gatorDex=rollDex(x);if(!x.flags.gatorDex)rollDamage(x,'gatorBite',3);}}]:[{label:'Affronter l’alligator',to:'c46'}]},
 c45:{title:'La mâchoire',text:s=>diceResultHtml(s)+(s.flags.gatorDex?'<p>Tu retires ton pied juste à temps.</p>':damageResultHtml(s,'gatorBite')),choices:[{label:'Combattre',to:'c46'}]},
 c46:{title:'L’alligator',text:s=>fightHtml(s,'alligator',ALLIGATOR),choices:s=>{const c=s.combats?.alligator;if(s.hp<=0)return[{label:'Tu succombes',to:'death'}];if(c&&c.hp<=0)return[{label:'Observer le corps plus loin',to:'c47'}];return[{label:'Jeter les dés — combattre',stay:true,inlineCombat:true,effect:x=>fightRound(x,'alligator',ALLIGATOR)}];}},
 c47:{title:'Le corps dans la boue',text:`<p>Un cadavre porte un diamant bleu et un bracelet.</p>`,choices:[{label:'Le fouiller',to:'c51',effect:s=>{if(!s.flags.ravineLoot){s.flags.ravineLoot=true;addBlueDiamond(s);s.forceBonus+=2;addItem(s,'bracelet_force','Bracelet de force','Force +2.');}}},{label:'Continuer',to:'c51'}]},
 c48:{title:'Le détour par la forêt',text:s=>`<p>Un claquement de mâchoires retentit derrière vous.</p>${s.expeditionSoldiers>0?'<p>Un de tes hommes a disparu.</p>':''}`,onEnter:s=>{if(!s.flags.forestFirst){s.flags.forestFirst=true;if(s.expeditionSoldiers>0)loseSoldier(s,1);}},choices:[{label:'Courir — Dextérité',to:'c49',diceTest:true,effect:s=>{s.flags.forestDex=rollDex(s);if(!s.flags.forestDex)rollDamage(s,'forestRun',3);if(s.expeditionSoldiers>0&&cryptoDie6()<=3)loseSoldier(s,1);}}]},
 c49:{title:'La course',text:s=>diceResultHtml(s)+(s.flags.forestDex?'<p>Tu atteins le passage.</p>':damageResultHtml(s,'forestRun')),choices:[{label:'Continuer',to:'c51'}]},
 c51:{title:'Le survivant',text:s=>s.flags.islandDelay?`<p>Un homme du Providence est mort contre un arbre depuis quelques heures. Une marque claire sur son doigt montre qu’il portait une bague.</p>`:`<p>Un survivant du Providence tremble contre un arbre.</p><blockquote>« Ils sont là... presque transparents... leurs yeux... ne les suivez pas. »</blockquote><p>Il te tend une bague ornée d’une tête de mort.</p><blockquote>« C’est ça qui m’a sauvé. »</blockquote>`,choices:[{label:'Continuer',to:'c52',effect:s=>{if(!s.flags.islandDelay&&!s.flags.skullRing){s.flags.skullRing=true;addItem(s,'bague_crane','Bague au crâne','Son effet est inconnu.');}}}]},
 c52:{title:'Le village abandonné',text:`<p>Une dizaine de huttes apparaissent. Des caisses portent la marque du Providence.</p>`,choices:[{label:'Fouiller les huttes',to:'c53'}]},
 c53:{title:'Le carnet du marin',text:`<p>Le Providence avait lui-même trouvé la carte sur un autre navire abandonné.</p><p>Le capitaine avait changé de cap. Sur l’île, disputes, trahisons et morts s’étaient multipliées.</p><p>Puis un homme livide, presque transparent, était apparu et leur avait montré le lieu exact.</p><blockquote>« Nous l’avons trouvé. Nous aurions dû repartir. »</blockquote><p>Le trésor a été caché dans une cale secrète du Providence.</p>`,choices:[{label:'Retourner aux navires',to:'c54'}]},
 c54:{title:'Le retour',text:s=>s.expeditionSoldiers>0?'<p>Un dernier piège tue un de tes compagnons.</p>':'<p>Un dernier piège se déclenche devant toi.</p>',onEnter:s=>{if(!s.flags.returnTrap){s.flags.returnTrap=true;if(s.expeditionSoldiers>0)loseSoldier(s,1);}},choices:s=>s.expeditionSoldiers===0?[{label:'Éviter le piège — Dextérité',to:'c55',diceTest:true,effect:x=>{x.flags.returnDex=rollDex(x);if(!x.flags.returnDex)rollDamage(x,'returnTrap',3);}}]:[{label:'Atteindre la plage',to:'c56'}]},
 c55:{title:'Le dernier piège',text:s=>diceResultHtml(s)+(s.flags.returnDex?'<p>Tu évites le mécanisme.</p>':damageResultHtml(s,'returnTrap')),choices:[{label:'Atteindre la plage',to:'c56'}]},
 c56:{title:'La plage',text:s=>s.flags.commander==='hale'?`<p>Le Resolute est vide.</p><p>Briggs t’attend sur le Providence, sabre en main. Il avait essayé de convaincre les hommes de partir, sans être écouté. Il avait décidé de remettre le Providence en état pour ceux qui voudraient fuir. À peine avait-il posé le pied sur le navire marchand que tout s’était tu.</p><p><strong>Briggs devient ton compagnon.</strong></p>`:`<p>Le Resolute a disparu.</p><p>Hale t’attend près d’une chaloupe. Briggs a choisi de sauver l’équipage en quittant la crique. Hale est resté pour toi.</p><p><strong>Hale devient ton compagnon.</strong></p>`,onEnter:s=>{if(!s.flags.companion)s.flags.companion=s.flags.commander==='hale'?'briggs':'hale';},choices:[{label:'Monter sur le Providence',to:'c57'}]},
 c57:{title:'La cale du Providence',text:`<p>Une irrégularité entre deux planches révèle une trappe secrète.</p>`,choices:[{label:'Ouvrir la cache',to:'c58'}]},
 c58:{title:'Le trésor',text:`<p>Le coffre est rempli de pierres bleues, toutes d’un éclat bleu profond.</p><p>Une chaleur brutale traverse la cale. De la fumée entre par la porte. Le Providence prend feu.</p>`,choices:[{label:'Traverser immédiatement la fumée',to:'c59'},{label:'Percer la coque, tout en sachant que la mer est peut-être au-dessus de vous',to:'c61'}]},
 c59:{title:'La fumée',text:`<p>Quelques flammes entourent la porte.</p>`,choices:[{label:'Passer — Dextérité',to:'c60',diceTest:true,effect:s=>{s.flags.fireDex=rollDex(s);if(!s.flags.fireDex)rollDamage(s,'fireEasy',3);}}]},
 c60:{title:'À travers les flammes',text:s=>diceResultHtml(s)+(s.flags.fireDex?'<p>Tu franchis le passage.</p>':damageResultHtml(s,'fireEasy')),choices:[{label:'Continuer',to:'c63'}]},
 c61:{title:'La coque',text:`<p>Le bois cède. Une masse d’eau entre dans la cale. Vous êtes sous le niveau de la mer.</p><p>Il faut revenir vers la porte après avoir perdu un temps précieux.</p><p><strong>Test de Dextérité — malus +3.</strong></p>`,choices:[{label:'Traverser les flammes',to:'c62',diceTest:true,effect:s=>{s.flags.fireHardDex=rollDex(s,3);if(!s.flags.fireHardDex)rollDamage(s,'fireHard',6);}}]},
 c62:{title:'Le passage en feu',text:s=>diceResultHtml(s)+(s.flags.fireHardDex?'<p>Tu franchis la porte.</p>':damageResultHtml(s,'fireHard')),choices:[{label:'Continuer',to:'c63'}]},
 c63:{title:'Une dernière décision',text:`<p>Un escalier en feu monte vers le pont. Un sabord ouvert donne directement sur la mer.</p>`,choices:[{label:'Prendre l’escalier',to:'c64'},{label:'Sauter à l’eau',to:'c66'}]},
 c64:{title:'L’escalier en feu',text:s=>`<p>${s.flags.companion==='briggs'?'Briggs':'Hale'} passe devant toi. L’escalier s’effondre et ton compagnon disparaît dans les flammes.</p>`,onEnter:s=>s.flags.companionLost=true,choices:[{label:'Éviter d’être blessé — Dextérité',to:'c65',diceTest:true,effect:s=>{s.flags.stairsDex=rollDex(s);if(!s.flags.stairsDex)rollDamage(s,'stairs',3);}}]},
 c65:{title:'Seul sur le pont',text:s=>diceResultHtml(s)+(s.flags.stairsDex?'<p>Tu atteins le pont sans autre blessure.</p>':damageResultHtml(s,'stairs')),choices:[{label:'Rejoindre la chaloupe',to:'c68'}]},
 c66:{title:'Dans l’eau',text:s=>`<p>Une masse immense se déplace sous vous.</p><p>${s.flags.companion==='briggs'?'Briggs':'Hale'} pousse un hurlement et disparaît brutalement sous la surface.</p>`,onEnter:s=>s.flags.companionLost=true,choices:[{label:'Nager jusqu’à la chaloupe',to:'c68'}]},
 c68:{title:'En pleine mer',text:`<p>Le Providence brûle derrière toi. Il ne te reste qu’une chaloupe et quelques provisions.</p><p>Après plusieurs heures, une nouvelle île apparaît. Elle semble calme et hospitalière.</p>`,choices:[{label:'Mettre le cap sur cette île',to:'c69'}]},
 c69:{title:'Une autre île',text:`<p>Une longue plage claire borde la côte.</p><p>Tu diriges la chaloupe vers la rive.</p><p><strong>Tu ignores encore que le Providence n’était que le commencement.</strong></p>`,choices:[]},
 death:{title:'La fin du voyage',text:`<p>Tu n’as plus la force de poursuivre.</p><div class="ending">FIN DE L’AVENTURE</div>`,choices:[{label:'Recommencer',action:'restart'}]}
};

const PAGE_ORDER=['c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','c12','c13','c15','c16','c20','c21','c22','c23','c24','c25','c26','c27','c28','c29','c30','c31','c32','c34','c35','c36','c37','c38','c39','c40','c42','c43','c44','c45','c46','c47','c48','c49','c51','c52','c53','c54','c55','c56','c57','c58','c59','c60','c61','c62','c63','c64','c65','c66','c68','c69','death'];
const PAGE_BY_NODE=Object.fromEntries(PAGE_ORDER.map((id,i)=>[id,i+1]));
const padPage=n=>String(n).padStart(3,'0');

const inventory={
 topLine:s=>`Or : ${s.goldCoins||0} · Arme : ${weaponLabel(s)} · Soldats : ${s.soldiers}`,
 extraHtml:s=>`<div class="inventory-equipment-card"><div class="inventory-equipment-title">État de l’expédition</div><div class="inventory-equipment-row"><span>Soldats survivants</span><strong>${s.soldiers}/${s.maxSoldiers}</strong></div><div class="inventory-equipment-row"><span>Avec toi sur l’île</span><strong>${s.expeditionSoldiers||0}</strong></div><div class="inventory-equipment-row"><span>Protection</span><strong>${currentProtection(s)}</strong></div></div>`,
 actionHtml:()=>'',handleAction:()=>false
};

function characterSheetHtml(s){
 return `<div class="character-modal-sheet"><div class="character-modal-name">${heroName(s)}</div><div class="character-modal-rank">${heroRank()}</div><div class="character-modal-stats">
 <div><span class="tag-copy"><small>Vie</small><strong>${s.hp}/${s.maxHp}</strong></span></div><div><span class="tag-copy"><small>Dextérité</small><strong>${currentDexterity(s)}</strong></span></div><div><span class="tag-copy"><small>Force</small><strong>${currentForce(s)}</strong></span></div><div><span class="tag-copy"><small>Arme</small><strong>+4</strong></span></div><div><span class="tag-copy"><small>Protection</small><strong>${currentProtection(s)}</strong></span></div><div><span class="tag-copy"><small>Soldats</small><strong>${s.soldiers}</strong></span></div>
 </div></div>`;
}

BookRegistry.register({
 id:'providence-02',initialMaxHp:18,seriesId:'providence',seriesLabel:'PROVIDENCE',episode:1,orderInSeries:1,
 slug:'le-secret-du-providence',title:'Le Secret du Providence',description:'Une mission maritime de la Royal Navy en 1719.',access:'free',
 contentVersion:2,pageMapVersion:1,saveVersion:1,libraryNumber:2,libraryLabel:'Livre 02',sheetLabel:'FICHE DU PERSONNAGE',
 readerEyebrow:'Chroniques d’un autre temps - Livre 02',
 assetBase:'./books/Livre02-Le-Secret-du-Providence/images',assetBases:['./books/Livre02-Le-Secret-du-Providence/images'],uiAssetBase:'./books/Livre02-Le-Secret-du-Providence/assets',
 seriesProfileDefaults:{heroGender:'female',heroName:'Eleanor',baseStats:{maxHp:18,force:8,dexterity:13}},
 normalizeSeriesProfile(p){p.heroName=p.heroGender==='male'?'Edward':'Eleanor';p.baseStats={maxHp:18,force:8,dexterity:13};},
 syncSeriesProfile(s,p){p.heroGender=s.heroGender==='male'?'male':'female';p.heroName=heroName(s);p.baseStats={maxHp:18,force:8,dexterity:13};p.memory={...(p.memory||{})};},
 handleProfileInputChange(s,input){if(input?.classList.contains('hero-gender-input'))setHeroIdentity(s,input.value);},
 statusStats(s){const r=s.maxHp>0?s.hp/s.maxHp:0;return[
  {icon:'♥',label:'Vie',value:`${s.hp}/${s.maxHp}`,cls:r<=.3?'status-critical':r<=.55?'status-warning':''},
  {icon:'◆',label:'Dextérité',value:String(currentDexterity(s))},{icon:'⚔',label:'Force',value:String(currentForce(s))},{icon:'†',label:'Arme',value:'+4'},{icon:'🛡',label:'Protection',value:String(currentProtection(s))},{icon:'●',label:'Soldats',value:`${s.soldiers}/${s.maxSoldiers}`}];},
 showMissingIllustrationPlaceholder:true,story:STORY,pageOrder:PAGE_ORDER,pageByNode:PAGE_BY_NODE,navigationTitles:{},padPage,
 imageBaseForPage:n=>`Le-Secret-du-Providence-${padPage(n)}`,imageCandidatesForPage:n=>[`Le-Secret-du-Providence-${padPage(n)}`,`pages/Le-Secret-du-Providence-${padPage(n)}`],imageExtensions:['jpg','jpeg','png'],
 createInitialState,rules:{currentForce,currentDexterity,combatPower,weaponLabel,currentProtection,applyDamage},characterSheetHtml,inventory,
 checkpoints:[{node:'c20',label:'Zone de disparition',onlyIfNone:true},{node:'c34',label:'Arrivée sur l’île'},{node:'c57',label:'Retour sur le Providence'}],
 conclusion:{successNodes:['c69'],deathNodes:['death'],successTitle:'À suivre',deathTitle:'Votre aventure s’achève ici',successText:'Vous avez atteint la fin de cette version de test du Secret du Providence.',deathText:'Votre mission s’arrête ici. Vous pouvez reprendre au dernier point de sauvegarde ou recommencer.',showJournalRecap:true},
 exportSeriesMemory(){return {};}
});
})();