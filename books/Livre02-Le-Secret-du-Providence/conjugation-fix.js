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

  // Page 67 : supprimer le décompte « Un. Deux. Trois. » après les lumières bleues.
  if(story.c54){
    const removeCount=html=>String(html??'').replace('<p>Un.</p><p>Deux.</p><p>Trois.</p>','');
    const previous=story.c54.text;
    story.c54.text=typeof previous==='function'?(s=>removeCount(previous(s))):removeCount(previous);
  }
})();
