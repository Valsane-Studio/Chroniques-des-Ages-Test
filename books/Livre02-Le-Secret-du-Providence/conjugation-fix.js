/* Livre 02 — correction ciblée de conjugaison après la passe tu → vous. */
(function(){
  'use strict';

  const book=window.BookRegistry?.get?.('providence-02');
  const story=book?.story;
  if(!story)return;

  const fix=text=>String(text??'')
    .replace(/\baperçoissez\b/g,'apercevez')
    .replace(/\bAperçoissez\b/g,'Apercevez');

  for(const scene of Object.values(story)){
    if(!scene)continue;

    if(typeof scene.text==='function'){
      const previous=scene.text;
      scene.text=s=>fix(previous(s));
    }else if(typeof scene.text==='string'){
      scene.text=fix(scene.text);
    }

    if(Array.isArray(scene.choices)){
      scene.choices=scene.choices.map(choice=>choice&&typeof choice==='object'
        ? {...choice,label:fix(choice.label)}
        : choice);
    }else if(typeof scene.choices==='function'){
      const previousChoices=scene.choices;
      scene.choices=s=>{
        const list=previousChoices(s);
        return Array.isArray(list)
          ? list.map(choice=>choice&&typeof choice==='object'
              ? {...choice,label:fix(choice.label)}
              : choice)
          : list;
      };
    }
  }

  // Page 67 : alléger le retour vers la plage.
  if(story.c54){
    const patch=html=>String(html??'')
      .replace('<p>Le trajet jusqu’à la plage se fait dans un silence pesant.</p>','')
      .replace('<p>Un.</p><p>Deux.</p><p>Trois.</p>','');
    const previous=story.c54.text;
    story.c54.text=typeof previous==='function'?(s=>patch(previous(s))):patch(previous);
  }

  // Pages 69/70 : même scène, même texte et mêmes embranchements,
  // mais un numéro de page distinct selon la personne désignée pour commander.
  if(story.c55&&story.c56&&Array.isArray(book.pageOrder)&&book.pageByNode){
    const BRIGGS_RETURN_NODE='c56Briggs';

    if(!story[BRIGGS_RETURN_NODE]){
      story[BRIGGS_RETURN_NODE]={...story.c56};
    }

    const previousChoices=story.c55.choices;
    story.c55.choices=s=>{
      const list=typeof previousChoices==='function'?previousChoices(s):previousChoices;
      const target=s.flags.commander==='hale'?'c56':BRIGGS_RETURN_NODE;
      return Array.isArray(list)
        ? list.map(choice=>choice&&typeof choice==='object'&&choice.to==='c56'
            ? {...choice,to:target}
            : choice)
        : list;
    };

    if(!book.pageOrder.includes(BRIGGS_RETURN_NODE)){
      const haleIndex=book.pageOrder.indexOf('c56');
      if(haleIndex>=0)book.pageOrder.splice(haleIndex+1,0,BRIGGS_RETURN_NODE);
    }

    for(const key of Object.keys(book.pageByNode))delete book.pageByNode[key];
    book.pageOrder.forEach((id,index)=>{book.pageByNode[id]=index;});
  }
})();
