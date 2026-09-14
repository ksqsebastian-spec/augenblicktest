// Alternative single-module deployment for connected Cloudflare API tooling.
// Ordinary CLI deployments use wrangler.jsonc and native static assets instead.
import {readdir,readFile,mkdir,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {build} from 'esbuild';
import {extname,resolve} from 'node:path';
const root=resolve('dist/client'),files={};
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.ttf':'font/ttf','.otf':'font/otf','.svg':'image/svg+xml','.json':'application/json'};
async function collect(dir){for(const f of await readdir(dir,{withFileTypes:true})){const p=dir+'/'+f.name;if(f.isDirectory())await collect(p);else files[p.slice(root.length)]={type:types[extname(p)]||'application/octet-stream',data:gzipSync(await readFile(p)).toString('base64')};}}
await collect(root);await mkdir('.local',{recursive:true});
const source=`import app from './backend/worker.js';const files=${JSON.stringify(files)};export default {async fetch(request,env,ctx){const assets={async fetch(req){let path=new URL(req.url).pathname;if(path==='/'||!path.split('/').at(-1).includes('.'))path='/index.html';const f=files[path];if(!f)return new Response('Not found',{status:404});return new Response(req.method==='HEAD'?null:new Blob([Uint8Array.from(atob(f.data),c=>c.charCodeAt(0))]).stream().pipeThrough(new DecompressionStream('gzip')),{headers:{'Content-Type':f.type,'Cache-Control':path==='/index.html'||path==='/sw.js'?'no-cache':'public, max-age=86400'}});}};return app.fetch(request,{...env,ASSETS:assets},ctx);},scheduled:app.scheduled};`;
const result=await build({stdin:{contents:source,resolveDir:process.cwd()},bundle:true,write:false,minify:true,format:'esm',target:'es2022'});
await writeFile('.local/cloudflare-bundle.js',result.outputFiles[0].text);
console.log('API deployment bundle:',result.outputFiles[0].text.length,'bytes');
