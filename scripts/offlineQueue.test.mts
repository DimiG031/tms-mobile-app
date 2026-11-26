import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
const stopSource=fs.readFileSync(new URL('../src/lib/stopActionState.ts',import.meta.url),'utf8').replace(/export /g,'');
const source=fs.readFileSync(new URL('../src/lib/offline-queue.ts',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
const deferred=()=>{let resolve!:()=>void;const promise=new Promise<void>(r=>resolve=r);return {promise,resolve}};
function setup(options: { now?: () => number; onReadSession?: () => void; initial?: string } = {}){let saved:string|null=options.initial??null,fail=false;const storage={getItem:async()=>{await Promise.resolve();return saved},setItem:async(_key:string,value:string)=>{await Promise.resolve();if(fail){fail=false;throw new Error('disk full')}saved=value},removeItem:async()=>{saved=null}};
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

// Live/history fairness survives reload, preserves every body and keeps other writes independent.
{
 let now=0;let f=setup({now:()=>now});
 const measured=(n:number)=>({...item(String(n),'/api/gps-logs'),body:{name:String(n),timestamp:new Date(1800000000000+n*1000).toISOString()}});
 for(let n=0;n<6;n++)await f.c.enqueueOfflineWrite(measured(n));
 const originals=new Map(f.read().map((entry:any)=>[entry.id,JSON.stringify(entry.body)]));const sent:string[]=[];
 await f.c.flushOfflineWriteQueue(async(entry:any)=>{sent.push(entry.body.name)});assert.deepEqual(sent,['5']);assert.equal(f.read().length,5);
 f=setup({now:()=>now,initial:JSON.stringify(f.read())});now=5000;
 await f.c.enqueueOfflineWrite(measured(6));await f.c.enqueueOfflineWrite(item('expense','/api/expenses'));
 await f.c.flushOfflineWriteQueue(async(entry:any)=>{sent.push(entry.body.name)});assert.deepEqual(sent,['5','0','expense']);
 now=10000;await f.c.flushOfflineWriteQueue(async(entry:any)=>{sent.push(entry.body.name)});assert.equal(sent.at(-1),'6');
 now=15000;await f.c.enqueueOfflineWrite(measured(7));await f.c.flushOfflineWriteQueue(async(entry:any)=>{sent.push(entry.body.name)});assert.equal(sent.at(-1),'1');
 for(const entry of f.read())if(originals.has(entry.id))assert.equal(JSON.stringify(entry.body),originals.get(entry.id));
 assert.equal(f.read().length,4);
}

// A failed live send does not discard it or starve history; 429 cooldown still applies to both.
{
 let now=0;const f=setup({now:()=>now});
 for(let n=0;n<3;n++)await f.c.enqueueOfflineWrite({...item(String(n),'/api/gps-logs'),body:{name:String(n),timestamp:new Date(1800000000000+n*1000).toISOString()}});
 const sent:string[]=[];
 await f.c.flushOfflineWriteQueue(async(entry:any)=>{sent.push(entry.body.name);throw Object.assign(Error('limit'),{status:429,retryAfterMs:90000})});
 assert.deepEqual(sent,['2']);assert.equal(f.read().length,3);
 now=89999;await f.c.flushOfflineWriteQueue(async(entry:any)=>{sent.push(entry.body.name)});assert.equal(sent.length,1);
 now=90000;await f.c.flushOfflineWriteQueue(async(entry:any)=>{sent.push(entry.body.name)});assert.deepEqual(sent,['2','0']);assert.equal(f.read().length,2);
 now=95000;await f.c.flushOfflineWriteQueue(async(entry:any)=>{sent.push(entry.body.name)});assert.equal(sent.at(-1),'2');assert.equal(f.read().length,1);
}
console.log('GPS fair scheduling: live/history alternation, restart, new arrivals, immutable payloads, other writes and 429 preserved');

// A large retained backlog drains while live measurements continue; no coalescing or parallel sends.
{
 let now=0;let peak=0,active=0;const f=setup({now:()=>now});
 await f.c.enqueueOfflineWrite({...item('seed','/api/gps-logs'),body:{timestamp:'2026-01-01T00:00:00.000Z'}});
 const template=f.read()[0];const backlog=Array.from({length:1493},(_,i)=>({...template,id:'fixture-'+i,body:{name:String(i),timestamp:new Date(1800000000000+i*1000).toISOString()}}));
 let loaded=setup({now:()=>now,initial:JSON.stringify(backlog)});const sent:string[]=[];
 for(let round=0;round<6;round++) {
  await loaded.c.enqueueOfflineWrite({...item('live-'+round,'/api/gps-logs'),body:{name:'live-'+round,timestamp:new Date(1900000000000+round*1000).toISOString()}});
  await Promise.all([loaded.c.flushOfflineWriteQueue(async(entry:any)=>{active++;peak=Math.max(peak,active);sent.push(entry.body.name);await Promise.resolve();active--}),loaded.c.flushOfflineWriteQueue(async()=>{throw Error('duplicate concurrent executor')})]);
  now+=5000;
 }
 assert.deepEqual(sent,['live-0','0','live-2','1','live-4','2']);assert.equal(peak,1);assert.equal(loaded.read().length,1493);
 assert.equal(loaded.read().filter((entry:any)=>entry.id.startsWith('fixture-')).length,1490);
}
console.log('GPS large backlog: 1493 retained records, live arrivals, history progress and single-flight verified');
