import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
const stopSource=fs.readFileSync(new URL('../src/lib/stopActionState.ts',import.meta.url),'utf8').replace(/export /g,'');
const source=fs.readFileSync(new URL('../src/lib/offline-queue.ts',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
const deferred=()=>{let resolve!:()=>void;const promise=new Promise<void>(r=>resolve=r);return {promise,resolve}};
function setup(options: { now?: () => number; onReadSession?: () => void } = {}){let saved:string|null=null,fail=false;const storage={getItem:async()=>{await Promise.resolve();return saved},setItem:async(_key:string,value:string)=>{await Promise.resolve();if(fail){fail=false;throw new Error('disk full')}saved=value},removeItem:async()=>{saved=null}};
 let session:any={user:{id:'A',companyId:'C',driverId:'D'}};
 const c=vm.createContext({Date:class extends Date { static now(){return options.now?.() ?? Date.now()} },AsyncStorage:storage,readSession:async()=>{options.onReadSession?.();return session},config:{apiUrl:'https://fixture.invalid'}});
 const ownerSource=fs.readFileSync(new URL('../src/lib/offline-owner.ts',import.meta.url),'utf8').replace(/export /g,'');
 vm.runInContext(stripTypeScriptTypes(stopSource+'\n'+ownerSource+'\n'+source),c);
 return {c,setSession:(value:any)=>{session=value},fail:()=>{fail=true},read:()=>JSON.parse(saved??'[]')};}
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
 let calls=0;await c.flushOfflineWriteQueue(async(i:any)=>{calls++;if(i.body.name==='4')throw new Error('HTTP 500')});assert.equal(calls,1);assert.equal(read().length,54);await c.flushOfflineWriteQueue(async()=>{calls++});assert.equal(calls,1);assert.ok(read().every((entry:any)=>entry.nextAttemptAt > Date.now()));
}
console.log('Offline queue: concurrent enqueue/flush, enqueue during network, clear during flush, storage/listener failure, retries and paced GPS preservation passed');
{
 const {c}=setup();const notices:any[]=[];const unsubscribe=c.subscribeOfflineWritesDelivered((paths:any)=>notices.push(Array.from(paths)));
 await c.enqueueOfflineWrite(item('A'));await c.flushOfflineWriteQueue(async()=>{throw new Error('HTTP 403')});assert.equal(notices.length,0);
 await c.flushOfflineWriteQueue(async()=>{});assert.deepEqual(notices,[['/api/documents']]);unsubscribe();
 await c.enqueueOfflineWrite(item('B'));await c.flushOfflineWriteQueue(async()=>{});assert.equal(notices.length,1);
}
console.log('Delivery event: emitted only for acknowledged requests; unsubscribe respected');
{
 const {c,read,setSession}=setup();const a={user:{id:'A',companyId:'C',driverId:'D'}},b={user:{id:'B',companyId:'C',driverId:'E'}};
 await c.enqueueOfflineWrite(item('A'));const ownerA=read()[0].owner;
 setSession(b);assert.equal((await c.getOfflineWriteQueue()).length,0);let calls=0;
 await c.flushOfflineWriteQueue(async()=>{calls++});assert.equal(calls,0);
 await c.enqueueOfflineWrite(item('B'));assert.equal((await c.getOfflineWriteQueueCount()),1);
 await c.clearOfflineWriteQueue();assert.equal(read().length,1);assert.equal(read()[0].owner,ownerA);
 setSession(a);await c.flushOfflineWriteQueue(async()=>{calls++});assert.equal(calls,1);assert.equal(read().length,0);
 setSession(null);await assert.rejects(c.enqueueOfflineWrite(item('guest')),/prijava/);assert.equal((await c.getOfflineWriteQueueCount()),0);
}
{
 const {c,read,setSession}=setup();const entered=deferred(),resume=deferred();let calls=0,notices=0;
 c.subscribeOfflineWritesDelivered(()=>notices++);await c.enqueueOfflineWrite(item('first'));await c.enqueueOfflineWrite(item('second'));
 const flush=c.flushOfflineWriteQueue(async()=>{calls++;entered.resolve();await resume.promise});await entered.promise;
 setSession({user:{id:'B',companyId:'C',driverId:'E'}});await c.enqueueOfflineWrite(item('B'));resume.resolve();await flush;
 assert.equal(calls,1);assert.equal(notices,0);assert.deepEqual(read().map((x:any)=>x.body.name),['second','B']);
 assert.equal((await c.getOfflineWriteQueue()).length,1);
}
{
 const {c}=setup();const a={user:{id:'A',companyId:'C',driverId:'D'}};const base=c.offlineOwner(a,'https://one.example');
 for(const [s,origin] of [[{user:{...a.user,id:'B'}},'https://one.example'],[{user:{...a.user,companyId:'X'}},'https://one.example'],[{user:{...a.user,driverId:'E'}},'https://one.example'],[a,'https://two.example']])assert.notEqual(c.offlineOwner(s,origin),base);
 assert.equal(c.offlineOwner({user:{}},'https://one.example'),null);
}
console.log('Owner boundaries: account/company/driver/server, no guest writes, no cross-account replay or delivery notice passed');

// Clock crossing the cooldown during an awaited owner read must not let a newer GPS overtake.
{
 let now=0, reads=0, counting=false;
 const {c,read}=setup({now:()=>now,onReadSession:()=>{if(counting){reads++;if(reads===2)now=4999;if(reads===3)now=5000}}});
 for(const name of ['older','newer'])await c.enqueueOfflineWrite({...item(name,'/api/gps-logs'),nextAttemptAt:5000});
 await c.enqueueOfflineWrite(item('expense','/api/expenses'));counting=true;
 const calls:string[]=[];await c.flushOfflineWriteQueue(async(entry:any)=>{calls.push(entry.body.name)});
 assert.deepEqual(calls,['expense']);assert.deepEqual(read().map((entry:any)=>entry.body.name),['older','newer']);
 counting=false;now=6000;await c.flushOfflineWriteQueue(async(entry:any)=>{calls.push(entry.body.name)});
 assert.deepEqual(calls,['expense','older']);assert.deepEqual(read().map((entry:any)=>entry.body.name),['newer']);
 now=11000;await c.flushOfflineWriteQueue(async(entry:any)=>{calls.push(entry.body.name)});
 assert.deepEqual(calls,['expense','older','newer']);assert.equal(read().length,0);
}
// A failed GPS remains ahead of newer GPS even if a slow error crosses the pacing deadline.
{
 let now=0;const {c,read}=setup({now:()=>now});
 for(const name of ['older','newer'])await c.enqueueOfflineWrite(item(name,'/api/gps-logs'));
 await c.enqueueOfflineWrite(item('expense','/api/expenses'));const calls:string[]=[];
 await c.flushOfflineWriteQueue(async(entry:any)=>{calls.push(entry.body.name);if(entry.body.name==='older'){now=6000;throw Error('server failure')}});
 assert.deepEqual(calls,['older','expense']);assert.deepEqual(read().map((entry:any)=>entry.body.name),['older','newer']);
}
console.log('GPS order: cooldown crossing and slow failure cannot overtake; other writes proceed; oldest sends first');
