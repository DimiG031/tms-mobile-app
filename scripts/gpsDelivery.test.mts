import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
let now = 1800000000000, calls = 0, active = 0, peak = 0, failStorage = false;
let session: any = { token: 'fixture', user: { id: 'A', companyId: 'C', driverId: 'D' } };
const storage = new Map<string,string>();
class Clock extends Date { static now() { return now; } }
let response = () => new Response('{}', {status:201});
function runtime() {
 const modules = new Map<string,any>();
 function load(file:string):any {
  if(modules.has(file)) return modules.get(file);
  const exports:any={};modules.set(file,exports);
  const code=ts.transpileModule(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{exports,Date:Clock,console,fetch:async()=>{calls++;active++;peak=Math.max(peak,active);await Promise.resolve();active--;return response();},require:(name:string)=>{
   if(name==='@react-native-async-storage/async-storage')return {default:{getItem:async(k:string)=>storage.get(k)??null,setItem:async(k:string,v:string)=>{if(failStorage)throw Error('disk full');storage.set(k,v)},removeItem:async(k:string)=>storage.delete(k)}};
   if(name==='@/lib/secure-store')return {readSession:async()=>session,getSessionRevision:()=>0,assertSessionRevision:()=>{},replaceSessionIfCurrent:async()=>false,SessionChangedError:class extends Error{}};
   if(name==='@/lib/config')return {config:{apiUrl:'https://fixture.invalid'}};
   if(name==='@/lib/diagnostics')return {mobileDiagnostic:()=>{},isTraceId:()=>true,newTraceId:()=> 'fixture-trace',requestOperation:()=> 'gps',TRACE_HEADER:'x-trace'};
   if(name.startsWith('@/'))return load('src/'+name.slice(2)+'.ts');
   throw Error(name);
  }});return exports;
 }
 return { api:load('src/lib/api.ts').api, queue:load('src/lib/offline-queue.ts') };
}
let {api,queue}=runtime();
// Use the real owner helper's representation via a persisted fixture request.
await queue.enqueueOfflineWrite({method:'POST',path:'/api/gps-logs',body:{timestamp:'first'} });
const realOwner=(await queue.getOfflineWriteQueue())[0].owner;
storage.clear();
await Promise.all(Array.from({length:30},(_,i)=>api.postQueuedForOwner('/api/gps-logs',{timestamp:i},realOwner)));
assert.equal(calls,1);assert.equal(peak,1);assert.equal((await queue.getOfflineWriteQueue()).length,29);
await api.flushOfflineWrites();assert.equal(calls,1);
// Other writes are not blocked by GPS pacing.
await api.postQueued('/api/expenses',{amount:1});assert.equal(calls,2);
// Persistence survives a new JS runtime.
({api,queue}=runtime());await api.flushOfflineWrites();assert.equal(calls,2);
now+=30000;response=()=>new Response('{"error":"slow down"}',{status:429,headers:{'Retry-After':'90'}});
await api.flushOfflineWrites();assert.equal(calls,3);
let pending=await queue.getOfflineWriteQueue();assert.equal(pending.length,29);assert.ok(pending.every((x:any)=>x.nextAttemptAt>=now+90000));
const firstBody=JSON.stringify(pending[0].body);
({api,queue}=runtime());now+=89999;await api.flushOfflineWrites();assert.equal(calls,3);
now++;response=()=>new Response('{}',{status:201});await api.flushOfflineWrites();assert.equal(calls,4);assert.equal((await queue.getOfflineWriteQueue()).length,28);
assert.notEqual(JSON.stringify((await queue.getOfflineWriteQueue())[0].body),firstBody);
// Storage failure never sends an unpersisted GPS measurement.
failStorage=true;await assert.rejects(api.postQueuedForOwner('/api/gps-logs',{timestamp:'unsaved'},realOwner));assert.equal(calls,4);failStorage=false;
// Foreign owner cannot submit under the current account.
await assert.rejects(api.postQueuedForOwner('/api/gps-logs',{},'foreign'));assert.equal(calls,4);
// HTTP-date Retry-After and missing header fallback are carried on ApiError.
response=()=>new Response('{}',{status:429,headers:{'Retry-After':new Date(now+120000).toUTCString()}});
await assert.rejects(api.get('/fixture'),(e:any)=>e.status===429&&e.retryAfterMs===120000);
response=()=>new Response('{}',{status:429});await assert.rejects(api.get('/fixture'),(e:any)=>e.retryAfterMs===60000);
console.log('GPS delivery: durable burst, serial pacing, 429 seconds/date/fallback, reload, storage and owner boundaries pass');
