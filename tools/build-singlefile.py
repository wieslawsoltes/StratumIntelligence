#!/usr/bin/env python3
"""Build a dependency-free single HTML release from the source ES modules.

This build-time transformation emits normal JavaScript module factories; the app
never uses eval()/Function(). The actual worker engine is embedded as a Blob.
"""
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[1]
IMPORT=re.compile(r"^import\s+(.+?)\s+from\s+(['\"])(.+?)\2;\s*",re.M)
DYNAMIC=re.compile(r"import\((['\"])(\./[^'\"]+)\1\)")
def resolve(module,relative):
 return (ROOT/module).parent.joinpath(relative).resolve().relative_to(ROOT).as_posix()
def bundle(entry):
 modules={}
 def collect(name):
  if name in modules:return
  text=(ROOT/name).read_text();modules[name]=text
  for m in IMPORT.finditer(text):
   if m[3].startswith('.'):
    collect(resolve(name,m[3]))
  for m in DYNAMIC.finditer(text):
   target=resolve(name,m[2])
   if (ROOT/target).exists():collect(target)
 collect(entry)
 parts=[]
 for name,text in modules.items():
  exports=re.findall(r'export\s+(?:async\s+)?(?:function|class|const|let|var)\s+(\w+)',text)
  def sub(m):
   spec=m[1];target=resolve(name,m[3]);
   if spec.startswith('{'):
    spec=re.sub(r'\b(\w+)\s+as\s+(\w+)\b',r'\1:\2',spec)
    return f'const {spec}=__require({json.dumps(target)});\n'
   raise ValueError('Unsupported import '+m[0])
  text=IMPORT.sub(sub,text)
  def dynamic(m):
   target=resolve(name,m[2]);return f'Promise.resolve(__require({json.dumps(target)}))' if target in modules else m[0]
  text=DYNAMIC.sub(dynamic,text)
  text=re.sub(r'\bexport\s+(?=(?:async\s+)?(?:function|class|const|let|var)\b)','',text)
  text=text.replace('import.meta.url',f'new URL({json.dumps(name)},document.baseURI).href')
  export_code='\nObject.assign(exports,{'+','.join(exports)+'});'
  if name==entry and name.endswith('app.js'):
   text='(async()=>{\n'+text+'\n})().catch(console.error);'
  parts.append(json.dumps(name)+':function(__require,exports){\n'+text+export_code+'\n}')
 return 'const __modules={'+',\n'.join(parts)+'};\nconst __cache={};\nfunction __require(id){if(__cache[id])return __cache[id];const value={};__cache[id]=value;__modules[id](__require,value);return value;}\n__require('+json.dumps(entry)+');'
worker=bundle('src/core/worker.js')
main=bundle('src/app.js')
script='globalThis.STRATUM_WORKER_URL=URL.createObjectURL(new Blob(['+json.dumps(worker)+'],{type:"text/javascript"}));\n'+main
script=script.replace('</script','<\\/script')
html=(ROOT/'index.html').read_text()
html=html.replace('<link rel="stylesheet" href="styles.css">','<style>\n'+(ROOT/'styles.css').read_text()+'\n</style>')
icon=(ROOT/'assets/stratum.svg').read_text()
import base64
html=html.replace('href="assets/stratum.svg"','href="data:image/svg+xml;base64,'+base64.b64encode(icon.encode()).decode()+'"')
html=html.replace('<script type="module" src="src/app.js"></script>','<script>\n'+script+'\n</script>')
output=ROOT/'stratum-intelligence.html';output.write_text(html)
print(f'Built {output} ({len(html):,} bytes)')
