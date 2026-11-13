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
const exports=new Function("diagnosticMobileFetch","toAbsoluteUrl","readSession","fetch","FormData",stripTypeScriptTypes(source)+";return {uploadFromFileUri};")(diagnostics,(s:string)=>"http://api.example"+s,async()=>({token:"TEST_ONLY"}),async(path:string,options:any)=>{fetchCalls.push({path,options});return {ok:true,blob:async()=>({})}},Form);
await exports.uploadFromFileUri({uri:"file:///fixture.pdf",filename:"f.pdf",mimeType:"application/pdf"});
assert.deepEqual(diagnosticCalls.map(c=>c.path),["/api/upload/presign","/api/upload/local"]);assert.equal(fetchCalls.length,0);assert.equal(diagnosticCalls[1].options.headers.Authorization,"Bearer TEST_ONLY");
local=false;diagnosticCalls=[];fetchCalls=[];
await exports.uploadFromFileUri({uri:"file:///fixture.pdf",filename:"f.pdf",mimeType:"application/pdf"});
assert.equal(fetchCalls[1].path,"https://signed.example/put");assert.equal(fetchCalls[1].options.headers.Authorization,undefined);
console.log("Upload target: local API origin pinned; Bearer stays off external PUT URL.");
