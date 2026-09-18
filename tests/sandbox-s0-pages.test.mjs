import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildSandboxS0Site} from '../scripts/build-sandbox-s0-site.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'.tmp','sandbox-s0-pages-test');

test('S0 Pages build is self-contained under the published web root',()=>{
 buildSandboxS0Site(output);
 const expected=['index.html','app.mjs','core.mjs','domain.mjs','renderer.mjs','workbench.css','data/catalog.json','assets/qinghe-courtyard-v1.png','assets/party-motion-atlas-v1.png'];
 for(const name of expected)assert.ok(fs.statSync(path.join(output,name)).size>0,name);
 const html=fs.readFileSync(path.join(output,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(output,'app.mjs'),'utf8');
 const core=fs.readFileSync(path.join(output,'core.mjs'),'utf8');
 const renderer=fs.readFileSync(path.join(output,'renderer.mjs'),'utf8');
 assert.match(html,/wudao-s0-static/);
 assert.match(html,/href="\.\/workbench\.css"/);
 assert.match(html,/src="\.\/app\.mjs"/);
 assert.doesNotMatch(html,/\/(tools|data|art_source)\//);
 assert.match(app,/fetch\('\.\/data\/catalog\.json'\)/);
 assert.match(app,/\.\/assets\/qinghe-courtyard-v1\.png/);
 assert.match(core,/\.\.\/character-system\.mjs/);
 assert.match(renderer,/\.\.\/vendor\/three\/three\.module\.js/);
});
