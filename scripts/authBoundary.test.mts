import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';
const root=new URL('../',import.meta.url),modules=new Map<string,any>(),storage=new Map<string,string>();let raw:string|null=null;
let fetcher:any=async()=>new Response('{}',{status:401}),biometric:any=async()=>({success:true});
const states:any[]=[],dependencies:any[]=[],cleanups=new Map<number,any>();let cursor=0,effects:any[]=[],routes:string[]=[];
const react={
 createContext:()=>({Provider:'auth-context'}),useContext:()=>null,
 useState:(init:any)=>{const i=cursor++;if(!(i in states))states[i]=typeof init==='function'?init():init;return [states[i],(next:any)=>{states[i]=typeof next==='function'?next(states[i]):next}]},
 useCallback:(fn:any)=>{cursor++;return fn},useMemo:(fn:any)=>{cursor++;return fn()},
 useEffect:(fn:any,deps:any[])=>{const i=cursor++;if(!dependencies[i]||deps.some((v,j)=>v!==dependencies[i][j])){dependencies[i]=deps;effects.push({i,fn})}}
};
const jsx=(type:any,props:any)=>({type,props});
const secureNative={getItemAsync:async()=>raw,setItemAsync:async(_k:string,v:string)=>{raw=v},deleteItemAsync:async()=>{raw=null}};
function load(file:string):any {
 if(modules.has(file))return modules.get(file);const exports:any={};modules.set(file,exports);
 const code=ts.transpileModule(fs.readFileSync(new URL(file,root),'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,Response,Headers,Promise,Date,console,fetch:(...args:any[])=>fetcher(...args),require:(name:string)=>{
 if(name==='react')return react;if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};
 if(name==='expo-router')return {usePathname:()=>'/login',useRouter:()=>({replace:(route:string)=>routes.push(route)}),useRootNavigationState:()=>({key:'root'})};
 if(name==='expo-secure-store')return secureNative;
 if(name==='expo-local-authentication')return {hasHardwareAsync:async()=>true,isEnrolledAsync:async()=>true,authenticateAsync:(...args:any[])=>biometric(...args)};
 if(name==='@react-native-async-storage/async-storage')return {default:{getItem:async(k:string)=>storage.get(k)??null,setItem:async(k:string,v:string)=>storage.set(k,v),removeItem:async(k:string)=>storage.delete(k)}};
 if(name==='@/lib/config')return {config:{apiUrl:'https://fixture.invalid'}};
 if(name==='@/lib/diagnostics')return {diagnosticMobileFetch:(path:string,options:any)=>fetcher(path,options),mobileDiagnostic:()=>{},isTraceId:()=>true,newTraceId:()=> '00000000-0000-4000-8000-000000000000',requestOperation:()=> 'api.other',TRACE_HEADER:'x-tms-trace-id'};
 if(name==='@/services/gpsTracking')return {stopGpsTracking:async()=>{throw new Error('native cleanup failed')}};
 if(name==='@/services/notifications')return {registerPushTokenForUser:async()=>{},syncPushTokenForUser:async()=>{},unregisterPushTokenForUser:()=>new Promise(()=>{}),addPushTokenListener:()=>({remove:()=>{}})};
 if(name.startsWith('@/'))return load('src/'+name.slice(2)+(name.includes('/providers/')?'.tsx':'.ts'));
 throw new Error(name);
 }},{filename:file});return exports;
}
const provider=load('src/providers/AuthProvider.tsx'),secure=load('src/lib/secure-store.ts'),api=load('src/lib/api.ts').api;
const render=()=>{cursor=0;const value=provider.AuthProvider({children:null}).props.value;const pending=effects;effects=[];for(const {i,fn} of pending){cleanups.get(i)?.();cleanups.set(i,fn())}return value};
const tick=()=>new Promise<void>(r=>setImmediate(r));
const a={token:'A',refreshToken:'RA',user:{id:'A',companyId:'C',driverId:'D',role:'USER'}},b={token:'B',refreshToken:'RB',user:{id:'B',companyId:'C',driverId:'E',role:'USER'}};
render();await tick();let context=render();assert.equal(context.isHydrating,false);assert.equal(context.session,null);
fetcher=async()=>new Response(JSON.stringify({ok:true,data:a}));await context.signIn('a@fixture.invalid','test-only');context=render();assert.equal(context.session.user.id,'A');assert.equal(context.isAuthenticated,true);
let finished=false;const logout=context.signOut().then(()=>{finished=true});await tick();assert.equal(finished,true);await logout;context=render();assert.equal(context.session,null);assert.equal(context.hasBiometricSession,false);
// Late login cannot replace a newer completed login.
let release!:(value:Response)=>void,entered!:()=>void;const started=new Promise<void>(r=>entered=r);
fetcher=async()=>{entered();return new Promise<Response>(r=>release=r)};const oldLogin=context.signIn('a@fixture.invalid','test-only');await started;
fetcher=async()=>new Response(JSON.stringify({ok:true,data:b}));await context.signIn('b@fixture.invalid','test-only');release(new Response(JSON.stringify({ok:true,data:a})));await assert.rejects(oldLogin);context=render();assert.equal(context.session.user.id,'B');
// A refresh rejection clears both persisted session and AuthProvider memory.
fetcher=async()=>new Response('{}',{status:401});await assert.rejects(api.get('/api/mobile/profile'));context=render();assert.equal(context.session,null);assert.equal(await secure.readSession(),null);
// Biometric result must not resurrect the session read before the prompt.
fetcher=async()=>new Response(JSON.stringify({ok:true,data:a}));await context.signIn('a@fixture.invalid','test-only');context=render();
let resume!:(value:any)=>void;biometric=()=>new Promise(r=>resume=r);const unlock=context.unlockWithBiometrics();await tick();
await secure.saveSession(b);resume({success:true});await assert.rejects(unlock);context=render();assert.equal(context.session.user.id,'B');
// A token-only refresh must not clear an inactive flag; confirmed activation persists.
await secure.saveSession(a);context=render();fetcher=async()=>new Response('{"error":"AccountInactive"}',{status:403});await assert.rejects(api.get('/api/mobile/profile'));context=render();assert.equal(context.inactive,true);
const before=await secure.readSession();await secure.replaceSessionIfCurrent(before,{...before,token:'rotated'});context=render();assert.equal(context.inactive,true);
fetcher=async()=>new Response('{"ok":true,"data":{}}');await context.recheckActivation();context=render();assert.equal(context.inactive,false);assert.equal((await secure.readSession()).user.active,true);
for(const cleanup of cleanups.values())if(typeof cleanup==='function')cleanup();
console.log('AuthProvider/service/store integration: hydration, login race, non-blocking logout, refresh expiry and stale biometric result passed');
