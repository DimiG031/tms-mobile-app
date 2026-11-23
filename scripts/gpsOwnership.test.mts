import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {stripTypeScriptTypes} from 'node:module';
const clean=(p:string)=>fs.readFileSync(new URL(p,import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
let session:any={token:'A',user:{id:'A',companyId:'C',driverId:'D'}},revision=0,stops=0;const storage=new Map<string,string>(),sent:any[]=[];
const diagnosticEvents:any[]=[];
const nativeOptions:any[]=[];
const checkpoints:string[]=[];
const ctx=vm.createContext({gpsBridgeCheckpoint:(stage:string)=>checkpoints.push(stage),mobileDiagnostic:(...args:any[])=>diagnosticEvents.push(args),readSession:async()=>session,getSessionRevision:()=>revision,assertSessionRevision:(r:number)=>{if(r!==revision)throw new Error('session changed')},config:{apiUrl:'https://fixture.invalid'},AsyncStorage:{getItem:async(k:string)=>storage.get(k)??null,setItem:async(k:string,v:string)=>storage.set(k,v),removeItem:async(k:string)=>storage.delete(k)},api:{postQueuedForOwner:async(...args:any[])=>sent.push(args)},Location:{Accuracy:{Balanced:1,High:2},requestForegroundPermissionsAsync:async()=>({status:'granted'}),requestBackgroundPermissionsAsync:async()=>({status:'granted'}),hasStartedLocationUpdatesAsync:async()=>false,startLocationUpdatesAsync:async(_task:string,options:any)=>{nativeOptions.push(options)},stopLocationUpdatesAsync:async()=>{stops++}}});
vm.runInContext(stripTypeScriptTypes(clean('../src/lib/gpsMeasurement.ts')+'\n'+clean('../src/lib/offline-owner.ts')+'\n'+clean('../src/services/gpsTracking.ts')),ctx);
await ctx.startGpsTracking({tourId:'T',vehicleId:'V'});const ownerA=(await ctx.getGpsTrackingState()).owner;assert.ok(ownerA);
assert.equal(nativeOptions[0].accuracy,ctx.Location.Accuracy.High);
assert.equal(nativeOptions[0].timeInterval,30000);
assert.equal(nativeOptions[0].distanceInterval,0);
assert.ok(nativeOptions[0].foregroundService);

session={token:'B',user:{id:'B',companyId:'C',driverId:'E'}};revision++;
await ctx.sendGpsLog({timestamp:1700000000000,coords:{latitude:1,longitude:2,speed:0}});assert.equal(sent.length,0);
await ctx.startGpsTracking({tourId:'TB',vehicleId:'VB'});await ctx.stopGpsTracking(ownerA);assert.equal((await ctx.getGpsTrackingState()).vehicleId,'VB');assert.equal(stops,0);
await ctx.sendGpsLog({timestamp:1700000000000,coords:{latitude:1,longitude:2,speed:0}});assert.equal(sent.length,1);assert.equal(sent[0][1].vehicleId,'VB');assert.notEqual(sent[0][2],ownerA);
console.log('GPS ownership: stale tracking not sent by another login and late old cleanup preserves new tracking passed');
// Failed native start must not persist a new tracking target.
await ctx.stopGpsTracking();
ctx.Location.startLocationUpdatesAsync = async () => { throw new Error('native start failed'); };
await assert.rejects(ctx.startGpsTracking({tourId:'FAILED',vehicleId:'VF'}), /native start failed/);
assert.equal(await ctx.getGpsTrackingState(), null);
// A logout during foreground permission must not continue into background/native startup.
let backgroundRequests = 0;
ctx.Location.requestForegroundPermissionsAsync = async () => { revision++; return {status:'granted'}; };
ctx.Location.requestBackgroundPermissionsAsync = async () => { backgroundRequests++; return {status:'granted'}; };
await assert.rejects(ctx.startGpsTracking({tourId:'STALE',vehicleId:'VS'}), /session changed/);
assert.equal(backgroundRequests,0); assert.equal(await ctx.getGpsTrackingState(),null);
console.log('GPS permission race and failed native startup leave no new tracking target passed');

// A registered task can have a stalled native subscription: recovery must call
// native start again, keep queued measurements, and propagate renewal failure.
ctx.Location.requestForegroundPermissionsAsync = async () => ({status:'granted'});
ctx.Location.requestBackgroundPermissionsAsync = async () => ({status:'granted'});
let starts = 0;
ctx.Location.hasStartedLocationUpdatesAsync = async () => true;
ctx.Location.startLocationUpdatesAsync = async () => { starts++; };
await ctx.startGpsTracking({tourId:'RECOVERY',vehicleId:'VR'});
await ctx.startGpsTracking({tourId:'RECOVERY',vehicleId:'VR'});
assert.equal(starts,2);
const beforeFailure = await ctx.getGpsTrackingState();
ctx.Location.startLocationUpdatesAsync = async () => { throw new Error('renewal failed'); };
await assert.rejects(ctx.startGpsTracking({tourId:'OTHER',vehicleId:'VO'}), /renewal failed/);
assert.deepEqual(await ctx.getGpsTrackingState(),beforeFailure);
console.log('GPS registered-task recovery renews native subscription and exposes failure passed');

assert.ok(diagnosticEvents.some(e=>e[1]==='operation.completed' && e[2].operation==='gps.native.start'));
assert.ok(diagnosticEvents.some(e=>e[1]==='operation.failed' && e[2].operation==='gps.native.start'));
assert.ok(diagnosticEvents.some(e=>e[2].operation==='gps.measurement.owner'));
assert.ok(diagnosticEvents.every(e=>Object.keys(e[2]).every(k=>['operation','errorKind'].includes(k))));

let taskCallback:any;
ctx.TaskManager={defineTask:(_name:string,callback:any)=>{taskCallback=callback}};
vm.runInContext(stripTypeScriptTypes(clean('../src/background/gpsTask.ts')),ctx);
await taskCallback({error:{message:'SENSITIVE'},data:null});
assert.equal(diagnosticEvents.at(-1)[2].operation,'gps.task.native');
await taskCallback({data:{locations:[]}});
assert.equal(diagnosticEvents.at(-1)[2].operation,'gps.task.empty');
ctx.sendGpsLog=async()=>{};
await taskCallback({data:{locations:[{coords:{latitude:1,longitude:2}}]}});
assert.equal(diagnosticEvents.at(-1)[2].operation,'gps.task');
ctx.sendGpsLog=async()=>{throw new Error('SENSITIVE')};
await assert.rejects(taskCallback({data:{locations:[{}]}}), /SENSITIVE/);
assert.equal(diagnosticEvents.at(-1)[2].operation,'gps.task.send');
assert.ok(!JSON.stringify(diagnosticEvents).includes('SENSITIVE'));
console.log('GPS diagnostics distinguish callback errors, empty fixes and send failure without payloads passed');

assert.ok(checkpoints.includes("received"));assert.ok(checkpoints.includes("identity"));assert.ok(checkpoints.includes("submit"));assert.ok(checkpoints.includes("done"));assert.ok(checkpoints.includes("failed"));
