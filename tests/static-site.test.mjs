import assert from 'node:assert/strict';
import {existsSync,readdirSync,readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const root=resolve(new URL('..',import.meta.url).pathname);
const htmlFiles=readdirSync(root,{recursive:true}).filter(file=>file.endsWith('.html')&&!file.startsWith('node_modules')&&!file.startsWith('.git')).map(file=>file.split('\\').join('/'));

test('internal HTML links resolve to published files',()=>{
 for(const file of htmlFiles){
  const html=readFileSync(resolve(root,file),'utf8');
  const links=[...html.matchAll(/href=["']([^"'#?]+)["']/g)].map(match=>match[1]);
  for(const href of links){
   if(/^(?:https?:|mailto:|data:)/.test(href))continue;
   const target=resolve(dirname(resolve(root,file)),href);
   const resolved=href.endsWith('/')?resolve(target,'index.html'):target;
   assert.equal(existsSync(resolved),true,`${file} -> ${href}`);
  }
 }
});

test('checkout table language controls point to the opposite locale',()=>{
 const ru=readFileSync(resolve(root,'checkout-table.html'),'utf8');
 const en=readFileSync(resolve(root,'en/checkout-table.html'),'utf8');
 assert.match(ru,/location\.href='\.\/en\/checkout-table\.html'/);
 assert.match(en,/langButton\.textContent='RU'/);
 assert.match(en,/location\.href='\.\.\/checkout-table\.html'/);
 assert.doesNotMatch(en,/\.\/en\/checkout-table\.html/);
});

test('score event labels are localized in English',()=>{
 const css=readFileSync(resolve(root,'styles.css'),'utf8');
 assert.match(css,/html\[lang="en"\] \.game-moment\.max::after\{content:"MAXIMUM"\}/);
 assert.match(css,/html\[lang="en"\] \.game-moment\.bust::after\{content:"SCORE UNCHANGED"\}/);
 assert.match(css,/html\[lang="en"\] \.game-moment\.leg::after\{content:"CHECKOUT"\}/);
});

test('service worker caches only successful same-origin responses',()=>{
 const source=readFileSync(resolve(root,'sw.js'),'utf8');
 assert.match(source,/CACHE=`\$\{CACHE_PREFIX\}v3\.2\.0`/);
 assert.match(source,/url\.origin!==self\.location\.origin/);
 assert.match(source,/response\?\.ok&&response\.type==='basic'/);
 assert.match(source,/path\.startsWith\('\/en\/'\)\?'\/en\/index\.html':'\/index\.html'/);
 assert.match(source,/SKIP_WAITING/);
 assert.doesNotMatch(source,/cdn\.jsdelivr\.net/);
});

test('RU and EN app shells stay offline-only',()=>{
 for(const file of ['index.html','en/index.html']){
  const html=readFileSync(resolve(root,file),'utf8');
  assert.doesNotMatch(html,/auth\.css|auth\.js|supabase|online\.html/i);
 }
 const sw=readFileSync(resolve(root,'sw.js'),'utf8');
 assert.doesNotMatch(sw,/auth\.css|auth\.js|supabase|online/i);
});

test('desktop visit preview reapplies the selected language after input',()=>{
 const source=readFileSync(resolve(root,'app.js'),'utf8');
 assert.match(source,/preview\.innerHTML=visitPreview\(\);window\.CheckoutI18n\?\.apply\?\.\(preview,state\.language\)/);
});

test('RU and EN manifests share one PWA identity',()=>{
 const ru=JSON.parse(readFileSync(resolve(root,'manifest.webmanifest'),'utf8'));
 const en=JSON.parse(readFileSync(resolve(root,'en/manifest.webmanifest'),'utf8'));
 assert.equal(ru.id,'./');
 assert.equal(en.id,'/');
 assert.equal(en.scope,'/');
});

test('fixed-language pages keep their SEO title and description',()=>{
 const source=readFileSync(resolve(root,'i18n.js'),'utf8');
 const context={document:{documentElement:{dataset:{lang:'ru'},lang:'ru'},title:'SEO title',querySelector:()=>{throw new Error('meta must not change');}},localStorage:{getItem:()=>null,setItem:()=>{}},navigator:{language:'ru'},window:{}};
 vm.runInNewContext(source,vm.createContext(context));
 for(const [language,page] of [['ru','app'],['en','app'],['ru','table'],['en','table']]){
  context.window.CheckoutI18n.applyMeta(language,page);
  assert.equal(context.document.title,'SEO title');
 }
});

test('every checkout page 2–170 exists in both languages and matches the app route',()=>{
 for(let n=2;n<=170;n++)for(const dir of ['checkout','en/checkout'])assert.equal(existsSync(resolve(root,`${dir}/${n}.html`)),true,`${dir}/${n}.html`);
 const page=readFileSync(resolve(root,'checkout/170.html'),'utf8');
 assert.match(page,/Как закрыть 170 в дартсе: T20 → T20 → BULL/);
 assert.match(page,/"@type":"FAQPage"/);
 assert.match(readFileSync(resolve(root,'checkout/169.html'),'utf8'),/Нет закрытия/);
});

test('sitemap lists every checkout page in both languages',()=>{
 const sitemap=readFileSync(resolve(root,'sitemap.xml'),'utf8');
 for(const url of ['https://checkoutlab.ru/checkout/121.html','https://checkoutlab.ru/en/checkout/121.html','https://checkoutlab.ru/darts-terms.html'])assert.match(sitemap,new RegExp(`<loc>${url.replace(/[.]/g,'\\.')}</loc>`));
});
