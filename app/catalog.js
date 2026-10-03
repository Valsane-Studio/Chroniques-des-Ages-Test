window.LIBRARY_CONFIG={
  studio:'Valsane Studio', collection:'APHANES',
  books:[
    {id:'livre01',folder:'Livre01-La-Grotte-de-Valombre',order:1,visible:true},
    {id:'livre02',folder:'Livre02-Le-Secret-du-Providence',order:2,visible:true}
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
