// Data contracts are independent of the UI, network and persistence adapters.
const groups={regions:'region',routes:'route',maps:'map',factions:'faction',actors:'actor',skills:'skill',items:'item',quests:'quest',events:'event',assets:'asset'};
const referenceFields={regionId:'regions',factionId:'factions',mapId:'maps',skillId:'skills',assetId:'assets',questId:'quests',actorIds:'actors',itemIds:'items',eventIds:'events',neighbors:'maps'};
export function validateCatalog(catalog){
 const errors=[];const all=new Set(),sets={};
 if(!catalog||typeof catalog!=='object'||Array.isArray(catalog))return {ok:false,errors:['catalog: expected object'],entityCount:0};
 for(const group of Object.keys(groups))if(!Array.isArray(catalog[group])||catalog[group].some(e=>!e||typeof e!=='object'||Array.isArray(e)))errors.push(`${group}: expected entity objects`);
 if(errors.length)return {ok:false,errors,entityCount:0};
 if(catalog?.schemaVersion!==1)errors.push('schemaVersion must be 1');
 for(const [group,prefix] of Object.entries(groups)){
  sets[group]=new Set();
  if(!Array.isArray(catalog?.[group])){errors.push(`${group}: expected array`);continue;}
  for(const entity of catalog[group]){
   if(typeof entity.id!=='string'||!new RegExp(`^${prefix}\\.[a-z][a-z0-9-]*$`).test(entity.id))errors.push(`${group}: invalid id ${entity.id}`);
   if(all.has(entity.id))errors.push(`duplicate id: ${entity.id}`);all.add(entity.id);sets[group].add(entity.id);
   if(group!=='routes'&&group!=='assets'&&!entity.name)errors.push(`${entity.id}: name required`);
  }
 }
 for(const group of Object.keys(groups))for(const entity of catalog?.[group]||[]){
  for(const [field,destination] of Object.entries(referenceFields))if(entity[field]!=null){
   const ids=Array.isArray(entity[field])?entity[field]:[entity[field]];
   for(const id of ids)if(!sets[destination]?.has(id))errors.push(`${entity.id}.${field}: unknown ${id}`);
  }
  if(group==='actors'){
   if(!['ordinary','protected','player'].includes(entity.lifePolicy))errors.push(`${entity.id}: invalid life policy`);
   if(!Number.isFinite(entity.maxHp)||entity.maxHp<=0)errors.push(`${entity.id}: invalid health`);
   if(!Array.isArray(entity.position)||entity.position.length!==2||!entity.position.every(Number.isInteger))errors.push(`${entity.id}: invalid position`);
   const map=catalog.maps.find(m=>m.id===entity.mapId);
   if(map?.width&&(!isInside(map,entity.position)||map.blocked.some(p=>sameCell(p,entity.position))))errors.push(`${entity.id}: illegal spawn`);
  }
  if(group==='routes'){
   for(const f of ['from','to'])if(!sets.regions.has(entity[f]))errors.push(`${entity.id}.${f}: unknown region`);
   if(entity.from===entity.to||!Number.isInteger(entity.timeKe)||entity.timeKe<=0)errors.push(`${entity.id}: invalid route`);
  }
  if(group==='skills'&&(!['damage','heal'].includes(entity.effect)||entity.cost<1||entity.cost>3||entity.range<1))errors.push(`${entity.id}: invalid skill`);
  if(group==='quests'&&(!entity.fallback||!entity.rewardKey))errors.push(`${entity.id}: fallback/rewardKey required`);
 }
 for(const map of catalog?.maps||[])for(const other of map.neighbors||[]){const target=catalog.maps.find(m=>m.id===other);if(target&&!target.neighbors.includes(map.id))errors.push(`${map.id}: one-way exit to ${other}`);}
 const rewards=(catalog?.quests||[]).map(q=>q.rewardKey);if(new Set(rewards).size!==rewards.length)errors.push('duplicate rewardKey');
 if(catalog?.regions?.length){const reached=new Set([catalog.regions[0].id]);let n=0;while(n!==reached.size){n=reached.size;for(const r of catalog.routes||[])if(reached.has(r.from)||reached.has(r.to)){reached.add(r.from);reached.add(r.to);}}for(const r of catalog.regions)if(!reached.has(r.id))errors.push(`unreachable region: ${r.id}`);}
 return {ok:errors.length===0,errors,entityCount:all.size};
}
export const sameCell=(a,b)=>Boolean(a&&b&&a[0]===b[0]&&a[1]===b[1]);
export const isInside=(map,p)=>Boolean(Array.isArray(p)&&p.length===2&&p.every(Number.isInteger)&&p[0]>=0&&p[1]>=0&&p[0]<map.width&&p[1]<map.height);

// Deliberately bounded Tiled object-layer subset. Unknown content must be explicit.
export function importTiledObjects(map){
 const errors=[],objects=[];
 if(map.type!=='map'||map.orientation!=='orthogonal'||!Number.isFinite(map.tilewidth)||!Number.isFinite(map.tileheight)||map.tilewidth<=0||map.tileheight<=0)errors.push('unsupported Tiled map geometry');
 for(const layer of map.layers||[]){
  if(layer.type!=='objectgroup'){errors.push(`unsupported layer: ${layer.type}`);continue;}
  for(const obj of layer.objects||[]){
   const props=Object.fromEntries((obj.properties||[]).map(p=>[p.name,p.value]));const kind=obj.class||obj.type;
   if(!['spawn','blocker','interaction','exit'].includes(kind))errors.push(`unsupported object class: ${kind}`);
   if(!/^object\.[a-z][a-z0-9-]*$/.test(props.stableId||''))errors.push(`object ${obj.id}: stableId required`);
   if(!Number.isFinite(obj.x)||!Number.isFinite(obj.y))errors.push(`object ${obj.id}: position required`);
   objects.push({id:props.stableId,kind,cell:[Math.floor(obj.x/map.tilewidth),Math.floor(obj.y/map.tileheight)],targetId:props.targetId||null});
  }
 }
 if(new Set(objects.map(o=>o.id)).size!==objects.length)errors.push('duplicate object stableId');
 return {ok:errors.length===0,errors,objects};
}
