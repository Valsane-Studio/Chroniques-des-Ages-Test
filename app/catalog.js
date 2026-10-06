window.LIBRARY_CONFIG={
  studio:'Valsane Studio', collection:'APHANES',
  books:[
    {id:'livre01',folder:'Livre01-La-Grotte-de-Valombre',order:1,visible:true},
    {id:'livre02',folder:'Livre02-Le-Secret-du-Providence',order:2,visible:true},
    {id:'livre03',folder:'Livre03-Le-Royaume-des-Disparus',order:3,visible:true}
  ]
};

/* Bibliothèque : toutes les illustrations de livres gardent exactement le même format. */
(function(){
  const style=document.createElement('style');
  style.id='library-book-media-ratio';
  style.textContent=`
    .library-book-media{
      align-self:center !important;
      width:100% !important;
      height:auto !important;
      min-height:0 !important;
      aspect-ratio:4 / 3 !important;
    }
    .library-book-image{
      width:100% !important;
      height:100% !important;
      object-fit:cover !important;
    }
  `;
  document.head.appendChild(style);
})();

/* Bibliothèque : boutons d'accès discrets et transparents, dans l'esprit des choix de route. */
(function(){
  const style=document.createElement('style');
  style.id='library-book-action-transparent';
  style.textContent=`
    .library-book-action{
      background:transparent !important;
      background-image:none !important;
      background-color:transparent !important;
      border:1px solid rgba(112,78,42,.46) !important;
      color:#5b422b !important;
      box-shadow:none !important;
      filter:none !important;
      text-shadow:none !important;
      transition:background-color .16s ease,border-color .16s ease,color .16s ease !important;
    }
    .library-book-action::after{
      border-color:#8c673e !important;
      opacity:.72 !important;
    }
    .library-book-action:hover:not(:disabled),
    .library-book-action:focus-visible:not(:disabled){
      background:rgba(116,82,45,.075) !important;
      border-color:rgba(112,78,42,.72) !important;
      color:#3f2d1e !important;
      filter:none !important;
    }
    .library-book-action:disabled{
      background:transparent !important;
      color:rgba(91,66,43,.58) !important;
      border-color:rgba(112,78,42,.25) !important;
      box-shadow:none !important;
      opacity:.62 !important;
      filter:none !important;
    }
    .library-book-action:disabled::after{
      opacity:.32 !important;
    }
  `;
  document.head.appendChild(style);
})();

/* Bibliothèque : rappeler avant le départ que la progression est sauvegardée localement. */
(function(){
  const install=()=>{
    if(document.getElementById('libraryPreviewSaveNote'))return;
    const action=document.getElementById('libraryPreviewAction');
    if(!action||!action.parentNode)return;

    const note=document.createElement('p');
    note.id='libraryPreviewSaveNote';
    note.className='library-preview-save-note';
    note.innerHTML='<strong>Sauvegarde automatique</strong> — Ta progression est enregistrée dans ce navigateur. Tu peux quitter l’aventure à tout moment et la reprendre plus tard depuis ce même navigateur.';
    action.parentNode.insertBefore(note,action);

    const style=document.createElement('style');
    style.id='library-preview-save-note-style';
    style.textContent=`
      .library-preview-save-note{
        margin:4px 0 12px !important;
        padding:9px 11px !important;
        border-top:1px solid rgba(133,94,52,.24) !important;
        border-bottom:1px solid rgba(133,94,52,.24) !important;
        color:#5e432b !important;
        background:rgba(120,84,45,.035) !important;
        font-family:var(--body-font) !important;
        font-size:13px !important;
        line-height:1.35 !important;
      }
      .library-preview-save-note strong{
        color:#493421 !important;
        font-weight:700 !important;
      }
    `;
    document.head.appendChild(style);
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();

/* Inventaire commun à toute la collection : fermeture toujours accessible. */
(function(){
  const install=()=>{
    if(document.documentElement.dataset.inventoryUxInstalled==='1')return;
    const modal=document.getElementById('modal');
    const closeBtn=document.getElementById('closeModalBtn');
    if(!modal||!closeBtn)return;
    document.documentElement.dataset.inventoryUxInstalled='1';

    const style=document.createElement('style');
    style.id='inventory-modal-ux';
    style.textContent=`
      #modal[data-panel="inventory"] > .modal-card > .drawer-head{
        position:sticky !important;
        top:-18px !important;
        z-index:25 !important;
        margin:-18px -18px 12px !important;
        padding:18px 18px 12px !important;
        background:#eadfbe !important;
        border-bottom:1px solid rgba(97,73,42,.22) !important;
      }
      #modal[data-panel="inventory"] #closeModalBtn{
        position:relative !important;
        z-index:26 !important;
      }
    `;
    document.head.appendChild(style);

    modal.addEventListener('click',event=>{
      if(modal.dataset.panel==='inventory'&&event.target===modal)closeBtn.click();
    });

    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&modal.dataset.panel==='inventory'&&!modal.classList.contains('hidden'))closeBtn.click();
    });
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();

/* Livre 03 : en TEST, afficher la même vignette que la DEV sans rendre le livre ouvrable. */
(function(){
  const imageUrl='https://raw.githubusercontent.com/Valsane-Studio/Chroniques-des-Ages-Dev/main/books/Livre03-Le-Royaume-des-Disparus/Assets/bibliotheque.jpeg';
  const apply=()=>{
    const cards=[...document.querySelectorAll('.library-book')];
    const card=cards.find(c=>c.querySelector('.library-book-title')?.textContent.trim()==='Le Royaume des disparus');
    if(!card)return false;
    const media=card.querySelector('.library-book-media');
    let img=card.querySelector('.library-book-image');
    if(!img){
      img=document.createElement('img');
      img.className='library-book-image';
      media?.appendChild(img);
    }
    img.alt='Présentation — Le Royaume des disparus';
    img.src=imageUrl;
    media?.classList.remove('is-fallback');
    return true;
  };
  if(apply())return;
  const observer=new MutationObserver(()=>{if(apply())observer.disconnect();});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),5000);
})();

/* Lecture : les numéros de pages techniques ne sont plus affichés en bas. */
(function(){
  const style=document.createElement('style');
  style.id='reader-hide-page-numbers';
  style.textContent=`
    #chapterNumber,
    .chapter-number{
      display:none !important;
    }
  `;
  document.head.appendChild(style);
})();
