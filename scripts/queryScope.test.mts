import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {stripTypeScriptTypes} from 'node:module';import ts from 'typescript';
const ownerSource=fs.readFileSync(new URL('../src/lib/offline-owner.ts',import.meta.url),'utf8').replace(/export /g,'');
const scopeSource=fs.readFileSync(new URL('../src/lib/query-scope.ts',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
const c=vm.createContext({});vm.runInContext(stripTypeScriptTypes(ownerSource+'\n'+scopeSource),c);
const a={user:{id:'A',companyId:'C',driverId:'D',role:'USER'}},b={user:{id:'B',companyId:'C',driverId:'E',role:'USER'}};
const sa=c.queryScopeOwner(a,'https://api.example'),sb=c.queryScopeOwner(b,'https://api.example');
assert.notEqual(c.queryCacheKey(sa),c.queryCacheKey(sb));assert.notEqual(c.queryScopeOwner({...a,user:{...a.user,role:'ADMIN'}},'https://api.example'),sa);
let active=true,stored=new Map<string,string>(),release!:(s:string)=>void;
const raw={getItem:async(k:string)=>stored.get(k)??null,setItem:async(k:string,v:string)=>stored.set(k,v),removeItem:async(k:string)=>stored.delete(k)};
const scoped=c.scopedQueryStorage(raw,()=>active);await scoped.setItem(c.queryCacheKey(sa),'A-private');active=false;await scoped.setItem(c.queryCacheKey(sa),'late-write');assert.equal(await scoped.getItem(c.queryCacheKey(sa)),null);assert.equal(stored.get(c.queryCacheKey(sa)),'A-private');
active=true;const delayed=c.scopedQueryStorage({...raw,getItem:()=>new Promise<string>(r=>release=r)},()=>active);const read=delayed.getItem('x');active=false;release('A-private');assert.equal(await read,null);
// Execute the original provider with React/Query adapters to check its wiring.
let session:any=a,revision=1;const clients:any[]=[],effects:any[]=[],keys:string[]=[];
const jsx=(type:any,props:any,key:any)=>({type,props,key});
const queryModules={QueryClient:class {cleared=false;canceled=false;constructor(){clients.push(this)}cancelQueries(){this.canceled=true;return Promise.resolve()}clear(){this.cleared=true}},QueryClientProvider:'public-provider'};
const exports:any={};const provider=ts.transpileModule(fs.readFileSync(new URL('../src/providers/QueryProvider.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInNewContext(provider,{exports,require:(name:string)=>{
 if(name==='react')return {useState:(fn:any)=>[fn(),()=>{}],useEffect:(fn:any)=>effects.push(fn)};
 if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};
 if(name==='@tanstack/react-query')return queryModules;
 if(name==='@tanstack/query-async-storage-persister')return {createAsyncStoragePersister:(o:any)=>{keys.push(o.key);return o}};
 if(name==='@tanstack/react-query-persist-client')return {PersistQueryClientProvider:'private-provider'};
 if(name==='@react-native-async-storage/async-storage')return {default:raw};
 if(name==='@/providers/AuthProvider')return {useAuth:()=>({session,sessionRevision:revision})};
 if(name==='@/lib/config')return {config:{apiUrl:'https://api.example'}};
 if(name==='@/lib/secure-store')return {getSessionSnapshot:()=>({session,revision})};
 if(name==='@/lib/query-scope')return c;
 throw new Error(name);
}});
const rootA=exports.QueryProvider({children:'app'}),scopeA=rootA.type(rootA.props);assert.equal(scopeA.type,'private-provider');assert.equal(scopeA.props.persistOptions.dehydrateOptions.shouldDehydrateMutation(),false);
const oldPersister=scopeA.props.persistOptions.persister;
session=b;revision=2;const rootB=exports.QueryProvider({children:'app'}),scopeB=rootB.type(rootB.props);assert.notEqual(rootA.key,rootB.key);assert.notEqual(scopeA.props.client,scopeB.props.client);assert.notEqual(keys[0],keys[1]);assert.equal(await oldPersister.storage.getItem(keys[0]),null);
session=null;revision=3;const guest=exports.QueryProvider({children:'login'});assert.equal(guest.type(guest.props).type,'public-provider');assert.ok(!keys.includes('tms-query-cache'));
for(const effect of effects){const cleanup=effect();if(typeof cleanup==='function')cleanup()}
assert.ok(clients.every(client=>client.cleared&&client.canceled));
console.log('Query scope: owner/role namespaces, retired restore/write guards, fresh clients, no guest persistence or paused mutations passed');
