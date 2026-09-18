import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateCatalog,importTiledObjects} from '../tools/sandbox-s0/domain.mjs';
import {createSession,inspectAction,applyCommand,pathTo,pathSteps,lineOfSight,exportSession,restoreSession} from '../tools/sandbox-s0/core.mjs';
import {calculateDamageRange,applyDamageReduction} from '../web/character-system.mjs?v=20260910.1';
const catalog=JSON.parse(fs.readFileSync(new URL('../data/sandbox/catalog.json',import.meta.url),'utf8'));
const fresh=()=>createSession(catalog,{battle:true});
test('S0 catalog stable IDs, references, routes and reward keys validate',()=>assert.deepEqual(validateCatalog(catalog).errors,[]));
test('invalid IDs, duplicates, missing references and unreachable regions fail authoring',()=>{
 const c=structuredClone(catalog);c.actors[0].id='screen_shen';c.actors[1].skillId='skill.missing';c.items.push(c.items[0]);c.regions.push({id:'region.isolated',name:'孤岛'});
 const v=validateCatalog(c);assert.equal(v.ok,false);for(const text of ['invalid id','duplicate id','unknown skill.missing','unreachable region'])assert.ok(v.errors.some(e=>e.includes(text)),text);
});
test('quest definition requires reward identity and fallback',()=>{const c=structuredClone(catalog);delete c.quests[0].fallback;assert.equal(validateCatalog(c).ok,false);});
test('malformed catalog roots and entity arrays return validation errors',()=>{for(const c of [null,[],{}, {...catalog,actors:[null]}])assert.equal(validateCatalog(c).ok,false);});
test('records cannot forge victory, party identity or invalid guard state',()=>{
 for(const mutate of [s=>{s.phase='finished';s.result='victory';},s=>{s.selectedId='actor.guard-blade';s.actors[4].side='party';},s=>{s.actors[0].guard='yes';},s=>{s.result='defeat';}]){const s=fresh();mutate(s);assert.throws(()=>restoreSession(exportSession(s),catalog));}
});
test('four companions have independent AP and the input state is immutable',()=>{const s=fresh(),before=JSON.stringify(s);const r=applyCommand(s,catalog,{type:'move',target:[3,4]});assert.ok(r.ok);assert.equal(r.state.actors[0].ap,2);assert.equal(r.state.actors[1].ap,3);assert.equal(JSON.stringify(s),before);});
test('blockers, occupied cells and out-of-bounds targets reject without costs',()=>{const s=fresh();for(const target of [[4,4],[1,5],[-1,1],[10,0],[1.5,2],null]){const r=applyCommand(s,catalog,{type:'move',target});assert.equal(r.ok,false);assert.equal(r.state,s);}});
test('grid path goes around obstacles and a limited AP pool rejects distant paths',()=>{const s=fresh(),p=pathTo(s,'actor.chen-siming',[5,4]);assert.ok(p.length>3);assert.ok(!p.some(([x,y])=>x===4&&(y===3||y===4)));s.actors[0].ap=0;assert.equal(inspectAction(s,catalog,{type:'move',target:[3,4]}).ok,false);});
test('sparse nodes form connected comparison paths with geometric movement cost',()=>{const s=createSession(catalog,{topology:'nodes',battle:true});const p=pathTo(s,s.selectedId,[9,5]);assert.ok(p?.length);assert.ok(pathSteps(s.actors[0].position,p)>=7);assert.equal(pathTo(s,s.selectedId,[3,4]),null);});
test('line of sight blocks a skill through crates',()=>{const s=fresh();assert.equal(lineOfSight(s,[3,3],[5,3]),false);assert.equal(lineOfSight(s,[1,1],[3,1]),true);});
test('skill previews use the existing damage formula',()=>{const s=fresh();s.actors[0].position=[6,4];const target=s.actors[4],skill=catalog.skills[0],p=inspectAction(s,catalog,{type:'skill',targetId:target.id});const range=calculateDamageRange({attributes:{strength:7,agility:6},stageId:'body',kind:'melee',techniquePower:skill.power});assert.ok(p.ok);assert.equal(p.min,applyDamageReduction(range.min,target.reduction).final);assert.equal(p.max,applyDamageReduction(range.max,target.reduction).final);});
test('range, friendly fire, dead targets and action costs are enforced',()=>{const s=fresh();assert.equal(inspectAction(s,catalog,{type:'skill',targetId:s.actors[4].id}).ok,false);s.actors[0].position=[1,4];assert.equal(inspectAction(s,catalog,{type:'skill',targetId:s.actors[1].id}).ok,false);s.actors[0].position=[6,4];s.actors[0].ap=1;assert.equal(inspectAction(s,catalog,{type:'skill',targetId:s.actors[4].id}).ok,false);});
test('fixed fate survives session restore and repeated inputs',()=>{let s=fresh();s.actors[0].position=[6,4];const command={type:'skill',targetId:'actor.guard-blade'};const a=applyCommand(s,catalog,command),b=applyCommand(restoreSession(exportSession(s),catalog),catalog,command);assert.deepEqual(a.state.actors,b.state.actors);assert.deepEqual(a.state.events,b.state.events);assert.equal(a.state.actors[0].ap,1);});
test('healing cannot heal enemies or overheal and subtracts the right cost',()=>{const s=fresh();s.selectedId='actor.lin-zhi';s.actors[0].hp=34;assert.equal(inspectAction(s,catalog,{type:'skill',targetId:'actor.guard-blade'}).ok,false);const r=applyCommand(s,catalog,{type:'skill',targetId:'actor.chen-siming'});assert.ok(r.ok);assert.equal(r.state.actors[0].hp,38);assert.equal(r.state.actors[1].ap,1);assert.equal(r.state.events[0].amount,4);});
test('guard, enemy round and renewed AP leave positions valid',()=>{let s=applyCommand(fresh(),catalog,{type:'guard'}).state;assert.ok(s.actors[0].guard);s=applyCommand(s,catalog,{type:'end'}).state;assert.equal(s.round,2);assert.equal(s.phase,'party');assert.ok(s.actors.filter(a=>a.side==='party').every(a=>a.ap===3&&!a.guard));const positions=s.actors.filter(a=>a.hp>0).map(a=>a.position.join(','));assert.equal(positions.length,new Set(positions).size);});
test('victory, defeat and retreat finish once without lethal NPC deletion',()=>{const s=fresh();s.actors[0].position=[6,4];s.actors.filter(a=>a.side==='enemy').forEach(a=>a.hp=0);s.actors[4].hp=1;const won=applyCommand(s,catalog,{type:'skill',targetId:'actor.guard-blade'});assert.equal(won.state.result,'victory');assert.equal(won.state.worldKe,41);assert.equal(applyCommand(won.state,catalog,{type:'end'}).ok,false);const r=applyCommand(fresh(),catalog,{type:'retreat',actorId:'actor.lin-zhi'});assert.equal(r.state.result,'retreat');assert.equal(r.state.actors.length,7);const d=fresh();d.actors.filter(a=>a.side==='party').forEach(a=>a.hp=1);for(let i=0;i<8&&d.phase!=='finished';i++)Object.assign(d,applyCommand(d,catalog,{type:'end'}).state);assert.equal(d.result,'defeat');});
test('exploration moves cost no battle AP and does not enable attacks',()=>{const s=createSession(catalog),r=applyCommand(s,catalog,{type:'move',target:[5,5]});assert.ok(r.ok);assert.equal(r.state.actors[0].ap,3);assert.equal(r.state.worldKe,40);assert.equal(inspectAction(s,catalog,{type:'skill',targetId:'actor.guard-blade'}).ok,false);});
test('record format rejects corruption and restores authoritative definition data',()=>{const s=fresh();assert.throws(()=>restoreSession('bad',catalog));const p=JSON.parse(exportSession(s));p.state.actors[0].strength=999;p.state.map.blocked=[];const recovered=restoreSession(JSON.stringify(p),catalog);assert.equal(recovered.actors[0].strength,7);assert.deepEqual(recovered.map.blocked,s.map.blocked);p.state.actors[0].hp=999;assert.throws(()=>restoreSession(JSON.stringify(p),catalog));});
test('duplicate actors, overlapping living units and malformed positions reject import',()=>{for(const mutate of [p=>p.state.actors[1].id=p.state.actors[0].id,p=>p.state.actors[1].position=p.state.actors[0].position,p=>p.state.actors[0].position=[2.1,4]]){const p=JSON.parse(exportSession(fresh()));mutate(p);assert.throws(()=>restoreSession(JSON.stringify(p),catalog));}});
test('Tiled object subset is editable without touching runtime and rejects unknown classes',()=>{const t={type:'map',orientation:'orthogonal',tilewidth:64,tileheight:64,layers:[{type:'objectgroup',objects:[{id:1,type:'spawn',x:128,y:256,properties:[{name:'stableId',value:'object.hero-spawn'}]}]}]};assert.deepEqual(importTiledObjects(t).objects[0].cell,[2,4]);t.layers[0].objects[0].type='unknown';assert.equal(importTiledObjects(t).ok,false);});
test('a complete four-member battle can be played to victory using public commands',()=>{
 let s=fresh();for(let turn=0;turn<30&&s.phase!=='finished';turn++){
  for(const id of s.actors.filter(a=>a.side==='party').map(a=>a.id)){
   for(let step=0;step<3&&s.phase!=='finished';step++){
    const a=s.actors.find(a=>a.id===id);if(a.hp<=0||a.ap<=0)break;
    const targets=s.actors.filter(t=>t.hp>0&&t.side!==a.side);
    const attack=targets.map(t=>({type:'skill',actorId:id,targetId:t.id})).find(c=>inspectAction(s,catalog,c).ok);
    if(attack){s=applyCommand(s,catalog,attack).state;continue;}
    const heal=s.actors.filter(t=>t.side==='party'&&t.hp>0&&t.hp<t.maxHp).map(t=>({type:'skill',actorId:id,targetId:t.id})).find(c=>inspectAction(s,catalog,c).ok);
    if(heal){s=applyCommand(s,catalog,heal).state;continue;}
    const options=[];for(let y=0;y<7;y++)for(let x=0;x<10;x++){const c={type:'move',actorId:id,target:[x,y]},v=inspectAction(s,catalog,c);if(v.ok&&v.cost<=1)options.push({c,d:Math.min(...targets.map(t=>Math.abs(t.position[0]-x)+Math.abs(t.position[1]-y)))});}
    options.sort((a,b)=>a.d-b.d);if(options.length)s=applyCommand(s,catalog,options[0].c).state;else break;
   }
  }
  if(s.phase!=='finished')s=applyCommand(s,catalog,{type:'end'}).state;
 }assert.equal(s.result,'victory');assert.ok(s.round<30);
});
