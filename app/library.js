(function(){
'use strict';

const manifests=new Map();
window.BookManifestRegistry={
  register(m){manifests.set(m.id,m);return m;},
  get(id){return manifests.get(id);}
};

function script(src){
  return new Promise((ok,ko)=>{
    const s=document.createElement('script');
    s.src=src;
    s.onload=ok;
    s.onerror=ko;
    document.head.appendChild(s);
  });
}

function entries(){
  return [...(window.LIBRARY_CONFIG?.books||[])].sort((a,b)=>(a.order||999)-(b.order||999));
}

function byId(id){
  return entries().find(x=>x.id===id)||null;
}

async function manifest(entry){
  if(BookManifestRegistry.get(entry.id)) return BookManifestRegistry.get(entry.id);
  await script(`./books/${entry.folder}/manifest.js?v=multi-book-30`);
  return BookManifestRegistry.get(entry.id);
}

function assetUrl(entry,m,path){
  if(!path) return '';
  const u=new URL(`./books/${entry.folder}/${path}`,document.baseURI);
  u.searchParams.set('v',String(m.assetVersion||1));
  return u.href;
}

function hasSavedGame(m){
  const runtimeId=m.runtimeId||m.id;
  const prefix=`ldveh.book.${runtimeId}.save.v`;
  try{
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(!key || !key.startsWith(prefix)) continue;
      const raw=localStorage.getItem(key);
      if(!raw) continue;
      try{
        const saved=JSON.parse(raw);
        if(saved && typeof saved==='object' && saved.node && saved.node!=='start') return true;
      }catch(e){
        return true;
      }
    }
  }catch(e){}
  return false;
}

function accessState(m){
  return window.LibraryAccess?.state(m) || {mode:'free',unlocked:true,productId:null,priceLabel:''};
}

const previewBackdrop=document.getElementById('libraryPreviewBackdrop');
const previewClose=document.getElementById('libraryPreviewClose');
const previewImage=document.getElementById('libraryPreviewImage');
const previewKicker=document.getElementById('libraryPreviewKicker');
const previewTitle=document.getElementById('libraryPreviewTitle');
const previewSituation=document.getElementById('libraryPreviewSituation');
const previewAdventure=document.getElementById('libraryPreviewAdventure');
const previewDangers=document.getElementById('libraryPreviewDangers');
const previewAccess=document.getElementById('libraryPreviewAccess');
const previewAction=document.getElementById('libraryPreviewAction');

let previewSelection=null;

function closePreview(){
  if(!previewBackdrop) return;
  previewBackdrop.classList.add('hidden');
  previewBackdrop.setAttribute('aria-hidden','true');
  previewSelection=null;
}

function showPreview(entry,m){
  if(!previewBackdrop) return;

  const data=m.preview||{};
  previewSelection={entry,m};

  if(previewKicker) previewKicker.textContent=m.kicker||m.label||'Chroniques des Âges';
  if(previewTitle) previewTitle.textContent=m.title||entry.id;
  if(previewSituation) previewSituation.textContent=data.situation||m.pitch||'';
  if(previewAdventure) previewAdventure.textContent=data.adventure||'';
  if(previewDangers) previewDangers.textContent=data.dangers||'';

  if(previewImage){
    const imagePath=data.image||m.cover||'';
    if(imagePath){
      previewImage.src=assetUrl(entry,m,imagePath);
      previewImage.alt=`Présentation — ${m.title||entry.id}`;
      previewImage.classList.remove('hidden');
    }else{
      previewImage.removeAttribute('src');
      previewImage.classList.add('hidden');
    }
  }

  if(previewAction){
    const texture=m.theme?.buttonTexture;
    if(texture){
      previewAction.style.setProperty('--library-preview-button-texture',`url("${assetUrl(entry,m,texture)}")`);
    }else{
      previewAction.style.removeProperty('--library-preview-button-texture');
    }

    const access=accessState(m);
    if(access.unlocked){
      previewAction.textContent=hasSavedGame(m)?'Poursuivre l’aventure':'Commencer l’aventure';
      previewAction.dataset.mode='open';
      if(previewAccess){
        previewAccess.textContent='';
        previewAccess.classList.add('hidden');
      }
    }else{
      previewAction.textContent=access.priceLabel
        ? `Déverrouiller le livre · ${access.priceLabel}`
        : 'Déverrouiller le livre';
      previewAction.dataset.mode='unlock';
      if(previewAccess){
        previewAccess.textContent='Ce livre nécessite un achat pour être joué.';
        previewAccess.classList.remove('hidden');
      }
    }
  }

  previewBackdrop.classList.remove('hidden');
  previewBackdrop.setAttribute('aria-hidden','false');
  try{previewAction?.focus();}catch(e){}
}

async function activatePreview(){
  if(!previewSelection) return;
  const {entry,m}=previewSelection;
  const access=accessState(m);

  if(!access.unlocked){
    const unlocked=await window.LibraryAccess?.requestUnlock(m);
    if(!unlocked){
      if(previewAccess){
        previewAccess.textContent='L’achat sera proposé ici lorsque la boutique sera connectée.';
        previewAccess.classList.remove('hidden');
      }
      return;
    }
  }

  closePreview();
  if(window.LibraryApp.open) window.LibraryApp.open(entry.id);
}

previewClose?.addEventListener('click',closePreview);
previewAction?.addEventListener('click',activatePreview);
previewBackdrop?.addEventListener('click',e=>{
  if(e.target===previewBackdrop) closePreview();
});
previewImage?.addEventListener('error',()=>{
  previewImage.classList.add('hidden');
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape' && previewBackdrop && !previewBackdrop.classList.contains('hidden')) closePreview();
});

async function render(){
  const root=document.getElementById('libraryBookList');
  if(!root) return;
  root.replaceChildren();

  for(const e of entries().filter(x=>x.visible!==false)){
    const m=await manifest(e);
    if(!m) continue;

    const available=(m.status||'available')==='available';
    const saved=hasSavedGame(m);
    const access=accessState(m);

    const card=document.createElement('article');
    card.className='library-book';
    card.dataset.status=m.status||'available';

    const media=document.createElement('div');
    media.className='library-book-media';

    const img=document.createElement('img');
    img.className='library-book-image';
    img.alt=`Présentation — ${m.title||e.id}`;
    const imageCandidates=[m.libraryImage,m.cover,m.preview?.image].filter(Boolean);
    let imageIndex=0;
    const tryMenuImage=()=>{
      if(imageIndex>=imageCandidates.length){
        img.remove();
        media.classList.add('is-fallback');
        return;
      }
      img.src=assetUrl(e,m,imageCandidates[imageIndex++]);
    };
    img.addEventListener('error',tryMenuImage);
    if(imageCandidates.length) tryMenuImage();
    else media.classList.add('is-fallback');
    media.appendChild(img);

    const copy=document.createElement('div');
    copy.className='library-book-copy';

    const number=document.createElement('div');
    number.className='library-book-number';
    number.textContent=m.label||`Livre ${String(m.number||e.order||'').padStart(2,'0')}`;

    const title=document.createElement('h2');
    title.className='library-book-title';
    title.textContent=m.title||e.id;

    const pitch=document.createElement('p');
    pitch.className='library-book-pitch';
    pitch.textContent=m.pitch||m.preview?.situation||'';

    copy.append(number,title,pitch);

    const actionWrap=document.createElement('div');
    actionWrap.className='library-book-action-wrap';

    const action=document.createElement('button');
    action.className='library-book-action';
    action.type='button';

    const buttonTexture=m.theme?.buttonTexture;
    if(buttonTexture){
      action.style.setProperty('--library-book-texture',`url("${assetUrl(e,m,buttonTexture)}")`);
    }

    if(!available){
      action.disabled=true;
      action.textContent=m.statusLabel||'Bientôt';
    }else if(!access.unlocked){
      action.textContent=access.priceLabel?`Découvrir · ${access.priceLabel}`:'Découvrir';
      action.addEventListener('click',()=>showPreview(e,m));
    }else{
      action.textContent=m.actionLabel||'Découvrir';
      action.addEventListener('click',()=>showPreview(e,m));
    }

    actionWrap.appendChild(action);
    card.append(media,copy,actionWrap);
    root.appendChild(card);
  }
}

window.LibraryApp={
  entries,
  byId,
  manifest,
  script,
  render,
  open:null,
  showPreview,
  closePreview,
  hasSavedGame,
  accessState,
  canOpen:m=>accessState(m).unlocked
};
})();