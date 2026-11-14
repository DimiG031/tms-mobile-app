import assert from "node:assert/strict";
import { documentReadState } from "../src/lib/documentReadState.ts";
const cached=[{id:"previously-authorized-document"}];
for(const status of [401,403,404]){
 const state=documentReadState(cached,{status});assert.equal(state.accessDenied,true);assert.deepEqual(state.items,[]);
 assert.equal(cached.length,1); // UI masking does not silently mutate persisted query data.
}
assert.match(documentReadState(cached,{status:403}).message,/Nemate dozvolu/);
assert.match(documentReadState(cached,{status:401}).message,/Sesija je istekla/);
assert.equal(documentReadState(cached,{status:0,isNetwork:true}).items,cached);
assert.equal(documentReadState(cached,undefined).items,cached);
assert.deepEqual(documentReadState(undefined,undefined).items,[]);
console.log("Document read UI: confirmed access rejection hides cached metadata; offline cache remains distinct from permission denial");
