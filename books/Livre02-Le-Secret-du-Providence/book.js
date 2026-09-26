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
function startCrewBattle(s,key,enemyCount=12,soldierPower=5,enemyPower=3,retreatAt=Math.floor(enemyCount/2)){
  if(!s.crewBattles)s.crewBattles={};
  s.crewBattles[key]={
    enemy:enemyCount,
    initialEnemy:enemyCount,
    round:0,
    last:null,
    soldierPower,
    enemyPower,
    retreatAt
  };
}
function normalizeCrewBattle(b,enemyCount=12,soldierPower=5,enemyPower=3,retreatAt=Math.floor(enemyCount/2)){
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
function crewBattleRound(s,key){
  const b=s.crewBattles?.[key];
  if(!b)return;
  normalizeCrewBattle(b,b.initialEnemy||12,b.soldierPower||5,b.enemyPower||3,b.retreatAt);
  if(b.enemy<=0||s.soldiers<=0||b.enemy<=b.retreatAt)return;

  const soldierCount=s.soldiers;
  const enemyCount=b.enemy;
  const soldierEffectif=Math.ceil(soldierCount/2);
  const enemyEffectif=Math.ceil(enemyCount/2);
  const soldierDice=[cryptoDie6(),cryptoDie6()];
  const enemyDice=[cryptoDie6(),cryptoDie6()];
  const soldierDiceTotal=soldierDice[0]+soldierDice[1];
  const enemyDiceTotal=enemyDice[0]+enemyDice[1];
  const soldierTotal=soldierDiceTotal+b.soldierPower+soldierEffectif;
  const enemyTotal=enemyDiceTotal+b.enemyPower+enemyEffectif;

  let outcome='tie';
  let soldierLoss=0;
  let enemyLoss=0;

  if(soldierTotal>enemyTotal){
    outcome='enemy';
    enemyLoss=1;
    b.enemy=Math.max(0,b.enemy-1);
  }else if(enemyTotal>soldierTotal){
    outcome='soldier';
    soldierLoss=1;
    s.soldiers=Math.max(0,s.soldiers-1);
  }

  b.round++;
  b.last={
    soldierDice,enemyDice,
    soldierDiceTotal,enemyDiceTotal,
    soldierCount,enemyCount,
    soldierEffectif,enemyEffectif,
    soldierTotal,enemyTotal,
    outcome,soldierLoss,enemyLoss
  };
}
function crewBattleHtml(s,key){
  const b=s.crewBattles?.[key];if(!b)return '';
  normalizeCrewBattle(b,b.initialEnemy||12,b.soldierPower||5,b.enemyPower||3,b.retreatAt);
  const l=b.last;
  const soldierPower=Number.isFinite(b.soldierPower)?b.soldierPower:5;
  const enemyPower=Number.isFinite(b.enemyPower)?b.enemyPower:3;
  const initialEnemy=b.initialEnemy||12;
  const retreatAt=Number.isFinite(b.retreatAt)?b.retreatAt:Math.floor(initialEnemy/2);
  const hasNewResult=!!(l&&Array.isArray(l.soldierDice)&&Array.isArray(l.enemyDice));
  const retreat=b.enemy<=retreatAt&&b.enemy>0;

  return `<div class="combat-roll-result"><div class="combat-roll-title">Combat de groupe</div>
    <p>Soldats : <strong>${s.soldiers}</strong> · Pirates : <strong>${b.enemy}</strong></p>
    ${hasNewResult?`
      <div class="dice-result crew-battle-compact">
        <div class="crew-battle-side">
          <span><strong>Soldats — ${l.soldierCount} hommes</strong></span>
          <span class="crew-battle-die">${l.soldierDice.map(renderDie).join('')}</span>
          <span>${l.soldierDice[0]} + ${l.soldierDice[1]} + puissance ${soldierPower} + effectif ${l.soldierEffectif} = <strong>${l.soldierTotal}</strong></span>
        </div>
        <div class="crew-battle-side">
          <span><strong>Pirates — ${l.enemyCount} hommes</strong></span>
          <span class="crew-battle-die">${l.enemyDice.map(renderDie).join('')}</span>
          <span>${l.enemyDice[0]} + ${l.enemyDice[1]} + puissance ${enemyPower} + effectif ${l.enemyEffectif} = <strong>${l.enemyTotal}</strong></span>
        </div>
        <p class="crew-battle-outcome"><strong>${l.outcome==='enemy'?'Les pirates perdent 1 homme.':l.outcome==='soldier'?'Tu perds 1 soldat.':'Égalité : aucune perte.'}</strong></p>
      </div>
    `:''}
    ${retreat?'<p><strong>Après avoir perdu la moitié de leurs hommes, les pirates rompent le combat.</strong></p>':''}
  </div>`;
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
   </div></div>`,choices:[{label:'Commencer l’aventure',to:'c0'}]},
 c0:{title:'Avant le Providence',text:s=>heroGender(s)==='female'?`<p>Tu es née en 1691, près des quais de Portsmouth. Ton père travaillait autour des navires et, très tôt, tu as appris à reconnaître une voile mal réglée, le bruit d’un gréement fatigué et l’odeur du mauvais temps avant même que le ciel ne change.</p><p>Mais la mer n’était pas un avenir destiné aux femmes.</p><p>À quinze ans, tu as coupé tes cheveux, abandonné tes robes et pris une identité masculine. Pour la Royal Navy, tu es devenue <strong>Edward</strong>. Seules quelques personnes connaissent encore ton véritable prénom : <strong>Eleanor</strong>.</p><p>Les années ont passé. Tu as appris à vivre parmi les hommes sans jamais laisser tomber le masque. Tu as servi pendant la guerre, connu les tempêtes, les abordages et les longues traversées. Ton sang-froid et ton sens de la navigation t’ont permis de gravir lentement les échelons.</p><p>Aujourd’hui, à vingt-huit ans, tu portes le grade de lieutenant. Une belle carrière s’ouvre devant toi, à condition que personne ne découvre jamais qui tu es réellement.</p><p>Depuis plusieurs mois, tu sers dans les Caraïbes. Port Royal est devenu ton port d’attache.</p>`:`<p>Tu es né en 1691, près des quais de Portsmouth. Ton père travaillait autour des navires et, très tôt, tu as appris à reconnaître une voile mal réglée, le bruit d’un gréement fatigué et l’odeur du mauvais temps avant même que le ciel ne change.</p><p>À quinze ans, tu as rejoint la Royal Navy.</p><p>Les années ont passé. Tu as servi pendant la guerre, connu les tempêtes, les abordages et les longues traversées. Ton sang-froid et ton sens de la navigation t’ont permis de gravir lentement les échelons.</p><p>Aujourd’hui, à vingt-huit ans, tu portes le grade de lieutenant. Tu n’es pas encore un grand nom de la Navy, mais tes supérieurs savent que tu es capable de ramener un navire et ses hommes lorsque la situation tourne mal.</p><p>Depuis plusieurs mois, tu sers dans les Caraïbes. Port Royal est devenu ton port d’attache.</p>`,choices:[{label:'Port Royal — 1719',to:'c1'}]},
 c1:{title:'La mission',text:`<p><strong>Port Royal, Jamaïque — 1719.</strong></p><p>Le jour n’est pas encore complètement levé lorsque tu traverses les quais. L’air est déjà chaud. Entre les mâts serrés dans le port, les cris des dockers se mêlent au claquement des voiles, à l’odeur du goudron, du sel et du bois humide.</p><p>La Jamaïque vit dans une tension permanente. La Grande-Bretagne est en guerre contre l’Espagne, et les routes maritimes des Caraïbes attirent autant les corsaires que les pirates.</p><p>L’ordre qui t’attend porte l’autorité du gouverneur de l’île, <strong>Sir Nicholas Lawes</strong>. À Londres, le Board of Admiralty est dirigé par <strong>James Berkeley, comte de Berkeley</strong>, mais ici les décisions doivent parfois être prises sans attendre plusieurs mois qu’un courrier traverse l’Atlantique.</p><p>Si cette mission t’est confiée, ce n’est pas par hasard. Tu connais déjà ces eaux. Tu as escorté des bâtiments marchands, poursuivi des navires suspects et, quelques mois plus tôt, ramené à Port Royal un bâtiment endommagé qu’une partie de son équipage croyait perdu.</p><p>Cette fois, il ne s’agit pourtant pas d’un combat.</p><p>Le <strong>Providence</strong>, navire marchand appartenant à Edmund Harcourt, aurait dû rentrer depuis quatre jours. Vingt-sept hommes se trouvaient à bord. Aucun message. Aucun survivant. Aucune épave.</p><p>On te confie le <strong>Resolute</strong>, un petit sloop armé, rapide et suffisamment maniable pour s’approcher des côtes difficiles. Environ <strong>soixante-dix marins chevronnés</strong> assurent la navigation, les voiles et les canons.</p><p>À eux s’ajoutent <strong>huit soldats aguerris</strong> de la garnison de Port Royal. Tu les connais. Certains ont déjà combattu sous tes ordres. Tu leur fais confiance et, si des pirates tentent un abordage, ils sauront se défendre.</p><p>Comme avant chaque mission, tu décides d’étudier les différents chemins possibles afin d’arriver rapidement, mais aussi avec le moins de risques possible.</p><p>Chaque heure perdue risque de rendre le sauvetage plus compliqué et tu le sais. Malheureusement, certains passages sont dangereux à traverser.</p><p><strong>Il va falloir prendre une décision.</strong></p>`,choices:[{label:'Étudier la carte',to:'c2'}]},
 c2:{title:'Deux routes',text:`<p>Tu poses la carte sur une caisse et suis du doigt les deux routes possibles.</p><p><strong>La première longe la côte.</strong></p><p>Elle serpente entre les récifs, les hauts-fonds et de nombreuses petites îles. La navigation y est lente et demande une attention constante. Une erreur de quelques dizaines de mètres peut suffire à endommager la coque.</p><p>Mais tes marins sont expérimentés. Ils connaissent les courants et savent lire les changements de couleur de l’eau qui trahissent les récifs.</p><p>Surtout, cette route traverse plusieurs villages de pêcheurs et de petits ports. Si le Providence est passé dans la région, quelqu’un l’a peut-être vu. Tu pourrais y recueillir des témoignages, connaître sa direction ou apprendre ce qui s’est produit avant sa disparition.</p><p>Le problème est le temps. En longeant la côte, tu peux perdre presque une journée entière.</p><p><strong>La seconde route passe directement par le large.</strong></p><p>Elle est beaucoup plus courte. Avec un vent favorable, elle te mènera presque directement vers la dernière position connue du Providence.</p><p>Mais cette partie de la mer est peu surveillée. Les bâtiments marchands qui s’y aventurent sans escorte sont des proies faciles, et les attaques de pirates y sont fréquentes.</p><p>Par cette route, tu gagnerais de précieuses heures.</p><p>À condition d’arriver jusqu’au bout.</p>`,choices:[{label:'Longer la côte et interroger les villages',to:'c3'},{label:'Prendre la route directe par le large',to:'c12'}]},
 c3:{title:'',text:`<p>Le Resolute longe la côte pendant plusieurs heures.</p><p>La navigation est exactement aussi délicate que la carte le laissait prévoir. Par endroits, les récifs remontent presque jusqu’à la surface et forment sous l’eau de longues lignes pâles que seuls les marins les plus expérimentés savent lire.</p><p>À plusieurs reprises, le sloop ralentit pour franchir un chenal étroit entre deux hauts-fonds.</p><p>Vous croisez plusieurs petits villages de pêcheurs. Quelques maisons de bois, des embarcations tirées sur le sable, parfois un quai sommaire.</p><p>Tu fais poser les mêmes questions partout.</p><p>Personne ne semble avoir vu le Providence.</p><p>Ou personne ne souhaite en parler.</p><p>En fin d’après-midi, vous atteignez un village plus important. Une petite jetée permet au Resolute de mouiller à proximité sans risquer les récifs.</p><p>Le soleil descend déjà derrière les palmiers.</p><p>Sur la place, les habitants rangent leurs étals. Plusieurs hommes te regardent passer en uniforme avant de détourner les yeux.</p><p>Une enseigne de bois grince au-dessus d’une porte.</p><p><strong>La taverne est encore ouverte.</strong></p>`,choices:[{label:'Entrer dans la taverne',to:'c4'}]},

 c4:{title:'',text:s=>{
   const asked=(s.flags.tavernkeeperDone?1:0)+(s.flags.oldSailorDone?1:0)+(s.flags.spanishWomanDone?1:0);
   if(asked===0)return `<p>L’intérieur est sombre malgré les dernières lueurs du jour.</p><p>Une dizaine de marins boivent en silence autour de petites tables.</p><p>L’odeur du rhum, de la fumée et du poisson séché imprègne la pièce.</p><p>Ton uniforme attire immédiatement les regards.</p><p>Les conversations reprennent presque aussitôt, mais moins fort.</p><p>Trois personnes retiennent ton attention.</p><p><strong>Le tavernier</strong>, un homme large d’épaules qui essuie depuis plusieurs minutes le même gobelet sans jamais vraiment te regarder.</p><p><strong>Un vieux marin</strong>, assis seul dans un coin. Sa peau est brûlée par le soleil et une longue cicatrice traverse sa joue. Il a l’allure de quelqu’un qui a passé sa vie sur des bateaux dont il vaut mieux ne pas connaître le pavillon.</p><p>Et enfin <strong>une femme étrangère</strong>, installée près d’une fenêtre.</p><p>Ses vêtements sont simples, mais sa posture ne l’est pas.</p><p>Elle observe la salle comme un soldat observe un terrain avant une bataille.</p><p>Tu es presque certain qu’elle est espagnole.</p>`;
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
   if(s.flags.tavernkeeperApproach==='authority')return `<p>Tu poses les deux mains sur le comptoir.</p><p>Cette fois, ta voix n’a plus rien d’amical.</p><blockquote>« Je suis en mission pour la Couronne. Un navire et vingt-sept hommes ont disparu. Si vous savez quelque chose et que vous choisissez de me le cacher, j’aurai besoin d’une excellente raison. »</blockquote><p>Le tavernier s’immobilise.</p><p>Son regard passe rapidement vers les autres clients.</p><blockquote>« Non. Je n’ai pas vu votre bateau. »</blockquote><p>Il baisse encore la voix.</p><blockquote>« J’ai entendu ce qui arrive aux marins quand ils deviennent trop avides. »</blockquote><p>Il jette un regard vers la salle avant de poursuivre.</p><blockquote>« Certains racontent qu’une île apparaît à ceux qui cherchent des richesses avec trop d’insistance. Une île qu’on ne trouve jamais par hasard. »</blockquote><p>Il se penche légèrement vers toi.</p><blockquote>« Ceux qui partent à sa recherche finissent parfois par la trouver. Le problème, c’est qu’ils ne reviennent pas toujours. »</blockquote><p>Il se redresse brusquement.</p><blockquote>« Pour moi, ce ne sont que des histoires. Mais ici, personne n’aime en parler. »</blockquote>`;
   return `<p>Tu t’approches du comptoir.</p><p>Le tavernier te regarde enfin.</p><p>À cette distance, tu remarques qu’il évite soigneusement de regarder l’insigne de la Royal Navy sur ton uniforme.</p><p>Tu peux essayer de le mettre en confiance.</p><p>Ou lui rappeler que tu n’es pas ici en simple voyageur.</p>`;
 },choices:s=>s.flags.tavernkeeperDone?[{label:'Retourner dans la salle',to:'c4'}]:[
   {label:'L’amadouer poliment',stay:true,effect:s=>{s.flags.tavernkeeperDone=true;s.flags.tavernkeeperApproach='polite';}},
   {label:'Employer un ton grave et faire usage de ton autorité',stay:true,effect:s=>{s.flags.tavernkeeperDone=true;s.flags.tavernkeeperApproach='authority';s.flags.tavernkeeperAuthority=true;s.flags.islandRumor=true;}}
 ]},

 c6:{title:'',text:s=>{
   if(s.flags.oldSailorApproach==='polite')return `<p>Tu t’assieds en face de lui sans brusquer les choses.</p><blockquote>« Excusez-moi. Je cherche un navire marchand appelé le Providence. Il est possible qu’il soit passé près d’ici. Vous avez peut-être vu quelque chose ? »</blockquote><p>Le vieil homme lève lentement les yeux vers toi.</p><p>Il boit une gorgée de rhum.</p><blockquote>« Non. Rien vu qui ressemble à votre marchand. »</blockquote><p>Puis il regarde de nouveau son verre.</p><p>La conversation est terminée.</p>`;
   if(s.flags.oldSailorApproach==='authority')return `<p>Tu tires une chaise et t’assieds sans lui demander son avis.</p><blockquote>« Écoutez-moi bien. Je représente la Royal Navy. Des hommes ont disparu et je n’ai pas de temps à perdre avec les silences de cette salle. »</blockquote><p>Le vieux marin relève les yeux.</p><p>Un sourire fatigué apparaît sur son visage.</p><blockquote>« Non. Je n’ai pas vu le navire que vous cherchez. »</blockquote><p>Il fait tourner son verre entre ses doigts.</p><blockquote>« Mais des bateaux disparaissent dans cette région. Pas seulement des pêcheurs perdus dans une tempête. Des bâtiments entiers. »</blockquote><p>Il lève enfin les yeux vers toi.</p><blockquote>« On retrouve parfois une chaloupe. Une voile. Un morceau de coque. Parfois rien du tout. Et quand un navire disparaît ici, les vieux du coin ne demandent même plus pourquoi. »</blockquote><p>Il marque une pause.</p><blockquote>« Certains parlent d’une île. Moi, je ne sais pas ce qu’il faut croire. Je sais seulement que trop de bateaux ont disparu au même endroit pour que ce soit un hasard. »</blockquote><p>Il attrape soudain ta main.</p><p>Avant que tu ne la retires, il prend un morceau de charbon posé près d’une lampe et dessine lentement <strong>un cercle noir au centre de ta paume</strong>.</p><p>Un simple rond. Parfaitement fermé.</p><blockquote>« Gardez ça en tête. Pas seulement sur votre main. Si vous revoyez ce signe là où il ne devrait pas être, ne cherchez pas à comprendre. Partez. »</blockquote><p>Tu regardes le cercle noir.</p><p>Lorsque tu relèves les yeux, le vieil homme a déjà repris son verre.</p>`;
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
   +`<p>Tu allumes la petite lampe posée près du lit.</p><p>Tu ne reconnais pas ton agresseur.</p><p>Un homme du village, peut-être. Ou quelqu’un arrivé après vous.</p><p>Il essaie de respirer.</p><p>Tu t’accroupis près de lui.</p><blockquote>« Qui vous envoie ? »</blockquote><p>Il secoue lentement la tête.</p><p>Puis ses doigts se referment sur ta manche.</p><blockquote>« Abandonnez les recherches... »</blockquote><p>Sa voix n’est plus qu’un souffle.</p><blockquote>« Le trésor doit disparaître à jamais. »</blockquote><p>Sa main retombe.</p><p>Il ne répond plus.</p>`,choices:[{label:'Fouiller son corps',to:'c10',effect:s=>{if(!s.flags.assassinLoot){s.flags.assassinLoot=true;addGold(s,8);addItem(s,'couteaux_jet','Deux couteaux équilibrés','Deux petits couteaux parfaitement équilibrés, adaptés au lancer.',{quantity:2});}}}]},

 c10:{title:'',text:s=>`<p>Tu fouilles rapidement les vêtements de l’homme.</p><p>Il ne porte aucun document.</p><p>Aucun signe permettant de connaître son origine.</p><p>Dans une petite bourse, tu trouves <strong>huit pièces d’or</strong>.</p><p>Sous son manteau sont dissimulés <strong>deux petits couteaux parfaitement équilibrés</strong>. Plus courts que ton arme de combat, mais conçus pour être lancés avec précision.</p><p>Tu les ajoutes à ton équipement.</p><p>Le reste de la nuit est court.</p><p>Lorsque tu redescends dans la salle, le jour commence à peine à entrer par les fenêtres.</p><p>Le tavernier est déjà là, mais il évite ton regard.</p>${s.flags.oldSailorDone?'<p>La table du vieux marin est vide.</p>':''}${s.flags.spanishWomanDone?'<p>La femme espagnole a elle aussi disparu.</p>':''}<p>Personne ne demande ce qui s’est passé dans ta chambre.</p><p>Personne ne semble surpris.</p><p>Quelques minutes plus tard, tu rejoins la jetée.</p><p>À bord du Resolute, les marins terminent de préparer les voiles. Tes huit soldats vérifient leurs armes.</p><p>Tu jettes un dernier regard vers le village.</p><p>Puis tu donnes l’ordre de larguer les amarres.</p><p><strong>Le Providence vous attend quelque part au-delà de la côte.</strong></p>`,choices:[{label:'Rejoindre la zone de disparition',to:'c20'}]},
 c12:{title:'Le pavillon noir',text:`<p>Un bâtiment rapide approche. Un pavillon noir monte.</p><p>Vous refusez de vous rendre. Le noir redescend. Un pavillon rouge prend sa place.</p>`,choices:[{label:'Préparer les soldats',to:'c13',effect:s=>startCrewBattle(s,'pirates1',12,5,3,6)}]},
 c13:{title:'L’abordage',text:s=>`<p>Les pirates passent à l’abordage.</p>
  <div class="dice-result">
    <p class="roll-number">Règle du combat de groupe</p>
    <p>À chaque assaut, chaque camp lance <strong>2 dés à 6 faces</strong>, puis ajoute sa <strong>Puissance de combat</strong> et son <strong>bonus d’effectif</strong>.</p>
    <p>La Puissance de combat représente l’entraînement, l’expérience et la qualité des armes. <strong>Soldats : +5</strong> · <strong>Pirates : +3</strong>.</p>
    <p>Le bonus d’effectif vaut <strong>+1 par tranche de 2 combattants présents au début de l’assaut</strong>, arrondi au supérieur.</p>
    <p>Le total le plus élevé remporte l’assaut et le camp adverse perd <strong>1 combattant</strong>. En cas d’égalité, personne ne tombe. Les pertes ne sont prises en compte dans le bonus d’effectif qu’à l’assaut suivant.</p>
    <p>Les pirates rompront le combat s’ils perdent la moitié de leurs hommes.</p>
  </div>
  ${crewBattleHtml(s,'pirates1')}`,choices:s=>{const b=normalizeCrewBattle(s.crewBattles.pirates1,12,5,3,6);if(s.soldiers<=0)return[{label:'Le Resolute est submergé',to:'death'}];if(b.enemy<=0||b.enemy<=(Number.isFinite(b.retreatAt)?b.retreatAt:6))return[{label:'Les pirates reculent — passer sur leur navire',to:'c15'}];return[{label:'Lancer les dés — assaut suivant',stay:true,inlineCombat:true,effect:x=>crewBattleRound(x,'pirates1')}];}},
 c15:{title:'Le capitaine pirate',text:s=>`<p>Tu bondis sur le pont adverse. Le capitaine tire son sabre.</p>${fightHtml(s,'captain',CAPTAIN)}`,choices:s=>{const c=s.combats?.captain;if(s.hp<=0)return[{label:'Tu t’effondres',to:'death'}];if(c&&c.hp<=0)return[{label:'Fouiller le capitaine',to:'c16'}];return[{label:'Jeter les dés — combattre',stay:true,inlineCombat:true,effect:x=>fightRound(x,'captain',CAPTAIN)}];}},
 c16:{title:'Les gantelets',text:`<p>Le capitaine porte des gantelets de cuir renforcés de petites plaques métalliques rivetées.</p><p><strong>Protection +4.</strong></p>`,choices:[{label:'Les prendre et repartir',to:'c20',effect:s=>{if(!s.flags.gauntlets){s.flags.gauntlets=true;s.protection=4;addItem(s,'gantelets','Gantelets renforcés','Gantelets de cuir renforcés. Protection +4.');}}}]},
 c20:{title:'',text:`<p>Le Resolute reprend le large.</p><p>Pendant plusieurs heures, la mer semble enfin vouloir vous aider.</p><p>Le vent souffle régulièrement dans les voiles, suffisamment fort pour maintenir une bonne allure sans obliger les hommes à réduire la toile. Le sloop file proprement sur une houle longue et régulière.</p><p>Sur le pont, l’atmosphère se détend peu à peu.</p><p>Les marins reprennent leurs habitudes. Certains plaisantent en travaillant. D’autres surveillent l’horizon en plissant les yeux sous le soleil.</p><p>Tu consultes plusieurs fois la carte.</p><p>Vous approchez maintenant de la dernière zone où le Providence aurait pu être aperçu.</p><p>Rien ne semble anormal.</p><p>Puis un marin posté à l’avant t’appelle.</p><p>Il montre la mer, sur bâbord.</p><p>Au début, tu ne vois qu’une différence dans la couleur de l’eau.</p><p>Une zone plus sombre.</p><p>Très sombre.</p><p>Elle avance sous la surface.</p><p>Tu changes légèrement de position pour mieux la suivre.</p><p>La masse est immense.</p><p>Bien plus longue qu’une chaloupe.</p><p>Probablement plus longue que le Resolute lui-même.</p><p>Elle passe lentement sous votre trajectoire, disparaît dans les profondeurs... puis réapparaît quelques instants plus tard, toujours à distance.</p><p>Comme si elle suivait le navire.</p><p>Autour de toi, les conversations cessent.</p><p>Un des marins se signe discrètement.</p><p>Personne ne prononce le mot.</p><p>Mais tu sais à quoi ils pensent.</p><p>Aux vieilles histoires racontées dans les ports du Nord. À ces créatures gigantesques capables d’entraîner un navire entier sous l’eau.</p><p>Tu fixes encore quelques secondes la surface.</p><p>La forme disparaît.</p><p>Cette fois, elle ne revient pas.</p><p>Le vent continue de gonfler les voiles.</p><p>Pourtant, sur le pont, plus personne ne plaisante.</p>`,choices:[{label:'Poursuivre les recherches',to:'c21'}]},

 c21:{title:'',text:`<p>Une heure passe.</p><p>Puis une autre.</p><p>Le ciel est toujours clair, mais quelque chose a changé.</p><p>Le vent tombe progressivement.</p><p>Pas brutalement.</p><p>Il faiblit jusqu’à devenir presque imperceptible.</p><p>Les voiles se détendent.</p><p>La mer, elle aussi, se calme.</p><p>La houle qui accompagnait le Resolute depuis le matin disparaît peu à peu.</p><p>Autour du navire, l’eau devient étrangement lisse.</p><p>Presque immobile.</p><p>Un marin appelle depuis l’avant.</p><p>Cette fois, son bras pointe droit devant vous.</p><p>Très loin sur l’horizon, une forme se détache de la lumière.</p><p>Un mât.</p><p>Puis un second.</p><p>À mesure que le Resolute approche, la silhouette d’un navire apparaît.</p><p>Personne ne bouge pendant quelques secondes.</p><p>Tu prends la longue-vue.</p><p>La coque est sombre.</p><p>Les voiles pendent sans force.</p><p>Aucun homme sur le pont.</p><p>Aucun mouvement.</p><p>Puis tu distingues enfin le nom peint à l’arrière.</p><p><strong>PROVIDENCE.</strong></p><p>Tu abaisses lentement la longue-vue.</p><p>Le navire que vous cherchez depuis le départ est là.</p><p>Entier.</p><p>À première vue, il ne semble même pas avoir subi de tempête.</p><p>Mais lorsque vous vous rapprochez encore, tu remarques les marques sur sa coque.</p><p>De longues traces sombres courent sur le bois.</p><p>Certaines commencent sous la ligne de flottaison et remontent presque jusqu’au pont.</p><p>Elles sont trop larges pour avoir été faites par des cordages.</p><p>Trop régulières pour ressembler à des chocs contre des récifs.</p><p>Elles donnent plutôt l’impression que quelque chose a entouré le navire.</p><p>Et serré.</p><p>Le Providence dérive dans un silence absolu.</p>`,choices:[{label:'Approcher seul en chaloupe',to:'c22'},{label:'Faire accoster le Resolute bord à bord',to:'c27'}]},

 c22:{title:'',text:`<p>Tu préfères ne pas exposer immédiatement tout l’équipage.</p><p>Une chaloupe est mise à l’eau.</p><p>Tu prends place seul à bord, avec ton sabre, ton couteau et une courte corde.</p><p>Les marins du Resolute te regardent t’éloigner sans faire de commentaire.</p><p>À mesure que tu approches du Providence, le silence devient plus pesant.</p><p>Tu n’entends plus que le léger choc des rames contre l’eau.</p><p>Même les oiseaux semblent avoir disparu.</p><p>À quelques dizaines de mètres de la coque, tu arrêtes de ramer.</p><p>L’eau sous la chaloupe est tellement calme que tu peux voir ton propre reflet.</p><p>Puis quelque chose passe très loin en dessous.</p><p>Une ombre.</p><p>Rapide.</p><p>Tu te penches légèrement.</p><p>Plus rien.</p><p>Tu reprends une rame.</p><p>La masse repasse sous toi.</p><p>Cette fois beaucoup plus près.</p><p>La chaloupe se soulève brutalement.</p>`,choices:[{label:'Garder l’équilibre — Dextérité',to:'c23',diceTest:true,effect:s=>{s.flags.boatDex=rollDex(s);if(!s.flags.boatDex)rollDamage(s,'boat',3);}}]},

 c23:{title:'',text:s=>diceResultHtml(s)+(s.flags.boatDex?
 `<p>Tu écartes les jambes et t’agrippes au bord de la chaloupe.</p><p>L’embarcation bascule violemment, mais tu restes à bord.</p><p>Une énorme forme glisse sous la surface puis disparaît contre la coque du Providence.</p><p>Tu attends.</p><p>Dix secondes.</p><p>Vingt.</p><p>Rien ne revient.</p><p>Tu saisis les rames et parcours les derniers mètres aussi vite que possible.</p>`:
 damageResultHtml(s,'boat')+`<p>La chaloupe bascule.</p><p>L’eau t’engloutit immédiatement.</p><p>Pendant une seconde, tu ne vois que du vert sombre et des bulles.</p><p>Puis quelque chose effleure ta jambe.</p><p>Tu remontes brusquement vers la surface.</p><p>Une pression se referme autour de ta cheville.</p><p>Tu es tiré vers le bas.</p><p>Tu dégaines ton couteau presque à l’aveugle et frappes sous l’eau.</p><p>La pression disparaît.</p><p>Tu remontes, inspires brutalement et t’agrippes à la chaloupe retournée.</p><p>Autour de toi, l’eau redevient immobile.</p><p>Beaucoup trop immobile.</p><p>Tu rejoins la coque du Providence sans attendre.</p>`),choices:[{label:'Monter à bord',to:'c24'}]},

 c24:{title:'',text:`<p>Depuis la chaloupe, le pont est trop haut pour être atteint facilement.</p><p>Tu longes donc la coque à la recherche d’une autre entrée.</p><p>Plusieurs sabords sont fermés.</p><p>L’un d’eux, pourtant, pend légèrement de travers.</p><p>Le bois autour de l’ouverture est fendu.</p><p>Tu accroches ta corde à une ferrure et te hisses jusqu’au sabord.</p><p>L’intérieur est noir.</p><p>Une odeur de bois humide, de corde et de renfermé s’en échappe.</p><p>Tu passes une jambe, puis l’autre.</p><p>Tes bottes touchent enfin le plancher de l’entrepont.</p><p>Il fait presque totalement sombre.</p><p>La lumière qui entre par le sabord découpe seulement quelques formes : des tonneaux, des caisses, des cordages abandonnés au sol.</p><p>Tu écoutes.</p><p>Aucun pas.</p><p>Aucune voix.</p><p>Seulement le craquement lent du bois.</p><p>Une porte se trouve au fond de la pièce.</p><p>Tu abaisses la poignée.</p><p>Elle ne bouge pas.</p><p>Quelqu’un l’a verrouillée de l’autre côté.</p>`,choices:[{label:'Essayer de forcer la porte — Dextérité',to:'c25',diceTest:true,effect:s=>s.flags.doorDex=rollDex(s)},{label:'Chercher une autre issue',to:'c26'}]},

 c25:{title:'',text:s=>diceResultHtml(s)+(s.flags.doorDex?
 `<p>Tu prends quelques pas d’élan.</p><p>Ton épaule frappe le bois.</p><p>Le verrou résiste une première fois.</p><p>Tu recommences.</p><p>Cette fois, quelque chose cède de l’autre côté.</p><p>La porte s’ouvre brutalement sur un couloir étroit.</p><p>L’obscurité y est encore plus profonde.</p>`:
 `<p>Tu frappes la porte de l’épaule.</p><p>Le bois tremble, mais le verrou ne cède pas.</p><p>Tu essaies une seconde fois.</p><p>Rien.</p><p>Continuer ne ferait qu’alerter quelqu’un... s’il reste quelqu’un à bord.</p><p>Il va falloir trouver un autre passage.</p>`),choices:s=>s.flags.doorDex?[{label:'Avancer dans le couloir',to:'c28'}]:[{label:'Chercher une autre issue',to:'c26'}]},

 c26:{title:'',text:`<p>Tu examines lentement l’entrepont.</p><p>Derrière plusieurs caisses, une partie de la cloison est fendue.</p><p>Le bois a été arraché de l’autre côté, comme si quelqu’un avait voulu passer en urgence.</p><p>Tu écartes deux planches et te glisses dans l’ouverture.</p><p>La pièce voisine ressemble à une petite réserve.</p><p>Des objets ont été renversés au sol.</p><p>Un banc est retourné.</p><p>Près de son pied, quelque chose attire ton regard.</p><p>Un petit sachet de toile.</p><p>Tu l’ouvres.</p><p>À l’intérieur se trouve une poudre extrêmement fine, d’un <strong>vert profond</strong>.</p><p>Tu ignores totalement à quoi elle peut servir.</p><p>Un peu plus loin, un petit coffre de bois est resté entrouvert.</p><p>Il ne contient ni pièces ni bijoux.</p><p>Seulement une pierre.</p><p>Un <strong>diamant bleu</strong>.</p><p>La couleur est si intense qu’elle paraît presque irréelle dans cette obscurité.</p><p>Quelqu’un a pris le temps de cacher ces deux objets alors que tout le reste semble avoir été abandonné.</p>`,choices:[{label:'Prendre la poudre verte et le diamant bleu',to:'c28',effect:s=>{addItem(s,'poudre_verte','Poudre verte','Une poudre verte très fine.');addBlueDiamond(s);}},{label:'Prendre seulement le diamant bleu',to:'c28',effect:addBlueDiamond},{label:'Ne rien prendre',to:'c28'}]},

 c27:{title:'',text:`<p>Tu décides de ne pas partir seul.</p><p>Le Resolute avance lentement jusqu’au Providence.</p><p>Les marins utilisent les gaffes et les cordages pour maintenir les deux coques à distance.</p><p>Le bruit du bois contre le bois paraît presque déplacé dans ce silence.</p><p>Deux de tes soldats passent les premiers.</p><p>Puis quatre autres.</p><p>Tu attends un cri.</p><p>Un coup de feu.</p><p>N’importe quoi.</p><p>Rien.</p><p>L’un des hommes se retourne vers toi depuis le pont du Providence.</p><p>Il secoue la tête.</p><p>Personne.</p><p>Tu montes à ton tour.</p><p>En posant le pied sur les planches, tu ressens immédiatement quelque chose d’étrange.</p><p>Un navire de cette taille ne devrait jamais être aussi silencieux.</p><p>Même à l’ancre, il devrait y avoir des pas, des ordres, des cordes qu’on tire, des hommes qui toussent ou jurent.</p><p>Ici, il n’y a rien.</p>`,choices:[{label:'Explorer le navire',to:'c28'}]},

 c28:{title:'',text:`<p>Tu avances lentement sur le pont.</p><p>Une chope repose près du grand mât.</p><p>Un morceau de pain durci est encore posé sur une caisse.</p><p>Une corde a été abandonnée au milieu d’un nœud.</p><p>Tout donne l’impression que les hommes travaillaient encore quelques instants avant de disparaître.</p><p>Mais quelque chose s’est aussi produit ici.</p><p>Une table est brisée.</p><p>Une chaise a été projetée contre la rambarde.</p><p>Plusieurs entailles profondes marquent le bois, comme des coups de sabre.</p><p>Près d’une écoutille, une tache brunâtre a séché entre les planches.</p><p>Tu préfères ne pas te demander ce que c’est.</p><p>Pourtant, il n’y a aucun corps.</p><p>Pas un seul.</p><p>Tu regardes vers le Resolute.</p><p>Les hommes restés à bord vous observent en silence.</p><p>La cabine du capitaine du Providence se trouve à l’arrière.</p><p>Sa porte est entrouverte.</p>`,choices:[{label:'Entrer dans la cabine',to:'c29'}]},

 c29:{title:'',text:`<p>La cabine est dans un état étrange.</p><p>Pas vraiment saccagée.</p><p>Plutôt abandonnée au milieu d’une crise.</p><p>Des cartes couvrent la table.</p><p>Une bouteille renversée a séché contre le bois.</p><p>Une chaise est couchée sur le côté.</p><p>Mais ce sont les murs qui attirent immédiatement ton regard.</p><p>Des feuilles y ont été fixées grossièrement avec des clous.</p><p>Des dizaines de dessins.</p><p>Certains sont précis.</p><p>D’autres ressemblent aux traits nerveux d’un homme incapable de dormir.</p><p>Tu reconnais plusieurs fois la même forme.</p><p>Une masse gigantesque sous un navire.</p><p>Des tentacules.</p><p>Deux yeux <strong>verts</strong> dessinés avec une insistance presque maladive.</p><p>Sur une autre feuille, une île.</p><p>Au centre, plusieurs petites pierres ont été colorées en <strong>bleu</strong>.</p><p>Sur une autre encore, un coffre ouvert.</p><p>Une lumière <strong>bleue</strong> semble en sortir.</p><p>Un dernier dessin représente seulement une ombre noire qui recouvre peu à peu toute la feuille.</p><p>Tu restes quelques secondes devant ces images.</p><p>Il ne s’agit pas des croquis d’un navigateur préparant une route.</p><p>Quelqu’un essayait de comprendre ce qui lui arrivait.</p><p>Ou de ne pas l’oublier.</p>`,choices:[{label:'Fouiller la cabine',to:'c30'}]},

 c30:{title:'',text:`<p>Tu écartes plusieurs cartes marines et ouvres les tiroirs du bureau.</p><p>Le premier contient des instruments de navigation.</p><p>Le second est vide.</p><p>Dans le troisième, tu trouves un paquet de feuilles pliées.</p><p>Tu les poses sur la table.</p><p>Toutes représentent la même île.</p><p>Toujours la même côte.</p><p>La même baie.</p><p>Le même relief dessiné à l’intérieur des terres.</p><p>Certaines cartes sont propres et soigneusement copiées.</p><p>D’autres ont été couvertes de notes.</p><blockquote>« Là où elle dort. »</blockquote><blockquote>« Les pierres sont réelles. »</blockquote><blockquote>« Nous n’aurions jamais dû ouvrir le coffre. »</blockquote><p>Au fond du bureau, tu découvres enfin le journal du capitaine.</p><p>Les premières pages décrivent une traversée parfaitement normale.</p><p>Puis tout change.</p><p>Le Providence avait atteint une île inconnue.</p><p>L’équipage y avait trouvé quelque chose.</p><p>Le texte reste confus sur la nature exacte de cette découverte, mais une chose est certaine :</p><p><strong>le Providence revenait de cette île lorsqu’une présence a commencé à suivre le navire.</strong></p><p>À partir de là, l’écriture devient de plus en plus irrégulière.</p><p>Une même phrase revient plusieurs fois.</p><blockquote>« Elle nous suit. »</blockquote><p>Tu refermes lentement le journal.</p><p>Tu repenses à la masse sombre aperçue sous le Resolute.</p><p>Sur la table, la carte de l’île est encore ouverte.</p>`,choices:[{label:'Mettre le cap sur l’île',to:'c31'}]},

 c31:{title:'Le navire sans pavillon',text:`<p>Un navire apparaît. Aucun pavillon.</p><p>Le contourner ferait perdre plusieurs heures.</p>`,choices:[{label:'Contourner le navire',to:'c34',effect:s=>s.flags.islandDelay=true},{label:'Maintenir le cap',to:'c32',effect:s=>{s.crewBattles.pirates2={enemy:9,round:0,last:null};}}]},
 c32:{title:'Une seconde attaque',text:s=>`<p>Le navire révèle ses pirates.</p>${crewBattleHtml(s,'pirates2')}`,choices:s=>{const b=s.crewBattles.pirates2;if(s.soldiers<=0)return[{label:'Tes hommes sont anéantis',to:'death'}];if(b.enemy<=0)return[{label:'Reprendre la route',to:'c34'}];return[{label:'Lancer les dés — assaut suivant',stay:true,inlineCombat:true,effect:x=>crewBattleRound(x,'pirates2',9)}];}},
 c34:{title:'La crique',text:s=>`<p>L’île est petite, sauvage et couverte d’une jungle dense.</p><p>Il te reste <strong>${s.soldiers}</strong> soldats. Tu peux en emmener jusqu’à trois. Au moins deux doivent rester sur les navires.</p>`,choices:s=>[0,1,2,3].filter(n=>n<=Math.max(0,s.soldiers-2)).map(n=>({label:n===0?'Partir seul':`Emmener ${n} soldat${n>1?'s':''}`,to:'c35',effect:x=>{x.expeditionSoldiers=n;x.shipSoldiers=x.soldiers-n;}}))},
 c35:{title:'À qui confier le commandement ?',text:`<p><strong>William Briggs</strong> est bourru, courageux et efficace. Il prendra la bonne décision, même si elle consiste à partir sans toi.</p><p><strong>Nathaniel Hale</strong> est intelligent et loyal. Il hésite davantage, mais ne t’abandonnera pas.</p>`,choices:[{label:'Choisir William Briggs',to:'c36',effect:s=>s.flags.commander='briggs'},{label:'Choisir Nathaniel Hale',to:'c36',effect:s=>s.flags.commander='hale'}]},
 c36:{title:'Le premier piège',text:s=>`<p>Un énorme tronc hérissé de pieux bascule entre les arbres.</p>${s.expeditionSoldiers>0?'<p>Un de tes hommes est frappé de plein fouet.</p>':'<p>Le tronc fonce vers toi.</p>'}`,onEnter:s=>{if(!s.flags.firstTrap){s.flags.firstTrap=true;s.flags.firstTrapHitCompanion=s.expeditionSoldiers>0;if(s.flags.firstTrapHitCompanion)loseSoldier(s,1);}},choices:s=>!s.flags.firstTrapHitCompanion?[{label:'Éviter le piège — Dextérité',to:'c37',diceTest:true,effect:x=>{x.flags.trapDex=rollDex(x);if(!x.flags.trapDex)rollDamage(x,'jungleTrap',3);}}]:[{label:'Continuer',to:'c38'}]},
 c37:{title:'À quelques centimètres',text:s=>diceResultHtml(s)+(s.flags.trapDex?'<p>Tu te jettes au sol juste à temps.</p>':damageResultHtml(s,'jungleTrap')),choices:[{label:'Continuer',to:'c38'}]},
 c38:{title:'Le ravin',text:`<p>Un vieux pont de corde franchit un ravin.</p>`,choices:[{label:'Passer un par un',to:'c39'},{label:'Passer tous ensemble',to:'c42'},{label:'Descendre dans le ravin',to:'c44'},{label:'Contourner par la forêt',to:'c48'}]},
 c39:{title:'Un par un',text:`<p>Chaque planche craque sous ton poids.</p>`,choices:[{label:'Traverser — Dextérité',to:'c40',diceTest:true,effect:s=>s.flags.bridgeHero=rollDex(s)}]},
 c40:{title:'Le pont cède',text:s=>diceResultHtml(s)+`<p>Une corde finit par céder. Un homme disparaît avec les planches. Ceux restés de l’autre côté annoncent qu’ils contourneront par la forêt.</p><p>Au fond de toi, tu le sais déjà : <strong>tu ne les reverras jamais.</strong></p>`,onEnter:s=>{if(!s.flags.bridgeLoss){s.flags.bridgeLoss=true;if(s.expeditionSoldiers>0)loseSoldier(s,1);s.expeditionSoldiers=0;}},choices:[{label:'Continuer',to:'c51'}]},
 c42:{title:'Tous ensemble',text:`<p>Vous courez. Le pont s’effondre. Tes compagnons disparaissent dans le ravin.</p>`,onEnter:s=>{if(!s.flags.bridgeRushLoss){s.flags.bridgeRushLoss=true;while(s.expeditionSoldiers>0)loseSoldier(s,1);}},choices:[{label:'Savoir si tu es blessé — Dextérité',to:'c43',diceTest:true,effect:s=>{s.flags.bridgeRushDex=rollDex(s);if(!s.flags.bridgeRushDex)rollDamage(s,'bridgeRush',3);}}]},
 c43:{title:'Suspendu à la corde',text:s=>diceResultHtml(s)+(s.flags.bridgeRushDex?'<p>Tu te hisses sans autre blessure.</p>':damageResultHtml(s,'bridgeRush')),choices:[{label:'Continuer',to:'c51'}]},
 c44:{title:'Le fond du ravin',text:s=>`<p>La boue bouge.</p>${s.expeditionSoldiers>0?'<p>Une énorme gueule entraîne un de tes hommes sous l’eau.</p>':'<p>Une énorme gueule se referme sur ta botte.</p>'}`,onEnter:s=>{if(!s.flags.gatorFirst){s.flags.gatorFirst=true;s.flags.gatorHitCompanion=s.expeditionSoldiers>0;if(s.flags.gatorHitCompanion)loseSoldier(s,1);}},choices:s=>!s.flags.gatorHitCompanion?[{label:'Te libérer — Dextérité',to:'c45',diceTest:true,effect:x=>{x.flags.gatorDex=rollDex(x);if(!x.flags.gatorDex)rollDamage(x,'gatorBite',3);}}]:[{label:'Affronter l’alligator',to:'c46'}]},
 c45:{title:'La mâchoire',text:s=>diceResultHtml(s)+(s.flags.gatorDex?'<p>Tu retires ton pied juste à temps.</p>':damageResultHtml(s,'gatorBite')),choices:[{label:'Combattre',to:'c46'}]},
 c46:{title:'L’alligator',text:s=>fightHtml(s,'alligator',ALLIGATOR),choices:s=>{const c=s.combats?.alligator;if(s.hp<=0)return[{label:'Tu succombes',to:'death'}];if(c&&c.hp<=0)return[{label:'Observer le corps plus loin',to:'c47'}];return[{label:'Jeter les dés — combattre',stay:true,inlineCombat:true,effect:x=>fightRound(x,'alligator',ALLIGATOR)}];}},
 c47:{title:'Le corps dans la boue',text:`<p>Un cadavre porte un diamant bleu et un bracelet.</p>`,choices:[{label:'Le fouiller',to:'c51',effect:s=>{if(!s.flags.ravineLoot){s.flags.ravineLoot=true;addBlueDiamond(s);s.forceBonus+=2;addItem(s,'bracelet_force','Bracelet de force','Force +2.');}}},{label:'Continuer',to:'c51'}]},
 c48:{title:'Le détour par la forêt',text:s=>`<p>Un claquement de mâchoires retentit derrière vous.</p>${s.expeditionSoldiers>0?'<p>Un de tes hommes a disparu.</p>':''}`,onEnter:s=>{if(!s.flags.forestFirst){s.flags.forestFirst=true;if(s.expeditionSoldiers>0)loseSoldier(s,1);}},choices:[{label:'Courir — Dextérité',to:'c49',diceTest:true,effect:s=>{s.flags.forestDex=rollDex(s);if(!s.flags.forestDex)rollDamage(s,'forestRun',3);if(s.expeditionSoldiers>0&&cryptoDie6()<=3)loseSoldier(s,1);}}]},
 c49:{title:'La course',text:s=>diceResultHtml(s)+(s.flags.forestDex?'<p>Tu atteins le passage.</p>':damageResultHtml(s,'forestRun')),choices:[{label:'Continuer',to:'c51'}]},
 c51:{title:'Le survivant',text:s=>s.flags.islandDelay?`<p>Un homme du Providence est mort contre un arbre depuis quelques heures. Une marque claire sur son doigt montre qu’il portait une bague.</p>`:`<p>Un survivant du Providence tremble contre un arbre.</p><blockquote>« Ils sont là... presque transparents... leurs yeux... ne les suivez pas. »</blockquote><p>Il te tend une bague ornée d’une tête de mort.</p><blockquote>« C’est ça qui m’a sauvé. »</blockquote>`,choices:[{label:'Continuer',to:'c52',effect:s=>{if(!s.flags.islandDelay&&!s.flags.skullRing){s.flags.skullRing=true;addItem(s,'bague_crane','Bague au crâne','Son effet est inconnu.');}}}]},
 c52:{title:'Le village abandonné',text:`<p>Une dizaine de huttes apparaissent. Des caisses portent la marque du Providence.</p>`,choices:[{label:'Fouiller les huttes',to:'c53'}]},
 c53:{title:'Le carnet du marin',text:`<p>Le Providence avait lui-même trouvé la carte sur un autre navire abandonné.</p><p>Le capitaine avait changé de cap. Sur l’île, disputes, trahisons et morts s’étaient multipliées.</p><p>Puis un homme livide, presque transparent, était apparu et leur avait montré le lieu exact.</p><blockquote>« Nous l’avons trouvé. Nous aurions dû repartir. »</blockquote><p>Le trésor a été caché dans une cale secrète du Providence.</p>`,choices:[{label:'Retourner aux navires',to:'c54'}]},
 c54:{title:'Le retour',text:s=>s.expeditionSoldiers>0?'<p>Un dernier piège tue un de tes compagnons.</p>':'<p>Un dernier piège se déclenche devant toi.</p>',onEnter:s=>{if(!s.flags.returnTrap){s.flags.returnTrap=true;s.flags.returnTrapHitCompanion=s.expeditionSoldiers>0;if(s.flags.returnTrapHitCompanion)loseSoldier(s,1);}},choices:s=>!s.flags.returnTrapHitCompanion?[{label:'Éviter le piège — Dextérité',to:'c55',diceTest:true,effect:x=>{x.flags.returnDex=rollDex(x);if(!x.flags.returnDex)rollDamage(x,'returnTrap',3);}}]:[{label:'Atteindre la plage',to:'c56'}]},
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
  "c20": "La masse sous le Resolute",
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
  "c31": "Le navire sans pavillon",
  "c32": "Une seconde attaque",
  "c34": "La crique de l'île",
  "c35": "Choisir le commandement",
  "c36": "Le premier piège",
  "c37": "À quelques centimètres",
  "c38": "Le ravin",
  "c39": "Traverser un par un",
  "c40": "Le pont cède",
  "c42": "Traverser tous ensemble",
  "c43": "Suspendu à la corde",
  "c44": "Le fond du ravin",
  "c45": "La mâchoire",
  "c46": "L'alligator",
  "c47": "Le corps dans la boue",
  "c48": "Le détour par la forêt",
  "c49": "La course",
  "c51": "Le survivant du Providence",
  "c52": "Le village abandonné",
  "c53": "Le carnet du marin",
  "c54": "Le retour vers la plage",
  "c55": "Le dernier piège",
  "c56": "La plage et les navires",
  "c57": "La cale du Providence",
  "c58": "Le trésor bleu",
  "c59": "La fumée",
  "c60": "À travers les flammes",
  "c61": "La coque se brise",
  "c62": "Le passage en feu",
  "c63": "Une dernière décision",
  "c64": "L'escalier en feu",
  "c65": "Seul sur le pont",
  "c66": "La créature sous l'eau",
  "c68": "En pleine mer",
  "c69": "Une autre île",
  "death": "La fin du voyage"
};
const PAGE_ORDER=['c0','c1','c2','c3','c4','c5','c6','c7','c8','c9','c10','c12','c13','c15','c16','c20','c21','c22','c23','c24','c25','c26','c27','c28','c29','c30','c31','c32','c34','c35','c36','c37','c38','c39','c40','c42','c43','c44','c45','c46','c47','c48','c49','c51','c52','c53','c54','c55','c56','c57','c58','c59','c60','c61','c62','c63','c64','c65','c66','c68','c69','death'];
const PAGE_BY_NODE=Object.fromEntries(PAGE_ORDER.map((id,i)=>[id,i]));
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
 contentVersion:16,pageMapVersion:2,saveVersion:1,libraryNumber:2,libraryLabel:'Livre 02',sheetLabel:'FICHE DU PERSONNAGE',
 readerEyebrow:'Chroniques d’un autre temps - Livre 02',
 assetBase:'./books/Livre02-Le-Secret-du-Providence/images',assetBases:['./books/Livre02-Le-Secret-du-Providence/images'],uiAssetBase:'./books/Livre02-Le-Secret-du-Providence/assets',
 seriesProfileDefaults:{heroGender:'female',heroName:'Eleanor',baseStats:{maxHp:18,force:8,dexterity:13}},
 normalizeSeriesProfile(p){p.heroName=p.heroGender==='male'?'Edward':'Eleanor';p.baseStats={maxHp:18,force:8,dexterity:13};},
 syncSeriesProfile(s,p){p.heroGender=s.heroGender==='male'?'male':'female';p.heroName=heroName(s);p.baseStats={maxHp:18,force:8,dexterity:13};p.memory={...(p.memory||{})};},
 handleProfileInputChange(s,input){if(input?.classList.contains('hero-gender-input'))setHeroIdentity(s,input.value);},
 statusStats(s){const r=s.maxHp>0?s.hp/s.maxHp:0;return[
  {icon:'♥',label:'Vie',value:`${s.hp}/${s.maxHp}`,cls:r<=.3?'status-critical':r<=.55?'status-warning':''},
  {icon:'◆',label:'Dextérité',value:String(currentDexterity(s))},{icon:'⚔',label:'Force',value:String(currentForce(s))},{icon:'†',label:'Arme',value:'+4'},{icon:'🛡',label:'Protection',value:String(currentProtection(s))},{icon:'●',label:'Soldats',value:`${s.soldiers}/${s.maxSoldiers}`}];},
 resetSeriesOnRestart:true,showMissingIllustrationPlaceholder:true,story:STORY,pageOrder:PAGE_ORDER,pageByNode:PAGE_BY_NODE,navigationTitles:PAGE_NAV_TITLES,padPage,
 imageBaseForPage:n=>`Le-Secret-du-Providence-${padPage(n)}`,imageCandidatesForPage:n=>[`Le-Secret-du-Providence-${padPage(n)}`,`pages/Le-Secret-du-Providence-${padPage(n)}`],imageExtensions:['jpg','jpeg','png'],
 createInitialState,rules:{currentForce,currentDexterity,combatPower,weaponLabel,currentProtection,applyDamage},characterSheetHtml,inventory,
 checkpoints:[{node:'c20',label:'Zone de disparition',onlyIfNone:true},{node:'c34',label:'Arrivée sur l’île'},{node:'c57',label:'Retour sur le Providence'}],
 conclusion:{successNodes:['c69'],deathNodes:['death'],successTitle:'À suivre',deathTitle:'Votre aventure s’achève ici',successText:'Vous avez atteint la fin de cette version de test du Secret du Providence.',deathText:'Votre mission s’arrête ici. Vous pouvez reprendre au dernier point de sauvegarde ou recommencer.',showJournalRecap:true},
 exportSeriesMemory(){return {};}
});
})();