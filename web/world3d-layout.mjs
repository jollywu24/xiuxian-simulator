// Presentation-only world coordinates. Narrative state remains in wudao-app.
export const TEMPLE_ANCHORS = Object.freeze({
  doorway: [0, 1.3, 12.5], rain_tracks: [3.7, .15, 10],
  broken_window: [7.2, 2.3, 4.2], collapsed_wall: [-9, .7, 8],
  embers: [.2, .6, 2.8], offering_table: [-3.8, 1.65, -2.8],
  incense_rack: [-3.8, .65, -.6], deity_statue: [-5.8, 2.1, -4],
  woodpile: [-4.7, 1, -10], patched_wall: [2.4, 1.6, -13.5],
  blood_trail: [5.1, .12, -9], roof_scratches: [5.6, 3.4, -12.5],
  temple_porter: [5.8, .6, -11.2], porter: [5.8, .6, -11.2], injured_porter: [5.8, .6, -11.2],
  green_lady: [2.8, 1.6, 5], medicine_casket: [2.5, .8, -12.3],
});

export const AREA_SPAWNS = Object.freeze({forecourt:[0,0,9], hall:[1.8,0,3.8], rear:[0,0,-9]});
export const TEMPLE_COLLIDERS = Object.freeze([
  [-7.6,-6.9,-6,6], [6.9,7.6,-6,6],
  [-7,-1.5,-6.3,-5.8], [1.5,7,-6.3,-5.8],
  [-6.8,-4.9,-4.8,-3.2], [-5,-2.6,-3.7,-2.2],
  [-5.7,-3.6,-10.8,-9.4], [1,4,-14,-13],
  [-1,1,1.8,3.6], [-4.8,-2.8,-1.1,-.1],
]);
export function templeAreaAt(x,z) { return z > 6.8 ? 'forecourt' : z < -6.5 ? 'rear' : 'hall'; }
export function canWalk(x,z,colliders=TEMPLE_COLLIDERS,bounds=[-13,13,-17,17],radius=.3) {
  return Number.isFinite(x)&&Number.isFinite(z)&&x>=bounds[0]+radius&&x<=bounds[1]-radius&&z>=bounds[2]+radius&&z<=bounds[3]-radius
    &&!colliders.some(([a,b,c,d])=>x>a-radius&&x<b+radius&&z>c-radius&&z<d+radius);
}
export function slideMove(from,delta,colliders,bounds) {
  let {x,z}=from;
  const count=Math.max(1,Math.ceil(Math.hypot(delta.x,delta.z)/.18));
  for(let i=0;i<count;i++) {
    if(canWalk(x+delta.x/count,z,colliders,bounds))x+=delta.x/count;
    if(canWalk(x,z+delta.z/count,colliders,bounds))z+=delta.z/count;
  }
  return {x,z};
}
// Bounded grid search for click-to-walk around walls, with no time/state effects.
export function findWalkPath(from,to,colliders,bounds) {
  const step=.65, point=(x,z)=>({x:x*step,z:z*step}), key=(x,z)=>`${x},${z}`;
  const sx=Math.round(from.x/step), sz=Math.round(from.z/step);
  let tx=Math.round(to.x/step),tz=Math.round(to.z/step);
  if(!canWalk(to.x,to.z,colliders,bounds)) {
    let nearest=null;
    for(let x=tx-4;x<=tx+4;x++)for(let z=tz-4;z<=tz+4;z++) {
      const p=point(x,z),d=Math.hypot(p.x-to.x,p.z-to.z)+.04*Math.hypot(p.x-from.x,p.z-from.z);
      if(canWalk(p.x,p.z,colliders,bounds)&&(!nearest||d<nearest.d))nearest={x,z,d};
    }
    if(!nearest)return []; ({x:tx,z:tz}=nearest);
  }
  const start={x:sx,z:sz,g:0,parent:null},open=[start],visited=new Set(); let end=null;
  while(open.length&&visited.size<3500) {
    open.sort((a,b)=>(a.g+Math.hypot(a.x-tx,a.z-tz))-(b.g+Math.hypot(b.x-tx,b.z-tz)));
    const n=open.shift(),k=key(n.x,n.z);if(visited.has(k))continue;visited.add(k);
    if(n.x===tx&&n.z===tz){end=n;break;}
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
      const p=point(n.x+dx,n.z+dz),a=point(n.x+dx,n.z),b=point(n.x,n.z+dz);
      if(!visited.has(key(n.x+dx,n.z+dz))&&canWalk(p.x,p.z,colliders,bounds)&&canWalk(a.x,a.z,colliders,bounds)&&canWalk(b.x,b.z,colliders,bounds))
        open.push({x:n.x+dx,z:n.z+dz,g:n.g+Math.hypot(dx,dz),parent:n});
    }
  }
  const result=[];while(end?.parent){result.unshift(point(end.x,end.z));end=end.parent;}return result;
}
export function worldKind(id) {
  if(id==='ruined_temple')return 'temple';
  if(['purple_gold_river','east_lake'].includes(id))return 'river';
  if(id==='shen_danroom')return 'danroom';
  if(['shen_side_gate','shen_west_courtyard'].includes(id))return 'manor';
  if(id==='east_road')return 'road';
  return 'street';
}
export function objectAnchor(scene,item,index=0) {
  if(scene.id==='ruined_temple'&&TEMPLE_ANCHORS[item.id])return [...TEMPLE_ANCHORS[item.id]];
  const known={
    water_route:[4,.4,5],land_route:[-5,.4,-9],mooring_posts:[5,1.4,-3],jinling_silhouette:[15,3,-17],wang_wu:[-.5,1.6,1],
    vermilion_gate:[0,2.2,-5.8],stone_lion:[-6,1.8,-2],medicine_crates:[-7,1.1,6],inner_courtyard:[2,.6,-4.5],
    gate_keeper:[2.5,1.6,-2],outer_steward:[2.5,1.6,-2],side_door_keeper:[2.5,1.6,-2],
    side_room:[-10,2,2],waist_token:[-1,.4,5],moon_gate:[0,2.2,-5.8],money_chest:[-7,1,6],
    pill_furnace:[-3,2.9,-2],water_basin:[-7,1.2,2],medicine_cabinet:[0,2.2,-7.8],worktable:[4,1.7,1],side_door:[9,1.7,5],blood_bowl:[4.5,1.7,1],cao_qing:[1,1.6,-1],danroom_apprentices:[5,1.6,4],
    fish_stalls:[-5,1.6,1],broker_awning:[5,2.8,1],river_steps:[0,.3,-12],old_fisher:[-5,1,3.3],fish_broker:[3,1.6,2],
    market_awning:[-5,2.8,1],tail_lamp:[6,2.8,-8],water_exit:[0,.3,-12],back_door:[0,1.5,-12],hidden_wall:[-6.5,1.7,-7],blade_case:[5,1,3.3],
    porter_wound:[-3,.7,0],scattered_cargo:[4,1,0],wet_bank:[1,.3,7],mooring_post:[5,1.4,-3],loose_skiff:[9,.7,1],
    shop_reflection:[-6.5,2,-5],river_gate:[0,2,-12],
  };
  if(known[item.id])return [...known[item.id]];
  return [(Number(item.x??50)-50)*.26, item.kind?1.5:.8, (Number(item.y??50)-55)*.28];
}
