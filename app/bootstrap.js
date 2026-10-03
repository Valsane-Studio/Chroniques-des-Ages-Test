(async function(){
'use strict';
const VIEW_KEY='livre-interactif.library.view';
const BOOK_KEY='livre-interactif.library.book';
const home=document.getElementById('libraryHome');
const returnBtn=document.getElementById('libraryReturnBtn');
let loadedBookId=null;
function rememberView(v){try{localStorage.setItem(VIEW_KEY,v);sessionStorage.setItem(VIEW_KEY,v);}catch(e){}}
function rememberedView(){try{return localStorage.getItem(VIEW_KEY)||sessionStorage.getItem(VIEW_KEY);}catch(e){return null;}}
function rememberBook(id){try{localStorage.setItem(BOOK_KEY,id);sessionStorage.setItem(BOOK_KEY,id);}catch(e){}}
function rememberedBook(){try{return localStorage.getItem(BOOK_KEY)||sessionStorage.getItem(BOOK_KEY);}catch(e){return null;}}
function showHome(rem=true){
  document.documentElement.setAttribute('data-initial-view','home');
  home?.classList.remove('hidden');
  document.body.classList.add('library-home-open');
  document.body.classList.remove('library-book-open');
  if(rem)rememberView('home'); window.scrollTo(0,0);
}
function showBook(id,rem=true){
  document.documentElement.setAttribute('data-initial-view',id||'book');
  home?.classList.add('hidden');
  document.body.classList.remove('library-home-open');
  document.body.classList.add('library-book-open');
  if(rem){rememberView('book');if(id)rememberBook(id);} window.scrollTo(0,0);
}
function neutralizeProvidenceTitles(manifest){
  const runtimeId=manifest?.runtimeId||manifest?.id;
  if(runtimeId!=='providence-02')return;
  const book=window.BookRegistry?.get?.(runtimeId);
  if(!book?.story)return;
  const titles={
    c12:'Une voile à l’horizon',
    c16:'Fouiller le capitaine',
    pirateApproach:'Le navire sans pavillon',
    pirateOfferRejected:'La proposition',
    pirateDealAccepted:'La proposition',
    c38:'Le village',
    c40:'Les dernières traces',
    islandRetreat:'Faire demi-tour',
    islandBeachFight:'Sur la plage',
    islandBeachYield:'Sans attaquer',
    islandCaptured:'Le réveil',
    forestTrap:'Sous les arbres',
    cavePistolGuardian:'Dans la lumière',
    ringPrisonRevolt:'Près de la cage',
    villageNightCave:'Dans la grotte',
    villageAssaultVictory:'Après le combat',
    deepCaveRevenant:'La silhouette',
    deepCaveFlooded:'Vers le bruit de l’eau',
    victoryMissingSailors:'Le compte des rescapés',
    victoryRescueSurvivor:'Dans le renfoncement',
    victoryRescueRevenant:'Plus bas dans la galerie',
    victoryRescueSanctum:'La salle ronde',
    victoryCliffPassage:'Le couloir',
    forestCombatPowder:'Sous les racines',
    cliffReturnPrisonGate:'Devant la cage',
    captiveSoloFlight:'Dans la faille'
  };
  for(const [nodeId,title] of Object.entries(titles)){
    if(book.story[nodeId])book.story[nodeId].title=title;
  }
}
async function loadBook(id){
  if(loadedBookId){
    if(loadedBookId===id){showBook(id,true);return;}
    rememberBook(id);rememberView('book');location.reload();return;
  }
  const e=LibraryApp.byId(id);
  if(!e){
    rememberBook('livre01');
    showHome(true);
    return;
  }
  const m=await LibraryApp.manifest(e);
  if(!m||(m.status||'available')!=='available'){
    rememberBook('livre01');
    showHome(true);
    return;
  }
  if(!LibraryApp.canOpen(m)){
    showHome(true);
    LibraryApp.showPreview?.(e,m);
    return;
  }
  window.COLLECTION_CATALOG={version:4,defaultBookId:m.runtimeId||m.id};
  const root=document.documentElement,base=`./books/${e.folder}/`;
  const assetUrl=path=>{
    const u=new URL(`${base}${path}`,document.baseURI);
    u.searchParams.set('v',String(m.assetVersion||1));
    return u.href;
  };
  if(m.theme?.buttonTexture)root.style.setProperty('--ui-button-texture',`url("${assetUrl(m.theme.buttonTexture)}")`,'important');

  if(m.theme?.statsTexture)root.style.setProperty('--ui-stats-texture',`url("${assetUrl(m.theme.statsTexture)}")`,'important');
  if(m.theme?.parchmentTexture)root.style.setProperty('--ui-parchment-texture',`url("${assetUrl(m.theme.parchmentTexture)}")`,'important');
  const vars={vie:'--ui-icon-vie',dexterite:'--ui-icon-dexterite',force:'--ui-icon-force',arme:'--ui-icon-arme',protection:'--ui-icon-protection',special:'--ui-icon-special'};
  for(const [k,v] of Object.entries(vars)){if(m.theme?.icons?.[k])root.style.setProperty(v,`url("${assetUrl(m.theme.icons[k])}")`,'important');}
  if(m.themeStylesheet)await new Promise((ok,ko)=>{const l=document.createElement('link');l.rel='stylesheet';l.href=`${base}${m.themeStylesheet}?v=${m.assetVersion||1}`;l.onload=ok;l.onerror=ko;document.head.appendChild(l);});
  await LibraryApp.script(`${base}${m.bookScript||'book.js'}?v=${m.contentVersion||1}`);
  neutralizeProvidenceTitles(m);
  if(m.journalScript)await LibraryApp.script(`${base}${m.journalScript}?v=${m.contentVersion||1}`);
  for(const x of (m.extraScripts||[]))await LibraryApp.script(`${base}${x}?v=${m.contentVersion||1}`);
  await LibraryApp.script('./engine/reader.js?v=multi-book-34');
  loadedBookId=id;rememberBook(id);showBook(id,true);
}
LibraryApp.open=loadBook;
await LibraryApp.render();
returnBtn?.addEventListener('click',()=>showHome(true));
const oldView=rememberedView(),wanted=rememberedBook()||'livre01';
try{
  if(oldView==='book'||oldView==='book01'){
    await loadBook(oldView==='book01'?'livre01':wanted);
  }else{
    showHome(false);
  }
}catch(error){
  console.error('APHANES TEST — impossible de restaurer le livre précédent', error);
  rememberBook('livre01');
  showHome(true);
}
})();