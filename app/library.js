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
  await script(`./books/${entry.folder}/manifest.js?v=multi-book-17`);
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

    const b=document.createElement('button');
    b.className='library-book';
    b.type='button';

    const buttonTexture=m.theme?.buttonTexture;
    if(buttonTexture){
      b.style.setProperty('--library-book-texture',`url("${assetUrl(e,m,buttonTexture)}")`);
    }

    const available=(m.status||'available')==='available';
    const saved=hasSavedGame(m);
    const access=accessState(m);

    if(!available){
      b.disabled=true;
      b.setAttribute('aria-disabled','true');
    }

    let cardStatus=m.actionLabel||'Découvrir';
    if(available && access.unlocked && saved) cardStatus='Reprendre';
    else if(available && !access.unlocked) cardStatus='Découvrir';

    b.innerHTML=`<span class="library-book-number">${m.label||`Livre ${String(m.number||e.order||'').padStart(2,'0')}`}</span><span class="library-book-title">${m.title||e.id}</span><span class="library-book-status">${available?cardStatus:(m.statusLabel||'Bientôt disponible')}</span>`;

    if(available) b.addEventListener('click',()=>showPreview(e,m));
    root.appendChild(b);
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