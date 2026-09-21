import * as T from '../vendor/three-0.186.0/three.module.min.js';
import {canvasTexture,surface,makeActor,random} from './art.mjs';
import {TARGETS,groundHeight} from './world.mjs';
export class TownView {
 constructor(canvas){
  this.renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
  this.camera=new T.PerspectiveCamera(34,1,.1,180);this.scene=new T.Scene();this.scene.background=new T.Color('#b5c9bc');this.scene.fog=new T.Fog('#b5c9bc',37,100);
  this.town=new T.Group();this.inn=new T.Group();this.scene.add(this.town,this.inn);this.root=this.town;this.pool=new Map();this.materials={};this.pickables=[];this.actors=new Map();this.leaves=[];this.lamps=[];
  for(const key of ['stone','wall','wood','roof','floor']){const map=surface(key);map.wrapS=map.wrapT=T.RepeatWrapping;this.materials[key]=new T.MeshStandardMaterial({map,roughness:.95});}
  this.sky=new T.HemisphereLight('#d9e7d4','#77725c',2.05);this.scene.add(this.sky);
  this.sun=new T.DirectionalLight('#ffe1a2',3.2);this.sun.position.set(-17,28,12);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,near:1,far:85});this.sun.shadow.normalBias=.035;this.sun.shadow.bias=-.00008;this.scene.add(this.sun,this.sun.target);
  this.buildTown();this.flush();this.root=this.inn;this.buildInn();this.flush();
  this.hero=makeActor('hero');this.scene.add(this.hero.mesh);
  this.ring=new T.Mesh(new T.RingGeometry(.32,.38,40),new T.MeshBasicMaterial({color:'#d7c482',transparent:true,opacity:.7,depthWrite:false}));this.ring.rotation.x=-Math.PI/2;this.scene.add(this.ring);
  this.cursor=new T.Mesh(new T.RingGeometry(.2,.26,32),new T.MeshBasicMaterial({color:'#f5df9d',depthWrite:false}));this.cursor.rotation.x=-Math.PI/2;this.cursor.visible=false;this.scene.add(this.cursor);
  this.raycaster=new T.Raycaster();this.plane=new T.Plane(new T.Vector3(0,1,0),-1.1);this.focus=new T.Vector3(-4,1.8,5);this.grid=new T.Group();this.town.add(this.grid);this.enemies=[makeActor('guard'),makeActor('porter')];for(const a of this.enemies)this.town.add(a.mesh);
  this.slash=new T.Mesh(new T.TorusGeometry(.75,.045,4,24,Math.PI*1.3),new T.MeshBasicMaterial({color:'#d9eee0',transparent:true,opacity:.85}));this.slash.visible=false;this.scene.add(this.slash);
  this.reflectionTarget=new T.WebGLRenderTarget(512,512);this.reflectionCamera=new T.PerspectiveCamera();this.reflectionMatrix=new T.Matrix4();this.reflectionFrame=0;
  this.water.material.uniforms.reflection={value:this.reflectionTarget.texture};this.water.material.uniforms.reflectStrength={value:.32};this.water.material.uniforms.reflectionMatrix={value:this.reflectionMatrix};
  this.postTarget=new T.WebGLRenderTarget(1,1,{depthTexture:new T.DepthTexture(1,1)});this.postScene=new T.Scene();this.postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
  this.postMaterial=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{colorMap:{value:this.postTarget.texture},depthMap:{value:this.postTarget.depthTexture},resolution:{value:new T.Vector2(1280,720)},focus:{value:24},amount:{value:1}},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=vec4(position,1.);}',fragmentShader:`varying vec2 v;uniform sampler2D colorMap;uniform sampler2D depthMap;uniform vec2 resolution;uniform float focus;uniform float amount;float depth(vec2 p){float d=texture2D(depthMap,p).x;return 36./(180.1-(2.*d-1.)*179.9);}void main(){float d=depth(v);float radius=clamp((abs(d-focus)-7.)/10.,0.,1.)*1.65*amount;vec3 c=texture2D(colorMap,v).rgb*0.4;for(int i=0;i<4;i++){float angle=float(i)*1.570796;vec2 p=v+vec2(cos(angle),sin(angle))*radius/resolution;float w=abs(depth(p)-d)<3.?1.:0.;c+=mix(texture2D(colorMap,v).rgb,texture2D(colorMap,p).rgb,w)*.15;}gl_FragColor=vec4(c,1.);#include <colorspace_fragment>}`.replace(';#include',';\n#include')});this.postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),this.postMaterial));
  this.effectUntil=0;this.frameTimes=[];this.currentScene='town';this.resize();
 }
 mat(value){if(this.materials[value])return this.materials[value];return this.materials[value]??=new T.MeshStandardMaterial({color:value,roughness:.9});}
 box(x,y,z,w,h,d,material,rot=0){
  const mat=this.mat(material),key=mat.uuid;let batch=this.pool.get(key);if(!batch){batch={mat,items:[],geo:new T.BoxGeometry(1,1,1)};this.pool.set(key,batch);}const o=new T.Object3D();o.position.set(x,y,z);o.scale.set(w,h,d);o.rotation.y=rot;o.updateMatrix();batch.items.push(o.matrix.clone());
 }
 flush(){for(const {mat,items,geo}of this.pool.values()){const mesh=new T.InstancedMesh(geo,mat,items.length);items.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.castShadow=true;mesh.receiveShadow=true;this.root.add(mesh);}this.pool.clear();}
 mesh(geo,mat,x,y,z){const m=new T.Mesh(geo,typeof mat==='string'?this.mat(mat):mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;this.root.add(m);return m;}
 cylinder(a,b,r,material){const av=new T.Vector3(...a),bv=new T.Vector3(...b),mat=this.mat(material),key='cylinder'+mat.uuid;let batch=this.pool.get(key);if(!batch){batch={mat,items:[],geo:new T.CylinderGeometry(1,1,1,7)};this.pool.set(key,batch);}const o=new T.Object3D();o.position.copy(av).add(bv).multiplyScalar(.5);o.scale.set(r,av.distanceTo(bv),r);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize());o.updateMatrix();batch.items.push(o.matrix.clone());}
 pole(x,y,z,h=.9,r=.08,mat='wood'){this.cylinder([x,y,z],[x,y+h,z],r,mat);}
 beam(a,b,r=.06,mat='wood'){this.cylinder(a,b,r,mat);}
 sign(text,x,y,z,w=1,h=1.5){const tex=canvasTexture(128,192,c=>{c.fillStyle='#c9b98e';c.fillRect(0,0,128,192);c.strokeStyle='#6c4734';c.lineWidth=6;c.strokeRect(8,8,112,176);c.fillStyle='#353e33';c.font='bold 54px serif';c.textAlign='center';[...text].forEach((s,i)=>c.fillText(s,64,60+i*55));});const m=this.mesh(new T.PlaneGeometry(w,h),new T.MeshLambertMaterial({map:tex,side:T.DoubleSide}),x,y,z);return m;}
 lantern(x,y,z){this.pole(x,y+.48,z,.35,.025);this.mesh(new T.SphereGeometry(.24,8,6),'#a94c30',x,y,z).scale.y=1.35;this.box(x,y+.28,z,.3,.06,.3,'#63452f');this.box(x,y-.28,z,.28,.07,.28,'#63452f');this.pole(x,y-.58,z,.26,.025,'#b48d4e');}
 roof(x,z,w,d,y){
  const segments=12,verts=[],uv=[];for(let side of [-1,1]){
   for(let i=0;i<segments;i++){
    const a=i/segments,b=(i+1)/segments;const height=t=>y+1.45*(1-t)**1.6+.25*t**9;
    const pts=[[-w/2-.45,height(a),side*a*(d/2+.6)],[w/2+.45,height(a),side*a*(d/2+.6)],[-w/2-.45,height(b),side*b*(d/2+.6)],[w/2+.45,height(b),side*b*(d/2+.6)]];
    for(const idx of [0,2,1,1,2,3]){verts.push(...pts[idx]);uv.push(idx%2?w/3:0,idx<2?a*2:b*2);}
   }
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.computeVertexNormals();const mat=this.mat('roof').clone();mat.side=T.DoubleSide;this.mesh(geo,mat,x,0,z);
  this.beam([x-w/2-.65,y+1.5,z],[x+w/2+.65,y+1.5,z],.13,'#56625a');
  for(const side of [-1,1]){this.beam([x-w/2-.55,y+.23,z+side*(d/2+.6)],[x+w/2+.55,y+.23,z+side*(d/2+.6)],.11,'#4c5b51');for(let i=0;i<w/.25;i++)this.pole(x-w/2+i*.25,y+.15,z+side*(d/2+.6),.14,.08,'#59675b');}
 }
 house(x,z,w=7,d=5,h=3.5,shop=false){
  const base=1.1;this.box(x,base+.18,z,w+.35,.36,d+.35,'stone');this.box(x,base+h/2,z,w,h,d,'wall');
  for(let xx=-w/2;xx<=w/2+.1;xx+=w/3){this.box(x+xx,base+h/2,z+d/2+.045,.17,h,.18,'wood');}
  for(const yy of [.5,h-.15])this.box(x,base+yy,z+d/2+.06,w,.15,.15,'wood');
  this.box(x,base+1.2,z+d/2+.11,1.4,2.4,.15,'#303c32');
  for(const dx of [-w*.32,w*.32]){this.box(x+dx,base+1.85,z+d/2+.12,1.45,1.25,.1,'#24392e');for(let i=0;i<5;i++)this.box(x+dx-.64+i*.32,base+1.85,z+d/2+.2,.055,1.3,.07,'wood');for(let i=0;i<3;i++)this.box(x+dx,base+1.28+i*.55,z+d/2+.2,1.5,.06,.07,'wood');}
  this.roof(x,z,w,d,base+h);if(shop){this.lantern(x-w*.36,base+2.9,z+d/2+.65);this.lantern(x+w*.36,base+2.9,z+d/2+.65);}
 }
 table(x,z,y=1.1){this.box(x,y+.75,z,1.65,.14,1.15,'wood');for(const dx of [-.65,.65])for(const dz of [-.4,.4])this.box(x+dx,y+.35,z+dz,.12,.7,.12,'wood');for(const dz of [-.95,.95]){this.box(x,y+.4,z+dz,1.5,.12,.35,'wood');for(const dx of [-.55,.55])this.box(x+dx,y+.2,z+dz,.1,.4,.25,'wood');}for(const dx of [-.45,.35])this.mesh(new T.CylinderGeometry(.09,.07,.13,9),'#d8d3b4',x+dx,y+.91,z);this.mesh(new T.SphereGeometry(.14,8,5),'#644a30',x,y+1,z+.2);}
 crate(x,z,y=1.1,size=.85){this.box(x,y+size/2,z,size,size,size,'wood');for(const d of [-1,1]){this.box(x+d*size*.4,y+size/2,z+size*.51,.07,size,.04,'#342f25');this.box(x,y+size*.9,z+size*.51,size,.08,.04,'#342f25');}this.box(x,y+size+.015,z,size*.7,.025,.3,'#bcb08b');}
 jar(x,z,y=1.1){this.mesh(new T.SphereGeometry(.32,9,7),'#674b34',x,y+.35,z).scale.y=1.2;this.mesh(new T.CylinderGeometry(.2,.22,.15,9),'#403d2f',x,y+.73,z);}
 tree(x,z,scale=1){
  const rand=random(778);this.beam([x,1.1,z],[x-.3,5.7*scale,z],.23,'#615a36');
  for(let i=0;i<8;i++){const a=i*2.4,bx=x+Math.cos(a)*2.4*scale,bz=z+Math.sin(a)*2.1*scale;this.beam([x-.2,4*scale,z],[bx,5.8*scale,bz],.08,'#71633c');}
  const geo=new T.PlaneGeometry(.095,.31),mat=new T.MeshLambertMaterial({color:'#9bae67',side:T.DoubleSide,alphaTest:.5,map:canvasTexture(12,32,c=>{c.fillStyle='#d2d79a';c.beginPath();c.moveTo(6,0);c.quadraticCurveTo(16,10,5,32);c.quadraticCurveTo(-2,13,6,0);c.fill();c.fillStyle='#8ba664';c.fillRect(5,3,1,24);})});const inst=new T.InstancedMesh(geo,mat,2400),o=new T.Object3D();
  const strands=Array.from({length:80},()=>({a:rand()*Math.PI*2,r:(.5+Math.sqrt(rand())*2.7)*scale,h:2+rand()*2.3}));for(let i=0;i<2400;i++){const strand=strands[Math.floor(i/30)],a=strand.a+(rand()-.5)*.13,r=strand.r+Math.sin(i%30/30*Math.PI)*.3,drop=(i%30)/30*strand.h*scale;o.position.set(x+Math.cos(a)*r,6*scale-drop-Math.pow(r/(3.3*scale),2)*.8,z+Math.sin(a)*r);o.rotation.set(rand()*.4,rand()*Math.PI,rand()*.3);o.scale.setScalar(.6+rand()*.8);o.updateMatrix();inst.setMatrixAt(i,o.matrix);inst.setColorAt(i,new T.Color().setHSL(.19+rand()*.035,.27+rand()*.15,.25+rand()*.23));}inst.castShadow=true;inst.receiveShadow=true;this.root.add(inst);this.leaves.push(inst);
 }
 buildTown(){
  this.box(-10,-.2,0,26,2.6,58,'stone');this.box(23,-.2,0,26,2.6,58,'stone');
  // Paving has coherent world scale; individual border blocks explain the bank.
  const paving=this.mat('stone').clone();paving.map=paving.map.clone();paving.map.repeat.set(7,15);this.mesh(new T.BoxGeometry(26,.08,58),paving,-10,1.12,0);this.mesh(new T.BoxGeometry(26,.08,58),paving,23,1.12,0);
  for(let z=-28;z<28;z+=.9){if(Math.abs(z)>1.7){this.box(2.88,.75,z,.42,.85,.86,'stone');this.box(10.15,.75,z,.42,.85,.86,'stone');}}
  const waterMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0},tint:{value:new T.Color('#467d6d')}},vertexShader:'uniform mat4 reflectionMatrix; varying vec4 reflectUV; varying vec3 p; void main(){p=(modelMatrix*vec4(position,1.)).xyz;reflectUV=reflectionMatrix*vec4(p,1.);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`uniform float time;uniform sampler2D reflection;uniform float reflectStrength;uniform mat4 reflectionMatrix;varying vec4 reflectUV; uniform vec3 tint; varying vec3 p;void main(){float wave=sin(p.z*4.+p.x*.8+time*.7)*sin(p.x*2.7-time*.3);float fine=sin(p.z*25.+time*2.+sin(p.x*8.));float glint=pow(max(0.,wave),22.)*.45;vec3 c=tint+vec3(.016,.023,.016)*wave+vec3(.2,.19,.13)*glint;c+=.006*fine;vec2 uv=reflectUV.xy/reflectUV.w+vec2(wave,fine)*.0015;vec3 reflected=texture2D(reflection,clamp(uv,0.,1.)).rgb;c=mix(c,reflected,reflectStrength);gl_FragColor=vec4(c,.92);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>}`});
  this.water=this.mesh(new T.PlaneGeometry(8,110,1,1),waterMaterial,6.5,.08,-20);this.water.rotation.x=-Math.PI/2;this.water.castShadow=false;
  // Raised arched plank bridge; navigation uses the same sine profile.
  for(let x=3;x<10;x+=.25){const y=groundHeight(x,0);this.box(x,y-.1,0,.24,.2,2.9,'wood');}
  for(const z of [-1.52,1.52])for(let x=3;x<=10;x+=.7){const y=groundHeight(x,0);this.pole(x,y,z,1,.065);this.box(x,y+1.02,z,.2,.11,.2,'#8a815a');if(x<9.8){const nx=Math.min(10,x+.7),ny=groundHeight(nx,0);for(const h of [.4,.86])this.beam([x,y+h,z],[nx,ny+h,z],.045);}}
  for(const x of [3.5,6.5,9.5])for(const z of [-1.15,1.15])this.pole(x,-.1,z,1.5,.15);
  // Dock: the wooden apron is lower than the stone street.
  for(let z=9;z<15;z+=.28)this.box(1.55,.38,z,2.7,.24,.26,'wood');for(const z of [9,11.5,14.5])this.pole(2.9,-.3,z,1.55,.11);
  for(let i=0;i<4;i++)this.box(1.55,.99-i*.15,7.35+i*.43,2.7,.19,.46,'stone');
  this.boat(5.2,12.4);this.boat(8,-16);
  this.house(-14,-4,10,7,3.7,true);this.house(-11.5,-12,13,6,4.8,true);this.sign('客栈',-6.5,4,-8.85,1,1.5);this.box(-6.5,2.3,-8.88,1.4,2.4,.2,'#29382c');
  this.house(-19,9,6,8,3.5);this.house(20,-12,10,7,4.2);this.house(25,-1,7,9,3.7);this.house(-16,-23,8,7,5);this.house(18,-25,9,7,5);
  this.house(-5,-25,7,6,3.7);this.house(1,-34,9,6,4.2);this.house(15,-39,9,7,5);
  // Tea awning, supported cloth, tables, cups and working stock.
  for(const x of [-12,-6.5])for(const z of [.1,2.7])this.pole(x,1.1,z,2.7,.07);
  const cloth=new T.PlaneGeometry(5.7,3.3,14,8);const pos=cloth.attributes.position;for(let i=0;i<pos.count;i++){const y=pos.getY(i);pos.setZ(i,-.25*Math.cos(pos.getX(i)*.9)+Math.sin(y*2)*.06);}cloth.computeVertexNormals();const awning=this.mesh(cloth,new T.MeshLambertMaterial({color:'#c5b586',side:T.DoubleSide}),-9.3,3.8,1);awning.rotation.x=-Math.PI/2;
  this.table(-9,.8);this.sign('茶',-6.45,3.15,2.75,.7,1);this.jar(-12,2);this.jar(-12.5,2);this.crate(-13,1);this.crate(-11.5,4.2);this.crate(-12.4,4.2);this.jar(-10.8,4.3);
  this.box(-11,1.65,7,1.4,.15,2.2,'wood');for(const x of [-11.65,-10.35]){const wheel=this.mesh(new T.TorusGeometry(.48,.065,5,12),'#4e4a33',x,1.5,7);wheel.rotation.y=Math.PI/2;this.beam([x,1.5,6.52],[x,1.5,7.48],.045);this.beam([x,1.02,7],[x,1.98,7],.045);}for(const x of [-11.5,-10.5])this.beam([x,1.65,7.8],[x,1.8,10],.055);this.crate(-11,7,1.73,.8);
  this.tree(.4,-1.4);this.tree(13,-9,.8);
  const grassMat=new T.MeshLambertMaterial({color:'#707a47',side:T.DoubleSide});const grassGeo=new T.PlaneGeometry(.09,.45);const grass=new T.InstancedMesh(grassGeo,grassMat,1400),gr=random(251),go=new T.Object3D();
  for(let i=0;i<1400;i++){const east=i>700,x=east?10.55+gr()*.7:1.7+gr()*.95,z=gr()*30-15;if(Math.abs(z)<2||!east&&z>6){go.scale.setScalar(0);}else{go.scale.setScalar(.4+gr());}go.position.set(x,1.3,z);go.rotation.set(0,gr()*Math.PI,(gr()-.5)*.6);go.updateMatrix();grass.setMatrixAt(i,go.matrix);grass.setColorAt(i,new T.Color().setHSL(.17+gr()*.08,.25,.25+gr()*.14));}grass.castShadow=true;this.root.add(grass);
  // Low timber railing, stone steps, stored baskets and eave braces break long blank edges.
  for(let z=-14;z<7;z+=1.5){if(Math.abs(z)<2)continue;this.pole(2.5,1.1,z,.62,.055);if(Math.abs(z+.75)>2)this.beam([2.5,1.65,z],[2.5,1.65,z+1.5],.045);}
  for(const z of [-5,-3,-1]){this.crate(-18.6,z,1.1,.65);this.jar(-18,z);}

  for(let i=0;i<10;i++)this.crate(22+(i%2)*.9,-6+Math.floor(i/2),1.1,.75);this.crate(19,-6.5,1.1,1.15);
  this.crate(.7,11.3,.51,.7);this.crate(.7,12.1,.51,.55);
  this.beam([2.8,.8,9],[4.4,.45,11.1],.035,'#bdac7d');
  this.sign('渡',2.2,3,7,.8,1.2);this.pole(2.2,1.1,7,3,.07);
  const r=random(833);for(let i=0;i<160;i++){const z=r()*45-22;if(Math.abs(z)<2||z>6&&z<16)continue;const x=r()>.5?2.6:10.6;this.beam([x,.9,z],[x+(r()-.5)*.4,1.5+r()*.5,z+.1],.018,'#86945b');}
  // Distant silhouettes: low-contrast ridges, beyond playable borders.
  for(let i=0;i<12;i++){const m=this.mesh(new T.ConeGeometry(9+r()*8,10+r()*12,5),'#809b8d',i*10-50,4,-65-r()*12);m.scale.z=.55;}
  for(const t of TARGETS.filter(t=>t.scene==='town'))this.target(t);
 }
 boat(x,z){const hull=this.mesh(new T.SphereGeometry(1,12,6),'#453e2e',x,.28,z);hull.scale.set(.72,.4,2.25);this.box(x,.48,z,1.25,.08,3.6,'wood');const canopy=this.mesh(new T.CylinderGeometry(.68,.68,1.7,10,1,true,0,Math.PI),'#857c52',x,1,z-.3);canopy.rotation.x=Math.PI/2;canopy.rotation.z=Math.PI/2;for(const dz of [-1,1])this.pole(x-.6,.45,z+dz,.7,.04);}
 target(t){
  if(t.actor){const actor=makeActor(t.role);actor.mesh.position.set(t.x,groundHeight(t.x,t.z,t.scene),t.z);actor.mesh.userData.target=t.id;this.root.add(actor.mesh);this.actors.set(t.id,{...actor,data:t});this.pickables.push(actor.mesh);}
  const hit=new T.Mesh(new T.CylinderGeometry(.6,.6,2,8),new T.MeshBasicMaterial({visible:false}));hit.position.set(t.x,groundHeight(t.x,t.z,t.scene)+.7,t.z);hit.userData.target=t.id;this.root.add(hit);this.pickables.push(hit);
 }
 buildInn(){
  this.box(0,-.15,0,12,.3,10,'floor');this.box(0,2,-5,12,4,.25,'wall');this.box(-6,2,0,.25,4,10,'wall');this.box(6,2,0,.25,4,10,'wall');
  for(const x of [-5.8,-2,2,5.8])this.box(x,2,-4.8,.2,4,.2,'wood');for(const y of [.5,2.8,4])this.box(0,y,-4.8,12,.17,.17,'wood');
  for(const x of [-4,3])for(const z of [-2,2])this.table(x,z,0);
  this.box(-2, .6,-4,6,1.2,.7,'wood');for(let x=-4.5;x<0;x+=.6){this.jar(x,-4.5,.4);this.jar(x,-4.5,1.65);}
  this.box(-2,1.62,-4.5,6,.12,.55,'wood');this.box(3,1.2,-4.84,1.3,2.4,.06,'#35382a');
  for(let i=0;i<9;i++)this.box(5,.16*(8-i),-3.8+i*.4,1.2,.3+(8-i)*.32,.4,'wood');
  this.box(0,3.3,-3.7,12,.2,2.3,'floor');for(let x=-5.7;x<6;x+=.55)this.pole(x,3.3,-2.65,.7,.035);this.beam([-6,4,-2.65],[6,4,-2.65],.06);
  for(const x of [-5.6,5.6]){this.box(x,1.8,1,.18,3.6,.18,'wood');this.lantern(x,2.8,1);}
  for(const x of [-3,3]){const l=new T.PointLight('#ffc57f',9,8,2);l.position.set(x,2.7,0);this.inn.add(l);}
  for(const t of TARGETS.filter(t=>t.scene==='inn'))this.target(t);
 }
 resize(){const w=innerWidth,h=innerHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();if(this.postTarget){const size=this.renderer.getDrawingBufferSize(new T.Vector2());this.postTarget.setSize(size.x,size.y);this.postMaterial.uniforms.resolution.value.copy(size);}}
 setQuality(quality){this.renderer.shadowMap.enabled=quality!=='low';this.renderer.setPixelRatio(quality==='low'?.85:Math.min(devicePixelRatio,1.5));this.sun.shadow.mapSize.setScalar(quality==='low'?1024:2048);this.sun.shadow.map?.dispose();this.sun.shadow.map=null;this.resize();}
 pick(clientX,clientY,includeTargets=true){this.raycaster.setFromCamera(new T.Vector2(clientX/innerWidth*2-1,1-clientY/innerHeight*2),this.camera);const hits=this.raycaster.intersectObjects(this.pickables.filter(m=>m.parent.visible));if(includeTargets&&hits.length)return {target:hits[0].object.userData.target};this.plane.constant=this.currentScene==='inn'?0:-1.1;const p=new T.Vector3();if(this.raycaster.ray.intersectPlane(this.plane,p))return {x:p.x,z:p.z};return null;}
 screen(x,y,z){const p=new T.Vector3(x,y,z).project(this.camera);return {x:(p.x*.5+.5)*innerWidth,y:(-.5*p.y+.5)*innerHeight,visible:p.z<1};}
 showGrid(b){for(const mesh of this.grid.children){mesh.material.dispose();}this.grid.children[0]?.geometry.dispose();this.grid.clear();if(!b)return;const geo=new T.PlaneGeometry(.93,.93);for(let x=0;x<8;x++)for(let z=0;z<6;z++){const distance=Math.abs(x-b.hero.x)+Math.abs(z-b.hero.z),m=new T.Mesh(geo,new T.MeshBasicMaterial({color:distance<=3&&!b.moved?'#b7c18a':'#718574',transparent:true,opacity:.2,depthWrite:false,side:T.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.set(13+x,1.19,-5+z);this.grid.add(m);}}
 effect(events=[],battle=null){const units=battle?{hero:battle.hero,...Object.fromEntries(battle.enemies.map(e=>[e.id,e]))}:{};this.effects=events.map((e,i)=>({...e,start:performance.now()+i*320,from:units[e.who],to:units[e.target]}));this.effectUntil=performance.now()+Math.max(430,events.length*320);}
 activeEffect(){return this.effects?.find(e=>performance.now()>=e.start&&performance.now()<e.start+320);}

 render(state,time,dt,moving=false,direction=0){
  this.currentScene=state.scene;const inside=state.scene==='inn';this.town.visible=!inside;this.inn.visible=inside;
  this.scene.background.set(inside?'#242d29':state.settings.evening?'#b4a88b':'#b5c9bc');this.scene.fog.color.copy(this.scene.background);
  this.sky.intensity=inside?.65:state.settings.evening?1.35:2.05;this.sun.intensity=inside?1.1:state.settings.evening?2.6:3.2;this.sun.color.set(state.settings.evening?'#ffc07a':'#ffe1a2');
  const p=state.battle?{x:13+state.battle.hero.x,z:-5+state.battle.hero.z}:state.position;const y=groundHeight(p.x,p.z,state.scene);
  this.hero.mesh.position.set(p.x,y,p.z);const effect=this.activeEffect(),attacking=!!effect;this.hero.update(time,moving,direction,effect?.who==='hero');this.hero.mesh.scale.x=effect?.who==='hero'&&effect.to?.x<effect.from?.x?-1:1;
  this.ring.position.set(p.x,y+.035,p.z);this.ring.visible=!state.battle;
  this.hero.mesh.rotation.y=.16;for(const a of this.actors.values()){a.mesh.rotation.y=.16;a.update(time,false);a.mesh.visible=a.data.id!=='guard'||state.quest<4;}
  this.enemies.forEach((a,i)=>{const e=state.battle?.enemies[i];a.mesh.visible=!!e&&e.hp>0;if(e){a.mesh.position.set(13+e.x,1.1,-5+e.z);a.mesh.scale.x=effect?.who===e.id&&effect.to?.x<effect.from?.x?-1:1;a.update(time,false,0,effect?.who===e.id);}});
  const target=inside?new T.Vector3(0,.9,0):new T.Vector3(T.MathUtils.clamp(state.battle?17:p.x,-14,20),y+.8,T.MathUtils.clamp(state.battle?-2:p.z,-10,13));
  this.focus.lerp(target,1-Math.exp(-dt*5));const offset=inside?new T.Vector3(1.2,13,17):new T.Vector3(2,12.3,20);this.camera.position.copy(this.focus).add(offset);this.camera.lookAt(this.focus);
  this.sun.position.set(this.focus.x-17,this.focus.y+28,this.focus.z+12);this.sun.target.position.copy(this.focus);
  this.water.material.uniforms.reflectStrength.value=state.settings.quality==='low'?0:.32;this.water.material.uniforms.time.value=time;this.water.material.uniforms.tint.value.set(state.settings.evening?'#638e79':'#467d6d');
  this.leaves.forEach((m,i)=>m.rotation.z=Math.sin(time*.65+i)*.006);
  this.slash.visible=attacking;this.slash.position.set(effect?.to?13+(effect.from.x+effect.to.x)/2:p.x+.55,y+.9,effect?.to?-5+(effect.from.z+effect.to.z)/2:p.z);this.slash.rotation.set(-.2,time*8,0);
  if(!inside&&state.settings.quality!=='low'&&this.reflectionFrame++%8===0){this.reflectionCamera.copy(this.camera);this.reflectionCamera.position.y=.16-this.camera.position.y;this.reflectionCamera.up.set(0,-1,0);this.reflectionCamera.lookAt(this.focus.x,.16-this.focus.y,this.focus.z);this.reflectionCamera.updateMatrixWorld();this.reflectionMatrix.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1).multiply(this.reflectionCamera.projectionMatrix).multiply(this.reflectionCamera.matrixWorldInverse);this.water.visible=false;this.renderer.shadowMap.autoUpdate=true;this.renderer.setRenderTarget(this.reflectionTarget);this.renderer.render(this.scene,this.reflectionCamera);this.water.visible=true;this.renderer.shadowMap.autoUpdate=true;}
  this.postMaterial.uniforms.focus.value=this.camera.position.distanceTo(this.hero.mesh.position);this.postMaterial.uniforms.amount.value=state.settings.quality==='low'?0:1;
  if(state.settings.quality==='low'){this.renderer.setRenderTarget(null);this.renderer.render(this.scene,this.camera);this.lastInfo={...this.renderer.info.render};}else{this.renderer.setRenderTarget(this.postTarget);this.renderer.render(this.scene,this.camera);this.lastInfo={...this.renderer.info.render};this.renderer.setRenderTarget(null);this.renderer.render(this.postScene,this.postCamera);}if(Number.isFinite(dt)&&dt>0){this.frameTimes.push(dt*1000);if(this.frameTimes.length>600)this.frameTimes.shift();}
 }
 stats(){const sorted=[...this.frameTimes].sort((a,b)=>a-b);return {samples:sorted.length,p50:sorted[Math.floor(sorted.length*.5)]||0,p95:sorted[Math.floor(sorted.length*.95)]||0,drawCalls:this.lastInfo?.calls,triangles:this.lastInfo?.triangles,geometries:this.renderer.info.memory.geometries,textures:this.renderer.info.memory.textures};}
}
