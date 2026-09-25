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
function assetExists(url){
  return new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>resolve(true);
    img.onerror=()=>resolve(false);
    img.decoding='async';
    img.src=url;
  });
}
async function resolveJpegAsset(base,path,version){
  if(!path)return null;
  const candidates=[path];
  if(/\.jpg$/i.test(path))candidates.push(path.replace(/\.jpg$/i,'.jpeg'));
  else if(/\.jpeg$/i.test(path))candidates.push(path.replace(/\.jpeg$/i,'.jpg'));
  for(const candidate of [...new Set(candidates)]){
    const url=`${base}${candidate}?v=${version||1}`;
    if(await assetExists(url))return url;
  }
  return `${base}${path}?v=${version||1}`;
}
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
async function loadBook(id){
  if(loadedBookId){
    if(loadedBookId===id){showBook(id,true);return;}
    rememberBook(id);rememberView('book');location.reload();return;
  }
  const e=LibraryApp.byId(id);if(!e)return;
  const m=await LibraryApp.manifest(e);
  if(!m||(m.status||'available')!=='available')return;
  window.COLLECTION_CATALOG={version:4,defaultBookId:m.runtimeId||m.id};
  const root=document.documentElement,base=`./books/${e.folder}/`;
  const vars={vie:'--ui-icon-vie',dexterite:'--ui-icon-dexterite',force:'--ui-icon-force',arme:'--ui-icon-arme',protection:'--ui-icon-protection',special:'--ui-icon-special'};
  for(const [k,v] of Object.entries(vars)){if(m.theme?.icons?.[k])root.style.setProperty(v,`url("${base}${m.theme.icons[k]}")`);}
  if(m.themeStylesheet)await new Promise((ok,ko)=>{const l=document.createElement('link');l.rel='stylesheet';l.href=`${base}${m.themeStylesheet}?v=${m.assetVersion||1}`;l.onload=ok;l.onerror=ko;document.head.appendChild(l);});
  const textureVars=[
    ['buttonTexture','--ui-button-texture'],
    ['statsTexture','--ui-stats-texture'],
    ['parchmentTexture','--ui-parchment-texture']
  ];
  for(const [key,cssVar] of textureVars){
    const path=m.theme?.[key];
    if(!path)continue;
    const url=await resolveJpegAsset(base,path,m.assetVersion||1);
    root.style.setProperty(cssVar,`url("${url}")`,'important');
  }
  await LibraryApp.script(`${base}${m.bookScript||'book.js'}?v=${m.contentVersion||1}`);
  if(m.journalScript)await LibraryApp.script(`${base}${m.journalScript}?v=${m.contentVersion||1}`);
  for(const x of (m.extraScripts||[]))await LibraryApp.script(`${base}${x}?v=${m.contentVersion||1}`);
  await LibraryApp.script('./engine/reader.js?v=multi-book-8');
  loadedBookId=id;rememberBook(id);showBook(id,true);
}
LibraryApp.open=loadBook;
await LibraryApp.render();
returnBtn?.addEventListener('click',()=>showHome(true));
const oldView=rememberedView(),wanted=rememberedBook()||'livre01';
if(oldView==='book'||oldView==='book01')await loadBook(oldView==='book01'?'livre01':wanted);else showHome(false);
})();