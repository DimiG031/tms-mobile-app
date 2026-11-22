import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const root = new URL('../', import.meta.url);
const pkg = JSON.parse(fs.readFileSync(new URL('package.json', root), 'utf8'));
assert.equal(pkg.main, 'index.ts');
const source = fs.readFileSync(new URL(pkg.main, root), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const order: string[] = [];
let registered = false;
vm.runInNewContext(compiled, {
  exports: {},
  require(name: string) {
    order.push(name);
    if (name === './src/background/gpsTask') registered = true;
    if (name === 'expo-router/entry') assert.equal(registered, true, 'GPS must register without mounting a route');
  }
});
assert.deepEqual(order, ['@expo/metro-runtime', './src/background/gpsTask', 'expo-router/entry']);
assert.ok(!fs.readFileSync(new URL('app/_layout.tsx', root), 'utf8').includes('import "@/background/gpsTask"'));
console.log('GPS entry: registration precedes Router without a mounted layout');
