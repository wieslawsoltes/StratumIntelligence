import os,shutil
import asyncio,json
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('STRATUM_TEST_OUTPUT',str(ROOT/'test-results')))
OUT.mkdir(parents=True,exist_ok=True)
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('chromium-browser'),headless=True,args=['--no-sandbox'])
  page=await browser.new_page(viewport={'width':1720,'height':1040});page.set_default_timeout(4000)
  await page.set_content((ROOT/'stratum-intelligence.html').read_text());await page.wait_for_function('window.stratum')
  results=[]
  async def check(name,fn):
   try:
    await fn();results.append({'name':name,'status':'pass'});print('PASS',name,flush=True)
   except Exception as e:results.append({'name':name,'status':'fail','error':str(e)});print('FAIL',name,str(e),flush=True)
  async def svg_roundtrip():
   result=await page.evaluate('''()=>{const io=__require('src/core/interchange.js'),d=stratum.store.diagram,b=io.importSVG(io.exportSVG(d));return [b.nodes.length,b.edges.length,b.nodes[3].tag,b.revisions.length]}''');assert result==[25,25,'P-101A',0]
  await check('SVG metadata round trip retains editable components and edges',svg_roundtrip)
  async def svg_sanitize():
   r=await page.evaluate('''()=>{const io=__require('src/core/interchange.js'),d=io.importSVG('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><script>alert(1)</script><rect x="2" y="3" width="20" height="20" onclick="alert(2)"/><image href="https://example.invalid/track"/><text x="100" y="120">P-201</text></svg>');return {source:atob(d.background.data.split(',')[1]),nodes:d.nodes};}''');assert '<script' not in r['source'] and 'onclick' not in r['source'] and 'https://' not in r['source'];assert r['nodes'][0]['tag']=='P-201' and r['nodes'][0]['status']=='review'
  await check('Generic SVG import strips active/external content and yields review candidates',svg_sanitize)
  async def actual_file_import():
   async with page.expect_file_chooser() as fc:await page.locator('[data-action=import-drawing]').click()
   chooser=await fc.value;await chooser.set_files(str(ROOT/'examples/feed-water-pid.json'));await page.wait_for_function('stratum.store.state.diagrams.length===2');assert await page.evaluate('stratum.store.diagram.nodes.length')==25
  await check('Native JSON file picker imports a second editable diagram',actual_file_import)
  async def png_export():
   r=await page.evaluate('''async()=>{const d=stratum.store.diagram,b=await stratum.app.editor.renderer.png(d.width,d.height),i=await createImageBitmap(b);return {type:b.type,size:b.size,width:i.width,height:i.height}}''');assert r['type']=='image/png' and r['size']>10000 and r['width']==2720 and r['height']==1540
  await check('PNG exporter renders and encodes actual scene pixels',png_export)
  async def raster_import():
   await page.evaluate('''async()=>{const c=document.createElement('canvas');c.width=800;c.height=500;const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,800,500);ctx.fillStyle='#334155';ctx.font='20px sans-serif';ctx.fillText('P-201 source drawing',100,100);const b=await new Promise(r=>c.toBlob(r,'image/png'));await stratum.app.importDrawing(new File([b],'source.png',{type:'image/png'}));}''');assert await page.evaluate('stratum.store.state.diagrams.length')==3;assert await page.evaluate('stratum.store.diagram.background.data.startsWith("data:image/png")');assert await page.evaluate('stratum.store.diagram.nodes.length')==0
  await check('Raster import retains source image without fabricating detections',raster_import)
  async def workspace_roundtrip():
   r=await page.evaluate('''()=>{stratum.app.ui.apiKey='not-exported-test-secret';const exported=JSON.stringify(stratum.store.state);const parsed=JSON.parse(exported);__require('src/core/store.js').validateWorkspace(parsed);stratum.store.replace(parsed);return [exported.includes('not-exported-test-secret'),stratum.store.state.diagrams.length];}''');assert r==[False,3]
  await check('Workspace JSON round trip validates and excludes the memory-only key',workspace_roundtrip)
  async def vision_candidate_review():
   raw=json.loads((ROOT/'examples/vision-response.json').read_text());await page.evaluate('''(raw)=>{const d=stratum.store.diagram,result=__require('src/core/analysis.js').validateVisionResult(raw,d.width,d.height);stratum.app.visionReview(result,d.id)}''',raw);await page.locator('#modal [type=submit]').click();await page.wait_for_function('stratum.store.diagram.nodes.length===2');assert await page.evaluate('stratum.store.diagram.nodes.every(n=>n.status==="review")');assert await page.evaluate('stratum.store.diagram.edges.length')==1
  await check('Schema-validated example vision response enters explicit review gate (not a live model)',vision_candidate_review)
  async def cpu_diagnostics():
   r=await page.evaluate('stratum.gpu.anomalies(Array.from({length:100000},(_,i)=>Math.sin(i*.03)+(i%997===0?7:0)),3)');assert len(r['scores'])==100000 and sum(r['flags'])>0
  await check('100,000-value numeric diagnostic computes full result',cpu_diagnostics)
  await page.wait_for_timeout(200);await page.screenshot(path=str(OUT/'imported-source.png'))
  (OUT/'interchange-results.json').write_text(json.dumps({'results':results,'environment':'Opaque Chromium document; Canvas 2D; no live model/PDF request'},indent=2));print('TOTAL',sum(r['status']=='pass' for r in results),'/',len(results),flush=True)
  await browser.close()
asyncio.run(main())
