(function(){
'use strict';

const SUPABASE_URL='https://tlgbzpenhuooabcyrmvf.supabase.co';
const SUPABASE_KEY='sb_publishable_wb7-3q3UEsRfUU5xaWSbLA_MxQWVvaT';
const SESSION_KEY='aphanes.test.dashboard.session.v1';
const AUTO_REFRESH_MS=30000;

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

const $=sel=>document.querySelector(sel);
const loginView=$('#loginView');
const dashboardView=$('#dashboardView');
const loginForm=$('#loginForm');
const emailInput=$('#emailInput');
const passwordInput=$('#passwordInput');
const loginStatus=$('#loginStatus');
const logoutBtn=$('#logoutBtn');
const refreshBtn=$('#refreshBtn');
const lastRefresh=$('#lastRefresh');
const resultFilter=$('#resultFilter');
const searchInput=$('#searchInput');
const visibleCount=$('#visibleCount');
const runsBody=$('#runsBody');
const mobileRuns=$('#mobileRuns');
const emptyState=$('#emptyState');
const detailBackdrop=$('#detailBackdrop');
const detailContent=$('#detailContent');
const detailClose=$('#detailClose');

let session=null;
let rows=[];
let filtered=[];
let refreshTimer=null;

function loadSession(){
  try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null');}catch(e){return null;}
}
function saveSession(value){
  session=value||null;
  try{
    if(session)localStorage.setItem(SESSION_KEY,JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  }catch(e){}
}
function clearSession(){
  saveSession(null);
  showLogin();
}
function showLogin(){
  loginView.classList.remove('hidden');
  dashboardView.classList.add('hidden');
  logoutBtn.classList.add('hidden');
  stopAutoRefresh();
}
function showDashboard(){
  loginView.classList.add('hidden');
  dashboardView.classList.remove('hidden');
  logoutBtn.classList.remove('hidden');
}
function authHeaders(token){
  return{
    apikey:SUPABASE_KEY,
    Authorization:`Bearer ${token}`,
    'Content-Type':'application/json'
  };
}

async function signIn(email,password){
  const r=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,{
    method:'POST',
    headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},
    body:JSON.stringify({email,password})
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(data.error_description||data.msg||data.message||'Connexion impossible.');
  saveSession(data);
  return data;
}

async function refreshAccessToken(){
  if(!session?.refresh_token)throw new Error('Session expirée.');
  const r=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{
    method:'POST',
    headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json'},
    body:JSON.stringify({refresh_token:session.refresh_token})
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(data.error_description||data.msg||'Session expirée.');
  saveSession(data);
  return data;
}

function tokenExpiresSoon(){
  if(!session?.expires_at)return false;
  return Date.now()/1000 > Number(session.expires_at)-90;
}

async function ensureToken(){
  if(!session?.access_token)throw new Error('Non connecté.');
  if(tokenExpiresSoon())await refreshAccessToken();
  return session.access_token;
}

async function rest(path,retry=true){
  const token=await ensureToken();
  const r=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{headers:authHeaders(token),cache:'no-store'});
  if(r.status===401 && retry){
    await refreshAccessToken();
    return rest(path,false);
  }
  const data=await r.json().catch(()=>null);
  if(!r.ok){
    const message=data?.message||data?.hint||`Erreur Supabase ${r.status}`;
    throw new Error(message);
  }
  return data;
}

function fmtDate(value){
  if(!value)return '—';
  try{
    return new Intl.DateTimeFormat('fr-FR',{
      day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'
    }).format(new Date(value));
  }catch(e){return String(value);}
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
function resultMeta(result){
  switch(result){
    case'fin_histoire':return{label:'Fin de l’histoire',cls:'end'};
    case'mort_combat':return{label:'Mort en combat',cls:'death'};
    case'mort_subite':return{label:'Mort / fin brutale',cls:'death'};
    case'transformation_terre_noire':return{label:'Transformation',cls:'transform'};
    default:return{label:result||'Inconnu',cls:'death'};
  }
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
function normalizeInventory(inv){
  if(!inv||typeof inv!=='object')return[];
  return Object.values(inv).map(item=>({
    name:item?.name||'Objet',
    quantity:Number(item?.quantity)||1
  }));
}
function cleanText(value){
  return String(value??'').replace(/[<>]/g,'');
}
function notesHtml(q){
  if(!q)return'<span class="note-chip">Pas de questionnaire</span>';
  return[
    ['D',q.difficulte],
    ['Dur',q.duree],
    ['C',q.comprehension],
    ['R',q.envie_rejouer]
  ].map(([k,v])=>`<span class="note-chip">${k} ${v??'—'}/9</span>`).join('');
}

async function loadData(){
  refreshBtn.disabled=true;
  try{
    const [parties,questionnaires]=await Promise.all([
      rest('test_parties?select=*&order=created_at.desc'),
      rest('test_questionnaires?select=*&order=created_at.desc')
    ]);
    const byParty=new Map((questionnaires||[]).map(q=>[q.partie_id,q]));
    rows=(parties||[]).map(p=>({...p,questionnaire:byParty.get(p.id)||null}));
    renderAll();
    lastRefresh.textContent='Mis à jour '+new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit'}).format(new Date());
  }catch(error){
    if(/JWT|token|Session|401|Non connecté/i.test(error.message)){
      clearSession();
      loginStatus.textContent='Ta session a expiré. Reconnecte-toi.';
    }else{
      lastRefresh.textContent='Erreur de mise à jour';
      console.error(error);
      alert('Impossible de charger les données : '+error.message);
    }
  }finally{
    refreshBtn.disabled=false;
  }
}

function renderMetrics(){
  $('#metricRuns').textContent=rows.length;
  $('#metricEnds').textContent=rows.filter(r=>r.resultat==='fin_histoire').length;
  $('#metricDeaths').textContent=rows.filter(r=>r.resultat==='mort_combat'||r.resultat==='mort_subite').length;
  $('#metricTransforms').textContent=rows.filter(r=>r.resultat==='transformation_terre_noire').length;
  $('#metricDuration').textContent=rows.length?fmtDuration(avg(rows.map(r=>r.duree_secondes))):'—';
  const qs=rows.map(r=>r.questionnaire).filter(Boolean);
  $('#metricDifficulty').textContent=avgLabel(qs.map(q=>q.difficulte),' / 9');
  $('#metricComprehension').textContent=avgLabel(qs.map(q=>q.comprehension),' / 9');
  $('#metricReplay').textContent=avgLabel(qs.map(q=>q.envie_rejouer),' / 9');
}

function applyFilters(){
  const result=resultFilter.value;
  const search=searchInput.value.trim().toLowerCase();
  filtered=rows.filter(r=>{
    if(result!=='all'&&r.resultat!==result)return false;
    if(!search)return true;
    const q=r.questionnaire||{};
    const hay=[
      r.resultat,finalLabel(r),r.page_finale,r.arme,r.protection,
      q.commentaire,lastNode(r),JSON.stringify(r.inventaire||{})
    ].join(' ').toLowerCase();
    return hay.includes(search);
  });
  renderRows();
}

function renderRows(){
  visibleCount.textContent=filtered.length;
  emptyState.classList.toggle('hidden',filtered.length!==0);
  runsBody.innerHTML='';
  mobileRuns.innerHTML='';

  filtered.forEach(run=>{
    const meta=resultMeta(run.resultat);
    const q=run.questionnaire;

    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td>${fmtDate(run.created_at)}</td>
      <td><span class="result-pill ${meta.cls}">${meta.label}</span></td>
      <td>${cleanText(finalLabel(run))}<br><span class="muted">p. ${run.page_finale??'—'} · ${cleanText(lastNode(run)||'')}</span></td>
      <td>${fmtDuration(run.duree_secondes)}</td>
      <td>${run.vie??'—'} / ${run.vie_max??'—'}</td>
      <td>${run.terre_noire??0} / 13</td>
      <td>${run.combats_gagnes??0} / ${run.combats_total??0}</td>
      <td><div class="note-set">${notesHtml(q)}</div></td>
      <td class="comment-cell">${cleanText(q?.commentaire||'—')}</td>
    `;
    tr.addEventListener('click',()=>openDetail(run));
    runsBody.appendChild(tr);

    const card=document.createElement('article');
    card.className='mobile-run';
    card.innerHTML=`
      <div class="mobile-run-head">
        <div>
          <h3>${cleanText(finalLabel(run))}</h3>
          <p>${fmtDate(run.created_at)} · page ${run.page_finale??'—'}</p>
        </div>
        <span class="result-pill ${meta.cls}">${meta.label}</span>
      </div>
      <div class="mobile-run-meta">
        <span>${fmtDuration(run.duree_secondes)}</span>
        <span>Vie ${run.vie??'—'}/${run.vie_max??'—'}</span>
        <span>Terre ${run.terre_noire??0}/13</span>
        <span>Combats ${run.combats_gagnes??0}/${run.combats_total??0}</span>
      </div>
      ${q?.commentaire?`<p>« ${cleanText(q.commentaire)} »</p>`:''}
    `;
    card.addEventListener('click',()=>openDetail(run));
    mobileRuns.appendChild(card);
  });
}

function detailStat(label,value){
  return`<div class="detail-stat"><span>${label}</span><strong>${value??'—'}</strong></div>`;
}
function openDetail(run){
  const q=run.questionnaire;
  const meta=resultMeta(run.resultat);
  const pages=Array.isArray(run?.parcours?.pages)?run.parcours.pages:[];
  const nodes=Array.isArray(run?.parcours?.nodes)?run.parcours.nodes:[];
  const inventory=normalizeInventory(run.inventaire);
  detailContent.innerHTML=`
    <div class="detail-title">
      <div class="eyebrow">Partie du ${fmtDate(run.created_at)}</div>
      <h2>${cleanText(finalLabel(run))}</h2>
      <p><span class="result-pill ${meta.cls}">${meta.label}</span></p>
    </div>

    <div class="detail-grid">
      ${detailStat('Page finale',run.page_finale)}
      ${detailStat('Durée',fmtDuration(run.duree_secondes))}
      ${detailStat('Pages visitées',run.pages_visitees)}
      ${detailStat('Vie',`${run.vie??'—'} / ${run.vie_max??'—'}`)}
      ${detailStat('Force',run.force)}
      ${detailStat('Dextérité',run.dexterite)}
      ${detailStat('Terre noire',`${run.terre_noire??0} / 13`)}
      ${detailStat('Combats',`${run.combats_gagnes??0} gagnés / ${run.combats_total??0}`)}
      ${detailStat('Protection',run.protection)}
    </div>

    <section class="detail-section">
      <h3>Équipement final</h3>
      <p><strong>Arme :</strong> ${cleanText(run.arme||'Aucune')}</p>
      ${inventory.length
        ?`<ul class="inventory-list">${inventory.map(x=>`<li>${cleanText(x.name)}${x.quantity>1?` × ${x.quantity}`:''}</li>`).join('')}</ul>`
        :'<p>Aucun objet enregistré.</p>'}
    </section>

    <section class="detail-section">
      <h3>Questionnaire</h3>
      ${q?`
        <div class="detail-grid">
          ${detailStat('Difficulté',`${q.difficulte??'—'} / 9`)}
          ${detailStat('Durée ressentie',`${q.duree??'—'} / 9`)}
          ${detailStat('Compréhension',`${q.comprehension??'—'} / 9`)}
          ${detailStat('Envie de rejouer',`${q.envie_rejouer??'—'} / 9`)}
        </div>
        <div class="comment-box">${cleanText(q.commentaire||'Aucun commentaire.')}</div>
      `:'<p>Le testeur n’a pas envoyé de questionnaire.</p>'}
    </section>

    <section class="detail-section">
      <h3>Parcours</h3>
      <p><strong>Origine :</strong> ${cleanText(run?.parcours?.origin||'—')} · <strong>Checkpoint :</strong> ${cleanText(run?.parcours?.checkpoint||'—')}</p>
      <div class="path-list">
        ${pages.length?pages.map((p,i)=>`<span class="path-page" title="${cleanText(nodes[i]||'')}">p. ${p}</span>`).join(''):'<span>Parcours non disponible.</span>'}
      </div>
    </section>

    <section class="detail-section">
      <h3>Technique</h3>
      <p><strong>Version :</strong> ${cleanText(run.version_jeu||'—')}</p>
      <p><strong>ID :</strong> ${cleanText(run.id||'—')}</p>
      <p><strong>Nœud final :</strong> ${cleanText(lastNode(run)||'—')}</p>
    </section>
  `;
  detailBackdrop.classList.remove('hidden');
  detailBackdrop.setAttribute('aria-hidden','false');
}

function closeDetail(){
  detailBackdrop.classList.add('hidden');
  detailBackdrop.setAttribute('aria-hidden','true');
}
function renderAll(){
  renderMetrics();
  applyFilters();
}
function startAutoRefresh(){
  stopAutoRefresh();
  refreshTimer=setInterval(()=>{if(!document.hidden)loadData();},AUTO_REFRESH_MS);
}
function stopAutoRefresh(){
  if(refreshTimer)clearInterval(refreshTimer);
  refreshTimer=null;
}

loginForm.addEventListener('submit',async e=>{
  e.preventDefault();
  loginStatus.textContent='Connexion…';
  const btn=loginForm.querySelector('button[type="submit"]');
  btn.disabled=true;
  try{
    await signIn(emailInput.value.trim(),passwordInput.value);
    passwordInput.value='';
    loginStatus.textContent='';
    showDashboard();
    await loadData();
    startAutoRefresh();
  }catch(error){
    loginStatus.textContent=error.message;
  }finally{
    btn.disabled=false;
  }
});

logoutBtn.addEventListener('click',async()=>{
  try{
    if(session?.access_token){
      await fetch(`${SUPABASE_URL}/auth/v1/logout`,{
        method:'POST',
        headers:authHeaders(session.access_token)
      });
    }
  }catch(e){}
  clearSession();
});
refreshBtn.addEventListener('click',()=>loadData());
resultFilter.addEventListener('change',applyFilters);
searchInput.addEventListener('input',applyFilters);
detailClose.addEventListener('click',closeDetail);
detailBackdrop.addEventListener('click',e=>{if(e.target===detailBackdrop)closeDetail();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDetail();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&session?.access_token)loadData();});

(async function boot(){
  if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
  session=loadSession();
  if(!session?.access_token){
    showLogin();
    return;
  }
  try{
    await ensureToken();
    showDashboard();
    await loadData();
    startAutoRefresh();
  }catch(e){
    clearSession();
  }
})();
})();