import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { edits, target, taskPreferencesSource } from './lib/gpsTaskPreferences.mts';
import { repairs, repairSource } from './lib/gpsNativeRepair.mts';
import { patches, probeSource } from './lib/gpsNativeProbe.mts';
import { devLaunchSource } from './lib/gpsDevLaunch.mts';

const source = fs.readFileSync(new URL('../node_modules/' + target, import.meta.url), 'utf8');
const patched = taskPreferencesSource(source);
assert.equal(taskPreferencesSource(patched), patched);
assert.equal(taskPreferencesSource(patched, true), source);
assert.equal(taskPreferencesSource(source, true), source);
for (const [before, after] of edits) {
  assert.throws(() => taskPreferencesSource(source.replace(before, '')));
  assert.throws(() => taskPreferencesSource(source + '\n' + before));
  assert.throws(() => taskPreferencesSource(patched + '\n' + after));
}
const nativeRepair = repairs.find(p => p.path === target)!.edits;
const nativeProbe = patches.find(p => p.path === target)!.edits;
const other = (s: string) => devLaunchSource(probeSource(repairSource(s, nativeRepair), nativeProbe));
assert.equal(taskPreferencesSource(other(source)), other(patched));
assert.equal(taskPreferencesSource(other(patched), true), other(source));
assert.ok(patched.indexOf('mTmsTaskPreferences =') < patched.indexOf('restoreTasks();'));

// Execute original/patched getter and constructor fragments with Java declarations
// adapted to JS. This models context loss; it is not an Android runtime test.
function getter(s: string, bindings: object) {
  const match = s.match(/private SharedPreferences getSharedPreferences\(\) \{([\s\S]*?)\n  \}/)!;
  return vm.runInNewContext('(function(){' + match[1].replace('Context context', 'const context') + '})()', bindings);
}
const retained = new Map([['existing-task', 'unchanged']]);
assert.equal(getter(source, { mContextRef: {get: () => null} }), null);
for (const hasApplication of [true, false]) {
  const calls: string[] = [];
  const preferences = {getAll: () => retained};
  const application = {getSharedPreferences: (name: string, mode: number) => {calls.push('app:' + name + ':' + mode); return preferences;}};
  const context = {getApplicationContext: () => hasApplication ? application : null,
    getSharedPreferences: (name: string, mode: number) => {calls.push('fallback:' + name + ':' + mode); return preferences;}};
  const constructor = edits[1][1].split('    mContextRef =')[0]
    .replaceAll('Context tms', 'const tms').replace('mTmsTaskPreferences =', 'globalThis.mTmsTaskPreferences =');
  const bindings: any = {context, SHARED_PREFERENCES_NAME: 'TaskManagerModule', Context: {MODE_PRIVATE: 0}};
  vm.runInNewContext(constructor, bindings);
  for (const weak of [context, null]) {
    const actual = getter(patched, {...bindings, mContextRef: {get: () => weak}});
    assert.equal(actual, preferences);
    assert.equal(actual.getAll(), retained);
    assert.equal(actual.getAll().get('existing-task'), 'unchanged');
  }
  assert.deepEqual(calls, [(hasApplication ? 'app:' : 'fallback:') + 'TaskManagerModule:0']);
}
console.log('Task preferences: original null reproduced; stable same-store handle after weak-context loss, application/fallback paths, existing content, patch ordering, drift/removal and other native patch compatibility pass. Android acceptance pending.');
