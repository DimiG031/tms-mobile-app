import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function compile(path:string){return ts.transpileModule(fs.readFileSync(new URL('../'+path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;}
const core:any={};vm.runInNewContext(compile('src/lib/diagnostics-core.ts'),{exports:core,Date});
const logs:any[]=[];let fail=false;
function runtime(dev:boolean){const exports:any={};vm.runInNewContext(compile('src/lib/gpsQueueSnapshot.ts'),{exports,__DEV__:dev,Date,require:()=>({mobileDiagnostic:(_level:string,event:string,fields:any)=>{if(fail)throw Error('sink');logs.push(core.diagnosticRecord('mobile',event,fields));}})});return exports;}
const r=runtime(true);
const fixture=(timestamp:any,createdAt='2026-01-02T00:00:00.000Z')=>({method:'POST',path:'/api/gps-logs',createdAt,body:{timestamp,latitude:42,longitude:20,token:'secret'},owner:'private',id:'private'});
const result=r.gpsQueueSnapshot([fixture('2026-01-03T00:00:00Z'),fixture('2026-01-01T00:00:00.000Z','2026-01-01T01:00:00.000Z'),fixture('not-a-date'),{...fixture('2020-01-01T00:00:00Z'),path:'/api/expenses'}]);
assert.equal(result.gpsPending,3);assert.equal(result.invalidMeasurementTimes,1);assert.equal(result.oldestMeasurementAt,'2026-01-01T00:00:00.000Z');assert.equal(result.newestMeasurementAt,'2026-01-03T00:00:00.000Z');assert.equal(result.oldestQueuedAt,'2026-01-01T01:00:00.000Z');
assert.equal(r.gpsQueueSnapshot([]).gpsPending,0);assert.equal(r.gpsQueueSnapshot([fixture(null)]).oldestMeasurementAt,undefined);
await r.reportGpsQueueSnapshot(async()=>[fixture('2026-01-01T00:00:00Z')]);assert.equal(logs.length,1);assert.equal(logs[0].gpsPending,1);
assert.ok(!/secret|private|latitude|longitude/.test(JSON.stringify(logs)));
let reads=0;await runtime(false).reportGpsQueueSnapshot(async()=>{reads++;return[]});assert.equal(reads,0);
await r.reportGpsQueueSnapshot(async()=>{throw Error('storage')});fail=true;await r.reportGpsQueueSnapshot(async()=>[]);fail=false;
const p=core.diagnosticRecord('mobile','queue.snapshot',{operation:'gps',gpsPending:-1,invalidMeasurementTimes:NaN,oldestMeasurementAt:'2026-02-31T00:00:00.000Z',newestMeasurementAt:'secret',token:'secret',latitude:42});assert.equal(p.gpsPending,undefined);assert.equal(p.oldestMeasurementAt,undefined);assert.equal(p.newestMeasurementAt,undefined);assert.equal(p.token,undefined);
assert.equal(core.diagnosticRecord('mobile','request.completed',{operation:'gps',gpsPending:9}).gpsPending,undefined);
console.log('GPS snapshot: scoped input, GPS-only counts, measurement/queue time range, empty/invalid, privacy, release and failures pass');
