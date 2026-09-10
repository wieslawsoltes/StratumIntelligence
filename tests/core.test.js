import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCSV,toCSV,inferValue,profile,compileExpression,executeQuery,aggregate,runPipeline} from '../src/core/data.js';
import {createSeed} from '../src/core/seed.js';
import {Store,validateWorkspace} from '../src/core/store.js';
import {traceNetwork,shortestPath,validateDiagram,reconcileBOM,diffDiagrams,extractTagsFromText,classifyTag,validateVisionResult,stagePublish,applyApproval} from '../src/core/analysis.js';
import {localAnswer,runEvaluations,retrieveDocuments,remoteAnswer,callModel} from '../src/core/agent.js';
import {buildDiagramScene,tessellate,connectionPoints} from '../src/render/primitives.js';
import {GPUService} from '../src/render/gpu.js';
import {exportSVG} from '../src/core/interchange.js';
import {safeURL,escapeHTML} from '../src/core/utils.js';
const seed=()=>createSeed();
const diagram=()=>seed().diagrams[0];

// CSV and expressions
for(const [input,expected] of [['0123','0123'],['1.5',1.5],['true',true],['',null],['9007199254740993','9007199254740993']])test(`CSV inference preserves ${JSON.stringify(input)}`,()=>assert.equal(inferValue(input),expected));
test('CSV quoted delimiters, embedded newlines, escaped quotes, BOM and CRLF',()=>assert.deepEqual(parseCSV('\ufefftag,description,note\r\nP-101,"Pump, duty","a""b\nline"'),[{tag:'P-101',description:'Pump, duty',note:'a"b\nline'}]));
test('CSV rejects malformed quotes, duplicate headers, wide records and prototype keys',()=>{for(const text of ['a\n"x','a,a\n1,2','a\n1,2','__proto__\nx'])assert.throws(()=>parseCSV(text));});
test('CSV formula escaping and round trip',()=>{assert.match(toCSV([{value:'=1+1'}]),/'=1\+1/);assert.deepEqual(parseCSV(toCSV([{a:1,b:'line\n"x"',c:false}])),[{a:1,b:'line\n"x"',c:false}]);});
test('Profile computes exact extrema beyond 50,000 rows',()=>{const rows=Array.from({length:50001},(_,i)=>({v:i}));const p=profile(rows)[0];assert.equal(p.max,50000);assert.equal(p.mean,25000);assert.equal(p.completeness,1);});
test('Profile nulls, distinct values and mixed types',()=>{const p=profile([{v:null},{v:2},{v:2},{v:'x'}])[0];assert.equal(p.type,'string');assert.equal(p.nulls,1);assert.equal(p.distinct,2);});
for(const [expression,row,value] of [
 ['2 + 3 * 4',{},14],['(2 + 3) * 4',{},20],["contains(tag, '101') and pressure >= 8",{tag:'P-101',pressure:8.2},true],
 ['not pressure = 8',{pressure:8},false],['not pressure = 8',{pressure:9},true],["tag like 'P-%'",{tag:'P-101'},true],
 ['pressure is null',{pressure:null},true],['pressure is not null',{pressure:0},true],['1 / 0',{},null],
 ['round(pressure, 2)',{pressure:8.234},8.23],['coalesce(a, b, 9)',{a:null,b:3},3],['missing',{},null]
])test(`Expression: ${expression}`,()=>assert.equal(compileExpression(expression)(row),value));
test('Expressions cannot execute code or access inherited properties',()=>{for(const e of ['constructor','alert(1)','x; alert(1)','globalThis.process.exit()','__proto__','x => x'])assert.throws(()=>compileExpression(e));assert.equal(compileExpression('toString')({}),null);});
test('Expressions reject deep nesting and trailing tokens',()=>{assert.throws(()=>compileExpression('('.repeat(150)+'1'+')'.repeat(150)));assert.throws(()=>compileExpression('1 2'));});
test('SQL filters, aliases, function arguments, order and limit',()=>{const rows=[{tag:'P-101',p:8.234},{tag:'P-102',p:9.718},{tag:'P-103',p:3}];assert.deepEqual(executeQuery("SELECT tag, round(p, 2) AS pressure FROM assets WHERE p > 8 ORDER BY pressure DESC LIMIT 1",{assets:rows}),[{tag:'P-102',pressure:9.72}]);});
test('SQL grouped aggregates and null behavior',()=>{const rows=[{kind:'A',v:2},{kind:'A',v:null},{kind:'A',v:4},{kind:'B',v:5}];assert.deepEqual(executeQuery('SELECT kind, count(*) AS n, avg(v) AS mean FROM x GROUP BY kind ORDER BY n DESC',{x:rows}),[{kind:'A',n:3,mean:3},{kind:'B',n:1,mean:5}]);assert.deepEqual(aggregate(rows,null,[{op:'count',column:'v',as:'n'}]),[{n:3}]);});
test('SQL rejects writes, unknown tables and unsupported clauses',()=>{for(const q of ['DELETE FROM x','SELECT * FROM absent','SELECT * FROM x JOIN y','SELECT * FROM x WHERE v > 0 WHERE v < 4'])assert.throws(()=>executeQuery(q,{x:[]}));});

// Data pipelines
const source=(id,ds)=>({id,type:'source',name:id,inputs:[],config:{dataset:ds}});
test('Sample DAG executes real transformations without mutating its input',()=>{const s=seed(),before=JSON.stringify(s.datasets);const result=runPipeline(s.pipelines[0],s.datasets);assert.equal(result.rows.length,19);assert.equal(result.trace.length,4);assert.equal(result.rows[0].priority,4);assert.equal(JSON.stringify(s.datasets),before);});
test('Pipeline detects cycles, missing inputs and unknown operations',()=>{for(const p of [{nodes:[{id:'x',type:'filter',inputs:['x']}]},{nodes:[{id:'x',type:'filter',inputs:['absent']}]},{nodes:[{id:'x',type:'execute-javascript'}]}])assert.throws(()=>runPipeline(p,[]));});
test('Pipeline left join, collision names and deduplication',()=>{const nodes=[source('a','l'),source('b','r'),{id:'j',type:'join',inputs:['a','b'],config:{leftKey:'tag',rightKey:'tag',how:'left'}},{id:'d',type:'deduplicate',inputs:['j'],config:{column:'tag'}}];const result=runPipeline({nodes},[{id:'l',rows:[{tag:'A',v:1},{tag:'A',v:1},{tag:'B',v:2}]},{id:'r',rows:[{tag:'A',v:7}]}]);assert.deepEqual(result.rows,[{tag:'A',v:1,right_tag:'A',right_v:7},{tag:'B',v:2}]);});
test('Pipeline select, aggregate and sort',()=>{const nodes=[source('s','x'),{id:'a',type:'aggregate',inputs:['s'],config:{group:'type',op:'sum',column:'v',as:'sum'}},{id:'sort',type:'sort',inputs:['a'],config:{column:'sum',desc:true}},{id:'select',type:'select',inputs:['sort'],config:{columns:'type,sum'}}];assert.deepEqual(runPipeline({nodes},[{id:'x',rows:[{type:'A',v:1},{type:'B',v:8},{type:'A',v:2}]}]).rows,[{type:'B',sum:8},{type:'A',sum:3}]);});

// Engineering graph
const simple=()=>({nodes:[{id:'a'},{id:'b',closed:true},{id:'c'},{id:'i'}],edges:[{id:'ab',from:'a',to:'b',kind:'process'},{id:'bc',from:'b',to:'c',kind:'process'},{id:'ci',from:'c',to:'i',kind:'signal'}]});
test('Directional traversal distinguishes upstream/downstream and signals',()=>{assert.deepEqual(traceNetwork(simple(),'a',{direction:'downstream'}).nodes,['a','b','c']);assert.deepEqual(traceNetwork(simple(),'c',{direction:'upstream'}).nodes,['c','b','a']);assert.equal(traceNetwork(simple(),'a',{signals:true}).nodes.length,4);});
test('Closed valves stop traversal only when requested',()=>assert.deepEqual(traceNetwork(simple(),'a',{respectClosed:true}).nodes,['a']));
test('Shortest path returns path or empty result',()=>{assert.deepEqual(shortestPath(simple(),'a','c'),['a','b','c']);assert.deepEqual(shortestPath(simple(),'a','i'),[]);});
test('Sample has the two intentional PT-102 structural findings',()=>{const f=validateDiagram(diagram());assert.equal(f.length,2);assert.deepEqual(new Set(f.map(x=>x.code)),new Set(['DISCONNECTED','UNREVIEWED']));assert(f.every(x=>x.tag==='PT-102'));});
test('Structural validation detects duplicate tags, dangling edges and pressure envelope',()=>{const d=diagram();d.nodes[0].tag=d.nodes[1].tag;d.nodes[1].operatingPressure=999;d.edges.push({id:'bad',from:'missing',to:'missing',kind:'process',diameter:0});const codes=new Set(validateDiagram(d).map(f=>f.code));for(const code of ['DUPLICATE_TAG','DANGLING_EDGE','PRESSURE_ENVELOPE','SELF_EDGE','LINE_SIZE'])assert(codes.has(code));});
test('BOM finds exact tags, mismatch, missing and extra items',()=>{const s=seed(),r=reconcileBOM(s.diagrams[0],s.datasets.find(d=>d.id==='ds-bom').rows);assert.equal(r.filter(x=>x.status!=='matched').length,3);assert.equal(r.find(x=>x.tag==='HV-102').status,'mismatch');assert.equal(r.find(x=>x.tag==='PT-102').status,'missing');assert.equal(r.find(x=>x.tag==='HV-999').status,'extra');});
test('BOM normalization and ambiguous duplicates are explicit',()=>{const d={nodes:[{id:'x',type:'pump',tag:'P-101'}]};assert.equal(reconcileBOM(d,[{tag:'p 101'}])[0].status,'matched');assert.equal(reconcileBOM(d,[{tag:'P-101'},{tag:'P101'}])[0].status,'ambiguous');});
test('Revision diff tracks added, removed and changed fields',()=>{const a=diagram(),b=structuredClone(a);b.nodes[0].x+=10;b.nodes.pop();b.edges.push({id:'new',from:'v101',to:'p101a'});const r=diffDiagrams(a,b);assert(r.some(c=>c.type==='modified'&&c.fields.includes('x')));assert(r.some(c=>c.type==='removed'));assert(r.some(c=>c.type==='added'));});
test('Tag extraction/classification is deterministic',()=>{assert.deepEqual(extractTagsFromText('P-101A / p-101a E-101 and PT 102'),['P-101A','E-101','PT-102']);assert.equal(classifyTag('FV-101'),'control');assert.equal(classifyTag('FIC-101'),'instrument');});
test('Vision candidates are bounded, normalized and always unverified',()=>{const r=validateVisionResult({coordinateSystem:'normalized',components:[{tag:'P-101',x:.5,y:.25,type:'pump'},{tag:'V-101',x:.8,y:.25,type:'tank'}],connections:[{from:'P-101',to:'V-101'}]},1000,800);assert.equal(r.nodes[0].x,500);assert.equal(r.nodes[0].y,200);assert(r.nodes.every(n=>n.status==='review'&&n.confidence===null));assert.equal(r.edges[0].to,r.nodes[1].id);});
test('Vision rejects hallucinated endpoints, duplicate tags, out-of-range and nonnumeric coordinates',()=>{for(const raw of [{components:[{tag:'P-101',x:2000,y:0}]},{components:[{tag:'P-101',x:'1',y:0}]},{components:[{tag:'P-101',x:1,y:1},{tag:'P101',x:2,y:2}]},{components:[],connections:[{from:'P-101',to:'V-101'}]}])assert.throws(()=>validateVisionResult(raw));});

// State, approvals, safety boundaries
const store=()=>new Store(seed(),{persistent:false});
test('Seed validates; edits are atomic with undo and redo',()=>{const s=store();validateWorkspace(s.state);s.transact('Move component',()=>s.diagram.nodes[0].x=500);assert.equal(s.diagram.nodes[0].x,500);s.undo();assert.equal(s.diagram.nodes[0].x,80);s.redo();assert.equal(s.diagram.nodes[0].x,500);assert.equal(s.state.audit.at(-1).action,'Redo: Move component');});
test('Invalid transaction rolls back all changes',()=>{const s=store();assert.throws(()=>s.transact('Bad edit',()=>{s.state.name='Bad';s.diagram.nodes[0].x=NaN;}));assert.equal(s.state.name,'Northline Operations');assert.equal(s.diagram.nodes[0].x,80);assert.equal(s.undoStack.length,0);});
test('Viewer guard rejects edits but permits explicit local preferences',()=>{const s=store();s.state.settings.role='viewer';assert.throws(()=>s.transact('Bad edit',()=>s.state.name='Bad'));s.transact('Preference',()=>s.state.theme='dark',{edit:false});assert.equal(s.state.theme,'dark');});
test('Workspace importer rejects malicious IDs and external source image URLs',()=>{const s=seed();s.diagrams[0].nodes[0].id='x" onclick="alert(1)';assert.throws(()=>validateWorkspace(s));const b=seed();b.diagrams[0].background={data:'https://tracker.invalid/image.png'};assert.throws(()=>validateWorkspace(b));});
test('Publish is a frozen proposal and only changes ontology after approval',()=>{const s=seed(),d=s.diagrams[0];d.nodes.find(n=>n.id==='p101a').name='Proposed pump';const a=stagePublish(d);s.approvals.push(a);d.nodes.find(n=>n.id==='p101a').name='Later unsaved edit';assert.equal(s.objects.find(o=>o.id==='asset-p101a').name,'Feed water pump A');applyApproval(s,a.id);assert.equal(s.objects.find(o=>o.id==='asset-p101a').name,'Proposed pump');assert.equal(a.status,'approved');assert.throws(()=>applyApproval(s,a.id));});
test('Work order and object-edit approvals actually mutate data',()=>{const s=seed();s.approvals.push({id:'wo',kind:'work-order',status:'pending',payload:{name:'Inspect pump',asset:'asset-p101a'}},{id:'edit',kind:'object-edit',status:'pending',payload:{id:'asset-p101a',changes:{status:'Maintenance'}}});applyApproval(s,'wo');applyApproval(s,'edit');assert(s.objects.some(o=>o.type==='Work order'&&o.name==='Inspect pump'));assert.equal(s.objects.find(o=>o.id==='asset-p101a').status,'Maintenance');});

// Grounded assistant and endpoint contract, not a live model test
for(const q of ['Which components need review?','Trace downstream from P-101A','Reconcile the bill of materials','What is the operating pressure of P-101A?'])test(`Local grounded assistant: ${q}`,()=>{const a=localAnswer(q,seed());assert(a.text.length>40);assert(a.citations.length>0);assert(a.traces.length>0);assert.equal(a.mode,'Local deterministic');});
test('Local evaluation suite passes four real assertions',async()=>{const r=await runEvaluations(seed());assert.equal(r.passed,4);assert.equal(r.total,4);});
test('Document retrieval is lexical and ranks relevant evidence',()=>{const docs=seed().documents;assert.equal(retrieveDocuments('pump pressure',docs)[0].id,'doc-1');assert.deepEqual(retrieveDocuments('zxxyynotfound',docs),[]);});
test('External model requires explicit consent',async()=>await assert.rejects(remoteAnswer('hello',seed(),''),/sharing/));
test('Endpoint contract sets memory-provided bearer key and parses the response (mock)',async()=>{const original=globalThis.fetch;let request;globalThis.fetch=async(url,options)=>{request={url,options};return new Response(JSON.stringify({choices:[{message:{content:'Mock response'}}],usage:{total_tokens:9}}),{status:200});};try{const r=await callModel({endpoint:'https://example.invalid/v1/chat/completions',model:'test-model',key:'mock-secret',messages:[{role:'user',content:'test'}]});assert.equal(r.text,'Mock response');assert.equal(request.options.headers.Authorization,'Bearer mock-secret');assert.equal(JSON.parse(request.options.body).stream,false);}finally{globalThis.fetch=original;}});
test('Endpoint URL validation and text escaping',()=>{assert.throws(()=>safeURL('javascript:alert(1)'));assert.throws(()=>safeURL('https://user:pass@example.invalid'));assert.equal(escapeHTML('<script>"&'), '&lt;script&gt;&quot;&amp;');});

// Actual CPU rendering geometry / compute fallback
 test('Vector scene tessellates to finite batched vertices',()=>{const s=buildDiagramScene(diagram());const v=tessellate(s);assert(v.length>1000);assert.equal(v.length%18,0);assert(v.every(Number.isFinite));});
test('Imported source drawings retain editable connection geometry',()=>{const d=diagram();d.background={data:'data:image/png;base64,AA=='};const full=buildDiagramScene(d);const disconnected=buildDiagramScene({...d,edges:[]});assert(full.shapes.length>disconnected.shapes.length);});
test('Orthogonal route creates deterministic midpoint waypoints',()=>{const d={nodes:[{id:'a',x:0,y:0},{id:'b',x:100,y:100}]};assert.deepEqual(connectionPoints({from:'a',to:'b',points:[]},d),[[0,0],[50,0],[50,100],[100,100]]);});
test('Editable SVG export includes model metadata and original embedded source',()=>{const d=diagram();d.background={data:'data:image/png;base64,AA=='};const svg=exportSVG(d);assert(svg.startsWith('<svg'));assert(svg.includes('stratum-diagram'));assert.equal(svg.match(/data:image\/png;base64,AA==/g).length,2);assert(svg.includes('P-101A'));});
test('CPU anomaly fallback computes z-scores, constant and empty inputs',async()=>{const g=new GPUService();const r=await g.anomalies([1,1,1,9],1);assert.equal(r.mode,'CPU');assert.deepEqual(r.flags,[false,false,false,true]);assert.equal(r.mean,3);assert.deepEqual((await g.anomalies([4,4,4])).scores,[0,0,0]);assert.deepEqual((await g.anomalies([])).scores,[]);await assert.rejects(g.anomalies([NaN]));});
