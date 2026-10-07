import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');

function createApp(saved={}){
 const storage=new Map(Object.entries(saved));
 const app={innerHTML:''};
 const noop=()=>{};
 const document={
  documentElement:{dataset:{lang:'ru'},requestFullscreen:()=>Promise.resolve()},
  body:{className:'',classList:{toggle:noop}},visibilityState:'visible',fullscreenElement:null,
  getElementById:id=>id==='app'?app:null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener:noop
 };
 const context={
  __CHECKOUT_LAB_TEST__:true,console,crypto:globalThis.crypto,setTimeout:noop,clearTimeout:noop,requestAnimationFrame:noop,
  document,navigator:{language:'ru'},location:{pathname:'/',href:'/'},
  localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},
  window:null,globalThis:null
 };
 context.window=context;context.globalThis=context;context.matchMedia=()=>({matches:false});context.addEventListener=noop;
 vm.runInNewContext(source,vm.createContext(context),{filename:'app.js'});
 return {api:context.__CL_TEST__,storage};
}

function checkout(api,playerIndex){
 const game=api.state.game;
 const player=game.players[playerIndex];
 player.score=2;
 game.active=playerIndex;
 api.applyRecordedVisit(game,{playerId:player.id,hits:[{label:'D1',value:2,isDouble:true}],total:2,bust:false,checkout:true,dartCount:1});
}

test('next leg starter rotates independently of previous winner',()=>{
 const {api}=createApp();
 api.state.names=['A','B'];api.state.mode=301;api.state.legs=3;api.startGame();
 checkout(api,1);
 assert.equal(api.state.game.active,1,'B starts leg 2 even though B won leg 1');
 assert.equal(api.state.game.legStarter,1);
 assert.equal(api.state.game.legNumber,2);
 checkout(api,0);
 assert.equal(api.state.game.active,0,'A starts leg 3 even though A won leg 2');
 assert.equal(api.state.game.legStarter,0);
 assert.equal(api.state.game.legNumber,3);
});

test('starter rotation supports three or more players',()=>{
 const {api}=createApp();
 api.state.names=['A','B','C'];api.state.mode=301;api.state.legs=4;api.startGame();
 checkout(api,2);assert.equal(api.state.game.active,1);
 checkout(api,0);assert.equal(api.state.game.active,2);
 checkout(api,1);assert.equal(api.state.game.active,0);
});

test('match winner remains active when the match ends',()=>{
 const {api}=createApp();
 api.state.names=['A','B'];api.state.mode=301;api.state.legs=1;api.startGame();
 checkout(api,1);
 assert.equal(api.state.game.winner,api.state.game.players[1].id);
 assert.equal(api.state.game.active,1);
});

test('legacy saved games receive deterministic leg metadata',()=>{
 const legacy={startScore:301,active:1,current:[],history:[],legsToWin:3,winner:null,players:[
  {id:'a',name:'A',score:301,color:'#a',darts:0,total:0,visits:0,high:0,wins:1},
  {id:'b',name:'B',score:201,color:'#b',darts:3,total:100,visits:1,high:100,wins:0}
 ]};
 const {api}=createApp({'checkout-lab-session-v1':JSON.stringify({game:legacy,undo:[],redo:[]})});
 assert.equal(api.state.game.legStarter,1);
 assert.equal(api.state.game.legNumber,2);
 assert.equal(api.state.game.active,1,'migration does not change the current turn');
});

test('legacy undo snapshots are migrated too',()=>{
 const legacy={startScore:301,active:0,current:[],history:[],legsToWin:3,winner:null,players:[
  {id:'a',name:'A',score:301,color:'#a',darts:0,total:0,visits:0,high:0,wins:0},
  {id:'b',name:'B',score:301,color:'#b',darts:0,total:0,visits:0,high:0,wins:1}
 ]};
 const current=structuredClone(legacy);current.players[0].score=241;current.active=1;
 const {api}=createApp({'checkout-lab-session-v1':JSON.stringify({game:current,undo:[legacy],redo:[]})});
 api.undo();
 assert.equal(api.state.game.legStarter,1);
 assert.equal(api.state.game.legNumber,2);
});

test('malformed saved game is ignored without breaking startup',()=>{
 const broken={startScore:501,active:9,current:[],history:[],legsToWin:3,winner:null,players:[{id:'a'}]};
 const {api}=createApp({'checkout-lab-session-v1':JSON.stringify({game:broken,undo:[],redo:[]})});
 assert.equal(api.state.game,null);
 assert.equal(api.state.screen,'setup');
});

test('stored settings use an explicit allowlist and safe ranges',()=>{
 const settings={theme:'broken',names:'not-an-array',legs:999,mode:777,customScore:999999,language:'xx',sound:'yes',focusMode:true,screen:'game'};
 const {api}=createApp({'checkout-lab-settings-v3':JSON.stringify(settings)});
 assert.equal(api.state.theme,'dark');
 assert.deepEqual(Array.from(api.state.names),['Даня','Соперник']);
 assert.equal(api.state.legs,3);
 assert.equal(api.state.mode,501);
 assert.equal(api.state.customScore,701);
 assert.equal(api.state.focusMode,true);
 assert.equal(api.state.screen,'setup');
});

test('custom start score is clamped to the supported range',()=>{
 const {api}=createApp();
 api.state.names=['A'];api.state.mode=0;api.state.customScore=999999;api.startGame();
 assert.equal(api.state.game.startScore,5001);
});

test('dynamic visit preview is generated directly in English',()=>{
 const {api}=createApp();
 api.state.language='en';api.state.names=['Player 1'];api.state.mode=0;api.state.customScore=121;api.startGame();
 api.state.visitValue='121';
 assert.match(api.visitPreview(),/CHECKOUT · choose the finishing double/);
 assert.doesNotMatch(api.visitPreview(),/[А-Яа-яЁё]/);
});

test('checkout routes remain valid for every score from 2 to 170',()=>{
 const {api}=createApp();
 const bogeys=new Set([159,162,163,165,166,168,169]);
 for(let score=2;score<=170;score++){
  const routes=api.checkoutRoutes(score,3,4);
  assert.equal(routes.length===0,bogeys.has(score),`checkout availability for ${score}`);
  for(const route of routes){
   assert.equal(route.reduce((sum,hit)=>sum+hit.value,0),score,`route sum for ${score}`);
   assert.equal(route.at(-1).isDouble,true,`double finish for ${score}`);
  }
 }
});

test('finished matches are saved to history and removed again on undo',()=>{
 const {api,storage}=createApp();
 api.state.names=['A','B'];api.state.mode=301;api.state.legs=1;api.startGame();
 const game=api.state.game;game.players[0].score=40;
 api.addDart(api.byLabel.D20);
 assert.ok(api.state.game.winner,'match finished');
 const history=JSON.parse(storage.get('checkout-lab-history-v1'));
 assert.equal(history.length,1);
 assert.equal(history[0].winner,'A');
 api.undo();
 assert.equal(JSON.parse(storage.get('checkout-lab-history-v1')).length,0);
});

test('dart-by-dart input finishes on a double and busts on a single',()=>{
 const {api}=createApp();
 api.state.names=['A','B'];api.state.mode=301;api.startGame();
 api.state.game.players[0].score=40;
 api.addDart(api.byLabel.S20);api.addDart(api.byLabel.S20);
 assert.equal(api.state.game.history.at(-1).bust,true,'zero without a double is a bust');
 assert.equal(api.state.game.players[0].score,40);
});

test('checkout quiz scores optimal and valid routes',()=>{
 const {api}=createApp();
 const t=api.ensureTraining();t.target=100;t.picks=[];t.result=null;
 api.quizPick(api.byLabel.T20);api.quizPick(api.byLabel.D20);
 assert.equal(t.result.valid,true);assert.equal(t.result.optimal,true);assert.equal(t.score,2);
 t.target=100;t.picks=[];t.result=null;
 api.quizPick(api.byLabel.S20);api.quizPick(api.byLabel.D20);api.quizPick(api.byLabel.D20);
 assert.equal(t.result.valid,true);assert.equal(t.result.optimal,false);assert.equal(t.score,3);
 t.target=100;t.picks=[];t.result=null;
 api.quizPick(api.byLabel.T20);api.quizPick(api.byLabel.S20);api.quizPick(api.byLabel.S20);
 assert.equal(t.result.valid,false);assert.equal(t.streak,0);
});

test('computer levels land near their target three-dart averages',()=>{
 const {api}=createApp();
 let seed=7;const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 for(const level of api.BOT_LEVELS){
  let points=0,darts=0;
  for(let leg=0;leg<400;leg++){let left=501;for(let guard=0;left>0&&guard<120;guard++){const hits=api.botVisit(left,level.sigma,rand),total=hits.reduce((s,h)=>s+h.value,0),after=left-total,last=hits.at(-1);darts+=hits.length;if(!(after<0||after===1||(after===0&&!last.isDouble))){points+=total;left=after;}}}
  const average=points/darts*3;
  assert.ok(Math.abs(average-level.avg)<6,`${level.name}: ${average.toFixed(1)} vs ${level.avg}`);
 }
});

test('computer never aims at a dart that would leave 1',()=>{
 const {api}=createApp();
 for(let score=2;score<=501;score++)for(let darts=1;darts<=3;darts++){const aim=api.botAim(score,darts);assert.ok(score-aim.value!==1&&score-aim.value>=0,`${score}/${darts}: ${aim.label}`);}
});

test('undo skips the computer visit back to the human turn',()=>{
 const {api}=createApp();
 api.state.names=['Me'];api.state.mode=301;api.state.botLevel=3;api.state.legs=1;api.startGame();
 api.state.visitValue='60';api.requestVisitSubmit();
 assert.equal(api.isBotTurn(),true);
 api.addDart(api.byLabel.T20,true);api.addDart(api.byLabel.S20,true);api.addDart(api.byLabel.S1,true);
 assert.equal(api.isBotTurn(),false);
 api.state.lastSubmitAt=0;api.undo();
 assert.equal(api.state.game.history.length,0,'both the bot visit and my visit are undone');
 assert.equal(api.isBotTurn(),false);
 api.state.lastSubmitAt=0;api.state.visitValue='45';api.requestVisitSubmit();
 api.state.lastSubmitAt=0;api.state.visitValue='45';api.requestVisitSubmit();
 assert.equal(api.state.game.history.length,1,'human input is ignored during the computer turn');
});

test('sets: winning a set resets legs and the match ends on sets',()=>{
 const {api}=createApp();
 api.state.names=['A','B'];api.state.mode=301;api.state.legs=2;api.state.sets=2;api.state.botLevel=0;api.startGame();
 const g=()=>api.state.game;
 for(const who of [0,0,0]){checkout(api,who);}
 assert.equal(g().players[0].sets,1);
 assert.equal(g().winner,null);
 checkout(api,0);
 assert.equal(g().players[0].sets,2);
 assert.equal(g().winner,g().players[0].id);
 assert.equal(g().players[0].legsWon,4);
});

test('cricket marks, points and leg win',()=>{
 const {api}=createApp();
 api.state.names=['A','B'];api.state.mode='cricket';api.state.legs=1;api.startGame();
 const g=()=>api.state.game,b=api.byLabel;
 api.altDart(b.T20);api.altDart(b.T20);api.altDart(b.S20);
 assert.equal(g().players[0].marks[20],3);
 assert.equal(g().players[0].points,80,'four extra marks on open 20 score 80');
 assert.equal(g().active,1);
 api.altDart(b.T20);api.altDart(b.S20);
 assert.equal(g().players[1].points,0,'20 is closed for everyone — no points');
 api.altDart(b.MISS);
 for(const n of [19,18,17,16,15]){api.altDart(b['T'+n]);api.altDart(b.MISS);api.altDart(b.MISS);api.altFinishTurn?.();api.altDart(b.MISS);api.altDart(b.MISS);api.altDart(b.MISS);}
 api.altDart(b.BULL);api.altDart(b['25']);
 assert.equal(g().winner,g().players[0].id);
});

test('around the clock finishes after the bull',()=>{
 const {api}=createApp();
 api.state.names=['Solo'];api.state.mode='clock';api.state.legs=1;api.startGame();
 for(let i=0;i<20;i++)api.altDart(true);
 assert.equal(api.state.game.players[0].target,21);
 assert.equal(api.state.game.winner,null);
 api.altDart(true);
 assert.equal(api.state.game.winner,api.state.game.players[0].id);
});

test('121 checkout and Bob\'s 27 training rules',()=>{
 const {api}=createApp();
 api.ensureTraining();
 api.c121Dart(api.byLabel.T20);api.c121Dart(api.byLabel.T11);api.c121Dart(api.byLabel.D14);
 assert.equal(api.state.training.c121.result.ok,true);
 const t=api.state.training;t.c121=null;
 api.c121Dart(api.byLabel.T20);api.c121Dart(api.byLabel.T20);
 assert.equal(t.c121.left,121,'bust returns to the visit start');
 assert.equal(t.c121.used,3);
 api.bobsMark(0);assert.equal(t.bob.score,25);
 api.bobsMark(2);assert.equal(t.bob.score,33);
});

test('imported history is sanitised',()=>{
 const {api}=createApp();
 const m=api.cleanSummary({id:'x',at:5,start:'<img>',players:[{name:'<b>A</b>',color:'red;background:url(x)',darts:'12',total:300}]});
 assert.equal(m.players[0].color,'#888888');
 assert.equal(m.start,0);
 assert.equal(m.players[0].darts,12);
 assert.equal(api.cleanSummary({id:5,players:[]}),null);
});

function winMatch(api){
 for(let k=0;k<12&&!api.state.game.winner;k++){const g=api.state.game,p=g.players[g.active];p.score=2;api.applyRecordedVisit(g,{playerId:p.id,hits:[{label:'D1',value:2,isDouble:true}],total:2,bust:false,checkout:true,dartCount:1});}
 api.save();
}

test('knockout tournament: byes, advancing winners and a champion',()=>{
 const {api}=createApp();
 const d=api.tDraft();d.names=['A','B','C','D','E'];d.shuffle=false;d.legs=2;d.format='knockout';
 api.createTournament();
 const t=()=>api.state.tournament;
 assert.equal(t().matches.filter(m=>m.round===1&&m.score==='bye').length,3,'5 players in an 8-bracket get 3 byes');
 for(let guard=0;guard<10&&t().champion==null;guard++){
  const m=t().matches.find(x=>x.a!=null&&x.b!=null&&x.a>=0&&x.b>=0&&x.winner==null);
  api.playTournamentMatch(m.id);
  assert.equal(api.state.game.players.map(p=>p.name).join(),[t().players[m.a].name,t().players[m.b].name].join());
  winMatch(api);
  assert.match(t().matches.find(x=>x.id===m.id).score,/^(2:[01]|[01]:2)$/);
 }
 assert.notEqual(t().champion,null);
 assert.equal(t().matches.filter(m=>m.score&&m.score!=='bye').length,4,'5 players need 4 real matches');
 assert.equal(api.state.names.join(),'Даня,Соперник','setup names are restored');
});

test('round robin tournament: every pair plays once and the table ranks by wins',()=>{
 const {api}=createApp();
 const d=api.tDraft();d.names=['A','B','C','D'];d.shuffle=false;d.legs=1;d.format='league';
 api.createTournament();
 const t=api.state.tournament,pairs=new Set(t.matches.map(m=>[m.a,m.b].sort().join('-')));
 assert.equal(t.matches.length,6);assert.equal(pairs.size,6);
 for(const m of [...t.matches]){api.playTournamentMatch(m.id);winMatch(api);}
 const table=api.leagueTable(api.state.tournament);
 assert.equal(table.reduce((s,r)=>s+r.won,0),6);
 assert.ok(table[0].won>=table[1].won);
 assert.equal(api.state.tournament.champion,table[0].i);
});

test('shanghai: points per round, winner after round 7 and instant shanghai',()=>{
 const {api}=createApp();
 api.state.names=['A','B'];api.state.mode='shanghai';api.state.legs=1;api.startGame();
 const g=()=>api.state.game;
 api.altDart(3);api.altDart(0);api.altDart(1);
 assert.equal(g().players[0].points,4);
 api.altDart(0);api.altDart(0);api.altDart(0);
 assert.equal(g().round,2);
 api.altDart(1);api.altDart(2);api.altDart(3);
 assert.equal(g().winner,g().players[0].id,'S2 D2 T2 is a shanghai');
 api.state.names=['A','B'];api.startGame();
 for(let i=0;i<7*6;i++)api.altDart(i%6<3?1:0);
 assert.equal(g().winner,g().players[0].id);
});

test('killer: become a killer, take lives, last player standing wins',()=>{
 const {api}=createApp();
 api.state.names=['A','B'];api.state.mode='killer';api.state.legs=1;api.startGame();
 const g=()=>api.state.game,[a,b]=g().players;
 api.altDart(b.num);assert.equal(g().players[1].lives,3,'not a killer yet — no effect');
 api.altDart(a.num);assert.equal(g().players[0].killer,true);
 api.altDart(b.num);assert.equal(g().players[1].lives,2);
 api.altDart(null);api.altDart(null);api.altDart(null);
 api.altDart(b.num);api.altDart(b.num);
 assert.equal(g().winner,g().players[0].id);
});

test('double in: darts before the opening double score nothing',()=>{
 const {api}=createApp();
 api.state.names=['A'];api.state.mode=501;api.state.doubleIn=true;api.state.botLevel=0;api.state.sets=0;api.startGame();
 const b=api.byLabel;
 assert.equal(api.needsDoubleIn(),true);
 api.addDart(b.T20);api.addDart(b.D10);api.addDart(b.T20);
 assert.equal(api.state.game.players[0].score,501-80);
 assert.equal(api.state.game.players[0].opened,true);
});

test('cricket bot goes for open numbers, then scores when behind',()=>{
 const {api}=createApp();
 api.state.names=['A'];api.state.mode='cricket';api.state.botLevel=3;api.startGame();
 const g=api.state.game,bot=g.players[1];
 assert.equal(bot.bot,3);
 assert.equal(api.cricketBotAim(g,bot).label,'T20');
 bot.marks[20]=3;g.players[0].points=40;
 assert.equal(api.cricketBotAim(g,bot).label,'T20','behind and 20 still open for the opponent');
 g.players[0].marks[20]=3;
 assert.equal(api.cricketBotAim(g,bot).label,'T19');
});

test('double in: the opening visit cannot be 180 (max 170)',()=>{
 const {api}=createApp();
 api.state.names=['A'];api.state.mode=501;api.state.doubleIn=true;api.state.botLevel=0;api.state.sets=0;api.startGame();
 for(const v of [180,177,171,168,165,162,159,1])assert.equal(api.DOUBLE_IN_TOTALS.has(v),false,String(v));
 for(const v of [0,2,170,160,100,50])assert.equal(api.DOUBLE_IN_TOTALS.has(v),true,String(v));
 api.state.lastSubmitAt=0;api.state.visitValue='180';api.requestVisitSubmit();
 assert.equal(api.state.game.history.length,0,'180 is rejected before opening');
 api.state.lastSubmitAt=0;api.state.visitValue='170';api.requestVisitSubmit();
 assert.equal(api.state.game.players[0].score,331);
 api.state.lastSubmitAt=0;api.state.visitValue='180';api.requestVisitSubmit();
 assert.equal(api.state.game.players[0].score,151,'after opening 180 is allowed again');
});
