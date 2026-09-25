(async function(){
'use strict';
const VIEW_KEY='livre-interactif.library.view';
const home=document.getElementById('libraryHome');
const returnBtn=document.getElementById('libraryReturnBtn');
let loaded=false;
function remember(v){try{sessionStorage.setItem(VIEW_KEY,v);}catch(e){}}
function remembered(){try{return sessionStorage.getItem(VIEW_KEY);}catch(e){return null;}}
function showHome(rem=true){document.documentElement.setAttribute('data-initial-view','home');home?.classList.remove('hidden');document.body.classList.add('library-home-open');document.body.classList.remove('library-book-open');if(rem)remember('home');window.scrollTo(0,0);}
function showBook(rem=true){document.documentElement.setAttribute('data-initial-view','book01');home?.classList.add('hidden');document.body.classList.remove('library-home-open');document.body.classList.add('library-book-open');if(rem)remember('book01');window.scrollTo(0,0);}
async function loadBook(id){if(loaded){showBook(true);return;}const e=LibraryApp.byId(id);if(!e)return;const m=await LibraryApp.manifest(e);if(!m||(m.status||'available')!=='available')return;window.COLLECTION_CATALOG={version:3,defaultBookId:m.runtimeId||m.id};const root=document.documentElement;const base=`./books/${e.folder}/`;
 if(m.theme?.buttonTexture)root.style.setProperty('--ui-button-texture',`url("${base}${m.theme.buttonTexture}")`);
 if(m.theme?.statsTexture)root.style.setProperty('--ui-stats-texture',`url("${base}${m.theme.statsTexture}")`);
 if(m.theme?.parchmentTexture)root.style.setProperty('--ui-parchment-texture',`url("${base}${m.theme.parchmentTexture}")`);
 const vars={vie:'--ui-icon-vie',dexterite:'--ui-icon-dexterite',force:'--ui-icon-force',arme:'--ui-icon-arme',protection:'--ui-icon-protection',terreNoire:'--ui-icon-terre-noire'};for(const [k,v] of Object.entries(vars)){if(m.theme?.icons?.[k])root.style.setProperty(v,`url("${base}${m.theme.icons[k]}")`);}
 if(m.themeStylesheet){await new Promise((resolve,reject)=>{const link=document.createElement('link');link.rel='stylesheet';link.href=`${base}${m.themeStylesheet}?v=${m.assetVersion||176}`;link.onload=resolve;link.onerror=reject;document.head.appendChild(link);});}
 await LibraryApp.script(`${base}${m.bookScript||'book.js'}?v=ref174`);if(m.journalScript)await LibraryApp.script(`${base}${m.journalScript}?v=ref174`);for(const x of (m.extraScripts||[]))await LibraryApp.script(`${base}${x}?v=ref174`);await LibraryApp.script('./engine/reader.js?v=68.173-ref');loaded=true;showBook(true);}
LibraryApp.open=loadBook;
await LibraryApp.render();
returnBtn?.addEventListener('click',()=>showHome(true));
if(remembered()==='book01')await loadBook('livre01');else showHome(false);
})();
