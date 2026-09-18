import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const defaultOutput=path.join(root,'web','sandbox-s0');

function replaceRequired(source,search,replacement,label){
 if(!source.includes(search))throw Error(`S0 Pages build contract changed: ${label}`);
 return source.replaceAll(search,replacement);
}

function copy(source,target){
 fs.mkdirSync(path.dirname(target),{recursive:true});
 fs.copyFileSync(path.join(root,source),path.join(target));
}

export function buildSandboxS0Site(outputDirectory=defaultOutput){
 const output=path.resolve(outputDirectory);
 const relative=path.relative(root,output);
 if(!relative||relative.startsWith('..')||path.isAbsolute(relative))throw Error('S0 Pages output must stay inside the repository.');
 fs.rmSync(output,{recursive:true,force:true});
 fs.mkdirSync(output,{recursive:true});

 let html=fs.readFileSync(path.join(root,'tools','sandbox-s0','workbench.html.template'),'utf8');
 html=replaceRequired(html,'<meta name="viewport" content="width=device-width, initial-scale=1">','<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="wudao-s0-static" content="github-pages">','static hosting marker');
 html=replaceRequired(html,'href="/tools/sandbox-s0/workbench.css"','href="./workbench.css"','stylesheet path');
 html=replaceRequired(html,'src="/tools/sandbox-s0/app.mjs"','src="./app.mjs"','module path');
 fs.writeFileSync(path.join(output,'index.html'),html);

 let app=fs.readFileSync(path.join(root,'tools','sandbox-s0','app.mjs'),'utf8');
 app=replaceRequired(app,"fetch('/data/sandbox/catalog.json')","fetch('./data/catalog.json')",'catalog path');
 app=replaceRequired(app,"renderer.load('/art_source/sandbox-s0/v1/qinghe-courtyard-v1.png')","renderer.load('./assets/qinghe-courtyard-v1.png')",'scene path');
 app=replaceRequired(app,"renderer.loadAtlas('/art_source/sandbox-s0/v1/party-motion-atlas-v1.png')","renderer.loadAtlas('./assets/party-motion-atlas-v1.png')",'atlas path');
 fs.writeFileSync(path.join(output,'app.mjs'),app);

 let core=fs.readFileSync(path.join(root,'tools','sandbox-s0','core.mjs'),'utf8');
 core=replaceRequired(core,"'../../web/character-system.mjs","'../character-system.mjs",'character rules import');
 core=replaceRequired(core,"'../../web/wudao-p0-core.mjs","'../wudao-p0-core.mjs",'causal die import');
 fs.writeFileSync(path.join(output,'core.mjs'),core);

 let renderer=fs.readFileSync(path.join(root,'tools','sandbox-s0','renderer.mjs'),'utf8');
 renderer=replaceRequired(renderer,"'../../web/vendor/three/three.module.js'","'../vendor/three/three.module.js'",'Three.js import');
 fs.writeFileSync(path.join(output,'renderer.mjs'),renderer);

 copy('tools/sandbox-s0/domain.mjs',path.join(output,'domain.mjs'));
 copy('tools/sandbox-s0/workbench.css',path.join(output,'workbench.css'));
 copy('data/sandbox/catalog.json',path.join(output,'data','catalog.json'));
 copy('art_source/sandbox-s0/v1/qinghe-courtyard-v1.png',path.join(output,'assets','qinghe-courtyard-v1.png'));
 copy('art_source/sandbox-s0/v1/party-motion-atlas-v1.png',path.join(output,'assets','party-motion-atlas-v1.png'));
 return output;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const output=buildSandboxS0Site(process.argv[2]||defaultOutput);
 console.log(`S0 GitHub Pages experience built at ${path.relative(root,output)}`);
}
