import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
const hook=fs.readFileSync(new URL('../src/queries/useTourDocuments.ts',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
const screen=fs.readFileSync(new URL('../app/(driver)/tours/[id]/documents.tsx',import.meta.url),'utf8');
const handler=screen.slice(screen.indexOf('  function onCreateDocument()'),screen.indexOf('  async function onOpenDocument'));
for(const queued of [false,true]) {
 const invalidations:any[]=[],alerts:any[]=[];let mutation:any;
 const qc={invalidateQueries:async({queryKey}:any)=>{invalidations.push(Array.from(queryKey))}};
 const ctx=vm.createContext({
 useQueryClient:()=>qc,useMutation:(options:any)=>{mutation=options;return options},useQuery:()=>{},useEffect:(fn:any)=>fn(),
 api:{postQueued:async()=>({queued,data:null})},
 fileName:'test.pdf',fileUrl:'/api/files/documents/test.pdf',fileType:'PDF',
 setFileName:()=>{},setFileUrl:()=>{},setFileType:()=>{},Alert:{alert:(...args:any[])=>alerts.push(args)}
 });
 vm.runInContext(stripTypeScriptTypes(hook+'\n'+handler),ctx);
 ctx.useTourDocuments('tour-1');ctx.useCreateTourDocument('tour-1');
 const result=await mutation.mutationFn({fileName:'test.pdf',fileUrl:'/api/files/documents/test.pdf',fileType:'PDF'});
 assert.equal(result.queued,queued);await mutation.onSuccess(result);
 if(queued)assert.equal(invalidations.length,0);else assert.ok(invalidations.some(k=>k[0]==='documents'));
 ctx.createDocument={mutate:(_:any,options:any)=>options.onSuccess(result)};ctx.onCreateDocument();
 assert.ok(alerts[0][1].includes(queued?'čeka slanje':'na serveru'));

}
console.log('Document queue: queued/server UI outcomes and online cache invalidation passed');
