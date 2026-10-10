import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root=resolve('dist');const prefix='/amino-memory/';
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.json':'application/json'};
createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname;if(path==='/amino-memory'){res.writeHead(302,{Location:prefix});res.end();return;}if(!path.startsWith(prefix)){res.writeHead(404);res.end();return;}const file=resolve(root,decodeURIComponent(path.slice(prefix.length))||'index.html');if(!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}const body=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(body);}catch{res.writeHead(404);res.end('Not found');}}).listen(4174,'127.0.0.1',()=>console.log('Subpath QA server: http://127.0.0.1:4174/amino-memory/'));
