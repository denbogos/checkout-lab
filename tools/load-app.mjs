// Loads app.js in a sandbox (same way as the tests) and returns its test API.
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

export function loadApp(){
 const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const storage=new Map(),noop=()=>{},app={innerHTML:''};
 const document={documentElement:{dataset:{lang:'ru'},requestFullscreen:()=>Promise.resolve()},body:{className:'',classList:{toggle:noop}},visibilityState:'visible',fullscreenElement:null,getElementById:id=>id==='app'?app:null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener:noop};
 const context={__CHECKOUT_LAB_TEST__:true,console,crypto:globalThis.crypto,setTimeout:noop,clearTimeout:noop,requestAnimationFrame:noop,document,navigator:{language:'ru'},location:{pathname:'/',href:'/'},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)}};
 context.window=context;context.globalThis=context;context.matchMedia=()=>({matches:false});context.addEventListener=noop;
 vm.runInNewContext(source,vm.createContext(context),{filename:'app.js'});
 return context.__CL_TEST__;
}
