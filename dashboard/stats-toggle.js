(function(){
'use strict';

const SESSION_KEY='aphanes.test.dashboard.session.v1';
const TERMINAL_LABELS={
  c21:'Asphyxie dans le passage au soufre',
  c23:'Fuite de la grotte / fin brisée',
  c215:'Effondrement après l’explosion',
  c216:'Arme brisée au contact de la sphère',
  c217:'Assassinat à Valombre',
  c218:'Fin de l’aventure — Valombre',
  c219:'Transformation par la terre noire',
  c221:'Arme brisée au contact de la sphère',
  c225:'Chute dans le gouffre',
  c236:'Chute au fond du gouffre'
};

const bookSummaries=document.getElementById('bookSummaries');
const runsBody=document.getElementById('runsBody');
const mobileRuns=document.getElementById('mobileRuns');
const detailContent=document.getElementById('detailContent');
const bookFilter=document.getElementById('bookFilter');
const resultFilter=document.getElementById('resultFilter');
const searchInput=document.getElementById('searchInput');
const refreshBtn=document.getElementById('refreshBtn');

if(!bookSummaries||!runsBody||!mobileRuns||!detailContent)return;

let rows=[];
let configPromise=null;
let refreshPromise=null;
let refreshQueued=false;

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

async function authenticatedFetch(path,options={},retry=true){
  const config=await getConfig();
  let session=readSession();
  if(!session?.access_token)throw new Error('Session administrateur introuvable.');
  if(session.expires_at&&Date.now()/1000>Number(session.expires_at)-60){
    session=await refreshSession(session,config);
  }

  const doFetch=()=>fetch(`${config.url}/rest/v1/${path}`,{
    ...options,
    headers:{
      apikey:config.key,
      Authorization:`Bearer ${session.access_token}`,
      ...(options.headers||{})
    },
    cache:'no-store'
  });

  let r=await doFetch();
  if(r.status===401&&retry&&session?.refresh_token){
    session=await refreshSession(session,config);
    r=await doFetch();
  }
  if(!r.ok){
    const data=await r.json().catch(()=>null);
    throw new Error(data?.message||data?.hint||`Erreur Supabase ${r.status}`);
  }
  return r;
}

function bookMeta(run){
  const title=String(run?.livre||'').trim();
  if(/Providence/i.test(title))return{key:'livre02'};
  return{key:'livre01'};
}
function lastNode(run){
  const nodes=Array.isArray(run?.parcours?.nodes)?run.parcours.nodes:[];
  return nodes.length?nodes[nodes.length-1]:null;
}
function finalLabel(run){
  const node=lastNode(run);
  if(node&&TERMINAL_LABELS[node])return TERMINAL_LABELS[node];
  if(run.page_finale!=null)return `Page ${run.page_finale}`;
  return node||'—';
}
function fmtDuration(seconds){
  const s=Math.max(0,Number(seconds)||0);
  const h=Math.floor(s/3600);
  const m=Math.floor((s%3600)/60);
  if(h)return `${h} h ${String(m).padStart(2,'0')}`;
  return `${m} min`;
}
function avg(values){
  const nums=values.map(Number).filter(Number.isFinite);
  if(!nums.length)return null;
  return nums.reduce((a,b)=>a+b,0)/nums.length;
}
function avgLabel(values,suffix=''){
  const a=avg(values);
  return a===null?'—':`${a.toFixed(1).replace('.',',')}${suffix}`;
}

async function refreshRows(){
  if(refreshPromise)return refreshPromise;
  refreshPromise=(async()=>{
    const [partiesResponse,questionnairesResponse]=await Promise.all([
      authenticatedFetch('test_parties?select=*&order=created_at.desc'),
      authenticatedFetch('test_questionnaires?select=*&order=created_at.desc')
    ]);
    const [parties,questionnaires]=await Promise.all([
      partiesResponse.json(),questionnairesResponse.json()
    ]);
    const byParty=new Map((questionnaires||[]).map(q=>[q.partie_id,q]));
    rows=(parties||[]).map(p=>{
      const joined={...p,questionnaire:byParty.get(p.id)||null};
      const node=lastNode(joined);
      if(node==='c215'||node==='c217')joined.resultat='fin_histoire';
      return joined;
    });
    applyAll();
  })().catch(error=>console.error('Stats inclusion:',error)).finally(()=>{refreshPromise=null;});
  return refreshPromise;
}

function metricsFor(bookKey){
  const bookRows=rows.filter(r=>bookMeta(r).key===bookKey&&r.incluse_stats!==false);
  const qs=bookRows.map(r=>r.questionnaire).filter(Boolean);
  return{
    runs:bookRows.length,
    ends:bookRows.filter(r=>r.resultat==='fin_histoire').length,
    deaths:bookRows.filter(r=>r.resultat==='mort_combat'||r.resultat==='mort_subite').length,
    transforms:bookRows.filter(r=>r.resultat==='transformation_terre_noire').length,
    duration:bookRows.length?fmtDuration(avg(bookRows.map(r=>r.duree_secondes))):'—',
    difficulty:avgLabel(qs.map(q=>q.difficulte),' / 9'),
    comprehension:avgLabel(qs.map(q=>q.comprehension),' / 9'),
    replay:avgLabel(qs.map(q=>q.envie_rejouer),' / 9')
  };
}

function applyMetrics(){
  const definitions={
    livre01:metricsFor('livre01'),
    livre02:metricsFor('livre02')
  };
  Object.entries(definitions).forEach(([key,m])=>{
    const section=bookSummaries.querySelector(`.book-summary.${key}`);
    if(!section)return;
    const values={
      'Parties terminées':m.runs,
      'Fins de l’histoire':m.ends,
      'Morts':m.deaths,
      'Transformations':m.transforms,
      'Durée moyenne':m.duration,
      'Difficulté moyenne':m.difficulty,
      'Compréhension':m.comprehension,
      'Envie de rejouer':m.replay
    };
    section.querySelectorAll('.metric-card').forEach(card=>{
      const label=card.querySelector('span')?.textContent?.trim();
      const strong=card.querySelector('strong');
      if(strong&&Object.prototype.hasOwnProperty.call(values,label))strong.textContent=values[label];
    });
  });
}

function filteredRows(){
  const book=bookFilter?.value||'all';
  const result=resultFilter?.value||'all';
  const search=(searchInput?.value||'').trim().toLowerCase();
  return rows.filter(r=>{
    if(book!=='all'&&bookMeta(r).key!==book)return false;
    if(result!=='all'&&r.resultat!==result)return false;
    if(!search)return true;
    const q=r.questionnaire||{};
    const b=bookMeta(r).key==='livre02'
      ?{number:'Livre 02',title:'Le Secret du Providence'}
      :{number:'Livre 01',title:'La Grotte de Valombre'};
    const hay=[
      b.number,b.title,r.livre,r.resultat,finalLabel(r),r.page_finale,r.arme,r.protection,
      q.commentaire,lastNode(r),JSON.stringify(r.inventaire||{})
    ].join(' ').toLowerCase();
    return hay.includes(search);
  });
}

function makeToggle(run,compact=false){
  const label=document.createElement('label');
  label.className=compact?'stats-toggle stats-toggle-compact':'stats-toggle';
  label.title='Coché : cette partie compte dans les statistiques';

  const input=document.createElement('input');
  input.type='checkbox';
  input.checked=run.incluse_stats!==false;
  input.dataset.statsRunId=run.id;
  input.setAttribute('aria-label','Comptabiliser cette partie dans les statistiques');

  const text=document.createElement('span');
  text.textContent=compact?'Stats':'Compter dans les statistiques';

  label.append(input,text);
  label.addEventListener('click',event=>event.stopPropagation());
  input.addEventListener('change',event=>{
    event.stopPropagation();
    setIncluded(run,event.currentTarget.checked,event.currentTarget);
  });
  return label;
}

function addHeader(){
  const header=document.querySelector('.runs-table thead tr');
  if(!header||header.querySelector('.stats-head'))return;
  const th=document.createElement('th');
  th.className='stats-head';
  th.textContent='Stats';
  th.title='Décoche une partie pour la conserver dans le suivi sans la compter dans les statistiques.';
  header.insertBefore(th,header.children[1]||null);
}

function applyRowControls(){
  addHeader();
  const visible=filteredRows();
  [...runsBody.children].forEach((tr,index)=>{
    const run=visible[index];
    if(!run)return;
    tr.dataset.statsRowId=run.id;
    tr.classList.toggle('stats-excluded',run.incluse_stats===false);
    if(!tr.querySelector('.stats-toggle-cell')){
      const td=document.createElement('td');
      td.className='stats-toggle-cell';
      td.appendChild(makeToggle(run,true));
      tr.insertBefore(td,tr.children[1]||null);
    }
  });

  [...mobileRuns.children].forEach((card,index)=>{
    const run=visible[index];
    if(!run)return;
    card.dataset.statsRowId=run.id;
    card.classList.toggle('stats-excluded',run.incluse_stats===false);
    if(!card.querySelector('.stats-mobile-toggle')){
      const wrap=document.createElement('div');
      wrap.className='stats-mobile-toggle';
      wrap.appendChild(makeToggle(run,false));
      const meta=card.querySelector('.mobile-run-meta');
      if(meta)card.insertBefore(wrap,meta);
      else card.appendChild(wrap);
    }
  });
}

function detailRunId(){
  const paragraphs=[...detailContent.querySelectorAll('.detail-section p')];
  const line=paragraphs.find(p=>p.textContent.trim().startsWith('ID :'));
  return line?line.textContent.replace(/^ID\s*:\s*/,'').trim():'';
}

function applyDetailControl(){
  if(detailContent.querySelector('.stats-detail-zone'))return;
  const id=detailRunId();
  if(!id)return;
  const run=rows.find(r=>String(r.id)===String(id));
  if(!run)return;

  const zone=document.createElement('section');
  zone.className='detail-section stats-detail-zone';
  zone.innerHTML='<h3>Statistiques</h3><p class="stats-detail-help">Décoche cette case pour garder la partie dans le suivi tout en l’excluant des compteurs et des moyennes.</p>';
  zone.appendChild(makeToggle(run,false));
  const deleteZone=detailContent.querySelector('.delete-run-zone');
  detailContent.insertBefore(zone,deleteZone||null);
}

async function setIncluded(run,included,input){
  const previous=run.incluse_stats!==false;
  input.disabled=true;
  try{
    const response=await authenticatedFetch(
      `test_parties?id=eq.${encodeURIComponent(run.id)}&select=id,incluse_stats`,
      {
        method:'PATCH',
        headers:{'Content-Type':'application/json',Prefer:'return=representation'},
        body:JSON.stringify({incluse_stats:included})
      }
    );
    const updated=await response.json().catch(()=>[]);
    if(!Array.isArray(updated)||!updated.length)throw new Error('La modification n’a pas été enregistrée.');
    run.incluse_stats=included;
    syncRun(run.id,included);
    applyMetrics();
  }catch(error){
    console.error(error);
    input.checked=previous;
    window.alert('Impossible de modifier cette partie : '+error.message);
  }finally{
    input.disabled=false;
  }
}

function syncRun(id,included){
  document.querySelectorAll(`[data-stats-run-id="${id}"]`).forEach(input=>{
    input.checked=included;
  });
  document.querySelectorAll(`[data-stats-row-id="${id}"]`).forEach(row=>{
    row.classList.toggle('stats-excluded',!included);
  });
}

function applyAll(){
  applyMetrics();
  applyRowControls();
  applyDetailControl();
}

function queueRefresh(){
  if(refreshQueued)return;
  refreshQueued=true;
  setTimeout(()=>{
    refreshQueued=false;
    if(readSession()?.access_token)refreshRows();
  },80);
}

new MutationObserver(()=>{
  if(rows.length)applyMetrics();
  queueRefresh();
}).observe(bookSummaries,{childList:true});
new MutationObserver(()=>{
  if(rows.length)applyRowControls();
  else queueRefresh();
}).observe(runsBody,{childList:true});
new MutationObserver(()=>{
  if(rows.length)applyRowControls();
}).observe(mobileRuns,{childList:true});
new MutationObserver(()=>{
  if(rows.length)applyDetailControl();
}).observe(detailContent,{childList:true});

[bookFilter,resultFilter].forEach(el=>el?.addEventListener('change',()=>setTimeout(applyRowControls,0)));
searchInput?.addEventListener('input',()=>setTimeout(applyRowControls,0));
refreshBtn?.addEventListener('click',()=>setTimeout(queueRefresh,120));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)queueRefresh();});

const style=document.createElement('style');
style.textContent=`
.stats-head,.stats-toggle-cell{text-align:center!important;white-space:nowrap}
.stats-toggle{display:inline-flex;align-items:center;gap:8px;cursor:pointer;user-select:none;font-size:.92rem}
.stats-toggle-compact{gap:5px;font-size:.78rem}
.stats-toggle input{width:18px;height:18px;margin:0;accent-color:#9b7444;cursor:pointer}
.stats-toggle input:disabled{cursor:wait;opacity:.55}
.stats-excluded{opacity:.58}
.stats-excluded:hover{opacity:.76}
.stats-mobile-toggle{margin:8px 0 3px;padding:8px 10px;border:1px solid rgba(155,116,68,.25);border-radius:8px;background:rgba(255,255,255,.035)}
.stats-detail-zone{border-top:1px solid rgba(155,116,68,.28);margin-top:22px;padding-top:18px}
.stats-detail-help{color:#6d5b51;font-size:.95rem;line-height:1.45;margin-bottom:12px}
@media(max-width:760px){.stats-toggle input{width:20px;height:20px}.stats-toggle{font-size:.9rem}}
`;
document.head.appendChild(style);

if(readSession()?.access_token)queueRefresh();
})();
