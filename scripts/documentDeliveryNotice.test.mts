import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
const layout=fs.readFileSync(new URL('../app/_layout.tsx',import.meta.url),'utf8');
const source=layout.slice(layout.indexOf('function OfflineDocumentDeliveryNotice()'),layout.indexOf('export default function RootLayout()'));
assert.ok(source.startsWith('function OfflineDocumentDeliveryNotice()'));
function fixture(signedIn=true){
 const alerts:any[]=[];let delivered:any,changed:any,cleanup:any;let unsubs=0,removed=0;
 const AppState={currentState:'active',addEventListener:(_name:string,fn:any)=>{changed=fn;return {remove:()=>{changed=null;removed++}}}};
 const ctx=vm.createContext({useAuth:()=>({session:signedIn?{user:{id:'u1',companyId:'c1'}}:null}),useEffect:(fn:any)=>{cleanup=fn()},AppState,Alert:{alert:(...args:any[])=>alerts.push(args)},subscribeOfflineWritesDelivered:(fn:any)=>{delivered=fn;return ()=>{delivered=null;unsubs++}}});
 vm.runInContext(stripTypeScriptTypes(source),ctx);ctx.OfflineDocumentDeliveryNotice();
 return {alerts,delivery:(paths:string[])=>delivered?.(paths),state:(value:string)=>{AppState.currentState=value;changed?.(value)},unmount:()=>cleanup?.(),counts:()=>({unsubs,removed})};
}
{
 const f=fixture();f.delivery(['/api/gps-logs']);assert.equal(f.alerts.length,0);
 f.delivery(['/api/documents']);assert.equal(f.alerts.length,1);assert.ok(f.alerts[0][1].includes('sačuvani na serveru'));
 f.state('active');f.state('active');assert.equal(f.alerts.length,1);
 f.unmount();f.delivery(['/api/documents']);assert.equal(f.alerts.length,1);assert.deepEqual(f.counts(),{unsubs:1,removed:1});
}
{
 const f=fixture();f.state('background');f.delivery(['/api/documents']);f.delivery(['/api/documents']);assert.equal(f.alerts.length,0);
 f.state('active');assert.equal(f.alerts.length,1);f.state('active');assert.equal(f.alerts.length,1);
}
{
 const f=fixture();f.state('background');f.delivery(['/api/documents']);f.unmount();f.state('active');assert.equal(f.alerts.length,0);
 const guest=fixture(false);guest.delivery(['/api/documents']);assert.equal(guest.alerts.length,0);
}
console.log('Delivery notice: acknowledged documents only, foreground/background, no resume replay and cleanup passed');
