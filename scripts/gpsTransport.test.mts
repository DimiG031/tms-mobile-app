import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync(new URL('../src/lib/gpsTransport.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
for(const dev of [false,true]) for(const flag of [undefined,'0','1']) {
 const exports:any={};let loads=0;
 const standard=()=>{},expo=()=>{};
 vm.runInNewContext(code,{exports,__DEV__:dev,process:{env:{EXPO_PUBLIC_GPS_EXPO_FETCH:flag}},fetch:standard,require:(name:string)=>{assert.equal(name,'expo/fetch');loads++;return {fetch:expo};}});
 for(const [path,method] of [['/api/gps-logs','POST'],['/api/gps-logs','GET'],['/api/gps-logs?x=1','POST'],['/api/expenses','POST'],['/api/auth/mobile-refresh','POST']]) {
  const selected=dev&&flag==='1'&&path==='/api/gps-logs'&&method==='POST';
  assert.equal(exports.fetchForRequest(path,method),selected?expo:standard);
 }
 assert.equal(loads,dev&&flag==='1'?1:0);
}
console.log('GPS transport: explicit development switch, exact POST route, release and other routes pass');
