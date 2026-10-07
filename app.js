(() => {
'use strict';

const STORAGE='checkout-lab-session-v1';
const LEGACY_STORAGE='checkout-lab-game-v2';
const SETTINGS='checkout-lab-settings-v3';
const HISTORY='checkout-lab-history-v1';
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
 candidates.sort((a,b)=>a.routes[0].length-b.routes[0].length||b.hit.value-a.hit.value||routeRank(a.routes[0])-routeRank(b.routes[0]));return candidates[0]||null;
}

// Computer opponent: each dart lands on real board geometry (mm) with Gaussian scatter around the aim point.
const BOT_LEVELS=[{level:1,name:'Новичок',en:'Beginner',avg:35,sigma:23.7},{level:2,name:'Любитель',en:'Amateur',avg:50,sigma:16.3},{level:3,name:'Клубный',en:'Club',avg:65,sigma:12.2},{level:4,name:'Сильный',en:'Strong',avg:80,sigma:9.4},{level:5,name:'Профи',en:'Pro',avg:95,sigma:7}];
function boardHitAt(x,y){
 const r=Math.hypot(x,y);if(r<=6.35)return byLabel.BULL;if(r<=15.9)return byLabel['25'];if(r>170)return MISS;
 const deg=(Math.atan2(x,y)*180/Math.PI+360)%360,n=BOARD_ORDER[Math.round(deg/18)%20];
 return byLabel[`${r>=162?'D':r>=99&&r<=107?'T':'S'}${n}`];
}
function aimPoint(h){
 if(!h||h.number===25||!h.number)return[0,0];
 const r=h.isTreble?103:h.isDouble?166:134,a=BOARD_ORDER.indexOf(h.number)*Math.PI/10;return[r*Math.sin(a),r*Math.cos(a)];
}
function gauss(rand){let u=0;while(!u)u=rand();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*rand());}
function botThrow(target,sigma,rand=Math.random){const[x,y]=aimPoint(target);return boardHitAt(x+gauss(rand)*sigma,y+gauss(rand)*sigma);}
function botAim(score,darts){
 if(score<=170){const route=checkoutRoutes(score,darts,1)[0];if(route)return route[0];}
 if(score>=62)return byLabel[BOGEY.has(score-60)?'T19':'T20'];
 for(const d of preferredDoubles){const rest=score-byLabel[d].value;if(rest>=1&&rest<=20)return byLabel[`S${rest}`];if(rest===25)return byLabel['25'];}
 return byLabel.S1;
}
function botSigma(level){return (BOT_LEVELS.find(l=>l.level===level)||BOT_LEVELS[2]).sigma;}
function botVisit(score,sigma,rand=Math.random){
 const hits=[];let left=score;
 for(let i=0;i<3;i++){const h=botThrow(botAim(left,3-i),sigma,rand);hits.push(h);left-=h.value;if(left<0||left===1||(left===0&&!h.isDouble)||left===0)break;}
 return hits;
}

const DEFAULT_LANGUAGE=window.CheckoutI18n?.detect?.()||((navigator.language||'ru').toLowerCase().startsWith('ru')?'ru':'en');
const state={
 screen:'setup', theme:'dark', language:DEFAULT_LANGUAGE, mode:501, customScore:701, names:DEFAULT_LANGUAGE==='en'?['Player 1','Player 2']:['Даня','Соперник'], legs:3,
 game:null, tournament:null, tDraft:null, undo:[], redo:[], inputMode:'visit', multiplier:1, visitValue:'', mobileMenu:false, settingsOpen:false, checkoutConfirm:null, search:'', historyOpen:false, moment:null, previewPlayerId:null,
 botLevel:0, sets:0, doubleIn:false, bobBest:0, best121:0, sound:false, vibration:false, voice:false, callers:{}, training:null, trainBest:0, wakeLock:true, focusMode:false, inputError:'', lastSubmitAt:0, editLastOpen:false, editLastValue:'', editLastDouble:'', editLastDarts:3
};

function clone(x){return JSON.parse(JSON.stringify(x));}
function id(){return (crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`);}
function newPlayer(name,index,score){return{id:id(),name,score,color:COLORS[index%COLORS.length],darts:0,total:0,visits:0,high:0,wins:0,sets:0,legsWon:0};}
function save(){
 try{localStorage.setItem(STORAGE,JSON.stringify({game:state.game,undo:state.undo,redo:state.redo}));}catch{}
 try{localStorage.setItem(SETTINGS,JSON.stringify({theme:state.theme,names:state.names,legs:state.legs,mode:state.mode,customScore:state.customScore,language:state.language,sound:state.sound,vibration:state.vibration,voice:state.voice,callers:state.callers,inputMode:state.inputMode,trainBest:state.trainBest,botLevel:state.botLevel,sets:state.sets,doubleIn:state.doubleIn,bobBest:state.bobBest,best121:state.best121,wakeLock:state.wakeLock,focusMode:state.focusMode}));}catch{}
 syncHistory();syncTournament();
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
 if(game&&ALT_TYPES.includes(game.type))return normalizeAltGame(game);
 if(!game||!integerBetween(game.startScore,2,5001)||!Array.isArray(game.players)||!integerBetween(game.players.length,1,8)||!integerBetween(game.active,0,game.players.length-1)||!integerBetween(game.legsToWin,1,99))return null;
 if(!game.players.every(player=>validStoredPlayer(player,game.startScore)))return null;
 const playerIds=new Set(game.players.map(player=>player.id));if(playerIds.size!==game.players.length)return null;
 if(!Array.isArray(game.current)||game.current.length>3||!game.current.every(hit=>hit&&typeof hit.label==='string'&&Number.isFinite(Number(hit.value))))return null;
 if(!Array.isArray(game.history)||!game.history.every(visit=>validStoredVisit(visit,playerIds)))return null;
 if(game.winner!==null&&game.winner!==undefined&&!playerIds.has(game.winner))return null;
 const completedLegs=game.players.reduce((sum,p)=>sum+(Number.isInteger(p?.wins)&&p.wins>0?p.wins:0),0);
 if(!Number.isInteger(game.legStarter)||game.legStarter<0||game.legStarter>=game.players.length)game.legStarter=completedLegs%game.players.length;
 if(!Number.isInteger(game.legNumber)||game.legNumber<1)game.legNumber=completedLegs+1;
 if(!integerBetween(game.setsToWin,0,9))game.setsToWin=0;
 game.doubleIn=game.doubleIn===true;
 for(const p of game.players){if(!Number.isInteger(p.sets))p.sets=0;if(!Number.isInteger(p.legsWon))p.legsWon=p.wins;if(typeof p.opened!=='boolean')p.opened=true;if(p.bot!==undefined&&!integerBetween(p.bot,1,5))delete p.bot;}
 return game;
}
function normalizeAltGame(game){
 if(!Array.isArray(game.players)||!integerBetween(game.players.length,1,8)||!integerBetween(game.active,0,game.players.length-1)||!integerBetween(game.legsToWin,1,99)||!Array.isArray(game.history)||!Array.isArray(game.current)||game.current.length>3)return null;
 const typeOk=p=>game.type==='cricket'?p.marks&&typeof p.marks==='object'&&CRICKET_TARGETS.every(n=>integerBetween(p.marks[n],0,3))&&Number.isInteger(p.points)&&Number.isInteger(p.marksTotal):game.type==='clock'?integerBetween(p.target,1,22):game.type==='shanghai'?integerBetween(p.points,0,99999):integerBetween(p.lives,0,KILLER_LIVES)&&integerBetween(p.num,1,20)&&typeof p.killer==='boolean';
 const ok=game.players.every(p=>p&&typeof p.id==='string'&&typeof p.name==='string'&&typeof p.color==='string'&&['darts','wins','hits'].every(k=>Number.isInteger(p[k])&&p[k]>=0)&&typeOk(p)&&(p.bot===undefined||integerBetween(p.bot,1,5)));
 if(!ok)return null;
 if(!integerBetween(game.legStarter,0,game.players.length-1))game.legStarter=0;
 if(!Number.isInteger(game.legNumber)||game.legNumber<1)game.legNumber=1;
 if(!integerBetween(game.round,1,20))game.round=1;
 return game;
}
function applyStoredSettings(settings){
 if(!settings||typeof settings!=='object')return;
 if(settings.theme==='dark'||settings.theme==='light')state.theme=settings.theme;
 if(Array.isArray(settings.names)){const names=settings.names.slice(0,8).map(name=>String(name).slice(0,80));if(names.some(name=>name.trim()))state.names=names;}
 if(integerBetween(settings.legs,1,7))state.legs=settings.legs;
 if([0,301,501,'cricket','clock','shanghai','killer'].includes(settings.mode))state.mode=settings.mode;
 if(integerBetween(settings.botLevel,0,5))state.botLevel=settings.botLevel;
 if(integerBetween(settings.sets,0,5))state.sets=settings.sets;
 if(typeof settings.doubleIn==='boolean')state.doubleIn=settings.doubleIn;
 if(integerBetween(settings.bobBest,0,1437))state.bobBest=settings.bobBest;
 if(integerBetween(settings.best121,0,170))state.best121=settings.best121;
 if(integerBetween(settings.customScore,2,5001))state.customScore=settings.customScore;
 if(settings.language==='ru'||settings.language==='en')state.language=settings.language;
 for(const key of ['sound','vibration','voice','wakeLock','focusMode'])if(typeof settings[key]==='boolean')state[key]=settings[key];
 if(settings.inputMode==='visit'||settings.inputMode==='darts')state.inputMode=settings.inputMode;
 if(settings.callers&&typeof settings.callers==='object')state.callers={ru:typeof settings.callers.ru==='string'?settings.callers.ru.slice(0,200):'',en:typeof settings.callers.en==='string'?settings.callers.en.slice(0,200):''};
 if(integerBetween(settings.trainBest,0,9999))state.trainBest=settings.trainBest;
}
function load(){
 try{const session=JSON.parse(localStorage.getItem(STORAGE)||'null');if(session?.game?.players){state.game=normalizeGame(session.game);state.undo=Array.isArray(session.undo)?session.undo.map(normalizeGame).filter(Boolean):[];state.redo=Array.isArray(session.redo)?session.redo.map(normalizeGame).filter(Boolean):[];}else{const legacy=JSON.parse(localStorage.getItem(LEGACY_STORAGE)||'null');if(legacy?.players)state.game=normalizeGame(legacy);}}catch{}
 try{applyStoredSettings(JSON.parse(localStorage.getItem(SETTINGS)||'null'));}catch{}
 state.tournament=loadTournament();
 const fixed=document.documentElement?.dataset?.lang;if(fixed==='ru'||fixed==='en')state.language=fixed;
 // Deep links from the reference pages: /?mode=cricket, /?train=bobs
 try{const q=new URLSearchParams(location.search||''),mode=q.get('mode'),train=q.get('train');
  if(['301','501','cricket','clock','shanghai','killer'].includes(mode)){state.mode=/^\d+$/.test(mode)?Number(mode):mode;state.screen='setup';}
  if(['quiz','doubles','bobs','c121'].includes(train)){state.screen='training';ensureTraining().tab=train;}
 }catch{}
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
 if(ALT_TYPES.includes(state.mode))return startAltGame(state.mode);
 const custom=Math.trunc(Number(state.customScore));const score=state.mode===0?Math.min(5001,Math.max(2,Number.isFinite(custom)?custom:501)):state.mode;
 const players=state.names.map(n=>n.trim()).filter(Boolean).map((n,i)=>newPlayer(n,i,score));if(!players.length)return;
 const level=BOT_LEVELS.find(l=>l.level===state.botLevel);if(level&&players.length<8)players.push({...newPlayer(state.language==='en'?`CPU · ${level.en}`:`Бот · ${level.name}`,players.length,score),bot:level.level});
 const doubleIn=!!state.doubleIn;players.forEach(p=>{p.opened=!doubleIn;});
 state.game={id:id(),startScore:score,doubleIn,players,active:0,legStarter:0,legNumber:1,setNumber:1,setsToWin:Number(state.sets)||0,current:[],history:[],legsToWin:Number(state.legs)||1,winner:null};state.undo=[];state.redo=[];state.visitValue='';state.inputError='';state.previewPlayerId=null;state.screen='game';save();render();
}
function applyRecordedVisit(game,visit){
 const idx=game.players.findIndex(x=>x.id===visit.playerId);if(idx<0)return game;game.active=idx;const p=game.players[idx],start=p.score,total=Number(visit.total)||0,bust=!!visit.bust,checkout=!!visit.checkout,dartCount=Number(visit.dartCount)||3;
 p.darts+=dartCount;p.total+=bust?0:total;p.visits++;p.high=Math.max(p.high,bust?0:total);
 let nextActive=(idx+1)%game.players.length;
 if(checkout){p.wins++;p.legsWon=(p.legsWon||0)+1;let matchWon=p.wins>=game.legsToWin;
  if(game.setsToWin>0&&matchWon){p.sets=(p.sets||0)+1;matchWon=p.sets>=game.setsToWin;if(!matchWon){game.players.forEach(x=>{x.wins=0;});game.setNumber=(game.setNumber||1)+1;}}
  if(matchWon){game.winner=p.id;nextActive=idx;}else{game.legStarter=(Number.isInteger(game.legStarter)?game.legStarter:0)+1;game.legStarter%=game.players.length;game.legNumber=(Number.isInteger(game.legNumber)?game.legNumber:1)+1;game.players=game.players.map(x=>({...x,score:game.startScore,opened:!game.doubleIn}));nextActive=game.legStarter;}}
 else if(!bust)p.score=start-total;
 if(!bust&&total>0)p.opened=true;
 game.history.push({...clone(visit),start,dartCount});game.active=nextActive;game.current=[];return game;
}
function rebuildGame(history){
 const g=state.game;if(!g)return null;const base={id:g.id,startScore:g.startScore,players:g.players.map(p=>({id:p.id,name:p.name,color:p.color,score:g.startScore,darts:0,total:0,visits:0,high:0,wins:0,sets:0,legsWon:0,opened:!g.doubleIn,...(p.bot?{bot:p.bot}:{})})),doubleIn:!!g.doubleIn,active:0,legStarter:0,legNumber:1,setNumber:1,setsToWin:g.setsToWin||0,current:[],history:[],legsToWin:g.legsToWin,winner:null};
 if(g.tm)base.tm=g.tm;for(const v of history)applyRecordedVisit(base,v);return base;
}
function finishVisit(hits,forcedBust=false,dartCount=hits.length){
 const g=state.game,p=activePlayer();if(!g||!p||!hits.length)return;
 snapshot();const total=hits.reduce((sum,h)=>sum+h.value,0),left=p.score-total,last=hits[hits.length-1];
 const checkout=left===0&&last.isDouble&&!forcedBust,bust=forcedBust||left<0||left===1||(left===0&&!last.isDouble);
 const next=clone(g);applyRecordedVisit(next,{playerId:p.id,start:p.score,hits,total,bust,checkout,dartCount});state.game=next;state.visitValue='';state.inputError='';state.previewPlayerId=null;
 const kind=bust?'bust':checkout?(next.winner?'match':'leg'):total===180?'180':'score';state.moment=bust?{label:'BUST',tone:'bust',at:Date.now(),who:p.name}:checkout?{label:next.winner?'МАТЧ!':'LEG!',tone:'leg',at:Date.now(),who:p.name}:total===180?{label:'180!',tone:'max',at:Date.now(),who:p.name}:null;
 playSound(kind);haptic(kind);save();render();runMomentMotion(kind);callVisit(next,total,bust,checkout);
 if(state.moment){const stamp=state.moment.at;setTimeout(()=>{if(state.moment?.at===stamp){state.moment=null;render();}},900);}
}
function loadHistory(){try{const list=JSON.parse(localStorage.getItem(HISTORY)||'[]');return Array.isArray(list)?list.filter(m=>m&&typeof m.id==='string'&&Array.isArray(m.players)).slice(0,200):[];}catch{return[];}}
function matchSummary(g){if(g.type)return altSummary(g);return{id:g.id,at:Date.now(),start:g.startScore,legsToWin:g.legsToWin,setsToWin:g.setsToWin||0,winner:g.players.find(p=>p.id===g.winner)?.name||'',players:g.players.map(p=>({name:p.name,color:p.color,bot:p.bot||0,wins:matchScore(p,g),legs:p.legsWon??p.wins,darts:p.darts,total:p.total,high:p.high,c180:count180(g,p),best:bestCheckout(g,p),tons:g.history.filter(v=>v.playerId===p.id&&!v.bust&&v.total>=100).length}))};}
function cleanSummary(m){
 if(!m||typeof m.id!=='string'||m.id.length>80||!Number.isFinite(Number(m.at))||!Array.isArray(m.players)||!m.players.length||m.players.length>9)return null;
 const num=v=>Math.max(0,Math.min(1e6,Math.trunc(Number(v))||0)),type=ALT_TYPES.includes(m.type)?m.type:undefined;
 const players=m.players.map(p=>({name:String(p?.name??'').slice(0,80),color:/^#[0-9a-f]{3,8}$/i.test(p?.color)?p.color:'#888888',bot:num(p?.bot),wins:num(p?.wins),legs:num(p?.legs??p?.wins),darts:num(p?.darts),total:num(p?.total),high:Math.min(180,num(p?.high)),c180:num(p?.c180),best:Math.min(170,num(p?.best)),tons:num(p?.tons),hits:num(p?.hits),marks:num(p?.marks)}));
 return{id:m.id,at:Number(m.at),...(type?{type}:{}),start:type?MODE_LABEL[type]:num(m.start),legsToWin:num(m.legsToWin),setsToWin:num(m.setsToWin),winner:String(m.winner??'').slice(0,80),players};
}
function exportHistory(){
 const data={app:'checkout-lab',version:1,exportedAt:new Date().toISOString(),history:loadHistory()},blob=new Blob([JSON.stringify(data)],{type:'application/json'}),a=document.createElement('a');
 a.href=URL.createObjectURL(blob);a.download=`checkout-lab-history-${new Date().toISOString().slice(0,10)}.json`;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);
}
async function importHistory(file){
 const en=state.language==='en';
 try{const data=JSON.parse(await file.text()),incoming=Array.isArray(data)?data:data?.history;if(!Array.isArray(incoming))throw new Error('format');
  const map=new Map(loadHistory().map(m=>[m.id,m]));let added=0;for(const raw of incoming.slice(0,1000)){const m=cleanSummary(raw);if(!m)continue;if(!map.has(m.id))added++;map.set(m.id,m);}
  localStorage.setItem(HISTORY,JSON.stringify([...map.values()].sort((a,b)=>b.at-a.at).slice(0,200)));window.alert?.(en?`Imported matches: ${added}`:`Добавлено матчей: ${added}`);
 }catch{window.alert?.(en?'This file is not a Checkout Lab history export.':'Это не файл истории Checkout Lab.');}
 render();
}
function syncHistory(){const g=state.game;if(!g?.id)return;const list=loadHistory(),i=list.findIndex(m=>m.id===g.id);if(g.winner){const summary=matchSummary(g);if(i>=0){summary.at=list[i].at;list[i]=summary;}else list.unshift(summary);}else if(i>=0)list.splice(i,1);else return;try{localStorage.setItem(HISTORY,JSON.stringify(list.slice(0,200)));}catch{}}
async function shareResult(){const g=state.game;if(!g?.winner)return;const en=state.language==='en',w=g.players.find(p=>p.id===g.winner),W=1200,H=630,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
 try{await Promise.all(['600 120px Oswald','500 40px Oswald','600 24px "Roboto Condensed"'].map(f=>document.fonts?.load?.(f)));}catch{}
 const bg=x.createRadialGradient(240,0,40,240,0,900);bg.addColorStop(0,'#1d2025');bg.addColorStop(1,'#111316');x.fillStyle=bg;x.fillRect(0,0,W,H);
 const gold=x.createLinearGradient(0,0,0,H);gold.addColorStop(0,'#e2c071');gold.addColorStop(1,'#bf9233');
 x.textBaseline='alphabetic';x.font='600 34px Oswald';x.fillStyle='#e8e9eb';x.fillText('CHECKOUT',64,82);x.fillStyle=gold;x.fillText('LAB',64+x.measureText('CHECKOUT ').width,82);
 x.font='600 22px "Roboto Condensed"';x.fillStyle='#aab0b8';x.fillText(en?'MATCH WINNER':'ПОБЕДИТЕЛЬ МАТЧА',64,170);
 x.font='600 118px Oswald';x.fillStyle='#e8e9eb';let name=w.name.toUpperCase();while(x.measureText(name).width>620&&name.length>3)name=name.slice(0,-2)+'…';x.fillText(name,64,290);
 x.font='600 84px Oswald';x.fillStyle=gold;x.fillText(g.players.length===2?winnerScoreline(g):`${w.wins} ${en?(w.wins===1?'leg':'legs'):'лег.'}`,64,392);
 const rows=g.players.slice(0,4),top=150,rh=86;const cols=g.type==='cricket'?['MPR',en?'PTS':'ОЧКИ',en?'DARTS':'ДРОТ.']:g.type==='shanghai'?[en?'PTS':'ОЧКИ',en?'HIT %':'ТОЧН.',en?'LEGS':'ЛЕГИ']:g.type?[en?'HIT %':'ТОЧН.',en?'DARTS':'ДРОТ.',en?'LEGS':'ЛЕГИ']:['AVG','180',en?'BEST':'ЛУЧШИЙ'],vals=p=>g.type==='cricket'?[mpr(p),String(p.points),String(p.darts)]:g.type==='shanghai'?[String(p.points),`${hitRate(p)}%`,String(p.wins)]:g.type?[`${hitRate(p)}%`,String(p.darts),String(p.wins)]:[avg(p),String(count180(g,p)),String(p.high)];
 x.font='600 18px "Roboto Condensed"';x.fillStyle='#80868f';cols.forEach((h,i)=>x.fillText(h,872+i*92,top-14));
 rows.forEach((p,i)=>{const y=top+i*rh;x.fillStyle=p.id===g.winner?'rgba(217,178,90,.12)':'rgba(255,255,255,.03)';x.fillRect(700,y,440,rh-10);x.fillStyle=p.color;x.fillRect(700,y,5,rh-10);
  x.font='500 30px Oswald';x.fillStyle='#e8e9eb';let n=p.name.toUpperCase();while(x.measureText(n).width>150&&n.length>3)n=n.slice(0,-2)+'…';x.fillText(n,720,y+50);
  x.font='500 30px Oswald';x.fillStyle='#aab0b8';vals(p).forEach((v,j)=>x.fillText(v,872+j*92,y+50));});
 x.font='600 22px "Roboto Condensed"';x.fillStyle='#80868f';x.fillText(`checkoutlab.ru · ${g.type?MODE_LABEL[g.type]:`${g.startScore} · Double Out`}`,64,H-56);
 const blob=await new Promise(r=>c.toBlob(r,'image/png'));if(!blob)return;const file=new File([blob],'checkout-lab-result.png',{type:'image/png'}),text=en?`${w.name} wins ${g.players.length===2?winnerScoreline(g):''} — Checkout Lab`:`${w.name} побеждает ${g.players.length===2?winnerScoreline(g):''} — Checkout Lab`;
 try{if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'Checkout Lab',text});return;}}catch(e){if(e?.name==='AbortError')return;}
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=file.name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);
}
let voiceList=[];
function refreshVoices(){try{voiceList=window.speechSynthesis?.getVoices?.()||[];}catch{voiceList=[];}}
function shortVoiceName(name){return String(name).replace(/^(Microsoft|Google|Apple|Yandex)\s+/i,'').split(/\s+[-–(]/)[0].trim()||name;}
function voicesFor(lang){return voiceList.filter(v=>String(v.lang||'').toLowerCase().replace('_','-').startsWith(lang));}
function callerOptions(){const lang=state.language==='en'?'en':'ru',voices=voicesFor(lang).slice().sort((a,b)=>(b.localService-a.localService)||(lang==='en'?(/en-gb/i.test(b.lang)-/en-gb/i.test(a.lang)):0)||String(a.name).localeCompare(String(b.name)));const seen=new Set(),options=[];for(const v of voices){const label=shortVoiceName(v.name);if(seen.has(label))continue;seen.add(label);options.push({key:v.name,voice:v,pitch:1,rate:1.02,label});if(options.length===6)break;}if(options.length===1)options.push({key:`${options[0].key}|deep`,voice:options[0].voice,pitch:.62,rate:.9,label:lang==='en'?'Deep':'Низкий'});return options;}
function currentCaller(){const options=callerOptions(),key=state.callers?.[state.language];return options.find(o=>o.key===key)||options[0]||null;}
function hasLanguageVoice(){return voicesFor(state.language==='en'?'en':'ru').length>0;}
function voiceSummary(){const ru=voicesFor('ru').length,en=voicesFor('en').length;return `${state.language==='en'?'Voices on this device':'Голоса на устройстве'}: RU ${ru} · EN ${en} · ${state.language==='en'?'total':'всего'} ${voiceList.length}`;}
function speak(text,force=false){if((!state.voice&&!force)||typeof window.speechSynthesis==='undefined'||typeof window.SpeechSynthesisUtterance==='undefined')return;try{refreshVoices();const synth=window.speechSynthesis,caller=currentCaller();if(voiceList.length&&!caller)return;const u=new window.SpeechSynthesisUtterance(text);u.lang=caller?.voice?.lang||(state.language==='en'?'en-GB':'ru-RU');if(caller?.voice)u.voice=voiceList.find(v=>v.name===caller.voice.name)||caller.voice;u.pitch=caller?.pitch||1;u.rate=caller?.rate||1.02;if(synth.speaking||synth.pending){synth.cancel();setTimeout(()=>synth.speak(u),80);}else synth.speak(u);}catch{}}
function nextCaller(){refreshVoices();const options=callerOptions();if(!options.length){render();return;}const i=options.findIndex(o=>o.key===currentCaller()?.key),next=options[(i+1)%options.length];state.callers={...(state.callers||{}),[state.language]:next.key};save();render();speak(state.language==='en'?'One hundred and eighty!':'Сто восемьдесят!',true);}
if(typeof window.speechSynthesis!=='undefined'){refreshVoices();try{window.speechSynthesis.addEventListener?.('voiceschanged',()=>{refreshVoices();if(state.settingsOpen||state.mobileMenu)render();});}catch{}}
function callVisit(next,total,bust,checkout){if(!state.voice)return;const en=state.language==='en';let text=bust?(en?'No score':'Перебор'):checkout?(next.winner?(en?'Game shot, and the match!':'Лег и матч!'):(en?'Game shot!':'Лег!')):total===180?(en?'One hundred and eighty!':'Сто восемьдесят!'):String(total);if(!checkout&&!next.winner){const up=next.players[next.active];if(up&&up.score<=170&&checkoutRoutes(up.score,3,1).length)text+=en?`. ${up.name}, you require ${up.score}.`:`. ${up.name}, осталось ${up.score}.`;}speak(text);}
function addDart(h,fromBot=false){
 if(state.game?.type==='cricket')return altDart(h,fromBot);
 if(!fromBot&&isBotTurn())return;
 const g=state.game,p=activePlayer();if(!g||!p||g.winner||g.type)return;if(needsDoubleIn(g,p)&&!h.isDouble)h={...h,value:0,dead:true};const hits=[...g.current,h],left=p.score-hits.reduce((sum,x)=>sum+x.value,0),bad=left===0&&!h.isDouble;
 if(left<0||left===1||bad)return finishVisit(hits,true);if(left===0||hits.length===3)return finishVisit(hits);
 const kind=h.label==='BULL'?'bull':h.isTreble?'treble':h.isDouble?'double':'tap';playSound(kind);haptic(kind);
 snapshot();g.current=hits;save();render();runMomentMotion('score');
}
let botTimer=null;
function isBotTurn(g=state.game){return !!(g&&(!g.type||g.type==='cricket')&&!g.winner&&g.players[g.active]?.bot);}
function cancelBot(){if(botTimer){clearTimeout(botTimer);botTimer=null;}}
function scheduleBot(){
 if(botTimer||state.screen!=='game'||!isBotTurn()||state.checkoutConfirm||state.editLastOpen)return;
 const g=state.game,key=`${g.id}:${g.history.length}:${g.current.length}`;
 botTimer=setTimeout(()=>{botTimer=null;const now=state.game;if(!now||`${now.id}:${now.history.length}:${now.current.length}`!==key||!isBotTurn()||state.screen!=='game')return scheduleBot();
  const p=activePlayer();if(now.type==='cricket')return addDart(botThrow(cricketBotAim(now,p),botSigma(p.bot)),true);const left=p.score-currentTotal();addDart(botThrow(needsDoubleIn(now,p)?byLabel.D20:botAim(left,3-now.current.length),botSigma(p.bot)),true);},g.current.length?750:1150);
}
function botPanel(mobile=false,slots=null){const p=activePlayer();return `<div class="bot-turn ${mobile?'m-bot-turn':''}" role="status" aria-live="polite"><span class="bot-dots" aria-hidden="true"><i></i><i></i><i></i></span><span class="eyebrow">КОМПЬЮТЕР БРОСАЕТ</span><strong>${esc(p?.name||'')}</strong>${slots??thrownSlots()}<button class="ghost-button undo">${icon('undo')}<span>Отменить мой подход</span></button></div>`;}
function needsDoubleIn(g=state.game,p=activePlayer()){return !!(g?.doubleIn&&p&&!p.opened&&!(g.current||[]).some(x=>x.isDouble&&!x.dead));}
function requestVisitSubmit(){
 const now=Date.now();if(now-state.lastSubmitAt<300)return;const value=Number(state.visitValue),g=state.game,p=activePlayer();if(isBotTurn()||g?.type||!g||!p||state.visitValue===''||!Number.isInteger(value)||value<0||value>180)return;
 if(!isPossibleVisitTotal(value)){state.inputError=`${value} нельзя набрать за 3 дротика`;render();return;}
 state.inputError='';state.lastSubmitAt=now;
 if(p.score-value===0){const doubles=validFinishDoubles(value);if(!doubles.length){state.inputError='Нет корректного Double Out для этой суммы';render();return;}const selected=doubles[0].label,counts=validCheckoutDartCounts(value,selected);state.checkoutConfirm={value,doubles:doubles.map(d=>d.label),selected,darts:counts[0]||3};render();return;}
 finishVisit([{label:`Σ${value}`,value,multiplier:1,number:value,isDouble:false,isTreble:false}],false,3);
}
function confirmCheckout(label){
 const data=state.checkoutConfirm;if(!data)return;const value=data.value;state.checkoutConfirm=null;const d=byLabel[label];if(!d?.isDouble)return;const h={label:`Σ${value} · ${label}`,value,multiplier:2,number:value,isDouble:true,isTreble:false,finishLabel:label};finishVisit([h],false,Number(data.darts)||3);
}
function cancelCheckout(){state.checkoutConfirm=null;state.lastSubmitAt=0;render();}
function undo(){if(!state.undo.length||!state.game)return;cancelBot();state.redo.push(clone(state.game));state.game=normalizeGame(state.undo.pop());while(state.undo.length&&isBotTurn())state.redo.push(clone(state.game)),state.game=normalizeGame(state.undo.pop());state.visitValue='';state.inputError='';state.previewPlayerId=null;save();render();}
function redo(){if(!state.redo.length||!state.game)return;cancelBot();state.undo.push(clone(state.game));state.game=normalizeGame(state.redo.pop());while(state.redo.length&&isBotTurn())state.undo.push(clone(state.game)),state.game=normalizeGame(state.redo.pop());state.visitValue='';state.inputError='';state.previewPlayerId=null;save();render();}
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
 screen:'<rect x="3.5" y="4.5" width="17" height="12" rx="2"/><path d="M9 20h6M12 16.5V20"/>',
 trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M16 6h3a3 3 0 0 1-3 4M8 6H5a3 3 0 0 0 3 4M12 13v4M8.5 20h7M10 17h4"/>',
 share:'<path d="M12 3v12M7.5 7.5 12 3l4.5 4.5"/><path d="M5 13v5.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V13"/>'
};
function icon(name,cls=''){return `<svg class="ico${cls?` ${cls}`:''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name]||''}</svg>`;}
function switchMark(on){return `<i class="switch ${on?'on':''}" aria-hidden="true"></i>`;}
function legBars(p,g){const total=Math.max(1,Math.min(g.legsToWin,9)),wins=Math.min(p.wins,total);return `<span class="leg-bars" aria-hidden="true">${'<i class="on"></i>'.repeat(wins)}${'<i></i>'.repeat(total-wins)}</span>`;}
function legPips(p,g){const total=Math.max(1,Math.min(g.legsToWin,9)),wins=Math.min(p.wins,total);return `<span class="leg-pips" title="${p.wins}/${g.legsToWin}">${'<i class="on"></i>'.repeat(wins)}${'<i></i>'.repeat(total-wins)}</span>`;}
function legStartIndex(g){let i=g.history.length;while(i>0&&!g.history[i-1].checkout)i--;return i;}
function legDarts(g){return g.history.slice(legStartIndex(g)).reduce((sum,v)=>sum+(Number(v.dartCount)||3),0);}
function count180(g,p){return g.history.filter(v=>v.playerId===p.id&&v.total===180&&!v.bust).length;}
function lastVisitOf(g,p){for(let i=g.history.length-1;i>=0;i--)if(g.history[i].playerId===p.id)return g.history[i];return null;}
function bestCheckout(g,p=null){return g.history.filter(v=>v.checkout&&(!p||v.playerId===p.id)).reduce((best,v)=>Math.max(best,v.total),0);}
function nextPlayer(g){return g.players.length>1?g.players[(g.active+1)%g.players.length]:null;}
function legsLabel(n){return `до ${n} ${n===1?'лега':'легов'}`;}
function setsLabel(n){return `до ${n} ${n===1?'сета':'сетов'}`;}
function matchScore(p,g){return g.setsToWin?(p.sets||0):p.wins;}
const BOARD_ORDER=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
const boardCache=new Map();
function boardSvg(route=[]){
 const key=route.map(h=>h.label).join('-');if(boardCache.has(key))return boardCache.get(key);
 const labels=new Set(route.map(h=>h.label)),nums=new Set(route.filter(h=>h.number>=1&&h.number<=20).map(h=>h.number));
 const f=n=>Math.round(n*100)/100,pt=(r,a)=>[f(r*Math.sin(a)),f(-r*Math.cos(a))];
 const arc=(r1,r2,a1,a2)=>{const[x1,y1]=pt(r2,a1),[x2,y2]=pt(r2,a2),[x3,y3]=pt(r1,a2),[x4,y4]=pt(r1,a1);return `M${x1} ${y1}A${r2} ${r2} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 0 0 ${x4} ${y4}Z`;};
 let out='';
 BOARD_ORDER.forEach((n,i)=>{const a1=(i-.5)*Math.PI/10,a2=(i+.5)*Math.PI/10,odd=i%2?'b':'a';
  for(const [r1,r2,k] of [[16,58,'S'],[58,64,'T'],[64,95,'S'],[95,100,'D']]){const lab=`${k}${n}`,hit=labels.has(lab);out+=`<path class="${hit?`db-hit ${k==='T'?'db-hit-t':k==='D'?'db-hit-d':'db-hit-s'}`:k==='S'?`db-s${odd}`:`db-r${odd}`}" d="${arc(r1,r2,a1,a2)}"/>`;}
  const [tx,ty]=pt(110,i*Math.PI/10);out+=`<text class="db-num${nums.has(n)?' on':''}" x="${tx}" y="${ty}">${n}</text>`;});
 out+=`<circle class="${labels.has('25')?'db-hit db-hit-s':'db-outer'}" r="16"/><circle class="${labels.has('BULL')?'db-hit db-hit-d':'db-bull'}" r="6.5"/>`;
 const svg=`<svg class="dartboard" viewBox="-122 -122 244 244" aria-hidden="true" focusable="false">${out}</svg>`;boardCache.set(key,svg);return svg;
}
function stageRoute(rem,preview=false){const darts=preview?3:Math.max(1,3-(state.game?.current.length||0)),routes=checkoutRoutes(rem,darts,4);if(routes.length)return{routes,checkout:true};const prep=preparation(rem);return{routes:prep?[[prep.hit]]:[],checkout:false,prep};}
function hitClass(h){return h.isTreble?'treble':h.isDouble?(h.label==='BULL'?'bull-hit':'double'):h.label==='BULL'?'bull-hit':'single-hit';}
function dartPlan(plan,thrown=[]){const route=plan.routes[0]||[];return `<div class="dart-plan">${[0,1,2].map(i=>{if(i<thrown.length){const h=thrown[i];return `<span class="dp thrown ${hitClass(h)}"><small>Дротик ${i+1}</small>${h.label}</span>`;}const h=route[i-thrown.length];return h?`<span class="dp ${hitClass(h)}"><small>Дротик ${i+1}</small>${h.label}</span>`:`<span class="dp empty"><small>Дротик ${i+1}</small>—</span>`;}).join('')}</div>`;}
function scoreRows(mobile=false){const g=state.game;if(!g)return'';return g.players.map((p,i)=>{const active=i===g.active,preview=state.previewPlayerId===p.id&&!active,last=lastVisitOf(g,p),starter=i===g.legStarter;return `<div class="${mobile?'m-player':'player'} sb-row ${active?'active':''} ${preview?'previewing':''}" style="--player:${p.color}" data-preview-player="${p.id}" role="button" tabindex="0" title="${active?'Текущий ход':'Показать выход на закрытие'}"><div class="sb-name"><span class="player-dot"></span><strong>${esc(p.name)}</strong>${starter?`<small class="sb-starter" title="Начинал лег">${mobile?'●':'● начинал лег'}</small>`:''}</div><div class="sb-legs">${g.setsToWin?`<span class="sbx sbx-s" title="Сеты"><b>${p.sets||0}</b></span>`:''}<span class="sbx sbx-l" title="${p.wins}/${g.legsToWin}"><b>${p.wins}</b>${legBars(p,g)}</span></div>${mobile?'':`<div class="sb-num">${avg(p)}</div><div class="sb-num">${count180(g,p)}</div><div class="sb-num sb-last">${active?'<span class="sb-throw"><i></i>БРОСАЕТ</span>':preview?'<span class="sb-throw is-preview">ПРОСМОТР</span>':last?(last.bust?'<span class="sb-bust">BUST</span>':last.total):'—'}</div>`}<div class="sb-score player-score ${g.doubleIn&&!p.opened?'not-in':''}">${p.score}</div></div>`;}).join('');}
function scoreboard(mobile=false){const g=state.game,next=nextPlayer(g),best=bestCheckout(g);return `<div class="scoreboard ${mobile?'m-board':''} ${g.setsToWin?'with-sets':''} rows-${Math.min(g.players.length,8)}"><div class="sb-head sb-row"><div class="sb-title">${g.startScore} · <em>${g.doubleIn?'Double In · ':''}Double Out</em> · ${g.setsToWin?`<span>${setsLabel(g.setsToWin)}</span> · `:''}<span>${legsLabel(g.legsToWin)}</span></div><div class="sb-lh">${g.setsToWin?'<span>Сеты</span>':''}<span>Леги</span></div>${mobile?'':'<div>Avg</div><div>180</div><div>Последний</div>'}<div>Счёт</div></div><div class="${mobile?'mobile-scoreboard':'sb-rows'}">${scoreRows(mobile)}</div><div class="sb-foot">${g.setsToWin?`<span>СЕТ <b>${g.setNumber||1}</b></span>`:''}<span>ЛЕГ <b>${g.legNumber||1}</b></span>${mobile?'':`<span>Дротиков в леге <b>${legDarts(g)}</b></span><span>Лучшее закрытие <b>${best||'—'}</b></span>`}${next?`<span class="sb-next">Далее: <b>${esc(next.name)}</b></span>`:''}${mobile?`<button class="open-history sb-history">${icon('clock')}<span>История</span></button>`:''}</div></div>`;}
function routeHtml(route){return route.map(h=>`<b class="route-hit ${h.isTreble?'treble':h.isDouble?(h.label==='BULL'?'bull-hit':'double'):h.label==='BULL'?'bull-hit':'single-hit'}">${h.label}</b>`).join('<i aria-hidden="true">›</i>');}
function visitTrail(v){const fin=v.checkout?(v.hits?.at(-1)?.finishLabel||String(v.hits?.at(-1)?.label||'').match(/D\d+|BULL/)?.[0]||''):'';if(!Number.isInteger(v.start))return v.hits.map(h=>esc(h.label)).join(' · ');const after=v.bust?v.start:v.checkout?0:v.start-v.total;return `${v.start} → ${after}${fin?` · ${esc(fin)}`:''}`;}
function historyRows(limit=7){const g=state.game;if(!g)return'';return g.history.slice(-limit).reverse().map((v,i)=>{const p=g.players.find(x=>x.id===v.playerId),editable=i===0;return `<div class="visit ${editable?'editable-last':''} ${v.checkout?'is-checkout':''} ${v.total===180&&!v.bust?'is-max':''}" style="--player:${p?.color||'#888'}" ${editable?'data-edit-last="1" role="button" tabindex="0" aria-label="Изменить последний подход" title="Изменить последний подход"':''}><span class="visit-name">${esc(p?.name||'')}</span><span class="visit-trail">${visitTrail(v)}</span><b class="${v.bust?'bust':''}">${v.bust?'BUST':v.total}</b>${editable?`<i class="edit-mark" aria-hidden="true">${icon('edit')}</i>`:'<i></i>'}</div>`;}).join('');}
function adviceMarkup(mobile=false,scoreOverride=null,preview=false){
 const rem=scoreOverride??remaining(),plan=stageRoute(rem,preview),cls=mobile?'m-advice':'checkout-advice';
 if(!preview&&needsDoubleIn())return `<div class="${cls} is-setup"><span class="advice-tag">DOUBLE IN</span><strong>Начните с удвоения — очки идут только после него</strong></div>`;
 if(plan.checkout){const alts=plan.routes.slice(1,mobile?1:3);return `<div class="${cls} checkout-live ${preview?'preview-advice':''}"><span class="advice-tag">${preview?'ВЫХОД ИГРОКА':'CHECKOUT'}</span><strong class="route-main">${routeHtml(plan.routes[0])}</strong>${alts.length?`<span class="route-alts"><span>Запасные:</span> ${alts.map(r=>`<span class="route-alt">${r.map(h=>h.label).join(' › ')}</span>`).join(' · ')}</span>`:''}</div>`;}
 const prepText=plan.prep?`${plan.prep.hit.label} → оставить ${plan.prep.remainder}`:'Набирай максимум';
 return `<div class="${cls} is-setup ${preview?'preview-no-checkout':''}"><span class="advice-tag">${preview?'ЗАКРЫТИЯ НЕТ':'ПОДГОТОВКА'}</span><strong>${prepText}</strong></div>`;
}
function desktopGame(){const g=state.game,p=activePlayer(),view=displayPlayer();if(!g||!p||!view)return'';if(g.winner)return `<section class="game-layout desktop-game winner-layout">${winnerCard(g,'winner panel')}</section>`;
 const preview=!!previewPlayer(),rem=Math.max(0,preview?view.score:remaining()),plan=stageRoute(rem,preview);
 return `<section class="game-layout desktop-game ${preview?'is-previewing':''}">${scoreboard(false)}<div class="game-lower"><section class="score-stage panel" style="--player:${view.color}"><div class="stage-cap"><span><span>${preview?'ПРОСМОТР ЗАКРЫТИЯ':'ОСТАТОК'}</span> · <b>${esc(view.name)}</b></span>${preview?`<div class="preview-live-actions"><span class="live-turn-pill">ХОД: <b>${esc(p.name)}</b> · ${p.score}</span><button class="clear-preview stage-back">${icon('undo')}<span>Вернуться</span></button></div>`:`<span>Подход ${view.visits+1} · 3 дротика</span>`}</div><div class="stage-mid"><div class="score-ring" role="status" aria-live="polite" aria-atomic="true"><small>${preview?'СЧЁТ ИГРОКА':'ОСТАЛОСЬ'}</small><strong>${rem}</strong>${dartPlan(plan,preview?[]:g.current)}</div><div class="stage-board">${boardSvg(plan.routes[0]||[])}<small>${plan.checkout?'МАРШРУТ НА МИШЕНИ':plan.routes.length?'КУДА ЦЕЛИТЬСЯ':'МИШЕНЬ'}</small></div></div>${adviceMarkup(false,rem,preview)}</section><aside class="input-panel panel"><div class="desktop-entry-head"><span class="eyebrow">ВВОД ПОДХОДА</span>${inputSwitch()}<div class="history-actions"><button class="icon-button undo" aria-label="Отменить последний подход" title="Отменить последний подход" ${!state.undo.length?'disabled':''}>${icon('undo')}</button><button class="icon-button redo" aria-label="Вернуть отменённый подход" title="Вернуть подход" ${!state.redo.length?'disabled':''}>${icon('redo')}</button></div></div>${isBotTurn()?botPanel():state.inputMode==='darts'?dartsInput():desktopVisitInput()}<div class="desktop-history"><div class="history-title"><span>Последние подходы</span><small>${g.history.length}</small></div><div class="visit-list">${historyRows(8)||'<div class="empty-mini">Подходов пока нет</div>'}</div></div></aside></div></section>`;}
function desktopVisitInput(){const p=activePlayer();return `<div class="desktop-keyboard-entry"><label class="desktop-score-box" for="visit-desktop"><span class="score-box-label">СУММА ПОДХОДА<em>для ${esc(p?.name||'')}</em></span><input class="desktop-score-input" id="visit-desktop" inputmode="numeric" autocomplete="off" autofocus value="${state.visitValue}" placeholder="0–180" maxlength="3"></label><div class="entry-preview desktop-preview">${visitPreview()}</div><button class="desktop-enter-bar submit-visit" type="button"><kbd>ENTER</kbd><strong>Записать подход</strong></button><div class="keyboard-hint"><span><kbd>Ctrl Z</kbd>отменить</span><span><kbd>Ctrl ⇧ Z</kbd>вернуть</span></div></div>`;}
function mobileGame(){const g=state.game,p=activePlayer(),view=displayPlayer();if(!g||!p||!view)return'';if(g.winner)return `<section class="mobile-game is-winner">${winnerCard(g,'m-winner')}</section>`;
 const preview=!!previewPlayer(),rem=Math.max(0,preview?view.score:remaining()),plan=stageRoute(rem,preview),quickValues=[26,41,45,60,81,85,100,140,180],count=g.players.length;
 return `<section class="mobile-game players-count-${count} ${preview?'is-previewing':''}">${scoreboard(true)}<div class="m-hero ${preview?'preview-hero':''}" style="--player:${view.color}" role="status" aria-live="polite" aria-atomic="true"><small>${preview?'СЧЁТ ИГРОКА':'ОСТАЛОСЬ'}</small><strong>${rem}</strong><div class="m-turn">${preview?`<span>Просмотр:</span> <b>${esc(view.name)}</b>`:`<span>Бросает</span> <b>${esc(view.name)}</b>`}</div>${preview?`<button class="clear-preview m-back-turn">${icon('undo')}<span>Вернуться</span></button>`:''}<div class="m-board-wrap">${boardSvg(plan.routes[0]||[])}</div></div>${adviceMarkup(true,rem,preview)}${isBotTurn()?botPanel(true):state.inputMode==='darts'?mobileDartsInput():`<div class="m-entry-v3"><button class="undo-mobile icon-only" aria-label="Отменить последний подход" ${!state.undo.length?'disabled':''}>${icon('undo')}</button><div class="m-value-wrap"><div class="m-value ${state.visitValue?'filled':''}">${state.visitValue||'0–180'}</div><div class="entry-preview">${preview?`<span>ввод для <b>${esc(p.name)}</b></span>`:visitPreview()}</div></div><button class="redo-mobile icon-only" aria-label="Вернуть отменённый подход" ${!state.redo.length?'disabled':''}>${icon('redo')}</button></div><div class="quick-row">${quickValues.map(v=>`<button data-quick="${v}">${v}</button>`).join('')}</div><div class="keypad">${['1','2','3','4','5','6','7','8','9','back','0','ok'].map(k=>`<button data-key="${k}" class="${k==='ok'?'key-ok':k==='back'?'key-back':''}" aria-label="${k==='back'?'Удалить цифру':k==='ok'?'Записать подход':k}">${k==='back'?icon('back'):k==='ok'?'OK':k}</button>`).join('')}`}</div></section>`;}
function visitChart(g,p){const visits=g.history.filter(v=>v.playerId===p.id);if(!visits.length)return '<div class="visit-chart empty">Подходов пока нет</div>';return `<div class="visit-chart" role="img" aria-label="${esc(p.name)}: ${visits.map(v=>v.bust?'BUST':v.total).join(', ')}"><div class="vc-grid"><span style="bottom:${100/180*100}%"><em>100</em></span><span style="bottom:${140/180*100}%"><em>140</em></span><span style="bottom:100%"><em>180</em></span></div><div class="vc-bars">${visits.map((v,i)=>`<i class="${v.bust?'bust':''}${v.checkout?' fin':''}" style="height:${v.bust?2:Math.max(2,v.total/180*100)}%" data-tip="#${i+1} · ${v.bust?'BUST':v.total}${v.checkout?' ✓':''}"></i>`).join('')}</div></div>`;}
const HISTORY_IO=`<div class="history-io"><button class="ghost-button export-history">Экспорт</button><button class="ghost-button import-history">Импорт</button><input id="import-file" type="file" accept="application/json,.json" hidden></div>`;
function allTimeView(){const list=loadHistory();if(!list.length)return `<section class="history-section"><div class="history-head"><h2>Все матчи</h2>${HISTORY_IO}</div><p class="muted-note">Здесь появится статистика после первого завершённого матча.</p></section>`;const by=new Map();for(const m of list.filter(m=>!m.type))for(const p of m.players){const k=p.name.trim().toLowerCase(),a=by.get(k)||{name:p.name,color:p.color,matches:0,wins:0,darts:0,total:0,high:0,c180:0,best:0};a.matches++;if(p.name===m.winner)a.wins++;a.darts+=p.darts;a.total+=p.total;a.high=Math.max(a.high,p.high);a.c180+=p.c180||0;a.best=Math.max(a.best,p.best||0);by.set(k,a);}const rows=[...by.values()].sort((a,b)=>b.matches-a.matches);const lang=state.language==='en'?'en-GB':'ru-RU';return `<section class="history-section"><div class="history-head"><h2>Все матчи</h2>${HISTORY_IO}<button class="ghost-button clear-history">Очистить историю</button></div><div class="alltime-table" role="table"><div class="at-row at-head" role="row"><span>Игрок</span><span>Матчей</span><span>Побед</span><span>Средний</span><span>Лучший</span><span>180</span><span>Закрытие</span></div>${rows.map(a=>`<div class="at-row" role="row" style="--player:${a.color}"><span class="at-name">${esc(a.name)}</span><span>${a.matches}</span><span>${a.wins}</span><span>${a.darts?(a.total/a.darts*3).toFixed(1):'—'}</span><span>${a.high}</span><span>${a.c180}</span><span>${a.best||'—'}</span></div>`).join('')}</div><h3>Последние матчи</h3><div class="match-list">${list.slice(0,12).map(m=>`<div class="match-row"><span class="mr-date">${new Date(m.at).toLocaleDateString(lang,{day:'numeric',month:'short'})}</span><span class="mr-mode">${esc(m.start)}</span><span class="mr-score">${m.players.map(p=>`<b class="${p.name===m.winner?'won':''}" style="--player:${p.color}">${esc(p.name)} ${p.wins}</b>`).join('<i>:</i>')}</span></div>`).join('')}</div></section>`;}
function statsView(){const g=state.game,history=loadHistory();if(!g&&!history.length)return emptyState('Нет статистики','Сначала начни матч.');return `<section class="stats-page">${g?.type?altStats(g):g?`<div class="page-heading"><span class="kicker">ТЕКУЩИЙ МАТЧ</span><h1>Статистика</h1><p>${g.startScore} · Double Out · ${g.history.length} подходов</p></div><div class="stats-grid">${g.players.map(p=>{const mine=g.history.filter(v=>v.playerId===p.id&&!v.bust),tons=mine.filter(v=>v.total>=100).length,best=bestCheckout(g,p);return `<article class="stat-card panel" style="--player:${p.color}"><div class="stat-head"><span class="player-bar"></span><h2>${esc(p.name)}</h2>${legPips(p,g)}</div><strong>${p.darts?(p.total/p.darts*3).toFixed(2):'0.00'}<small>средний набор</small></strong>${visitChart(g,p)}<div class="stat-metrics"><span><b>${p.high}</b>лучший подход</span><span><b>${best||'—'}</b>лучшее закрытие</span><span><b>${tons}</b>100+</span><span><b>${count180(g,p)}</b>180</span><span><b>${p.darts}</b>дротиков</span><span><b>${p.legsWon??p.wins}</b>легов</span>${g.setsToWin?`<span><b>${p.sets||0}</b>сетов</span>`:''}</div></article>`;}).join('')}</div>`:`<div class="page-heading"><span class="kicker">CHECKOUT LAB</span><h1>Статистика</h1></div>`}${allTimeView()}</section>`;}
function visitPreview(){const p=activePlayer(),en=state.language==='en';if(p&&state.visitValue===''&&needsDoubleIn())return `<span>${en?'Double In: count only darts from the double on':'Double In: считайте очки, начиная с удвоения'}</span>`;if(!p||state.visitValue==='')return `<span>${en?'Enter visit score':'Введите сумму подхода'}</span>`;const v=Number(state.visitValue);if(!isPossibleVisitTotal(v))return `<span class="preview-impossible">${en?`${v} cannot be scored with 3 darts`:`${v} нельзя набрать за 3 дротика`}</span>`;const left=p.score-v;if(left<0||left===1)return `<span class="preview-bust">${en?'BUST — score stays unchanged':'BUST — счёт не изменится'}</span>`;if(left===0)return `<span class="preview-checkout">${en?'CHECKOUT · choose the finishing double':'ЗАКРЫТИЕ · выберите последнее удвоение'}</span>`;const next=checkoutRoutes(left,3,1)[0];return `<span>${en?'remaining':'останется'} <b>${left}</b>${next?` <em class="preview-route">· ${next.map(h=>h.label).join(' › ')}</em>`:''}</span>`;}
function header(){
 const item=(screen,ic,label)=>`<button class="nav-item ${state.screen===screen?'active':''}" data-nav="${screen}">${icon(ic)}<span>${label}</span></button>`;
 return `<header class="topbar"><button class="brand" data-nav="setup" aria-label="Checkout Lab"><span class="brand-mark">${icon('target')}</span><span class="brand-name">Checkout<b>Lab</b></span></button><nav class="topnav">${item('setup','plus','Новая игра')}${state.game?item('game','play','Матч'):''}${item('training','target','Тренировка')}${item('tournament','trophy','Турнир')}${item('checkouts','route','Закрытия')}<button class="nav-item" data-table-link>${icon('table')}<span>Таблица 2–170</span></button>${item('stats','stats','Статистика')}</nav><div class="top-actions"><button class="icon-button lang-toggle" aria-label="Язык" title="Язык">${state.language==='ru'?'EN':'RU'}</button><button class="icon-button settings-toggle" aria-label="Настройки" title="Настройки">${icon('sliders')}</button><button class="icon-button theme-toggle" aria-label="Сменить тему" title="Сменить тему">${icon(state.theme==='dark'?'sun':'moon')}</button></div><button class="mobile-menu-button ${state.mobileMenu?'open':''}" aria-label="Меню" aria-expanded="${state.mobileMenu}">${icon(state.mobileMenu?'close':'menu')}</button></header>`;
}
function mobileMenu(){
 if(!state.mobileMenu)return'';
 const item=(screen,ic,label)=>`<button class="mm-link ${state.screen===screen?'active':''}" data-nav="${screen}">${icon(ic)}<span>${label}</span></button>`;
 const row=(cls,ic,label,on)=>`<button class="mm-row ${cls}" aria-pressed="${on}">${icon(ic)}<span>${label}</span>${switchMark(on)}</button>`;
 return `<div class="mobile-menu-backdrop"></div><div class="mobile-menu" role="menu"><div class="mm-links">${item('setup','plus','Новая игра')}${state.game?item('game','play','Матч'):''}${item('training','target','Тренировка')}${item('tournament','trophy','Турнир')}${item('checkouts','route','Закрытия')}<button class="mm-link" data-table-link>${icon('table')}<span>Таблица закрытий 2–170</span></button>${item('stats','stats','Статистика')}</div><div class="mm-group">${state.game?`<button class="mm-row focus-toggle">${icon('expand')}<span>Режим у мишени</span><em>⛶</em></button>`:''}${row('voice-toggle','sound','Голос диктора',state.voice)}${state.voice?`<button class="mm-row caller-next">${icon('users')}<span>Диктор</span><em>${esc(currentCaller()?.label||'—')}</em></button>`:''}<button class="mm-row input-toggle">${icon('table')}<span>Ввод</span><em>${state.inputMode==='darts'?'По дротикам':'Сумма'}</em></button>${row('sound-toggle','sound','Звук',state.sound)}${row('vibration-toggle','vibrate','Вибрация',state.vibration)}${row('wake-toggle','screen','Экран не гаснет',state.wakeLock)}${row('theme-toggle','sun','Светлая тема',state.theme==='light')}<button class="mm-row lang-toggle">${icon('globe')}<span>Язык</span><em>${state.language==='ru'?'RU':'EN'}</em></button></div></div>`;
}

const MODE_SUB={cricket:'Закрой 15–20 и Bull',clock:'По порядку от 1 до Bull',shanghai:'7 раундов, цель — номер раунда',killer:'Свой номер, 3 жизни, последний побеждает'},MODE_NOTE={cricket:'15–20 · Bull · очки за закрытые',clock:'1 → 20 → Bull',shanghai:'S × 1 · D × 2 · T × 3 · Shanghai = победа',killer:'Только удвоения · от 2 игроков'};
const MODES=[[301,'301','очков'],[501,'501','очков'],[0,'СВОЯ','режим'],['cricket','CRICKET','15–20 · Bull'],['clock','КРУГ','1 → 20 → Bull'],['shanghai','SHANGHAI','1 → 7 · S D T'],['killer','KILLER','удвоения · жизни']];
function recentNames(){const seen=new Set(state.names.map(n=>n.trim().toLowerCase())),out=[];for(const m of loadHistory())for(const p of m.players){const k=p.name.trim().toLowerCase();if(!k||p.bot||/^(Бот|CPU) · /.test(p.name)||seen.has(k))continue;seen.add(k);out.push(p.name.trim());if(out.length===8)return out;}return out;}
function setupView(){
 const alt=ALT_TYPES.includes(state.mode),recent=recentNames();
 const features=[['route','Подсказки закрытий','Маршруты Double Out от 2 до 170'],['users','Игроки и компьютер','До 8 игроков, бот пяти уровней'],['offline','Работает офлайн','Установи на телефон как приложение']];
 return `<section class="setup-page"><div class="setup-intro"><span class="kicker">ДАРТС БЕЗ ЛИШНЕГО</span><h1>Бросай.<br><span class="accent-line">Мы посчитаем.</span></h1><p>Счётчик для дартса 301/501 и Cricket: точные закрытия, игра против компьютера, до 8 игроков. Работает без интернета.</p>${state.game?`<button class="continue" data-nav="game">${icon('play')}<span>Продолжить текущий матч</span></button>`:''}<ul class="feature-list">${features.map(([ic,t,s])=>`<li><span class="feature-icon">${icon(ic)}</span><div><b>${t}</b><small>${s}</small></div></li>`).join('')}</ul></div><div class="setup-card panel"><div class="step"><span>01</span><div><h2>Выбери игру</h2><p>${alt?(MODE_SUB[state.mode]):'Double Out включён'}</p></div></div><div class="mode-grid">${MODES.map(([v,t,sub])=>`<button data-mode="${v}" class="${state.mode===v?'active':''} ${typeof v==='string'?'mode-alt':''}" aria-pressed="${state.mode===v}"><strong>${t}</strong><small>${sub}</small></button>`).join('')}</div>${state.mode===0?`<label class="field-label">Начальный счёт<input id="custom-score" type="number" min="2" max="5001" value="${state.customScore}"></label>`:''}<div class="step"><span>02</span><div><h2>Добавь игроков</h2><p>От одного до восьми</p></div></div><div class="name-list">${state.names.map((n,i)=>`<div class="name-row"><span class="name-num" style="--player:${COLORS[i%COLORS.length]}">${i+1}</span><input class="player-name" data-index="${i}" value="${esc(n)}" placeholder="Игрок ${i+1}" aria-label="Имя игрока ${i+1}" maxlength="40">${state.names.length>1?`<button class="remove-player" data-index="${i}" aria-label="Удалить игрока ${i+1}">${icon('close')}</button>`:'<span></span>'}</div>`).join('')}</div>${state.names.length<8?`<button class="add-player">${icon('plus')}<span>Добавить игрока</span></button>`:''}${recent.length?`<div class="recent-players"><span>Недавние:</span>${recent.map(n=>`<button data-recent="${esc(n)}">${esc(n)}</button>`).join('')}</div>`:''}<div class="settings-row ${alt&&state.mode!=='cricket'?'':'x01-options'}"><label>${!alt&&state.sets?'Легов в сете':'Легов для победы'}<select id="legs-select">${[1,2,3,4,5,6,7].map(n=>`<option ${state.legs===n?'selected':''}>${n}</option>`).join('')}</select></label>${alt?'':`<label>Сеты<select id="sets-select">${[0,2,3,4,5].map(n=>`<option value="${n}" ${state.sets===n?'selected':''}>${n?setsLabel(n):'Без сетов'}</option>`).join('')}</select></label><label>Начало<select id="in-select"><option value="0">Свободное</option><option value="1" ${state.doubleIn?'selected':''}>Double In</option></select></label>`}${!alt||state.mode==='cricket'?`<label>Компьютер<select id="bot-select"><option value="0">Без бота</option>${BOT_LEVELS.map(l=>`<option value="${l.level}" ${state.botLevel===l.level?'selected':''}>${l.name} · ≈${l.avg}</option>`).join('')}</select></label>`:''}<span class="rules-note">${alt?MODE_NOTE[state.mode]:state.doubleIn?'Double In · Double Out':'Double Out · Bull разрешён'}</span></div><button class="start-button"><span>НАЧАТЬ МАТЧ</span>${icon('arrow')}</button></div></section>`;
}
function historyDrawer(){if(!state.historyOpen||!state.game)return'';return `<div class="drawer-backdrop close-history"><section class="history-drawer panel" role="dialog" aria-modal="true" aria-labelledby="history-title" onclick="event.stopPropagation()"><div class="drawer-handle"></div><div class="drawer-head"><div><span class="eyebrow">ИСТОРИЯ МАТЧА</span><strong id="history-title">Последние подходы</strong></div><button class="close-history icon-button" aria-label="Закрыть историю">${icon('close')}</button></div><div class="drawer-list visit-list">${historyRows(18)||'<div class="empty-mini">Подходов пока нет</div>'}</div></section></div>`;}
function momentOverlay(){const m=state.moment;return m?`<div class="game-moment ${m.tone}" role="status" aria-live="assertive">${m.who?`<span class="gm-who">${esc(m.who)}</span>`:''}<span class="gm-label">${m.label}</span></div>`:'';}
function winnerScoreline(g){const w=g.players.find(p=>p.id===g.winner);if(!w)return'';if(g.players.length===2){const o=g.players.find(p=>p.id!==g.winner);return `${matchScore(w,g)} : ${o?matchScore(o,g):0}`;}return g.players.map(p=>`${esc(p.name)} ${matchScore(p,g)}`).join(' · ');}
function winnerCard(g,cls){const w=g.players.find(x=>x.id===g.winner);return `<div class="${cls}" style="--player:${w?.color||'#e83f5b'}"><span class="winner-mark">${icon('target')}</span><span class="eyebrow">ПОБЕДИТЕЛЬ МАТЧА</span><h1>${esc(w?.name||'')}</h1><div class="winner-score">${winnerScoreline(g)}</div><div class="winner-actions">${g.tm?`<button class="primary" data-nav="tournament">${icon('trophy')}<span>К турниру</span></button>`:`<button class="primary play-again">${icon('play')}<span>Сыграть ещё</span></button>`}<button class="ghost-button share-result">${icon('share')}<span>Поделиться</span></button><button class="ghost-button" data-nav="stats">${icon('stats')}<span>Статистика</span></button></div></div>`;}
const DOUBLE_TARGETS=[...Array.from({length:20},(_,i)=>`D${i+1}`),'BULL'];
function newQuizTarget(){let n;do{n=2+Math.floor(Math.random()*169);}while(BOGEY.has(n));return n;}
function ensureTraining(){if(!state.training)state.training={tab:'quiz',mult:1,target:newQuizTarget(),picks:[],result:null,score:0,streak:0,rounds:0,dIdx:0,dDarts:[],dHits:{}};return state.training;}
function quizCheck(revealed=false){const t=state.training,sum=t.picks.reduce((x,h)=>x+h.value,0),last=t.picks.at(-1),valid=!revealed&&sum===t.target&&!!last?.isDouble,best=checkoutRoutes(t.target,3,4),key=r=>r.map(h=>h.label).join('-'),optimal=valid&&best.some(r=>key(r)===key(normalizeCheckoutRoute(t.picks)));t.rounds++;if(valid){t.score+=optimal?2:1;t.streak++;if(t.streak>state.trainBest){state.trainBest=t.streak;save();}}else t.streak=0;t.result={valid,optimal,revealed,best};playSound(valid?'leg':'bust');haptic(valid?'leg':'bust');}
function quizPick(h){const t=ensureTraining();if(t.result)return;t.picks.push(h);t.mult=1;const sum=t.picks.reduce((x,d)=>x+d.value,0);if(sum>=t.target||t.picks.length===3)quizCheck();else{playSound('tap');haptic('tap');}render();}
function quizNext(){const t=ensureTraining();t.target=newQuizTarget();t.picks=[];t.result=null;t.mult=1;render();}
function doublesMark(hit){const t=ensureTraining();if(t.dIdx>=DOUBLE_TARGETS.length)return;t.dDarts.push(!!hit);playSound(hit?'double':'tap');haptic(hit?'double':'tap');if(t.dDarts.length===3){t.dHits[DOUBLE_TARGETS[t.dIdx]]=t.dDarts.filter(Boolean).length;t.dIdx++;t.dDarts=[];}render();}
function doublesUndo(){const t=ensureTraining();if(t.dDarts.length)t.dDarts.pop();else if(t.dIdx>0){t.dIdx--;const k=DOUBLE_TARGETS[t.dIdx],h=t.dHits[k]||0;delete t.dHits[k];t.dDarts=[...Array(h).fill(true),...Array(3-h).fill(false)].slice(0,2);}render();}
function quizView(t){const r=t.result;return `<div class="train-grid"><section class="panel train-stage"><div class="train-stats"><span>Очки <b>${t.score}</b></span><span>Серия <b>${t.streak}</b></span><span>Рекорд <b>${state.trainBest}</b></span></div><small class="train-label">ЗАКРОЙ</small><strong class="train-target">${t.target}</strong>${dartPlan({routes:[]},t.picks)}${r?`<div class="train-result ${r.valid?'ok':'bad'}"><b>${r.valid?(r.optimal?'Оптимально!':'Верно'):r.revealed?'Ответ':'Не закрывает'}</b><span>Лучшие маршруты:</span><div class="train-routes">${r.best.slice(0,3).map(x=>`<div class="route-main">${routeHtml(x)}</div>`).join('')}</div></div><button class="primary quiz-next">${icon('arrow')}<span>Дальше</span></button>`:`<p class="train-hint">Наберите маршрут дротиками. Последний — в удвоение.</p><button class="ghost-button quiz-reveal">Показать ответ</button>`}</section><section class="panel train-pad">${dartPad('t',!!t.picks.length&&!r)}</section></div>`;}
function doublesView(t){const done=t.dIdx>=DOUBLE_TARGETS.length,target=DOUBLE_TARGETS[t.dIdx],hits=Object.values(t.dHits).reduce((a,b)=>a+b,0),thrown=Object.keys(t.dHits).length*3,pct=thrown?Math.round(hits/thrown*100):0;
 if(done){const sorted=Object.entries(t.dHits).sort((a,b)=>b[1]-a[1]);return `<section class="panel train-stage train-summary"><small class="train-label">РЕЗУЛЬТАТ</small><strong class="train-target">${pct}%</strong><p>${hits} из ${thrown} дротиков в удвоение</p><div class="dbl-grid">${DOUBLE_TARGETS.map(k=>`<span class="h${t.dHits[k]||0}"><b>${k}</b>${t.dHits[k]||0}/3</span>`).join('')}</div><p class="train-hint">Лучшие: ${sorted.slice(0,3).map(([k])=>k).join(', ')} · Слабые: ${sorted.slice(-3).reverse().map(([k])=>k).join(', ')}</p><button class="primary dbl-restart">${icon('undo')}<span>Ещё раз</span></button></section>`;}
 return `<section class="panel train-stage"><div class="train-stats"><span>Цель <b>${t.dIdx+1} / ${DOUBLE_TARGETS.length}</b></span><span>Попаданий <b>${pct}%</b></span></div><small class="train-label">БРОСАЙТЕ В</small><strong class="train-target double">${target}</strong><div class="dbl-darts">${[0,1,2].map(i=>`<span class="${i<t.dDarts.length?(t.dDarts[i]?'hit':'miss'):''}">${i<t.dDarts.length?(t.dDarts[i]?'✓':'×'):i+1}</span>`).join('')}</div><div class="dbl-actions"><button class="dbl-miss">Мимо</button><button class="dbl-hit">Попал</button></div><button class="ghost-button dbl-undo" ${!t.dIdx&&!t.dDarts.length?'disabled':''}>${icon('undo')}<span>Отменить</span></button><p class="train-hint">Три дротика в каждое удвоение от D1 до D20 и в Bull. Отмечайте попадания.</p></section>`;}
function trainingView(){const t=ensureTraining();return `<section class="training-page"><div class="page-heading"><span class="kicker">ТРЕНИРОВКА</span><h1>Тренировка</h1><p>${TRAIN_TABS.find(x=>x[0]===t.tab)?.[2]||''}</p><div class="input-switch train-tabs">${TRAIN_TABS.map(([k,l])=>`<button data-ttab="${k}" class="${t.tab===k?'active':''}">${l}</button>`).join('')}</div></div>${t.tab==='quiz'?quizView(t):t.tab==='bobs'?bobsView(t):t.tab==='c121'?c121View(t):doublesView(t)}</section>`;}
const TRAIN_TABS=[['quiz','Закрытия','Назовите маршрут закрытия для случайного остатка: +2 за оптимальный, +1 за верный.'],['doubles','Удвоения','Круг по удвоениям у мишени: отмечайте каждый дротик и смотрите процент попаданий.'],['bobs',"Bob's 27","Bob's 27 — классическая тренировка удвоений: старт с 27 очков, три дротика в каждое удвоение от D1 до Bull."],['c121','121','121 Checkout: закройте остаток за 9 дротиков. Получилось — цель растёт.']];
// --- Cricket and Around the Clock -------------------------------------------------
const CRICKET_TARGETS=[20,19,18,17,16,15,25];
const MODE_LABEL={cricket:'CRICKET',clock:'AROUND THE CLOCK',shanghai:'SHANGHAI',killer:'KILLER'};
const ALT_TYPES=Object.keys(MODE_LABEL);
const SHANGHAI_ROUNDS=7,KILLER_LIVES=3;
function emptyMarks(){return Object.fromEntries(CRICKET_TARGETS.map(n=>[n,0]));}
function resetAltPlayer(p,type){if(type==='cricket')Object.assign(p,{marks:emptyMarks(),points:0});else if(type==='clock')p.target=1;else if(type==='shanghai')p.points=0;else Object.assign(p,{lives:KILLER_LIVES,killer:false});}
function altPlayer(name,index,type){const p={id:id(),name,color:COLORS[index%COLORS.length],darts:0,wins:0,hits:0};if(type==='cricket')p.marksTotal=0;resetAltPlayer(p,type);return p;}
function startAltGame(type){
 const players=state.names.map(n=>n.trim()).filter(Boolean).map((n,i)=>altPlayer(n,i,type));
 const level=type==='cricket'&&BOT_LEVELS.find(l=>l.level===state.botLevel);if(level&&players.length&&players.length<8)players.push({...altPlayer(state.language==='en'?`CPU · ${level.en}`:`Бот · ${level.name}`,players.length,type),bot:level.level});
 if(!players.length)return;
 if(type==='killer'){if(players.length<2){window.alert?.(state.language==='en'?'Killer needs at least two players.':'Для Killer нужно минимум два игрока.');return;}const nums=Array.from({length:20},(_,i)=>i+1).sort(()=>Math.random()-.5);players.forEach((p,i)=>{p.num=nums[i];});}
 cancelBot();state.game={id:id(),type,players,active:0,legStarter:0,legNumber:1,round:1,current:[],history:[],legsToWin:Number(state.legs)||1,winner:null};state.undo=[];state.redo=[];state.previewPlayerId=null;state.screen='game';save();render();
}
function cricketApply(g,p,h){
 const n=h.number,m=h.multiplier||0;if(!m||!CRICKET_TARGETS.includes(n))return{marks:0,points:0};
 const closing=Math.min(m,3-p.marks[n]),extra=m-closing,open=g.players.some(o=>o!==p&&o.marks[n]<3),points=open?extra*n:0;
 p.marks[n]=Math.min(3,p.marks[n]+m);p.points+=points;const marks=closing+(points?extra:0);p.marksTotal+=marks;return{marks,points};
}
function cricketLeader(g,p){return CRICKET_TARGETS.every(n=>p.marks[n]>=3)&&g.players.every(o=>o===p||p.points>=o.points);}
function cricketBotAim(g,p){
 const pick=n=>n===25?byLabel.BULL:byLabel[`T${n}`],open=CRICKET_TARGETS.filter(n=>p.marks[n]<3);
 const behind=g.players.some(o=>o!==p&&o.points>p.points),scoring=CRICKET_TARGETS.filter(n=>p.marks[n]>=3&&g.players.some(o=>o!==p&&o.marks[n]<3));
 if(scoring.length&&(behind||!open.length))return pick(scoring[0]);
 return pick(open[0]??20);
}
function clockTargetLabel(t){return t>=21?'BULL':String(t);}
function alivePlayers(g){return g.type==='killer'?g.players.filter(p=>p.lives>0):g.players;}
function nextActive(g){const n=g.players.length;let i=g.active;for(let k=0;k<n;k++){i=(i+1)%n;if(g.type!=='killer'||g.players[i].lives>0)return i;}return g.active;}
function shanghaiTarget(g){return Math.min(20,g.round||1);}
function isShanghai(hits,target){const ms=new Set(hits.filter(r=>r.n===target).map(r=>r.m));return ms.has(1)&&ms.has(2)&&ms.has(3);}
// Ends the active player's turn. legWinner: player who just won the leg (or null).
function altEndTurn(g,legWinner=null){
 const p=g.players[g.active];g.history.push({playerId:p.id,hits:g.current,legWon:!!legWinner,dartCount:g.current.length});g.current=[];
 let winner=legWinner;
 if(!winner){
  const wasStarter=g.legStarter;g.active=nextActive(g);
  if(g.type==='shanghai'&&g.active===wasStarter){
   if(g.round>=SHANGHAI_ROUNDS){const best=Math.max(...g.players.map(x=>x.points)),leaders=g.players.filter(x=>x.points===best);if(leaders.length===1||g.round>=20)winner=leaders[0];}
   if(!winner)g.round++;
  }
 }
 if(!winner)return null;
 winner.wins++;if(winner.wins>=g.legsToWin){g.winner=winner.id;return winner;}
 for(const x of g.players)resetAltPlayer(x,g.type);
 g.round=1;g.legStarter=(g.legStarter+1)%g.players.length;g.legNumber++;g.active=g.legStarter;return winner;
}
function altDart(input,fromBot=false){
 const g=state.game;if(!g?.type||g.winner||(!fromBot&&isBotTurn()))return;snapshot();
 const next=clone(g),p=next.players[next.active];p.darts++;let rec,winner=null,kind='tap',endNow=false;
 if(next.type==='cricket'){const h=input||MISS,r=cricketApply(next,p,h);rec={label:h.label,marks:r.marks,points:r.points};if(r.marks)p.hits++;if(cricketLeader(next,p))winner=p;kind=r.marks>=3?'treble':r.marks?'double':'tap';}
 else if(next.type==='clock'){const ok=!!input;rec={label:ok?clockTargetLabel(p.target):'MISS',hit:ok};if(ok){p.hits++;p.target++;kind='double';}if(p.target>21)winner=p;}
 else if(next.type==='shanghai'){const m=Number(input)||0,n=shanghaiTarget(next),pts=m*n;p.points+=pts;if(m)p.hits++;rec={label:m?`${'SDT'[m-1]}${n}`:'MISS',hit:!!m,points:pts,m,n};kind=m===3?'treble':m?'double':'tap';if(isShanghai([...next.current,rec],n)){winner=p;}}
 else{const t=input==null?null:next.players.find(x=>x.num===Number(input)&&x.lives>0);rec={label:t?`D${t.num}`:'MISS',hit:!!t};
  if(t){p.hits++;kind='double';if(!p.killer){if(t===p){p.killer=true;rec.note='killer';}}else{t.lives=Math.max(0,t.lives-1);rec.note=t===p?'self':'hit';}}
  const alive=alivePlayers(next);if(alive.length===1)winner=alive[0];else if(p.lives===0)endNow=true;}
 next.current.push(rec);if(winner||endNow||next.current.length===3)winner=altEndTurn(next,winner)||null;
 state.game=next;altMoment(next,winner,kind);
}
function altFinishTurn(){
 const g=state.game;if(!g?.type||g.winner||isBotTurn()||!g.current.length&&!window.confirm?.(state.language==='en'?'Skip this turn (3 misses)?':'Пропустить ход (3 промаха)?'))return;
 snapshot();const next=clone(g),p=next.players[next.active];while(next.current.length<3){next.current.push(next.type==='cricket'?{label:'MISS',marks:0,points:0}:{label:'MISS',hit:false,points:0});p.darts++;}
 const winner=altEndTurn(next,null);state.game=next;altMoment(next,winner,'confirm');
}
function altMoment(next,winner,kind){
 if(winner){kind=next.winner?'match':'leg';state.moment={label:next.winner?'МАТЧ!':'LEG!',tone:'leg',at:Date.now(),who:winner.name};const stamp=state.moment.at;setTimeout(()=>{if(state.moment?.at===stamp){state.moment=null;render();}},900);}
 playSound(kind);haptic(kind);save();render();if(winner)runMomentMotion(kind);
}
function altSummary(g){return{id:g.id,at:Date.now(),type:g.type,start:MODE_LABEL[g.type],legsToWin:g.legsToWin,winner:g.players.find(p=>p.id===g.winner)?.name||'',players:g.players.map(p=>({name:p.name,color:p.color,bot:p.bot||0,wins:p.wins,darts:p.darts,hits:p.hits,marks:p.marksTotal||0}))};}
function mpr(p){return p.darts?(p.marksTotal/p.darts*3).toFixed(2):'0.00';}
function hitRate(p){return p.darts?Math.round(p.hits/p.darts*100):0;}
const MARK_SVG=['','<path d="M7 17 17 7"/>','<path d="M7 17 17 7M7 7l10 10"/>','<path d="M7.5 16.5l9-9M7.5 7.5l9 9"/><circle cx="12" cy="12" r="8.5"/>'];
function markIcon(n){return n?`<svg class="mk mk${n}" viewBox="0 0 24 24" aria-label="${n}/3">${MARK_SVG[n]}</svg>`:'<span class="mk mk0"></span>';}
function altSlots(g){const pts=g.type==='cricket'||g.type==='shanghai';return `<div class="thrown-slots alt-slots">${[0,1,2].map(i=>{const r=g.current[i];if(!r)return '<span class="empty">—</span>';const good=g.type==='cricket'?r.marks>0:r.hit,strong=g.type==='cricket'?r.marks>=3:r.m===3||r.note==='killer';return `<span class="${good?(strong?'treble':'double'):'miss-hit'}">${esc(r.label)}${pts&&r.points?`<small>+${r.points}</small>`:''}</span>`;}).join('')}<b>${pts?`+${g.current.reduce((x,r)=>x+(r.points||0),0)}`:`${g.current.filter(r=>r.hit).length}/3`}</b></div>`;}
function altTools(){return `<div class="alt-tools"><button class="icon-button undo" aria-label="Отменить последний дротик" title="Отменить последний дротик" ${!state.undo.length?'disabled':''}>${icon('undo')}</button><button class="ghost-button alt-end-turn">${icon('arrow')}<span>Конец хода</span></button><button class="icon-button redo" aria-label="Вернуть" title="Вернуть" ${!state.redo.length?'disabled':''}>${icon('redo')}</button></div>`;}
function altHead(g){return `<div class="alt-head"><span class="kicker">${MODE_LABEL[g.type]}</span><span><span>${legsLabel(g.legsToWin)}</span> · <span>ЛЕГ</span> <b>${g.legNumber}</b></span></div>`;}
function cricketView(g){
 const p=activePlayer(),cols=g.players.length,closedAll=n=>g.players.every(x=>x.marks[n]>=3);
 const board=`<div class="cricket-board panel" style="--cols:${cols}" role="table" aria-label="Cricket"><div class="cb-row cb-head" role="row"><span></span>${g.players.map((x,i)=>`<span class="cb-player ${i===g.active?'active':''}" style="--player:${x.color}"><b>${esc(x.name)}</b>${legPips(x,g)}</span>`).join('')}</div>${CRICKET_TARGETS.map(n=>`<div class="cb-row ${closedAll(n)?'closed':''}" role="row"><span class="cb-num">${n===25?'BULL':n}</span>${g.players.map((x,i)=>`<span class="cb-cell ${i===g.active?'active':''}" style="--player:${x.color}">${markIcon(x.marks[n])}</span>`).join('')}</div>`).join('')}<div class="cb-row cb-points" role="row"><span class="cb-num">ОЧКИ</span>${g.players.map((x,i)=>`<span class="cb-cell ${i===g.active?'active':''}" style="--player:${x.color}"><b>${x.points}</b><small>MPR ${mpr(x)}</small></span>`).join('')}</div></div>`;
 return `<section class="alt-game cricket-game">${board}<aside class="alt-input panel" style="--player:${p.color}">${altHead(g)}${isBotTurn()?botPanel(false,altSlots(g)):`<div class="alt-turn"><small>БРОСАЕТ</small><strong>${esc(p.name)}</strong></div>${altSlots(g)}${dartPad('',!!state.undo.length,[20,19,18,17,16,15])}${altTools()}`}<p class="train-hint">Закройте 15–20 и Bull тремя попаданиями. Лишние попадания по своему закрытому сектору дают очки, пока соперник его не закрыл.</p></aside></section>`;
}
function clockView(g){
 const p=activePlayer();
 const list=`<div class="clock-list panel">${g.players.map((x,i)=>`<div class="clock-row ${i===g.active?'active':''}" style="--player:${x.color}"><span class="clock-name"><b>${esc(x.name)}</b>${legPips(x,g)}</span><span class="clock-bar"><i style="width:${Math.min(100,(x.target-1)/21*100)}%"></i></span><span class="clock-target">${x.target>21?'✓':clockTargetLabel(x.target)}</span><small>${hitRate(x)}%</small></div>`).join('')}</div>`;
 return `<section class="alt-game clock-game">${list}<aside class="alt-input panel" style="--player:${p.color}">${altHead(g)}<div class="alt-turn"><small><span>${esc(p.name)}</span> · <span>ЦЕЛЬ</span></small><strong class="clock-now">${clockTargetLabel(p.target)}</strong></div>${altSlots(g)}<div class="dbl-actions"><button class="dbl-miss clock-miss">Мимо</button><button class="dbl-hit clock-hit">Попал</button></div>${altTools()}<p class="train-hint">Попадите по очереди в каждый сектор от 1 до 20, затем в Bull. Подходит любое попадание в сектор: одиночное, удвоение или утроение.</p></aside></section>`;
}
function altMetric(g,p){return g.type==='cricket'?[mpr(p),'отметок за раунд (MPR)',[[p.points,'очков'],[p.marksTotal,'отметок']]]:g.type==='shanghai'?[String(p.points),'очков',[[`${hitRate(p)}%`,'попаданий'],[p.hits,'попаданий']]]:g.type==='killer'?[`${hitRate(p)}%`,'попаданий',[[`D${p.num}`,'номер'],[p.lives,'жизней']]]:[`${hitRate(p)}%`,'попаданий',[[clockTargetLabel(Math.min(p.target,21)),'цель'],[p.hits,'попаданий']]];}
function shanghaiView(g){
 const p=activePlayer(),n=shanghaiTarget(g),best=Math.max(...g.players.map(x=>x.points));
 const list=`<div class="clock-list panel">${g.players.map((x,i)=>`<div class="clock-row sh-row ${i===g.active?'active':''}" style="--player:${x.color}"><span class="clock-name"><b>${esc(x.name)}</b>${legPips(x,g)}</span><span class="clock-bar"><i style="width:${best?x.points/best*100:0}%"></i></span><span class="clock-target">${x.points}</span><small>${hitRate(x)}%</small></div>`).join('')}</div>`;
 return `<section class="alt-game clock-game">${list}<aside class="alt-input panel" style="--player:${p.color}">${altHead(g)}<div class="alt-turn"><small><span>${esc(p.name)}</span> · <span>РАУНД</span> ${Math.min(g.round,20)}${g.round<=SHANGHAI_ROUNDS?` / ${SHANGHAI_ROUNDS}`:''}</small><strong class="clock-now">${n}</strong></div>${altSlots(g)}<div class="sh-pad"><button class="sh-btn miss" data-sh="0">Мимо</button>${[1,2,3].map(m=>`<button class="sh-btn m${m}" data-sh="${m}"><b>${'SDT'[m-1]}${n}</b><small>+${m*n}</small></button>`).join('')}</div>${altTools()}<p class="train-hint">Раунд 1 — бросаем в 1, раунд 2 — в 2 и так до 7. Очки: одиночный × 1, удвоение × 2, утроение × 3. Shanghai — одиночный, удвоение и утроение одного числа за подход — мгновенная победа.</p></aside></section>`;
}
function killerView(g){
 const p=activePlayer();
 const cards=`<div class="killer-grid">${g.players.map((x,i)=>`<div class="killer-card panel ${i===g.active?'active':''} ${x.lives?'':'out'} ${x.killer?'is-killer':''}" style="--player:${x.color}"><span class="kc-num">D${x.num}</span><b>${esc(x.name)}</b><span class="kc-lives" aria-label="${x.lives}/${KILLER_LIVES}">${Array.from({length:KILLER_LIVES},(_,k)=>`<i class="${k<x.lives?'on':''}"></i>`).join('')}</span>${x.lives?(x.killer?'<em>KILLER</em>':''):'<em class="kc-out">ВЫБЫЛ</em>'}${legPips(x,g)}</div>`).join('')}</div>`;
 const targets=g.players.filter(x=>x.lives>0);
 return `<section class="alt-game killer-game">${cards}<aside class="alt-input panel" style="--player:${p.color}">${altHead(g)}<div class="alt-turn"><small>БРОСАЕТ</small><strong>${esc(p.name)}</strong></div><p class="killer-goal">${p.killer?'Вы Killer — бейте в удвоения соперников':`<span>Сначала попадите в своё</span> <b>D${p.num}</b>`}</p>${altSlots(g)}<div class="killer-pad"><button class="sh-btn miss" data-kill="miss">Мимо</button>${targets.map(x=>`<button class="sh-btn ${x===p?'own':''}" data-kill="${x.num}" style="--player:${x.color}"><b>D${x.num}</b><small>${esc(x.name)}</small></button>`).join('')}</div>${altTools()}<p class="train-hint">У каждого свой номер и ${KILLER_LIVES} жизни. Попадите в удвоение своего номера, чтобы стать Killer. После этого каждое попадание в удвоение соперника отнимает у него жизнь, а в своё — у вас. Побеждает последний оставшийся.</p></aside></section>`;
}
function altStats(g){return `<div class="page-heading"><span class="kicker">ТЕКУЩИЙ МАТЧ</span><h1>Статистика</h1><p>${MODE_LABEL[g.type]} · <span>${legsLabel(g.legsToWin)}</span></p></div><div class="stats-grid">${g.players.map(p=>{const[big,label,rows]=altMetric(g,p);return `<article class="stat-card panel" style="--player:${p.color}"><div class="stat-head"><span class="player-bar"></span><h2>${esc(p.name)}</h2>${legPips(p,g)}</div><strong>${big}<small>${label}</small></strong><div class="stat-metrics">${rows.map(([v,l])=>`<span><b>${v}</b>${l}</span>`).join('')}<span><b>${p.darts}</b>дротиков</span><span><b>${p.wins}</b>легов</span></div></article>`;}).join('')}</div>`;}
// --- Tournament: knockout bracket or round robin ------------------------------------
const TOURNAMENT='checkout-lab-tournament-v1',BYE=-1,T_MODES=[[501,'501'],[301,'301'],['cricket','CRICKET']];
function loadTournament(){try{const t=JSON.parse(localStorage.getItem(TOURNAMENT)||'null');return validTournament(t)?t:null;}catch{return null;}}
function validTournament(t){return t&&typeof t.id==='string'&&['knockout','league'].includes(t.format)&&Array.isArray(t.players)&&integerBetween(t.players.length,3,16)&&t.players.every(p=>p&&typeof p.name==='string'&&/^#[0-9a-f]{3,8}$/i.test(p.color))&&Array.isArray(t.matches)&&t.matches.every(m=>m&&typeof m.id==='string'&&Number.isInteger(m.round)&&Number.isInteger(m.idx));}
function saveTournament(){try{state.tournament?localStorage.setItem(TOURNAMENT,JSON.stringify(state.tournament)):localStorage.removeItem(TOURNAMENT);}catch{}}
function tDraft(){if(!state.tDraft)state.tDraft={format:'knockout',mode:501,legs:2,shuffle:true,names:state.names.filter(n=>n.trim()).slice(0,16)};while(state.tDraft.names.length<4)state.tDraft.names.push('');return state.tDraft;}
function createTournament(){
 const d=tDraft(),names=[...new Set(d.names.map(n=>n.trim()).filter(Boolean))];
 if(names.length<3){window.alert?.(state.language==='en'?'A tournament needs at least 3 players.':'Для турнира нужно минимум 3 игрока.');return;}
 if(d.shuffle)names.sort(()=>Math.random()-.5);
 const players=names.slice(0,16).map((name,i)=>({name,color:COLORS[i%COLORS.length]})),n=players.length,matches=[];
 if(d.format==='knockout'){
  const size=2**Math.ceil(Math.log2(n)),rounds=Math.log2(size);
  for(let i=0;i<size/2;i++){const b=size-1-i;matches.push({id:`1-${i}`,round:1,idx:i,a:i,b:b<n?b:BYE,winner:null,score:''});}
  for(let r=2;r<=rounds;r++)for(let i=0;i<size/2**r;i++)matches.push({id:`${r}-${i}`,round:r,idx:i,a:null,b:null,winner:null,score:''});
  for(const m of matches.filter(m=>m.b===BYE)){m.winner=m.a;m.score='bye';advance({matches},m);}
 }else{
  const ids=[...players.keys()];if(ids.length%2)ids.push(BYE);const half=ids.length/2;
  for(let r=0;r<ids.length-1;r++){for(let i=0;i<half;i++){const a=ids[i],b=ids[ids.length-1-i];if(a!==BYE&&b!==BYE)matches.push({id:`${r+1}-${i}`,round:r+1,idx:i,a:r%2?b:a,b:r%2?a:b,winner:null,score:''});}ids.splice(1,0,ids.pop());}
 }
 state.tournament={id:id(),format:d.format,mode:d.mode,legs:d.legs,players,matches,champion:null,createdAt:Date.now()};saveTournament();render();
}
function advance(t,m){const next=t.matches.find(x=>x.round===m.round+1&&x.idx===Math.floor(m.idx/2));if(next)next[m.idx%2?'b':'a']=m.winner;return next;}
function knockoutRounds(t){return Math.max(...t.matches.map(m=>m.round));}
function leagueTable(t){
 const rows=t.players.map((p,i)=>({i,name:p.name,color:p.color,played:0,won:0,lost:0,lf:0,la:0}));
 for(const m of t.matches){if(m.winner==null||!m.score)continue;const[la,lb]=m.score.split(':').map(Number),A=rows[m.a],B=rows[m.b];A.played++;B.played++;A.lf+=la;A.la+=lb;B.lf+=lb;B.la+=la;(m.winner===m.a?A:B).won++;(m.winner===m.a?B:A).lost++;}
 return rows.sort((x,y)=>y.won-x.won||(y.lf-y.la)-(x.lf-x.la)||y.lf-x.lf);
}
function updateChampion(t){
 if(t.format==='knockout'){const final=t.matches.find(m=>m.round===knockoutRounds(t));t.champion=final?.winner??null;}
 else t.champion=t.matches.every(m=>m.winner!=null)?leagueTable(t)[0].i:null;
}
function syncTournament(){
 const g=state.game,t=state.tournament;if(!g?.tm||!t||g.tm.tid!==t.id||!g.winner)return;
 const m=t.matches.find(x=>x.id===g.tm.mid);if(!m||m.winner!=null)return;
 const [pa,pb]=g.tm.ids.map(pid=>g.players.find(p=>p.id===pid));if(!pa||!pb)return;
 m.winner=g.winner===pa.id?m.a:m.b;m.score=`${pa.wins}:${pb.wins}`;
 if(t.format==='knockout')advance(t,m);updateChampion(t);saveTournament();
}
function playTournamentMatch(mid){
 const t=state.tournament,m=t?.matches.find(x=>x.id===mid);if(!m||m.a==null||m.b==null||m.a===BYE||m.b===BYE||m.winner!=null)return;
 if(state.game&&!state.game.winner&&state.game.tm?.mid!==mid&&state.game.history.length&&!window.confirm?.(state.language==='en'?'Replace the match in progress?':'Заменить текущий незавершённый матч?'))return;
 if(state.game?.tm?.mid===mid&&!state.game.winner){nav('game');return;}
 const keep={names:state.names,mode:state.mode,legs:state.legs,sets:state.sets,botLevel:state.botLevel,doubleIn:state.doubleIn};
 Object.assign(state,{names:[t.players[m.a].name,t.players[m.b].name],mode:t.mode,legs:t.legs,sets:0,botLevel:0,doubleIn:false});
 startGame();Object.assign(state,keep);
 if(state.game){state.game.tm={tid:t.id,mid,ids:state.game.players.map(p=>p.id)};state.game.players.forEach((p,i)=>{p.color=t.players[i?m.b:m.a].color;});save();render();}
}
function resetTournamentMatch(mid){
 const t=state.tournament,m=t?.matches.find(x=>x.id===mid);if(!m||m.winner==null||m.score==='bye')return;
 if(t.format==='knockout'){const next=t.matches.find(x=>x.round===m.round+1&&x.idx===Math.floor(m.idx/2));if(next?.winner!=null)return;if(next)next[m.idx%2?'b':'a']=null;}
 m.winner=null;m.score='';updateChampion(t);saveTournament();render();
}
function roundName(t,r){const left=knockoutRounds(t)-r;return left===0?'Финал':left===1?'Полуфинал':left===2?'1/4 финала':left===3?'1/8 финала':`Раунд ${r}`;}
function tMatchCard(t,m){
 const side=(i,s)=>{const p=i==null?null:i===BYE?null:t.players[i],won=m.winner!=null&&m.winner===i;return `<div class="tm-side ${won?'won':''} ${m.winner!=null&&!won?'lost':''}" style="--player:${p?.color||'var(--line)'}"><span>${i===BYE?'—':p?esc(p.name):'<em>ожидает</em>'}</span><b>${s??''}</b></div>`;};
 const [sa,sb]=m.score&&m.score!=='bye'?m.score.split(':'):[];
 const live=state.game?.tm?.mid===m.id&&!state.game.winner,ready=m.a!=null&&m.b!=null&&m.a!==BYE&&m.b!==BYE&&m.winner==null;
 return `<div class="t-match ${live?'live':''} ${m.winner!=null?'done':''}">${side(m.a,sa)}${side(m.b,sb)}${ready?`<button class="t-play" data-tplay="${m.id}">${icon('play')}<span>${live?'Продолжить':'Играть'}</span></button>`:m.winner!=null&&m.score!=='bye'?`<button class="t-reset" data-treset="${m.id}" title="Переиграть матч" aria-label="Переиграть матч">${icon('undo')}</button>`:''}</div>`;
}
function tournamentSetup(){
 const d=tDraft(),recent=recentNames().filter(n=>!d.names.some(x=>x.trim().toLowerCase()===n.toLowerCase()));
 return `<section class="tour-page"><div class="page-heading"><span class="kicker">ТУРНИР</span><h1>Турнир</h1><p>Сетка на 3–16 игроков: плей-офф или круговой турнир. Матчи запускаются прямо из сетки, победители проходят дальше сами.</p></div><div class="setup-card panel tour-setup"><div class="step"><span>01</span><div><h2>Формат</h2><p>${d.format==='knockout'?'Проигравший выбывает':'Каждый играет с каждым'}</p></div></div><div class="input-switch t-format"><button data-tformat="knockout" class="${d.format==='knockout'?'active':''}">Плей-офф</button><button data-tformat="league" class="${d.format==='league'?'active':''}">Круговой</button></div><div class="settings-row x01-options"><label>Игра<select id="t-mode">${T_MODES.map(([v,l])=>`<option value="${v}" ${d.mode===v?'selected':''}>${l}</option>`).join('')}</select></label><label>Легов для победы<select id="t-legs">${[1,2,3,4,5].map(n=>`<option ${d.legs===n?'selected':''}>${n}</option>`).join('')}</select></label><label class="t-check"><input type="checkbox" id="t-shuffle" ${d.shuffle?'checked':''}><span>Жеребьёвка</span></label></div><div class="step"><span>02</span><div><h2>Участники</h2><p>${d.names.filter(n=>n.trim()).length} из 16</p></div></div><div class="name-list">${d.names.map((n,i)=>`<div class="name-row"><span class="name-num" style="--player:${COLORS[i%COLORS.length]}">${i+1}</span><input class="t-name" data-index="${i}" value="${esc(n)}" placeholder="Игрок ${i+1}" aria-label="Имя игрока ${i+1}" maxlength="40">${d.names.length>3?`<button class="t-remove remove-player" data-index="${i}" aria-label="Удалить игрока ${i+1}">${icon('close')}</button>`:'<span></span>'}</div>`).join('')}</div>${d.names.length<16?`<button class="add-player t-add">${icon('plus')}<span>Добавить игрока</span></button>`:''}${recent.length?`<div class="recent-players"><span>Недавние:</span>${recent.map(n=>`<button data-trecent="${esc(n)}">${esc(n)}</button>`).join('')}</div>`:''}<button class="start-button t-create"><span>СОЗДАТЬ ТУРНИР</span>${icon('arrow')}</button></div></section>`;
}
function tournamentView(){
 const t=state.tournament;if(!t)return tournamentSetup();
 const mode=T_MODES.find(([v])=>v===t.mode)?.[1]||t.mode,champ=t.champion!=null?t.players[t.champion]:null;
 const head=`<div class="page-heading tour-head"><div><span class="kicker">${t.format==='knockout'?'ПЛЕЙ-ОФФ':'КРУГОВОЙ ТУРНИР'}</span><h1>Турнир</h1><p>${mode} · <span>${legsLabel(t.legs)}</span> · <span>${t.players.length} игроков</span></p></div><button class="ghost-button t-new">${icon('plus')}<span>Новый турнир</span></button></div>`;
 const banner=champ?`<div class="t-champion panel" style="--player:${champ.color}"><span class="winner-mark">${icon('trophy')}</span><div><span class="eyebrow">ПОБЕДИТЕЛЬ ТУРНИРА</span><strong>${esc(champ.name)}</strong></div></div>`:'';
 let body;
 if(t.format==='knockout'){const R=knockoutRounds(t);body=`<div class="bracket" style="--rounds:${R}">${Array.from({length:R},(_,k)=>k+1).map(r=>`<div class="br-round"><h3>${roundName(t,r)}</h3><div class="br-matches">${t.matches.filter(m=>m.round===r).sort((a,b)=>a.idx-b.idx).map(m=>tMatchCard(t,m)).join('')}</div></div>`).join('')}</div>`;}
 else{const rows=leagueTable(t),R=Math.max(...t.matches.map(m=>m.round));body=`<div class="league"><div class="league-table panel" role="table"><div class="lt-row lt-head" role="row"><span>#</span><span>Игрок</span><span>И</span><span>В</span><span>П</span><span>Леги</span></div>${rows.map((r,k)=>`<div class="lt-row ${t.champion===r.i?'champ':''}" role="row" style="--player:${r.color}"><span>${k+1}</span><span class="lt-name">${esc(r.name)}</span><span>${r.played}</span><span>${r.won}</span><span>${r.lost}</span><span>${r.lf}:${r.la}</span></div>`).join('')}</div><div class="league-rounds">${Array.from({length:R},(_,k)=>k+1).map(r=>`<div class="br-round"><h3><span>Тур</span> ${r}</h3><div class="br-matches">${t.matches.filter(m=>m.round===r).map(m=>tMatchCard(t,m)).join('')}</div></div>`).join('')}</div></div>`;}
 return `<section class="tour-page">${head}${banner}${body}</section>`;
}
// --- Training: Bob's 27 and 121 checkout -------------------------------------------
function bobsReset(t){t.bob={idx:0,score:27,log:[]};}
function bobsMark(hits){const t=ensureTraining();if(!t.bob)bobsReset(t);const b=t.bob;if(b.idx>=DOUBLE_TARGETS.length||b.score<=0)return;const v=byLabel[DOUBLE_TARGETS[b.idx]].value,delta=hits?hits*v:-v;b.score+=delta;b.log.push({target:DOUBLE_TARGETS[b.idx],hits,delta});b.idx++;
 const over=b.score<=0||b.idx>=DOUBLE_TARGETS.length;if(over&&b.score>state.bobBest){state.bobBest=b.score;save();}playSound(hits?'double':'bust');haptic(hits?'double':'tap');render();}
function bobsUndo(){const t=ensureTraining(),b=t.bob;if(!b?.log.length)return;const last=b.log.pop();b.score-=last.delta;b.idx--;render();}
function bobsView(t){if(!t.bob)bobsReset(t);const b=t.bob,over=b.score<=0,done=over||b.idx>=DOUBLE_TARGETS.length;
 const log=`<div class="bob-log">${b.log.map(x=>`<span class="${x.hits?'hit':'miss'}"><b>${x.target}</b>${x.delta>0?'+':''}${x.delta}</span>`).join('')}</div>`;
 if(done)return `<section class="panel train-stage train-summary"><small class="train-label">${over?'ИГРА ОКОНЧЕНА':'РЕЗУЛЬТАТ'}</small><strong class="train-target">${Math.max(0,b.score)}</strong><p><span>${over?`Счёт упал до нуля на ${b.log.at(-1)?.target}`:'Все удвоения пройдены'}</span> · <span>Рекорд</span> <b>${state.bobBest}</b></p>${log}<button class="primary bob-restart">${icon('undo')}<span>Ещё раз</span></button></section>`;
 return `<section class="panel train-stage"><div class="train-stats"><span>Счёт <b>${b.score}</b></span><span>Цель <b>${b.idx+1} / ${DOUBLE_TARGETS.length}</b></span><span>Рекорд <b>${state.bobBest}</b></span></div><small class="train-label">ТРИ ДРОТИКА В</small><strong class="train-target double">${DOUBLE_TARGETS[b.idx]}</strong><div class="bob-buttons">${[0,1,2,3].map(n=>`<button data-bob="${n}" class="${n?'hit':'miss'}"><b>${n}</b><small>${n?`+${n*byLabel[DOUBLE_TARGETS[b.idx]].value}`:`−${byLabel[DOUBLE_TARGETS[b.idx]].value}`}</small></button>`).join('')}</div><p class="train-hint">Сколько дротиков попало в удвоение? Каждое попадание прибавляет его стоимость, ни одного попадания — вычитает. Счёт 0 или меньше — игра окончена.</p><button class="ghost-button bob-undo" ${!b.log.length?'disabled':''}>${icon('undo')}<span>Отменить</span></button>${b.log.length?log:''}</section>`;}
function c121New(t,target){t.c121={target,left:target,visitStart:target,used:0,visit:[],result:null,streak:t.c121?.streak||0,tries:(t.c121?.tries||0),wins:(t.c121?.wins||0)};}
function c121Dart(h){const t=ensureTraining();if(!t.c121)c121New(t,121);const c=t.c121;if(c.result)return;c.used++;c.visit.push(h.label);let left=c.left-h.value;
 if(left===0&&h.isDouble){c.left=0;c.result={ok:true};c.tries++;c.wins++;state.best121=Math.max(state.best121,c.target);save();playSound('leg');haptic('leg');render();return;}
 if(left<0||left===1||left===0){left=c.visitStart;c.used=Math.ceil(c.used/3)*3;c.visit=[];playSound('bust');haptic('bust');}else{playSound('tap');haptic('tap');}
 c.left=left;if(c.used%3===0){c.visitStart=c.left;c.visit=[];}
 if(c.used>=9){c.result={ok:false};c.tries++;}render();}
function c121View(t){if(!t.c121)c121New(t,121);const c=t.c121,plan=c.result?null:stageRoute(c.left);
 return `<div class="train-grid"><section class="panel train-stage"><div class="train-stats"><span>Цель <b>${c.target}</b></span><span>Дротиков <b>${c.used} / 9</b></span><span>Рекорд <b>${state.best121||'—'}</b></span></div><small class="train-label">${c.result?(c.result.ok?'ЗАКРЫТО!':'НЕ ЗАКРЫЛИ'):'ОСТАЛОСЬ'}</small><strong class="train-target">${c.result?c.target:c.left}</strong>${c.result?`<p>${c.result.ok?`Следующая цель — ${c.target+1}`:`Следующая цель — ${Math.max(121,c.target-1)}`}</p><button class="primary c121-next">${icon('arrow')}<span>Дальше</span></button>`:`${plan?.checkout?`<div class="route-main">${routeHtml(plan.routes[0])}</div>`:''}<div class="thrown-slots">${[0,1,2].map(i=>c.visit[i]?`<span>${esc(c.visit[i])}</span>`:'<span class="empty">—</span>').join('')}</div><p class="train-hint">Закройте остаток за 9 дротиков (три подхода) с Double Out. Получилось — цель +1, нет — цель −1, но не ниже 121.</p>`}</section><section class="panel train-pad">${c.result?'':dartPad('c',false)}</section></div>`;}
function emptyState(title,text){return `<section class="empty-state"><div class="empty-mark">${icon('target')}</div><h1>${title}</h1><p>${text}</p><button class="primary" data-nav="setup">${icon('plus')}<span>Новая игра</span></button></section>`;}
function gameView(){if(!state.game)return emptyState('Матч ещё не начат','Добавь игроков и выбери 301, 501 или свой режим.');if(state.game.type)return state.game.winner?`<section class="game-layout alt-winner">${winnerCard(state.game,'winner panel')}</section>`:({cricket:cricketView,clock:clockView,shanghai:shanghaiView,killer:killerView})[state.game.type](state.game);return desktopGame()+mobileGame();}
function checkoutTable(){const q=Number(state.search),scores=Array.from({length:110},(_,i)=>170-i).filter(s=>!state.search||s===q);return `<section class="table-page"><div class="page-heading"><span class="kicker">61—170</span><h1>Таблица закрытий</h1><p>Основной маршрут и запасные варианты. Утроения готовят, удвоения закрывают.</p><div class="table-tools"><input id="checkout-search" type="search" inputmode="numeric" placeholder="Найти остаток" aria-label="Найти остаток" value="${esc(state.search)}"><button class="ghost-button" data-table-link>${icon('table')}<span>Таблица 2–170</span></button></div></div><div class="legend"><span><i class="t"></i> утроение</span><span><i class="d"></i> удвоение</span><span><i class="b"></i> Bull</span></div><div class="checkout-grid">${scores.map(score=>{const rs=checkoutRoutes(score,3,3),bad=BOGEY.has(score)||!rs.length;return `<article class="checkout-card ${bad?'impossible':''}"><div class="checkout-number">${score}</div>${bad?'<div class="no-route"><strong>Нет закрытия</strong><small>Подготовь следующий подход</small></div>':`<div class="routes">${rs.map((r,i)=>`<div class="${i?'alt-route':'main-route'}"><small>${i?'ВАРИАНТ':'ОСНОВНОЙ'}</small><span class="route-pills">${routeHtml(r)}</span></div>`).join('')}</div>`}</article>`;}).join('')||'<div class="empty-search">Введите число от 61 до 170.</div>'}</div></section>`;}
function confirmModal(){if(!state.checkoutConfirm)return'';const d=state.checkoutConfirm;return `<div class="modal-backdrop"><div class="checkout-modal panel checkout-double-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-dialog-title"><span class="kicker">DOUBLE OUT</span><h2 id="checkout-dialog-title">Чем закрыли ${d.value}?</h2><p>Выберите последнее удвоение. Оно сохранится в истории и статистике матча.</p><div class="double-grid">${d.doubles.map((label,i)=>`<button class="double-choice ${label===d.selected?'recommended':''}" data-select-double="${label}"><b>${label}</b>${i===0?'<small>РЕКОМЕНДУЕТСЯ</small>':''}</button>`).join('')}</div><div class="checkout-darts-label">ДРОТИКОВ В ЗАКРЫТИИ</div><div class="checkout-darts">${validCheckoutDartCounts(d.value,d.selected).map(n=>`<button class="${Number(d.darts)===n?'active':''}" data-checkout-darts="${n}">${n}</button>`).join('')}</div><div class="modal-actions"><button class="confirm-selected-double">${icon('check')}<span>ЗАКРЫТО · ${d.selected}</span></button><button class="confirm-bust">Не закрыли — BUST</button><button class="cancel-confirm">Отмена</button></div></div></div>`;}
function settingsPanel(){if(!state.settingsOpen)return'';const wakeSupported='wakeLock' in navigator;const row=(cls,ic,title,sub,on)=>`<button class="setting-row ${cls}" aria-pressed="${on}"><span class="setting-icon">${icon(ic)}</span><span><b>${title}</b><small>${sub}</small></span>${switchMark(on)}</button>`;return `<div class="modal-backdrop settings-backdrop"><section class="settings-panel panel" role="dialog" aria-modal="true" aria-labelledby="settings-dialog-title"><div class="settings-head"><div><span class="kicker">CHECKOUT LAB</span><h2 id="settings-dialog-title">Настройки матча</h2></div><button class="close-settings icon-button" aria-label="Закрыть настройки">${icon('close')}</button></div><button class="setting-row lang-toggle"><span class="setting-icon">${icon('globe')}</span><span><b>Язык</b><small>${state.language==='ru'?'Русский':'English'}</small></span><em>${state.language==='ru'?'EN':'RU'}</em></button>${row('sound-toggle','sound','Звук интерфейса','Нажатия, броски, 180, BUST, LEG',state.sound)}${row('voice-toggle','sound','Голос диктора','Объявляет очки и остаток для закрытия',state.voice)}${state.voice?`<button class="setting-row caller-next"><span class="setting-icon">${icon('users')}</span><span><b>Диктор</b><small>${hasLanguageVoice()||!voiceList.length?'Нажмите, чтобы сменить и послушать':(state.language==='en'?'No English voice on this device — the caller stays silent. Add one in the system speech settings.':'На устройстве нет русского голоса — диктор молчит. Добавьте голос в настройках речи системы.')}</small><small class="voice-summary">${voiceSummary()}</small></span><em>${esc(currentCaller()?.label||'—')}</em></button>`:''}<button class="setting-row input-toggle"><span class="setting-icon">${icon('table')}</span><span><b>Ввод очков</b><small>Сумма подхода или каждый дротик</small></span><em>${state.inputMode==='darts'?'По дротикам':'Сумма'}</em></button>${row('vibration-toggle','vibrate','Вибрация','Короткий отклик на телефоне',state.vibration)}${row('wake-toggle','screen','Экран не гаснет',wakeSupported?'Активно во время матча':'Не поддерживается браузером',state.wakeLock)}${state.game?`<button class="setting-row focus-toggle"><span class="setting-icon">${icon('expand')}</span><span><b>Режим у мишени</b><small>Полный экран, минимум браузерных элементов</small></span><em>⛶</em></button>`:''}</section></div>`;}
function dartPad(ns='',canClear=false,nums=null){const m=ns?(state.training?.mult||1):state.multiplier;return `<div class="dart-pad"><div class="multipliers">${[[1,'S','ОДИНОЧНЫЙ'],[2,'D','УДВОЕНИЕ'],[3,'T','УТРОЕНИЕ']].map(([v,l,t])=>`<button data-${ns}mult="${v}" class="${m===v?'active ':''}${v===1?'single':v===2?'double':'treble'}">${l}<small>${t}</small></button>`).join('')}</div><div class="number-grid ${nums?'few':''}">${(nums||Array.from({length:20},(_,i)=>i+1)).map(n=>`<button data-${ns}dart="${n}">${n}</button>`).join('')}</div><div class="specials"><button data-${ns}special="MISS">MISS</button><button data-${ns}special="25">25</button><button class="bull" data-${ns}special="BULL">BULL</button><button class="${ns}clear-current" aria-label="Убрать последний дротик" ${canClear?'':'disabled'}>${icon('back')}</button></div></div>`;}
function inputSwitch(){return `<div class="input-switch" role="group" aria-label="Способ ввода"><button data-input="visit" class="${state.inputMode!=='darts'?'active':''}" aria-pressed="${state.inputMode!=='darts'}">Сумма</button><button data-input="darts" class="${state.inputMode==='darts'?'active':''}" aria-pressed="${state.inputMode==='darts'}">По дротикам</button></div>`;}
function thrownSlots(){const g=state.game,cur=g?.current||[],sum=cur.reduce((x,h)=>x+h.value,0);return `<div class="thrown-slots">${[0,1,2].map(i=>cur[i]?`<span class="${hitClass(cur[i])}">${cur[i].label}</span>`:'<span class="empty">—</span>').join('')}<b>${sum}</b></div>`;}
function dartsInput(){const g=state.game;return `<div class="darts-entry">${thrownSlots()}${dartPad('',!!g?.current.length)}</div>`;}
function mobileDartsInput(){const g=state.game;return `<div class="m-entry-v3 m-darts-entry"><button class="undo-mobile icon-only" aria-label="Отменить последний подход" ${!state.undo.length?'disabled':''}>${icon('undo')}</button>${thrownSlots()}<button class="redo-mobile icon-only" aria-label="Вернуть отменённый подход" ${!state.redo.length?'disabled':''}>${icon('redo')}</button></div>${dartPad('',!!g?.current.length)}`;}

function editLastModal(){if(!state.editLastOpen||!state.game?.history.length)return'';const base=rebuildGame(state.game.history.slice(0,-1)),p=base?.players[base.active],v=Number(state.editLastValue||0),left=p?p.score-v:null,valid=left===0?validFinishDoubles(v):[];if(left===0&&valid.length&&!valid.some(d=>d.label===state.editLastDouble))state.editLastDouble=valid[0].label;const editCounts=left===0&&state.editLastDouble?validCheckoutDartCounts(v,state.editLastDouble):[];if(editCounts.length&&!editCounts.includes(Number(state.editLastDarts)))state.editLastDarts=editCounts[0];return `<div class="modal-backdrop"><div class="checkout-modal panel edit-visit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-dialog-title"><span class="kicker">ПОСЛЕДНИЙ ПОДХОД</span><h2 id="edit-dialog-title">Исправить результат</h2><p>${p?`${esc(p.name)} · было ${state.game.history.at(-1).total}`:''}</p><input id="edit-last-value" inputmode="numeric" maxlength="3" value="${esc(state.editLastValue)}" aria-label="Новая сумма">${!isPossibleVisitTotal(v)?`<div class="edit-error">${v} нельзя набрать за 3 дротика</div>`:''}${left===0&&valid.length?`<div class="edit-double-label">Последнее удвоение</div><div class="double-grid compact">${valid.map((d,i)=>`<button class="edit-double-choice ${d.label===state.editLastDouble?'recommended':''}" data-edit-double="${d.label}">${d.label}${i===0?'<small>РЕК.</small>':''}</button>`).join('')}</div><div class="checkout-darts-label">ДРОТИКОВ В ЗАКРЫТИИ</div><div class="checkout-darts">${editCounts.map(n=>`<button class="${Number(state.editLastDarts)===n?'active':''}" data-edit-darts="${n}">${n}</button>`).join('')}</div>`:''}<button class="save-edit" ${!isPossibleVisitTotal(v)?'disabled':''}>Сохранить</button><button class="delete-last">Удалить подход</button><button class="cancel-edit">Отмена</button></div></div>`;}


function render(){
 document.documentElement.dataset.theme=state.theme;document.body.className=`${state.screen==='game'&&!state.game?.type?'game-screen ':''}${state.screen==='game'&&state.game?.type?'alt-screen ':''}${state.focusMode?'focus-mode':''}`.trim();
 const content=state.screen==='setup'?setupView():state.screen==='game'?gameView():state.screen==='checkouts'?checkoutTable():state.screen==='training'?trainingView():state.screen==='tournament'?tournamentView():statsView();
 const app=document.getElementById('app');app.innerHTML=`<main class="app ${state.theme==='light'?'light':''}">${header()}${mobileMenu()}${content}${historyDrawer()}${momentOverlay()}${confirmModal()}${settingsPanel()}${editLastModal()}</main>`;window.CheckoutI18n?.apply?.(app,state.language);window.CheckoutI18n?.applyMeta?.(state.language,'app');bind();syncWakeLock();scheduleBot();
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
 document.querySelectorAll('[data-mode]').forEach(el=>el.onclick=()=>{const v=el.dataset.mode;state.mode=/^\d+$/.test(v)?Number(v):v;save();render();});
 document.getElementById('bot-select')?.addEventListener('change',e=>{const was=state.botLevel;state.botLevel=Number(e.target.value)||0;if(!was&&state.botLevel&&state.names.length>1){const i=state.names.findIndex((n,j)=>j>0&&['Соперник','Opponent','Player 2','Игрок 2'].includes(n.trim()));if(i>0)state.names.splice(i,1);}save();render();});
 document.getElementById('in-select')?.addEventListener('change',e=>{state.doubleIn=e.target.value==='1';save();render();});
 document.getElementById('sets-select')?.addEventListener('change',e=>{state.sets=Number(e.target.value)||0;save();render();});
 document.querySelectorAll('[data-recent]').forEach(el=>el.onclick=()=>{const name=el.dataset.recent;if(state.names.some(n=>n.trim().toLowerCase()===name.toLowerCase()))return;const empty=state.names.findIndex(n=>!n.trim());if(empty>=0)state.names[empty]=name;else if(state.names.length<8)state.names.push(name);save();render();});
 document.querySelectorAll('.clock-hit,.clock-miss').forEach(el=>el.onclick=()=>{animatePress(el,true);altDart(el.classList.contains('clock-hit'));});
 document.querySelector('.alt-end-turn')?.addEventListener('click',altFinishTurn);
 document.querySelectorAll('[data-sh]').forEach(el=>el.onclick=()=>{animatePress(el,true);altDart(Number(el.dataset.sh));});
 document.querySelectorAll('[data-kill]').forEach(el=>el.onclick=()=>{animatePress(el,true);altDart(el.dataset.kill==='miss'?null:Number(el.dataset.kill));});
 document.querySelectorAll('[data-bob]').forEach(el=>el.onclick=()=>bobsMark(Number(el.dataset.bob)));
 document.querySelector('.bob-undo')?.addEventListener('click',bobsUndo);
 document.querySelector('.bob-restart')?.addEventListener('click',()=>{bobsReset(ensureTraining());render();});
 document.querySelectorAll('[data-cmult]').forEach(el=>el.onclick=()=>{ensureTraining().mult=Number(el.dataset.cmult);render();});
 document.querySelectorAll('[data-cdart]').forEach(el=>el.onclick=()=>{const t=ensureTraining(),m=t.mult||1;t.mult=1;c121Dart(byLabel[`${m===1?'S':m===2?'D':'T'}${el.dataset.cdart}`]);});
 document.querySelectorAll('[data-cspecial]').forEach(el=>el.onclick=()=>c121Dart(byLabel[el.dataset.cspecial]||MISS));
 document.querySelector('.c121-next')?.addEventListener('click',()=>{const t=ensureTraining(),c=t.c121;c121New(t,c.result?.ok?Math.min(170,c.target+1):Math.max(121,c.target-1));render();});
 document.querySelectorAll('[data-tformat]').forEach(el=>el.onclick=()=>{tDraft().format=el.dataset.tformat;render();});
 document.getElementById('t-mode')?.addEventListener('change',e=>{const v=e.target.value;tDraft().mode=/^\d+$/.test(v)?Number(v):v;});
 document.getElementById('t-legs')?.addEventListener('change',e=>{tDraft().legs=Number(e.target.value)||1;});
 document.getElementById('t-shuffle')?.addEventListener('change',e=>{tDraft().shuffle=e.target.checked;});
 document.querySelectorAll('.t-name').forEach(el=>el.oninput=e=>{tDraft().names[Number(el.dataset.index)]=e.target.value;});
 document.querySelectorAll('.t-remove').forEach(el=>el.onclick=()=>{tDraft().names.splice(Number(el.dataset.index),1);render();});
 document.querySelector('.t-add')?.addEventListener('click',()=>{tDraft().names.push('');render();setTimeout(()=>[...document.querySelectorAll('.t-name')].at(-1)?.focus(),0);});
 document.querySelectorAll('[data-trecent]').forEach(el=>el.onclick=()=>{const d=tDraft(),i=d.names.findIndex(n=>!n.trim());if(i>=0)d.names[i]=el.dataset.trecent;else if(d.names.length<16)d.names.push(el.dataset.trecent);render();});
 document.querySelector('.t-create')?.addEventListener('click',createTournament);
 document.querySelector('.t-new')?.addEventListener('click',()=>{if(window.confirm?.(state.language==='en'?'Start a new tournament? The current bracket will be deleted.':'Начать новый турнир? Текущая сетка будет удалена.')){state.tournament=null;saveTournament();render();}});
 document.querySelectorAll('[data-tplay]').forEach(el=>el.onclick=()=>playTournamentMatch(el.dataset.tplay));
 document.querySelectorAll('[data-treset]').forEach(el=>el.onclick=()=>{if(window.confirm?.(state.language==='en'?'Clear this result and replay the match?':'Сбросить результат и переиграть матч?'))resetTournamentMatch(el.dataset.treset);});
 document.querySelector('.export-history')?.addEventListener('click',exportHistory);
 document.querySelector('.import-history')?.addEventListener('click',()=>document.getElementById('import-file')?.click());
 document.getElementById('import-file')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(f)importHistory(f);});
 document.querySelectorAll('.player-name').forEach(el=>el.oninput=e=>{state.names[Number(el.dataset.index)]=e.target.value;save();});
 document.querySelectorAll('.remove-player').forEach(el=>el.onclick=()=>{state.names.splice(Number(el.dataset.index),1);render();});
 document.querySelector('.add-player')?.addEventListener('click',()=>{state.names.push(state.language==='en'?`Player ${state.names.length+1}`:`Игрок ${state.names.length+1}`);render();});
 document.querySelector('.start-button:not(.t-create)')?.addEventListener('click',()=>{const cs=document.getElementById('custom-score');if(cs)state.customScore=Number(cs.value);const ls=document.getElementById('legs-select');if(ls)state.legs=Number(ls.value);document.querySelectorAll('.player-name').forEach(el=>state.names[Number(el.dataset.index)]=el.value);startGame();});
 document.getElementById('custom-score')?.addEventListener('change',e=>{state.customScore=Number(e.target.value);save();});
 document.getElementById('legs-select')?.addEventListener('change',e=>{state.legs=Number(e.target.value);save();});
 document.querySelectorAll('[data-input]').forEach(el=>el.onclick=()=>{state.inputMode=el.dataset.input;state.multiplier=1;save();render();});
 document.querySelectorAll('.input-toggle').forEach(el=>el.onclick=()=>{state.inputMode=state.inputMode==='darts'?'visit':'darts';state.multiplier=1;save();render();});
 document.querySelectorAll('.voice-toggle').forEach(el=>el.onclick=()=>{state.voice=!state.voice;save();render();speak(state.language==='en'?'Caller on':'Голос включён');});
 document.querySelectorAll('.caller-next').forEach(el=>el.onclick=nextCaller);
 document.querySelectorAll('[data-ttab]').forEach(el=>el.onclick=()=>{ensureTraining().tab=el.dataset.ttab;render();});
 document.querySelectorAll('[data-tmult]').forEach(el=>el.onclick=()=>{ensureTraining().mult=Number(el.dataset.tmult);render();});
 document.querySelectorAll('[data-tdart]').forEach(el=>el.onclick=()=>{const t=ensureTraining(),m=t.mult||1;quizPick(byLabel[`${m===1?'S':m===2?'D':'T'}${el.dataset.tdart}`]);});
 document.querySelectorAll('[data-tspecial]').forEach(el=>el.onclick=()=>quizPick(byLabel[el.dataset.tspecial]||MISS));
 document.querySelector('.tclear-current')?.addEventListener('click',()=>{const t=ensureTraining();if(!t.result&&t.picks.length){t.picks.pop();render();}});
 document.querySelector('.quiz-next')?.addEventListener('click',quizNext);
 document.querySelector('.quiz-reveal')?.addEventListener('click',()=>{quizCheck(true);render();});
 document.querySelector('.dbl-hit')?.addEventListener('click',()=>doublesMark(true));
 document.querySelector('.dbl-miss')?.addEventListener('click',()=>doublesMark(false));
 document.querySelector('.dbl-undo')?.addEventListener('click',doublesUndo);
 document.querySelector('.dbl-restart')?.addEventListener('click',()=>{const t=ensureTraining();t.dIdx=0;t.dDarts=[];t.dHits={};render();});
 document.querySelector('.clear-history')?.addEventListener('click',()=>{if(window.confirm?.(state.language==='en'?'Delete the saved match history?':'Удалить сохранённую историю матчей?')){try{localStorage.removeItem(HISTORY);}catch{}render();}});
 document.querySelectorAll('[data-mult]').forEach(el=>el.onclick=()=>{state.multiplier=Number(el.dataset.mult);render();});
 document.querySelectorAll('[data-dart]').forEach(el=>el.onclick=()=>{const n=Number(el.dataset.dart),prefix=state.multiplier===1?'S':state.multiplier===2?'D':'T';state.multiplier=1;addDart(byLabel[`${prefix}${n}`]);});
 document.querySelectorAll('[data-special]').forEach(el=>el.onclick=()=>addDart(byLabel[el.dataset.special]||MISS));
document.querySelectorAll('.clear-current').forEach(el=>el.addEventListener('click',()=>{if(state.game?.type)return undo();if(!state.game?.current.length)return;snapshot();state.game.current.pop();save();render();}));
 document.querySelectorAll('.undo,.undo-mobile').forEach(el=>el.onclick=undo);document.querySelectorAll('.redo,.redo-mobile').forEach(el=>el.onclick=redo);
 document.querySelectorAll('[data-preview-player]').forEach(el=>{const select=()=>{const id=el.dataset.previewPlayer;const active=activePlayer();state.previewPlayerId=active?.id===id?null:(state.previewPlayerId===id?null:id);render();};el.onclick=select;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}};});document.querySelectorAll('.clear-preview').forEach(el=>el.onclick=()=>{state.previewPlayerId=null;render();});
 const vi=document.getElementById('visit-desktop');if(vi){vi.oninput=e=>{let v=e.target.value.replace(/\D/g,'').slice(0,3);if(Number(v)>180)v='180';state.visitValue=v;state.inputError='';e.target.value=v;const preview=document.querySelector('.desktop-preview');if(preview){preview.innerHTML=visitPreview();window.CheckoutI18n?.apply?.(preview,state.language);}const submit=document.querySelector('.desktop-submit');if(submit)submit.disabled=v==='';playSound('tap');animatePress(document.querySelector('.desktop-score-box'));};vi.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();playSound('confirm');haptic('confirm');requestVisitSubmit();}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}};setTimeout(()=>vi.focus({preventScroll:true}),0);}
 document.querySelector('.submit-visit')?.addEventListener('click',requestVisitSubmit);
 document.querySelectorAll('[data-key]').forEach(el=>el.onclick=()=>{animatePress(el,el.dataset.key==='ok');keypad(el.dataset.key);});document.querySelectorAll('[data-quick]').forEach(el=>el.onclick=()=>{animatePress(el);quick(el.dataset.quick);});
 document.querySelectorAll('.open-history').forEach(el=>el.addEventListener('click',()=>{state.historyOpen=true;render();}));document.querySelector('.mobile-menu-backdrop')?.addEventListener('click',()=>{state.mobileMenu=false;render();});document.querySelectorAll('.close-history').forEach(el=>el.addEventListener('click',()=>{state.historyOpen=false;render();}));
 document.querySelectorAll('.play-again').forEach(el=>el.onclick=()=>{const g=state.game;if(g?.type)state.mode=g.type;else if(g){if(g.startScore===301||g.startScore===501)state.mode=g.startScore;else{state.mode=0;state.customScore=g.startScore;}}startGame();});
 document.querySelectorAll('.share-result').forEach(el=>el.onclick=()=>shareResult());
 document.querySelectorAll('[data-select-double]').forEach(el=>el.onclick=()=>{state.checkoutConfirm.selected=el.dataset.selectDouble;const counts=validCheckoutDartCounts(state.checkoutConfirm.value,state.checkoutConfirm.selected);state.checkoutConfirm.darts=counts[0]||3;render();});document.querySelectorAll('[data-checkout-darts]').forEach(el=>el.onclick=()=>{state.checkoutConfirm.darts=Number(el.dataset.checkoutDarts);render();});document.querySelector('.confirm-selected-double')?.addEventListener('click',()=>confirmCheckout(state.checkoutConfirm.selected));document.querySelector('.confirm-bust')?.addEventListener('click',()=>{const value=state.checkoutConfirm?.value;if(value==null)return;state.checkoutConfirm=null;finishVisit([{label:`Σ${value}`,value,multiplier:1,number:value,isDouble:false,isTreble:false}],true,3);});document.querySelector('.cancel-confirm')?.addEventListener('click',cancelCheckout);document.querySelectorAll('[data-edit-last]').forEach(el=>{el.onclick=openEditLast;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openEditLast();}};});document.querySelector('.cancel-edit')?.addEventListener('click',()=>{state.editLastOpen=false;state.inputError='';render();});document.querySelector('.delete-last')?.addEventListener('click',deleteLastVisit);document.querySelector('.save-edit')?.addEventListener('click',applyEditedLastVisit);document.querySelectorAll('[data-edit-double]').forEach(el=>el.onclick=()=>{state.editLastDouble=el.dataset.editDouble;const counts=validCheckoutDartCounts(Number(state.editLastValue),state.editLastDouble);state.editLastDarts=counts[0]||3;render();});document.querySelectorAll('[data-edit-darts]').forEach(el=>el.onclick=()=>{state.editLastDarts=Number(el.dataset.editDarts);render();});const editInput=document.getElementById('edit-last-value');if(editInput){editInput.oninput=e=>{let v=e.target.value.replace(/\D/g,'').slice(0,3);if(Number(v)>180)v='180';state.editLastValue=v;render();};setTimeout(()=>document.getElementById('edit-last-value')?.focus(),0);}
 document.onkeydown=e=>{const dialog=document.querySelector('[role="dialog"]');if(dialog){if(e.key==='Escape'){e.preventDefault();if(state.checkoutConfirm)cancelCheckout();else if(state.editLastOpen){state.editLastOpen=false;state.inputError='';render();}else if(state.settingsOpen){state.settingsOpen=false;render();}else if(state.historyOpen){state.historyOpen=false;render();}return;}if(e.key==='Tab'){const focusable=[...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex="0"]')];if(!focusable.length)return;const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}return;}if(state.screen!=='game'||window.matchMedia?.('(max-width:768px)').matches||state.checkoutConfirm!==null)return;const input=document.getElementById('visit-desktop');if(!input)return;if(document.activeElement!==input){if(/^\d$/.test(e.key)){e.preventDefault();input.focus();const next=(state.visitValue+e.key).replace(/^0+(?=\d)/,'').slice(0,3);if(Number(next)<=180){state.visitValue=next;input.value=next;input.dispatchEvent(new Event('input',{bubbles:true}));}}else if(e.key==='Enter'&&state.visitValue!==''){e.preventDefault();playSound('confirm');haptic('confirm');requestVisitSubmit();}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}else if(e.key==='Escape'&&state.focusMode){e.preventDefault();toggleFocusMode();}}};
 const search=document.getElementById('checkout-search');if(search)search.oninput=e=>{state.search=e.target.value.replace(/\D/g,'').slice(0,3);render();setTimeout(()=>document.getElementById('checkout-search')?.focus(),0);};
}

if(globalThis.__CHECKOUT_LAB_TEST__)globalThis.__CL_TEST__={state,save,createTournament,playTournamentMatch,leagueTable,tDraft,resetTournamentMatch,needsDoubleIn,cricketBotAim,altDart,altFinishTurn,bobsMark,c121Dart,cleanSummary,isBotTurn,render,botVisit,botThrow,botAim,boardHitAt,BOT_LEVELS,checkoutRoutes,preparation,BOGEY,loadHistory,ensureTraining,quizPick,addDart,byLabel,isPossibleVisitTotal,validFinishDoubles,validCheckoutDartCounts,normalizeGame,rebuildGame,applyRecordedVisit,startGame,requestVisitSubmit,confirmCheckout,undo,redo,openEditLast,applyEditedLastVisit,deleteLastVisit,visitPreview};
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
