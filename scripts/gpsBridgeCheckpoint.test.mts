import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../src/lib/gpsBridgeCheckpoint.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
function probe(dev:boolean,get:()=>any){const exports:any={};vm.runInNewContext(compiled,{exports,__DEV__:dev,require:()=>({requireOptionalNativeModule:get})});return exports.gpsBridgeCheckpoint;}
const calls:string[]=[];
const checkpoint=probe(true,()=>({tmsGpsProbeAsync:async(s:string)=>{calls.push(s)}}));
for(const stage of ['received','identity','submit','done','failed'])assert.equal(checkpoint(stage),undefined);
assert.deepEqual(calls,['received','identity','submit','done','failed']);
checkpoint('sensitive');assert.equal(calls.length,5);
probe(false,()=>{throw Error('must not resolve native module in release')})('received');
probe(true,()=>null)('received');probe(true,()=>({}))('received');
probe(true,()=>{throw Error('older APK')})('received');
probe(true,()=>({tmsGpsProbeAsync:()=>{throw Error('native unavailable')}}))('received');
probe(true,()=>({tmsGpsProbeAsync:async()=>{throw Error('rejected')}}))('received');
// A hanging native diagnostic cannot block the caller.
assert.equal(probe(true,()=>({tmsGpsProbeAsync:()=>new Promise(()=>{})}))('received'),undefined);
await new Promise(resolve=>setTimeout(resolve,0));
console.log('GPS bridge checkpoints: development-only allowlist, old APK, throws/rejection and nonblocking diagnostic pass');
