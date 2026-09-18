import * as T from './vendor/three/three.module.js';
import { TEMPLE_ANCHORS, TEMPLE_COLLIDERS, objectAnchor, worldKind } from './world3d-layout.mjs?v=20260910.1';

const mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.86,...Object.fromEntries(Object.entries(extra).filter(([,v])=>v!==undefined))});
export function createPalette(textures={}) {
  return {
    stone:mat(0xa1aeb3,{map:textures.stone,roughness:.64}), wall:mat(0x798889,{map:textures.stone}),
    wood:mat(0xa39181,{map:textures.wood}), darkWood:mat(0x332820,{map:textures.wood}),
    roof:mat(0x263c48,{roughness:.58}), trim:mat(0x647e7d), earth:mat(0x223c3c),
    moss:mat(0x47614b), leaves:mat(0x2e5b53), bamboo:mat(0x56745b),
    metal:mat(0x80714c,{metalness:.65,roughness:.44}), cloth:mat(0x9e9274),
    light:mat(0xfbd59b,{emissive:0xffb45a,emissiveIntensity:2.2}),
    coal:mat(0x272322), flame:mat(0xffc76b,{emissive:0xff6d20,emissiveIntensity:3,transparent:true,opacity:.86}),
    blood:mat(0x492a29), water:mat(0x21434c,{metalness:.45,roughness:.21,transparent:true,opacity:.93}),
  };
}
export function mesh(parent,geometry,material,x=0,y=0,z=0) {
  const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
const box=(p,m,w,h,d,x=0,y=0,z=0)=>mesh(p,new T.BoxGeometry(w,h,d),m,x,y,z);
const cylinder=(p,m,rt,rb,h,x=0,y=0,z=0,n=12)=>mesh(p,new T.CylinderGeometry(rt,rb,h,n),m,x,y,z);
const sphere=(p,m,r,x=0,y=0,z=0)=>mesh(p,new T.SphereGeometry(r,12,8),m,x,y,z);
function beam(p,m,a,b,r=.1) {
  const av=new T.Vector3(...a),bv=new T.Vector3(...b),mid=av.clone().add(bv).multiplyScalar(.5);
  const o=cylinder(p,m,r,r,av.distanceTo(bv),...mid.toArray(),8);
  o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize());return o;
}
function seeded(seed=927) {let s=seed;return()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296;};}

export function createCharacter(palette,{color=0x46616b,female=false,porter=false,hat=false}={}) {
  const root=new T.Group(),body=new T.Group();root.add(body);
  const robe=mat(color),dark=mat(0x182b30),skin=mat(0xc79c76),hair=mat(0x172124),sash=mat(0xbca17b);
  cylinder(body,robe,.27,.45,.75,0,.76,0,10);
  const torso=cylinder(body,robe,.31,.27,.6,0,1.4,0,10);torso.scale.z=.7;
  const collar=box(body,sash,.09,.47,.04,-.09,1.47,.235);collar.rotation.z=-.53;
  const lapel=box(body,dark,.07,.43,.035,.06,1.44,.255);lapel.rotation.z=.55;
  cylinder(body,dark,.29,.29,.13,0,1.11,0,10).scale.z=.8;
  box(body,sash,.14,.12,.09,.07,1.12,.24);
  cylinder(body,skin,.10,.11,.16,0,1.79,0,8);
  const head=sphere(body,skin,.235,0,2,0);head.scale.set(.85,1.15,.88);
  const crown=sphere(body,hair,.24,0,2.11,-.025);crown.scale.set(.9,.7,.88);
  sphere(body,hair,female?.135:.115,0,2.34,-.065);
  box(body,sash,.25,.035,.045,0,2.29,-.05);
  if(female) {cylinder(body,hair,.13,.18,.6,0,1.9,-.18,8);box(body,robe,.15,.6,.025,.12,.72,.35);}
  else {const tail=box(body,hair,.16,.33,.10,0,1.9,-.21);tail.rotation.x=-.1;}
  for(const x of [-.085,.085])box(body,dark,.04,.021,.017,x,2.035,.192);
  if(hat)cylinder(body,palette.cloth,0,.55,.22,0,2.3,0,16);
  const arms=[],legs=[];
  for(const sign of [-1,1]) {
    const arm=new T.Group();arm.position.set(sign*.35,1.64,0);body.add(arm);arm.rotation.z=sign*.10;
    cylinder(arm,robe,.15,.19,.46,sign*.04,-.2,0,8);
    cylinder(arm,robe,.13,.11,.32,sign*.06,-.53,.01,8);
    sphere(arm,skin,.09,sign*.06,-.74,.02);arms.push(arm);
    const leg=new T.Group();leg.position.set(sign*.17,.57,0);body.add(leg);
    cylinder(leg,dark,.12,.095,.42,0,-.18,0,8);box(leg,dark,.21,.15,.4,0,-.47,.065);legs.push(leg);
  }
  const sheath=box(body,dark,.12,1.15,.14,-.42,.9,-.19);sheath.rotation.z=-.25;
  const hilt=box(body,palette.metal,.27,.055,.2,-.57,1.46,-.19);hilt.rotation.z=-.25;
  if(porter){body.rotation.z=Math.PI/2;body.position.set(.75,.5,0);box(body,palette.cloth,.34,.16,.31,.37,1.2,0);}
  root.userData={arms,legs,body,porter};return root;
}

function roof(parent,p,width,depth,y,cutaway=false) {
  const g=new T.Group();parent.add(g);
  // Curved eaves are real surface geometry; tile courses follow the same profile.
  const profile=t=>y+2.25*(1-t)**1.5+.45*t**7;
  const tiles=[];
  for(const sign of [-1,1]) {
    const positions=[],uv=[],indices=[],steps=10;
    for(let j=0;j<=steps;j++)for(let k=0;k<=1;k++) {
      const t=j/steps;positions.push((k-.5)*(width+1.5),profile(t),sign*t*(depth/2+1));uv.push(k*3,t*2);
    }
    for(let j=0;j<steps;j++){const a=j*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
    const material=p.roof.clone();material.side=T.DoubleSide;const slab=mesh(g,geo,material);tiles.push(slab);
    for(let x=-width/2;x<=width/2+.01;x+=.52) {
      const path=[];for(let j=0;j<=steps;j++){const t=j/steps;path.push(new T.Vector3(x,profile(t)+.045,sign*t*(depth/2+1)));}
      const rib=mesh(g,new T.TubeGeometry(new T.CatmullRomCurve3(path),10,.046,5,false),material);tiles.push(rib);
    }
    beam(g,p.trim,[-width/2-.8,profile(1),sign*(depth/2+1)],[width/2+.8,profile(1),sign*(depth/2+1)],.13);
  }
  beam(g,p.trim,[-width/2-1,y+2.3,0],[width/2+1,y+2.3,0],.15);
  for(const side of [-1,1]) {
    beam(g,p.trim,[side*(width/2+.8),y+2.3,0],[side*(width/2+1.3),y+3,0],.13);
    const fin=sphere(g,p.trim,.17,side*(width/2+1.22),y+2.94,0);fin.scale.y=1.6;
  }
  g.userData.cutaway=cutaway;return g;
}
function lantern(parent,p,x,y,z,lights=false) {
  const g=new T.Group();g.position.set(x,y,z);parent.add(g);
  beam(g,p.darkWood,[0,.35,0],[0,.9,0],.028);
  cylinder(g,p.light,.25,.25,.52,0,0,0,10);
  for(const h of [-.29,.29])cylinder(g,p.darkWood,.30,.30,.08,0,h,0,10);
  for(let i=0;i<6;i++){let a=i/6*Math.PI*2;beam(g,p.wood,[Math.cos(a)*.26,-.25,Math.sin(a)*.26],[Math.cos(a)*.26,.25,Math.sin(a)*.26],.02);}
  beam(g,p.metal,[0,-.33,0],[0,-.55,0],.02);
  if(lights){const light=new T.PointLight(0xffbb6b,7,8,2);g.add(light);}return g;
}
function table(parent,p,x,z) {
  const g=new T.Group();g.position.set(x,0,z);parent.add(g);
  box(g,p.wood,2.5,.17,1.3,0,1.34,0);
  for(const a of [-1,1])for(const b of [-.45,.45])box(g,p.darkWood,.14,1.25,.14,a,.63,b);
  box(g,p.wood,2.3,.3,.1,0,1.1,.52);return g;
}
function urn(parent,p,x,z,scale=1) {
  const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(scale);parent.add(g);
  const points=[[.34,0],[.47,.12],[.57,.55],[.46,.85],[.33,.95],[.35,1.02]].map(a=>new T.Vector2(...a));
  mesh(g,new T.LatheGeometry(points,14),p.wall);cylinder(g,p.water,.31,.31,.02,0,.93,0);return g;
}
function crate(parent,p,x,z,scale=1) {
  const g=new T.Group();g.position.set(x,.38*scale,z);g.scale.setScalar(scale);parent.add(g);
  box(g,p.darkWood,1,.75,.8);
  for(const x of [-.4,.4]){box(g,p.metal,.075,.81,.84,x);}
  box(g,p.metal,.14,.15,.05,0,.12,.43);return g;
}

function vegetation(root,p,random,kind) {
  const dummy=new T.Object3D(),stems=[],leaves=[];
  for(let i=0;i<100;i++) {
    const side=i%2?-1:1,x=side*(16+random()*14),z=(random()-.55)*55,h=4+random()*7;
    stems.push([x,h/2,z,h]);
    for(let j=0;j<4;j++)leaves.push([x+(random()-.5)*2,h*.5+j*.7,z+(random()-.5)*2,1.2+random()]);
  }
  const stalks=new T.InstancedMesh(new T.CylinderGeometry(.055,.09,1,5),p.bamboo,stems.length);
  stems.forEach(([x,y,z,h],i)=>{dummy.position.set(x,y,z);dummy.scale.set(1,h,1);dummy.rotation.set(0,0,(random()-.5)*.10);dummy.updateMatrix();stalks.setMatrixAt(i,dummy.matrix);});root.add(stalks);
  const foliage=new T.InstancedMesh(new T.OctahedronGeometry(1,0),p.leaves,leaves.length);
  leaves.forEach(([x,y,z,s],i)=>{dummy.position.set(x,y,z);dummy.scale.set(s,.18,s*.45);dummy.rotation.set(0,random()*Math.PI,(random()-.5)*.35);dummy.updateMatrix();foliage.setMatrixAt(i,dummy.matrix);});root.add(foliage);
  const stones=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),p.wall,64);
  for(let i=0;i<64;i++){let s=.2+random()*.8;dummy.position.set((i%2?-1:1)*(13+random()*13),s*.3,(random()-.5)*43);dummy.scale.set(s,s*.7,s*.8);dummy.rotation.set(random(),random(),random());dummy.updateMatrix();stones.setMatrixAt(i,dummy.matrix);}root.add(stones);
  for(let i=0;i<10;i++) {
    const x=(i-4.5)*15,z=-47-random()*24,h=10+random()*20;
    const mountain=mesh(root,new T.ConeGeometry(10+random()*9,h,5),mat(0x233e4b),x,h/2-1,z);
    mountain.rotation.y=random()*3;
  }
  // Instanced clumps soften the edges of the walkable clearing.
  const grass=new T.InstancedMesh(new T.ConeGeometry(.12,.65,3),p.moss,210);
  for(let i=0;i<210;i++){dummy.position.set((i%2?-1:1)*(11+random()*8),.15,(random()-.5)*40);dummy.scale.set(1,random()+.4,1);dummy.rotation.set(.15,random()*6,.1);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);}root.add(grass);
}

function temple(root,p,random,model) {
  box(root,p.stone,15,.22,13,0,-.09,0);
  for(let i=0;i<4;i++)box(root,p.stone,5-i*.25,.12,1.1,0,-.25-i*.03,7+i*.65);
  for(const x of [-6.7,0,6.7])for(const z of [-5.4,5.4]) {
    cylinder(root,p.stone,.39,.46,.30,x,.15,z);cylinder(root,p.wood,.22,.29,4.7,x,2.6,z);
    box(root,p.wood,.65,.20,.65,x,4.82,z);box(root,p.wood,.92,.18,.9,x,5,z);
  }
  for(const z of [-5.4,5.4])box(root,p.wood,14.6,.34,.34,0,5.15,z);
  for(const x of [-6.7,0,6.7])box(root,p.darkWood,.24,.3,12,x,5.3,0);
  for(let x=-6.5;x<7;x+=1.2) {
    beam(root,p.darkWood,[x,5.4,-5.5],[x,7.4,0],.09);
    beam(root,p.darkWood,[x,7.4,0],[x,5.4,5.5],.09);
  }
  for(const x of [-4.4,4.4])box(root,p.wall,5.5,2.1,.45,x,1.05,-6.1);
  box(root,p.wall,.48,1.1,12,-7.25,.55,0);box(root,p.wall,.48,1.1,12,7.25,.55,0);
  const tiles=roof(root,p,14.7,11.5,5.25,true);model.roofs.push(tiles);
  // The forecourt gate is distinct from the hall entrance.
  for(const x of [-2.3,2.3]) {box(root,p.stone,.7,3,.7,x,1.5,12.6);box(root,p.wood,.45,2.9,.42,x,1.5,12.6);}
  const gate=new T.Group();gate.position.z=12.6;root.add(gate);roof(gate,p,5.4,1.6,3.1);
  box(root,p.darkWood,2.1,.58,.18,0,3.15,12.1);
  for(const x of [-2,2])lantern(root,p,x,2.65,11.95,true);
  for(let i=0;i<15;i++) {const r=mesh(root,new T.BoxGeometry(.65,.4,.45),p.wall,-9+(random()-.5)*2,.15+random()*.65,7.5+(random()-.5)*2);r.rotation.set(random()*.4,random()*3,random()*.2);model.rubble.push(r);}
  const window=new T.Group();root.add(window);window.position.set(7.2,2.4,4.2);
  for(const y of [-.8,.8])box(window,p.wood,.12,.13,1.5,0,y,0);
  for(const z of [-.7,0,.7])box(window,p.darkWood,.1,1.6,.07,0,0,z);
  const brace=beam(window,p.wood,[.1,-.8,-.7],[.1,.8,.7],.08);model.brace=brace;
  const offering=table(root,p,-3.8,-2.8);
  const peach=mat(0xc98776);for(const [x,z] of [[-.55,.1],[-.2,-.15],[.1,.12],[.4,-.1]]){const fruit=sphere(offering,peach,.14,x,1.59,z);fruit.scale.y=.93;}
  cylinder(offering,p.metal,.24,.16,.2,.65,1.54,.1,12);
  const rack=new T.Group();root.add(rack);rack.position.set(-3.8,.6,-.6);box(rack,p.wood,1.9,.11,.8);
  for(const x of [-.8,.8])box(rack,p.darkWood,.12,.65,.12,x,-.25,0);model.rack=rack;
  cylinder(root,p.wall,.8,.95,.45,-5.8,.23,-4,8);
  cylinder(root,p.wall,.34,.69,1.45,-5.8,1.16,-4,10);
  box(root,p.wall,1.1,.48,.6,-5.8,1.7,-4); // broken headless stone statue
  for(let i=0;i<11;i++){const wood=cylinder(root,p.darkWood,.15,.18,2.4,-4.7+(i%3)*.23,.18+Math.floor(i/3)*.24,-10+(i%3)*.28,7);wood.rotation.z=Math.PI/2;}
  for(let row=0;row<4;row++)for(let col=0;col<5;col++)box(root,p.wall,.55,.4,.4,1.2+col*.57+(row%2)*.12,.2+row*.42,-13.5);
  model.casket=crate(root,p,2.4,-12.7,.65);model.casket.visible=false;
  urn(root,p,5.6,-12.5,.9);beam(root,p.darkWood,[4.7,3.5,-12.6],[7,3.5,-12.6],.13);
  for(let i=0;i<3;i++)beam(root,p.cloth,[5.25+i*.16,3.58,-12.42],[5.32+i*.16,3.3,-12.42],.014);
  for(let i=0;i<7;i++){const stain=cylinder(root,p.blood,.10+random()*.15,.1,.008,5+random()*.8,.022,-7-i*.6,7);stain.scale.z=1.6;}
  for(let i=0;i<7;i++){const print=box(root,p.earth,.18,.014,.33,3.5+(i%2)*.3,.035,8+i*.48);print.rotation.y=-.1;}
  const fire=new T.Group();fire.position.set(.2,0,2.8);root.add(fire);
  for(let i=0;i<8;i++){let a=i/8*Math.PI*2;sphere(fire,p.wall,.18,Math.cos(a)*.72,.1,Math.sin(a)*.72);}
  for(let i=0;i<4;i++){const log=cylinder(fire,p.coal,.11,.14,1.2,0,.15,0,7);log.rotation.set(Math.PI/2,i*.85,0);}
  const flames=new T.Group();fire.add(flames);
  for(let i=0;i<5;i++){const f=mesh(flames,new T.IcosahedronGeometry(.22,1),p.flame,(random()-.5)*.4,.43,(random()-.5)*.4);f.scale.set(.8,2+random(),.8);}
  const light=new T.PointLight(0xffab52,18,15,2);light.position.set(0,1.1,0);fire.add(light);
  model.fire={root:fire,flames,light};
  lantern(root,p,-5.9,3.9,-4.4,true);lantern(root,p,5.9,3.9,-4.4,true);
}

function river(root,p,model) {
  box(root,p.stone,15,.35,30,-6,-.15,0);
  const water=box(root,p.water,40,.10,62,19,-.32,-8);model.water=water;
  for(let i=0;i<5;i++)box(root,p.stone,3.5,.12,1.0,2.2,-.04-i*.06,4+i*.7);
  for(let i=0;i<13;i++){box(root,p.wood,4,.14,.55,6,.05,-3+i*.56);}
  for(const x of [4.5,7.5])for(const z of [-3,3])cylinder(root,p.darkWood,.15,.18,1.8,x,.4,z,8);
  const boat=new T.Group();boat.position.set(9,-.10,1);root.add(boat);
  const hull=cylinder(boat,p.darkWood,.9,.6,1,0,0,0,6);hull.rotation.z=Math.PI/2;hull.scale.set(1,4.2,1);
  box(boat,p.wood,3.7,.12,1.1,0,.35,0);for(const x of [-1,1])box(boat,p.cloth,.3,.12,1.2,x,.5,0);
  model.boat=boat;lantern(root,p,5,2,-3,true);
  for(let i=0;i<4;i++){box(root,p.wall,.12,.4,20,-13,.3,-4);}
  // City towers on the far bank ground the river in the original Jinling setting.
  for(let i=0;i<6;i++){const g=new T.Group();g.position.set(25+i*5,0,-23);g.scale.setScalar(.65);root.add(g);box(g,p.wall,4,7,4,0,3.5,0);roof(g,p,4.5,4,7);}
  model.colliders=[];model.bounds=[-12,2,-14,15];
}

function manor(root,p,model) {
  box(root,p.stone,28,.25,25,0,-.1,0);
  for(const x of [-9,9])box(root,p.wall,10,3.5,.8,x,1.75,-6);
  for(const x of [-3.8,3.8])box(root,p.wood,.55,5,.6,x,2.5,-6);
  const hall=new T.Group();hall.position.z=-6;root.add(hall);roof(hall,p,10,5,4.8);
  for(const x of [-2.6,2.6]){const door=box(root,p.wood,2.3,3.8,.23,x,1.9,-6);door.rotation.y=x>0?-.48:.48;}
  for(const x of [-3.4,3.4])lantern(root,p,x,3.4,-4.5,true);
  for(const x of [-6,6]){box(root,p.stone,1.5,.7,1.7,x,.35,-2);const lion=sphere(root,p.wall,.65,x,1.2,-2);lion.scale.set(.7,1.1,1.1);sphere(root,p.wall,.42,x,1.83,-1.6);}
  for(const x of [-11,11]){const side=new T.Group();side.position.set(x,0,2);root.add(side);box(side,p.wall,4.5,3,11,0,1.5,0);roof(side,p,5,11,3);}
  crate(root,p,-7,6);crate(root,p,-8.3,5,1.2);urn(root,p,7,5);
  model.colliders=[[-14,-4,-6.5,-5.5],[4,14,-6.5,-5.5],[-13,-8,-4,9],[8,13,-4,9]];model.bounds=[-14,14,-4.5,14];
}
function danroom(root,p,model) {
  box(root,p.stone,27,.2,23,0,-.08,0);
  box(root,p.wall,26,3.9,.55,0,1.95,-9);
  for(const x of [-10,10])for(const z of [-7,7]){cylinder(root,p.wood,.24,.3,5,x,2.5,z);lantern(root,p,x,4.4,z,true);}
  for(const x of [-6,0,6])beam(root,p.darkWood,[x,5,-9],[x,5,8],.2);
  for(const z of [-7,7])box(root,p.wood,22,.35,.3,0,5,z);
  const furnace=new T.Group();furnace.position.set(-3,0,-2);root.add(furnace);
  const bronze=mat(0x577569,{metalness:.75,roughness:.4});
  for(const x of [-.65,.65])for(const z of [-.55,.55])cylinder(furnace,bronze,.12,.18,.8,x,.4,z,8);
  const belly=sphere(furnace,bronze,1.1,0,1.65,0);belly.scale.y=1.2;
  cylinder(furnace,bronze,.65,.85,.24,0,2.67,0);cylinder(furnace,bronze,0,.8,.55,0,3.04,0);sphere(furnace,p.metal,.16,0,3.4,0);
  cylinder(furnace,p.flame,.58,.72,.33,0,.72,0);const light=new T.PointLight(0xffad55,18,12);light.position.set(-3,1,-2);root.add(light);
  for(const x of [-7,0,7]){box(root,p.darkWood,4,3.5,.9,x,1.75,-8.5);for(let row=0;row<5;row++)for(let col=0;col<5;col++){box(root,p.wood,.73,.59,.12,x-1.53+col*.77,.43+row*.63,-7.95);box(root,p.metal,.13,.05,.06,x-1.53+col*.77,.43+row*.63,-7.87);}}
  table(root,p,4,1);urn(root,p,-7,2,1.2);for(let i=0;i<4;i++)urn(root,p,5+i*.6,-7,.35);
  model.colliders=[[-4.4,-1.6,-3.4,-.6],[2.6,5.4,.2,1.8],[-11,11,-9,-7.5]];model.bounds=[-10,10,-6.5,9];
}
function street(root,p,model,road=false) {
  box(root,p.stone,road?9:13,.16,36,0,-.06,0);
  if(!road)for(const x of [-10,10])for(const z of [-10,3,16]) {
    const house=new T.Group();house.position.set(x,0,z);root.add(house);
    box(house,p.wall,7,4,9,0,2,0);roof(house,p,7.5,9,4);
    for(const i of [-2,0,2])box(house,p.darkWood,.12,3.7,.14,i,2,4.58);
    const sign=x>0?-1:1;lantern(root,p,x+sign*3.8,2.8,z+2,true);
  }
  for(const x of [-5,5]){const stall=table(root,p,x,1);box(stall,p.cloth,3,.1,2,0,3,0);for(const side of [-1.2,1.2])box(stall,p.darkWood,.1,3,.1,side,1.5,.65);crate(root,p,x,3.3,.65);}
  if(road){crate(root,p,4,0,.8);const porter=createCharacter(p,{color:0x746047,porter:true});porter.position.set(-3,0,0);root.add(porter);}
  model.colliders=road?[]:[[-14,-6.5,-16,20],[6.5,14,-16,20],[-6.4,-3.6,.2,1.8],[3.6,6.4,.2,1.8]];model.bounds=[-6.5,6.5,-14,15];
}

export function buildWorld(scene,p) {
  const root=new T.Group(),kind=worldKind(scene.id),random=seeded(73);
  const model={root,kind,colliders:[...TEMPLE_COLLIDERS],bounds:[-13,13,-17,17],roofs:[],rubble:[],npcs:new Map(),anchors:new Map(),fire:null};
  box(root,p.earth,110,.4,100,0,-.35,-8);
  vegetation(root,p,random,kind);
  if(kind==='temple')temple(root,p,random,model);
  if(kind==='river')river(root,p,model);
  if(kind==='manor')manor(root,p,model);
  if(kind==='danroom')danroom(root,p,model);
  if(kind==='street'||kind==='road')street(root,p,model,kind==='road');
  return model;
}
export function updateActors(model,p,scene) {
  const active=new Set((scene.actors||[]).map(a=>a.id));
  for(const [id,npc] of model.npcs)npc.visible=active.has(id);
  for(const [i,actor] of (scene.actors||[]).entries()) {
    let npc=model.npcs.get(actor.id);
    if(!npc){npc=createCharacter(p,{color:actor.kind==='lady'?0x38797a:actor.kind==='enemy'?0x302e31:0x796b56,female:['lady','ally'].includes(actor.kind),porter:actor.kind==='porter',hat:actor.kind==='fisher'});model.npcs.set(actor.id,npc);model.root.add(npc);}
    const pos=objectAnchor(scene,actor,i);npc.position.set(pos[0],0,pos[2]);npc.rotation.y=.35;npc.visible=true;
  }
}
export function disposeWorld(model,palette) {
  const shared=new Set(Object.values(palette)),geos=new Set(),mats=new Set();
  model.root.traverse(o=>{if(o.geometry)geos.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])if(!shared.has(m))mats.add(m);});
  geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());model.root.removeFromParent();
}
