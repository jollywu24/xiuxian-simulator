import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {validateCatalog,importTiledObjects} from '../../tools/sandbox-s0/domain.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const read=async p=>JSON.parse(await fs.readFile(path.join(root,p),'utf8'));
const [catalog,schema,wbs,scope,tiled]=await Promise.all(['data/sandbox/catalog.json','schemas/sandbox/catalog.schema.json','data/sandbox/work-packages.json','data/sandbox/scope-baseline.json','data/sandbox/qinghe-objects.tmj'].map(read));
const errors=[];
// Validator for the explicitly used JSON Schema subset. Not a general schema engine.
function check(value,s,p='$'){
 if(s.$ref){check(value,schema.$defs[s.$ref.split('/').at(-1)],p);return;}
 for(const part of s.allOf||[])check(value,part,p);
 const types={object:v=>v!==null&&typeof v==='object'&&!Array.isArray(v),array:Array.isArray,integer:Number.isInteger,number:Number.isFinite,string:v=>typeof v==='string',boolean:v=>typeof v==='boolean'};
 if(s.type&&!types[s.type](value)){errors.push(`${p}: expected ${s.type}`);return;}
 if('const'in s&&value!==s.const)errors.push(`${p}: const mismatch`);
 if(s.enum&&!s.enum.includes(value))errors.push(`${p}: invalid enum`);
 if(s.pattern&&!new RegExp(s.pattern).test(value))errors.push(`${p}: invalid pattern`);
 if(s.minLength!=null&&value.length<s.minLength)errors.push(`${p}: too short`);
 if(s.minimum!=null&&value<s.minimum||s.maximum!=null&&value>s.maximum||s.exclusiveMinimum!=null&&value<=s.exclusiveMinimum)errors.push(`${p}: out of range`);
 if(s.required)for(const key of s.required)if(!Object.hasOwn(value,key))errors.push(`${p}.${key}: required`);
 if(s.properties)for(const [key,item] of Object.entries(value)){if(s.properties[key])check(item,s.properties[key],`${p}.${key}`);else if(s.additionalProperties===false)errors.push(`${p}.${key}: unknown property`);}
 if(Array.isArray(value)){
  if(s.minItems!=null&&value.length<s.minItems||s.maxItems!=null&&value.length>s.maxItems)errors.push(`${p}: invalid length`);
  if(s.uniqueItems&&new Set(value.map(v=>JSON.stringify(v))).size!==value.length)errors.push(`${p}: duplicate item`);
  if(s.items)value.forEach((v,i)=>check(v,s.items,`${p}[${i}]`));
 }
}
check(catalog,schema);
if(!errors.length)errors.push(...validateCatalog(catalog).errors);
for(const asset of catalog.assets){const p=path.resolve(root,asset.source);if(!p.startsWith(root+path.sep))errors.push(`${asset.id}: escaped source`);else try{await fs.access(p);}catch{errors.push(`${asset.id}: missing source`);}}
const imported=importTiledObjects(tiled);errors.push(...imported.errors);
const entityIds=new Set(Object.values(catalog).flat().filter(v=>v&&typeof v==='object').map(v=>v.id));
for(const o of imported.objects)if(o.targetId&&!entityIds.has(o.targetId))errors.push(`${o.id}: unknown target ${o.targetId}`);
const packages=wbs.packages,ids=new Set(packages.map(p=>p.id)),visiting=new Set(),done=new Set();
if(ids.size!==192||packages.length!==192)errors.push('WBS: expected 192 unique packages');
if(packages.filter(p=>p.priority==='必需').length!==185)errors.push('WBS: required count mismatch');
if(packages.filter(p=>p.stage==='S0').length!==11)errors.push('WBS: expected 11 S0 packages');
function visit(p){if(done.has(p.id))return;if(visiting.has(p.id)){errors.push(`WBS cycle: ${p.id}`);return;}visiting.add(p.id);for(const id of p.dependencies){const d=packages.find(x=>x.id===id);if(!d)errors.push(`${p.id}: missing dependency ${id}`);else{if(d.stage>p.stage)errors.push(`${p.id}: later-stage dependency ${id}`);visit(d);}}visiting.delete(p.id);done.add(p.id);}
for(const p of packages){visit(p);if(!p.acceptance||!p.accountableRole||!p.verification?.expected||!p.verification.steps.length||!p.verification.reviewerRole)errors.push(`${p.id}: incomplete acceptance contract`);}
const sum=o=>Object.values(o).reduce((a,b)=>a+b,0);
if(sum(scope.launch.maps)!==36||sum(scope.launch.martials)!==60||sum(scope.launch.quests)!==88||scope.launch.companionsIncludedInNamedNpc>scope.launch.namedNpc)errors.push('Scope baseline: inconsistent count');
const launch=await read('data/sandbox/launch-maps.json'),status=await read('data/sandbox/s0-status.json');
if(launch.maps.length!==36||new Set(launch.maps.map(m=>m.id)).size!==36)errors.push('Launch maps: expected 36 unique maps');
for(const [kind,count] of Object.entries(scope.launch.maps))if(launch.maps.filter(m=>m.kind===kind).length!==count)errors.push(`Launch maps: ${kind} count mismatch`);
for(const map of launch.maps)if(!catalog.regions.some(r=>r.id===map.regionId))errors.push(`${map.id}: unknown planned region`);
for(const p of status.packages){if(!packages.some(w=>w.id===p.id&&w.stage==='S0'))errors.push(`S0 status: unknown package ${p.id}`);try{await fs.access(path.join(root,p.document));await fs.access(path.join(root,`docs/sandbox/evidence/${p.id}.md`));}catch{errors.push(`${p.id}: missing delivery evidence`);}}
if(status.stageGatePassed&&status.openGates.length)errors.push('S0 cannot pass with open gates');
const art=await read('art_source/sandbox-s0/manifest.json');
for(const a of art.assets){const bytes=await fs.readFile(path.join(root,a.file));if(createHash('sha256').update(bytes).digest('hex')!==a.sha256)errors.push(`${a.file}: asset hash mismatch`);if(bytes.readUInt32BE(16)!==a.size[0]||bytes.readUInt32BE(20)!==a.size[1])errors.push(`${a.file}: PNG size mismatch`);}
const start=performance.now();for(let i=0;i<1000;i++)importTiledObjects(tiled);const importMs=(performance.now()-start)/1000;
const report={pass:errors.length===0,entities:entityIds.size,packages:packages.length,required:185,s0:11,tiledObjects:imported.objects.length,tiledImportCpuMeanMs:Number(importMs.toFixed(4)),caveat:'导入CPU耗时不等于策划编辑效率；没有第二名制作者的可用性结论。',errors};
console.log(JSON.stringify(report,null,2));if(errors.length)process.exitCode=1;
