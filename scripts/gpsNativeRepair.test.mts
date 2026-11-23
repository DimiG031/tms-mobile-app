import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { repairs, repairSource } from './lib/gpsNativeRepair.mts';
import { patches, probeSource } from './lib/gpsNativeProbe.mts';
for (const {path, edits} of repairs) {
 const original = fs.readFileSync(new URL('../node_modules/'+path, import.meta.url),'utf8');
 const result = repairSource(original, edits);
 assert.equal(repairSource(result, edits), result);
 assert.equal(repairSource(result, edits, true), original);
 assert.equal(repairSource(original, edits, true), original);
 const probe = patches.find(p=>p.path===path)?.edits ?? [];
 assert.equal(repairSource(probeSource(original,probe),edits),probeSource(result,probe));
 assert.equal(repairSource(probeSource(result,probe),edits,true),probeSource(original,probe));
 for (const [before,after] of edits) {
  assert.throws(()=>repairSource(original.replace(before,''),edits));
  assert.throws(()=>repairSource(original+'\n'+before,edits));
  assert.throws(()=>repairSource(result+'\n'+after,edits));
 }
}
// Execute the actual Java event-accounting fragment with only collection syntax adapted.
const service = fs.readFileSync(new URL('../node_modules/'+repairs[0].path,import.meta.url),'utf8');
function events(source:string) {
 const a=source.indexOf('    final List<String> appEvents;');
 const b=source.indexOf('    if (taskManager != null)',a);
 assert.ok(a>=0&&b>a);
 const js=source.slice(a,b).replace('final List<String> appEvents;','let appEvents;').replaceAll('new ArrayList<>()','[]').replaceAll('.add(','.push(').replaceAll('.put(','.set(');
 const state={sEvents:new Map(),appScopeKey:'A',eventId:'one'};
 const ctx=vm.createContext(state);vm.runInContext('{'+js+'}',ctx);state.eventId='two';vm.runInContext('{'+js+'}',ctx);state.appScopeKey='B';state.eventId='foreign';vm.runInContext('{'+js+'}',ctx);
 return state.sEvents;
}
assert.deepEqual(Array.from(events(service).get('A')),['one']); // reproduces the installed bug
const repaired=repairSource(service,repairs[0].edits);
const state=events(repaired);assert.deepEqual(Array.from(state.get('A')),['one','two']);
state.get('A').splice(0,1);assert.equal(state.get('A').length,1); // finishing one must not schedule idle cleanup
assert.deepEqual(Array.from(state.get('B')),['foreign']); // other scope is independently retained
// Execute the actual added guard after adapting the Java cast/instanceof expression.
const begin=repaired.indexOf('    TaskManagerInterface activeManager = getTaskManager(appScopeKey);');
const end=repaired.indexOf(' // tms.gps.repair.host',begin);
const guard=repaired.slice(begin,end).replace('TaskManagerInterface activeManager','const activeManager').replace('activeManager instanceof TaskManagerInternalModule','activeManager?.internal === true').replace('((TaskManagerInternalModule) activeManager)','activeManager');
const retains=(manager:any)=>vm.runInNewContext('(function(){'+guard+'; return false;})()',{appScopeKey:'A',getTaskManager:()=>manager,Log:{i:()=>{}}})===undefined;
assert.equal(retains({internal:true,tmsHasHostActivity:()=>true}),true);
assert.equal(retains({internal:true,tmsHasHostActivity:()=>false}),false);
assert.equal(retains(null),false);assert.equal(retains({internal:false}),false);
const moduleSource=repairSource(fs.readFileSync(new URL('../node_modules/'+repairs[2].path,import.meta.url),'utf8'),repairs[2].edits);
assert.match(moduleSource,/onHostResume\(\) \{\s*mTmsHasHostActivity = true/);
assert.match(moduleSource,/onHostDestroy\(\) \{\s*mTmsHasHostActivity = false/);
assert.match(moduleSource,/onDestroy\(\) \{\s*mTmsHasHostActivity = false/);
console.log('GPS native repair: installed event-list defect reproduced; pending accounting and Activity guard adapters pass; reversible/idempotent/probe-compatible source transforms pass (not Android execution)');

// The restored options map can contain any Java Number subtype after JSON persistence.
const intervalSource = fs.readFileSync(new URL('../node_modules/'+repairs[1].path,import.meta.url),'utf8');
assert.match(intervalSource,/timeInterval = map\["timeInterval"\] as\? Long/);
const fixedInterval = repairSource(intervalSource, repairs[1].edits);
assert.match(fixedInterval,/timeInterval = \(map\["timeInterval"\] as\? Number\)\?\.toLong\(\)/);
// Adapter models the old subtype cast and Number.toLong semantics, not Kotlin execution.
const oldInterval = (type:string,value:number) => type==='Long' ? value : null;
const newInterval = (type:string,value:number) => ['Long','Integer','Double'].includes(type) ? Math.trunc(value) : null;
assert.equal(oldInterval('Integer',30000),null);
for(const type of ['Long','Integer','Double'])assert.equal(newInterval(type,30000),30000);
assert.equal(newInterval('String',30000),null);
console.log('Native restored interval: Integer/Long/Double Number conversion source and adapter pass; Android timing still needs acceptance');
