(function(){
'use strict';

const SESSION_KEY='aphanes.test.dashboard.session.v1';
const detailContent=document.getElementById('detailContent');
const detailBackdrop=document.getElementById('detailBackdrop');
const refreshBtn=document.getElementById('refreshBtn');
let configPromise=null;

if(!detailContent||!detailBackdrop)return;

function readSession(){
  try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null');}catch(e){return null;}
}

async function getConfig(){
  if(configPromise)return configPromise;
  configPromise=(async()=>{
    const source=await fetch('./app.js',{cache:'no-store'}).then(r=>{
      if(!r.ok)throw new Error('Configuration du dashboard inaccessible.');
      return r.text();
    });
    const url=source.match(/const SUPABASE_URL='([^']+)'/)?.[1];
    const key=source.match(/const SUPABASE_KEY='([^']+)'/)?.[1];
    if(!url||!key)throw new Error('Configuration Supabase introuvable.');
    return{url,key};
  })();
  return configPromise;
}

async function refreshSession(session,config){
  if(!session?.refresh_token)return session;
  const r=await fetch(`${config.url}/auth/v1/token?grant_type=refresh_token`,{
    method:'POST',
    headers:{apikey:config.key,'Content-Type':'application/json'},
    body:JSON.stringify({refresh_token:session.refresh_token})
  });
  const data=await r.json().catch(()=>null);
  if(!r.ok||!data?.access_token)throw new Error(data?.message||data?.msg||'Session expirée.');
  localStorage.setItem(SESSION_KEY,JSON.stringify(data));
  return data;
}

function extractRunId(){
  const paragraphs=[...detailContent.querySelectorAll('.detail-section p')];
  const line=paragraphs.find(p=>p.textContent.trim().startsWith('ID :'));
  return line?line.textContent.replace(/^ID\s*:\s*/,'').trim():'';
}

async function deleteRun(runId){
  const config=await getConfig();
  let session=readSession();
  if(!session?.access_token)throw new Error('Session administrateur introuvable.');
  if(session.expires_at&&Date.now()/1000>Number(session.expires_at)-60){
    session=await refreshSession(session,config);
  }

  const url=`${config.url}/rest/v1/test_parties?id=eq.${encodeURIComponent(runId)}`;
  const request=()=>fetch(url,{
    method:'DELETE',
    headers:{apikey:config.key,Authorization:`Bearer ${session.access_token}`,Prefer:'return=representation'},
    cache:'no-store'
  });

  let r=await request();
  if(r.status===401&&session?.refresh_token){
    session=await refreshSession(session,config);
    r=await request();
  }
  const data=await r.json().catch(()=>null);
  if(!r.ok)throw new Error(data?.message||data?.hint||`Erreur Supabase ${r.status}`);
  if(!Array.isArray(data)||!data.length)throw new Error('La partie n’a pas été supprimée.');
}

function addDeleteButton(){
  if(detailContent.querySelector('.delete-run-zone'))return;
  const runId=extractRunId();
  if(!runId)return;

  const zone=document.createElement('section');
  zone.className='detail-section delete-run-zone';
  zone.innerHTML=`
    <h3>Gestion de cette partie</h3>
    <p class="delete-run-help">Pour tes essais techniques : cette partie peut être supprimée définitivement afin qu’elle ne soit plus comptée dans les statistiques.</p>
    <button type="button" class="delete-run-btn">Supprimer cette partie</button>
    <p class="delete-run-status" aria-live="polite"></p>
  `;

  const button=zone.querySelector('.delete-run-btn');
  const status=zone.querySelector('.delete-run-status');
  button.addEventListener('click',async()=>{
    const ok=window.confirm('Supprimer définitivement cette partie de test ?\n\nSon questionnaire associé sera également supprimé et elle ne sera plus comptée dans les statistiques.');
    if(!ok)return;
    button.disabled=true;
    status.textContent='Suppression…';
    try{
      await deleteRun(runId);
      detailBackdrop.classList.add('hidden');
      detailBackdrop.setAttribute('aria-hidden','true');
      refreshBtn?.click();
    }catch(error){
      console.error(error);
      status.textContent='Erreur : '+error.message;
      button.disabled=false;
    }
  });
  detailContent.appendChild(zone);
}

new MutationObserver(addDeleteButton).observe(detailContent,{childList:true,subtree:false});

const style=document.createElement('style');
style.textContent=`
.delete-run-zone{border-top:1px solid rgba(165,84,72,.45);margin-top:24px;padding-top:18px}
.delete-run-help{color:#6d5b51;font-size:.95rem;line-height:1.45}
.delete-run-btn{border:1px solid #8f3f38;background:#6d2d29;color:#fff1e6;padding:10px 14px;border-radius:7px;font:inherit;cursor:pointer}
.delete-run-btn:hover{background:#7f3530}.delete-run-btn:disabled{opacity:.6;cursor:wait}
.delete-run-status{min-height:1.3em;margin:.55rem 0 0;color:#7b302b;font-size:.92rem}
`;
document.head.appendChild(style);
})();
