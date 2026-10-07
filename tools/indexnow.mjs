// Tells Yandex and Bing (IndexNow) which pages changed, so they are re-crawled within minutes.
// Usage: node tools/indexnow.mjs --all            submit every URL from sitemap.xml
//        node tools/indexnow.mjs a.html en/b.html submit the given files
//        add --dry-run to print the payload without sending it
import {readFileSync} from 'node:fs';

const HOST='checkoutlab.ru',SITE=`https://${HOST}/`,KEY='6757375df76048ba3dcce4b9f4cfa93b';
const ENDPOINTS=['https://yandex.com/indexnow','https://api.indexnow.org/indexnow'];
const args=process.argv.slice(2),dry=args.includes('--dry-run'),files=args.filter(a=>!a.startsWith('--'));

export function fileToUrl(file){
 if(!file.endsWith('.html')||/(^|\/)(test|online|yandex_[^/]*)\.html$/.test(file))return null;
 return SITE+file.replace(/(^|\/)index\.html$/,'$1');
}
const urls=args.includes('--all')
 ?[...readFileSync(new URL('../sitemap.xml',import.meta.url),'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1])
 :[...new Set(files.map(fileToUrl).filter(Boolean))];

if(!urls.length){console.log('IndexNow: nothing to submit');process.exit(0);}
const body={host:HOST,key:KEY,keyLocation:`${SITE}${KEY}.txt`,urlList:urls.slice(0,10000)};
if(dry){console.log(JSON.stringify(body,null,1));process.exit(0);}
let ok=false;
for(const endpoint of ENDPOINTS){
 try{const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json; charset=utf-8'},body:JSON.stringify(body)});console.log(`${endpoint}: ${res.status} (${urls.length} URLs)`);if(res.ok)ok=true;}
 catch(error){console.log(`${endpoint}: ${error.message}`);}
}
if(!ok)process.exitCode=1;
