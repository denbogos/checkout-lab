(() => {
'use strict';

const STORAGE='checkout-lab-session-v1';
const LEGACY_STORAGE='checkout-lab-game-v2';
const SETTINGS='checkout-lab-settings-v3';
const COLORS=['#e83f5b','#43d08a','#f7b844','#6aa7ff','#bd75ff','#ff7d4d'];
const BOGEY=new Set([169,168,166,165,163,162,159]);
const preferredDoubles=['D20','D16','D18','D12','D10','D8','D14','D6','D4','D2','D1','BULL'];
const canonical={
170:['T20','T20','BULL'],167:['T20','T19','BULL'],164:['T20','T18','BULL'],161:['T20','T17','BULL'],160:['T20','T20','D20'],158:['T20','T20','D19'],156:['T20','T20','D18'],154:['T20','T18','D20'],152:['T20','T20','D16'],150:['T20','T18','D18'],148:['T20','T16','D20'],146:['T20','T18','D16'],144:['T20','T20','D12'],142:['T20','T14','D20'],140:['T20','T20','D10'],138:['T20','T18','D12'],136:['T20','T20','D8'],134:['T20','T14','D16'],132:['BULL','BULL','D16'],130:['T20','T20','D5'],128:['T18','T18','D10'],126:['T19','T19','D6'],124:['T20','T16','D8'],121:['T20','T11','D14'],120:['T20','S20','D20'],118:['T20','S18','D20'],116:['T20','S16','D20'],114:['T20','S14','D20'],112:['T20','S12','D20'],110:['T20','S10','D20'],108:['T20','S16','D16'],106:['T20','S14','D16'],104:['T18','S18','D16'],102:['T20','S10','D16'],100:['T20','D20'],98:['T20','D19'],96:['T20','D18'],94:['T18','D20'],92:['T20','D16'],90:['T18','D18'],88:['T16','D20'],86:['T18','D16'],84:['T20','D12'],82:['T14','D20'],80:['T20','D10'],78:['T18','D12'],76:['T20','D8'],74:['T14','D16'],72:['T16','D12'],70:['T18','D8'],68:['T20','D4'],66:['T10','D18'],64:['T16','D8'],62:['T10','D16'],61:['T15','D8'],
60:['S20','D20'],59:['S19','D20'],58:['S18','D20'],57:['S17','D20'],56:['S16','D20'],
55:['S15','D20'],54:['S14','D20'],53:['S13','D20'],52:['S12','D20'],51:['S11','D20'],
50:['BULL'],49:['S9','D20'],48:['S16','D16'],47:['S15','D16'],46:['S14','D16'],
45:['S13','D16'],44:['S12','D16'],43:['S11','D16'],42:['S10','D16'],41:['S9','D16']
};

const hit=(label,value,multiplier,number)=>({label,value,multiplier,number,isDouble:multiplier===2,isTreble:multiplier===3});
const MISS={label:'MISS',value:0,multiplier:0,number:0,isDouble:false,isTreble:false};
const ALL=[MISS];
for(let n=1;n<=20;n++){ALL.push(hit(`S${n}`,n,1,n),hit(`D${n}`,n*2,2,n),hit(`T${n}`,n*3,3,n));}
ALL.push(hit('25',25,1,25),hit('BULL',50,2,25));
const byLabel=Object.fromEntries(ALL.map(h=>[h.label,h]));
const finishers=ALL.filter(h=>h.isDouble);
const playable=ALL.filter(h=>h.label!=='MISS');
const POSSIBLE_VISIT_TOTALS=(()=>{const set=new Set();for(const a of ALL)for(const b of ALL)for(const c of ALL)set.add(a.value+b.value+c.value);return set;})();
let wakeLockSentinel=null;

function motionReduced(){return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;}
function playSound(kind='score'){if(state.sound)window.CheckoutAudio?.play(kind);}
function haptic(kind='score'){
 if(!state.vibration||!navigator.vibrate)return;
 const patterns={tap:8,back:10,confirm:14,score:12,double:[10,18,14],treble:[9,14,9],bull:[14,20,26],bust:55,'180':[16,22,16,22,46],leg:[18,28,62],match:[20,28,35,30,82]};
 try{navigator.vibrate(patterns[kind]??12);}catch{}
}
function animatePress(el,strong=false){
 if(!el||motionReduced()||!el.animate)return;
 el.getAnimations?.().forEach(a=>a.cancel());
 el.animate([
  {transform:'translate3d(0,0,0) scale(1)'},
  {transform:`translate3d(0,${strong?2:1}px,0) scale(${strong ? .955 : .972})`,offset:.34},
  {transform:'translate3d(0,0,0) scale(1.018)',offset:.72},
  {transform:'translate3d(0,0,0) scale(1)'}
 ],{duration:strong?220:150,easing:'cubic-bezier(.2,.85,.25,1)'});
}
function punchScore(kind='score'){
 if(motionReduced())return;
 const big=kind==='180'||kind==='leg'||kind==='match'||kind==='bust';
 document.querySelectorAll('.score-ring>strong,.m-hero>strong').forEach(el=>{
  if(!el.animate)return;el.getAnimations?.().forEach(a=>a.cancel());
  const frames=kind==='180'?[
   {transform:'scale(1)'},{transform:'scale(.90)',offset:.16},{transform:'scale(1.105)',offset:.43},{transform:'scale(.985)',offset:.72},{transform:'scale(1)'}
  ]:kind==='bust'?[
   {transform:'translate3d(0,0,0) scale(1)'},{transform:'translate3d(-3px,0,0) scale(.97)',offset:.22},{transform:'translate3d(3px,0,0) scale(1.02)',offset:.48},{transform:'translate3d(0,0,0) scale(1)'}
  ]:[
   {transform:'scale(1)'},{transform:`scale(${big ? .94 : .965})`,offset:.24},{transform:`scale(${big?1.065:1.035})`,offset:.62},{transform:'scale(1)'}
  ];
  el.animate(frames,{duration:kind==='180'?480:big?340:230,easing:'cubic-bezier(.18,.9,.22,1)'});
 });
 if(big)document.querySelectorAll('.score-stage,.m-hero').forEach(stage=>{
  if(!stage.animate)return;
  const frames=kind==='bust'?[
   {transform:'translate3d(0,0,0)'},{transform:'translate3d(-3px,0,0)'},{transform:'translate3d(3px,0,0)'},{transform:'translate3d(-2px,0,0)'},{transform:'translate3d(0,0,0)'}
  ]:[
   {transform:'translate3d(0,0,0)'},{transform:'translate3d(-2px,1px,0)'},{transform:'translate3d(3px,-1px,0)'},{transform:'translate3d(0,0,0)'}
  ];
  stage.animate(frames,{duration:kind==='180'?190:160,easing:'ease-out'});
 });
}
function runMomentMotion(kind){
 requestAnimationFrame(()=>{
  punchScore(kind);
  const moment=document.querySelector('.game-moment');
  if(moment&&!motionReduced()&&moment.animate){
   moment.animate([
    {filter:'brightness(1)',textShadow:'0 10px 50px rgb(0 0 0/.55)'},
    {filter:'brightness(1.35)',textShadow:'0 0 28px currentColor,0 12px 55px rgb(0 0 0/.58)',offset:.28},
    {filter:'brightness(1)',textShadow:'0 10px 50px rgb(0 0 0/.55)'}
   ],{duration:620,easing:'ease-out'});
  }
 });
}
function isPossibleVisitTotal(v){return Number.isInteger(v)&&v>=0&&v<=180&&POSSIBLE_VISIT_TOTALS.has(v);}
function prefixReachable(total,maxDarts=2){if(total===0)return true;if(total<0)return false;for(const a of ALL){if(a.value===total)return true;if(maxDarts>=2)for(const b of ALL)if(a.value+b.value===total)return true;}return false;}
function validFinishDoubles(total){const preferred=(canonical[total]||[]).at(-1);return finishers.filter(f=>prefixReachable(total-f.value,2)).sort((a,b)=>{if(a.label===preferred)return -1;if(b.label===preferred)return 1;const ai=preferredDoubles.indexOf(a.label),bi=preferredDoubles.indexOf(b.label);return (ai<0?99:ai)-(bi<0?99:bi);});}
function validCheckoutDartCounts(total,doubleLabel){const d=byLabel[doubleLabel];if(!d?.isDouble)return[];const rest=total-d.value,out=[];if(rest===0)out.push(1);if(rest>=0&&ALL.some(a=>a.value===rest))out.push(2);if(rest>=0&&ALL.some(a=>ALL.some(b=>a.value+b.value===rest)))out.push(3);return [...new Set(out)];}

async function syncWakeLock(){
 const should=state.wakeLock&&state.screen==='game'&&!!state.game&&!state.game.winner&&document.visibilityState==='visible';
 if(!should){if(wakeLockSentinel){try{await wakeLockSentinel.release();}catch{}wakeLockSentinel=null;}return;}
 if(wakeLockSentinel||!('wakeLock' in navigator))return;
 try{wakeLockSentinel=await navigator.wakeLock.request('screen');wakeLockSentinel.addEventListener('release',()=>{wakeLockSentinel=null;});}catch{wakeLockSentinel=null;}
}
function toggleFocusMode(){state.focusMode=!state.focusMode;document.body.classList.toggle('focus-mode',state.focusMode);if(state.focusMode){document.documentElement.requestFullscreen?.().catch(()=>{});}else if(document.fullscreenElement){document.exitFullscreen?.().catch(()=>{});}save();render();}


function hitRank(h,pos,total){
 if(pos===total-1){const i=preferredDoubles.indexOf(h.label);return i<0?40:i;}
 if(h.isTreble)return Math.max(0,20-h.number);
 if(h.label==='BULL')return 34;
 if(h.multiplier===1)return 45+Math.max(0,20-h.number);
 return 80;
}
function routeRank(route){return route.length*100+route.reduce((s,h,i)=>s+hitRank(h,i,route.length),0)-route.slice(0,-1).filter(h=>h.isTreble).length*12;}
function normalizeCheckoutRoute(route){
 const out=[...route],setupEnd=Math.max(0,out.length-1);
 const trebles=out.slice(0,setupEnd).filter(h=>h.isTreble).sort((a,b)=>b.number-a.number);
 let ti=0;for(let i=0;i<setupEnd;i++)if(out[i].isTreble)out[i]=trebles[ti++];
 return out;
}
const routeCache=new Map();
function checkoutRoutes(score,darts=3,limit=4){
 const key=`${score}-${darts}-${limit}`; if(routeCache.has(key)) return routeCache.get(key);
 if(score<2||score>170||darts<1)return [];
 const routes=[];
 for(const f of finishers)if(f.value===score)routes.push([f]);
 if(darts>=2)for(const a of playable)for(const f of finishers)if(a.value+f.value===score)routes.push([a,f]);
 if(darts>=3)for(const a of playable)for(const b of playable){const left=score-a.value-b.value;for(const f of finishers)if(f.value===left)routes.push([a,b,f]);}
 const normalized=routes.map(normalizeCheckoutRoute);
 const unique=[...new Map(normalized.map(r=>[r.map(h=>h.label).join('-'),r])).values()];
 const pref=normalizeCheckoutRoute((canonical[score]||[]).map(label=>byLabel[label]).filter(Boolean)).map(h=>h.label).join('-');
 unique.sort((a,b)=>{const ak=a.map(h=>h.label).join('-'),bk=b.map(h=>h.label).join('-');if(ak===pref)return -1;if(bk===pref)return 1;return routeRank(a)-routeRank(b);});
 const out=unique.slice(0,limit);routeCache.set(key,out);return out;
}
function preparation(score){
 const candidates=ALL.filter(h=>h.isTreble||h.label==='BULL').map(h=>({hit:h,remainder:score-h.value})).filter(c=>c.remainder>1&&!BOGEY.has(c.remainder)).map(c=>({...c,routes:checkoutRoutes(c.remainder,3,1)})).filter(c=>c.routes.length);
 candidates.sort((a,b)=>a.routes[0].length-b.routes[0].length||routeRank(a.routes[0])-routeRank(b.routes[0]));return candidates[0]||null;
}

const DEFAULT_LANGUAGE=window.CheckoutI18n?.detect?.()||((navigator.language||'ru').toLowerCase().startsWith('ru')?'ru':'en');
const state={
 screen:'setup', theme:'dark', language:DEFAULT_LANGUAGE, mode:501, customScore:701, names:DEFAULT_LANGUAGE==='en'?['Player 1','Player 2']:['Даня','Соперник'], legs:3,
 game:null, undo:[], redo:[], inputMode:'visit', multiplier:1, visitValue:'', mobileMenu:false, settingsOpen:false, checkoutConfirm:null, search:'', historyOpen:false, moment:null, previewPlayerId:null,
 sound:false, vibration:false, wakeLock:true, focusMode:false, inputError:'', lastSubmitAt:0, editLastOpen:false, editLastValue:'', editLastDouble:'', editLastDarts:3
};

function clone(x){return JSON.parse(JSON.stringify(x));}
function id(){return (crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`);}
function newPlayer(name,index,score){return{id:id(),name,score,color:COLORS[index%COLORS.length],darts:0,total:0,visits:0,high:0,wins:0};}
function save(){
 try{localStorage.setItem(STORAGE,JSON.stringify({game:state.game,undo:state.undo,redo:state.redo}));}catch{}
 try{localStorage.setItem(SETTINGS,JSON.stringify({theme:state.theme,names:state.names,legs:state.legs,mode:state.mode,customScore:state.customScore,language:state.language,sound:state.sound,vibration:state.vibration,wakeLock:state.wakeLock,focusMode:state.focusMode}));}catch{}
}
function integerBetween(value,min,max){return Number.isInteger(value)&&value>=min&&value<=max;}
function validStoredPlayer(player,startScore){
 return player&&typeof player.id==='string'&&typeof player.name==='string'&&player.name.length<=80&&typeof player.color==='string'&&
  integerBetween(player.score,0,startScore)&&['darts','total','visits','high','wins'].every(key=>Number.isInteger(player[key])&&player[key]>=0);
}
function validStoredVisit(visit,playerIds){
 return visit&&playerIds.has(visit.playerId)&&integerBetween(Number(visit.total),0,180)&&Array.isArray(visit.hits)&&visit.hits.length>=1&&visit.hits.length<=3&&
  visit.hits.every(hit=>hit&&typeof hit.label==='string'&&Number.isFinite(Number(hit.value)));
}
function normalizeGame(game){
 if(!game||!integerBetween(game.startScore,2,5001)||!Array.isArray(game.players)||!integerBetween(game.players.length,1,8)||!integerBetween(game.active,0,game.players.length-1)||!integerBetween(game.legsToWin,1,99))return null;
 if(!game.players.every(player=>validStoredPlayer(player,game.startScore)))return null;
 const playerIds=new Set(game.players.map(player=>player.id));if(playerIds.size!==game.players.length)return null;
 if(!Array.isArray(game.current)||game.current.length>3||!game.current.every(hit=>hit&&typeof hit.label==='string'&&Number.isFinite(Number(hit.value))))return null;
 if(!Array.isArray(game.history)||!game.history.every(visit=>validStoredVisit(visit,playerIds)))return null;
 if(game.winner!==null&&game.winner!==undefined&&!playerIds.has(game.winner))return null;
 const completedLegs=game.players.reduce((sum,p)=>sum+(Number.isInteger(p?.wins)&&p.wins>0?p.wins:0),0);
 if(!Number.isInteger(game.legStarter)||game.legStarter<0||game.legStarter>=game.players.length)game.legStarter=completedLegs%game.players.length;
 if(!Number.isInteger(game.legNumber)||game.legNumber<1)game.legNumber=completedLegs+1;
 return game;
}
function applyStoredSettings(settings){
 if(!settings||typeof settings!=='object')return;
 if(settings.theme==='dark'||settings.theme==='light')state.theme=settings.theme;
 if(Array.isArray(settings.names)){const names=settings.names.slice(0,8).map(name=>String(name).slice(0,80));if(names.some(name=>name.trim()))state.names=names;}
 if(integerBetween(settings.legs,1,7))state.legs=settings.legs;
 if([0,301,501].includes(settings.mode))state.mode=settings.mode;
 if(integerBetween(settings.customScore,2,5001))state.customScore=settings.customScore;
 if(settings.language==='ru'||settings.language==='en')state.language=settings.language;
 for(const key of ['sound','vibration','wakeLock','focusMode'])if(typeof settings[key]==='boolean')state[key]=settings[key];
}
function load(){
 try{const session=JSON.parse(localStorage.getItem(STORAGE)||'null');if(session?.game?.players){state.game=normalizeGame(session.game);state.undo=Array.isArray(session.undo)?session.undo.map(normalizeGame).filter(Boolean):[];state.redo=Array.isArray(session.redo)?session.redo.map(normalizeGame).filter(Boolean):[];}else{const legacy=JSON.parse(localStorage.getItem(LEGACY_STORAGE)||'null');if(legacy?.players)state.game=normalizeGame(legacy);}}catch{}
 try{applyStoredSettings(JSON.parse(localStorage.getItem(SETTINGS)||'null'));}catch{}
 const fixed=document.documentElement?.dataset?.lang;if(fixed==='ru'||fixed==='en')state.language=fixed;
}
function setLanguage(language){
 const next=language==='en'?'en':'ru';window.CheckoutI18n?.saveLanguage?.(next);
 const isEnglish=location.pathname==='/en/'||location.pathname.endsWith('/en/index.html');
 if(next==='en'&&!isEnglish){location.href='/en/';return;}
 if(next==='ru'&&isEnglish){location.href='/';return;}
 state.language=next;save();render();
}
function snapshot(){if(!state.game)return;state.undo.push(clone(state.game));if(state.undo.length>40)state.undo.shift();state.redo=[];}
function activePlayer(){return state.game?.players[state.game.active]||null;}
function previewPlayer(){return state.previewPlayerId?state.game?.players.find(p=>p.id===state.previewPlayerId)||null:null;}
function displayPlayer(){return previewPlayer()||activePlayer();}
function currentTotal(){return (state.game?.current||[]).reduce((s,h)=>s+h.value,0);}
function remaining(){const p=activePlayer();return p?p.score-currentTotal():0;}
function avg(p){return p.darts?(p.total/p.darts*3).toFixed(1):'—';}

function startGame(){
 const custom=Math.trunc(Number(state.customScore));const score=state.mode===0?Math.min(5001,Math.max(2,Number.isFinite(custom)?custom:501)):state.mode;
 const players=state.names.map(n=>n.trim()).filter(Boolean).map((n,i)=>newPlayer(n,i,score));if(!players.length)return;
 state.game={startScore:score,players,active:0,legStarter:0,legNumber:1,current:[],history:[],legsToWin:Number(state.legs)||1,winner:null};state.undo=[];state.redo=[];state.visitValue='';state.inputError='';state.previewPlayerId=null;state.screen='game';save();render();
}
function applyRecordedVisit(game,visit){
 const idx=game.players.findIndex(x=>x.id===visit.playerId);if(idx<0)return game;game.active=idx;const p=game.players[idx],start=p.score,total=Number(visit.total)||0,bust=!!visit.bust,checkout=!!visit.checkout,dartCount=Number(visit.dartCount)||3;
 p.darts+=dartCount;p.total+=bust?0:total;p.visits++;p.high=Math.max(p.high,bust?0:total);
 let nextActive=(idx+1)%game.players.length;
 if(checkout){p.wins++;if(p.wins>=game.legsToWin){game.winner=p.id;nextActive=idx;}else{game.legStarter=(Number.isInteger(game.legStarter)?game.legStarter:0)+1;game.legStarter%=game.players.length;game.legNumber=(Number.isInteger(game.legNumber)?game.legNumber:1)+1;game.players=game.players.map(x=>({...x,score:game.startScore}));nextActive=game.legStarter;}}
 else if(!bust)p.score=start-total;
 game.history.push({...clone(visit),start,dartCount});game.active=nextActive;game.current=[];return game;
}
function rebuildGame(history){
 const g=state.game;if(!g)return null;const base={startScore:g.startScore,players:g.players.map(p=>({id:p.id,name:p.name,color:p.color,score:g.startScore,darts:0,total:0,visits:0,high:0,wins:0})),active:0,legStarter:0,legNumber:1,current:[],history:[],legsToWin:g.legsToWin,winner:null};
 for(const v of history)applyRecordedVisit(base,v);return base;
}
function finishVisit(hits,forcedBust=false,dartCount=hits.length){
 const g=state.game,p=activePlayer();if(!g||!p||!hits.length)return;
 snapshot();const total=hits.reduce((sum,h)=>sum+h.value,0),left=p.score-total,last=hits[hits.length-1];
 const checkout=left===0&&last.isDouble&&!forcedBust,bust=forcedBust||left<0||left===1||(left===0&&!last.isDouble);
 const next=clone(g);applyRecordedVisit(next,{playerId:p.id,start:p.score,hits,total,bust,checkout,dartCount});state.game=next;state.visitValue='';state.inputError='';state.previewPlayerId=null;
 const kind=bust?'bust':checkout?(next.winner?'match':'leg'):total===180?'180':'score';state.moment=bust?{label:'BUST',tone:'bust',at:Date.now()}:checkout?{label:next.winner?'МАТЧ!':'LEG!',tone:'leg',at:Date.now()}:total===180?{label:'180!',tone:'max',at:Date.now()}:null;
 playSound(kind);haptic(kind);save();render();runMomentMotion(kind);
 if(state.moment){const stamp=state.moment.at;setTimeout(()=>{if(state.moment?.at===stamp){state.moment=null;render();}},900);}
}
function addDart(h){
 const g=state.game,p=activePlayer();if(!g||!p||g.winner)return;const hits=[...g.current,h],left=p.score-hits.reduce((sum,x)=>sum+x.value,0),bad=left===0&&!h.isDouble;
 if(left<0||left===1||bad)return finishVisit(hits,true);if(left===0||hits.length===3)return finishVisit(hits);
 const kind=h.label==='BULL'?'bull':h.isTreble?'treble':h.isDouble?'double':'tap';playSound(kind);haptic(kind);
 snapshot();g.current=hits;save();render();runMomentMotion('score');
}
function requestVisitSubmit(){
 const now=Date.now();if(now-state.lastSubmitAt<300)return;const value=Number(state.visitValue),g=state.game,p=activePlayer();if(!g||!p||state.visitValue===''||!Number.isInteger(value)||value<0||value>180)return;
 if(!isPossibleVisitTotal(value)){state.inputError=`${value} нельзя набрать за 3 дротика`;render();return;}
 state.inputError='';state.lastSubmitAt=now;
 if(p.score-value===0){const doubles=validFinishDoubles(value);if(!doubles.length){state.inputError='Нет корректного Double Out для этой суммы';render();return;}const selected=doubles[0].label,counts=validCheckoutDartCounts(value,selected);state.checkoutConfirm={value,doubles:doubles.map(d=>d.label),selected,darts:counts[0]||3};render();return;}
 finishVisit([{label:`Σ${value}`,value,multiplier:1,number:value,isDouble:false,isTreble:false}],false,3);
}
function confirmCheckout(label){
 const data=state.checkoutConfirm;if(!data)return;const value=data.value;state.checkoutConfirm=null;const d=byLabel[label];if(!d?.isDouble)return;const h={label:`Σ${value} · ${label}`,value,multiplier:2,number:value,isDouble:true,isTreble:false,finishLabel:label};finishVisit([h],false,Number(data.darts)||3);
}
function cancelCheckout(){state.checkoutConfirm=null;state.lastSubmitAt=0;render();}
function undo(){if(!state.undo.length||!state.game)return;state.redo.push(clone(state.game));state.game=normalizeGame(state.undo.pop());state.visitValue='';state.inputError='';state.previewPlayerId=null;save();render();}
function redo(){if(!state.redo.length||!state.game)return;state.undo.push(clone(state.game));state.game=normalizeGame(state.redo.pop());state.visitValue='';state.inputError='';state.previewPlayerId=null;save();render();}
function nav(screen){state.screen=screen;state.mobileMenu=false;state.settingsOpen=false;save();render();}
function openEditLast(){const v=state.game?.history?.at(-1);if(!v)return;state.editLastOpen=true;state.editLastValue=String(v.total);state.editLastDarts=Number(v.dartCount)||3;state.editLastDouble=v.checkout?(v.hits?.at(-1)?.finishLabel||String(v.hits?.at(-1)?.label||'').match(/D\d+|BULL/)?.[0]||''):'';render();}
function deleteLastVisit(){if(!state.game?.history.length)return;snapshot();state.game=rebuildGame(state.game.history.slice(0,-1));state.editLastOpen=false;state.visitValue='';state.inputError='';save();render();}
function applyEditedLastVisit(){
 if(!state.game?.history.length)return;const value=Number(state.editLastValue);if(!isPossibleVisitTotal(value)){state.inputError=`${value} нельзя набрать за 3 дротика`;render();return;}
 const history=state.game.history.slice(0,-1),base=rebuildGame(history);if(!base)return;const p=base.players[base.active],left=p.score-value;let finish='';if(left===0){const valid=validFinishDoubles(value).map(d=>d.label);if(!valid.length)return;if(!valid.includes(state.editLastDouble))state.editLastDouble=valid[0];finish=state.editLastDouble;}
 snapshot();const checkout=left===0&&!!finish,bust=left<0||left===1||(left===0&&!finish),h={label:`Σ${value}${finish?` · ${finish}`:''}`,value,multiplier:finish?2:1,number:value,isDouble:!!finish,isTreble:false,finishLabel:finish||undefined};applyRecordedVisit(base,{playerId:p.id,start:p.score,hits:[h],total:value,bust,checkout,dartCount:checkout?Number(state.editLastDarts)||3:3});state.game=base;state.editLastOpen=false;state.visitValue='';state.inputError='';save();render();
}
function updateVisitInputUI({punch=true}={}){
 const desktop=document.getElementById('visit-desktop');if(desktop&&desktop.value!==state.visitValue)desktop.value=state.visitValue;
 const desktopPreview=document.querySelector('.desktop-preview');if(desktopPreview)desktopPreview.innerHTML=visitPreview();
 document.querySelectorAll('.m-entry-v3 .m-value').forEach(el=>{el.textContent=state.visitValue||'0–180';el.classList.toggle('filled',!!state.visitValue);if(punch)animatePress(el);});
 document.querySelectorAll('.m-entry-v3 .entry-preview').forEach(el=>{el.innerHTML=previewPlayer()?`<span>ввод для <b>${esc(activePlayer()?.name||'')}</b></span>`:visitPreview();window.CheckoutI18n?.apply?.(el,state.language);});
 if(desktopPreview)window.CheckoutI18n?.apply?.(desktopPreview,state.language);
}
function keypad(k){
 state.inputError='';
 if(k==='ok'){playSound('confirm');haptic('confirm');return requestVisitSubmit();}
 if(k==='back'){state.visitValue=state.visitValue.slice(0,-1);playSound('back');haptic('back');}
 else if(/^\d$/.test(k)){const next=(state.visitValue+k).replace(/^0+(?=\d)/,'');if(Number(next)<=180&&next.length<=3){state.visitValue=next;playSound('tap');haptic('tap');}}
 updateVisitInputUI();
}
function quick(v){state.visitValue=String(v);state.inputError='';playSound('tap');haptic('tap');updateVisitInputUI();}
function esc(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

const ICONS={
 target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 play:'<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l5.5-3.5z" fill="currentColor" stroke="none"/>',
 route:'<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8.2 18H14a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h5.8"/>',
 table:'<rect x="3.5" y="4" width="17" height="16" rx="2.5"/><path d="M3.5 9.5h17M9.5 9.5V20"/>',
 stats:'<path d="M5 20v-7M12 20V5M19 20v-11"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
 moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
 sliders:'<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
 menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
 close:'<path d="M6 6l12 12M18 6 6 18"/>',
 undo:'<path d="M9 13.5 4 8.5l5-5"/><path d="M4 8.5h10.5a5.5 5.5 0 0 1 0 11H11"/>',
 redo:'<path d="m15 13.5 5-5-5-5"/><path d="M20 8.5H9.5a5.5 5.5 0 0 0 0 11H13"/>',
 back:'<path d="M20.5 5H9l-6 7 6 7h11.5a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z"/><path d="m11.5 9.5 5 5M16.5 9.5l-5 5"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
 arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
 check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
 edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',
 users:'<circle cx="9" cy="8" r="3.2"/><path d="M3 19.5c.7-3.3 3-5 6-5s5.3 1.7 6 5"/><path d="M16 5.2a3 3 0 0 1 0 5.6M17.5 14.6c1.8.6 3 2.2 3.5 4.9"/>',
 offline:'<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.2" r="1.1" fill="currentColor" stroke="none"/><path d="M3 3l18 18"/>',
 expand:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z"/>',
 sound:'<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>',
 vibrate:'<rect x="8" y="3.5" width="8" height="17" rx="2"/><path d="M4.5 8v8M19.5 8v8"/>',
 screen:'<rect x="3.5" y="4.5" width="17" height="12" rx="2"/><path d="M9 20h6M12 16.5V20"/>'
};
function icon(name,cls=''){return `<svg class="ico${cls?` ${cls}`:''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name]||''}</svg>`;}
function switchMark(on){return `<i class="switch ${on?'on':''}" aria-hidden="true"></i>`;}
function legPips(p,g){const total=Math.max(1,Math.min(g.legsToWin,9)),wins=Math.min(p.wins,total);return `<span class="leg-pips" title="${p.wins}/${g.legsToWin}">${'<i class="on"></i>'.repeat(wins)}${'<i></i>'.repeat(total-wins)}</span>`;}
function progressOf(score){const g=state.game;if(!g)return 0;return Math.round(Math.min(1,Math.max(0,1-score/g.startScore))*1000)/10;}
function header(){
 const item=(screen,ic,label)=>`<button class="nav-item ${state.screen===screen?'active':''}" data-nav="${screen}">${icon(ic)}<span>${label}</span></button>`;
 return `<header class="topbar"><button class="brand" data-nav="setup" aria-label="Checkout Lab"><span class="brand-mark">${icon('target')}</span><span class="brand-name">Checkout<b>Lab</b></span></button><nav class="topnav">${item('setup','plus','Новая игра')}${state.game?item('game','play','Матч'):''}${item('checkouts','route','Закрытия')}<button class="nav-item" data-table-link>${icon('table')}<span>Таблица 2–170</span></button>${item('stats','stats','Статистика')}</nav><div class="top-actions"><button class="icon-button lang-toggle" aria-label="Язык" title="Язык">${state.language==='ru'?'EN':'RU'}</button><button class="icon-button settings-toggle" aria-label="Настройки" title="Настройки">${icon('sliders')}</button><button class="icon-button theme-toggle" aria-label="Сменить тему" title="Сменить тему">${icon(state.theme==='dark'?'sun':'moon')}</button></div><button class="mobile-menu-button ${state.mobileMenu?'open':''}" aria-label="Меню" aria-expanded="${state.mobileMenu}">${icon(state.mobileMenu?'close':'menu')}</button></header>`;
}
function mobileMenu(){
 if(!state.mobileMenu)return'';
 const item=(screen,ic,label)=>`<button class="mm-link ${state.screen===screen?'active':''}" data-nav="${screen}">${icon(ic)}<span>${label}</span></button>`;
 const row=(cls,ic,label,on)=>`<button class="mm-row ${cls}" aria-pressed="${on}">${icon(ic)}<span>${label}</span>${switchMark(on)}</button>`;
 return `<div class="mobile-menu-backdrop"></div><div class="mobile-menu" role="menu"><div class="mm-links">${item('setup','plus','Новая игра')}${state.game?item('game','play','Матч'):''}${item('checkouts','route','Закрытия')}<button class="mm-link" data-table-link>${icon('table')}<span>Таблица закрытий 2–170</span></button>${item('stats','stats','Статистика')}</div><div class="mm-group">${state.game?`<button class="mm-row focus-toggle">${icon('expand')}<span>Режим у мишени</span><em>⛶</em></button>`:''}${row('sound-toggle','sound','Звук',state.sound)}${row('vibration-toggle','vibrate','Вибрация',state.vibration)}${row('wake-toggle','screen','Экран не гаснет',state.wakeLock)}${row('theme-toggle','sun','Светлая тема',state.theme==='light')}<button class="mm-row lang-toggle">${icon('globe')}<span>Язык</span><em>${state.language==='ru'?'RU':'EN'}</em></button></div></div>`;
}

function setupView(){
 const features=[['route','Подсказки закрытий','Маршруты Double Out от 2 до 170'],['users','До 8 игроков','Очередь, леги и статистика'],['offline','Работает офлайн','Установи на телефон как приложение']];
 return `<section class="setup-page"><div class="setup-intro"><span class="kicker">ДАРТС БЕЗ ЛИШНЕГО</span><h1>Бросай.<br><span class="accent-line">Мы посчитаем.</span></h1><p>Счётчик для дартса 301/501: точные закрытия, Double Out, до 8 игроков. Работает без интернета.</p>${state.game?`<button class="continue" data-nav="game">${icon('play')}<span>Продолжить текущий матч</span></button>`:''}<ul class="feature-list">${features.map(([ic,t,s])=>`<li><span class="feature-icon">${icon(ic)}</span><div><b>${t}</b><small>${s}</small></div></li>`).join('')}</ul></div><div class="setup-card panel"><div class="step"><span>01</span><div><h2>Выбери игру</h2><p>Double Out включён</p></div></div><div class="mode-grid">${[301,501,0].map(v=>`<button data-mode="${v}" class="${state.mode===v?'active':''}" aria-pressed="${state.mode===v}"><strong>${v||'СВОЯ'}</strong><small>${v?'очков':'режим'}</small></button>`).join('')}</div>${state.mode===0?`<label class="field-label">Начальный счёт<input id="custom-score" type="number" min="2" max="5001" value="${state.customScore}"></label>`:''}<div class="step"><span>02</span><div><h2>Добавь игроков</h2><p>От одного до восьми</p></div></div><div class="name-list">${state.names.map((n,i)=>`<div class="name-row"><span class="name-num" style="--player:${COLORS[i%COLORS.length]}">${i+1}</span><input class="player-name" data-index="${i}" value="${esc(n)}" placeholder="Игрок ${i+1}" aria-label="Имя игрока ${i+1}" maxlength="40">${state.names.length>1?`<button class="remove-player" data-index="${i}" aria-label="Удалить игрока ${i+1}">${icon('close')}</button>`:'<span></span>'}</div>`).join('')}</div>${state.names.length<8?`<button class="add-player">${icon('plus')}<span>Добавить игрока</span></button>`:''}<div class="settings-row"><label>Легов для победы<select id="legs-select">${[1,2,3,4,5,6,7].map(n=>`<option ${state.legs===n?'selected':''}>${n}</option>`).join('')}</select></label><span class="rules-note">Double Out · Bull разрешён</span></div><button class="start-button"><span>НАЧАТЬ МАТЧ</span>${icon('arrow')}</button></div></section>`;
}
function playerCards(mobile=false){const g=state.game;if(!g)return'';return g.players.map((p,i)=>{const active=i===g.active,preview=state.previewPlayerId===p.id&&!active;return `<div class="${mobile?'m-player':'player'} ${active?'active':''} ${preview?'previewing':''}" style="--player:${p.color}" data-preview-player="${p.id}" role="button" tabindex="0" title="${active?'Текущий ход':'Показать выход на закрытие'}"><span class="${mobile?'m-player-line':'player-dot'}"></span><div class="player-copy"><strong>${esc(p.name)}</strong><small>${preview?'ПРОСМОТР · ':active&&mobile?'ХОД · ':''}AVG ${avg(p)}</small></div><b class="player-score">${p.score}</b>${legPips(p,g)}</div>`;}).join('');}
function nextTurnMarkup(compact=false){const g=state.game;if(!g||g.players.length<2)return'';const ordered=[];for(let k=1;k<g.players.length;k++)ordered.push(g.players[(g.active+k)%g.players.length]);if(compact)return `<span class="next-player"><span>СЛЕДУЮЩИЙ</span> <b>${esc(ordered[0].name)}</b></span>`;return `<div class="turn-queue"><span>ОЧЕРЕДЬ</span><div class="queue-list">${ordered.map(p=>`<b style="--player:${p.color}">${esc(p.name)}</b>`).join('')}</div></div>`;}
function routeHtml(route){return route.map(h=>`<b class="route-hit ${h.isTreble?'treble':h.isDouble?(h.label==='BULL'?'bull-hit':'double'):h.label==='BULL'?'bull-hit':'single-hit'}">${h.label}</b>`).join('<i aria-hidden="true">→</i>');}
function visitTrail(v){const fin=v.checkout?(v.hits?.at(-1)?.finishLabel||String(v.hits?.at(-1)?.label||'').match(/D\d+|BULL/)?.[0]||''):'';if(!Number.isInteger(v.start))return v.hits.map(h=>esc(h.label)).join(' · ');const after=v.bust?v.start:v.checkout?0:v.start-v.total;return `${v.start} → ${after}${fin?` · ${esc(fin)}`:''}`;}
function historyRows(limit=7){const g=state.game;if(!g)return'';return g.history.slice(-limit).reverse().map((v,i)=>{const p=g.players.find(x=>x.id===v.playerId),editable=i===0;return `<div class="visit ${editable?'editable-last':''} ${v.checkout?'is-checkout':''}" style="--player:${p?.color||'#888'}" ${editable?'data-edit-last="1" role="button" tabindex="0" aria-label="Изменить последний подход" title="Изменить последний подход"':''}><span class="visit-name">${esc(p?.name||'')}</span><span class="visit-trail">${visitTrail(v)}</span><b class="${v.bust?'bust':''}">${v.bust?'BUST':v.total}</b>${editable?`<i class="edit-mark" aria-hidden="true">${icon('edit')}</i>`:''}</div>`;}).join('');}
function adviceMarkup(mobile=false,scoreOverride=null,preview=false){
 const rem=scoreOverride??remaining(),darts=preview?3:Math.max(1,3-(state.game?.current.length||0)),routes=checkoutRoutes(rem,darts,4);
 if(routes.length){const alts=routes.slice(1,mobile?2:4);return `<div class="${mobile?'m-advice checkout':'checkout-advice checkout-live'} ${preview?'preview-advice':''}"><span class="eyebrow">${preview?'ВЫХОД ИГРОКА':'ВЫХОД НА ЗАКРЫТИЕ'}</span><strong class="route-main">${routeHtml(routes[0])}</strong>${alts.length?`<div class="route-alts">${alts.map(r=>`<span class="route-alt">${routeHtml(r)}</span>`).join('')}</div>`:''}</div>`;}
 const prep=preparation(rem),prepText=prep?`${prep.hit.label} → оставить ${prep.remainder}`:'Набирай максимум';
 if(preview)return `<div class="${mobile?'m-advice':'checkout-advice'} preview-no-checkout"><span class="eyebrow">ЗАКРЫТИЯ НЕТ</span><strong>${prepText}</strong></div>`;
 if(mobile){const last=state.game?.history.at(-1),lp=last&&state.game.players.find(x=>x.id===last.playerId);return `<div class="m-advice compact-recent"><span class="eyebrow">ПОСЛЕДНИЙ</span><strong>${last?`<i style="background:${lp?.color||'#888'}"></i>${esc(lp?.name||'')} · ${last.bust?'BUST':last.total}`:'Матч только начался'}</strong><button class="open-history">История ›</button></div>`;}
 return `<div class="checkout-advice is-setup"><span class="eyebrow">ПОДГОТОВКА</span><strong>${prepText}</strong></div>`;
}
function historyDrawer(){if(!state.historyOpen||!state.game)return'';return `<div class="drawer-backdrop close-history"><section class="history-drawer panel" role="dialog" aria-modal="true" aria-labelledby="history-title" onclick="event.stopPropagation()"><div class="drawer-handle"></div><div class="drawer-head"><div><span class="eyebrow">ИСТОРИЯ МАТЧА</span><strong id="history-title">Последние подходы</strong></div><button class="close-history icon-button" aria-label="Закрыть историю">${icon('close')}</button></div><div class="drawer-list visit-list">${historyRows(18)||'<div class="empty-mini">Подходов пока нет</div>'}</div></section></div>`;}
function momentOverlay(){return state.moment?`<div class="game-moment ${state.moment.tone}" role="status" aria-live="assertive">${state.moment.label}</div>`:'';}
function winnerScoreline(g){const w=g.players.find(p=>p.id===g.winner);if(!w)return'';if(g.players.length===2){const o=g.players.find(p=>p.id!==g.winner);return `${w.wins} : ${o?.wins||0}`;}return g.players.map(p=>`${esc(p.name)} ${p.wins}`).join(' · ');}
function winnerCard(g,cls){const w=g.players.find(x=>x.id===g.winner);return `<div class="${cls}" style="--player:${w?.color||'#e83f5b'}"><span class="winner-mark">${icon('target')}</span><span class="eyebrow">ПОБЕДИТЕЛЬ МАТЧА</span><h1>${esc(w?.name||'')}</h1><div class="winner-score">${winnerScoreline(g)}</div><div class="winner-actions"><button class="primary play-again">${icon('play')}<span>Сыграть ещё</span></button><button class="ghost-button" data-nav="stats">${icon('stats')}<span>Статистика</span></button></div></div>`;}
function desktopGame(){const g=state.game,p=activePlayer(),view=displayPlayer();if(!g||!p||!view)return'';if(g.winner)return `<section class="game-layout desktop-game winner-layout">${winnerCard(g,'winner panel')}</section>`;
 const preview=!!previewPlayer(),rem=preview?view.score:remaining();
 return `<section class="game-layout desktop-game ${preview?'is-previewing':''}"><aside class="players-panel panel"><div class="panel-title"><b>ИГРОКИ</b><span>НАЖМИ ДЛЯ ВЫХОДА</span></div><div class="desktop-player-list">${playerCards()}</div>${nextTurnMarkup(false)}</aside><section class="score-stage panel" style="--player:${view.color}"><div class="stage-topline"><div class="turn-label"><span class="turn-dot"></span><div><small>${preview?'ПРОСМОТР ЗАКРЫТИЯ':'СЕЙЧАС БРОСАЕТ'}</small><b>${esc(view.name)}</b></div></div>${preview?`<div class="preview-live-actions"><span class="live-turn-pill">ХОД: <b>${esc(p.name)}</b> · ${p.score}</span><button class="clear-preview stage-back">${icon('undo')}<span>Вернуться</span></button></div>`:`<div class="stage-meta"><span class="stage-chip">${g.startScore} · DOUBLE OUT</span><span class="stage-chip strong">ЛЕГ ${g.legNumber||1}</span></div>`}</div><div class="score-ring ${preview?'preview-ring':''}" style="--p:${progressOf(Math.max(0,rem))}" role="status" aria-live="polite" aria-atomic="true"><small>${preview?'СЧЁТ ИГРОКА':'ОСТАЛОСЬ'}</small><strong>${Math.max(0,rem)}</strong><span>${preview?'3 ДРОТИКА · ПРОСМОТР':g.current.length?g.current.map(h=>h.label).join(' · '):'3 ДРОТИКА'}</span></div>${adviceMarkup(false,rem,preview)}</section><aside class="input-panel panel"><div class="desktop-entry-head"><div><span class="eyebrow">ВВОД ПОДХОДА</span><strong>Введите сумму</strong><small class="entry-subtitle">для ${esc(p.name)} · цифры → Enter</small></div><div class="history-actions"><button class="icon-button undo" aria-label="Отменить последний подход" title="Отменить последний подход" ${!state.undo.length?'disabled':''}>${icon('undo')}</button><button class="icon-button redo" aria-label="Вернуть отменённый подход" title="Вернуть подход" ${!state.redo.length?'disabled':''}>${icon('redo')}</button></div></div>${desktopVisitInput()}<div class="desktop-history"><div class="history-title">${icon('clock')}<span>Последние подходы</span><small>${g.history.length}</small></div><div class="visit-list">${historyRows(8)||'<div class="empty-mini">Подходов пока нет</div>'}</div></div></aside></section>`;}
function desktopVisitInput(){const p=activePlayer();return `<div class="desktop-keyboard-entry" style="--player:${p?.color||'#e83f5b'}"><label class="desktop-score-box" for="visit-desktop"><span class="score-box-label">СУММА ПОДХОДА</span><input class="desktop-score-input" id="visit-desktop" inputmode="numeric" autocomplete="off" autofocus value="${state.visitValue}" placeholder="0–180" maxlength="3"></label><div class="entry-preview desktop-preview">${visitPreview()}</div><button class="desktop-enter-bar submit-visit" type="button"><kbd>ENTER</kbd><strong>Записать подход</strong></button><div class="keyboard-hint"><span><kbd>0–9</kbd>введите сумму</span><span><kbd>Ctrl Z</kbd>отменить</span><span><kbd>Ctrl ⇧ Z</kbd>вернуть</span></div></div>`;}
function mobileGame(){const g=state.game,p=activePlayer(),view=displayPlayer();if(!g||!p||!view)return'';if(g.winner)return `<section class="mobile-game is-winner">${winnerCard(g,'m-winner')}</section>`;
 const preview=!!previewPlayer(),rem=preview?view.score:remaining(),quickValues=[26,41,45,60,81,85,100,140,180],count=g.players.length;
 return `<section class="mobile-game players-count-${count} ${preview?'is-previewing':''}"><div class="mobile-scoreboard players-${count}">${playerCards(true)}</div><div class="m-hero ${preview?'preview-hero':''}" style="--player:${view.color};--p:${progressOf(Math.max(0,rem))}" role="status" aria-live="polite" aria-atomic="true"><div class="m-turn"><span class="turn-dot"></span><b>${esc(view.name)}</b><em>${preview?'ПРОСМОТР':'ХОД'}</em></div><button class="open-history m-history-btn" aria-label="История матча" title="История матча">${icon('clock')}</button><small>${preview?'СЧЁТ ИГРОКА':'ОСТАЛОСЬ'}</small><strong>${Math.max(0,rem)}</strong><div class="m-darts">${preview?'3 ДРОТИКА · ВЫХОД':g.current.length?g.current.map(h=>h.label).join(' · '):'3 ДРОТИКА'}</div>${preview?`<div class="m-preview-live"><span class="live-turn-pill">ХОД: <b>${esc(p.name)}</b> · ${p.score}</span><button class="clear-preview m-back-turn">${icon('undo')}<span>Вернуться</span></button></div>`:nextTurnMarkup(true)}<div class="m-progress" aria-hidden="true"><i></i></div></div>${adviceMarkup(true,rem,preview)}<div class="m-entry-v3"><button class="undo-mobile icon-only" aria-label="Отменить последний подход" ${!state.undo.length?'disabled':''}>${icon('undo')}</button><div class="m-value-wrap"><div class="m-value ${state.visitValue?'filled':''}">${state.visitValue||'0–180'}</div><div class="entry-preview">${preview?`<span>ввод для <b>${esc(p.name)}</b></span>`:visitPreview()}</div></div><button class="redo-mobile icon-only" aria-label="Вернуть отменённый подход" ${!state.redo.length?'disabled':''}>${icon('redo')}</button></div><div class="quick-row">${quickValues.map(v=>`<button data-quick="${v}">${v}</button>`).join('')}</div><div class="keypad">${['1','2','3','4','5','6','7','8','9','back','0','ok'].map(k=>`<button data-key="${k}" class="${k==='ok'?'key-ok':k==='back'?'key-back':''}" aria-label="${k==='back'?'Удалить цифру':k==='ok'?'Записать подход':k}">${k==='back'?icon('back'):k==='ok'?'OK':k}</button>`).join('')}</div></section>`;}
function emptyState(title,text){return `<section class="empty-state"><div class="empty-mark">${icon('target')}</div><h1>${title}</h1><p>${text}</p><button class="primary" data-nav="setup">${icon('plus')}<span>Новая игра</span></button></section>`;}
function gameView(){if(!state.game)return emptyState('Матч ещё не начат','Добавь игроков и выбери 301, 501 или свой режим.');return desktopGame()+mobileGame();}
function checkoutTable(){const q=Number(state.search),scores=Array.from({length:110},(_,i)=>170-i).filter(s=>!state.search||s===q);return `<section class="table-page"><div class="page-heading"><span class="kicker">61—170</span><h1>Таблица закрытий</h1><p>Основной маршрут и запасные варианты. Утроения готовят, удвоения закрывают.</p><div class="table-tools"><input id="checkout-search" type="search" inputmode="numeric" placeholder="Найти остаток" aria-label="Найти остаток" value="${esc(state.search)}"><button class="ghost-button" data-table-link>${icon('table')}<span>Таблица 2–170</span></button></div></div><div class="legend"><span><i class="t"></i> утроение</span><span><i class="d"></i> удвоение</span><span><i class="b"></i> Bull</span></div><div class="checkout-grid">${scores.map(score=>{const rs=checkoutRoutes(score,3,3),bad=BOGEY.has(score)||!rs.length;return `<article class="checkout-card ${bad?'impossible':''}"><div class="checkout-number">${score}</div>${bad?'<div class="no-route"><strong>Нет закрытия</strong><small>Подготовь следующий подход</small></div>':`<div class="routes">${rs.map((r,i)=>`<div class="${i?'alt-route':'main-route'}"><small>${i?'ВАРИАНТ':'ОСНОВНОЙ'}</small><span class="route-pills">${routeHtml(r)}</span></div>`).join('')}</div>`}</article>`;}).join('')||'<div class="empty-search">Введите число от 61 до 170.</div>'}</div></section>`;}
function statsView(){const g=state.game;if(!g)return emptyState('Нет статистики','Сначала начни матч.');return `<section class="stats-page"><div class="page-heading"><span class="kicker">ТЕКУЩИЙ МАТЧ</span><h1>Статистика</h1><p>${g.startScore} · Double Out · ${g.history.length} подходов</p></div><div class="stats-grid">${g.players.map(p=>`<article class="stat-card panel" style="--player:${p.color}"><div class="stat-head"><span class="player-bar"></span><h2>${esc(p.name)}</h2>${legPips(p,g)}</div><strong>${p.darts?(p.total/p.darts*3).toFixed(2):'0.00'}<small>средний набор</small></strong><div class="stat-metrics"><span><b>${p.high}</b>лучший подход</span><span><b>${p.darts}</b>дротиков</span><span><b>${p.wins}</b>легов</span><span><b>${g.history.filter(v=>v.playerId===p.id&&v.total===180&&!v.bust).length}</b>180</span></div></article>`).join('')}</div></section>`;}
function confirmModal(){if(!state.checkoutConfirm)return'';const d=state.checkoutConfirm;return `<div class="modal-backdrop"><div class="checkout-modal panel checkout-double-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-dialog-title"><span class="kicker">DOUBLE OUT</span><h2 id="checkout-dialog-title">Чем закрыли ${d.value}?</h2><p>Выберите последнее удвоение. Оно сохранится в истории и статистике матча.</p><div class="double-grid">${d.doubles.map((label,i)=>`<button class="double-choice ${label===d.selected?'recommended':''}" data-select-double="${label}"><b>${label}</b>${i===0?'<small>РЕКОМЕНДУЕТСЯ</small>':''}</button>`).join('')}</div><div class="checkout-darts-label">ДРОТИКОВ В ЗАКРЫТИИ</div><div class="checkout-darts">${validCheckoutDartCounts(d.value,d.selected).map(n=>`<button class="${Number(d.darts)===n?'active':''}" data-checkout-darts="${n}">${n}</button>`).join('')}</div><div class="modal-actions"><button class="confirm-selected-double">${icon('check')}<span>ЗАКРЫТО · ${d.selected}</span></button><button class="confirm-bust">Не закрыли — BUST</button><button class="cancel-confirm">Отмена</button></div></div></div>`;}
function settingsPanel(){if(!state.settingsOpen)return'';const wakeSupported='wakeLock' in navigator;const row=(cls,ic,title,sub,on)=>`<button class="setting-row ${cls}" aria-pressed="${on}"><span class="setting-icon">${icon(ic)}</span><span><b>${title}</b><small>${sub}</small></span>${switchMark(on)}</button>`;return `<div class="modal-backdrop settings-backdrop"><section class="settings-panel panel" role="dialog" aria-modal="true" aria-labelledby="settings-dialog-title"><div class="settings-head"><div><span class="kicker">CHECKOUT LAB</span><h2 id="settings-dialog-title">Настройки матча</h2></div><button class="close-settings icon-button" aria-label="Закрыть настройки">${icon('close')}</button></div><button class="setting-row lang-toggle"><span class="setting-icon">${icon('globe')}</span><span><b>Язык</b><small>${state.language==='ru'?'Русский':'English'}</small></span><em>${state.language==='ru'?'EN':'RU'}</em></button>${row('sound-toggle','sound','Звук интерфейса','Нажатия, броски, 180, BUST, LEG',state.sound)}${row('vibration-toggle','vibrate','Вибрация','Короткий отклик на телефоне',state.vibration)}${row('wake-toggle','screen','Экран не гаснет',wakeSupported?'Активно во время матча':'Не поддерживается браузером',state.wakeLock)}${state.game?`<button class="setting-row focus-toggle"><span class="setting-icon">${icon('expand')}</span><span><b>Режим у мишени</b><small>Полный экран, минимум браузерных элементов</small></span><em>⛶</em></button>`:''}</section></div>`;}
function visitPreview(){const p=activePlayer(),en=state.language==='en';if(!p||state.visitValue==='')return `<span>${en?'Enter visit score':'Введите сумму подхода'}</span>`;const v=Number(state.visitValue);if(!isPossibleVisitTotal(v))return `<span class="preview-impossible">${en?`${v} cannot be scored with 3 darts`:`${v} нельзя набрать за 3 дротика`}</span>`;const left=p.score-v;if(left<0||left===1)return `<span class="preview-bust">${en?'BUST — score stays unchanged':'BUST — счёт не изменится'}</span>`;if(left===0)return `<span class="preview-checkout">${en?'CHECKOUT · choose the finishing double':'ЗАКРЫТИЕ · выберите последнее удвоение'}</span>`;return `<span>${en?'remaining':'останется'} <b>${left}</b></span>`;}
function dartPad(){return `<div class="multipliers">${[[1,'S','ОДИНОЧНЫЙ'],[2,'D','УДВОЕНИЕ'],[3,'T','УТРОЕНИЕ']].map(([m,l,s])=>`<button data-mult="${m}" class="${state.multiplier===m?'active ':''}${m===1?'single':m===2?'double':'treble'}">${l}<small>${s}</small></button>`).join('')}</div><div class="number-grid">${Array.from({length:20},(_,i)=>i+1).map(n=>`<button data-dart="${n}">${n}<small>${n*state.multiplier}</small></button>`).join('')}</div><div class="specials"><button data-special="MISS">MISS</button><button data-special="25">25 <small>OUTER</small></button><button class="bull" data-special="BULL">BULL <small>50</small></button><button class="clear-current" ${!state.game.current.length?'disabled':''}>× Последний</button></div>`;}
function editLastModal(){if(!state.editLastOpen||!state.game?.history.length)return'';const base=rebuildGame(state.game.history.slice(0,-1)),p=base?.players[base.active],v=Number(state.editLastValue||0),left=p?p.score-v:null,valid=left===0?validFinishDoubles(v):[];if(left===0&&valid.length&&!valid.some(d=>d.label===state.editLastDouble))state.editLastDouble=valid[0].label;const editCounts=left===0&&state.editLastDouble?validCheckoutDartCounts(v,state.editLastDouble):[];if(editCounts.length&&!editCounts.includes(Number(state.editLastDarts)))state.editLastDarts=editCounts[0];return `<div class="modal-backdrop"><div class="checkout-modal panel edit-visit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-dialog-title"><span class="kicker">ПОСЛЕДНИЙ ПОДХОД</span><h2 id="edit-dialog-title">Исправить результат</h2><p>${p?`${esc(p.name)} · было ${state.game.history.at(-1).total}`:''}</p><input id="edit-last-value" inputmode="numeric" maxlength="3" value="${esc(state.editLastValue)}" aria-label="Новая сумма">${!isPossibleVisitTotal(v)?`<div class="edit-error">${v} нельзя набрать за 3 дротика</div>`:''}${left===0&&valid.length?`<div class="edit-double-label">Последнее удвоение</div><div class="double-grid compact">${valid.map((d,i)=>`<button class="edit-double-choice ${d.label===state.editLastDouble?'recommended':''}" data-edit-double="${d.label}">${d.label}${i===0?'<small>РЕК.</small>':''}</button>`).join('')}</div><div class="checkout-darts-label">ДРОТИКОВ В ЗАКРЫТИИ</div><div class="checkout-darts">${editCounts.map(n=>`<button class="${Number(state.editLastDarts)===n?'active':''}" data-edit-darts="${n}">${n}</button>`).join('')}</div>`:''}<button class="save-edit" ${!isPossibleVisitTotal(v)?'disabled':''}>Сохранить</button><button class="delete-last">Удалить подход</button><button class="cancel-edit">Отмена</button></div></div>`;}


function render(){
 document.documentElement.dataset.theme=state.theme;document.body.className=`${state.screen==='game'?'game-screen ':''}${state.focusMode?'focus-mode':''}`.trim();
 const content=state.screen==='setup'?setupView():state.screen==='game'?gameView():state.screen==='checkouts'?checkoutTable():statsView();
 const app=document.getElementById('app');app.innerHTML=`<main class="app ${state.theme==='light'?'light':''}">${header()}${mobileMenu()}${content}${historyDrawer()}${momentOverlay()}${confirmModal()}${settingsPanel()}${editLastModal()}</main>`;window.CheckoutI18n?.apply?.(app,state.language);window.CheckoutI18n?.applyMeta?.(state.language,'app');bind();syncWakeLock();
 const dialog=app.querySelector?.('[role="dialog"]');if(dialog)requestAnimationFrame(()=>dialog.querySelector('input,button,select,[tabindex="0"]')?.focus({preventScroll:true}));
 if(state.screen==='game'&&state.game?.players.length>=5&&window.matchMedia?.('(max-width:768px)').matches){requestAnimationFrame(()=>document.querySelector('.mobile-scoreboard .m-player.active')?.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'}));}
 if(typeof document.dispatchEvent==='function'&&typeof Event==='function')document.dispatchEvent(new Event('checkoutlab:render'));
}
function bind(){
 document.querySelectorAll('[data-nav]').forEach(el=>el.onclick=()=>nav(el.dataset.nav));
 document.querySelectorAll('[data-table-link]').forEach(el=>el.onclick=()=>{location.href='./checkout-table.html';});
 document.querySelectorAll('.theme-toggle').forEach(el=>el.onclick=()=>{state.theme=state.theme==='dark'?'light':'dark';save();render();});
 document.querySelectorAll('.lang-toggle').forEach(el=>el.onclick=()=>setLanguage(state.language==='ru'?'en':'ru'));
 const mm=document.querySelector('.mobile-menu-button');if(mm)mm.onclick=()=>{state.mobileMenu=!state.mobileMenu;render();};document.querySelector('.settings-toggle')?.addEventListener('click',()=>{state.settingsOpen=true;render();});document.querySelector('.close-settings')?.addEventListener('click',()=>{state.settingsOpen=false;render();});document.querySelector('.settings-backdrop')?.addEventListener('click',e=>{if(e.target.classList.contains('settings-backdrop')){state.settingsOpen=false;render();}});document.querySelectorAll('.sound-toggle').forEach(el=>el.onclick=()=>{state.sound=!state.sound;save();render();});document.querySelectorAll('.vibration-toggle').forEach(el=>el.onclick=()=>{state.vibration=!state.vibration;save();render();});document.querySelectorAll('.wake-toggle').forEach(el=>el.onclick=()=>{state.wakeLock=!state.wakeLock;save();render();});document.querySelectorAll('.focus-toggle').forEach(el=>el.onclick=toggleFocusMode);
 document.querySelectorAll('[data-mode]').forEach(el=>el.onclick=()=>{state.mode=Number(el.dataset.mode);render();});
 document.querySelectorAll('.player-name').forEach(el=>el.oninput=e=>{state.names[Number(el.dataset.index)]=e.target.value;save();});
 document.querySelectorAll('.remove-player').forEach(el=>el.onclick=()=>{state.names.splice(Number(el.dataset.index),1);render();});
 document.querySelector('.add-player')?.addEventListener('click',()=>{state.names.push(state.language==='en'?`Player ${state.names.length+1}`:`Игрок ${state.names.length+1}`);render();});
 document.querySelector('.start-button')?.addEventListener('click',()=>{const cs=document.getElementById('custom-score');if(cs)state.customScore=Number(cs.value);const ls=document.getElementById('legs-select');if(ls)state.legs=Number(ls.value);document.querySelectorAll('.player-name').forEach(el=>state.names[Number(el.dataset.index)]=el.value);startGame();});
 document.getElementById('custom-score')?.addEventListener('change',e=>{state.customScore=Number(e.target.value);save();});
 document.getElementById('legs-select')?.addEventListener('change',e=>{state.legs=Number(e.target.value);save();});
 document.querySelectorAll('[data-input]').forEach(el=>el.onclick=()=>{state.inputMode=el.dataset.input;render();});
 document.querySelectorAll('[data-mult]').forEach(el=>el.onclick=()=>{state.multiplier=Number(el.dataset.mult);render();});
 document.querySelectorAll('[data-dart]').forEach(el=>el.onclick=()=>{const n=Number(el.dataset.dart),prefix=state.multiplier===1?'S':state.multiplier===2?'D':'T';addDart(byLabel[`${prefix}${n}`]);});
 document.querySelectorAll('[data-special]').forEach(el=>el.onclick=()=>addDart(byLabel[el.dataset.special]||MISS));
 document.querySelector('.clear-current')?.addEventListener('click',()=>{if(!state.game?.current.length)return;snapshot();state.game.current.pop();save();render();});
 document.querySelectorAll('.undo,.undo-mobile').forEach(el=>el.onclick=undo);document.querySelectorAll('.redo,.redo-mobile').forEach(el=>el.onclick=redo);
 document.querySelectorAll('[data-preview-player]').forEach(el=>{const select=()=>{const id=el.dataset.previewPlayer;const active=activePlayer();state.previewPlayerId=active?.id===id?null:(state.previewPlayerId===id?null:id);render();};el.onclick=select;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}};});document.querySelectorAll('.clear-preview').forEach(el=>el.onclick=()=>{state.previewPlayerId=null;render();});
 const vi=document.getElementById('visit-desktop');if(vi){vi.oninput=e=>{let v=e.target.value.replace(/\D/g,'').slice(0,3);if(Number(v)>180)v='180';state.visitValue=v;state.inputError='';e.target.value=v;const preview=document.querySelector('.desktop-preview');if(preview){preview.innerHTML=visitPreview();window.CheckoutI18n?.apply?.(preview,state.language);}const submit=document.querySelector('.desktop-submit');if(submit)submit.disabled=v==='';playSound('tap');animatePress(document.querySelector('.desktop-score-box'));};vi.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();playSound('confirm');haptic('confirm');requestVisitSubmit();}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}};setTimeout(()=>vi.focus({preventScroll:true}),0);}
 document.querySelector('.submit-visit')?.addEventListener('click',requestVisitSubmit);
 document.querySelectorAll('[data-key]').forEach(el=>el.onclick=()=>{animatePress(el,el.dataset.key==='ok');keypad(el.dataset.key);});document.querySelectorAll('[data-quick]').forEach(el=>el.onclick=()=>{animatePress(el);quick(el.dataset.quick);});
 document.querySelectorAll('.open-history').forEach(el=>el.addEventListener('click',()=>{state.historyOpen=true;render();}));document.querySelector('.mobile-menu-backdrop')?.addEventListener('click',()=>{state.mobileMenu=false;render();});document.querySelectorAll('.close-history').forEach(el=>el.addEventListener('click',()=>{state.historyOpen=false;render();}));
 document.querySelectorAll('.play-again').forEach(el=>el.onclick=startGame);
 document.querySelectorAll('[data-select-double]').forEach(el=>el.onclick=()=>{state.checkoutConfirm.selected=el.dataset.selectDouble;const counts=validCheckoutDartCounts(state.checkoutConfirm.value,state.checkoutConfirm.selected);state.checkoutConfirm.darts=counts[0]||3;render();});document.querySelectorAll('[data-checkout-darts]').forEach(el=>el.onclick=()=>{state.checkoutConfirm.darts=Number(el.dataset.checkoutDarts);render();});document.querySelector('.confirm-selected-double')?.addEventListener('click',()=>confirmCheckout(state.checkoutConfirm.selected));document.querySelector('.confirm-bust')?.addEventListener('click',()=>{const value=state.checkoutConfirm?.value;if(value==null)return;state.checkoutConfirm=null;finishVisit([{label:`Σ${value}`,value,multiplier:1,number:value,isDouble:false,isTreble:false}],true,3);});document.querySelector('.cancel-confirm')?.addEventListener('click',cancelCheckout);document.querySelectorAll('[data-edit-last]').forEach(el=>{el.onclick=openEditLast;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openEditLast();}};});document.querySelector('.cancel-edit')?.addEventListener('click',()=>{state.editLastOpen=false;state.inputError='';render();});document.querySelector('.delete-last')?.addEventListener('click',deleteLastVisit);document.querySelector('.save-edit')?.addEventListener('click',applyEditedLastVisit);document.querySelectorAll('[data-edit-double]').forEach(el=>el.onclick=()=>{state.editLastDouble=el.dataset.editDouble;const counts=validCheckoutDartCounts(Number(state.editLastValue),state.editLastDouble);state.editLastDarts=counts[0]||3;render();});document.querySelectorAll('[data-edit-darts]').forEach(el=>el.onclick=()=>{state.editLastDarts=Number(el.dataset.editDarts);render();});const editInput=document.getElementById('edit-last-value');if(editInput){editInput.oninput=e=>{let v=e.target.value.replace(/\D/g,'').slice(0,3);if(Number(v)>180)v='180';state.editLastValue=v;render();};setTimeout(()=>document.getElementById('edit-last-value')?.focus(),0);}
 document.onkeydown=e=>{const dialog=document.querySelector('[role="dialog"]');if(dialog){if(e.key==='Escape'){e.preventDefault();if(state.checkoutConfirm)cancelCheckout();else if(state.editLastOpen){state.editLastOpen=false;state.inputError='';render();}else if(state.settingsOpen){state.settingsOpen=false;render();}else if(state.historyOpen){state.historyOpen=false;render();}return;}if(e.key==='Tab'){const focusable=[...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex="0"]')];if(!focusable.length)return;const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}return;}if(state.screen!=='game'||window.matchMedia?.('(max-width:768px)').matches||state.checkoutConfirm!==null)return;const input=document.getElementById('visit-desktop');if(!input)return;if(document.activeElement!==input){if(/^\d$/.test(e.key)){e.preventDefault();input.focus();const next=(state.visitValue+e.key).replace(/^0+(?=\d)/,'').slice(0,3);if(Number(next)<=180){state.visitValue=next;input.value=next;input.dispatchEvent(new Event('input',{bubbles:true}));}}else if(e.key==='Enter'&&state.visitValue!==''){e.preventDefault();playSound('confirm');haptic('confirm');requestVisitSubmit();}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}else if(e.key==='Escape'&&state.focusMode){e.preventDefault();toggleFocusMode();}}};
 const search=document.getElementById('checkout-search');if(search)search.oninput=e=>{state.search=e.target.value.replace(/\D/g,'').slice(0,3);render();setTimeout(()=>document.getElementById('checkout-search')?.focus(),0);};
}

if(globalThis.__CHECKOUT_LAB_TEST__)globalThis.__CL_TEST__={state,checkoutRoutes,isPossibleVisitTotal,validFinishDoubles,validCheckoutDartCounts,normalizeGame,rebuildGame,applyRecordedVisit,startGame,requestVisitSubmit,confirmCheckout,undo,redo,openEditLast,applyEditedLastVisit,deleteLastVisit,visitPreview};
load();render();
document.addEventListener('visibilitychange',()=>syncWakeLock());document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&state.focusMode){state.focusMode=false;save();render();}});
function showUpdatePrompt(registration){
 if(document.querySelector('.update-toast'))return;
 const english=document.documentElement.dataset.lang==='en';
 const toast=document.createElement('aside');toast.className='update-toast';toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');
 toast.innerHTML=`<span>${english?'A new version is ready':'Готова новая версия'}</span><button type="button">${english?'UPDATE':'ОБНОВИТЬ'}</button>`;
 toast.querySelector('button').addEventListener('click',event=>{event.currentTarget.disabled=true;registration.waiting?.postMessage({type:'SKIP_WAITING'});});
 document.body.append(toast);
}
function registerServiceWorker(){
 navigator.serviceWorker.register('/sw.js').then(registration=>{
  if(registration.waiting)showUpdatePrompt(registration);
  registration.addEventListener('updatefound',()=>{const worker=registration.installing;if(!worker)return;worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)showUpdatePrompt(registration);});});
  let reloading=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloading)return;reloading=true;location.reload();});
 }).catch(()=>{});
}
if('serviceWorker' in navigator)window.addEventListener('load',registerServiceWorker);
})();
