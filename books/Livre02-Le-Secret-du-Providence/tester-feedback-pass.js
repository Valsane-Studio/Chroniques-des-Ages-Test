/* Livre 02 — passe de finition suite aux retours testeurs (06/10/2026).
   - vouvoiement narratif cohérent
   - cohérence du pont du Providence
   - sortie en bateau adaptée si le héros est seul
   - phrase de la grotte réécrite sans tirets longs
   - résultats de l'assaut en modal + rappel des règles fiable sur mobile
   - suppression du "0 homme pâle capable de se battre"
*/
(function(){
  'use strict';

  const book=window.BookRegistry?.get?.('providence-02');
  const story=book?.story;
  if(!book||!story)return;

  const IRREGULAR={
    es:'êtes',as:'avez',vas:'allez',fais:'faites',peux:'pouvez',veux:'voulez',sais:'savez',dois:'devez',
    prends:'prenez',reprends:'reprenez',comprends:'comprenez',apprends:'apprenez',surprends:'surprenez',
    viens:'venez',reviens:'revenez',deviens:'devenez',tiens:'tenez',obtiens:'obtenez',
    vois:'voyez',revois:'revoyez',crois:'croyez',bois:'buvez',lis:'lisez',dis:'dites',redis:'redites',
    écris:'écrivez',mets:'mettez',remets:'remettez',permets:'permettez',promets:'promettez',
    pars:'partez',repars:'repartez',sors:'sortez',dors:'dormez',cours:'courez',meurs:'mourez',vis:'vivez',
    suis:'suivez',connais:'connaissez',reconnais:'reconnaissez',sens:'sentez',ressens:'ressentez',
    entends:'entendez',attends:'attendez',descends:'descendez',réponds:'répondez',perds:'perdez',rends:'rendez',
    tends:'tendez',défends:'défendez',crains:'craignez',rejoins:'rejoignez',atteins:'atteignez',éteins:'éteignez',
    ouvres:'ouvrez',rouvres:'rouvrez',découvres:'découvrez',offres:'offrez',souffres:'souffrez',cueilles:'cueillez',
    accueilles:'accueillez',conduis:'conduisez',produis:'produisez',traduis:'traduisez',fuis:'fuyez',ris:'riez',
    souris:'souriez',conclus:'concluez',résous:'résolvez',bats:'battez',combats:'combattez',romps:'rompez',
    vaincs:'vainquez',convaincs:'convainquez',assieds:'asseyez',essaies:'essayez',essayes:'essayez',
    préfères:'préférez',espères:'espérez',lèves:'levez',relèves:'relevez',mènes:'menez',emmènes:'emmenez',
    ramènes:'ramenez',achètes:'achetez',répètes:'répétez',cèdes:'cédez',pèses:'pesez',gèles:'gelez',
    appelles:'appelez',rappelles:'rappelez',jettes:'jetez',projettes:'projetez',ouvres:'ouvrez'
  };

  function matchCase(source,target){
    return source&&source[0]===source[0].toUpperCase()?target.charAt(0).toUpperCase()+target.slice(1):target;
  }

  function conjugateVous(word){
    const lower=word.toLowerCase();
    if(IRREGULAR[lower])return matchCase(word,IRREGULAR[lower]);
    if(lower.endsWith('is'))return matchCase(word,lower.slice(0,-2)+'issez');
    if(lower.endsWith('es'))return matchCase(word,lower.slice(0,-2)+'ez');
    return word;
  }

  function convertNarrativeText(text){
    let s=String(text||'');

    s=s.replace(/\b(Tu|tu)\s+n[’']([A-Za-zÀ-ÖØ-öø-ÿ-]+)/g,(m,tu,v)=>matchCase(tu,'vous')+' n’'+conjugateVous(v));
    s=s.replace(/\b(Tu|tu)\s+ne\s+t[’']([A-Za-zÀ-ÖØ-öø-ÿ-]+)/g,(m,tu,v)=>matchCase(tu,'vous')+' ne vous '+conjugateVous(v));
    s=s.replace(/\b(Tu|tu)\s+ne\s+te\s+([A-Za-zÀ-ÖØ-öø-ÿ-]+)/g,(m,tu,v)=>matchCase(tu,'vous')+' ne vous '+conjugateVous(v));
    s=s.replace(/\b(Tu|tu)\s+ne\s+(le|la|les|y|en)\s+([A-Za-zÀ-ÖØ-öø-ÿ-]+)/g,(m,tu,p,v)=>matchCase(tu,'vous')+' ne '+p+' '+conjugateVous(v));
    s=s.replace(/\b(Tu|tu)\s+ne\s+([A-Za-zÀ-ÖØ-öø-ÿ-]+)/g,(m,tu,v)=>matchCase(tu,'vous')+' ne '+conjugateVous(v));
    s=s.replace(/\b(Tu|tu)\s+t[’']([A-Za-zÀ-ÖØ-öø-ÿ-]+)/g,(m,tu,v)=>matchCase(tu,'vous')+' vous '+conjugateVous(v));
    s=s.replace(/\b(Tu|tu)\s+te\s+([A-Za-zÀ-ÖØ-öø-ÿ-]+)/g,(m,tu,v)=>matchCase(tu,'vous')+' vous '+conjugateVous(v));
    s=s.replace(/\b(Tu|tu)\s+(le|la|les|y|en)\s+([A-Za-zÀ-ÖØ-öø-ÿ-]+)/g,(m,tu,p,v)=>matchCase(tu,'vous')+' '+p+' '+conjugateVous(v));
    s=s.replace(/\b(Tu|tu)\s+l[’']([A-Za-zÀ-ÖØ-öø-ÿ-]+)/g,(m,tu,v)=>matchCase(tu,'vous')+' l’'+conjugateVous(v));
    s=s.replace(/\b(Tu|tu)\s+([A-Za-zÀ-ÖØ-öø-ÿ-]+)/g,(m,tu,v)=>matchCase(tu,'vous')+' '+conjugateVous(v));

    s=s.replace(/\b[Tt]oi\b/g,m=>m[0]==='T'?'Vous':'vous');
    s=s.replace(/\b[Tt]on\b/g,m=>m[0]==='T'?'Votre':'votre');
    s=s.replace(/\b[Tt]a\b/g,m=>m[0]==='T'?'Votre':'votre');
    s=s.replace(/\b[Tt]es\b/g,m=>m[0]==='T'?'Vos':'vos');
    s=s.replace(/\b[Tt]e\b/g,m=>m[0]==='T'?'Vous':'vous');
    s=s.replace(/\b[Tt][’'](?=[A-Za-zÀ-ÖØ-öø-ÿ])/g,m=>m[0]==='T'?'Vous ':'vous ');
    return s;
  }

  function toVousHtml(html){
    const t=document.createElement('template');
    t.innerHTML=String(html||'');
    const walker=document.createTreeWalker(t.content,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{
      if(node.parentElement?.closest('blockquote'))return;
      node.nodeValue=convertNarrativeText(node.nodeValue);
    });
    return t.innerHTML;
  }

  function toVousPlain(text){return convertNarrativeText(String(text||''));}

  if(story.c28){
    const old=story.c28.text;
    const patch=html=>String(html||'')
      .replace('<p>Une chope repose près du grand mât.</p><p>Un morceau de pain durci est encore posé sur une caisse.</p>',
        '<p>Une chope a roulé jusqu’au pied du grand mât et s’est coincée contre un taquet.</p><p>Un morceau de pain durci est tombé au sol, bloqué contre le pied d’une caisse.</p>');
    story.c28.text=typeof old==='function'?(s=>patch(old(s))):patch(old);
  }

  if(story.deepCaveEscapeEnding){
    const old=story.deepCaveEscapeEnding.text;
    story.deepCaveEscapeEnding.text=s=>{
      let html=String(typeof old==='function'?old(s):old||'');
      const solo=html.includes('<p>Tu descends jusqu’au bateau et largues les amarres.</p>');
      if(solo)html=html.replace('<p>Pendant quelques minutes, personne ne parle.</p>','<p>Pendant quelques minutes, vous ne quittez pas l’île des yeux.</p>');
      return html;
    };
  }

  for(const scene of Object.values(story)){
    if(!scene)continue;
    const patchText=html=>String(html||'')
      .replace('Quelque chose dans cette partie de la grotte semble les empêcher — ou les effrayer — d’aller plus loin.',
        'Quelque chose dans cette partie de la grotte semble les retenir. Peut-être ont-ils simplement peur d’aller plus loin.')
      .replace(/<p>Tu comptes <strong>0<\/strong> hommes pâles capables de se battre\.<\/p>/g,
        '<p><strong>Le dernier homme pâle capable de combattre vient de tomber. La résistance du village s’effondre.</strong></p>')
      .replace(/<p>Il en reste <strong>0<\/strong> au début de l’assaut\.<\/p>/g,
        '<p><strong>Aucun homme pâle n’est encore en état de combattre. La résistance du village s’effondre.</strong></p>');
    if(typeof scene.text==='function'){
      const previous=scene.text;
      scene.text=s=>patchText(previous(s));
    }else if(typeof scene.text==='string')scene.text=patchText(scene.text);
  }

  for(const scene of Object.values(story)){
    if(!scene)continue;
    if(typeof scene.text==='function'){
      const previous=scene.text;
      scene.text=s=>toVousHtml(previous(s));
    }else if(typeof scene.text==='string')scene.text=toVousHtml(scene.text);

    if(Array.isArray(scene.choices)){
      scene.choices=scene.choices.map(c=>c&&typeof c==='object'?{...c,label:toVousPlain(c.label)}:c);
    }else if(typeof scene.choices==='function'){
      const previousChoices=scene.choices;
      scene.choices=s=>{
        const list=previousChoices(s);
        return Array.isArray(list)?list.map(c=>c&&typeof c==='object'?{...c,label:toVousPlain(c.label)}:c):list;
      };
    }
  }

  if(book.inventory&&typeof book.inventory.extraHtml==='function'){
    const previousExtra=book.inventory.extraHtml.bind(book.inventory);
    book.inventory.extraHtml=s=>toVousHtml(previousExtra(s));
  }
  if(book.storyModals?.['village-assault-rules']){
    const def=book.storyModals['village-assault-rules'];
    const previous=def.html;
    def.html=s=>toVousHtml(typeof previous==='function'?previous(s):previous||'');
  }

  let modalBackdrop=null,modalBox=null,modalTitle=null,modalBody=null,lastBattleSignature='',awaitingBattleResult=false;

  function ensureFeedbackModal(){
    if(modalBackdrop)return;
    modalBackdrop=document.createElement('div');
    modalBackdrop.className='providence-feedback-modal-backdrop hidden';
    modalBackdrop.innerHTML=`<section class="providence-feedback-modal" role="dialog" aria-modal="true" aria-labelledby="providenceFeedbackModalTitle">
      <button type="button" class="providence-feedback-modal-close" aria-label="Fermer">×</button>
      <h3 id="providenceFeedbackModalTitle"></h3>
      <div class="providence-feedback-modal-body"></div>
      <button type="button" class="providence-feedback-modal-ok">Continuer</button>
    </section>`;
    document.body.appendChild(modalBackdrop);
    modalBox=modalBackdrop.querySelector('.providence-feedback-modal');
    modalTitle=modalBackdrop.querySelector('h3');
    modalBody=modalBackdrop.querySelector('.providence-feedback-modal-body');
    const close=()=>modalBackdrop.classList.add('hidden');
    modalBackdrop.querySelector('.providence-feedback-modal-close').addEventListener('click',close);
    modalBackdrop.querySelector('.providence-feedback-modal-ok').addEventListener('click',close);
    modalBackdrop.addEventListener('click',e=>{if(e.target===modalBackdrop)close();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modalBackdrop.classList.contains('hidden'))close();});
  }

  function openFeedbackModal(title,html){
    ensureFeedbackModal();
    modalTitle.textContent=title;
    modalBody.innerHTML=html;
    modalBackdrop.classList.remove('hidden');
    requestAnimationFrame(()=>modalBox?.querySelector('button')?.focus?.());
  }

  document.addEventListener('click',e=>{
    const reminder=e.target.closest?.('.combat-rules-reminder[data-story-modal="village-assault-rules"]');
    if(reminder){
      e.preventDefault();e.stopImmediatePropagation();
      const def=book.storyModals?.['village-assault-rules'];
      const html=typeof def?.html==='function'?def.html({}):def?.html;
      openFeedbackModal('Règles du combat',String(html||''));
      return;
    }
    const choice=e.target.closest?.('#choices .choice-btn');
    if(choice&&document.getElementById('chapterTitle')?.textContent?.trim()==='Donner l’assaut')awaitingBattleResult=true;
  },true);

  function checkBattleResult(){
    if(!awaitingBattleResult)return;
    const result=document.querySelector('#storyText .crew-battle-result');
    if(!result)return;
    const signature=(result.textContent||'').replace(/\s+/g,' ').trim();
    if(!signature||signature===lastBattleSignature)return;
    lastBattleSignature=signature;awaitingBattleResult=false;
    openFeedbackModal('Résultat de l’assaut',result.outerHTML);
  }

  const storyRoot=document.getElementById('storyText');
  if(storyRoot){
    const observer=new MutationObserver(()=>requestAnimationFrame(checkBattleResult));
    observer.observe(storyRoot,{childList:true,subtree:true,characterData:true});
  }

  const style=document.createElement('style');
  style.id='providence-tester-feedback-pass-style';
  style.textContent=`
    .providence-feedback-modal-backdrop{position:fixed;inset:0;z-index:10050;display:grid;place-items:center;padding:18px;background:rgba(15,12,9,.64);backdrop-filter:blur(2px)}
    .providence-feedback-modal-backdrop.hidden{display:none!important}
    .providence-feedback-modal{position:relative;width:min(620px,100%);max-height:min(84vh,760px);overflow:auto;padding:24px 22px 20px;background:var(--ui-parchment-texture) center/cover,#e6d4af;color:#2c2116;border:1px solid rgba(77,56,35,.72);box-shadow:0 18px 55px rgba(0,0,0,.38)}
    .providence-feedback-modal h3{margin:0 40px 16px 0;font-size:1.35rem}
    .providence-feedback-modal-body{line-height:1.5}
    .providence-feedback-modal-close{position:absolute;right:10px;top:7px;width:38px;height:38px;border:0;background:transparent;color:#3a2b1d;font-size:2rem;line-height:1;cursor:pointer}
    .providence-feedback-modal-ok{width:100%;min-height:46px;margin-top:18px;padding:10px 14px;border:1px solid rgba(58,46,32,.72);border-radius:3px;background:transparent;color:#2b2117;font:inherit;font-weight:700;cursor:pointer}
    .providence-feedback-modal .crew-battle-result{margin:0!important}
    @media(max-width:700px){.providence-feedback-modal-backdrop{padding:10px}.providence-feedback-modal{max-height:88vh;padding:21px 16px 16px}.providence-feedback-modal h3{font-size:1.2rem}}
  `;
  document.head.appendChild(style);
})();