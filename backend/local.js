import http from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {Readable} from 'node:stream';
import {database} from './local-db.js';
import {api} from './api.js';
const root=resolve('.local');await mkdir(root,{recursive:true});await mkdir(root+'/files',{recursive:true});
const db=database(root+'/augenblick.sqlite');db.sql.exec(await readFile('migrations/0001_initial.sql','utf8'));db.sql.exec(await readFile('migrations/0002_external_access.sql','utf8'));db.sql.exec(await readFile('migrations/0003_email.sql','utf8'));db.sql.exec(await readFile('migrations/0004_workspaces.sql','utf8'));
const setup=process.env.SETUP_TOKEN||'local-development-setup-only';
const env={DB:db,SETUP_TOKEN:setup,FILES:{async put(id,data){await writeFile(root+'/files/'+id,Buffer.from(data));},async get(id){try{return {body:await readFile(root+'/files/'+id)};}catch{return null;}}}};
const mime={'.html':'text/html','.mjs':'text/javascript', '.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.ttf':'font/ttf','.otf':'font/otf','.json':'application/json'};
const port=Number(process.env.PORT||8787);
http.createServer(async (req,res)=>{
 try {
  const url=new URL(req.url,`http://${req.headers.host}`);
  if(url.pathname.startsWith('/api/')){
   const opts={method:req.method,headers:req.headers};if(!['GET','HEAD'].includes(req.method)){opts.body=Readable.toWeb(req);opts.duplex='half';}
   const r=await api(new Request(url,opts),env);res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));
  }else{
   const base=resolve('dist/client'),path=resolve(base,'.'+decodeURIComponent(url.pathname));
   if(!path.startsWith(base+'/')&&path!==base){res.writeHead(403);res.end();return;}
   let file=path;try{if(!extname(file))file=base+'/index.html';const bytes=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(bytes);}catch{res.writeHead(404);res.end('Not found');}
  }
 }catch{res.writeHead(500);res.end('Local server error');}
}).listen(port,'127.0.0.1',()=>console.log(`Augenblick local server: http://127.0.0.1:${port}`));
