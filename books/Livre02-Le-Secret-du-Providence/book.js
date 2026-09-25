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
   </div></div>`,choices:[{label:'Commencer l’aventure',to:'c0'}]},
 c0:{title:'Avant le Providence',text:s=>heroGender(s)==='female'?`<p>Tu es née en 1691, près des quais de Portsmouth. Ton père travaillait autour des navires et, très tôt, tu as appris à reconnaître une voile mal réglée, le bruit d’un gréement fatigué et l’odeur du mauvais temps avant même que le ciel ne change.</p><p>Mais la mer n’était pas un avenir destiné aux femmes.</p><p>À quinze ans, tu as coupé tes cheveux, abandonné tes robes et pris une identité masculine. Pour la Royal Navy, tu es devenue <strong>Edward</strong>. Seules quelques personnes connaissent encore ton véritable prénom : <strong>Eleanor</strong>.</p><p>Les années ont passé. Tu as appris à vivre parmi les hommes sans jamais laisser tomber le masque. Tu as servi pendant la guerre, connu les tempêtes, les abordages et les longues traversées. Ton sang-froid et ton sens de la navigation t’ont permis de gravir lentement les échelons.</p><p>Aujourd’hui, à vingt-huit ans, tu portes le grade de lieutenant. Une belle carrière s’ouvre devant toi, à condition que personne ne découvre jamais qui tu es réellement.</p><p>Depuis plusieurs mois, tu sers dans les Caraïbes. Port Royal est devenu ton port d’attache.</p>`:`<p>Tu es né en 1691, près des quais de Portsmouth. Ton père travaillait autour des navires et, très tôt, tu as appris à reconnaître une voile mal réglée, le bruit d’un gréement fatigué et l’odeur du mauvais temps avant même que le ciel ne change.</p><p>À quinze ans, tu as rejoint la Royal Navy.</p><p>Les années ont passé. Tu as servi pendant la guerre, connu les tempêtes, les abordages et les longues traversées. Ton sang-froid et ton sens de la navigation t’ont permis de gravir lentement les échelons.</p><p>Aujourd’hui, à vingt-huit ans, tu portes le grade de lieutenant. Tu n’es pas encore un grand nom de la Navy, mais tes supérieurs savent que tu es capable de ramener un navire et ses hommes lorsque la situation tourne mal.</p><p>Depuis plusieurs mois, tu sers dans les Caraïbes. Port Royal est devenu ton port d’attache.</p>`,choices:[{label:'Port Royal — 1719',to:'c1'}]},
 c1:{title:'La mission',text:`<p><strong>Port Royal, Jamaïque — 1719.</strong></p><p>Le jour n’est pas encore complètement levé lorsque tu traverses les quais. L’air est déjà chaud. Entre les mâts serrés dans le port, les cris des dockers se mêlent au claquement des voiles, à l’odeur du goudron, du sel et du bois humide.</p><p>La Jamaïque vit dans une tension permanente. La Grande-Bretagne est en guerre contre l’Espagne, et les routes maritimes des Caraïbes attirent autant les corsaires que les pirates.</p><p>L’ordre qui t’attend porte l’autorité du gouverneur de l’île, <strong>Sir Nicholas Lawes</strong>. À Londres, le Board of Admiralty est dirigé par <strong>James Berkeley, comte de Berkeley</strong>, mais ici les décisions doivent parfois être prises sans attendre plusieurs mois qu’un courrier traverse l’Atlantique.</p><p>Si cette mission t’est confiée, ce n’est pas par hasard. Tu connais déjà ces eaux. Tu as escorté des bâtiments marchands, poursuivi des navires suspects et, quelques mois plus tôt, ramené à Port Royal un bâtiment endommagé qu’une partie de son équipage croyait perdu.</p><p>Cette fois, il ne s’agit pourtant pas d’un combat.</p><p>Le <strong>Providence</strong>, navire marchand appartenant à Edmund Harcourt, aurait dû rentrer depuis quatre jours. Vingt-sept hommes se trouvaient à bord. Aucun message. Aucun survivant. Aucune épave.</p><p>On te confie le <strong>Resolute</strong>, un petit sloop armé, rapide et suffisamment maniable pour s’approcher des côtes difficiles. Environ <strong>soixante-dix marins chevronnés</strong> assurent la navigation, les voiles et les canons.</p><p>À eux s’ajoutent <strong>huit soldats aguerris</strong> de la garnison de Port Royal. Tu les connais. Certains ont déjà combattu sous tes ordres. Tu leur fais confiance et, si des pirates tentent un abordage, ils sauront se défendre.</p><p>Comme avant chaque mission, tu décides d’étudier les différents chemins possibles afin d’arriver rapidement, mais aussi avec le moins de risques possible.</p><p>Chaque heure perdue risque de rendre le sauvetage plus compliqué et tu le sais. Malheureusement, certains passages sont dangereux à traverser.</p><p><strong>Il va falloir prendre une décision.</strong></p>`,choices:[{label:'Étudier la carte',to:'c2'}]},
 c2:{title:'Deux routes',text:`<p>Tu poses la carte sur une caisse et suis du doigt les deux routes possibles.</p><p><strong>La première longe la côte.</strong></p><p>Elle serpente entre les récifs, les hauts-fonds et de nombreuses petites îles. La navigation y est lente et demande une attention constante. Une erreur de quelques dizaines de mètres peut suffire à endommager la coque.</p><p>Mais tes marins sont expérimentés. Ils connaissent les courants et savent lire les changements de couleur de l’eau qui trahissent les récifs.</p><p>Surtout, cette route traverse plusieurs villages de pêcheurs et de petits ports. Si le Providence est passé dans la région, quelqu’un l’a peut-être vu. Tu pourrais y recueillir des témoignages, connaître sa direction ou apprendre ce qui s’est produit avant sa disparition.</p><p>Le problème est le temps. En longeant la côte, tu peux perdre presque une journée entière.</p><p><strong>La seconde route passe directement par le large.</strong></p><p>Elle est beaucoup plus courte. Avec un vent favorable, elle te mènera presque directement vers la dernière position connue du Providence.</p><p>Mais cette partie de la mer est peu surveillée. Les bâtiments marchands qui s’y aventurent sans escorte sont des proies faciles, et les attaques de pirates y sont fréquentes.</p><p>Par cette route, tu gagnerais de précieuses heures.</p><p>À condition d’arriver jusqu’au bout.</p>`,choices:[{label:'Longer la côte et interroger les villages',to:'c3'},{label:'Prendre la route directe par le large',to:'c12'}]},
 c3:{title:'Le village côtier',text:`<p>Le Resolute longe la côte pendant plusieurs heures.</p><p>La navigation est exactement aussi délicate que la carte le laissait prévoir. Par endroits, les récifs remontent presque jusqu’à la surface et forment sous l’eau de longues lignes pâles que seuls les marins les plus expérimentés savent lire.</p><p>À plusieurs reprises, le sloop ralentit pour franchir un chenal étroit entre deux hauts-fonds.</p><p>Vous croisez plusieurs petits villages de pêcheurs. Quelques maisons de bois, des embarcations tirées sur le sable, parfois un quai sommaire.</p><p>Tu fais poser les mêmes questions partout.</p><p>Personne ne semble avoir vu le Providence.</p><p>Ou personne ne souhaite en parler.</p><p>En fin d’après-midi, vous atteignez un village plus important. Une petite jetée permet au Resolute de mouiller à proximité sans risquer les récifs.</p><p>Le soleil descend déjà derrière les palmiers.</p><p>Sur la place, les habitants rangent leurs étals. Plusieurs hommes te regardent passer en uniforme avant de détourner les yeux.</p><p>Une enseigne de bois grince au-dessus d’une porte.</p><p><strong>La taverne est encore ouverte.</strong></p>`,choices:[{label:'Entrer dans la taverne',to:'c4'}]},

 c4:{title:'La taverne',text:s=>`<p>L’intérieur est sombre malgré les dernières lueurs du jour.</p><p>Une dizaine de marins boivent en silence autour de petites tables. L’odeur du rhum, de la fumée et du poisson séché imprègne la pièce.</p><p>Ton uniforme attire immédiatement les regards.</p><p>Les conversations reprennent presque aussitôt, mais moins fort.</p><p>Trois personnes retiennent ton attention.</p><p><strong>Le tavernier</strong>, un homme large d’épaules qui essuie depuis plusieurs minutes le même gobelet sans jamais vraiment te regarder.</p><p><strong>Un vieux marin</strong>, assis seul dans un coin. Sa peau est brûlée par le soleil et une longue cicatrice traverse sa joue. Il a l’allure de quelqu’un qui a passé sa vie sur des bateaux dont il vaut mieux ne pas connaître le pavillon.</p><p>Et enfin <strong>une femme étrangère</strong>, installée près d’une fenêtre. Ses vêtements sont simples, mais sa posture ne l’est pas. Elle observe la salle comme un soldat observe un terrain avant une bataille.</p><p>Tu es presque certain qu’elle est espagnole.</p>${s.flags.tavernkeeperDone&&s.flags.oldSailorDone&&s.flags.spanishWomanDone?'<p>Tu as interrogé tous ceux qui semblaient susceptibles de savoir quelque chose.</p>':''}`,choices:s=>{
   const out=[];
   if(!s.flags.tavernkeeperDone)out.push({label:'Interroger le tavernier',to:'c5'});
   if(!s.flags.oldSailorDone)out.push({label:'Interroger le vieux marin',to:'c6'});
   if(!s.flags.spanishWomanDone)out.push({label:'Interroger la femme espagnole',to:'c7'});
   out.push({label:'Monter dans ta chambre',to:'c8'});
   return out;
 }},

 c5:{title:'Le tavernier',text:s=>{
   if(s.flags.tavernkeeperApproach==='polite')return `<p>Tu poses quelques pièces sur le comptoir et adoptes un ton aussi calme que possible.</p><blockquote>« Je cherche un navire marchand, le Providence. Nous pensons qu’il est passé dans cette région il y a quelques jours. J’aimerais simplement savoir si vous l’avez aperçu, ou si quelqu’un ici a entendu quelque chose. »</blockquote><p>Le tavernier continue d’essuyer son gobelet.</p><p>Il réfléchit peut-être une seconde de trop.</p><blockquote>« Non, lieutenant. Désolé. Je n’ai rien vu. »</blockquote><p>Il se détourne immédiatement pour ranger une bouteille déjà parfaitement à sa place.</p><p>Tu comprends qu’il n’ajoutera rien.</p>`;
   if(s.flags.tavernkeeperApproach==='authority')return `<p>Tu poses les deux mains sur le comptoir.</p><p>Cette fois, ta voix n’a plus rien d’amical.</p><blockquote>« Je suis en mission pour la Couronne. Un navire et vingt-sept hommes ont disparu. Si vous savez quelque chose et que vous choisissez de me le cacher, j’aurai besoin d’une excellente raison. »</blockquote><p>Le tavernier s’immobilise.</p><p>Son regard passe rapidement vers les autres clients.</p><blockquote>« Non. Je n’ai pas vu votre bateau. »</blockquote><p>Il baisse encore la voix.</p><blockquote>« Mais j’ai entendu ce qui arrive aux marins quand ils deviennent trop avides. Certains disent que ce n’est qu’une histoire racontée pour effrayer les enfants. Ici, personne ne rit avec ça. »</blockquote><p>Il se penche légèrement vers toi.</p><blockquote>« Il y a une île. Personne ne sait vraiment où elle se trouve. On dit qu’elle attire les hommes qui cherchent ce qu’ils ne devraient pas chercher. Puis elle les aspire. Les bateaux disparaissent. Les hommes aussi. »</blockquote><p>Il se redresse brusquement.</p><blockquote>« On le sait dans la région. C’est tout ce que je peux vous dire. »</blockquote>`;
   return `<p>Tu t’approches du comptoir.</p><p>Le tavernier te regarde enfin.</p><p>À cette distance, tu remarques qu’il évite soigneusement de regarder l’insigne de la Royal Navy sur ton uniforme.</p><p>Tu peux essayer de le mettre en confiance.</p><p>Ou lui rappeler que tu n’es pas ici en simple voyageur.</p>`;
 },choices:s=>s.flags.tavernkeeperDone?[{label:'Retourner dans la salle',to:'c4'}]:[
   {label:'L’amadouer poliment',stay:true,effect:s=>{s.flags.tavernkeeperDone=true;s.flags.tavernkeeperApproach='polite';}},
   {label:'Employer un ton grave et faire usage de ton autorité',stay:true,effect:s=>{s.flags.tavernkeeperDone=true;s.flags.tavernkeeperApproach='authority';s.flags.tavernkeeperAuthority=true;s.flags.islandRumor=true;}}
 ]},

 c6:{title:'Le vieux marin',text:s=>{
   if(s.flags.oldSailorApproach==='polite')return `<p>Tu t’assieds en face de lui sans brusquer les choses.</p><blockquote>« Excusez-moi. Je cherche un navire marchand appelé le Providence. Il est possible qu’il soit passé près d’ici. Vous avez peut-être vu quelque chose ? »</blockquote><p>Le vieil homme lève lentement les yeux vers toi.</p><p>Il boit une gorgée de rhum.</p><blockquote>« Non. Rien vu qui ressemble à votre marchand. »</blockquote><p>Puis il regarde de nouveau son verre.</p><p>La conversation est terminée.</p>`;
   if(s.flags.oldSailorApproach==='authority')return `<p>Tu tires une chaise et t’assieds sans lui demander son avis.</p><blockquote>« Écoutez-moi bien. Je représente la Royal Navy. Des hommes ont disparu et je n’ai pas de temps à perdre avec les silences de cette salle. »</blockquote><p>Le vieux marin relève les yeux.</p><p>Un sourire fatigué apparaît sur son visage.</p><blockquote>« Non. Je n’ai pas vu le Providence. »</blockquote><p>Il fait tourner son verre entre ses doigts.</p><blockquote>« Mais j’ai entendu ce qui se passe quand les marins deviennent trop avides. Tous ceux qui vivent assez longtemps dans ces eaux finissent par entendre la même histoire. »</blockquote><p>Il se rapproche.</p><blockquote>« Une île les appelle. Certains prétendent qu’elle n’existe pas. D’autres jurent qu’elle se déplace. Moi, je sais seulement une chose : ceux qui la cherchent finissent toujours par la trouver. Et on ne les revoit pas. »</blockquote><p>Il attrape soudain ta main.</p><p>Avant que tu ne la retires, il prend un morceau de charbon posé près d’une lampe et dessine lentement <strong>un cercle noir au centre de ta paume</strong>.</p><p>Un simple rond. Parfaitement fermé.</p><blockquote>« Gardez ça en tête. Pas seulement sur votre main. Si vous revoyez ce signe là où il ne devrait pas être, ne cherchez pas à comprendre. Partez. »</blockquote><p>Tu regardes le cercle noir.</p><p>Lorsque tu relèves les yeux, le vieil homme a déjà repris son verre.</p>`;
   return `<p>Le vieux marin ne lève même pas les yeux lorsque tu approches.</p><p>Sa main gauche serre un verre de rhum. Deux doigts de sa main droite manquent à l’appel.</p><p>Tu peux essayer de gagner sa confiance.</p><p>Ou lui parler comme à un homme qui sait parfaitement ce que signifie un uniforme de la Royal Navy.</p>`;
 },choices:s=>s.flags.oldSailorDone?[{label:'Retourner dans la salle',to:'c4'}]:[
   {label:'L’interroger poliment',stay:true,effect:s=>{s.flags.oldSailorDone=true;s.flags.oldSailorApproach='polite';}},
   {label:'Faire usage de ton autorité',stay:true,effect:s=>{s.flags.oldSailorDone=true;s.flags.oldSailorApproach='authority';s.flags.blackCirclePalm=true;s.flags.islandRumor=true;}}
 ]},

 c7:{title:'La femme espagnole',text:s=>{
   if(s.flags.spanishWomanApproach==='polite')return `<p>Tu t’arrêtes à quelques pas de sa table.</p><blockquote>« Pardonnez-moi de vous déranger. Je recherche le Providence, un navire marchand disparu depuis quelques jours. Peut-être l’avez-vous aperçu en arrivant dans la région ? »</blockquote><p>Elle te regarde longuement avant de répondre.</p><blockquote>« Je suis désolée, lieutenant. Je n’ai vu aucun navire de ce nom. »</blockquote><p>Son français est presque parfait, à peine marqué par son accent.</p><p>Elle baisse les yeux vers son verre.</p><p>Tu pourrais insister, mais tu comprends qu’elle ne dira rien de plus.</p>`;
   if(s.flags.spanishWomanApproach==='authority')return `<p>Tu restes debout devant sa table.</p><blockquote>« Vous savez qui je suis. Et vous savez également que nos deux pays sont en guerre. Je ne vous accuse de rien, mais un navire britannique et vingt-sept hommes ont disparu. Si vous possédez une information, c’est maintenant qu’il faut parler. »</blockquote><p>La femme ne semble pas impressionnée.</p><p>Elle te fixe quelques secondes, puis soupire.</p><blockquote>« Non. Je n’ai pas vu votre Providence. »</blockquote><p>Elle tourne lentement son verre entre ses doigts.</p><blockquote>« Mais j’ai entendu ce qui arrive aux marins trop avides. Ici, certains prétendent que ce n’est qu’une légende. Une île qui attire ceux qui cherchent des richesses et qui ne les laisse jamais repartir. »</blockquote><p>Elle plonge une main sous son manteau.</p><p>Instinctivement, ta main se rapproche de ton arme.</p><p>Mais elle dépose simplement sur la table un bracelet épais de cuir sombre, renforcé par une petite pièce de métal usée.</p><blockquote>« Prenez-le. »</blockquote><p>Tu ne bouges pas.</p><blockquote>« Je suis heureuse d’avoir croisé votre route, lieutenant. Mais je ne crois pas que nous vous reverrons. »</blockquote><p>Tu passes le bracelet autour de ton poignet.</p><p>Il serre fortement l’avant-bras et améliore immédiatement ta prise.</p><p><strong>Bracelet de force : Force +2.</strong></p>`;
   return `<p>La femme suit ton approche du regard.</p><p>Elle est plus jeune que tu ne le pensais. Une trentaine d’années tout au plus.</p><p>Ses vêtements n’ont rien d’un uniforme, pourtant sa façon de se tenir, de surveiller les portes et de garder une main libre ne laisse guère de doute.</p><p>Elle a reçu une formation militaire.</p><p>Tu peux t’adresser à elle avec courtoisie.</p><p>Ou utiliser ton grade et la situation politique pour la pousser à répondre.</p>`;
 },choices:s=>s.flags.spanishWomanDone?[{label:'Retourner dans la salle',to:'c4'}]:[
   {label:'L’interroger poliment',stay:true,effect:s=>{s.flags.spanishWomanDone=true;s.flags.spanishWomanApproach='polite';}},
   {label:'Parler avec autorité',stay:true,effect:s=>{s.flags.spanishWomanDone=true;s.flags.spanishWomanApproach='authority';s.flags.islandRumor=true;if(!s.flags.forceBracelet){s.flags.forceBracelet=true;s.forceBonus=(s.forceBonus||0)+2;addItem(s,'bracelet_force','Bracelet de force','Un bracelet de cuir sombre renforcé de métal. Force +2.');}}}
 ]},

 c8:{title:'Un bruit dans la chambre',text:`<p>La nuit est tombée depuis longtemps.</p><p>Ta chambre se trouve à l’étage de la taverne. Une petite pièce étroite, un lit, une table et une fenêtre donnant sur la rue.</p><p>Tu as laissé ton sabre à portée de main.</p><p>Comme toujours lorsque tu dors loin d’un navire militaire, tu as également glissé un petit couteau sous ton oreiller.</p><p>Le village est silencieux.</p><p>Puis un bruit te réveille.</p><p>Un craquement très léger.</p><p>Le bois du plancher.</p><p>Tu ouvres les yeux.</p><p>Une silhouette se tient près de ton lit.</p><p>Tu aperçois le reflet d’une lame.</p><p>Elle s’abat vers toi.</p>`,choices:[{label:'Réagir — test de Dextérité',to:'c9',diceTest:true,effect:s=>{s.flags.nightDex=rollDex(s);if(!s.flags.nightDex)rollDamage(s,'night',3);}}]},

 c9:{title:'L’assaillant',text:s=>diceResultHtml(s)+(s.flags.nightDex?
   `<p>Ton corps réagit avant même que tu aies le temps de réfléchir.</p><p>Tu roules sur le côté. La lame frappe le matelas.</p><p>Ta main passe sous l’oreiller et se referme sur ton couteau.</p><p>Tu frappes.</p><p>L’homme recule brutalement et s’effondre contre le mur.</p>`:
   damageResultHtml(s,'night')+`<p>La lame te touche avant que tu ne parviennes à te dégager.</p><p>Tu arraches ton couteau de dessous l’oreiller et frappes à ton tour.</p><p>L’homme recule et tombe lourdement contre le mur.</p>`)
   +`<p>Tu allumes la petite lampe posée près du lit.</p><p>Tu ne reconnais pas ton agresseur.</p><p>Un homme du village, peut-être. Ou quelqu’un arrivé après vous.</p><p>Il essaie de respirer.</p><p>Tu t’accroupis près de lui.</p><blockquote>« Qui vous envoie ? »</blockquote><p>Il secoue lentement la tête.</p><p>Puis ses doigts se referment sur ta manche.</p><blockquote>« Abandonnez les recherches... »</blockquote><p>Sa voix n’est plus qu’un souffle.</p><blockquote>« Le trésor doit disparaître à jamais. »</blockquote><p>Sa main retombe.</p><p>Il ne répond plus.</p>`,choices:[{label:'Fouiller son corps',to:'c10',effect:s=>{if(!s.flags.assassinLoot){s.flags.assassinLoot=true;addGold(s,8);addItem(s,'couteaux_jet','Deux couteaux équilibrés','Deux petits couteaux parfaitement équilibrés, adaptés au lancer.',{quantity:2});}}}]},

 c10:{title:'À l’aube',text:s=>`<p>Tu fouilles rapidement les vêtements de l’homme.</p><p>Il ne porte aucun document.</p><p>Aucun signe permettant de connaître son origine.</p><p>Dans une petite bourse, tu trouves <strong>huit pièces d’or</strong>.</p><p>Sous son manteau sont dissimulés <strong>deux petits couteaux parfaitement équilibrés</strong>. Plus courts que ton arme de combat, mais conçus pour être lancés avec précision.</p><p>Tu les ajoutes à ton équipement.</p><p>Le reste de la nuit est court.</p><p>Lorsque tu redescends dans la salle, le jour commence à peine à entrer par les fenêtres.</p><p>Le tavernier est déjà là, mais il évite ton regard.</p>${s.flags.oldSailorDone?'<p>La table du vieux marin est vide.</p>':''}${s.flags.spanishWomanDone?'<p>La femme espagnole a elle aussi disparu.</p>':''}<p>Personne ne demande ce qui s’est passé dans ta chambre.</p><p>Personne ne semble surpris.</p><p>Quelques minutes plus tard, tu rejoins la jetée.</p><p>À bord du Resolute, les marins terminent de préparer les voiles. Tes huit soldats vérifient leurs armes.</p><p>Tu jettes un dernier regard vers le village.</p><p>Puis tu donnes l’ordre de larguer les amarres.</p><p><strong>Le Providence vous attend quelque part au-delà de la côte.</strong></p>`,choices:[{label:'Rejoindre la zone de disparition',to:'c20'}]},
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
 contentVersion:4,pageMapVersion:2,saveVersion:1,libraryNumber:2,libraryLabel:'Livre 02',sheetLabel:'FICHE DU PERSONNAGE',
 readerEyebrow:'Chroniques d’un autre temps - Livre 02',
 assetBase:'./books/Livre02-Le-Secret-du-Providence/images',assetBases:['./books/Livre02-Le-Secret-du-Providence/images'],uiAssetBase:'./books/Livre02-Le-Secret-du-Providence/assets',
 seriesProfileDefaults:{heroGender:'female',heroName:'Eleanor',baseStats:{maxHp:18,force:8,dexterity:13}},
 normalizeSeriesProfile(p){p.heroName=p.heroGender==='male'?'Edward':'Eleanor';p.baseStats={maxHp:18,force:8,dexterity:13};},
 syncSeriesProfile(s,p){p.heroGender=s.heroGender==='male'?'male':'female';p.heroName=heroName(s);p.baseStats={maxHp:18,force:8,dexterity:13};p.memory={...(p.memory||{})};},
 handleProfileInputChange(s,input){if(input?.classList.contains('hero-gender-input'))setHeroIdentity(s,input.value);},
 statusStats(s){const r=s.maxHp>0?s.hp/s.maxHp:0;return[
  {icon:'♥',label:'Vie',value:`${s.hp}/${s.maxHp}`,cls:r<=.3?'status-critical':r<=.55?'status-warning':''},
  {icon:'◆',label:'Dextérité',value:String(currentDexterity(s))},{icon:'⚔',label:'Force',value:String(currentForce(s))},{icon:'†',label:'Arme',value:'+4'},{icon:'🛡',label:'Protection',value:String(currentProtection(s))},{icon:'●',label:'Soldats',value:`${s.soldiers}/${s.maxSoldiers}`}];},
 resetSeriesOnRestart:true,showMissingIllustrationPlaceholder:true,story:STORY,pageOrder:PAGE_ORDER,pageByNode:PAGE_BY_NODE,navigationTitles:{},padPage,
 imageBaseForPage:n=>`Le-Secret-du-Providence-${padPage(n)}`,imageCandidatesForPage:n=>[`Le-Secret-du-Providence-${padPage(n)}`,`pages/Le-Secret-du-Providence-${padPage(n)}`],imageExtensions:['jpg','jpeg','png'],
 createInitialState,rules:{currentForce,currentDexterity,combatPower,weaponLabel,currentProtection,applyDamage},characterSheetHtml,inventory,
 checkpoints:[{node:'c20',label:'Zone de disparition',onlyIfNone:true},{node:'c34',label:'Arrivée sur l’île'},{node:'c57',label:'Retour sur le Providence'}],
 conclusion:{successNodes:['c69'],deathNodes:['death'],successTitle:'À suivre',deathTitle:'Votre aventure s’achève ici',successText:'Vous avez atteint la fin de cette version de test du Secret du Providence.',deathText:'Votre mission s’arrête ici. Vous pouvez reprendre au dernier point de sauvegarde ou recommencer.',showJournalRecap:true},
 exportSeriesMemory(){return {};}
});
})();