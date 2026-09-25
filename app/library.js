(function(){
'use strict';
const manifests=new Map();
window.BookManifestRegistry={register(m){manifests.set(m.id,m);return m;},get(id){return manifests.get(id);}};
function script(src){return new Promise((ok,ko)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=ko;document.head.appendChild(s);});}
function entries(){return [...(window.LIBRARY_CONFIG?.books||[])].sort((a,b)=>(a.order||999)-(b.order||999));}
function byId(id){return entries().find(x=>x.id===id)||null;}
async function manifest(entry){if(BookManifestRegistry.get(entry.id))return BookManifestRegistry.get(entry.id);await script(`./books/${entry.folder}/manifest.js?v=multi-book-6`);return BookManifestRegistry.get(entry.id);}
async function render(){const root=document.getElementById('libraryBookList');if(!root)return;root.replaceChildren();for(const e of entries().filter(x=>x.visible!==false)){const m=await manifest(e);if(!m)continue;const b=document.createElement('button');b.className='library-book';b.type='button';const available=(m.status||'available')==='available';if(!available){b.disabled=true;b.setAttribute('aria-disabled','true');}b.innerHTML=`<span class="library-book-number">${m.label||`Livre ${String(m.number||e.order||'').padStart(2,'0')}`}</span><span class="library-book-title">${m.title||e.id}</span><span class="library-book-status">${available?(m.actionLabel||'Jouer'):(m.statusLabel||'Bientôt disponible')}</span>`;if(available)b.addEventListener('click',()=>window.LibraryApp.open(e.id));root.appendChild(b);}}
window.LibraryApp={entries,byId,manifest,script,render,open:null};
})();
