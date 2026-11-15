import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { stripTypeScriptTypes } from "node:module";
const source = (path: string) => fs.readFileSync(new URL(path, import.meta.url), "utf8").replace(/^export /gm, "");
const ctx = vm.createContext({});
vm.runInContext(stripTypeScriptTypes(source("../src/lib/tourStatusChange.ts") + "\n" + source("../src/lib/gpsMeasurement.ts")), ctx);
let calls: string[] = [], current = true;
const deps = { assertCurrent: () => { if (!current) throw new Error("session changed"); }, patch: async () => { calls.push("patch"); }, start: async () => { calls.push("start"); }, stop: async () => { calls.push("stop"); } };
const change = (status: string, override = {}, vehicleId: string | null = "V") => ctx.changeTourStatus({ tourId: "T", status, vehicleId }, { ...deps, ...override });
await assert.rejects(change("IN_TRANSIT", {}, null), /vozilo/); assert.deepEqual(calls, []);
await assert.rejects(change("IN_TRANSIT", { patch: async () => { throw new Error("offline"); } }), /offline/); assert.deepEqual(calls, []);
const failedStart = await change("IN_TRANSIT", { start: async () => { throw new Error("permission"); } });
assert.equal(failedStart.statusSaved, true); assert.equal(failedStart.gps, "failed"); assert.match(failedStart.warning, /Status ture je sačuvan/); assert.deepEqual(calls, ["patch"]);
calls = []; assert.equal((await change("IN_TRANSIT")).gps, "started"); assert.deepEqual(calls, ["patch", "start"]);
calls = []; assert.equal((await change("COMPLETED")).gps, "stopped"); assert.deepEqual(calls, ["patch", "stop"]);
assert.equal((await change("COMPLETED", { stop: async () => { throw new Error("native"); } })).gps, "failed");
calls = []; await assert.rejects(change("IN_TRANSIT", { patch: async () => { current = false; } }), /session changed/); assert.deepEqual(calls, []);
current = true; await assert.rejects(change("IN_TRANSIT", { start: async () => { current = false; throw new Error("native"); } }), /session changed/);
assert.match(ctx.stopActionNotice(true, "ARRIVED"), /još nije potvrđen/); assert.match(ctx.stopActionNotice(false, "DEPARTED"), /potvrđen na serveru/);
const measured = 1700000000000;
for (const [speed, expected] of [[-1, null], [null, null], [undefined, null], [NaN, null], [Infinity, null], [0, 0], [10, 36]]) {
 const payload = ctx.gpsMeasurement({ timestamp: measured, coords: { latitude: 44, longitude: 20, speed } }, "V", "T");
 assert.equal(payload.timestamp, new Date(measured).toISOString()); assert.equal(payload.speedKmH, expected); assert.equal(payload.tourId, "T");
}
assert.equal(ctx.gpsMeasurement({ timestamp: NaN, coords: { latitude: 44, longitude: 20 } }, "V", "T"), null);
assert.equal(ctx.gpsMeasurement({ timestamp: measured, coords: { latitude: 91, longitude: 20 } }, "V", "T"), null);
console.log("Tour/GPS: preflight, confirmed status vs native failure, session guards, queued station notice, actual measurement timestamp and unknown speed passed");
// Execute the real hook adapters: queued acknowledgement and native-only retry.
const stripImports = (path: string) => source(path).replace(/^import .*;\r?\n/gm, "");
const requests: unknown[] = [], natives: string[] = [];
const hooks = vm.createContext({ ...ctx, changeTourStatus: ctx.changeTourStatus,
 useMutation: (options: unknown) => options, useQueryClient: () => ({ invalidateQueries: async () => {} }),
 api: { postQueued: async (...args: unknown[]) => { requests.push(args); return {queued:true,data:null}; }, patch: async (...args: unknown[]) => requests.push(args) },
 getSessionRevision: () => 1, assertSessionRevision: () => {}, readSession: async () => ({token:'A'}), offlineOwner: () => 'owner-A', config: {apiUrl:'https://fixture.invalid'},
 startGpsTracking: async () => {natives.push('start');}, stopGpsTracking: async () => {natives.push('stop');}
});
vm.runInContext(stripTypeScriptTypes(stripImports('../src/queries/useTourStops.ts')+'\n'+stripImports('../src/queries/useTourDetails.ts')), hooks);
const queued = await hooks.useRouteStopAction('T').mutationFn({stopId:'S', action:'ARRIVED', timestamp:'2026-11-15T00:00:00.000Z'});
assert.equal(queued.queued,true); assert.equal((requests[0] as any[])[1].timestamp,'2026-11-15T00:00:00.000Z');
requests.length=0;
await hooks.useTourGps('T').mutationFn({stop:false,vehicleId:'V'});
await hooks.useTourGps('T').mutationFn({stop:true,vehicleId:'V'});
assert.deepEqual(requests,[]); assert.deepEqual(natives,['start','stop']);
console.log('Real hook adapters retain queued outcome and GPS retry never resends status passed');
