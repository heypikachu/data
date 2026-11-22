'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const loaderSource = fs.readFileSync(path.join(__dirname, '..', 'hp-dex', 'hp-dex-loader.js'), 'utf8');
const ENGINE = fs.readFileSync(path.join(__dirname, '..', 'hp-dex', 'hp-dex.js'), 'utf8');
const RELEASE = 'fb50db1382d9575c2b6cf70a1e0163d1c72cc6eb';

async function runLoader(manifest, legacy = false) {
  const nodes = [];
  const app = {dataset: {},querySelector(){return null;},appendChild(){}};
  const scripts = legacy ? [{
    src:'https://cdn.jsdelivr.net/gh/heypikachu/data@main/hp-dex/hp-dex.js',
    hasAttribute(){return false;}
  }] : [];
  const doc = {
    readyState: 'complete', scripts,
    querySelectorAll(selector){return selector.includes('hp-dex-app')?[app]:[];},
    createElement(kind){return {tagName:kind,attrs:{},setAttribute(k,v){this.attrs[k]=v;},remove(){},hasAttribute(k){return k in this.attrs;}};},
    head:{appendChild(el){nodes.push(el);queueMicrotask(()=>el.onload&&el.onload());}}
  };
  const win = {fetch:async()=>({ok:true,json:async()=>manifest}),setTimeout,clearTimeout,dispatchEvent(){}};
  const context = {window:win,document:doc,console:{error(){},warn(){}},Date,
    CustomEvent:class{constructor(){}},AbortController,Promise};
  vm.runInNewContext(loaderSource,context);
  await new Promise(resolve=>setTimeout(resolve,20));
  return {nodes,app,win,context};
}
test('a release carrega CSS e JS do mesmo commit imutável',async()=>{
  const state=await runLoader({schema:1,release:'1',commit:RELEASE,previous:null});
  assert.equal(state.nodes.length,2);
  assert.match(state.nodes[0].href,new RegExp('@'+RELEASE+'/hp-dex/hp-dex.css'));
  assert.match(state.nodes[1].src,new RegExp('@'+RELEASE+'/hp-dex/hp-dex.js'));
  assert.equal(state.app.dataset.hpDexRuntimeCommit,RELEASE);
});
test('não mistura carregador novo com script legado',async()=>{
  const state=await runLoader({schema:1,commit:RELEASE},true);
  assert.equal(state.nodes.length,0);
});
test('não inicializa carregador duplicado',async()=>{
  const state=await runLoader({schema:1,commit:RELEASE});
  vm.runInNewContext(loaderSource,state.context);
  await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(state.nodes.length,2);
});
test('motor contém a soma de EVs, e não usa maior valor',()=>{
  assert.match(ENGINE,/const totalEv\s*=\s*rec\.ev_yield\.reduce/);
  assert.doesNotMatch(ENGINE,/const maxEv\s*=\s*Math\.max\(\.\.\.rec\.ev_yield\)/);
  assert.match(ENGINE,/Distribuição de EVs/);
  const c=JSON.parse(fs.readFileSync(path.join(__dirname,'..','pokemon','charmeleon.json'),'utf8'));
  assert.deepEqual(c.records.za.ev_yield,[0,0,0,1,0,1]);
  assert.equal(c.records.za.ev_yield.reduce((a,b)=>a+b,0),2);
});
