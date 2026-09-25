/* Bibliothèque générique de Chroniques des Âges. */
(function(){
  'use strict';
  const manifests = new Map();

  window.BookManifestRegistry = {
    register(manifest) {
      if (!manifest || !manifest.id) throw new Error('Manifest de livre sans id.');
      manifests.set(manifest.id, manifest);
      return manifest;
    },
    get(id) { return manifests.get(id); },
    list() { return Array.from(manifests.values()); }
  };

  function loadScript(src) {
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=src;
      script.async=true;
      script.onload=resolve;
      script.onerror=()=>reject(new Error(`Impossible de charger ${src}`));
      document.head.appendChild(script);
    });
  }

  function configEntries(){
    return [...((window.LIBRARY_CONFIG&&LIBRARY_CONFIG.books)||[])]
      .sort((a,b)=>(a.order||999)-(b.order||999));
  }
  function entryById(id){ return configEntries().find(entry=>entry.id===id)||null; }

  async function ensureManifest(entry){
    if(!entry) return null;
    const cached=BookManifestRegistry.get(entry.id);
    if(cached) return cached;
    await loadScript(`./books/${entry.folder}/manifest.js?v=1`);
    return BookManifestRegistry.get(entry.id)||null;
  }

  function resolveBookAsset(entry,relativePath){
    if(!relativePath) return '';
    if(/^(https?:|data:|\/)/.test(relativePath)) return relativePath;
    return `./books/${entry.folder}/${relativePath.replace(/^\.\//,'')}`;
  }

  function bookUrl(id){
    const url=new URL(window.location.href);
    url.search=''; url.hash='';
    url.searchParams.set('book',id);
    return url.toString();
  }
  function homeUrl(){
    const url=new URL(window.location.href);
    url.search=''; url.hash='';
    return url.toString();
  }

  async function loadAllManifests(){
    await Promise.all(configEntries().map(async entry=>{
      try{ await ensureManifest(entry); }catch(e){ console.warn(e); }
    }));
  }

  function makeCover(entry,manifest){
    const cover=document.createElement('div');
    cover.className='library-book-cover';
    const candidates=[...(manifest.coverCandidates||[]),manifest.cover]
      .filter(Boolean).map(path=>resolveBookAsset(entry,path));
    if(!candidates.length){ cover.classList.add('is-fallback'); return cover; }

    const img=document.createElement('img');
    img.alt=`Présentation — ${manifest.title||entry.id}`;
    let i=0;
    const tryNext=()=>{
      if(i>=candidates.length){ img.remove(); cover.classList.add('is-fallback'); return; }
      img.src=candidates[i++];
    };
    img.onerror=tryNext;
    tryNext();
    cover.appendChild(img);
    return cover;
  }

  async function renderLibrary(){
    const root=document.getElementById('libraryBookList');
    if(!root) return;
    root.replaceChildren();
    const entries=configEntries().filter(entry=>entry.visible!==false);

    if(!entries.length){
      const empty=document.createElement('div');
      empty.className='library-empty';
      empty.textContent='Aucun livre visible.';
      root.appendChild(empty);
      return;
    }

    for(const entry of entries){
      let manifest=null;
      try{ manifest=await ensureManifest(entry); }catch(e){}
      if(!manifest) continue;

      const available=(manifest.status||'available')==='available';
      const button=document.createElement('button');
      button.className='library-book';
      button.type='button';
      button.dataset.status=manifest.status||'available';
      if(!available) button.disabled=true;

      button.appendChild(makeCover(entry,manifest));

      const content=document.createElement('span');
      content.className='library-book-content';

      const number=document.createElement('span');
      number.className='library-book-number';
      number.textContent=manifest.label||`Livre ${String(manifest.number||entry.order||'').padStart(2,'0')}`;

      const title=document.createElement('span');
      title.className='library-book-title';
      title.textContent=manifest.title||entry.id;

      const pitch=document.createElement('span');
      pitch.className='library-book-pitch';
      pitch.textContent=manifest.pitch||'';

      const status=document.createElement('span');
      status.className='library-book-status';
      status.textContent=available?(manifest.actionLabel||'Ouvrir'):(manifest.statusLabel||'Bientôt disponible');

      content.append(number,title,pitch,status);
      button.appendChild(content);
      if(available) button.addEventListener('click',()=>{window.location.href=bookUrl(entry.id);});
      root.appendChild(button);
    }
  }

  function showHome(){
    document.getElementById('libraryHome')?.classList.remove('hidden');
    document.body.classList.add('library-home-open');
    document.body.classList.remove('library-book-open');
  }
  function showBook(){
    document.getElementById('libraryHome')?.classList.add('hidden');
    document.body.classList.remove('library-home-open');
    document.body.classList.add('library-book-open');
  }

  window.LibraryApp={
    loadScript,configEntries,entryById,ensureManifest,resolveBookAsset,
    loadAllManifests,renderLibrary,showHome,showBook,
    goHome(){window.location.href=homeUrl();}
  };
})();
