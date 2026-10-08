/* Livre 02 — correction ciblée de conjugaison après la passe tu → vous. */
(function(){
  'use strict';

  const book=window.BookRegistry?.get?.('providence-02');
  const story=book?.story;
  if(!book||!story)return;

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

  // Pages 69/70 : même scène et mêmes embranchements, mais une page dédiée
  // à chaque choix de commandant.
  if(story.c55&&story.c56&&Array.isArray(book.pageOrder)&&book.pageByNode){
    const BRIGGS_RETURN_NODE='c56Briggs';
    const originalReturn={...story.c56};
    const originalText=story.c56.text;
    const originalOnEnter=story.c56.onEnter;

    const stateForCommander=(s,commander)=>({
      ...s,
      flags:{...(s?.flags||{}),commander}
    });
    const enterAs=(commander,s)=>{
      if(!s.flags||typeof s.flags!=='object')s.flags={};
      s.flags.commander=commander;
      if(typeof originalOnEnter==='function')originalOnEnter(s);
    };

    story.c56={
      ...originalReturn,
      text:typeof originalText==='function'
        ? (s=>originalText(stateForCommander(s,'hale')))
        : originalText,
      onEnter:s=>enterAs('hale',s)
    };

    story[BRIGGS_RETURN_NODE]={
      ...originalReturn,
      text:typeof originalText==='function'
        ? (s=>originalText(stateForCommander(s,'briggs')))
        : originalText,
      onEnter:s=>enterAs('briggs',s)
    };

    const previousChoices=story.c55.choices;
    story.c55.choices=s=>{
      const list=typeof previousChoices==='function'?previousChoices(s):previousChoices;
      const target=s.flags.commander==='briggs'?BRIGGS_RETURN_NODE:'c56';
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

    // Compatibilité des sauvegardes/checkpoints créés avant la séparation 69/70.
    const migrateCommanderReturnNode=s=>{
      if(!s||!s.flags)return false;
      if(s.flags.commander==='briggs'&&s.node==='c56'){
        s.node=BRIGGS_RETURN_NODE;
        return true;
      }
      if(s.flags.commander==='hale'&&s.node===BRIGGS_RETURN_NODE){
        s.node='c56';
        return true;
      }
      return false;
    };

    const previousNormalizeLoaded=typeof book.normalizeLoadedState==='function'
      ? book.normalizeLoadedState.bind(book)
      : null;
    book.normalizeLoadedState=s=>{
      const changed=previousNormalizeLoaded?!!previousNormalizeLoaded(s):false;
      return migrateCommanderReturnNode(s)||changed;
    };

    const previousNormalizeCheckpoint=typeof book.normalizeCheckpoint==='function'
      ? book.normalizeCheckpoint.bind(book)
      : null;
    book.normalizeCheckpoint=s=>{
      const changed=previousNormalizeCheckpoint?!!previousNormalizeCheckpoint(s):false;
      return migrateCommanderReturnNode(s)||changed;
    };
  }
})();
