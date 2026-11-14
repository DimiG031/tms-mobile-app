import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {stripTypeScriptTypes} from 'node:module';
const file=fs.readFileSync(new URL('../src/services/notifications.ts',import.meta.url),'utf8');
const source=file.slice(file.indexOf('export async function registerPushTokenForUser'),file.indexOf('export function addPushTokenListener')).replace(/export /g,'');
const ownerSource=fs.readFileSync(new URL('../src/lib/offline-owner.ts',import.meta.url),'utf8').replace(/export /g,'');
let session:any={user:{id:'A',companyId:'C',driverId:'D'}},releaseToken!:(v:any)=>void,started!:()=>void;
const tokenStarted=new Promise<void>(r=>started=r),posts:any[]=[],direct:any[]=[];
let releaseDelete!:(v:any)=>void;
const ctx=vm.createContext({readSession:async()=>session,config:{apiUrl:'https://fixture.invalid'},Device:{isDevice:true},Platform:{OS:'android'},Constants:{},getNotificationsModule:()=>({getPermissionsAsync:async()=>({status:'granted'}),getExpoPushTokenAsync:()=>{started();return new Promise(r=>releaseToken=r)}}),
 api:{postForOwner:async(path:string,body:any,owner:string)=>{if(owner!==ctx.offlineOwner(session,'https://fixture.invalid'))throw new Error('SESSION_CHANGED');posts.push({path,body,owner})},delete:async()=>{throw new Error('must use pinned token')}},diagnosticMobileFetch:async(path:string,options:any)=>{direct.push({path,options});return new Promise(r=>releaseDelete=r)}});
vm.runInContext(stripTypeScriptTypes(ownerSource+'\nlet cachedPushToken: string|null=null;\n'+source),ctx);
const oldRegistration=ctx.registerPushTokenForUser('A');await tokenStarted;session={user:{id:'B',companyId:'C',driverId:'E'}};releaseToken({data:'device-token'});await assert.rejects(oldRegistration,/SESSION_CHANGED/);assert.equal(posts.length,0);
await ctx.syncPushTokenForUser('A','old-device');assert.equal(posts.length,0);
const cleanup=ctx.unregisterPushTokenForUser('A','A-bearer');assert.equal(direct[0].path,'/api/users/A/push-token');assert.equal(direct[0].options.headers.Authorization,'Bearer A-bearer');
await ctx.syncPushTokenForUser('B','B-device');releaseDelete({ok:true});await cleanup;assert.equal(vm.runInContext('cachedPushToken',ctx),'B-device');assert.equal(posts[0].path,'/api/users/B/push-token');
console.log('Push ownership: late native registration cannot bind old user with new credentials; logout cleanup pins original token passed');
