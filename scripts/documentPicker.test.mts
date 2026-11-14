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
 const ctx=vm.createContext({getSessionRevision:()=>0,assertSessionRevision:()=>{},SessionChangedError:class extends Error {},
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

const imageStart=source.indexOf('async function uploadPickedAsset(');
const imageEnd=source.indexOf('  async function onCapturePhoto()',imageStart);
const imageState:any={url:'previous-file',loading:false};const imageAlerts:any[]=[];
const imageContext=vm.createContext({getSessionRevision:()=>0,assertSessionRevision:()=>{},SessionChangedError:class extends Error {},fileName:'old.jpg',tourId:'t',setIsUploading:(v:any)=>imageState.loading=v,setFileUrl:(v:any)=>imageState.url=v,setFileName:()=>{},setFileType:()=>{},uploadFromFileUri:async()=>{throw new Error('network down')},Alert:{alert:(...args:any[])=>imageAlerts.push(args)}});
vm.runInContext(stripTypeScriptTypes(source.slice(imageStart,imageEnd)),imageContext);
await imageContext.uploadPickedAsset({uri:'file:///new.jpg',mimeType:'image/jpeg'});
assert.equal(imageState.url,'');assert.equal(imageState.loading,false);assert.equal(imageAlerts.length,1);
console.log('Camera/gallery failed replacement clears the previous file URL');
{
 let revision=0,release!:(value:any)=>void;let uploadCalls=0;const Changed=class extends Error{};
 const ctx=vm.createContext({getSessionRevision:()=>revision,assertSessionRevision:(r:number)=>{if(r!==revision)throw new Changed()},SessionChangedError:Changed,DocumentPicker:{getDocumentAsync:()=>new Promise(r=>release=r)},uploadFromFileUri:async()=>{uploadCalls++},setIsUploading:()=>{},Alert:{alert:()=>{throw new Error('old picker must not alert new login')}}});
 vm.runInContext(handler,ctx);const picked=ctx.onPickFile();revision++;release({canceled:false,assets:[{name:'A.png',uri:'file:///A.png',mimeType:'image/png'}]});await picked;assert.equal(uploadCalls,0);
}
console.log('Native picker session boundary: previous dialog result is ignored after login change');
