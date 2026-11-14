import assert from "node:assert/strict";
import { openDocumentReference, cmrPreviewHtml } from "../src/lib/documentOpen.ts";
let getCalls:string[]=[],openCalls:string[]=[],htmlCalls:string[]=[],privateCalls:string[]=[];
const deps={apiUrl:"http://10.0.2.2:3000",get:async(path:string):Promise<unknown>=>{getCalls.push(path);return path.includes("resolve=1")?{ok:true,data:{url:"https://signed.example/a.pdf"}}:{ok:true,data:{orderNumber:"TEST",notes:"<script>bad</script>"}}},openPrivate:async(path:string)=>{privateCalls.push(path)},openUrl:async(url:string)=>{openCalls.push(url)},shareHtml:async(html:string)=>{htmlCalls.push(html)}};
const reset=()=>{getCalls=[];openCalls=[];htmlCalls=[];privateCalls=[]};
async function main(){
 for(const ref of ["/dashboard/transport/freight-orders/order-1/cmr","http://10.0.2.2:3000/dashboard/transport/freight-orders/order-1/cmr"]){reset();await openDocumentReference(ref,deps);assert.deepEqual(getCalls,["/api/freight-orders/order-1/cmr"]);assert.equal(openCalls.length,0);assert.equal(htmlCalls.length,1);assert.ok(htmlCalls[0].includes("&lt;script&gt;"));}
 for(const ref of ["/api/files/documents/A/a.pdf","/uploads/documents/A/a.pdf"]){reset();await openDocumentReference(ref,deps);assert.deepEqual(getCalls,["/api/files/documents/A/a.pdf?resolve=1"]);assert.deepEqual(openCalls,["https://signed.example/a.pdf"])}
 reset();await openDocumentReference("https://external.example/a.pdf",deps);assert.equal(getCalls.length,0);assert.deepEqual(openCalls,["https://external.example/a.pdf"]);
 for(const ref of ["","javascript:alert(1)","file:///private/file.pdf","https://user:password@example.invalid/a","/dashboard/admin","/dashboard/transport/freight-orders/a%2fb/cmr"]){reset();await assert.rejects(()=>openDocumentReference(ref,deps));assert.equal(getCalls.length,0);assert.equal(openCalls.length,0)}
 for(const result of [{ok:false},null,{ok:true,data:{}},{ok:true,data:{url:"javascript:alert(1)"}}]){reset();await assert.rejects(()=>openDocumentReference("/api/files/documents/A/a.pdf",{...deps,get:async()=>result}));assert.equal(openCalls.length,0)}
 reset();await assert.rejects(()=>openDocumentReference("/dashboard/transport/freight-orders/o/cmr",{...deps,get:async()=>{throw new Error("403")}}));assert.equal(htmlCalls.length,0);
 reset();await assert.rejects(()=>openDocumentReference("https://external.example/a.pdf",{...deps,openUrl:async()=>{throw new Error("No viewer")}}));
 reset();await openDocumentReference("/api/files/documents/A/a.pdf", {...deps,get:async()=>({ok:true,data:{url:"/api/files/documents/A/a.pdf?local=1",local:true}})});
 assert.deepEqual(privateCalls,["/api/files/documents/A/a.pdf?local=1"]);assert.equal(openCalls.length,0);
 for(const target of ["/uploads/documents/A/a.pdf","/api/files/documents/A/a.pdf?local=1","/api/files/documents/B/other.pdf?local=1"]) {
  reset();await assert.rejects(openDocumentReference("/api/files/documents/A/a.pdf",{...deps,get:async()=>({ok:true,data:{url:target,local:target.includes("/B/")}})}));
  assert.equal(openCalls.length,0);assert.equal(privateCalls.length,0);
 }
 reset();await assert.rejects(openDocumentReference("/api/files/documents/A/a.pdf",{...deps,get:async()=>({ok:true,data:{url:"/api/files/documents/A/a.pdf?local=1",local:true}}),openPrivate:async()=>{throw new Error("403")}}));
 assert.equal(openCalls.length,0);
 const html=cmrPreviewHtml({notes:'<img src=x onerror="bad">',shipper:{name:"A&B"},freightPrice:"SECRET_PRICE"});assert.ok(!html.includes("<img"));assert.ok(html.includes("A&amp;B"));assert.ok(!html.includes("SECRET_PRICE"));
 console.log("documentOpen: input/error scenarios + escaped CMR/financial omission passed");
}
main().catch(error=>{console.error(error);process.exitCode=1});
