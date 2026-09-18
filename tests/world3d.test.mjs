import test from 'node:test';
import assert from 'node:assert/strict';
import { TEMPLE_OBJECTS } from '../web/temple-exploration.mjs';
import { TEMPLE_ANCHORS, AREA_SPAWNS, TEMPLE_COLLIDERS, canWalk, slideMove, findWalkPath, templeAreaAt } from '../web/world3d-layout.mjs';
import { buildWorld, createPalette, createCharacter, updateActors, disposeWorld } from '../web/world3d-models.mjs';

test('3D temple gives every rule object a finite anchor and reachable area spawn',()=>{
  for(const object of TEMPLE_OBJECTS){assert.equal(TEMPLE_ANCHORS[object.id]?.length,3,object.id);assert.ok(TEMPLE_ANCHORS[object.id].every(Number.isFinite));}
  for(const [area,[x,,z]] of Object.entries(AREA_SPAWNS)){assert.ok(canWalk(x,z),area);assert.equal(templeAreaAt(x,z),area);}
});
test('movement cannot tunnel through a wall or leave the clearing',()=>{
  assert.ok(!canWalk(NaN,0));
  const bounds=[-13,13,-17,17],result=slideMove({x:5,z:1},{x:16,z:0},TEMPLE_COLLIDERS,bounds);
  assert.ok(result.x<6.9);assert.ok(canWalk(result.x,result.z));
  const edge=slideMove({x:0,z:15},{x:0,z:30},TEMPLE_COLLIDERS,bounds);assert.ok(edge.z<=16.7);
});
test('click walking reaches each temple area through the rear doorway',()=>{
  const start={x:1.8,z:3.8},bounds=[-13,13,-17,17];
  for(const area of ['forecourt','rear']){
    const [x,,z]=AREA_SPAWNS[area],path=findWalkPath(start,{x,z},TEMPLE_COLLIDERS,bounds);
    assert.ok(path.length>0,area);assert.ok(path.every(p=>canWalk(p.x,p.z)),area);assert.equal(templeAreaAt(path.at(-1).x,path.at(-1).z),area);
  }
});
test('all six scene families build finite bounded geometry and release cleanly',()=>{
  const palette=createPalette();
  for(const id of ['ruined_temple','purple_gold_river','shen_side_gate','shen_danroom','qinhuai_fish_market','east_road']){
    const world=buildWorld({id},palette);let meshes=0,triangles=0;
    world.root.updateMatrixWorld(true);
    world.root.traverse(o=>{if(!o.isMesh)return;meshes++;assert.ok(o.matrixWorld.elements.every(Number.isFinite),id);assert.ok(o.geometry.attributes.position.array.every(Number.isFinite),id);triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3*(o.count||1);});
    assert.ok(meshes>20);assert.ok(triangles<80000,`${id}: ${triangles}`);disposeWorld(world,palette);
  }
});
test('NPC appearance follows revealed narrative actors without retaining hidden identities',()=>{
  const p=createPalette(),world=buildWorld({id:'ruined_temple'},p),actor={id:'green_lady',kind:'lady',label:'青衣妇人'};
  updateActors(world,p,{id:'ruined_temple',actors:[actor]});assert.equal(world.npcs.size,1);assert.equal(world.npcs.get(actor.id).visible,true);
  updateActors(world,p,{id:'ruined_temple',actors:[]});assert.equal(world.npcs.get(actor.id).visible,false);
  const player=createCharacter(p);assert.equal(player.userData.arms.length,2);assert.equal(player.userData.legs.length,2);disposeWorld(world,p);
});
