import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const root = new URL("../", import.meta.url);
const exports: Record<string, any> = {};
const code = ts.transpileModule(fs.readFileSync(new URL("src/lib/formatters.ts", root), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInNewContext(code, { exports });
for (const [status, label] of Object.entries({ PLANNED: "Planirano", ARRIVED: "Stigao", DEPARTED: "Otišao", IN_PROGRESS: "U toku", COMPLETED: "Završeno", SKIPPED: "Preskočeno", CANCELLED: "Otkazano", CANCELED: "Otkazano" })) {
  assert.equal(exports.translateStopStatus(status), label);
  assert.equal(exports.translateStopStatus(status.toLowerCase()), label);
}
for (const value of [null, undefined, "", "   "]) assert.equal(exports.translateStopStatus(value), "Nije uneto");
assert.equal(exports.translateStopStatus("FUTURE_STATUS"), "FUTURE_STATUS");
assert.equal(exports.translateTourStatus("IN_TRANSIT"), "U tranzitu");
console.log("Stop status labels: all supported station states, aliases and empty/unknown values passed");
