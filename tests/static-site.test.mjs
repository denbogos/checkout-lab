import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import test from 'node:test';

const root=resolve(new URL('..',import.meta.url).pathname);
const htmlFiles=[
 'index.html','checkout-table.html','checkout-calculator.html','darts-501.html','darts-301.html','double-out.html',
 'online.html','en/index.html','en/checkout-table.html','en/checkout-calculator.html','en/darts-501.html','en/darts-301.html','en/double-out.html','en/online.html'
];

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

test('beta online pages stay out of search indexes',()=>{
 for(const file of ['online.html','en/online.html']){
  const html=readFileSync(resolve(root,file),'utf8');
  assert.match(html,/<meta name="robots" content="noindex,nofollow">/);
 }
});

test('service worker caches only successful same-origin responses',()=>{
 const source=readFileSync(resolve(root,'sw.js'),'utf8');
 assert.match(source,/CACHE=`\$\{CACHE_PREFIX\}v3\.0\.0-beta\.5`/);
 assert.match(source,/url\.origin!==self\.location\.origin/);
 assert.match(source,/response\?\.ok&&response\.type==='basic'/);
 assert.match(source,/path\.startsWith\('\/en\/'\)\?'\/en\/index\.html':'\/index\.html'/);
 assert.match(source,/SKIP_WAITING/);
 assert.doesNotMatch(source,/cdn\.jsdelivr\.net/);
});

test('online beta uses a pinned SDK and shareable private rooms',()=>{
 for(const file of ['online.html','en/online.html']){
  const html=readFileSync(resolve(root,file),'utf8');
  assert.match(html,/@supabase\/supabase-js@2\.117\.2/);
  assert.match(html,/noindex,nofollow/);
 }
 const core=readFileSync(resolve(root,'online-core.js'),'utf8');
 const ui=readFileSync(resolve(root,'online-ui.js'),'utf8');
 assert.match(core,/searchParams\.set\('room'/);
 assert.match(core,/p_visibility:'private'/);
 assert.match(core,/p_checkout_double/);
 assert.match(core,/if\(refreshPromise\)return refreshPromise/);
 assert.match(core,/state\.realtimeStatus==='SUBSCRIBED'\?15000:2000/);
 assert.match(core,/snapshotKey!==lastSnapshotKey/);
 assert.match(core,/stopPolling\(\)/);
 assert.match(ui,/CheckoutOnline\.inviteUrl\(\)/);
 assert.match(ui,/fallback:'Резервная синхронизация'/);
 assert.match(ui,/yourTurn:'ВАШ ХОД'/);
 assert.match(ui,/class="primary online-submit"/);
 assert.match(ui,/online-desktop-game/);
 assert.match(ui,/online-mobile-game/);
 assert.match(ui,/data-key=/);
 assert.match(ui,/checkoutAdvice/);
 assert.match(ui,/checkout-table\.html/);
 assert.match(ui,/showOnlineMoment/);
 assert.match(ui,/data-confirm-double/);
 assert.doesNotMatch(ui,/data-darts/);
 assert.doesNotMatch(ui,/data-double/);
 const css=readFileSync(resolve(root,'online.css'),'utf8');
 assert.match(css,/\.playerbox \.remaining/);
 assert.match(css,/\.turn-banner/);
 assert.match(css,/\.visitline input\{height:92px/);
 assert.match(css,/\.online-desktop-game/);
 assert.match(css,/\.online-mobile-game/);
 assert.match(css,/\.online-checkout/);
 assert.match(css,/@keyframes onlineMoment/);
 assert.match(readFileSync(resolve(root,'online.html'),'utf8'),/audio-engine\.js/);
 assert.match(readFileSync(resolve(root,'en\/online.html'),'utf8'),/audio-engine\.js/);
 assert.doesNotMatch(core,/MutationObserver/);
});

test('online migration validates visits and alternates leg starters',()=>{
 const sql=readFileSync(resolve(root,'supabase/migrations/20261006002000_online_beta_hardening.sql'),'utf8');
 assert.match(sql,/private\.is_valid_visit_score/);
 assert.match(sql,/p_checkout_double/);
 assert.match(sql,/leg_starter_id/);
 assert.match(sql,/m\.current_player_id<>uid/);
 assert.match(sql,/client_event_id=p_client_event_id/);
 assert.match(sql,/grant execute.*to authenticated/is);
 assert.match(sql,/revoke all.*from public,anon/is);
});

test('authentication is isolated from the game render loop',()=>{
 const auth=readFileSync(resolve(root,'auth.js'),'utf8');
 const app=readFileSync(resolve(root,'app.js'),'utf8');
 assert.doesNotMatch(auth,/MutationObserver/);
 assert.match(auth,/addEventListener\('checkoutlab:render',ensureButtons\)/);
 assert.match(app,/dispatchEvent\(new Event\('checkoutlab:render'\)\)/);
 assert.match(auth,/event==='PASSWORD_RECOVERY'/);
 assert.match(auth,/auth\.updateUser\(\{password\}\)/);
 assert.match(auth,/mode!=='update-password'&&!email/);
 assert.match(auth,/\|\|pendingEmail/);
});

test('RU and EN app shells include the isolated auth bundle',()=>{
 for(const file of ['index.html','en/index.html']){
  const html=readFileSync(resolve(root,file),'utf8');
  assert.match(html,/auth\.css/);
  assert.match(html,/supabase-config\.js/);
  assert.match(html,/auth\.js/);
 }
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
