import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
const hook=fs.readFileSync(new URL('../src/queries/useTourDocuments.ts',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
const screen=fs.readFileSync(new URL('../app/(driver)/tours/[id]/documents.tsx',import.meta.url),'utf8');
const handler=screen.slice(screen.indexOf('  function onCreateDocument()'),screen.indexOf('  async function onOpenDocument'));
for(const delivery of ['saved','pending','blocked']) {
 const queued=delivery!=='saved';
 const invalidations:any[]=[],alerts:any[]=[];let mutation:any;
 const qc={invalidateQueries:async({queryKey}:any)=>{invalidations.push(Array.from(queryKey))}};
 const ctx=vm.createContext({
 useQueryClient:()=>qc,useMutation:(options:any)=>{mutation=options;return options},useQuery:()=>{},useEffect:(fn:any)=>fn(),
 api:{postQueued:async()=>({queued,data:null,delivery,message:"Nemate dozvolu."})},
 getSessionRevision:()=>0,saveInFlight:{current:false},retryInFlight:{current:false},isUploading:false,SessionChangedError:class extends Error {},
 fileName:'test.pdf',fileUrl:'/api/files/documents/test.pdf',fileType:'PDF',
 setFileName:()=>{},setFileUrl:()=>{},setFileType:()=>{},Alert:{alert:(...args:any[])=>alerts.push(args)}
 });
 vm.runInContext(stripTypeScriptTypes(hook+'\n'+handler),ctx);
 ctx.useTourDocuments('tour-1');ctx.useCreateTourDocument('tour-1');
 const result=await mutation.mutationFn({fileName:'test.pdf',fileUrl:'/api/files/documents/test.pdf',fileType:'PDF'});
 assert.equal(result.queued,queued);await mutation.onSuccess(result);
 if(queued)assert.equal(invalidations.length,0);else assert.ok(invalidations.some(k=>k[0]==='documents'));
 ctx.createDocument={mutate:(_:any,options:any)=>options.onSuccess(result)};ctx.onCreateDocument();
 assert.ok(alerts[0][1].includes(delivery==='blocked'?'nije prihvaćen':queued?'čeka slanje':'na serveru'));

}
console.log('Document queue: queued/server UI outcomes and online cache invalidation passed');
{
 const alerts:any[]=[],resets:any[]=[],invalidation:any[]=[];let options:any,mutations=0,revision=0;
 const ctx=vm.createContext({tourId:'T',fileName:'fixture.pdf',fileUrl:'/api/files/documents/C/f.pdf',fileType:'PDF',
   saveInFlight:{current:false},retryInFlight:{current:false},isUploading:false,getSessionRevision:()=>revision,SessionChangedError:class extends Error {},
   setFileName:(v:any)=>resets.push(v),setFileUrl:(v:any)=>resets.push(v),setFileType:(v:any)=>resets.push(v),
   Alert:{alert:(...args:any[])=>alerts.push(args)},createDocument:{mutate:(_:any,o:any)=>{mutations++;options=o}},
   queryClient:{invalidateQueries:async({queryKey}:any)=>invalidation.push(queryKey)},setRetryingId:()=>{},
   api:{retryDocument:async()=>({queued:false,data:{}})},assertSessionRevision:(r:number)=>{assert.equal(r,revision)}
 });
 vm.runInContext(stripTypeScriptTypes(handler),ctx);
 ctx.onCreateDocument();ctx.onCreateDocument();assert.equal(mutations,1);
 revision=1;options.onSuccess({queued:false});assert.equal(alerts.length,0);assert.equal(resets.length,0);options.onSettled();
 ctx.onCreateDocument();options.onError(new Error('Zahtev nije sačuvan na uređaju i nije poslat serveru. Pokušajte ponovo.'));assert.equal(resets.length,0);assert.equal(alerts.length,1);options.onSettled();
 await ctx.onRetryDocument('pending-id');assert.ok(alerts.at(-1)[1].includes('na serveru'),JSON.stringify(alerts));assert.equal(invalidation.length,4);
}
console.log('Document save UI: synchronous double-tap guard, stale-session silence, retained input on local failure and manual retry invalidation passed');
{
 let revision=0,callback:any,cleanup:any;const values:any[]=[];let resolve!:(items:any[])=>void;
 const source=hook.slice(hook.indexOf('type PendingTourDocument'));
 const ctx=vm.createContext({useAuth:()=>({sessionRevision:0}),useState:()=>[[],(items:any)=>values.push(Array.from(items))],useEffect:(fn:any)=>{cleanup=fn()},
   getSessionRevision:()=>revision,isTraceId:(value:any)=>value==='valid-key',getOfflineWriteQueue:()=>new Promise<any[]>(r=>{resolve=r}),
   subscribeOfflineQueueCount:(fn:any)=>{callback=fn;return ()=>{callback=null}}});
 vm.runInContext(stripTypeScriptTypes(source),ctx);ctx.usePendingTourDocuments('T');
 resolve([{id:'yes',path:'/api/documents',method:'POST',body:{tourId:'T',fileName:'fixture.pdf'},operationKey:'valid-key',blocked:true,failureMessage:'Nemate dozvolu.'},
 {id:'conflict',path:'/api/documents',method:'POST',body:{tourId:'T'},operationKey:'valid-key',blocked:true,failureStatus:409},
 {id:'legacy',path:'/api/documents',method:'POST',body:{tourId:'T'},blocked:true},
 {id:'no',path:'/api/documents',method:'POST',body:{tourId:'other'}},{id:'gps',path:'/api/gps-logs',method:'POST',body:{tourId:'T'}}]);
 await Promise.resolve();await Promise.resolve();assert.equal(values.at(-1).length,3);assert.equal(values.at(-1)[0].canRetry,true);assert.equal(values.at(-1)[1].canRetry,false);assert.equal(values.at(-1)[2].canRetry,false);
 callback();revision=1;resolve([{id:'old-A',path:'/api/documents',method:'POST',body:{tourId:'T'}}]);await Promise.resolve();await Promise.resolve();assert.equal(values.length,1);cleanup();
}
console.log('Document outbox UI: current tour only, blocked reason and retry availability, stale-owner read ignored');
