const CACHE_PREFIX='checkout-lab-';
const CACHE=`${CACHE_PREFIX}v3.5.5`;
const ASSETS=['/','/index.html','/styles.css','/i18n.js','/audio-engine.js','/app.js','/manifest.webmanifest','/metrika.js','/icon.svg','/favicon-48.png','/icon-192.png','/icon-512.png','/fonts/oswald-cyrillic.woff2','/fonts/oswald-latin.woff2','/fonts/roboto-condensed-cyrillic.woff2','/fonts/roboto-condensed-latin.woff2','/checkout-table.html','/seo.css','/checkout-calculator.html','/darts-501.html','/darts-301.html','/double-out.html','/en/','/en/index.html','/en/manifest.webmanifest','/en/checkout-table.html','/en/checkout-calculator.html','/en/darts-501.html','/en/darts-301.html','/en/double-out.html','/darts-cricket.html','/darts-training.html','/en/darts-cricket.html','/en/darts-training.html','/darts-games.html','/darts-tournament.html','/en/darts-games.html','/en/darts-tournament.html'];

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
 return response?.status===200&&response.type==='basic';
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
 if(canCache(response)){try{const cache=await caches.open(CACHE);await cache.put(request,response.clone());}catch{}}
 return response;
}

// Audio clips: the browser asks for byte ranges (HTTP 206), which the Cache API cannot store.
// Serve the whole cached file when we have it, otherwise fetch and cache the full file in the background.
async function audioResponse(request){
 const url=request.url,cached=await caches.match(url);
 if(cached)return cached;
 fetch(url).then(async response=>{if(canCache(response)){const cache=await caches.open(CACHE);await cache.put(url,response);}}).catch(()=>{});
 return fetch(request);
}

self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin)return;
 if(url.pathname.endsWith('.mp3')){event.respondWith(audioResponse(event.request));return;}
 event.respondWith(event.request.mode==='navigate'?navigationResponse(event.request):assetResponse(event.request));
});
