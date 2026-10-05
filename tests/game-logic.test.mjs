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
