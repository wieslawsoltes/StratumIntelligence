import {clone,uid,now,hash,assert} from './utils.js';
export function validateWorkspace(s){
 assert(s&&s.schemaVersion===1,'Unsupported workspace format');
 const idOK=id=>typeof id==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$/.test(id);
 for(const key of ['diagrams','objects','datasets','links','pipelines','audit','approvals','objectTypes','documents','agents','threads','runs','evaluations','evaluationRuns','automations','dashboard'])assert(Array.isArray(s[key]),`Missing ${key}`);
 assert(typeof s.name==='string'&&s.settings&&['editor','viewer'].includes(s.settings.role),'Invalid workspace settings');
 assert(['light','dark'].includes(s.theme),'Invalid theme');
 assert(s.diagrams.length>0,'At least one diagram is required');
 for(const key of ['diagrams','objects','datasets','links','pipelines','documents','agents','threads','automations','dashboard']){
  const ids=new Set();for(const item of s[key]){assert(item&&idOK(item.id)&&!ids.has(item.id),`Invalid or duplicate ${key} ID`);ids.add(item.id);}
 }
 for(const d of s.diagrams){
  assert(Array.isArray(d.nodes)&&Array.isArray(d.edges)&&Array.isArray(d.revisions),'Invalid diagram');
  assert(typeof d.name==='string'&&typeof d.number==='string'&&typeof d.revision==='string','Invalid diagram metadata');
  assert([d.width,d.height].every(v=>Number.isFinite(v)&&v>0&&v<=16000),'Drawing dimensions must be 1–16,000');
  assert(d.nodes.length<=200000&&d.edges.length<=400000,'Diagram import limit exceeded');
  const ids=new Set();for(const n of d.nodes){assert(n&&idOK(n.id)&&!ids.has(n.id),'Duplicate or invalid component ID');ids.add(n.id);assert(Number.isFinite(n.x)&&Number.isFinite(n.y),'Invalid component coordinates');assert(typeof n.tag==='string'&&typeof n.type==='string','Invalid component fields');}
  const edgeIds=new Set();for(const e of d.edges){assert(e&&idOK(e.id)&&!edgeIds.has(e.id),'Invalid or duplicate connection ID');edgeIds.add(e.id);assert(idOK(e.from)&&idOK(e.to),'Invalid connection endpoint');assert(Array.isArray(e.points)&&e.points.length<=10000&&e.points.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)),'Invalid connection waypoints');}
  if(d.background)assert(typeof d.background.data==='string'&&/^data:image\/(png|jpeg|webp|svg\+xml);base64,/.test(d.background.data),'Source images must be embedded image data');
 }
 for(const d of s.datasets){assert(Array.isArray(d.rows),'Invalid dataset');assert(d.rows.every(r=>r&&typeof r==='object'&&!Array.isArray(r)),'Dataset rows must be objects');}
 for(const p of s.pipelines){assert(Array.isArray(p.nodes)&&Array.isArray(p.runs),'Invalid pipeline');const ids=new Set();for(const n of p.nodes){assert(idOK(n.id)&&!ids.has(n.id),'Invalid pipeline block ID');ids.add(n.id);assert(Array.isArray(n.inputs)&&n.inputs.every(idOK),'Invalid pipeline inputs');}}
 assert(s.agents.length>0,'At least one assistant is required');
 return s;
}
export class Store extends EventTarget {
 constructor(seed,{persistent=true}={}){super();this.state=clone(seed);this.undoStack=[];this.redoStack=[];this.db=null;this.persistent=persistent;this.revision=0;this.savedRevision=-1;this.saveError=null;}
 async open(){if(!this.persistent||!globalThis.indexedDB)return this;try{this.db=await new Promise((resolve,reject)=>{const r=indexedDB.open('stratum-intelligence',1);r.onupgradeneeded=()=>r.result.createObjectStore('workspaces');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});const result=await new Promise((resolve,reject)=>{const r=this.db.transaction('workspaces').objectStore('workspaces').get('current');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});if(result){validateWorkspace(result);this.state={...this.state,...result};this.savedRevision=this.revision;}else await this.save();}catch(e){this.saveError=e.message;console.warn('Persistence unavailable',e);}return this;}
 get diagram(){return this.state.diagrams.find(d=>d.id===this.state.activeDiagram)||this.state.diagrams[0];}
 checkEdit(){assert(this.state.settings.role!=='viewer','Viewer mode is read-only. Change the local role in settings.');}
 transact(label,fn,{history=true,edit=true,entity='Workspace'}={}){if(edit)this.checkEdit();const before=clone(this.state);try{fn(this.state);validateWorkspace(this.state);this.state.updated=now();if(history){this.undoStack.push({label,state:before});if(this.undoStack.length>40)this.undoStack.shift();this.redoStack=[];}this.appendAudit(label,entity);this.changed(label);}catch(e){this.state=before;throw e;}}
 appendAudit(action,entity,details=''){const a=this.state.audit;const previous=a.at(-1)?.hash||'00000000';const entry={id:uid('audit'),time:now(),action,entity,details,previous};entry.hash=hash(JSON.stringify(entry));a.push(entry);if(a.length>2500)a.shift();}
 changed(label){this.revision++;this.dispatchEvent(new CustomEvent('change',{detail:{label,revision:this.revision}}));clearTimeout(this.timer);this.timer=setTimeout(()=>this.save(),250);}
 undo(){this.checkEdit();const item=this.undoStack.pop();if(!item)return false;this.redoStack.push({label:item.label,state:clone(this.state)});const audit=this.state.audit;this.state=item.state;this.state.audit=audit;this.appendAudit('Undo: '+item.label,'Workspace');this.changed('Undo');return true;}
 redo(){this.checkEdit();const item=this.redoStack.pop();if(!item)return false;this.undoStack.push({label:item.label,state:clone(this.state)});const audit=this.state.audit;this.state=item.state;this.state.audit=audit;this.appendAudit('Redo: '+item.label,'Workspace');this.changed('Redo');return true;}
 async save(){if(!this.db)return false;const rev=this.revision;const data=clone(this.state);try{await new Promise((resolve,reject)=>{const tx=this.db.transaction('workspaces','readwrite');tx.objectStore('workspaces').put(data,'current');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});this.savedRevision=rev;this.saveError=null;this.dispatchEvent(new Event('saved'));return true;}catch(e){this.saveError=e.message;this.dispatchEvent(new Event('saved'));return false;}}
 replace(s){validateWorkspace(s);this.transact('Import workspace',()=>{this.state=clone(s);});}
}
