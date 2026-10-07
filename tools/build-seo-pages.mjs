// Generates the SEO reference pages:
//   checkout/2.html … checkout/170.html   (RU)
//   en/checkout/2.html … en/checkout/170.html (EN)
//   darts-terms.html, en/darts-terms.html (glossary)
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
 ru:{home:'',locale:'ru_RU',nav:[['darts-501.html','Счётчик 501'],['checkout-calculator.html','Калькулятор закрытий'],['checkout-table.html','Таблица'],['darts-terms.html','Термины']],lang:'EN',
  ogAlt:'Checkout Lab — счётчик дартса 301/501'},
 en:{home:'en/',locale:'en_US',nav:[['darts-501.html','501 scorer'],['checkout-calculator.html','Checkout calculator'],['checkout-table.html','Checkout table'],['darts-terms.html','Darts terms']],lang:'RU',
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
<link rel="icon" href="${root}favicon-48.png" type="image/png" sizes="48x48"><link rel="stylesheet" href="${root}styles.css"><link rel="stylesheet" href="${root}seo.css">
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

/* ---------- build ---------- */
for(let n=2;n<=170;n++){write(`checkout/${n}.html`,checkoutPage(n,'ru'));write(`en/checkout/${n}.html`,checkoutPage(n,'en'));}
write('darts-terms.html',termsPage('ru'));write('en/darts-terms.html',termsPage('en'));

const base=['','checkout-table.html','checkout-calculator.html','darts-501.html','darts-301.html','double-out.html','darts-terms.html'];
for(let n=170;n>=2;n--)base.push(`checkout/${n}.html`);
const urls=[];
for(const [lang,prefix] of [['ru',''],['en','en/']])for(const p of base){
 const ru=SITE+p,en=SITE+'en/'+p,loc=lang==='ru'?ru:en;
 urls.push(`  <url>\n    <loc>${loc}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <xhtml:link rel="alternate" hreflang="ru" href="${ru}"/>\n    <xhtml:link rel="alternate" hreflang="en" href="${en}"/>\n    <xhtml:link rel="alternate" hreflang="x-default" href="${ru}"/>\n  </url>`);
}
write('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`);
console.log(`Built ${169*2} checkout pages, 2 glossary pages, sitemap with ${urls.length} URLs`);
