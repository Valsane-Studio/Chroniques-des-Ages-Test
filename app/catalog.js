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
