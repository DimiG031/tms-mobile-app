// Run with Node >=22.18: node --experimental-strip-types scripts/stopActionState.test.mts
// No native modules, real credentials, database or network are used.
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
const path = '/api/mobile/route-stops/stop-1/actions';
const body = {action:'ARRIVED',timestamp:'2026-11-15T12:00:00.000Z'};
const acknowledged=(status='ARRIVED')=>new Response(JSON.stringify({ok:true,data:{routeStop:{id:'stop-1',status}}}),{status:200});
const snapshot=(f:ReturnType<typeof fixture>)=>f.load('src/lib/offline-queue.ts').getStopActionSnapshot();
const state=(f:ReturnType<typeof fixture>,server:string,receipt?:string,pending=false)=>f.load('src/lib/stopActionState.ts').stopActionState(server,receipt,pending);
{
 const f=fixture(); f.setFetch(async()=>{throw new Error('network request failed')});
 const result=await f.api.postQueued(path,body); assert.equal(result.queued,true);
 let saved=await snapshot(f); assert.equal(saved.queue.length,1); assert.equal(saved.receipts.length,0);
 assert.equal(state(f,'PLANNED',undefined,true).canArrive,false); assert.equal(state(f,'PLANNED',undefined,true).canDepart,false);
 await assert.rejects(f.api.postQueued(path,body),/već čeka/); assert.equal(f.calls.length,1);
 await assert.rejects(f.api.dismissStation(saved.queue[0].id)); assert.equal((await snapshot(f)).queue.length,1);
 const restart=fixture(f.storage); saved=await snapshot(restart); assert.equal(saved.queue.length,1);
 restart.setFetch(async()=>acknowledged()); await restart.api.flushOfflineWrites(); saved=await snapshot(restart);
 assert.equal(saved.queue.length,0); assert.equal(saved.receipts[0].status,'ARRIVED');
 assert.equal(JSON.parse(restart.calls[0].init!.body as string).timestamp,body.timestamp);
 const afterReload=fixture(f.storage); saved=await snapshot(afterReload);
 assert.equal(state(afterReload,'PLANNED',saved.receipts[0].status).canArrive,false);
 assert.equal(state(afterReload,'PLANNED',saved.receipts[0].status).canDepart,true);
 await assert.rejects(afterReload.api.postQueued(path,body),/već potvrđena/); assert.equal(afterReload.calls.length,0);
 afterReload.setFetch(async()=>acknowledged('DEPARTED'));
 assert.equal((await afterReload.api.postQueued(path,{...body,action:'DEPARTED'})).queued,false);
 saved=await snapshot(afterReload); assert.equal(saved.queue.length,0); assert.equal(saved.receipts[0].status,'DEPARTED');
 assert.equal(state(afterReload,'ARRIVED',saved.receipts[0].status).finished,true);
}
{
 const f=fixture(); let release!:(value:Response)=>void, entered!:()=>void;const started=new Promise<void>(r=>entered=r);
 f.setFetch(async()=>{entered();return new Promise<Response>(r=>release=r)});
 const first=f.api.postQueued(path,body); await started;
 await assert.rejects(f.api.postQueued(path,body),/već čeka/); assert.equal(f.calls.length,1);
 release(acknowledged()); assert.equal((await first).queued,false);
 assert.equal((await snapshot(f)).queue.length,0);
}
{
 const f=fixture();f.failNextWrite();await assert.rejects(f.api.postQueued(path,body),/nije sačuvan/);assert.equal(f.calls.length,0);
 f.setFetch(async()=>new Response('{}',{status:200})); assert.equal((await f.api.postQueued(path,body)).queued,true);
 const saved=await snapshot(f); assert.equal(saved.queue.length,1); assert.equal(saved.receipts.length,0);
}
{
 const f=fixture();f.setFetch(async()=>new Response('{"error":"Forbidden"}',{status:403}));
 const result=await f.api.postQueued(path,body); assert.equal(result.delivery,'blocked');
 const saved=await snapshot(f);assert.equal(saved.queue[0].blocked,true);
 f.setSession({token:'B',refreshToken:'RB',user:{id:'B',companyId:'C',driverId:'DB'}});
 assert.equal((await snapshot(f)).queue.length,0); await assert.rejects(f.api.dismissStation(saved.queue[0].id));
 f.setSession({token:'SYNTHETIC',refreshToken:'SYNTHETIC-refresh',user:{id:'A',companyId:'C',driverId:'D'}});
 await f.api.dismissStation(saved.queue[0].id);assert.equal((await snapshot(f)).queue.length,0);
}
{
 const f=fixture();f.setFetch(async()=>{f.failNextWrite();return acknowledged()});
 assert.equal((await f.api.postQueued(path,body)).queued,true);
 let saved=await snapshot(f); assert.equal(saved.queue.length,1); assert.equal(saved.receipts.length,0);
 f.setFetch(async()=>acknowledged());await f.api.retryStation(saved.queue[0].id);saved=await snapshot(f);
 assert.equal(saved.queue.length,0);assert.equal(saved.receipts[0].status,'ARRIVED');assert.equal(f.calls.length,2);
}
{
 const f=fixture();let release!:(value:Response)=>void, entered!:()=>void;const started=new Promise<void>(r=>entered=r);
 f.setFetch(async()=>{entered();return new Promise<Response>(r=>release=r)});
 const pending=f.api.postQueued(path,body);await started;
 f.setSession({token:'B',refreshToken:'RB',user:{id:'B',companyId:'C',driverId:'DB'}});release(acknowledged());await assert.rejects(pending);
 assert.equal((await snapshot(f)).receipts.length,0);
 f.setSession({token:'SYNTHETIC',refreshToken:'SYNTHETIC-refresh',user:{id:'A',companyId:'C',driverId:'D'}});
 assert.equal((await snapshot(f)).receipts[0].status,'ARRIVED');
}
console.log('Stop state: durable pre-send lock, duplicate taps, offline/reload, acknowledgement persistence, rejected-only discard and owner isolation passed');
{
 // Server committed but its response was lost; restart/retry must send the original event.
 const f=fixture(); let appliedAt:string|undefined;
 f.setFetch(async(_url,init)=>{appliedAt=JSON.parse(init!.body as string).timestamp;throw new Error('network request failed')});
 assert.equal((await f.api.postQueued(path,body)).queued,true);
 const restart=fixture(f.storage); const saved=await snapshot(restart);
 restart.setFetch(async(_url,init)=>{assert.equal(JSON.parse(init!.body as string).timestamp,appliedAt);return acknowledged()});
 assert.equal((await restart.api.retryStation(saved.queue[0].id)).queued,false);
 assert.equal((await snapshot(restart)).queue.length,0);
}
{
 const f=fixture(); f.setFetch(async()=>new Response('{"error":"Prvo potvrdite dolazak."}',{status:409}));
 assert.equal((await f.api.postQueued(path,body)).delivery,'blocked');
 let saved=await snapshot(f); const original=saved.queue[0];
 await f.api.flushOfflineWrites(); assert.equal(f.calls.length,1,'blocked station must not retry automatically');
 f.setFetch(async(_url,init)=>{assert.equal(JSON.parse(init!.body as string).timestamp,body.timestamp);return acknowledged()});
 assert.equal((await f.api.retryStation(original.id)).queued,false);
 saved=await snapshot(f); assert.equal(saved.queue.length,0); assert.equal(saved.receipts[0].status,'ARRIVED');
}
{
 let currentSnapshot:any, mutations=0;
 const sent:Array<{action:string;timestamp:string}>=[];
 const exports:any={};
 const code=ts.transpileModule(readFileSync(resolve(root,'src/components/StopActionControls.tsx'),'utf8'), {fileName:'StopActionControls.tsx',compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 const jsx=(type:any,props:any)=>({type,props}); const pure=fixture().load('src/lib/stopActionState.ts');
 vm.runInNewContext(code,{exports,require:(name:string)=>{
  if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};
  if(name==='react')return {useState:()=>[false,()=>{}]};
  if(name==='react-native')return {Alert:{alert:()=>{}}};
  if(name==='@/components/ui')return {Pressable:'Pressable',Text:'Text',View:'View'};
  if(name==='@/providers/ThemeProvider')return {useTheme:()=>({accent:{primary:'p',primarySoft:'p',primaryDark:'p'},text:{secondary:'s',muted:'m'},surface:{border:'b'}})};
  if(name==='@/queries/useTourStops')return {useRouteStopAction:()=>({isPending:false,mutate:(input:any)=>{mutations++;sent.push(input)}})};
  if(name==='@/queries/useStopActionState')return {useStopActionSnapshot:()=>currentSnapshot};
  if(name==='@/lib/stopActionState')return pure;
  if(name==='@/lib/tourStatusChange')return {stopActionNotice:()=>''};
  if(name==='@/lib/api')return {api:{}};
  if(name==='@/lib/secure-store')return {SessionChangedError:class extends Error{},getSessionRevision:()=>0};
  throw new Error(name);
 }});
 const descendants=(node:any):any[]=>node&&typeof node==='object'?[node,...[node.props?.children].flat().flatMap(descendants)]:[];
 const text=(node:any):string=>typeof node==='string'?node:node&&typeof node==='object'?[node.props?.children].flat().map(text).join(''):'';
 for(const [status,receipt,pending,fetching,canArrive,canDepart] of [
  ['PLANNED',null,false,false,true,false],['ARRIVED',null,false,false,false,true],['DEPARTED',null,false,false,false,false],
  ['PLANNED','ARRIVED',false,false,false,true],['ARRIVED','DEPARTED',false,false,false,false],['ARRIVED',null,true,false,false,false],['PLANNED',null,false,true,false,false],
 ] as const){
  currentSnapshot={isPending:false,isFetching:fetching,isError:false,data:{queue:pending?[{id:'pending',path,body}]:[],receipts:receipt?[{path,status:receipt}]:[]}};
  const tree=exports.StopActionControls({stop:{id:'stop-1',status},tourId:'T'});
  const buttons=descendants(tree).filter(node=>node.type==='Pressable');
  const arrive=buttons.find(node=>text(node)==='Stigao'),depart=buttons.find(node=>text(node)==='Krenuo');
  assert.equal(arrive.props.disabled,!canArrive); assert.equal(depart.props.disabled,!canDepart);
  const before=mutations;if(!canArrive)arrive.props.onPress();if(!canDepart)depart.props.onPress();assert.equal(mutations,before);
  if(canArrive){arrive.props.onPress();assert.equal(sent.at(-1)!.action,'ARRIVED');assert.ok(Number.isFinite(Date.parse(sent.at(-1)!.timestamp)));}
  if(canDepart){depart.props.onPress();assert.equal(sent.at(-1)!.action,'DEPARTED');assert.ok(Number.isFinite(Date.parse(sent.at(-1)!.timestamp)));}
 }
}
console.log('Actual shared controls: correct enabled side, both locked while pending/fetching, and no completed-station reopening passed');
