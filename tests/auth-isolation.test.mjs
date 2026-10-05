import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source=readFileSync(new URL('../auth.js',import.meta.url),'utf8');

class FakeElement{
 constructor(className=''){this.className=className;this.children=[];this.dataset={};this.listeners=new Map();this.innerHTML='';this.textContent='';this.title='';this.type='';}
 querySelector(selector){
  if(selector==='.auth-trigger')return this.children.find(el=>el.className==='auth-trigger')||null;
  if(selector==='.auth-menu-trigger')return this.children.find(el=>el.className==='auth-menu-trigger')||null;
  return null;
 }
 insertBefore(child,before){const index=before?this.children.indexOf(before):-1;if(index<0)this.children.push(child);else this.children.splice(index,0,child);}
 appendChild(child){this.children.push(child);return child;}
 addEventListener(type,listener){const entries=this.listeners.get(type)||[];entries.push(listener);this.listeners.set(type,entries);}
}

function createAuthHarness(){
 const topbar=new FakeElement('topbar');
 const menu=new FakeElement('mobile-menu');
 const body=new FakeElement();
 body.classList={add(){},remove(){},contains(){return false;}};
 const documentListeners=new Map();
 let authRoot=null;
 const document={
  readyState:'complete',documentElement:{dataset:{lang:'ru'}},body,
  createElement:()=>new FakeElement(),
  getElementById:id=>id==='auth-root'?authRoot:null,
  querySelector:selector=>selector==='.topbar'?topbar:selector==='.mobile-menu'?menu:null,
  querySelectorAll:selector=>selector==='.auth-trigger,.auth-menu-trigger'
   ?[...topbar.children,...menu.children].filter(el=>el.className==='auth-trigger'||el.className==='auth-menu-trigger')
   :selector==='.auth-trigger'?topbar.children.filter(el=>el.className==='auth-trigger')
   :selector==='.auth-menu-trigger'?menu.children.filter(el=>el.className==='auth-menu-trigger'):[],
  addEventListener(type,listener){documentListeners.set(type,listener);},
  dispatchEvent(event){documentListeners.get(event.type)?.(event);}
 };
 body.appendChild=child=>{body.children.push(child);if(child.id==='auth-root')authRoot=child;return child;};
 const context={console,document,window:null,globalThis:null,history:{replaceState(){}},location:{origin:'https://checkoutlab.ru',pathname:'/',search:'',hash:''},setTimeout(){}};
 context.window=context;context.globalThis=context;
 vm.runInNewContext(source,vm.createContext(context),{filename:'auth.js'});
 return {document,topbar,menu};
}

test('100 game render events do not duplicate auth controls or handlers',()=>{
 const {document,topbar,menu}=createAuthHarness();
 for(let i=0;i<100;i++)document.dispatchEvent({type:'checkoutlab:render'});
 assert.equal(topbar.children.filter(el=>el.className==='auth-trigger').length,1);
 assert.equal(menu.children.filter(el=>el.className==='auth-menu-trigger').length,1);
 assert.equal(topbar.querySelector('.auth-trigger').listeners.get('click').length,1);
 assert.equal(menu.querySelector('.auth-menu-trigger').listeners.get('click').length,1);
});
