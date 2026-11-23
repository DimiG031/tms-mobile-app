import assert from 'node:assert/strict';
import fs from 'node:fs';
import { patches, probeSource } from './lib/gpsNativeProbe.mts';
for (const { path, edits } of patches) {
  const original = fs.readFileSync(new URL('../node_modules/' + path, import.meta.url), 'utf8');
  const patched = probeSource(original, edits);
  // Upgrade an installed earlier probe without doubling its existing markers.
  const oldMarkers = new Set(['location.broadcast','location.job','location.execute','service.execute','service.waiting_for_manager','manager.queued','manager.flush','manager.emit']);
  const oldEdits = edits.filter(([, marker]) => [...oldMarkers].some(name => marker.includes('probe.v1 ' + name + '"')));
  assert.equal(probeSource(probeSource(original, oldEdits), edits), patched);
  assert.equal(probeSource(patched, edits), patched);
  assert.equal(probeSource(patched, edits, true), original);
  for (const [anchor, marker] of edits) {
    assert.ok(patched.indexOf(marker) < patched.indexOf(anchor));
    assert.throws(() => probeSource(original.replace(anchor, ''), edits));
    assert.throws(() => probeSource(original + '\n' + anchor, edits));
    assert.match(marker, /^Log\.i\("TmsGpsBridge", "probe\.v1 [a-z._]+"\);?$/);
  }
}
console.log('GPS native probe: exact installed source, idempotence, removal and upstream drift guards pass');
