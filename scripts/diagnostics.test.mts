// Run with Node >=22.18: node --experimental-strip-types --test scripts/diagnostics.test.mts
// No native modules, real credentials, database or network are used.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function fixture(sharedStorage = new Map<string, string>()) {
  const records: Array<Record<string, unknown>> = [];
  const storage = sharedStorage;
  let failWrite = false;
  let fetcher: typeof fetch = async () => new Response('{}');
  let session: { token: string; refreshToken?: string; user: {id:string;companyId:string;driverId:string|null} } | null = { token: "SYNTHETIC", refreshToken: "SYNTHETIC-refresh", user:{id:"A",companyId:"C",driverId:"D"} };
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const cache = new Map<string, Record<string, any>>();
  let revision = 0;
  class SessionChangedError extends Error {status=401;isNetwork=false;}
  const secure = { getSessionRevision:()=>revision, assertSessionRevision:(expected:number)=>{if(expected!==revision)throw new SessionChangedError()},SessionChangedError, readSession: async () => session, saveSession: async (value: typeof session) => { session = value; }, clearSession: async () => { session = null; }, replaceSessionIfCurrent:async(expected: typeof session,next: typeof session)=>{if(!session||session.token!==expected?.token||session.refreshToken!==expected?.refreshToken)return false;if(!next)revision++;session=next;return true} };
  const asyncStorage = { getItem: async (k: string) => storage.get(k) ?? null, setItem: async (k: string, v: string) => { if(failWrite){failWrite=false;throw new Error("device storage unavailable")} storage.set(k, v); }, removeItem: async (k: string) => { storage.delete(k); } };
  function load(file: string): Record<string, any> {
    if (cache.has(file)) return cache.get(file)!;
    const exports: Record<string, any> = {};
    cache.set(file, exports);
    const code = ts.transpileModule(readFileSync(resolve(root, file), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(code, {
      exports, Date, Promise, Map, Set, Math, JSON, Headers, Response, __DEV__: true,
      process: { env: {} },
      console: Object.fromEntries(["info", "warn", "error"].map(level => [level, (line: string) => records.push(JSON.parse(line))])),
      fetch: async (url: string, init?: RequestInit) => { calls.push({ url, init }); return fetcher(url, init); },
      require: (name: string) => {
        if (name === "@/lib/config") return { config: { apiUrl: "https://fixture.invalid" } };
        if (name === "@/lib/secure-store") return secure;
        if (name === "@react-native-async-storage/async-storage") return { default: asyncStorage };
        const fileName = name.startsWith("@/lib/") ? name.slice(6) : name.replace(/^\.\//, "");
        return load(`src/lib/${fileName}.ts`);
      },
    }, { filename: file });
    return exports;
  }
  const api = load("src/lib/api.ts").api;
  return { api, records, storage, calls, load, failNextWrite:()=>{failWrite=true}, setFetch(fn: typeof fetch) { fetcher = fn; }, setSession: (value: typeof session) => { session=value;revision++; }, getSession: () => session };
}
test("request tracing preserves data/status and never logs URL, credentials or body", async () => {
  const f = fixture(); f.setFetch(async () => new Response('{"value":"SYNTHETIC-secret"}', { status: 201 }));
  assert.equal((await f.api.post('/api/drivers?email=SYNTHETIC-secret', { jmbg: 'SYNTHETIC-secret' })).value, 'SYNTHETIC-secret');
  const id = new Headers(f.calls[0].init?.headers).get('x-tms-trace-id');
  assert.ok(f.load('src/lib/diagnostics-core.ts').isTraceId(id));
  assert.ok(f.records.some(r => r.event === 'request.completed' && r.status === 201 && r.traceId === id));
  assert.ok(!JSON.stringify(f.records).includes('SYNTHETIC-secret'));
  assert.equal(new Headers(f.calls[0].init?.headers).get('Authorization'), 'Bearer SYNTHETIC');
});
test("401 refresh and retry use one trace without logging tokens", async () => {
  const f = fixture(); let step = 0;
  f.setFetch(async () => {
    step++;
    if (step === 1) return new Response('{}', { status: 401 });
    if (step === 2) return new Response('{"data":{"token":"SYNTHETIC-new"}}');
    return new Response('{"ok":true}');
  });
  assert.equal((await f.api.get('/api/drivers')).ok, true);
  assert.equal(f.calls.length, 3);
  assert.equal(new Set(f.calls.map(c => new Headers(c.init?.headers).get('x-tms-trace-id'))).size, 1);
  assert.equal(f.getSession()?.token, 'SYNTHETIC-new');
  assert.ok(f.records.some(r => r.event === 'refresh.completed'));
  assert.ok(!JSON.stringify(f.records).includes('SYNTHETIC'));
});
test("network failure queues work and replay acknowledges the same trace", async () => {
  const f = fixture(); f.setFetch(async () => { throw new TypeError('SYNTHETIC-network-secret'); });
  assert.equal((await f.api.postQueued('/api/mobile/tours/T/issues', { title: 'SYNTHETIC-secret' })).queued, true);
  const stored = f.records.find(r => r.event === 'queue.stored')!; assert.ok(stored.traceId);
  f.setFetch(async () => new Response(null, { status: 204 }));
  await f.api.flushOfflineWrites();
  assert.ok(f.records.some(r => r.event === 'queue.acknowledged' && r.traceId === stored.traceId));
  assert.equal(JSON.parse(f.storage.get('tms_offline_write_queue_v1')!).length, 0);
  assert.ok(!JSON.stringify(f.records).includes('SYNTHETIC'));
});
test("HTTP rejection is not logged as queued or acknowledged", async () => {
  const f = fixture(); f.setFetch(async () => new Response('{"error":"Forbidden"}', {status:403}));
  await assert.rejects(() => f.api.postQueued('/api/drivers', {secret:'SYNTHETIC'}));
  assert.ok(f.records.some(r => r.event === 'request.failed' && r.status === 403));
  assert.ok(!f.records.some(r => r.event === 'queue.stored' || r.event === 'queue.acknowledged'));
});
test("legacy ownerless queued items are preserved without replay", async () => {
  const f = fixture();
  f.storage.set('tms_offline_write_queue_v1', JSON.stringify([{id:'old',method:'POST',path:'/api/drivers',body:{},createdAt:'2026-11-12',retries:0}]));
  f.setFetch(async () => new Response('{}', {status:409})); await f.api.flushOfflineWrites();
  assert.equal(f.calls.length,0);
  assert.equal(await f.load('src/lib/offline-queue.ts').getUnownedOfflineWriteCount(),1);
  assert.equal(await f.load('src/lib/offline-queue.ts').getOfflineWriteQueueCount(),0);
  assert.ok(!f.records.some(r => r.event === 'queue.acknowledged'));
  assert.equal(JSON.parse(f.storage.get('tms_offline_write_queue_v1')!)[0].retries, 0);
});
test("refresh rejection preserves existing API failure contract", async () => {
  const f = fixture(); f.setFetch(async () => new Response('{}', {status:401}));
  await assert.rejects(() => f.api.get('/api/drivers'), (error: any) => error.status === 401);
  assert.equal(f.getSession(), null); assert.ok(f.records.some(r => r.event === 'refresh.failed'));
});
test("new queue trace is correlation metadata only; inactive callback and 204 still work", async () => {
  const f = fixture(); let inactive = false;
  f.load('src/lib/api.ts').setAccountInactiveHandler(() => { inactive = true; });
  f.setFetch(async () => new Response('{"error":"AccountInactive"}', {status:403}));
  await assert.rejects(() => f.api.get('/api/drivers')); assert.equal(inactive, true);
  f.setFetch(async () => new Response(null, {status:204}));assert.equal(await f.api.delete('/api/drivers/D'), undefined);
});
test("direct login/presign transport preserves headers/body without logging credentials", async () => {
  const f=fixture(); const response=new Response('{"data":{"token":"SYNTHETIC-secret"}}');f.setFetch(async()=>response);
  const result=await f.load('src/lib/diagnostics.ts').diagnosticMobileFetch('/api/auth/mobile-login',{method:'POST',body:'{"password":"SYNTHETIC-secret"}',headers:{'Content-Type':'application/json'}});
  assert.equal(result,response);assert.equal(f.calls[0].url,'https://fixture.invalid/api/auth/mobile-login');assert.ok(new Headers(f.calls[0].init?.headers).get('x-tms-trace-id'));
  assert.ok(!JSON.stringify(f.records).includes('SYNTHETIC-secret'));
});
test("direct transport preserves a network exception and a rejected HTTP response",async()=>{
  const f=fixture(),e=new Error('SYNTHETIC-secret');f.setFetch(async()=>{throw e});await assert.rejects(()=>f.load('src/lib/diagnostics.ts').diagnosticMobileFetch('/api/upload/presign'),error=>error===e);
  const response=new Response('{}',{status:403});f.setFetch(async()=>response);assert.equal(await f.load('src/lib/diagnostics.ts').diagnosticMobileFetch('/api/upload/presign'),response);
});
test('failed in-flight write keeps its original owner after another login',async()=>{
 const f=fixture(),original=f.getSession()!;let resume!:()=>void,entered!:()=>void;
 const gate=new Promise<void>(r=>resume=r),started=new Promise<void>(r=>entered=r);
 f.setFetch(async()=>{entered();await gate;throw new TypeError('network down')});
 const write=f.api.postQueued('/api/documents',{tourId:'T'});await started;
 f.setSession({token:'B-token',refreshToken:'B-refresh',user:{id:'B',companyId:'C',driverId:'E'}});resume();await assert.rejects(write,(e:any)=>e.status===401);
 const before=f.calls.length;f.setFetch(async()=>new Response(null,{status:204}));await f.api.flushOfflineWrites();assert.equal(f.calls.length,before);
 f.setSession(original);f.setFetch(async()=>new Response('{"ok":true,"data":{"id":"doc-A"}}'));await f.api.flushOfflineWrites();assert.equal(new Headers(f.calls.at(-1)!.init?.headers).get('Authorization'),'Bearer SYNTHETIC');
});
for(const accepted of [false,true])test(`late refresh ${accepted?'success':'failure'} cannot replace or delete another login`,async()=>{
 const f=fixture();let resume!:()=>void,entered!:()=>void,step=0;
 const gate=new Promise<void>(r=>resume=r),started=new Promise<void>(r=>entered=r);
 f.setFetch(async()=>{step++;if(step===1)return new Response('{}',{status:401});entered();await gate;return accepted?new Response('{"data":{"token":"late-A"}}'):new Response('{}',{status:401})});
 const read=f.api.get('/api/drivers');await started;
 f.setSession({token:'B-token',refreshToken:'B-refresh',user:{id:'B',companyId:'C',driverId:'E'}});resume();await assert.rejects(read);
 assert.equal(f.getSession()!.token,'B-token');assert.equal(f.calls.length,2);
});
test('late inactive response from old account does not freeze the new login',async()=>{
 const f=fixture();let inactive=false;f.load('src/lib/api.ts').setAccountInactiveHandler(()=>{inactive=true});
 f.setFetch(async()=>{f.setSession({token:'B',refreshToken:'RB',user:{id:'B',companyId:'C',driverId:'E'}});return new Response('{"error":"AccountInactive"}',{status:403})});
 await assert.rejects(f.api.get('/api/mobile/profile'));assert.equal(inactive,false);assert.equal(f.getSession()!.token,'B');
});
test('late successful data is rejected after a session boundary',async()=>{
 const f=fixture();let resume!:()=>void,entered!:()=>void;const gate=new Promise<void>(r=>resume=r),started=new Promise<void>(r=>entered=r);
 f.setFetch(async()=>{entered();await gate;return new Response('{"private":"old-A-data"}')});const read=f.api.get('/api/mobile/profile');await started;
 f.setSession({token:'B',refreshToken:'RB',user:{id:'B',companyId:'C',driverId:'E'}});resume();await assert.rejects(read,(e:any)=>e.status===401);assert.equal(f.getSession()!.token,'B');
});
test('in-flight acknowledged queue success is removed without notifying another owner',async()=>{
 const f=fixture();f.setFetch(async()=>{throw new TypeError('offline')});await f.api.postQueued('/api/documents',{tourId:'T'});
 let notices=0;f.load('src/lib/offline-queue.ts').subscribeOfflineWritesDelivered(()=>notices++);
 f.setFetch(async()=>{f.setSession({token:'B',refreshToken:'RB',user:{id:'B',companyId:'C',driverId:'E'}});return new Response('{"ok":true,"data":{"id":"doc-A"}}')});
 await f.api.flushOfflineWrites();assert.equal(notices,0);assert.equal(JSON.parse(f.storage.get('tms_offline_write_queue_v1')!).length,0);
});

const documentBody={fileName:"fixture.pdf",fileUrl:"/api/files/documents/C/test.pdf",fileType:"PDF",relatedType:"tour",relatedId:"T",tourId:"T"};
const receipt=(id="doc-1",status=201)=>new Response(JSON.stringify({ok:true,data:{id}}),{status});
const queueOf=(f:ReturnType<typeof fixture>)=>JSON.parse(f.storage.get("tms_offline_write_queue_v1")||"[]");
test("document is durable before first send; success requires an explicit receipt and has a central delivery notice",async()=>{
 const f=fixture();let notices=0;f.load("src/lib/offline-queue.ts").subscribeOfflineWritesDelivered(()=>notices++);
 f.setFetch(async(_url,init)=>{
   const pending=queueOf(f);assert.equal(pending.length,1);
   const headers=new Headers(init?.headers);assert.equal(pending[0].operationKey,headers.get("Idempotency-Key"));
   assert.notEqual(headers.get("Idempotency-Key"),headers.get("x-tms-trace-id"));return receipt();
 });
 const result=await f.api.postQueued("/api/documents",documentBody);assert.equal(result.queued,false);
 assert.equal(result.data.data.id,"doc-1");assert.equal(queueOf(f).length,0);assert.equal(notices,1);assert.equal(result.noticeScheduled,true);
 assert.ok(!JSON.stringify(f.records).includes("fixture.pdf"));
});
test("lost committed response survives process restart and replays exactly the original operation",async()=>{
 const f=fixture();const server=new Map<string,string>();let creates=0;
 f.setFetch(async(_url,init)=>{const key=new Headers(init?.headers).get("Idempotency-Key")!;server.set(key,"accepted");creates++;throw new TypeError("connection lost after commit")});
 const initial=await f.api.postQueued("/api/documents",documentBody);assert.equal(initial.queued,true);assert.equal(initial.delivery,"pending");
 const saved=queueOf(f)[0];const restarted=fixture(f.storage);let delivered=0;
 restarted.load("src/lib/offline-queue.ts").subscribeOfflineWritesDelivered(()=>delivered++);
 restarted.setFetch(async(_url,init)=>{assert.equal(new Headers(init?.headers).get("Idempotency-Key"),saved.operationKey);assert.deepEqual(JSON.parse(init?.body as string),documentBody);assert.equal(server.has(saved.operationKey),true);return receipt("accepted",200)});
 await restarted.api.flushOfflineWrites();assert.equal(creates,1);assert.equal(queueOf(restarted).length,0);assert.equal(delivered,1);
});
test("403 is visible and blocked, no automatic loop; explicit retry keeps key and body",async()=>{
 const f=fixture();f.setFetch(async()=>new Response('{"error":"Nemate dozvolu."}',{status:403}));
 const result=await f.api.postQueued("/api/documents",documentBody);assert.equal(result.delivery,"blocked");
 const saved=queueOf(f)[0];assert.equal(saved.failureStatus,403);const before=f.calls.length;
 await f.api.flushOfflineWrites();await f.api.flushOfflineWrites();assert.equal(f.calls.length,before);
 f.setFetch(async(_url,init)=>{assert.equal(new Headers(init?.headers).get("Idempotency-Key"),saved.operationKey);assert.deepEqual(JSON.parse(init?.body as string),documentBody);return receipt()});
 assert.equal((await f.api.retryDocument(saved.id)).queued,false);assert.equal(queueOf(f).length,0);
});
for(const status of [400,401,404,409,413,415,422])test("document HTTP "+status+" does not claim save or loop",async()=>{
 const f=fixture();f.setSession({token:"T",user:{id:"A",companyId:"C",driverId:"D"}});f.setFetch(async()=>new Response('{"error":"Rejected"}',{status}));
 assert.equal((await f.api.postQueued("/api/documents",documentBody)).delivery,"blocked");
 const count=f.calls.length;await f.api.flushOfflineWrites();assert.equal(f.calls.length,count);
});
for(const status of [408,429,500,502,504])test("document HTTP "+status+" stays pending with original key",async()=>{
 const f=fixture();f.setFetch(async()=>new Response("{}",{status}));
 assert.equal((await f.api.postQueued("/api/documents",documentBody)).delivery,"pending");
 const key=queueOf(f)[0].operationKey;f.setFetch(async(_url,init)=>{assert.equal(new Headers(init?.headers).get("Idempotency-Key"),key);return receipt()});
 await f.api.flushOfflineWrites();assert.equal(queueOf(f).length,0);
});
for(const response of [()=>new Response("not-json"),()=>new Response("{}"),()=>new Response(null,{status:204}),()=>new Response('{"ok":false,"data":{"id":"x"}}')])test("missing or invalid success receipt remains unconfirmed",async()=>{
 const f=fixture();f.setFetch(async()=>response());const result=await f.api.postQueued("/api/documents",documentBody);
 assert.equal(result.queued,true);assert.equal(result.delivery,"pending");assert.equal(queueOf(f).length,1);
 assert.ok(!f.records.some(r=>r.event==="queue.acknowledged"));
});
test("local persistence failure prevents any document send",async()=>{
 const f=fixture();f.failNextWrite();await assert.rejects(f.api.postQueued("/api/documents",documentBody),/nije poslat/);assert.equal(f.calls.length,0);
});
test("lost acknowledgement storage update retries the same key after a valid server success",async()=>{
 const f=fixture();f.setFetch(async()=>{f.failNextWrite();return receipt()});
 const accepted=await f.api.postQueued("/api/documents",documentBody);assert.equal(accepted.queued,false);assert.equal(accepted.noticeScheduled,false);const key=queueOf(f)[0].operationKey;
 f.setFetch(async(_url,init)=>{assert.equal(new Headers(init?.headers).get("Idempotency-Key"),key);return receipt()});await f.api.flushOfflineWrites();assert.equal(queueOf(f).length,0);
});
test("two intentional saves have different operation keys",async()=>{
 const f=fixture();f.setFetch(async()=>receipt());await f.api.postQueued("/api/documents",documentBody);await f.api.postQueued("/api/documents",documentBody);
 assert.equal(f.calls.length,2);assert.notEqual(new Headers(f.calls[0].init?.headers).get("Idempotency-Key"),new Headers(f.calls[1].init?.headers).get("Idempotency-Key"));
});
test("legacy keyed-owner document without an operation nonce is preserved and not sent",async()=>{
 const f=fixture();const owner=f.load("src/lib/offline-owner.ts").offlineOwner(f.getSession(),"https://fixture.invalid");
 f.storage.set("tms_offline_write_queue_v1",JSON.stringify([{id:"legacy",owner,method:"POST",path:"/api/documents",body:documentBody,retries:0,createdAt:"2026-11-14"}]));
 await f.api.flushOfflineWrites();assert.equal(f.calls.length,0);assert.equal(queueOf(f)[0].blocked,true);
 await assert.rejects(f.api.retryDocument("legacy"),/bezbedno/);assert.equal(f.calls.length,0);
});
test("another account cannot retry or see a rejected document operation",async()=>{
 const f=fixture(),a=f.getSession()!;f.setFetch(async()=>new Response('{"error":"Forbidden"}',{status:403}));
 await f.api.postQueued("/api/documents",documentBody);const item=queueOf(f)[0],before=f.calls.length;
 f.setSession({token:"B",user:{id:"B",companyId:"X",driverId:"E"}});
 assert.equal((await f.load("src/lib/offline-queue.ts").getOfflineWriteQueue()).length,0);
 await assert.rejects(f.api.retryDocument(item.id));await f.api.flushOfflineWrites();assert.equal(f.calls.length,before);
 assert.equal(queueOf(f)[0].operationKey,item.operationKey);
 f.setSession(a);f.setFetch(async()=>receipt());assert.equal((await f.api.retryDocument(item.id)).queued,false);
});

test("direct document acknowledgement reaches the global notice even after its initiating view is gone",async()=>{
 const f=fixture();let viewGone=false,globalNotices=0;
 f.load("src/lib/offline-queue.ts").subscribeOfflineWritesDelivered(()=>{assert.equal(viewGone,true);globalNotices++});
 f.setFetch(async()=>{viewGone=true;return receipt()});
 const result=await f.api.postQueued("/api/documents",documentBody);
 assert.equal(result.queued,false);assert.equal(result.noticeScheduled,true);assert.equal(globalNotices,1);
});
