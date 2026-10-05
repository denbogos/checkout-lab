const CACHE_PREFIX='checkout-lab-';
const CACHE=`${CACHE_PREFIX}v2.1.3`;
const ASSETS=['/','/index.html','/styles.css','/i18n.js','/audio-engine.js','/app.js','/manifest.webmanifest','/icon.svg','/favicon-48.png','/icon-192.png','/icon-512.png','/checkout-table.html','/seo.css','/checkout-calculator.html','/darts-501.html','/darts-301.html','/double-out.html','/en/','/en/index.html','/en/manifest.webmanifest','/en/checkout-table.html','/en/checkout-calculator.html','/en/darts-501.html','/en/darts-301.html','/en/double-out.html'];

self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});

self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys()
  .then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE).map(key=>caches.delete(key))))
  .then(()=>self.clients.claim()));
});

self.addEventListener('message',event=>{
 if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});

function canCache(response){
 return response?.ok&&response.type==='basic';
}

async function navigationResponse(request){
 try{
  const response=await fetch(request);
  if(canCache(response)){const cache=await caches.open(CACHE);await cache.put(request,response.clone());}
  return response;
 }catch{
  const cached=await caches.match(request);
  if(cached)return cached;
  const path=new URL(request.url).pathname;
  return caches.match(path.startsWith('/en/')?'/en/index.html':'/index.html');
 }
}

async function assetResponse(request){
 const cached=await caches.match(request);
 if(cached)return cached;
 const response=await fetch(request);
 if(canCache(response)){const cache=await caches.open(CACHE);await cache.put(request,response.clone());}
 return response;
}

self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin)return;
 event.respondWith(event.request.mode==='navigate'?navigationResponse(event.request):assetResponse(event.request));
});
