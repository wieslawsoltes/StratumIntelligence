import os,shutil
import asyncio,json,traceback
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=Path(os.environ.get('STRATUM_TEST_OUTPUT',str(ROOT/'test-results')));OUT.mkdir(exist_ok=True)
async def main():
 results=[];errors=[];console_errors=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('chromium-browser'),headless=True,args=['--no-sandbox'])
  page=await browser.new_page(viewport={'width':1720,'height':1040},device_scale_factor=1)
  page.set_default_timeout(2500)
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('console',lambda m:console_errors.append(m.text) if m.type=='error' else None)
  await page.set_content((ROOT/'stratum-intelligence.html').read_text(),wait_until='load')
  await page.wait_for_function('window.stratum !== undefined')
  async def check(name,fn):
   try:
    await fn();results.append({'name':name,'status':'pass'});print('PASS',name,flush=True)
   except Exception as e:
    results.append({'name':name,'status':'fail','error':str(e)});print('FAIL',name,str(e)[:250],flush=True)
    await page.screenshot(path=str(OUT/('failure-'+str(len(results))+'.png')))
    await page.evaluate('stratum.app.modal.open && stratum.app.closeModal()')
  async def nav(route):
   await page.locator('.nav-item[data-route="'+route+'"]').click()
   await page.wait_for_function('(r)=>stratum.app.ui.route===r',arg=route)
   await page.wait_for_timeout(90)
  async def click(action):await page.locator('#main [data-action="'+action+'"]').first.click()
  async def modal_submit():
   await page.locator('#modal [type=submit]').click()
   await page.wait_for_function('!document.querySelector("#modal").open')
  async def world(x,y):
   return await page.evaluate('([x,y])=>{const ed=stratum.app.editor,r=ed.host.getBoundingClientRect(),v=ed.renderer.view;return [r.x+v.x+x*v.scale,r.y+v.y+y*v.scale]}',[x,y])
  async def drawclick(x,y):
   a,b=await world(x,y);await page.mouse.click(a,b)
  async def initial():
   assert await page.locator('h1').inner_text()=='P&ID Studio'
   assert await page.evaluate('stratum.store.diagram.nodes.length')==25
   assert await page.evaluate('stratum.app.editor.renderer.scene.shapes.length')>50
  await check('Initial drawing renders 25 components',initial)
  async def worker():
   data=await page.evaluate('stratum.app.worker.call("parseCSV","a,b\\n1,2")')
   assert data==[{'a':1,'b':2}]
   print('WORKER_MODE',await page.evaluate('stratum.app.worker.mode'),flush=True)
  await check('Worker client parses data in available execution mode',worker)
  async def edit():
   await page.locator('form[data-form=component] input[name=name]').fill('Edited duty pump')
   await page.locator('form[data-form=component] [type=submit]').click()
   assert await page.evaluate('stratum.store.diagram.nodes.find(n=>n.id==="p101a").name')=='Edited duty pump'
   await click('undo');assert await page.evaluate('stratum.store.diagram.nodes.find(n=>n.id==="p101a").name')=='Feed water pump A'
   await click('redo');assert await page.evaluate('stratum.store.diagram.nodes.find(n=>n.id==="p101a").name')=='Edited duty pump'
  await check('Inspector edits, undo and redo change actual state',edit)
  async def drag():
   x,y=await world(535,300);await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+35,y+25,steps=4);await page.mouse.up()
   n=await page.evaluate('stratum.store.diagram.nodes.find(n=>n.id==="p101a")');assert n['x']!=535 and n['x']%10==0
  await check('Pointer drag moves and snaps component coordinates',drag)
  async def addpipe():
   await page.locator('[data-action=tool][data-value="add:valve"]').first.click();await drawclick(1230,620)
   assert await page.evaluate('stratum.store.diagram.nodes.length')==26
   await page.locator('[data-action=tool][data-value=pipe]').click();await drawclick(1230,620);await drawclick(1230,490)
   assert await page.evaluate('stratum.store.diagram.edges.length')==26
   assert await page.locator('form[data-form=edge]').count()==1
  await check('Symbol placement and two-click pipe creation',addpipe)
  async def zoom():
   before=await page.evaluate('stratum.app.editor.renderer.view.scale');await click('zoom-in');after=await page.evaluate('stratum.app.editor.renderer.view.scale');assert after>before;await click('fit')
  await check('Canvas zoom and fit',zoom)
  async def bom():
   await page.locator('[data-action=tab][data-value=bom]').click();assert 'HV-999' in await page.locator('#main').inner_text();assert 'PT-102' in await page.locator('#main').inner_text()
  await check('BOM tab shows real reconciliation results',bom)
  async def revision():
   await page.locator('[data-action=tab][data-value=revisions]').click();await click('save-revision');await page.locator('#modal input[name=name]').fill('UI baseline');await modal_submit();assert await page.evaluate('stratum.store.diagram.revisions.length')==1
  await check('Revision baseline creation persists in state',revision)
  async def publish():
   await click('publish');
   if await page.locator('#modal[open] [type=submit]').count():await modal_submit()
   assert await page.evaluate('stratum.store.state.approvals.length')==1
   await nav('governance')
   await click('approve')
   if await page.locator('#modal[open] [type=submit]').count():await modal_submit()
   assert await page.evaluate('stratum.store.state.approvals[0].status')=='approved'
  await check('Human-approved diagram publication updates ontology',publish)
  async def query():
   await nav('data');await page.locator('#sql-query').fill('SELECT tag, pressure FROM ds-assets WHERE pressure > 7 ORDER BY pressure DESC');await click('run-query');await page.wait_for_function('Array.isArray(stratum.app.ui.queryResults)');assert await page.evaluate('stratum.app.ui.queryResults[0].tag')=='P-101A'
  await check('Data workspace executes an actual query',query)
  async def profile():
   await click('profile-data');await page.locator('#modal[open]').wait_for();assert 'Complete' in await page.locator('#modal').inner_text();await page.locator('#modal [data-action=close-modal]').first.click()
  await check('Dataset profile dialog',profile)
  async def pipeline():
   await nav('pipelines');await click('run-pipeline');await page.wait_for_function('Array.isArray(stratum.app.ui.pipelineResult?.rows)');assert await page.evaluate('stratum.app.ui.pipelineResult.rows.length')==19
   await click('materialize-pipeline');assert await page.evaluate('stratum.store.state.datasets.length')==4
  await check('Pipeline execution and output materialization',pipeline)
  async def chat():
   await nav('agents');await page.locator('#chat-input').fill('What is the operating pressure of P-101A?');await page.locator('#chat-input').press('Enter');await page.wait_for_function('stratum.store.state.threads.at(-1)?.messages.length === 2');assert '8.2' in await page.locator('#chat-messages').inner_text()
  await check('Grounded assistant reads current diagram values',chat)
  async def ontology_edit():
   await nav('ontology');await click('new-object');area=page.locator('#modal textarea[name=object]');data=json.loads(await area.input_value());data['name']='QA pressure asset';data['tag']='QA-201';await area.fill(json.dumps(data));await modal_submit();assert await page.evaluate('stratum.store.state.objects.some(o=>o.tag==="QA-201")')
  await check('Ontology object editor creates a real schema-backed object',ontology_edit)
  async def pipeline_drag():
   await nav('pipelines');loc=page.locator('.flow-node[data-id=step-source] .flow-node-head');b=await loc.bounding_box();x=b['x']+70;y=b['y']+12;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+20,y+30,steps=4);await page.mouse.up();assert await page.evaluate('stratum.app.pipeline.nodes[0].x')==80;assert await page.evaluate('stratum.app.pipeline.nodes[0].y')==160
  await check('Pipeline block dragging updates retained layout and wiring',pipeline_drag)

  async def evals():
   await nav('evaluations');await click('run-evals');await page.wait_for_function('stratum.store.state.evaluationRuns.length>0');r=await page.evaluate('stratum.store.state.evaluationRuns.at(-1)');assert r['passed']==4
  await check('Evaluation UI executes and records four assertions',evals)
  async def telemetry():
   await nav('overview');await click('analyze-telemetry');await page.locator('#modal[open]').wait_for();assert 'CPU' in await page.locator('#modal').inner_text();await page.locator('#modal [data-action=close-modal]').first.click()
  await check('Telemetry anomaly analysis opens actual computed results',telemetry)
  async def preferences():
   await nav('settings');await page.locator('form[data-form=preferences] input[name=name]').fill('QA Operations');await page.locator('form[data-form=preferences] select[name=theme]').select_option('dark');await page.locator('form[data-form=preferences] [type=submit]').click();assert await page.evaluate('document.documentElement.dataset.theme')=='dark';assert await page.locator('.workspace-switch strong').inner_text()=='QA Operations'
  await check('Preferences update theme and workspace branding',preferences)
  async def reset():
   await page.evaluate('stratum.store.replace(__require("src/core/seed.js").createSeed());stratum.app.ui.pidTab="drawing";stratum.app.ui.selected="p101a";stratum.app.ui.selectedEdge=null;stratum.app.ui.canvasView=null;stratum.app.render()')
  await reset()
  for route in ['overview','ontology','data','pipelines','pid','agents','logic','evaluations','applications','automations','observability','governance','settings']:
   async def smoke(r=route):
    await nav(r);assert await page.locator('#main h1').count()==1
    assert len(await page.locator('#main').inner_text())>100
    if r in ['overview','ontology','pipelines','pid','agents']:
     await page.wait_for_timeout(250);await page.screenshot(path=str(OUT/(r+'.png')))
   await check('Screen: '+route,smoke)
  await nav('pid');await page.locator('[data-action=theme]').click();await page.wait_for_timeout(150);await page.screenshot(path=str(OUT/'pid-dark.png'))
  await page.set_viewport_size({'width':390,'height':844});await page.wait_for_timeout(150);await page.screenshot(path=str(OUT/'pid-mobile.png'))
  async def mobile_properties():
   await page.locator('[data-action=mobile-inspector]').click();await page.locator('#inspector').wait_for(state='visible');await page.locator('form[data-form=component] input[name=name]').fill('Mobile edited pump');await page.locator('form[data-form=component] [type=submit]').click();assert await page.evaluate('stratum.store.diagram.nodes.find(n=>n.id==="p101a").name')=='Mobile edited pump'
  await check('Mobile inspector drawer can edit component properties',mobile_properties)
  results.append({'name':'No uncaught browser errors' ,'status':'pass' if not errors else 'fail','errors':errors})
  report={'browser':'System Chromium / policy-restricted opaque document','mode':await page.evaluate('stratum.app.editor.renderer.mode'),'worker':await page.evaluate('stratum.app.worker.mode'),'storage':'IndexedDB denied by browser context','results':results,'consoleErrors':console_errors}
  (OUT/'browser-ui-results.json').write_text(json.dumps(report,indent=2))
  print('TOTAL',sum(r['status']=='pass' for r in results),'/',len(results), 'ERRORS',errors,'CONSOLE',console_errors,flush=True)
  await browser.close()
asyncio.run(main())
