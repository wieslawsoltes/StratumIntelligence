import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.md':'text/plain; charset=utf-8','.wasm':'application/wasm'};
const port=Number(process.env.PORT||8080);
http.createServer(async(req,res)=>{try{
 const decoded=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 let file=path.resolve(root,'.'+decoded);
 if(file!==root&&!file.startsWith(root+path.sep))throw new Error('Invalid path');
 if((await stat(file)).isDirectory())file=path.join(file,'index.html');
 const body=await readFile(file);
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-cache'});res.end(body);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Stratum Intelligence: http://localhost:${port}`));
