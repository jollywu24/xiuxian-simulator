import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,reduce,combat,validateSave,battlePath,distance} from '../web/demos/jiangnan-hd2d/src/rules.mjs';
import {TARGETS,walkable,groundHeight,findPath,canStep} from '../web/demos/jiangnan-hd2d/src/world.mjs';
test('HD2D navigation reaches every interaction through legal ground and bridge',()=>{
 for(const scene of ['town','inn']){let p=scene==='town'?{x:-4,z:5}:{x:0,z:4};for(const target of TARGETS.filter(t=>t.scene===scene)){assert.ok(walkable(target.x,target.z,scene),target.id);const path=findPath(p,target,scene);assert.ok(path.length,`${scene}/${target.id}`);for(const next of path){assert.ok(canStep(p,next,scene));p=next;}}}
 assert.equal(walkable(6,5),false);assert.equal(walkable(6,0),true);assert.ok(groundHeight(6.5,0)>groundHeight(3,0));assert.ok(groundHeight(1,12)<groundHeight(0,5));assert.equal(canStep({x:2,z:5},{x:11,z:5}),false);
});
function questReady(){let s=initialState();for(const a of ['accept','rope','tag','confirm'])s=reduce(s,a).state;return s;}
test('HD2D quest requires evidence and pays reward exactly once, branches change relations',()=>{
 const start=initialState();assert.deepEqual(reduce(start,'confirm').state,start);assert.equal(reduce(start,'rope').state.clues.length,0);
 let s=questReady();assert.equal(s.quest,3);assert.equal(reduce(s,'rope').state.clues.length,2);s.quest=5;s=reduce(s,'recover').state;
 const paid=reduce(s,'deliver','accept').state,kind=reduce(s,'deliver','decline').state;assert.equal(paid.coins,90);assert.equal(kind.coins,60);assert.equal(kind.reputation,3);assert.deepEqual(reduce(paid,'deliver','accept').state,paid);assert.equal(validateSave(paid).quest,7);
});
test('HD2D battle validates movement, range, occupied cells and can be won without state injection',()=>{
 let s=reduce(questReady(),'fight').state;assert.deepEqual(combat(s,'attack','a').state,s);assert.deepEqual(combat(s,'move',{x:9,z:4}).state,s);
 s=combat(s,'move',{x:3,z:3}).state;assert.equal(s.battle.moved,true);assert.deepEqual(combat(s,'move',{x:4,z:3}).state,s);
 for(let i=0;i<30&&s.battle;i++){
  const b=s.battle,h=b.hero,e=b.enemies.filter(e=>e.hp>0).sort((a,c)=>distance(h,a)-distance(h,c))[0];
  if(distance(h,e)>1&&!b.moved){const cells=[];for(let x=0;x<8;x++)for(let z=0;z<6;z++){const cell={x,z};if(battlePath(b,cell).length)cells.push(cell);}cells.sort((a,c)=>distance(a,e)-distance(c,e));if(cells.length)s=combat(s,'move',cells[0]).state;}
  const d=distance(s.battle.hero,e);s=combat(s,s.hp<45&&s.medicine?'medicine':d<=2&&s.mp>=12?'skill':d<=1?'attack':'defend',e.id).state;
 }
 assert.equal(s.quest,5);assert.equal(s.battle,null);assert.ok(s.hp>0);
});
test('HD2D damaged saves rejected, unsafe coordinates repaired, combat reload returns safe checkpoint',()=>{
 const s=initialState();assert.throws(()=>validateSave({...s,coins:-1}));assert.throws(()=>validateSave({...s,quest:7}));assert.throws(()=>validateSave({...s,clues:['tag','tag']}));assert.deepEqual(validateSave({...s,position:{x:6,z:5}}).position,s.position);
 const battle=reduce(questReady(),'fight').state;assert.equal(validateSave(battle).quest,3);assert.equal(validateSave(battle).battle,null);assert.deepEqual(validateSave(battle).position,{x:13,z:1});
});
test('HD2D shopping and medicine alter real resources with bounds',()=>{let s=reduce(initialState(),'buy').state;assert.equal(s.coins,18);assert.equal(s.medicine,2);s=reduce(s,'buy').state;assert.equal(s.coins,6);assert.equal(reduce(s,'buy').state.medicine,3);s.hp=115;s=reduce(s,'heal').state;assert.equal(s.hp,120);assert.equal(s.medicine,2);});
