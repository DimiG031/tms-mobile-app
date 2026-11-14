import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {stripTypeScriptTypes} from "node:module";
import {fileURLToPath} from "node:url";
const source=readFileSync(fileURLToPath(new URL("../src/services/upload.ts",import.meta.url)),"utf8").replace(/^import .*;\r?\n/gm,"").replaceAll("export async function","async function");
let diagnosticCalls:{path:string;options:any}[]=[],fetchCalls:{path:string;options:any}[]=[];
let local=true;
const response=(data:unknown)=>({ok:true,json:async()=>({ok:true,data})});
const diagnostics=async(path:string,options:any)=>{diagnosticCalls.push({path,options});return path.includes("presign")?response({uploadUrl:local?"https://untrusted.example/upload":"https://signed.example/put",fileUrl:"/api/files/documents/A/a.pdf",key:"documents/A/a.pdf",useLocal:local}):response({fileUrl:"/api/files/documents/A/a.pdf",key:"documents/A/a.pdf"})};
class Form {data:any[]=[];append(...args:any[]){this.data.push(args)}}
const exports=new Function("diagnosticMobileFetch","toAbsoluteUrl","readSession","fetch","FormData",stripTypeScriptTypes(source)+";return {uploadFromFileUri,uploadErrorMessage};")(diagnostics,(s:string)=>"http://api.example"+s,async()=>({token:"TEST_ONLY"}),async(path:string,options:any)=>{fetchCalls.push({path,options});return {ok:true,blob:async()=>({})}},Form);
await exports.uploadFromFileUri({uri:"file:///fixture.pdf",filename:"f.pdf",mimeType:"application/pdf",tourId:"t"});
assert.deepEqual(diagnosticCalls.map(c=>c.path),["/api/upload/presign","/api/upload/local"]);assert.equal(fetchCalls.length,0);assert.equal(diagnosticCalls[1].options.headers.Authorization,"Bearer TEST_ONLY");
local=false;diagnosticCalls=[];fetchCalls=[];
await exports.uploadFromFileUri({uri:"file:///fixture.pdf",filename:"f.pdf",mimeType:"application/pdf",tourId:"t"});
assert.equal(fetchCalls[1].path,"https://signed.example/put");assert.equal(fetchCalls[1].options.headers.Authorization,undefined);
console.log("Upload target: local API origin pinned; Bearer stays off external PUT URL.");

assert.equal(JSON.parse(diagnosticCalls[0].options.body).tourId,"t");
local=true;diagnosticCalls=[];fetchCalls=[];
await exports.uploadFromFileUri({uri:"file:///fixture.pdf",filename:"f.pdf",mimeType:"application/pdf",tourId:"t"});
assert.ok(diagnosticCalls[1].options.body.data.some((entry:any[])=>entry[0]==="tourId"&&entry[1]==="t"));
for(const [body,status,expected] of [
 ['{"ok":false,"error":"Tura nije dostupna."}',404,'Tura nije dostupna.'],
 ['{"ok":false,"error":"Forbidden"}',403,'Nemate dozvolu za dodavanje ovog dokumenta.'],
 ['<html>storage error</html>',500,'Otpremanje nije uspelo.'],
 ['{"ok":false,"error":{"nested":"bad"}}',500,'Otpremanje nije uspelo.'],
 ['invalid',401,'Sesija je istekla. Prijavite se ponovo.'],
 ['{}',413,'Fajl je prevelik.'],
 ['[]',415,'Tip fajla nije dozvoljen.'],
] as const)assert.equal(await exports.uploadErrorMessage({status,text:async()=>body},"Otpremanje nije uspelo."),expected);
assert.equal(await exports.uploadErrorMessage({status:500,text:async()=>{throw new Error("read failure")}},"Otpremanje nije uspelo."),"Otpremanje nije uspelo.");
console.log("Tour ID reaches presign/local; JSON/HTML/auth upload errors render readable messages.");

for (const stage of ['presign','local','put','read'] as const) {
 const diagnostic=async(path:string)=>{
  if((stage==='presign'&&path.includes('presign'))||(stage==='local'&&path.includes('local')))throw new TypeError('Network request failed: sensitive transport details');
  return response({useLocal:stage==='local',key:'documents/A/f.pdf',uploadUrl:'https://signed.example/put',fileUrl:'/api/files/documents/A/f.pdf'});
 };
 const transport=async(_path:string,options?:any)=>{
  if(stage==='read'&&!options)throw new TypeError('file disappeared');
  if(stage==='put'&&options?.method==='PUT')throw new TypeError('Failed to fetch signed URL');
  return {ok:true,blob:async()=>({})};
 };
 const helpers=new Function('diagnosticMobileFetch','toAbsoluteUrl','readSession','fetch','FormData',stripTypeScriptTypes(source)+';return {uploadFromFileUri};')(diagnostic,(s:string)=>s,async()=>({token:'TEST_ONLY'}),transport,Form);
 await assert.rejects(helpers.uploadFromFileUri({uri:'file:///f.pdf',filename:'f.pdf',mimeType:'application/pdf',tourId:'t'}), (error:Error)=>{
  assert.ok(error.message.includes(stage==='read'?'Izabrani fajl nije moguće pročitati':'Proveri vezu sa serverom'));
  assert.ok(!error.message.includes('sensitive'));assert.ok(!error.message.includes('signed.example'));return true;
 });
}
console.log('Upload network failures: presign/local/PUT translated; local file read error separate');
