/* Démarrage générique multi-livres. */
(async function(){
  'use strict';

  const config=window.LIBRARY_CONFIG||{books:[]};
  const params=new URLSearchParams(window.location.search);

  await LibraryApp.loadAllManifests();
  await LibraryApp.renderLibrary();

  let requestedId=params.get('book');
  if(!requestedId&&config.standalone){
    const first=LibraryApp.configEntries().find(entry=>entry.visible!==false)||LibraryApp.configEntries()[0];
    if(first) requestedId=first.id;
  }

  const homeBtn=document.getElementById('libraryReturnBtn');
  if(homeBtn) homeBtn.addEventListener('click',LibraryApp.goHome);

  if(!requestedId){ LibraryApp.showHome(); return; }

  const entry=LibraryApp.entryById(requestedId);
  if(!entry){ LibraryApp.showHome(); return; }

  let manifest;
  try{ manifest=await LibraryApp.ensureManifest(entry); }
  catch(e){ console.error(e); LibraryApp.showHome(); return; }

  if(!manifest||(manifest.status||'available')!=='available'){ LibraryApp.showHome(); return; }

  window.ACTIVE_BOOK_MANIFEST=manifest;
  window.ACTIVE_LIBRARY_ENTRY=entry;

  const root=document.documentElement;
  const theme=manifest.theme||{};
  const bookAsset=rel=>LibraryApp.resolveBookAsset(entry,rel);

  if(theme.buttonTexture) root.style.setProperty('--ui-button-texture',`url("${bookAsset(theme.buttonTexture)}")`);
  if(theme.statsTexture) root.style.setProperty('--ui-stats-texture',`url("${bookAsset(theme.statsTexture)}")`);
  if(theme.parchmentTexture) root.style.setProperty('--ui-parchment-texture',`url("${bookAsset(theme.parchmentTexture)}")`);

  window.COLLECTION_CATALOG={version:1,defaultBookId:manifest.runtimeId||manifest.id};

  try{
    await LibraryApp.loadScript(`${bookAsset(manifest.bookScript||'book.js')}?v=${manifest.contentVersion||1}`);
    if(manifest.journalScript) await LibraryApp.loadScript(`${bookAsset(manifest.journalScript)}?v=${manifest.contentVersion||1}`);
    for(const script of (manifest.extraScripts||[])) await LibraryApp.loadScript(`${bookAsset(script)}?v=${manifest.contentVersion||1}`);
  }catch(e){ console.error(e); LibraryApp.showHome(); return; }

  const runtimeBook=BookRegistry.get(manifest.runtimeId||manifest.id);
  if(!runtimeBook){ LibraryApp.showHome(); return; }

  try{
    if(sessionStorage.getItem('livre-interactif.restart-request')==='1'){
      sessionStorage.removeItem('livre-interactif.restart-request');
      const prefixes=[`ldveh.book.${runtimeBook.id}.save.v`,`ldveh.book.${runtimeBook.id}.checkpoint.v`];
      const exactKeys=[...(runtimeBook.legacyStorageKeys||[]),...(runtimeBook.legacyCheckpointKeys||[])];
      Object.keys(localStorage).forEach(key=>{
        if(prefixes.some(prefix=>key.startsWith(prefix))||exactKeys.includes(key)) localStorage.removeItem(key);
      });
    }
  }catch(e){}

  LibraryApp.showBook();
  try{ await LibraryApp.loadScript('./engine/reader.js?v=1'); }
  catch(e){ console.error(e); LibraryApp.showHome(); }
})();
