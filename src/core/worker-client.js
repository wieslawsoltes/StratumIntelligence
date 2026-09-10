import {runPipeline,profile,executeQuery,parseCSV} from './data.js';
import {validateDiagram,reconcileBOM} from './analysis.js';

const operations={runPipeline,profile,executeQuery,parseCSV,validateDiagram,reconcileBOM};
/** Real worker execution, with an explicit in-thread fallback in restricted hosts. */
export class WorkerClient {
 constructor(){
  this.pending=new Map();this.next=0;this.mode='starting';this.destroyed=false;
  this.ready=new Promise(resolve=>{this.resolveReady=resolve;});
  try{
   // A single-file release embeds an already-bundled classic worker.
   this.worker=new Worker(globalThis.STRATUM_WORKER_URL || new URL('./worker.js',import.meta.url),{type:globalThis.STRATUM_WORKER_URL?'classic':'module'});
   this.worker.onmessage=({data})=>{
    if(data.ready){clearTimeout(this.startTimer);this.mode='worker';this.resolveReady();return;}
    const p=this.pending.get(data.id);if(!p)return;
    clearTimeout(p.timer);this.pending.delete(data.id);
    data.error?p.reject(new Error(data.error)):p.resolve(data.result);
   };
   this.worker.onerror=e=>{e.preventDefault?.();this.fallback(e.message||'Worker unavailable');};
   this.startTimer=setTimeout(()=>this.fallback('Worker startup was blocked or timed out'),1800);
  }catch(e){this.fallback(e.message);}
 }
 fallback(reason){
  if(this.mode==='main-thread')return;
  clearTimeout(this.startTimer);this.worker?.terminate();this.worker=null;
  this.mode='main-thread';this.reason=reason;this.resolveReady();
  for(const [id,p] of this.pending){clearTimeout(p.timer);this.pending.delete(id);this.direct(p.method,p.args).then(p.resolve,p.reject);}
 }
 async direct(method,args){
  // Yield one frame before expensive work so the busy indicator can paint.
  await new Promise(resolve=>setTimeout(resolve,0));
  if(this.destroyed)throw Error('Worker client was terminated');
  if(!Object.hasOwn(operations,method))throw Error('Unknown worker method');
  return operations[method](...args);
 }
 async call(method,...args){
  if(this.destroyed)throw Error('Worker client was terminated');
  if(!Object.hasOwn(operations,method))throw Error('Unknown worker method');
  await this.ready;
  if(this.mode!=='worker')return this.direct(method,args);
  return new Promise((resolve,reject)=>{
   const id=++this.next;
   const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('Worker task exceeded the 60-second limit'));},60000);
   this.pending.set(id,{resolve,reject,timer,method,args});
   try{this.worker.postMessage({id,method,args});}catch(e){clearTimeout(timer);this.pending.delete(id);reject(e);}
  });
 }
 destroy(){this.destroyed=true;clearTimeout(this.startTimer);this.worker?.terminate();this.resolveReady();for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(new Error('Worker client was terminated'));}this.pending.clear();}
}
