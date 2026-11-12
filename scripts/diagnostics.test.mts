// Run with Node >=22.18: node --experimental-strip-types --test scripts/diagnostics.test.mts
// No native modules, real credentials, database or network are used.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function fixture() {
  const records: Array<Record<string, unknown>> = [];
  const storage = new Map<string, string>();
  let fetcher: typeof fetch = async () => new Response('{}');
  let session: { token: string; refreshToken?: string } | null = { token: "SYNTHETIC", refreshToken: "SYNTHETIC-refresh" };
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const cache = new Map<string, Record<string, any>>();
  const secure = { readSession: async () => session, saveSession: async (value: typeof session) => { session = value; }, clearSession: async () => { session = null; } };
  const asyncStorage = { getItem: async (k: string) => storage.get(k) ?? null, setItem: async (k: string, v: string) => { storage.set(k, v); }, removeItem: async (k: string) => { storage.delete(k); } };
  function load(file: string): Record<string, any> {
    if (cache.has(file)) return cache.get(file)!;
    const exports: Record<string, any> = {};
    cache.set(file, exports);
    const code = ts.transpileModule(readFileSync(resolve(root, file), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(code, {
      exports, Date, Promise, Map, Set, Math, JSON, Headers, Response, __DEV__: true,
      process: { env: {} },
      console: Object.fromEntries(["info", "warn", "error"].map(level => [level, (line: string) => records.push(JSON.parse(line))])),
      fetch: async (url: string, init?: RequestInit) => { calls.push({ url, init }); return fetcher(url, init); },
      require: (name: string) => {
        if (name === "@/lib/config") return { config: { apiUrl: "https://fixture.invalid" } };
        if (name === "@/lib/secure-store") return secure;
        if (name === "@react-native-async-storage/async-storage") return { default: asyncStorage };
        const fileName = name.startsWith("@/lib/") ? name.slice(6) : name.replace(/^\.\//, "");
        return load(`src/lib/${fileName}.ts`);
      },
    }, { filename: file });
    return exports;
  }
  const api = load("src/lib/api.ts").api;
  return { api, records, storage, calls, load, setFetch(fn: typeof fetch) { fetcher = fn; }, getSession: () => session };
}
test("request tracing preserves data/status and never logs URL, credentials or body", async () => {
  const f = fixture(); f.setFetch(async () => new Response('{"value":"SYNTHETIC-secret"}', { status: 201 }));
  assert.equal((await f.api.post('/api/drivers?email=SYNTHETIC-secret', { jmbg: 'SYNTHETIC-secret' })).value, 'SYNTHETIC-secret');
  const id = new Headers(f.calls[0].init?.headers).get('x-tms-trace-id');
  assert.ok(f.load('src/lib/diagnostics-core.ts').isTraceId(id));
  assert.ok(f.records.some(r => r.event === 'request.completed' && r.status === 201 && r.traceId === id));
  assert.ok(!JSON.stringify(f.records).includes('SYNTHETIC-secret'));
  assert.equal(new Headers(f.calls[0].init?.headers).get('Authorization'), 'Bearer SYNTHETIC');
});
test("401 refresh and retry use one trace without logging tokens", async () => {
  const f = fixture(); let step = 0;
  f.setFetch(async () => {
    step++;
    if (step === 1) return new Response('{}', { status: 401 });
    if (step === 2) return new Response('{"data":{"token":"SYNTHETIC-new"}}');
    return new Response('{"ok":true}');
  });
  assert.equal((await f.api.get('/api/drivers')).ok, true);
  assert.equal(f.calls.length, 3);
  assert.equal(new Set(f.calls.map(c => new Headers(c.init?.headers).get('x-tms-trace-id'))).size, 1);
  assert.equal(f.getSession()?.token, 'SYNTHETIC-new');
  assert.ok(f.records.some(r => r.event === 'refresh.completed'));
  assert.ok(!JSON.stringify(f.records).includes('SYNTHETIC'));
});
test("network failure queues work and replay acknowledges the same trace", async () => {
  const f = fixture(); f.setFetch(async () => { throw new TypeError('SYNTHETIC-network-secret'); });
  assert.equal((await f.api.postQueued('/api/mobile/tours/T/issues', { title: 'SYNTHETIC-secret' })).queued, true);
  const stored = f.records.find(r => r.event === 'queue.stored')!; assert.ok(stored.traceId);
  f.setFetch(async () => new Response(null, { status: 204 }));
  await f.api.flushOfflineWrites();
  assert.ok(f.records.some(r => r.event === 'queue.acknowledged' && r.traceId === stored.traceId));
  assert.equal(JSON.parse(f.storage.get('tms_offline_write_queue_v1')!).length, 0);
  assert.ok(!JSON.stringify(f.records).includes('SYNTHETIC'));
});
test("HTTP rejection is not logged as queued or acknowledged", async () => {
  const f = fixture(); f.setFetch(async () => new Response('{"error":"Forbidden"}', {status:403}));
  await assert.rejects(() => f.api.postQueued('/api/drivers', {secret:'SYNTHETIC'}));
  assert.ok(f.records.some(r => r.event === 'request.failed' && r.status === 403));
  assert.ok(!f.records.some(r => r.event === 'queue.stored' || r.event === 'queue.acknowledged'));
});
test("legacy queued items without traceId still replay; failures stay unacknowledged", async () => {
  const f = fixture();
  f.storage.set('tms_offline_write_queue_v1', JSON.stringify([{id:'old',method:'POST',path:'/api/drivers',body:{},createdAt:'2026-11-12',retries:0}]));
  f.setFetch(async () => new Response('{}', {status:409})); await f.api.flushOfflineWrites();
  assert.ok(f.records.some(r => r.event === 'queue.rejected' && r.status === 409));
  assert.ok(!f.records.some(r => r.event === 'queue.acknowledged'));
  assert.equal(JSON.parse(f.storage.get('tms_offline_write_queue_v1')!)[0].retries, 1);
});
test("refresh rejection preserves existing API failure contract", async () => {
  const f = fixture(); f.setFetch(async () => new Response('{}', {status:401}));
  await assert.rejects(() => f.api.get('/api/drivers'), (error: any) => error.status === 401);
  assert.equal(f.getSession(), null); assert.ok(f.records.some(r => r.event === 'refresh.failed'));
});
test("new queue trace is correlation metadata only; inactive callback and 204 still work", async () => {
  const f = fixture(); let inactive = false;
  f.load('src/lib/api.ts').setAccountInactiveHandler(() => { inactive = true; });
  f.setFetch(async () => new Response('{"error":"AccountInactive"}', {status:403}));
  await assert.rejects(() => f.api.get('/api/drivers')); assert.equal(inactive, true);
  f.setFetch(async () => new Response(null, {status:204}));assert.equal(await f.api.delete('/api/drivers/D'), undefined);
});
test("direct login/presign transport preserves headers/body without logging credentials", async () => {
  const f=fixture(); const response=new Response('{"data":{"token":"SYNTHETIC-secret"}}');f.setFetch(async()=>response);
  const result=await f.load('src/lib/diagnostics.ts').diagnosticMobileFetch('/api/auth/mobile-login',{method:'POST',body:'{"password":"SYNTHETIC-secret"}',headers:{'Content-Type':'application/json'}});
  assert.equal(result,response);assert.equal(f.calls[0].url,'https://fixture.invalid/api/auth/mobile-login');assert.ok(new Headers(f.calls[0].init?.headers).get('x-tms-trace-id'));
  assert.ok(!JSON.stringify(f.records).includes('SYNTHETIC-secret'));
});
test("direct transport preserves a network exception and a rejected HTTP response",async()=>{
  const f=fixture(),e=new Error('SYNTHETIC-secret');f.setFetch(async()=>{throw e});await assert.rejects(()=>f.load('src/lib/diagnostics.ts').diagnosticMobileFetch('/api/upload/presign'),error=>error===e);
  const response=new Response('{}',{status:403});f.setFetch(async()=>response);assert.equal(await f.load('src/lib/diagnostics.ts').diagnosticMobileFetch('/api/upload/presign'),response);
});
