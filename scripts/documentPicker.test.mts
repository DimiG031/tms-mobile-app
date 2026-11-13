import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
const source=fs.readFileSync(new URL('../app/(driver)/tours/[id]/documents.tsx',import.meta.url),'utf8');
const start=source.indexOf('async function onPickFile()');
const end=source.indexOf('  function onCreateDocument()',start);
assert.ok(start>=0&&end>start);
const handler=stripTypeScriptTypes(source.slice(start,end));
async function run(asset:any, canceled=false, fail=false) {
 const calls:any[]=[],alerts:any[]=[],state:any={};let pickerOptions:any;
 const ctx=vm.createContext({
 DocumentPicker:{getDocumentAsync:async(options:any)=>{pickerOptions=options;return {canceled,assets:asset?[asset]:[]}}},
 uploadFromFileUri:async(input:any)=>{calls.push(input);if(fail)throw new Error('Upload failed');return {fileUrl:'/api/files/documents/test/image'}},
 tourId:'own-tour',setIsUploading:(v:any)=>state.loading=v,setFileUrl:(v:any)=>state.url=v,setFileName:(v:any)=>state.name=v,setFileType:(v:any)=>state.type=v,
 Alert:{alert:(...args:any[])=>alerts.push(args)}
 });
 vm.runInContext(handler,ctx);await ctx.onPickFile();return {calls,alerts,state,pickerOptions};
}
for(const [name,mimeType,type] of [['test.pdf','application/pdf','PDF'],['photo.jpeg','image/jpeg','JPG'],['photo.png','image/png','PNG'],['PHOTO.JPG',undefined,'JPG'],['test.PNG','application/octet-stream','PNG']] as const){
 const r=await run({name,mimeType,uri:'file:///cache/test'});assert.equal(r.calls.length,1);assert.equal(r.calls[0].tourId,'own-tour');assert.equal(r.calls[0].folder,'documents');assert.equal(r.state.type,type);assert.equal(r.state.loading,false);assert.equal(r.alerts.length,0);
 assert.deepEqual(Array.from(r.pickerOptions.type),['application/pdf','image/jpeg','image/png']);
}
for(const mimeType of ['image/gif','text/html']) {const r=await run({name:'fake.jpg',mimeType,uri:'file:///fake'});assert.equal(r.calls.length,0);assert.equal(r.alerts.length,1);}
const cancel=await run(null,true);assert.equal(cancel.calls.length,0);assert.equal(cancel.alerts.length,0);assert.deepEqual(cancel.state,{});
const failed=await run({name:'test.png',mimeType:'image/png',uri:'file:///test'},false,true);assert.equal(failed.state.url,'');assert.equal(failed.state.loading,false);assert.equal(failed.alerts.length,1);
console.log('Document picker: PDF/JPEG/PNG, missing MIME fallback, cancel, unsupported MIME and failed upload passed');
