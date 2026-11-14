import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
const source=fs.readFileSync(new URL('../src/lib/pdf.ts',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
async function run(modules:Record<string,unknown>,expected?:RegExp) {
 let printed=0,shared=0;
 const defaults={ 'expo-print':{printToFileAsync:async()=>{printed++;return {uri:'file:///test.pdf'}}}, 'expo-sharing':{isAvailableAsync:async()=>true,shareAsync:async()=>{shared++}} };
 const context=vm.createContext({require:(name:string)=>{const result=({...defaults,...modules})[name];if(result instanceof Error)throw result;return result},formatMoney:()=>''});
 vm.runInContext(stripTypeScriptTypes(source),context);
 const task=context.sharePdfFromHtml('<p>test</p>','CMR');
 if(expected) {await assert.rejects(task,expected);assert.equal(shared,0)}
 else {await task;assert.equal(printed,1);assert.equal(shared,1)}
}
await run({});
await run({'expo-print':new Error('missing native')},/PDF moduli nisu učitani/);
await run({'expo-print':{}},/nisu ispravni/);
await run({'expo-sharing':{isAvailableAsync:async()=>false,shareAsync:async()=>{}}},/Deljenje PDF/);
await run({'expo-print':{printToFileAsync:async()=>{throw new Error('print failed')}}},/print failed/);
console.log('PDF modules: lazy load, missing module, malformed exports, unavailable sharing and print failure passed');
{
 let current=true,shared=0;
 const context=vm.createContext({require:(name:string)=>name==="expo-print"?{printToFileAsync:async()=>{current=false;return {uri:"file:///old-A.pdf"}}}:{isAvailableAsync:async()=>true,shareAsync:async()=>{shared++}},formatMoney:()=>""});
 vm.runInContext(stripTypeScriptTypes(source),context);
 await assert.rejects(context.sharePdfFromHtml("<p>fixture</p>","CMR",()=>{if(!current)throw new Error("Session changed")}),/Session changed/);assert.equal(shared,0);
}
console.log("PDF modules: a document session change during PDF generation prevents sharing");
