import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const calls:string[]=[];const sent:string[]=[];
function load(file:string):any {
 const exports:any={};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,Promise,require:(name:string)=>{
  if(name==='@tanstack/react-query')return {useMutation:(options:any)=>options,useQueryClient:()=>({invalidateQueries:async(options:any)=>{calls.push(options.queryKey[0]);}})};
  if(name==='@/lib/api')return {api:{post:async(path:string)=>{sent.push(path);return {ok:true,data:{activeDriverId:'d2'}}}}};
  if(name==='@/lib/crewSwitchCache')return load('src/lib/crewSwitchCache.ts');
  if(name==='@/lib/crew'||name==='@/providers/AuthProvider'||name==='@/queries/useMobileProfile')return {};
  throw new Error(name);
 }});return exports;
}
const hooks=load('src/queries/useCrew.ts');
for(const [name,endpoint] of [['useSwitchTravelOrderDriver','travel-orders'],['useSwitchDriver','tours']]) {
 calls.length=0;const mutation=hooks[name]();await mutation.mutationFn('fixture');await mutation.onSuccess();
 assert.equal(sent.at(-1),`/api/mobile/${endpoint}/fixture/switch-driver`);
 for(const key of ['tours','tour-details','dashboard','travel-orders','travel-order-lines'])assert.ok(calls.includes(key),`${name} left ${key} stale`);
}
console.log('Crew switch hooks: both entry points refresh linked tour, dashboard and travel-order views');
