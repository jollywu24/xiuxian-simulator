import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const work=path.join(root,'.tmp/sandbox-s0');await fs.mkdir(work,{recursive:true});
const template=await fs.readFile(path.join(root,'tools/sandbox-s0/workbench.html.template'),'utf8');
await fs.writeFile(path.join(work,'index.html'),template);
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(req.method==='POST'&&url.pathname==='/__s0/report'){
   let text='';for await(const chunk of req){text+=chunk;if(text.length>100000)throw Error('report too large');}
   const {kind,payload}=JSON.parse(text);if(!['benchmark','replay'].includes(kind))throw Error('unknown report');
   await fs.writeFile(path.join(work,`${kind}.json`),JSON.stringify(payload,null,2)+'\n');res.writeHead(200,{'content-type':'application/json'}).end('{"ok":true}');return;
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
  if(url.pathname==='/'&&url.searchParams.has('viewport')){
   const size={desktop:[1280,720],landscape:[844,390],portrait:[390,844]}[url.searchParams.get('viewport')];if(!size)throw Error('unknown viewport');
   const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>武道 · 视口验收 ${size.join('×')}</title><style>body{background:#0e2222;color:#dfdbc3;font:14px sans-serif;margin:20px}nav{margin-bottom:15px}a{color:#d8c497;margin-right:18px}iframe{display:block;border:1px solid #8e835a;background:#162b29;max-width:none}</style><nav>真实内嵌视口 ${size.join(' × ')}　<a href="/">返回工作台</a><a href="/?viewport=desktop">桌面</a><a href="/?viewport=landscape">手机横屏</a><a href="/?viewport=portrait">手机竖屏</a></nav><iframe title="武道定标画面" src="/?embedded=1" width="${size[0]}" height="${size[1]}"></iframe></html>`;
   res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}).end(html);return;
  }
  let target;if(url.pathname==='/')target=path.join(work,'index.html');else{
   const name=decodeURIComponent(url.pathname);if(!['/tools/sandbox-s0/','/data/sandbox/','/art_source/sandbox-s0/','/web/'].some(prefix=>name.startsWith(prefix)))throw Error('path outside workbench');
   target=path.resolve(root,`.${name}`);const relative=path.relative(root,target);if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('invalid path');
  }
  const body=await fs.readFile(target);res.writeHead(200,{'content-type':types[path.extname(target)]||'application/octet-stream','cache-control':'no-store','content-length':body.length});res.end(req.method==='HEAD'?undefined:body);
 }catch(error){res.writeHead(404,{'content-type':'text/plain; charset=utf-8'}).end('Not found');}
});
const portArg=process.argv.indexOf('--port');
const port=Number(portArg>=0?process.argv[portArg+1]:process.env.S0_PORT||4310);server.listen(port,'0.0.0.0',()=>console.log(`S0 workbench: http://127.0.0.1:${port}/`));
