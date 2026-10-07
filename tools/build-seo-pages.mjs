// Generates the SEO reference pages:
//   checkout/2.html … checkout/170.html   (RU)
//   en/checkout/2.html … en/checkout/170.html (EN)
//   darts-terms.html, en/darts-terms.html (glossary)
//   darts-cricket.html, darts-training.html (+ en/) — game modes and practice routines
//   sitemap.xml
// Routes come from app.js itself, so the pages always match the in-game hints.
// Run: npm run build:seo
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {loadApp} from './load-app.mjs';

const ROOT=resolve(new URL('..',import.meta.url).pathname);
const SITE='https://checkoutlab.ru/';
const TODAY=new Date().toISOString().slice(0,10);
const app=loadApp();

const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const write=(path,html)=>{const file=resolve(ROOT,path);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,html);};

const T={
 ru:{home:'',locale:'ru_RU',nav:[['darts-501.html','Счётчик 501'],['checkout-calculator.html','Калькулятор закрытий'],['checkout-table.html','Таблица'],['darts-cricket.html','Крикет'],['darts-training.html','Тренировки'],['darts-terms.html','Термины']],lang:'EN',
  ogAlt:'Checkout Lab — счётчик дартса 301/501'},
 en:{home:'en/',locale:'en_US',nav:[['darts-501.html','501 scorer'],['checkout-calculator.html','Checkout calculator'],['checkout-table.html','Checkout table'],['darts-cricket.html','Cricket'],['darts-training.html','Practice'],['darts-terms.html','Darts terms']],lang:'RU',
  ogAlt:'Checkout Lab — 301/501 darts scorer'}
};

// path: site-relative path of the page, e.g. "checkout/121.html" or "en/checkout/121.html"
function page({lang,path,altPath,title,description,body,jsonld=[]}){
 const depth=path.split('/').length-1,root='../'.repeat(depth)||'./',home=lang==='en'?(depth?'../'.repeat(depth-1):'./'):root;
 const t=T[lang],ru=lang==='ru'?path:altPath,en=lang==='en'?path:altPath;
 const self=path.split('/').pop();
 const links=t.nav.map(([href,label])=>`<a href="${home}${href}"${self===href&&depth===(lang==='en'?1:0)?' class="active" aria-current="page"':''}>${label}</a>`).join('');
 const langHref=root+(lang==='ru'?en:ru);
 return `<!doctype html><html lang="${lang}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#111316"><meta name="robots" content="index,follow">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${path}"><link rel="alternate" hreflang="ru" href="${SITE}${ru}"><link rel="alternate" hreflang="en" href="${SITE}${en}"><link rel="alternate" hreflang="x-default" href="${SITE}${ru}">
<meta property="og:type" content="article"><meta property="og:site_name" content="Checkout Lab"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${SITE}${path}"><meta property="og:locale" content="${t.locale}">
<meta property="og:image" content="${SITE}og-image.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${t.ogAlt}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${SITE}og-image.jpg">
<link rel="icon" href="${root}favicon-48.png" type="image/png" sizes="48x48"><link rel="stylesheet" href="${root}styles.css"><link rel="stylesheet" href="${root}seo.css"><script src="/metrika.js" async></script>
${jsonld.map(j=>`<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}
</head><body><nav class="seo-nav"><a class="brand" href="${home}" aria-label="Checkout Lab"><span class="brand-mark"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/></svg></span><span class="brand-name">Checkout<b>Lab</b></span></a><div class="seo-links">${links}</div><a class="lang" href="${langHref}">${t.lang}</a></nav>
<main class="seo-content">${body}</main></body></html>
`;
}

/* ---------- checkout pages ---------- */
const hitClass=h=>h.isTreble?'treble':h.isDouble?(h.label==='BULL'?'bull-hit':'double'):h.label==='BULL'?'bull-hit':'single-hit';
const pills=route=>route.map(h=>`<b class="route-hit ${hitClass(h)}">${h.label}</b>`).join('<i aria-hidden="true">›</i>');
const plain=route=>route.map(h=>h.label).join(' → ');
function describe(h,lang){
 if(h.label==='BULL')return lang==='ru'?'Bull (центр) — 50 очков, считается удвоением':'Bull (bullseye) — 50 points, counts as a double';
 if(h.label==='25')return lang==='ru'?'внешний Bull — 25 очков':'outer bull — 25 points';
 const n=h.number,ru={1:'одиночный',2:'удвоение',3:'утроение'},en={1:'single',2:'double',3:'treble'};
 return lang==='ru'?`${ru[h.multiplier]} ${n} — ${h.value} очк${h.value%10===1&&h.value%100!==11?'о':[2,3,4].includes(h.value%10)&&![12,13,14].includes(h.value%100)?'а':'ов'}`:`${en[h.multiplier]} ${n} — ${h.value} points`;
}
const dartsWord=(n,lang)=>lang==='ru'?`${n} ${n===1?'дротик':'дротика'}`:`${n} dart${n===1?'':'s'}`;

function checkoutPage(n,lang){
 const ru=lang==='ru',path=`${ru?'':'en/'}checkout/${n}.html`,altPath=`${ru?'en/':''}checkout/${n}.html`;
 const routes=app.checkoutRoutes(n,3,4),bogey=app.BOGEY.has(n)||!routes.length;
 const main=routes[0];
 let title,description,hero,steps='',alts='',faq;
 if(!bogey){
  title=ru?`Как закрыть ${n} в дартсе: ${plain(main)} | Checkout Lab`:`How to check out ${n} in darts: ${plain(main)} | Checkout Lab`;
  description=ru?`Закрытие ${n} в дартсе (Double Out): ${plain(main)} за ${dartsWord(main.length,'ru')}. Пояснение по каждому дротику и запасные маршруты.`:`${n} checkout in darts (Double Out): ${plain(main)} in ${dartsWord(main.length,'en')}. Dart-by-dart breakdown and alternative routes.`;
  let left=n;
  steps=`<h2>${ru?'По дротикам':'Dart by dart'}</h2><ol class="co-steps">${main.map((h,i)=>{left-=h.value;return `<li><b class="route-hit ${hitClass(h)}">${h.label}</b><span>${describe(h,lang)}</span><em>${left===0?(ru?'закрыто':'checkout'):(ru?`остаётся ${left}`:`${left} left`)}</em></li>`;}).join('')}</ol>`;
  if(routes.length>1)alts=`<h2>${ru?'Запасные маршруты':'Alternative routes'}</h2><div class="co-alts">${routes.slice(1).map(r=>`<div class="route-main">${pills(r)}</div>`).join('')}</div>`;
  hero=`<div class="co-route route-main">${pills(main)}</div><p>${ru?`Остаток <strong>${n}</strong> закрывается за ${dartsWord(main.length,'ru')}. Последний дротик — в удвоение${main.at(-1).label==='BULL'?' (Bull считается удвоением)':''}.`:`<strong>${n}</strong> can be checked out with ${dartsWord(main.length,'en')}. The last dart must hit a double${main.at(-1).label==='BULL'?' (the bull counts as a double)':''}.`}</p>`;
  faq=[[ru?`Как закрыть ${n} в дартсе?`:`How do you check out ${n} in darts?`,ru?`Основной маршрут: ${plain(main)}.${routes.length>1?` Варианты: ${routes.slice(1).map(plain).join('; ')}.`:''}`:`The standard route is ${plain(main)}.${routes.length>1?` Alternatives: ${routes.slice(1).map(plain).join('; ')}.`:''}`],
   [ru?`За сколько дротиков можно закрыть ${n}?`:`How many darts does ${n} take?`,ru?`Минимум за ${dartsWord(main.length,'ru')}.`:`At least ${dartsWord(main.length,'en')}.`]];
 }else{
  const prep=app.preparation(n);
  title=ru?`${n} в дартсе: закрытия нет — что бросать | Checkout Lab`:`${n} in darts: no checkout — what to throw | Checkout Lab`;
  description=ru?`${n} нельзя закрыть за три дротика в Double Out (bogey number). Как подготовить следующий подход${prep?`: ${prep.hit.label}, затем ${plain(prep.routes[0])}`:''}.`:`${n} cannot be checked out in three darts with Double Out (a bogey number). How to set up the next visit${prep?`: ${prep.hit.label}, then ${plain(prep.routes[0])}`:''}.`;
  hero=`<div class="co-route co-none">${ru?'Нет закрытия':'No checkout'}</div><p>${ru?`<strong>${n}</strong> — «bogey number»: за три дротика с последним удвоением его не закрыть.`:`<strong>${n}</strong> is a bogey number: there is no three-dart route that finishes on a double.`}</p>`;
  if(prep)steps=`<h2>${ru?'Что бросать':'What to throw'}</h2><p>${ru?`Бросьте <b class="route-hit ${hitClass(prep.hit)}">${prep.hit.label}</b> — останется <strong>${prep.remainder}</strong>, который закрывается так:`:`Throw <b class="route-hit ${hitClass(prep.hit)}">${prep.hit.label}</b> to leave <strong>${prep.remainder}</strong>, which finishes like this:`}</p><div class="route-main">${pills(prep.routes[0])}</div><p><a href="./${prep.remainder}.html">${ru?`Подробнее о закрытии ${prep.remainder}`:`More about the ${prep.remainder} checkout`} →</a></p>`;
  faq=[[ru?`Можно ли закрыть ${n} в дартсе?`:`Can you check out ${n} in darts?`,ru?`Нет, ${n} нельзя закрыть за три дротика в Double Out.${prep?` Лучше бросить ${prep.hit.label} и оставить ${prep.remainder}.`:''}`:`No, ${n} cannot be finished in three darts with Double Out.${prep?` Throw ${prep.hit.label} to leave ${prep.remainder}.`:''}`]];
 }
 const near=[];for(let k=Math.max(2,n-5);k<=Math.min(170,n+5);k++)if(k!==n)near.push(k);
 const prev=n>2?n-1:null,next=n<170?n+1:null;
 const body=`<section class="hero co-hero"><div><span class="eyebrow">CHECKOUT · DOUBLE OUT</span><h1>${ru?`Закрытие ${n}`:`${n} checkout`}</h1>${hero}<div class="seo-actions"><a class="seo-primary" href="../${ru?'':'../en/'}">${ru?'Открыть счётчик':'Open scorer'}</a><a class="seo-secondary" href="../checkout-table.html#score-${n}">${ru?'Таблица 2–170':'Table 2–170'}</a></div></div></section>
<section>${steps}${alts}
<nav class="co-nav" aria-label="${ru?'Соседние остатки':'Nearby scores'}">${prev?`<a class="seo-secondary" href="./${prev}.html">← ${prev}</a>`:'<span></span>'}<div class="co-chips">${near.map(k=>`<a href="./${k}.html">${k}</a>`).join('')}</div>${next?`<a class="seo-secondary" href="./${next}.html">${next} →</a>`:'<span></span>'}</nav>
<h2>${ru?'Вопросы':'FAQ'}</h2><div class="seo-grid">${faq.map(([q,a])=>`<article class="seo-card"><h3>${esc(q)}</h3><p>${esc(a)}</p></article>`).join('')}</div></section>`;
 const jsonld=[
  {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[
   {'@type':'ListItem',position:1,name:'Checkout Lab',item:SITE+(ru?'':'en/')},
   {'@type':'ListItem',position:2,name:ru?'Таблица закрытий':'Checkout table',item:`${SITE}${ru?'':'en/'}checkout-table.html`},
   {'@type':'ListItem',position:3,name:String(n),item:SITE+path}]},
  {'@context':'https://schema.org','@type':'FAQPage',mainEntity:faq.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))}
 ];
 return page({lang,path,altPath,title,description,body,jsonld});
}

/* ---------- glossary ---------- */
const TERMS=[
 ['180','180 («тон восемьдесят»)','Максимум за подход: три дротика в утроение 20 (T20 × 3).','180 ("one hundred and eighty")','The maximum visit: three darts in treble 20 (T20 × 3).'],
 ['ton','Тон (ton)','Подход на 100 очков и больше. «Ton-plus» — от 101 до 139, «ton-forty» — от 140.','Ton','A visit of 100 or more. "Ton-plus" is 101–139, "ton-forty" is 140 or more.'],
 ['checkout','Закрытие (checkout)','Подход, которым игрок сводит остаток к нулю. В Double Out последний дротик должен попасть в удвоение или Bull.','Checkout','The visit that brings the score to exactly zero. With Double Out the last dart must hit a double or the bull.'],
 ['double-out','Double Out','Правило, по которому лег заканчивается только попаданием в удвоение. Стандарт для 301 и 501.','Double Out','The rule that a leg can only be finished on a double. Standard for 301 and 501.'],
 ['double-in','Double In','Правило, по которому очки начинают засчитываться только после попадания в удвоение. Часто используется в 301.','Double In','A rule where scoring only starts after hitting a double. Often used in 301.'],
 ['bust','Перебор (bust)','Подход, после которого остаток стал меньше нуля, равен 1 или ноль без удвоения. Очки за подход не засчитываются.','Bust','A visit that leaves a negative score, 1, or zero without a double. The visit does not count.'],
 ['bogey','Bogey numbers','Остатки, которые нельзя закрыть за три дротика: 159, 162, 163, 165, 166, 168 и 169.','Bogey numbers','Scores that cannot be checked out in three darts: 159, 162, 163, 165, 166, 168 and 169.'],
 ['bull','Bull и внешний Bull','Центр мишени — 50 очков, считается удвоением. Кольцо вокруг (внешний Bull) — 25 очков.','Bull and outer bull','The bullseye scores 50 and counts as a double. The ring around it (outer bull) scores 25.'],
 ['treble','Утроение (T)','Узкое внутреннее кольцо: очки сектора × 3. T20 = 60.','Treble (T)','The narrow inner ring: sector value × 3. T20 = 60.'],
 ['double','Удвоение (D)','Узкое внешнее кольцо: очки сектора × 2. D20 = 40.','Double (D)','The narrow outer ring: sector value × 2. D20 = 40.'],
 ['leg-set','Лег и сет','Лег — одна партия от 501 (301) до нуля. Сет — серия легов, обычно до трёх побед.','Leg and set','A leg is one game from 501 (or 301) to zero. A set is a group of legs, usually first to three.'],
 ['average','Средний набор (average)','Среднее количество очков за подход из трёх дротиков. Главный показатель уровня игрока.','Three-dart average','The average points per three-dart visit — the main measure of a player\'s level.'],
 ['madhouse','Madhouse (D1)','Остаток 2, который закрывается только удвоением 1. Самое неудобное закрытие.','Madhouse (D1)','A score of 2, which can only be finished on double 1 — the most awkward checkout.'],
 ['shanghai','Шанхай','Попадание в один сектор одиночным, удвоением и утроением за один подход. Например, 120 = S20 + D20 + T20.','Shanghai','Hitting the single, double and treble of one number in a visit, e.g. 120 = S20 + D20 + T20.']
];
function termsPage(lang){
 const ru=lang==='ru',path=ru?'darts-terms.html':'en/darts-terms.html',altPath=ru?'en/darts-terms.html':'darts-terms.html';
 const title=ru?'Термины дартса: 180, bust, checkout, bogey и другие | Checkout Lab':'Darts terms explained: 180, bust, checkout, bogey and more | Checkout Lab';
 const description=ru?'Словарь дартса простыми словами: что такое 180, тон, перебор (bust), закрытие, Double Out, bogey numbers, средний набор и другие термины.':'A plain-English darts glossary: 180, ton, bust, checkout, Double Out, bogey numbers, the three-dart average and more.';
 const items=TERMS.map(([id,rt,rd,et,ed])=>({id,t:ru?rt:et,d:ru?rd:ed}));
 const body=`<section class="hero"><div><span class="eyebrow">${ru?'СЛОВАРЬ':'GLOSSARY'}</span><h1>${ru?'Термины дартса':'Darts terms'}</h1><p>${ru?'Короткие объяснения слов, которые звучат на турнирах и в трансляциях.':'Short explanations of the words you hear at tournaments and on TV.'}</p><div class="seo-actions"><a class="seo-primary" href="./">${ru?'Открыть счётчик':'Open scorer'}</a><a class="seo-secondary" href="./checkout-table.html">${ru?'Таблица закрытий':'Checkout table'}</a></div></div></section>
<section><dl class="terms">${items.map(i=>`<div class="seo-card" id="${i.id}"><dt>${esc(i.t)}</dt><dd>${esc(i.d)}</dd></div>`).join('')}</dl></section>`;
 const jsonld=[{'@context':'https://schema.org','@type':'DefinedTermSet',name:ru?'Термины дартса':'Darts terms',url:SITE+path,hasDefinedTerm:items.map(i=>({'@type':'DefinedTerm',name:i.t,description:i.d,url:`${SITE}${path}#${i.id}`}))},
  {'@context':'https://schema.org','@type':'FAQPage',mainEntity:items.slice(0,7).map(i=>({'@type':'Question',name:ru?`Что такое ${i.t}?`:`What is ${i.t}?`,acceptedAnswer:{'@type':'Answer',text:i.d}}))}];
 return page({lang,path,altPath,title,description,body,jsonld});
}


/* ---------- game guides ---------- */
const card=([h,p])=>`<article class="seo-card"><h3>${esc(h)}</h3><p>${p}</p></article>`;
function guidePage(lang,{slug,title,description,eyebrow,h1,lead,cta,aside,sections,faq}){
 const ru=lang==='ru',path=`${ru?'':'en/'}${slug}`,altPath=`${ru?'en/':''}${slug}`;
 const body=`<section class="hero"><div><span class="eyebrow">${eyebrow}</span><h1>${h1}</h1><p>${lead}</p><div class="seo-actions">${cta.map(([href,label],i)=>`<a class="${i?'seo-secondary':'seo-primary'}" href="${href}">${label}</a>`).join('')}</div></div><aside class="seo-card">${aside}</aside></section>
<section>${sections.join('\n')}
<h2>${ru?'Вопросы':'FAQ'}</h2><div class="seo-faq">${faq.map(([q,a])=>`<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div></section>`;
 const jsonld=[{'@context':'https://schema.org','@type':'FAQPage',mainEntity:faq.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))},
  {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Checkout Lab',item:SITE+(ru?'':'en/')},{'@type':'ListItem',position:2,name:h1,item:SITE+path}]}];
 return page({lang,path,altPath,title,description,body,jsonld});
}
const GUIDES={
 'darts-cricket.html':{
  ru:{title:'Крикет в дартс: правила и счётчик онлайн | Checkout Lab',description:'Правила крикета в дартс простыми словами: сектора 15–20 и Bull, отметки, очки и победа. Бесплатный счётчик Cricket на телефоне и ПК, до 8 игроков.',
   eyebrow:'CRICKET · 15–20 · BULL',h1:'Крикет в дартс',lead:'Cricket — вторая по популярности игра в дартс после 501. Нужно первым «закрыть» сектора 15–20 и Bull и при этом не отстать по очкам. Checkout Lab ведёт счёт отметок и очков за вас.',
   cta:[['./?mode=cricket','Открыть счётчик Cricket'],['./darts-training.html','Тренировки']],
   aside:'<h3>Коротко о правилах</h3><p>В игре участвуют только 15, 16, 17, 18, 19, 20 и Bull. Каждый сектор нужно закрыть тремя отметками: одиночный — 1, удвоение — 2, утроение — 3. Внешний Bull — 1 отметка, центр — 2.</p>',
   sections:['<h2>Как играть в крикет</h2><div class="seo-grid three">'+[['1. Отметки','Каждое попадание в сектор 15–20 или Bull даёт отметки: одиночный сектор — одну, удвоение — две, утроение — три. Три отметки закрывают сектор.'],['2. Очки','Если сектор закрыт у вас, но открыт хотя бы у одного соперника, лишние попадания приносят очки по стоимости сектора. Bull стоит 25.'],['3. Победа','Лег выигрывает тот, кто первым закрыл все семь секторов и при этом имеет столько же очков, сколько соперники, или больше.']].map(card).join('')+'</div>',
    '<h2>Пример подхода</h2><div class="score-example"><b>T20</b><span>закрыл 20 →</span><b>S20</b><span>+20 очков →</span><b>D19</b><span>2 отметки на 19</span></div><p>После такого подхода у игрока закрыт сектор 20, 20 очков и две отметки на 19. Соперник может «отрезать» очки, закрыв 20 у себя.</p>',
    '<h2>Что умеет счётчик Cricket</h2><div class="seo-grid three">'+[['Табло отметок','Классические знаки /, X и Ⓧ для каждого игрока, закрытые всеми сектора гаснут.'],['MPR','Среднее число отметок за раунд (marks per round) — главный показатель уровня в крикете.'],['Отмена и леги','Отмена любого дротика, матч до нескольких легов, до 8 игроков, офлайн.']].map(card).join('')+'</div>'],
   faq:[['Какие сектора используются в крикете?','Только 15, 16, 17, 18, 19, 20 и Bull. Попадания в остальные сектора не считаются.'],['Сколько попаданий нужно, чтобы закрыть сектор?','Три отметки: одиночный сектор даёт одну, удвоение — две, утроение — три. Например, одно утроение сразу закрывает сектор.'],['Как в крикете начисляются очки?','Попадания по сектору, который вы уже закрыли, а соперник ещё нет, приносят очки по стоимости сектора: 15–20 или 25 за Bull.'],['Кто побеждает в крикете?','Тот, кто первым закрыл все семь секторов и имеет не меньше очков, чем каждый соперник.'],['Что такое MPR?','Marks per round — среднее количество отметок за подход из трёх дротиков. 2,0+ — уверенный любитель, 3,0+ — сильный игрок.']]},
  en:{title:'Cricket darts rules and free online scorer | Checkout Lab',description:'Cricket darts rules in plain English: numbers 15–20 and Bull, marks, points and how to win. Free Cricket scoreboard for phone and desktop, up to 8 players.',
   eyebrow:'CRICKET · 15–20 · BULL',h1:'Cricket darts',lead:'Cricket is the most popular darts game after 501. Be the first to close 15–20 and the Bull without falling behind on points. Checkout Lab tracks every mark and point for you.',
   cta:[['./?mode=cricket','Open Cricket scorer'],['./darts-training.html','Practice games']],
   aside:'<h3>Rules in short</h3><p>Only 15, 16, 17, 18, 19, 20 and Bull count. Each number is closed with three marks: a single is 1, a double 2, a treble 3. The outer bull is one mark, the bullseye two.</p>',
   sections:['<h2>How to play Cricket</h2><div class="seo-grid three">'+[['1. Marks','Every hit on 15–20 or the Bull scores marks: single — one, double — two, treble — three. Three marks close the number.'],['2. Points','Once you have closed a number, extra hits score its value while at least one opponent still has it open. The Bull is worth 25.'],['3. Winning','The leg goes to the first player to close all seven numbers with as many points as every opponent or more.']].map(card).join('')+'</div>',
    '<h2>Example visit</h2><div class="score-example"><b>T20</b><span>closes 20 →</span><b>S20</b><span>+20 points →</span><b>D19</b><span>2 marks on 19</span></div><p>After this visit the player has 20 closed, 20 points and two marks on 19. The opponent can stop the scoring by closing 20 too.</p>',
    '<h2>Cricket scorer features</h2><div class="seo-grid three">'+[['Mark board','Classic /, X and Ⓧ marks for every player; numbers closed by everyone fade out.'],['MPR','Marks per round — the key Cricket stat, calculated live.'],['Undo and legs','Undo any dart, play several legs, up to 8 players, works offline.']].map(card).join('')+'</div>'],
   faq:[['Which numbers are used in Cricket?','Only 15, 16, 17, 18, 19, 20 and the Bull. Other numbers do not count.'],['How many hits close a number?','Three marks: a single gives one, a double two, a treble three. One treble closes a number straight away.'],['How do you score points in Cricket?','Hits on a number you have closed but an opponent has not score its value: 15–20, or 25 for the Bull.'],['Who wins a game of Cricket?','The first player to close all seven numbers with at least as many points as every opponent.'],['What is MPR in darts?','Marks per round — the average number of marks per three-dart visit. 2.0+ is a solid amateur, 3.0+ is a strong player.']]}
 },
 'darts-training.html':{
  ru:{title:'Тренировки в дартс: Around the Clock, Bob’s 27, 121 | Checkout Lab',description:'Упражнения для дартса с подсчётом очков: Around the Clock (круг 1–20), Bob’s 27 для удвоений, 121 Checkout для закрытий, игра против компьютера. Бесплатно и офлайн.',
   eyebrow:'ТРЕНИРОВКА',h1:'Тренировки в дартс',lead:'Четыре проверенных упражнения, которые используют игроки любого уровня. Счётчик ведёт очки, рекорды и процент попаданий — вам остаётся только бросать.',
   cta:[['./?train=bobs','Начать тренировку'],['./?mode=clock','Around the Clock']],
   aside:'<h3>Что тренировать</h3><p><strong>Точность</strong> — Around the Clock. <strong>Удвоения</strong> — Bob’s 27 и круг по удвоениям. <strong>Закрытия</strong> — 121 Checkout и квиз маршрутов. <strong>Игровой ритм</strong> — матч 501 против компьютера.</p>',
   sections:['<h2>Around the Clock</h2><p>Попадите по очереди в каждый сектор от 1 до 20, затем в Bull. Подходит любое попадание — одиночное, удвоение или утроение. Можно играть одному на время или с друзьями: побеждает тот, кто первым попал в Bull. Отличное упражнение на точность и знание мишени.</p>',
    '<h2>Bob’s 27</h2><p>Классика для удвоений, придуманная тренером Бобом Андерсоном. Старт — 27 очков. Бросайте по три дротика в D1, D2 … D20 и Bull. Каждое попадание прибавляет стоимость удвоения, ни одного попадания — вычитает её. Счёт 0 или меньше — игра окончена. Максимум — 1437.</p><div class="score-example"><b>27</b><span>D1 ×0 → </span><b>25</b><span>D2 ×2 →</span><b>33</b><span>D3 ×1 →</span><b>39</b></div>',
    '<h2>121 Checkout</h2><p>Закройте 121 за 9 дротиков (три подхода) с Double Out. Получилось — цель растёт на 1, нет — снижается на 1, но не ниже 121. Приложение подсказывает маршрут и фиксирует ваш рекорд.</p>',
    '<h2>Игра против компьютера</h2><div class="seo-grid three">'+[['Пять уровней','Новичок (≈35), любитель (≈50), клубный (≈65), сильный (≈80) и профи (≈95 очков за подход).'],['Честный бросок','Бот бросает по настоящей геометрии мишени с разбросом — мажет мимо удвоений, ловит перебор и закрывает как живой игрок.'],['Сеты и леги','Матч 301/501 до нужного числа легов или сетов, статистика и история.']].map(card).join('')+'</div>'],
   faq:[['Как тренировать удвоения в дартс?','Bob’s 27 и круг по удвоениям: по три дротика в каждое удвоение от D1 до Bull. Следите за процентом попаданий и рекордом.'],['Что такое Around the Clock?','Упражнение и игра: нужно по порядку попасть в сектора от 1 до 20 и в Bull. Подходит для разминки и детей.'],['Какой максимальный счёт в Bob’s 27?','1437 — если все три дротика попадают в каждое удвоение от D1 до D20 и в Bull.'],['Можно ли играть в дартс с компьютером?','Да, в Checkout Lab есть бот для 301/501 с пятью уровнями: от новичка до профи.']]},
  en:{title:'Darts practice games: Around the Clock, Bob’s 27, 121 | Checkout Lab',description:'Darts practice routines with scoring: Around the Clock, Bob’s 27 for doubles, 121 Checkout for finishing, and 501 against the computer. Free and offline.',
   eyebrow:'PRACTICE',h1:'Darts practice games',lead:'Four proven routines used by players of every level. The scorer keeps your points, records and hit rate — you just throw.',
   cta:[['./?train=bobs','Start practice'],['./?mode=clock','Around the Clock']],
   aside:'<h3>What to practise</h3><p><strong>Accuracy</strong> — Around the Clock. <strong>Doubles</strong> — Bob’s 27 and the doubles round. <strong>Finishing</strong> — 121 Checkout and the route quiz. <strong>Match rhythm</strong> — 501 against the computer.</p>',
   sections:['<h2>Around the Clock</h2><p>Hit every number from 1 to 20 in order, then the Bull. Any segment counts — single, double or treble. Play solo against the clock or with friends: the first to hit the Bull wins. Great for accuracy and learning the board.</p>',
    '<h2>Bob’s 27</h2><p>The classic doubles routine created by coach Bob Anderson. Start on 27. Throw three darts at D1, D2 … D20 and the Bull. Each hit adds the double’s value; no hits subtracts it. Reach 0 or below and the game is over. The maximum is 1437.</p><div class="score-example"><b>27</b><span>D1 ×0 →</span><b>25</b><span>D2 ×2 →</span><b>33</b><span>D3 ×1 →</span><b>39</b></div>',
    '<h2>121 Checkout</h2><p>Check out 121 within 9 darts (three visits), Double Out. Succeed and the target goes up by one; miss and it drops by one, never below 121. The app shows the route and tracks your best.</p>',
    '<h2>Play against the computer</h2><div class="seo-grid three">'+[['Five levels','Beginner (≈35), amateur (≈50), club (≈65), strong (≈80) and pro (≈95 three-dart average).'],['Realistic throws','The bot throws on real board geometry with scatter — it misses doubles, busts and checks out like a real player.'],['Sets and legs','301/501 matches to any number of legs or sets, with stats and history.']].map(card).join('')+'</div>'],
   faq:[['How do I practise doubles in darts?','Bob’s 27 and the doubles round: three darts at every double from D1 to Bull. Track your hit rate and best score.'],['What is Around the Clock in darts?','A practice game where you hit 1 to 20 in order and finish on the Bull. Great as a warm-up and for kids.'],['What is the maximum score in Bob’s 27?','1437 — all three darts on every double from D1 to D20 and the Bull.'],['Can I play darts against a computer?','Yes. Checkout Lab has a 301/501 bot with five levels from beginner to pro.']]}
 }
 ,'darts-tournament.html':{
  ru:{title:'Турнирная сетка для дартса онлайн — плей-офф и круговой | Checkout Lab',description:'Бесплатная турнирная сетка для дартса на 3–16 игроков: плей-офф или круговой турнир, 501, 301 или Cricket. Матчи запускаются из сетки, победители проходят дальше сами.',
   eyebrow:'ТУРНИР · 3–16 ИГРОКОВ',h1:'Турнир по дартсу',lead:'Соберите друзей или клуб: Checkout Lab построит сетку, проведёт жеребьёвку и сам переведёт победителей в следующий раунд. Каждый матч считается тем же счётчиком с подсказками закрытий.',
   cta:[['./','Создать турнир'],['./darts-games.html','Другие игры']],
   aside:'<h3>Два формата</h3><p><strong>Плей-офф</strong> — проигравший выбывает, при нечётном числе игроков часть проходит дальше без матча. <strong>Круговой</strong> — каждый играет с каждым, таблица по победам и разнице легов.</p>',
   sections:['<h2>Как провести турнир</h2><div class="seo-grid three">'+[['1. Участники','Откройте «Турнир», впишите от 3 до 16 игроков, выберите 501, 301 или Cricket и число легов.'],['2. Сетка','Жеребьёвка расставит игроков. Нажмите «Играть» у любого готового матча — откроется обычный счётчик.'],['3. Победитель','После матча результат попадает в сетку, победитель проходит дальше. В конце — чемпион турнира.']].map(card).join('')+'</div>'],
   faq:[['Сколько игроков может быть в турнире?','От 3 до 16. В плей-офф при числе игроков не равном 4, 8 или 16 сильнейшие по жребию проходят первый раунд без матча.'],['Как определяется победитель кругового турнира?','По числу побед, при равенстве — по разнице выигранных и проигранных легов.'],['Можно ли переиграть матч?','Да, результат можно сбросить, пока не сыгран следующий матч с участием победителя.'],['Нужен ли интернет?','Нет. Сетка хранится на устройстве и работает офлайн.']]},
  en:{title:'Free darts tournament bracket — knockout and round robin | Checkout Lab',description:'Free darts tournament bracket for 3–16 players: knockout or round robin, 501, 301 or Cricket. Start matches from the bracket and winners advance automatically.',
   eyebrow:'TOURNAMENT · 3–16 PLAYERS',h1:'Darts tournament',lead:'Gather your friends or club: Checkout Lab draws the bracket and moves winners on automatically. Every match uses the same scorer with checkout hints.',
   cta:[['./','Create a tournament'],['./darts-games.html','More games']],
   aside:'<h3>Two formats</h3><p><strong>Knockout</strong> — lose and you are out; with an uneven field some players get a bye. <strong>Round robin</strong> — everyone plays everyone, ranked by wins and leg difference.</p>',
   sections:['<h2>How to run a tournament</h2><div class="seo-grid three">'+[['1. Players','Open “Tournament”, enter 3–16 players, pick 501, 301 or Cricket and the number of legs.'],['2. Bracket','The draw places everyone. Tap “Play” on any ready match to open the normal scorer.'],['3. Winner','Results go straight into the bracket and the winner advances. At the end you get a champion.']].map(card).join('')+'</div>'],
   faq:[['How many players can join?','From 3 to 16. In a knockout with a field other than 4, 8 or 16, some players get a first-round bye.'],['How is a round robin decided?','By wins, then by leg difference.'],['Can a match be replayed?','Yes — clear the result as long as the winner has not played the next match yet.'],['Does it need internet?','No. The bracket is stored on your device and works offline.']]}
 },
 'darts-games.html':{
  ru:{title:'Игры в дартс: Shanghai, Killer, Double In — правила и счётчик | Checkout Lab',description:'Правила популярных игр в дартс для компании: Shanghai, Killer, Cricket, Around the Clock и 301 с Double In. Бесплатный счётчик для телефона и ПК.',
   eyebrow:'ИГРЫ ДЛЯ КОМПАНИИ',h1:'Игры в дартс',lead:'Кроме 501 есть десятки игр, которые веселее в компании. Checkout Lab считает самые популярные из них — выбирайте режим на экране «Новая игра».',
   cta:[['./?mode=shanghai','Играть в Shanghai'],['./?mode=killer','Играть в Killer']],
   aside:'<h3>Что выбрать</h3><p><strong>Shanghai</strong> — быстрая игра на 7 раундов. <strong>Killer</strong> — на выбывание для 3+ игроков. <strong>Cricket</strong> — тактика. <strong>Double In</strong> — клубное правило для 301.</p>',
   sections:['<h2>Shanghai</h2><p>Семь раундов: в первом бросают в 1, во втором — в 2 и так далее. Одиночный сектор приносит номер раунда, удвоение — вдвое больше, утроение — втрое. Если за один подход попасть в одиночный, удвоение и утроение номера раунда — это «Shanghai» и мгновенная победа. Иначе после 7 раундов побеждает тот, у кого больше очков.</p><div class="score-example"><b>S3</b><span>+3</span><b>D3</b><span>+6</span><b>T3</b><span>Shanghai!</span></div>',
    '<h2>Killer</h2><p>Каждому игроку достаётся свой номер и три жизни. Сначала нужно попасть в удвоение своего номера — так игрок становится «киллером». После этого каждое попадание в удвоение соперника отнимает у него жизнь, а в своё — у себя. Побеждает последний, у кого остались жизни.</p>',
    '<h2>Double In</h2><p>Вариант 301/501, в котором очки начинают считаться только после попадания в удвоение. Дротики до первого удвоения не засчитываются. Включается на экране «Новая игра» в поле «Начало».</p>',
    '<h2>Ещё режимы</h2><p><a href="./darts-cricket.html">Cricket</a> · <a href="./darts-training.html">Around the Clock, Bob’s 27 и 121</a> · <a href="./darts-tournament.html">Турнир</a></p>'],
   faq:[['Что такое Shanghai в дартс?','Игра на 7 раундов, где целью служит номер раунда. Одиночный, удвоение и утроение одного числа за подход — «Shanghai» и победа.'],['Как играть в Killer в дартс?','У каждого свой номер и 3 жизни. Попадите в своё удвоение, чтобы стать киллером, затем выбивайте жизни соперников попаданием в их удвоения.'],['Что значит Double In?','Очки начинают засчитываться только после попадания в удвоение. Обычно используется в 301.']]},
  en:{title:'Darts games: Shanghai, Killer, Double In — rules and scorer | Checkout Lab',description:'Rules for popular party darts games: Shanghai, Killer, Cricket, Around the Clock and 301 Double In. Free scorer for phone and desktop.',
   eyebrow:'PARTY GAMES',h1:'Darts games',lead:'Beyond 501 there are dozens of games that are more fun in a group. Checkout Lab scores the most popular ones — pick a mode on the New game screen.',
   cta:[['./?mode=shanghai','Play Shanghai'],['./?mode=killer','Play Killer']],
   aside:'<h3>Which one?</h3><p><strong>Shanghai</strong> — a quick 7-round game. <strong>Killer</strong> — elimination for 3+ players. <strong>Cricket</strong> — tactics. <strong>Double In</strong> — a club rule for 301.</p>',
   sections:['<h2>Shanghai</h2><p>Seven rounds: round 1 targets 1, round 2 targets 2 and so on. A single scores the round number, a double twice that, a treble three times. Hit the single, double and treble of the target in one visit — a “Shanghai” — and you win instantly. Otherwise the highest score after 7 rounds wins.</p><div class="score-example"><b>S3</b><span>+3</span><b>D3</b><span>+6</span><b>T3</b><span>Shanghai!</span></div>',
    '<h2>Killer</h2><p>Everyone gets a number and three lives. First hit the double of your own number to become a “killer”. After that every hit on an opponent’s double costs them a life — and on your own, one of yours. The last player with lives left wins.</p>',
    '<h2>Double In</h2><p>A 301/501 variant where scoring only starts once you hit a double. Darts before the first double do not count. Turn it on under “Start” on the New game screen.</p>',
    '<h2>More modes</h2><p><a href="./darts-cricket.html">Cricket</a> · <a href="./darts-training.html">Around the Clock, Bob’s 27 and 121</a> · <a href="./darts-tournament.html">Tournament</a></p>'],
   faq:[['What is Shanghai in darts?','A 7-round game where the target is the round number. Single, double and treble of that number in one visit is a “Shanghai” and wins.'],['How do you play Killer darts?','Everyone has a number and 3 lives. Hit your own double to become a killer, then take lives by hitting opponents’ doubles.'],['What does Double In mean?','Scoring only starts after hitting a double. Common in 301.']]}
 }

};

/* ---------- build ---------- */
for(let n=2;n<=170;n++){write(`checkout/${n}.html`,checkoutPage(n,'ru'));write(`en/checkout/${n}.html`,checkoutPage(n,'en'));}
write('darts-terms.html',termsPage('ru'));write('en/darts-terms.html',termsPage('en'));
for(const [slug,langs] of Object.entries(GUIDES)){write(slug,guidePage('ru',{slug,...langs.ru}));write(`en/${slug}`,guidePage('en',{slug,...langs.en}));}

const base=['','checkout-table.html','checkout-calculator.html','darts-501.html','darts-301.html','double-out.html','darts-terms.html','darts-cricket.html','darts-training.html','darts-tournament.html','darts-games.html'];
for(let n=170;n>=2;n--)base.push(`checkout/${n}.html`);
const urls=[];
for(const [lang,prefix] of [['ru',''],['en','en/']])for(const p of base){
 const ru=SITE+p,en=SITE+'en/'+p,loc=lang==='ru'?ru:en;
 urls.push(`  <url>\n    <loc>${loc}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <xhtml:link rel="alternate" hreflang="ru" href="${ru}"/>\n    <xhtml:link rel="alternate" hreflang="en" href="${en}"/>\n    <xhtml:link rel="alternate" hreflang="x-default" href="${ru}"/>\n  </url>`);
}
write('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`);
console.log(`Built ${169*2} checkout pages, 2 glossary pages, 8 guide pages, sitemap with ${urls.length} URLs`);
