import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { target, anchor, guard, devLaunchSource } from './lib/gpsDevLaunch.mts';
import { repairs, repairSource } from './lib/gpsNativeRepair.mts';
import { patches, probeSource } from './lib/gpsNativeProbe.mts';
const source=fs.readFileSync(new URL('../node_modules/'+target,import.meta.url),'utf8');
const patched=devLaunchSource(source);
assert.equal(devLaunchSource(patched),patched);
assert.equal(devLaunchSource(patched,true),source);
assert.equal(devLaunchSource(source,true),source);
assert.throws(()=>devLaunchSource(source.replace(anchor,'')));
assert.throws(()=>devLaunchSource(source+'\n'+anchor));
assert.throws(()=>devLaunchSource(patched+'\n'+guard));
assert.ok(patched.indexOf('if (taskManager != null)')<patched.indexOf(guard));
assert.ok(patched.indexOf(anchor)<patched.indexOf(guard));
assert.ok(patched.indexOf(guard)<patched.indexOf('getAppLoader().loadApp'));
const edits=repairs.find(p=>p.path===target)!.edits;
const markers=patches.find(p=>p.path===target)!.edits;
assert.equal(devLaunchSource(repairSource(probeSource(source,markers),edits)),repairSource(probeSource(patched,markers),edits));
// Execute the exact Java branch with type/member syntax adapted; not an Android runtime test.
const js=guard.replace('Context tmsLaunchContext','const tmsLaunchContext').replace('"tms-background-gps-task".equals(task.getName())','task.getName() === "tms-background-gps-task"').replace('android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE','2');
for(const flags of [0,2]) for(const name of ['tms-background-gps-task','other']) for(const present of [false,true]) {
 const logs:string[]=[];
 const skipped=vm.runInNewContext('(function(){'+js+'return false;})()',{mContextRef:{get:()=>present?{getApplicationInfo:()=>({flags})}:null},task:{getName:()=>name},Log:{i:(_tag:string,msg:string)=>logs.push(msg)}})===undefined;
 assert.equal(skipped,present&&flags===2&&name==='tms-background-gps-task');
 assert.equal(logs.length,skipped?1:0);
}
console.log('GPS development launch gate: branch matrix, queue-before-gate, live manager bypass, drift/removal and repair/probe compatibility pass');
