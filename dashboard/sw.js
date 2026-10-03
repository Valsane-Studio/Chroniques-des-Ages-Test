const CACHE='aphanes-test-dashboard-v8';
const CORE=['./','./index.html','./styles.css?v=2','./app.js?v=7','./delete-run.js?v=1','./manifest.webmanifest'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(n=>n.startsWith('aphanes-test-dashboard-')&&n!==CACHE).map(n=>caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  event.respondWith((async()=>{
    try{
      const response=await fetch(event.request,{cache:'no-store'});
      if(response.ok)caches.open(CACHE).then(c=>c.put(event.request,response.clone())).catch(()=>{});
      return response;
    }catch(e){
      return (await caches.match(event.request)) || (event.request.mode==='navigate' ? caches.match('./index.html') : Promise.reject(e));
    }
  })());
});
