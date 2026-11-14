import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { stripTypeScriptTypes } from "node:module";
const source=fs.readFileSync(new URL("../src/services/privateDocument.ts",import.meta.url),"utf8").replace(/^import .*;\r?\n/gm,"").replace(/export /g,"");
function fixture() {
 let revision=0,download:any={status:200},session:any={token:"SYNTHETIC-A"},available=true,missing=false;
 const calls:any[]=[],shared:any[]=[],removed:any[]=[];
 const ctx=vm.createContext({URL,readSession:async()=>session,getSessionRevision:()=>revision,assertSessionRevision:(value:number)=>{if(value!==revision)throw new Error("Session changed")},config:{apiUrl:"http://10.0.2.2:3000"},
  newTraceId:()=>"12345678-1234-4123-8123-123456789abc",TRACE_HEADER:"x-tms-trace-id",
  require:(name:string)=>{
   if(missing)throw new Error("native missing");
   if(name==="expo-file-system/legacy")return {cacheDirectory:"file:///cache/",downloadAsync:async(...args:any[])=>{calls.push(args);return typeof download==="function"?await download():download},deleteAsync:async(...args:any[])=>removed.push(args)};
   if(name==="expo-sharing")return {isAvailableAsync:async()=>available,shareAsync:async(...args:any[])=>shared.push(args)};
   throw new Error("unexpected module "+name);
  }});
 vm.runInContext(stripTypeScriptTypes(source),ctx);
 return {ctx,calls,shared,removed,session:(s:any)=>{session=s;revision++},download:(d:any)=>{download=d},available:(v:boolean)=>{available=v},missing:()=>{missing=true}};
}
const reference="/api/files/documents/A/f.pdf?local=1";
{
 const f=fixture();await f.ctx.openPrivateDocument(reference);assert.equal(f.calls.length,1);
 assert.equal(f.calls[0][0],"http://10.0.2.2:3000"+reference);
 assert.equal(f.calls[0][2].headers.Authorization,"Bearer SYNTHETIC-A");assert.equal(f.shared.length,1);assert.equal(f.shared[0][1].mimeType,"application/pdf");assert.equal(f.removed.length,0);
}
for(const ref of ["https://external.example/a.pdf?local=1","/uploads/documents/A/f.pdf","/api/files/documents/A/f.pdf","/api/auth/mobile-login?local=1","http://u:p@10.0.2.2:3000"+reference]){
 const f=fixture();await assert.rejects(f.ctx.openPrivateDocument(ref));assert.equal(f.calls.length,0);assert.equal(f.shared.length,0);
}
for(const status of [401,403,404,409,500,206]){
 const f=fixture();f.download({status});await assert.rejects(f.ctx.openPrivateDocument(reference));assert.equal(f.shared.length,0);assert.equal(f.removed.length,1);
}
{
 const f=fixture();f.download(async()=>{throw new Error("Network error SECRET_URL")});await assert.rejects(f.ctx.openPrivateDocument(reference),/Nema veze sa serverom/);assert.equal(f.shared.length,0);assert.equal(f.removed.length,1);
}
{
 const f=fixture();f.download(async()=>{f.session({token:"SYNTHETIC-B"});return {status:200}});await assert.rejects(f.ctx.openPrivateDocument(reference),/Session changed/);
 assert.equal(f.calls[0][2].headers.Authorization,"Bearer SYNTHETIC-A");assert.equal(f.shared.length,0);assert.equal(f.removed.length,1);
}
{
 const f=fixture();f.session(null);await assert.rejects(f.ctx.openPrivateDocument(reference),/Prijavite/);assert.equal(f.calls.length,0);
}
{
 const f=fixture();f.available(false);await assert.rejects(f.ctx.openPrivateDocument(reference),/dostupno/);assert.equal(f.shared.length,0);assert.equal(f.removed.length,1);
}
{
 const f=fixture();f.missing();await assert.rejects(f.ctx.openPrivateDocument(reference),/development build/);assert.equal(f.calls.length,0);
}
console.log("Private documents: same-origin local endpoint only, pinned bearer, denial/network cleanup, no stale-owner sharing and native failure checks passed");
{
 const f=fixture();f.session({token:"B"});await assert.rejects(f.ctx.openPrivateDocument(reference,0),/Session changed/);assert.equal(f.calls.length,0);
}
{
 const wrapper=fs.readFileSync(new URL("../src/services/openDocument.ts",import.meta.url),"utf8").replace(/^import .*;\r?\n/gm,"").replace(/export /g,"");
 let revision=0,opened=0;
 const ctx=vm.createContext({getSessionRevision:()=>revision,assertSessionRevision:(r:number)=>{if(r!==revision)throw new Error("Session changed")},config:{apiUrl:"https://fixture.invalid"},
  api:{get:async()=>{revision++;return {data:{url:reference,local:true}}}},
  openDocumentReference:async(_ref:string,deps:any)=>{await deps.get("/api/files/documents/A/f.pdf?resolve=1");await deps.openPrivate(reference)},
  openPrivateDocument:async()=>{opened++},Linking:{openURL:async()=>{opened++}},sharePdfFromHtml:async()=>{opened++}});
 vm.runInContext(stripTypeScriptTypes(wrapper),ctx);
 await assert.rejects(ctx.openDocument(reference),/Session changed/);assert.equal(opened,0);
}
console.log("Document wrapper: original session revision survives resolve/native boundaries");
