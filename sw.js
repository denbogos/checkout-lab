const CACHE='checkout-lab-2.1.2-stable';
const ASSETS=['./','./index.html','./styles.css','./i18n.js','./audio-engine.js','./app.js','./manifest.webmanifest','./icon.svg','./favicon-48.png','./icon-192.png','./icon-512.png','./checkout-table.html','./seo.css','./checkout-calculator.html','./darts-501.html','./darts-301.html','./double-out.html','./en/index.html','./en/manifest.webmanifest','./en/checkout-table.html','./en/checkout-calculator.html','./en/darts-501.html','./en/darts-301.html','./en/double-out.html'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return res;}).catch(()=>caches.match(e.request).then(c=>c||caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return res;}).catch(()=>caches.match('./index.html'))));
});
