export const VIEW={width:1600,height:900};
export const project=([x,y])=>[220+x*76+y*62,570-x*25+y*35];
export function unproject([x,y]){const a=x-220,b=y-570;return [Math.round((35*a-62*b)/4210),Math.round((25*a+76*b)/4210)];}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const polygon=(ctx,points,fill,stroke)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}};

function characterFrame(actor,frame){
 const canvas=document.createElement('canvas');canvas.width=160;canvas.height=200;const c=canvas.getContext('2d');
 const walk=Math.sin(frame/8*Math.PI*2),breath=Math.sin(frame/8*Math.PI*2)*1.5;
 c.translate(80,180);c.lineCap='round';c.lineJoin='round';
 c.fillStyle='rgba(18,28,24,.27)';c.beginPath();c.ellipse(0,1,31,10,0,0,Math.PI*2);c.fill();
 // A six-head, full-body silhouette. Named characters differ in weapon, hair and cloth palette.
 c.strokeStyle='#252b29';c.lineWidth=12;c.beginPath();c.moveTo(-10,-35);c.lineTo(-12+walk*7,-3);c.moveTo(12,-35);c.lineTo(14-walk*7,-2);c.stroke();
 c.strokeStyle='#453b30';c.lineWidth=9;c.beginPath();c.moveTo(-17+walk*7,-2);c.lineTo(-6+walk*7,-2);c.moveTo(9-walk*7,-1);c.lineTo(21-walk*7,-1);c.stroke();
 c.translate(0,breath);
 polygon(c,[[-24,-99],[19,-100],[26,-73],[25+walk*3,-23],[6,-15],[-6,-31],[-29,-23],[-22,-68]],actor.color,'#293938');
 polygon(c,[[-3,-101],[14,-94],[8,-64],[17,-27],[1,-29],[-9,-73]],'#c0b18c');
 c.strokeStyle=actor.color;c.lineWidth=15;c.beginPath();c.moveTo(-21,-89);c.lineTo(-31,-60+walk*5);c.moveTo(19,-89);c.lineTo(31,-65-walk*5);c.stroke();
 c.strokeStyle='#c4a17b';c.lineWidth=7;c.beginPath();c.moveTo(-31,-60+walk*5);c.lineTo(-27,-50+walk*5);c.moveTo(31,-65-walk*5);c.lineTo(34,-53-walk*5);c.stroke();
 c.fillStyle='#302e26';c.fillRect(-22,-67,44,8);c.fillStyle='#c7aa66';c.fillRect(-3,-67,7,8);
 c.fillStyle='#c6a582';c.beginPath();c.ellipse(0,-117,14,19,-.06,0,Math.PI*2);c.fill();
 c.fillStyle='#262c2a';c.beginPath();c.ellipse(-1,-128,16,11,-.05,Math.PI,Math.PI*2);c.fill();
 polygon(c,[[-15,-128],[-15,-108],[-9,-112],[-9,-126],[11,-125],[15,-111],[16,-131]],'#262c2a');
 c.beginPath();c.ellipse(1,-145,8,7,0,0,Math.PI*2);c.fill();c.fillStyle='#e2d7b7';c.fillRect(-8,-139,18,3);
 c.strokeStyle='#3a3329';c.lineWidth=2;c.beginPath();c.moveTo(-4,-118);c.lineTo(0,-117);c.moveTo(5,-118);c.lineTo(8,-117);c.stroke();
 if(actor.appearance==='staff'){c.strokeStyle='#796044';c.lineWidth=5;c.beginPath();c.moveTo(34,-130);c.lineTo(38,5);c.stroke();c.strokeStyle='#c6b076';c.lineWidth=2;c.beginPath();c.moveTo(35,-118);c.lineTo(37,-32);c.stroke();}
 else if(actor.appearance==='swordsman'){c.strokeStyle='#bac8c6';c.lineWidth=5;c.beginPath();c.moveTo(34,-55);c.lineTo(65,-104);c.stroke();c.strokeStyle='#b69a5e';c.lineWidth=5;c.beginPath();c.moveTo(26,-67);c.lineTo(44,-57);c.stroke();}
 else if(actor.appearance==='healer'){c.fillStyle='#e6ddbe';c.fillRect(24,-59,18,25);c.fillStyle='#698477';c.fillRect(31,-55,4,16);c.fillRect(27,-49,12,4);}
 else {c.strokeStyle='#bbad8c';c.lineWidth=4;c.beginPath();c.arc(28,-72,26,-1.1,1.1);c.stroke();c.lineWidth=1;c.beginPath();c.moveTo(40,-95);c.lineTo(40,-48);c.stroke();}
 return canvas;
}
export class SceneRenderer{
 constructor(host,overlay,catalog){this.host=host;this.overlay=overlay;this.catalog=catalog;this.kind='canvas';this.canvas=document.createElement('canvas');this.canvas.width=VIEW.width;this.canvas.height=VIEW.height;this.canvas.setAttribute('aria-hidden','true');host.append(this.canvas);this.ctx=this.canvas.getContext('2d',{alpha:false});overlay.width=VIEW.width;overlay.height=VIEW.height;this.o=overlay.getContext('2d');this.sprites=new Map(catalog.actors.map(a=>[a.id,Array.from({length:8},(_,i)=>characterFrame(a,i))]));this.motion=new Map();this.effects=[];this.frameCosts=[];this.frameIntervals=[];this.lastFrame=null;this.background=null;this.gray=false;this.grid=false;this.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;this.stressCount=0;this.three=null;this.webgl=null;this.webglFailed=null;}
 async load(url){this.background=new Image();this.background.src=url;await this.background.decode();}
 async loadAtlas(url){
  const atlas=new Image();atlas.src=url;await atlas.decode();
  const rows=[[0,334],[334,312],[646,308],[954,326]],pivots=[[160,480,800,1120],[160,480,800,1120],[163,482,806,1123],[209,487,768,1114]],feet=[327,637,947,1236],columns={swordsman:0,healer:1,staff:2,ranged:3};
  const scale=atlas.width/1280;
  for(const a of this.catalog.actors){const col=columns[a.appearance],frames=[];
   for(const row of [0,1,0,2,0,1,0,2,3]){
    const c=document.createElement('canvas');c.width=160;c.height=200;const ctx=c.getContext('2d');
    const left=row===3&&col===1?350:col*320,width=row===3&&col===0?355:row===3&&col===1?290:320;
    const top=rows[row][0],height=rows[row][1];
    ctx.fillStyle='rgba(18,28,24,.27)';ctx.beginPath();ctx.ellipse(80,182,28,9,0,0,Math.PI*2);ctx.fill();
    ctx.drawImage(atlas,left*scale,top*scale,width*scale,height*scale,80+(left-pivots[row][col])*.5,180+(top-feet[row])*.5,width*.5,height*.5);frames.push(c);
   }this.sprites.set(a.id,frames);
  }
 }
 async setBackend(kind){
  if(kind==='webgl'&&!this.webgl){
   const THREE=await import('../../web/vendor/three/three.module.js');this.three=THREE;
   try{const canvas=document.createElement('canvas'),context=canvas.getContext('webgl2',{alpha:false,antialias:false});if(!context)throw Error('WebGL2 context unavailable');this.webgl=new THREE.WebGLRenderer({canvas,context,alpha:false,antialias:false,powerPreference:'low-power'});}catch(error){this.webglFailed=String(error.message);throw Error('当前设备未能创建 WebGL2，Canvas2D 可正常运行。');}
   this.webgl.setPixelRatio(1);this.webgl.setSize(VIEW.width,VIEW.height);this.host.append(this.webgl.domElement);
   this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(0,VIEW.width,VIEW.height,0,.1,100);this.camera.position.z=10;
   const texture=new THREE.Texture(this.background);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;
   this.backdrop=new THREE.Mesh(new THREE.PlaneGeometry(VIEW.width,VIEW.height),new THREE.MeshBasicMaterial({map:texture}));this.backdrop.position.set(800,450,-5);this.scene.add(this.backdrop);
   this.textures=new Map([...this.sprites].map(([id,frames])=>[id,frames.map(c=>{const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;})]));this.meshes=[];
  }
  this.kind=kind;this.canvas.hidden=kind!=='canvas';if(this.webgl)this.webgl.domElement.hidden=kind!=='webgl';this.frameCosts=[];this.frameIntervals=[];this.lastFrame=null;
 }
 consume(events,time){for(const event of events){if(event.type==='move'&&!this.reducedMotion)this.motion.set(event.actorId,{points:[event.from,...event.path],start:time,duration:Math.min(1400,event.path.length*170)});else if(['hit','heal'].includes(event.type))this.effects.push({...event,start:time});}}
 position(actor,time){const m=this.motion.get(actor.id);if(!m)return {point:project(actor.position),walking:false};const f=clamp((time-m.start)/m.duration,0,1);if(f>=1){this.motion.delete(actor.id);return {point:project(actor.position),walking:false};}const p=f*(m.points.length-1),i=Math.min(m.points.length-2,Math.floor(p)),a=project(m.points[i]),b=project(m.points[i+1]),t=p-i;return {point:[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],walking:true};}
 draw(state,time,{reachable=[],hover=null}={}){
  const started=performance.now();if(this.lastFrame!==null)this.frameIntervals.push(time-this.lastFrame);this.lastFrame=time;
  const o=this.o;o.clearRect(0,0,1600,900);
  const units=state.actors.filter(a=>a.hp>0).map(a=>({actor:a,...this.position(a,time)}));
  for(let i=0;i<this.stressCount;i++){const actor=this.catalog.actors[i%this.catalog.actors.length];units.push({actor:{...actor,id:`stress-${i}`},sourceId:actor.id,point:project([.5+(i%12)*.65,.4+Math.floor(i/12)*.5]),walking:true});}
  units.sort((a,b)=>a.point[1]-b.point[1]);
  if(this.kind==='canvas'){
   const c=this.ctx;c.fillStyle='#3b4845';c.fillRect(0,0,1600,900);if(!this.gray&&this.background)c.drawImage(this.background,0,0,1600,900);
   for(const u of units){const frames=this.sprites.get(u.sourceId||u.actor.id),attacking=this.effects.some(e=>e.actorId===u.actor.id&&time-e.start<350),frame=attacking&&frames.length>8?8:u.walking&&!this.reducedMotion?Math.floor(time/90)%8:0;const [x,y]=u.point;c.drawImage(frames[frame],x-45,y-103,90,112);}
  }else{
   const T=this.three;this.backdrop.visible=!this.gray;this.scene.background=new T.Color('#3b4845');
   for(let i=0;i<units.length;i++){const u=units[i],attacking=this.effects.some(e=>e.actorId===u.actor.id&&time-e.start<350),frame=attacking&&this.sprites.get(u.sourceId||u.actor.id).length>8?8:u.walking&&!this.reducedMotion?Math.floor(time/90)%8:0;
    if(!this.meshes[i]){this.meshes[i]=new T.Sprite(new T.SpriteMaterial({transparent:true,depthTest:false}));this.meshes[i].scale.set(90,112,1);this.scene.add(this.meshes[i]);}
    const sprite=this.meshes[i];sprite.visible=true;sprite.material.map=this.textures.get(u.sourceId||u.actor.id)[frame];sprite.position.set(u.point[0],900-u.point[1]+47,0);sprite.renderOrder=i+1;
   }
   for(let i=units.length;i<this.meshes.length;i++)this.meshes[i].visible=false;
   this.webgl.render(this.scene,this.camera);
  }
  if(state.weather!=='day'){o.fillStyle=state.weather==='night'?'rgba(13,28,57,.56)':'rgba(34,55,65,.30)';o.fillRect(0,0,1600,900);}
  const cell=(p,fill,stroke)=>{const [x,y]=project(p);polygon(o,[[x-69,y-5],[x+7,y-30],[x+69,y+5],[x-7,y+30]],fill,stroke);};
  o.lineWidth=1.4;
  if(this.gray||this.grid||state.phase==='party')for(let y=0;y<state.map.height;y++)for(let x=0;x<state.map.width;x++)cell([x,y],null,'rgba(230,226,202,.23)');
  for(const p of reachable)cell(p,'rgba(88,169,173,.14)','rgba(129,216,214,.45)');
  if(hover)cell(hover,'rgba(234,204,138,.24)','#eed7a3');
  for(const p of state.map.blocked){const [x,y]=project(p);polygon(o,[[x-24,y-10],[x+12,y-23],[x+32,y-9],[x-5,y+5]],'#a1875c','#403b2d');polygon(o,[[x-24,y-10],[x-5,y+5],[x-5,y+33],[x-24,y+17]],'#6c573d','#403b2d');polygon(o,[[x-5,y+5],[x+32,y-9],[x+32,y+19],[x-5,y+33]],'#826b49','#403b2d');o.strokeStyle='#c5ac75';o.beginPath();o.moveTo(x-13,y+1);o.lineTo(x-13,y+22);o.moveTo(x+8,y);o.lineTo(x+8,y+28);o.stroke();}
  for(const u of units.filter(u=>!u.sourceId)){const [x,y]=u.point,a=u.actor;const selected=a.id===state.selectedId;
   o.lineWidth=selected?3:1.5;o.strokeStyle=a.side==='party'?'#b4d8ca':'#e7a384';o.beginPath();o.ellipse(x,y,28,10,0,0,Math.PI*2);o.stroke();
   if(selected){o.fillStyle='#edd6a4';polygon(o,[[x-6,y-112],[x+6,y-112],[x,y-103]],'#edd6a4');}
   o.fillStyle='rgba(12,29,30,.82)';o.fillRect(x-32,y-104,64,5);o.fillStyle=a.side==='party'?'#afc8a0':'#ce937a';o.fillRect(x-32,y-104,64*a.hp/a.maxHp,5);
   o.font='17px "Noto Sans CJK SC", sans-serif';o.textAlign='center';o.fillStyle='#fff3d3';o.strokeStyle='rgba(14,26,24,.85)';o.lineWidth=4;o.strokeText(a.name,x,y+32);o.fillText(a.name,x,y+32);
   if(a.guard){o.font='bold 18px sans-serif';o.fillStyle='#f3e2b1';o.fillText('守',x+35,y-62);}
  }
  if(state.weather!=='day')for(const [x,y] of [[130,700],[1365,742],[670,245]]){const g=o.createRadialGradient(x,y,5,x,y,120);g.addColorStop(0,'rgba(245,169,78,.27)');g.addColorStop(1,'rgba(245,169,78,0)');o.fillStyle=g;o.fillRect(x-120,y-120,240,240);}
  if(state.weather==='rain'&&!this.reducedMotion){o.strokeStyle='rgba(205,221,226,.38)';o.lineWidth=1;o.beginPath();for(let i=0;i<95;i++){const x=(i*127+time*.15)%1650,y=(i*73+time*.51)%950;o.moveTo(x,y);o.lineTo(x-9,y+20);}o.stroke();}
  this.effects=this.effects.filter(e=>time-e.start<700);
  for(const e of this.effects){const a=state.actors.find(a=>a.id===e.actorId),t=state.actors.find(a=>a.id===e.targetId);if(!a||!t)continue;const p=project(a.position),q=project(t.position),f=(time-e.start)/700;o.globalAlpha=1-f;
   o.strokeStyle=e.type==='heal'?'#b9dfba':'#f8e4b3';o.lineWidth=4;if(e.type==='heal'){o.beginPath();o.ellipse(q[0],q[1]-36,20+f*32,40+f*10,0,0,Math.PI*2);o.stroke();}else{o.beginPath();o.moveTo(p[0],p[1]-48);o.quadraticCurveTo((p[0]+q[0])/2,(p[1]+q[1])/2-95,q[0],q[1]-42);o.stroke();}
   o.font='bold 30px serif';o.fillStyle=e.type==='heal'?'#d7f3ca':'#fff0c1';o.fillText(`${e.type==='heal'?'+':'−'}${e.amount}`,q[0],q[1]-75-f*25);o.globalAlpha=1;
  }
  this.frameCosts.push(performance.now()-started);if(this.frameCosts.length>600)this.frameCosts.shift();if(this.frameIntervals.length>600)this.frameIntervals.shift();
 }
 metrics(){const pct=(arr,p)=>{const a=[...arr].sort((x,y)=>x-y);return a.length?Number(a[Math.floor((a.length-1)*p)].toFixed(3)):null;};return {backend:this.kind,sceneSize:[1600,900],stressActors:this.stressCount,frames:this.frameCosts.length,drawCpuMedianMs:pct(this.frameCosts,.5),drawCpuP95Ms:pct(this.frameCosts,.95),frameIntervalMedianMs:pct(this.frameIntervals,.5),frameIntervalP95Ms:pct(this.frameIntervals,.95),gpuRenderer:this.webgl?this.webgl.getContext().getParameter(this.webgl.getContext().RENDERER):null,note:'CPU提交耗时不等于GPU完成时间；帧间隔受浏览器调度影响。'};}
 dispose(){this.webgl?.dispose();this.textures?.forEach(frames=>frames.forEach(t=>t.dispose()));this.meshes?.forEach(m=>m.material.dispose());this.backdrop?.geometry.dispose();this.backdrop?.material.map.dispose();this.backdrop?.material.dispose();}
}
