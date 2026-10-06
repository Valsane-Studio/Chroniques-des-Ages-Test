/* Dashboard TEST — affiche la chronologie détaillée des soldats du Livre 02. */
(function(){
  'use strict';

  const SUPABASE_URL='https://tlgbzpenhuooabcyrmvf.supabase.co';
  const SUPABASE_KEY='sb_publishable_wb7-3q3UEsRfUU5xaWSbLA_MxQWVvaT';
  const SESSION_KEY='aphanes.test.dashboard.session.v1';
  const detail=document.getElementById('detailContent');
  if(!detail)return;

  const style=document.createElement('style');
  style.textContent=`
    .soldier-event-list{display:grid;gap:8px;margin-top:10px}
    .soldier-event{border:1px solid rgba(139,103,62,.28);background:rgba(139,103,62,.055);padding:10px 12px;border-radius:8px}
    .soldier-event-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    .soldier-event-page{font-weight:800;min-width:52px}
    .soldier-event-kind{font-weight:800}
    .soldier-event-kind.death{color:#b54f48}
    .soldier-event-kind.capture{color:#9a6a39}
    .soldier-event-kind.recovery,.soldier-event-kind.reinforcement{color:#5c7a56}
    .soldier-event-detail{margin:5px 0 0;color:rgba(232,220,197,.72);font-size:.92rem}
    .soldier-event-empty{opacity:.72}
  `;
  document.head.appendChild(style);

  function session(){
    try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null');}catch(e){return null;}
  }
  function esc(value){
    return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function extractId(){
    const text=detail.textContent||'';
    const hit=text.match(/ID\s*:\s*([0-9a-f]{8}-[0-9a-f-]{27,})/i);
    return hit?hit[1]:null;
  }
  function isProvidence(){return /Le Secret du Providence|Livre 02/i.test(detail.textContent||'');}
  function kindLabel(event){
    const count=Math.max(0,Number(event?.count)||0);
    switch(event?.type){
      case'death':return{cls:'death',text:`−${count} soldat${count>1?'s':''}`};
      case'capture':return{cls:'capture',text:`${count} soldat${count>1?'s':''} capturé${count>1?'s':''}`};
      case'recovery':return{cls:'recovery',text:`+${count} soldat${count>1?'s':''} libéré${count>1?'s':''}`};
      case'reinforcement':return{cls:'reinforcement',text:count>1?`+${count} soldats rejoignent le groupe`:`+${count} soldat rejoint le groupe`};
      case'deployment':return{cls:'deployment',text:count>1?`${count} soldats avec vous`:`${count} soldat avec vous`};
      case'command':return{cls:'command',text:'Choix de commandement'};
      case'left_behind':return{cls:'capture',text:`${count} soldat${count>1?'s':''} laissé${count>1?'s':''} prisonnier${count>1?'s':''}`};
      default:return{cls:'',text:'Événement'};
    }
  }
  function eventHtml(event){
    const kind=kindLabel(event);
    const page=Number.isInteger(event?.page)?`p. ${String(event.page).padStart(3,'0')}`:'page —';
    const remaining=Number.isFinite(Number(event?.soldiers))?`Soldats actifs après l’événement : ${Number(event.soldiers)}`:'';
    const detailLine=[event?.detail,remaining,event?.node?`nœud ${event.node}`:''].filter(Boolean).join(' · ');
    return `<div class="soldier-event">
      <div class="soldier-event-head"><span class="soldier-event-page">${esc(page)}</span><span class="soldier-event-kind ${esc(kind.cls)}">${esc(kind.text)}</span><strong>${esc(event?.label||'')}</strong></div>
      ${detailLine?`<p class="soldier-event-detail">${esc(detailLine)}</p>`:''}
    </div>`;
  }

  async function loadEvents(id){
    const s=session();
    if(!s?.access_token)return null;
    const url=`${SUPABASE_URL}/rest/v1/test_parties?id=eq.${encodeURIComponent(id)}&select=parcours`;
    const r=await fetch(url,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${s.access_token}`},cache:'no-store'});
    if(!r.ok)return null;
    const rows=await r.json().catch(()=>[]);
    return Array.isArray(rows?.[0]?.parcours?.soldier_events)?rows[0].parcours.soldier_events:[];
  }

  async function enhance(){
    if(!isProvidence()||detail.querySelector('[data-soldier-events]'))return;
    const id=extractId();
    if(!id)return;

    const section=document.createElement('section');
    section.className='detail-section';
    section.dataset.soldierEvents='loading';
    section.innerHTML='<h3>Suivi des soldats</h3><p class="soldier-event-empty">Chargement…</p>';
    const technique=[...detail.querySelectorAll('.detail-section')].find(x=>/^Technique$/i.test(x.querySelector('h3')?.textContent||''));
    if(technique)detail.insertBefore(section,technique);else detail.appendChild(section);

    const list=await loadEvents(id).catch(()=>null);
    if(!section.isConnected)return;
    section.dataset.soldierEvents='ready';
    if(list===null){
      section.innerHTML='<h3>Suivi des soldats</h3><p class="soldier-event-empty">Impossible de charger le détail pour le moment.</p>';
      return;
    }
    if(!list.length){
      section.innerHTML='<h3>Suivi des soldats</h3><p class="soldier-event-empty">Cette partie a été enregistrée avant l’activation du suivi détaillé des soldats.</p>';
      return;
    }
    const ordered=[...list].sort((a,b)=>(Number(a?.order)||0)-(Number(b?.order)||0));
    section.innerHTML=`<h3>Suivi des soldats</h3><div class="soldier-event-list">${ordered.map(eventHtml).join('')}</div>`;
  }

  let timer=null;
  new MutationObserver(()=>{
    clearTimeout(timer);
    timer=setTimeout(enhance,20);
  }).observe(detail,{childList:true,subtree:true});
})();
