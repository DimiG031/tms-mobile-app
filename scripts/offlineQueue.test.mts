import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
const source=fs.readFileSync(new URL('../src/lib/offline-queue.ts',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
const deferred=()=>{let resolve!:()=>void;const promise=new Promise<void>(r=>resolve=r);return {promise,resolve}};
function setup(){let saved:string|null=null,fail=false;const storage={getItem:async()=>{await Promise.resolve();return saved},setItem:async(_key:string,value:string)=>{await Promise.resolve();if(fail){fail=false;throw new Error('disk full')}saved=value},removeItem:async()=>{saved=null}};
 const c=vm.createContext({AsyncStorage:storage});vm.runInContext(stripTypeScriptTypes(source),c);
 return {c,fail:()=>{fail=true},read:()=>JSON.parse(saved??'[]')};}
const item=(name:string,path='/api/documents')=>({method:'POST',path,body:{name}});
{
 const {c,read}=setup();await Promise.all(Array.from({length:30},(_,i)=>c.enqueueOfflineWrite(item(String(i)))));assert.equal(read().length,30);assert.equal(new Set(read().map((i:any)=>i.body.name)).size,30);
}
{
 const {c,read}=setup();await c.enqueueOfflineWrite(item('A'));const entered=deferred(),resume=deferred();let executions=0;
 const send=async()=>{executions++;entered.resolve();await resume.promise};
 const first=c.flushOfflineWriteQueue(send);await entered.promise;
 const second=c.flushOfflineWriteQueue(send);
 await c.enqueueOfflineWrite(item('B'));assert.equal(read().length,2); // storage is not locked by network
 resume.resolve();await Promise.all([first,second]);assert.equal(executions,1);assert.equal(read().length,1);assert.equal(read()[0].body.name,'B');
}
{
 const {c,read}=setup();await c.enqueueOfflineWrite(item('A'));const entered=deferred(),resume=deferred();
 const flush=c.flushOfflineWriteQueue(async()=>{entered.resolve();await resume.promise;throw new Error('network request failed')});await entered.promise;
 await c.clearOfflineWriteQueue();await c.enqueueOfflineWrite(item('B'));resume.resolve();await flush;assert.equal(read().length,1);assert.equal(read()[0].body.name,'B');
}
{
 const {c,read,fail}=setup();fail();await assert.rejects(c.enqueueOfflineWrite(item('A')),/disk full/);await c.enqueueOfflineWrite(item('B'));assert.equal(read().length,1);
 c.subscribeOfflineQueueCount(()=>{throw new Error('broken UI')});await c.enqueueOfflineWrite(item('C'));assert.equal(read().length,2);
}
{
 const {c,read}=setup();await c.enqueueOfflineWrite(item('A'));await c.enqueueOfflineWrite(item('B'));let calls=0;
 await c.flushOfflineWriteQueue(async()=>{calls++;throw new Error('network request failed')});assert.equal(calls,1);assert.equal(read().length,2);assert.equal(read()[0].retries,0);
 await c.flushOfflineWriteQueue(async()=>{throw new Error('HTTP 403')});assert.ok(read().every((i:any)=>i.retries===1));
}
{
 const {c,read}=setup();for(let i=0;i<55;i++)await c.enqueueOfflineWrite(item(String(i),'/api/gps-logs'));
 let calls=0;await c.flushOfflineWriteQueue(async(i:any)=>{calls++;if(i.body.name==='4')throw new Error('HTTP 500')});assert.equal(calls,55);assert.equal(read().length,1);assert.equal(read()[0].body.name,'4');assert.equal(read()[0].retries,1);
}
console.log('Offline queue: concurrent enqueue/flush, enqueue during network, clear during flush, storage/listener failure, retries and GPS batches passed');
{
 const {c}=setup();const notices:any[]=[];const unsubscribe=c.subscribeOfflineWritesDelivered((paths:any)=>notices.push(Array.from(paths)));
 await c.enqueueOfflineWrite(item('A'));await c.flushOfflineWriteQueue(async()=>{throw new Error('HTTP 403')});assert.equal(notices.length,0);
 await c.flushOfflineWriteQueue(async()=>{});assert.deepEqual(notices,[['/api/documents']]);unsubscribe();
 await c.enqueueOfflineWrite(item('B'));await c.flushOfflineWriteQueue(async()=>{});assert.equal(notices.length,1);
}
console.log('Delivery event: emitted only for acknowledged requests; unsubscribe respected');
