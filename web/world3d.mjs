import * as T from './vendor/three/three.module.js';
import { OrbitControls } from './vendor/three/OrbitControls.js';
import { createPalette, buildWorld, createCharacter, updateActors, disposeWorld } from './world3d-models.mjs?v=20260910.1';
import { AREA_SPAWNS, objectAnchor, templeAreaAt, slideMove, findWalkPath } from './world3d-layout.mjs?v=20260910.1';

const assets={stone:'./assets/world3d/temple-stone-v1.webp',wood:'./assets/world3d/temple-timber-v1.webp'};
const v3=(a)=>new T.Vector3(...a);
const blockedUi=()=>Boolean(document.querySelector('.inventory-screen, .character-screen, .martial-screen, .knowledge-screen'))
  ||['inventoryOpen','characterOpen','martialOpen','knowledgeOpen'].some(k=>document.body.dataset[k]==='true');

export function createWorldRenderer({onAction,onClose,onFallback}) {
  const renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.65));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.48;
  const canvas=renderer.domElement;canvas.className='world3d-canvas';canvas.tabIndex=0;canvas.setAttribute('aria-label','江湖场景。方向键或 W A S D 行走，E 查看近处物件，拖动转动视角。');
  const wrap=document.createElement('div');wrap.className='world3d-runtime';wrap.append(canvas);
  const labels=document.createElement('div');labels.className='world3d-labels';wrap.append(labels);
  const controlsBar=document.createElement('div');controlsBar.className='world3d-tools';
  controlsBar.innerHTML='<button type="button" data-world="camera" title="回到人物视角（C）" aria-label="回到人物视角">归位</button><button type="button" data-world="roof" aria-pressed="false">显露屋顶</button><button type="button" data-world="quality" aria-pressed="false">画质 · 精细</button><button type="button" data-world="sound" aria-pressed="false">听雨</button><button type="button" data-world="flat">平面画卷</button>';
  wrap.append(controlsBar);
  const place=document.createElement('div');place.className='world3d-place';wrap.append(place);
  const hint=document.createElement('div');hint.className='world3d-hint';hint.innerHTML='<span><kbd>W A S D</kbd> 行走</span><span>点地面行走 · 拖动转向</span><span><kbd>E</kbd> 查看</span>';wrap.append(hint);
  const nearButton=document.createElement('button');nearButton.className='world3d-near';nearButton.hidden=true;wrap.append(nearButton);
  const stick=document.createElement('div');stick.className='world3d-stick';stick.setAttribute('aria-label','触屏行走摇杆');stick.innerHTML='<span></span>';wrap.append(stick);
  const stage=new T.Scene();stage.background=new T.Color(0x142a36);stage.fog=new T.FogExp2(0x233c47,.020);
  stage.add(new T.HemisphereLight(0xb9d9ec,0x476254,2.0));
  const moon=new T.DirectionalLight(0xc1dbed,3.2);moon.position.set(-16,28,12);moon.castShadow=true;
  moon.shadow.mapSize.set(1536,1536);Object.assign(moon.shadow.camera,{left:-25,right:25,top:25,bottom:-25,near:.5,far:90});moon.shadow.bias=-.0006;moon.shadow.normalBias=.04;stage.add(moon);
  const rim=new T.DirectionalLight(0x7aafbd,1.2);rim.position.set(10,12,-15);stage.add(rim);
  const camera=new T.PerspectiveCamera(43,1,.1,160);camera.position.set(17,21,25);
  const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.09;controls.enablePan=false;
  controls.minDistance=8;controls.maxDistance=49;controls.minPolarAngle=.28;controls.maxPolarAngle=1.25;
  controls.mouseButtons={LEFT:T.MOUSE.ROTATE,MIDDLE:T.MOUSE.DOLLY,RIGHT:T.MOUSE.ROTATE};
  controls.touches={ONE:T.TOUCH.ROTATE,TWO:T.TOUCH.DOLLY_ROTATE};controls.target.set(0,1,0);controls.update();
  const loader=new T.TextureLoader(),textures={};
  for(const [name,url] of Object.entries(assets)) {
    const texture=loader.load(new URL(url,import.meta.url).href,undefined,()=>{});texture.colorSpace=T.SRGBColorSpace;
    texture.wrapS=texture.wrapT=T.RepeatWrapping;if(name==='stone')texture.repeat.set(3,3);texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());textures[name]=texture;
  }
  const palette=createPalette(textures);
  let player=createCharacter(palette);stage.add(player);
  const ring=new T.Mesh(new T.RingGeometry(.49,.57,40),new T.MeshBasicMaterial({color:0xe8ce91,transparent:true,opacity:.8,side:T.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.026;stage.add(ring);
  const destination=new T.Mesh(new T.RingGeometry(.16,.24,24),new T.MeshBasicMaterial({color:0xc7e6e4,transparent:true,opacity:.7,side:T.DoubleSide,depthWrite:false}));destination.rotation.x=-Math.PI/2;destination.visible=false;stage.add(destination);
  const ray=new T.Raycaster(),pointer=new T.Vector2(),ground=new T.Plane(new T.Vector3(0,1,0),0);
  let model=null,presentation=null,game=null,host=null,landing=false,active=false,frame=0,lastTime=0,elapsed=0;
  let items=[],path=[],nearest=null,pendingInspect=null,lastArea=null,showRoof=false,lowQuality=false,actorBody='male',width=0,height=0;
  const keys=new Set(),joy={x:0,z:0};let pointerDown=null,walkFromWorld=false;
  const rainPositions=new Float32Array(720*6);
  for(let i=0;i<720;i++){const j=i*6;rainPositions[j]=(Math.random()-.5)*55;rainPositions[j+1]=Math.random()*27;rainPositions[j+2]=(Math.random()-.5)*52;rainPositions[j+3]=rainPositions[j]-.10;rainPositions[j+4]=rainPositions[j+1]+.6;rainPositions[j+5]=rainPositions[j+2];}
  const rainGeo=new T.BufferGeometry();rainGeo.setAttribute('position',new T.BufferAttribute(rainPositions,3));
  const rain=new T.LineSegments(rainGeo,new T.LineBasicMaterial({color:0xc6e2eb,transparent:true,opacity:.26,depthWrite:false}));rain.frustumCulled=false;stage.add(rain);
  const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let audio=null,audioGain=null,audioSource=null,soundOn=false;
  async function toggleSound() {
    try {
      if(!audio){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw new Error('No audio');audio=new Audio();
        const buffer=audio.createBuffer(1,audio.sampleRate*3,audio.sampleRate),data=buffer.getChannelData(0);let prev=0;
        for(let i=0;i<data.length;i++){prev=(prev+(Math.random()*2-1)*.035)/1.015;data[i]=prev*4;}
        audioSource=audio.createBufferSource();audioSource.buffer=buffer;audioSource.loop=true;
        const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1250;
        audioGain=audio.createGain();audioGain.gain.value=0;audioSource.connect(filter);filter.connect(audioGain);audioGain.connect(audio.destination);audioSource.start();
      }
      await audio.resume();soundOn=!soundOn;audioGain.gain.setTargetAtTime(soundOn?.28:0,audio.currentTime,.3);
      const b=controlsBar.querySelector('[data-world="sound"]');b.textContent=soundOn?'雨声 · 开':'听雨';b.setAttribute('aria-pressed',String(soundOn));
    }catch{controlsBar.querySelector('[data-world="sound"]').textContent='此处暂听不到雨声';}
  }
  function resetCamera() {
    controls.target.copy(player.position).add(new T.Vector3(0,1,0));
    camera.position.copy(controls.target).add(new T.Vector3(14,18,21));controls.update();
  }
  controlsBar.addEventListener('click',e=>{
    e.stopPropagation();const action=e.target.closest('button')?.dataset.world;
    if(action==='camera')resetCamera();
    if(action==='roof'){showRoof=!showRoof;e.target.textContent=showRoof?'隐去屋顶':'显露屋顶';e.target.setAttribute('aria-pressed',String(showRoof));}
    if(action==='quality'){lowQuality=!lowQuality;renderer.setPixelRatio(lowQuality?1:Math.min(devicePixelRatio||1,1.65));renderer.shadowMap.enabled=!lowQuality;rain.geometry.setDrawRange(0,lowQuality?480:1440);e.target.textContent=lowQuality?'画质 · 流畅':'画质 · 精细';e.target.setAttribute('aria-pressed',String(lowQuality));resize(true);}
    if(action==='sound')void toggleSound();
    if(action==='flat'){active=false;onFallback();}
  });
  function inspect(item) {
    if(!item||landing||blockedUi())return;
    path=[];pendingInspect=null;destination.visible=false;
    onAction(item.actor?'inspect-scene-actor':'inspect-scene-object',item.id);
  }
  nearButton.addEventListener('click',e=>{e.stopPropagation();inspect(nearest);});
  function buildLabels(scene) {
    labels.replaceChildren();items=[];
    for(const [i,item] of [...(scene.hotspots||[]).map(x=>({...x,actor:false})),...(scene.actors||[]).map(x=>({...x,actor:true}))].entries()) {
      const point=v3(objectAnchor(scene,item,i));const b=document.createElement('button');b.type='button';b.className='world3d-marker';b.textContent=item.label;
      b.dataset.id=item.id;b.setAttribute('aria-label',`查看${item.label}`);b.addEventListener('click',e=>{e.stopPropagation();inspect(entry);});
      const entry={...item,point,button:b};labels.append(b);items.push(entry);
    }
  }
  function setScene(scene,state,context) {
    const changed=!model||presentation?.id!==scene.id, oldLanding=landing;landing=Boolean(scene.landing);
    if(changed) {
      if(model)disposeWorld(model,palette);model=buildWorld(scene,palette);stage.add(model.root);
      path=[];pendingInspect=null;lastArea=null;showRoof=false;controlsBar.querySelector('[data-world="roof"]').textContent='显露屋顶';
      const spawn=model.kind==='temple'?(AREA_SPAWNS[scene.areaId]||AREA_SPAWNS.hall):[0,0,7];player.position.fromArray(spawn);resetCamera();
    }
    if((state.appearance?.body||'male')!==actorBody){stage.remove(player);player=createCharacter(palette,{female:state.appearance?.body==='female'});actorBody=state.appearance?.body||'male';stage.add(player);player.position.fromArray(AREA_SPAWNS.hall);}
    if(model.kind==='temple'&&scene.areaId&&scene.areaId!==lastArea) {
      if(!walkFromWorld){player.position.fromArray(AREA_SPAWNS[scene.areaId]||AREA_SPAWNS.hall);path=[];resetCamera();}
      lastArea=scene.areaId;walkFromWorld=false;
    }
    presentation=scene;game=state;updateActors(model,palette,scene);buildLabels(scene);
    for(const item of items){item.button.classList.toggle('selected',context?.value===item.id);item.button.classList.toggle('resolved',item.state==='completed');}
    if(model.kind==='temple') {
      const s=state.templeExploration,embers=s?.objectStates?.embers?.stage;
      for(let i=0;i<2;i++) {
        const id=`temple-pursuer-${i}`;
        let pursuer=model.npcs.get(id);
        if(state.screen==='templeCrisis'&&!pursuer){pursuer=createCharacter(palette,{color:0x2d3238,hat:true});pursuer.position.set(i?1.4:-1.4,0,i?10.4:9);pursuer.rotation.y=Math.PI;model.root.add(pursuer);model.npcs.set(id,pursuer);}
        if(pursuer)pursuer.visible=state.screen==='templeCrisis';
      }
      const porter=model.npcs.get('injured_porter');
      if(porter&&s?.porter?.rescued){porter.userData.body.rotation.z=.25;porter.userData.body.position.set(0,0,0);}
      model.fire.flames.scale.setScalar(embers==='banked'?.24:embers==='kindled'||state.templeOpening?.fireTended?1.1:.5);
      model.fire.light.userData.base=embers==='banked'?3:embers==='kindled'||state.templeOpening?.fireTended?23:8;
      model.brace.visible=Boolean(s?.objectStates?.broken_window?.actionIds?.includes('brace_window'));
      const cleared=s?.objectStates?.collapsed_wall?.actionIds?.includes('clear_breach');model.rubble.forEach((o,i)=>{o.visible=!cleared||i<4;});
      model.rack.rotation.z=s?.crisis?.method==='drop_rack'?.95:s?.objectStates?.incense_rack?.actionIds?.includes('loosen_rack')?.16:0;
      model.casket.visible=Boolean(s?.casket?.discovered)&&!s?.casket?.held&&!s?.casket?.lost&&s?.casket?.holder!=='player';
    }
    place.replaceChildren();const small=document.createElement('small');small.textContent=model.kind==='temple'?'金陵东郊 · 夜雨':'大曜 · 金陵';
    const title=document.createElement('strong');title.textContent=scene.title.split(' · ').slice(-1)[0];place.append(small,title);
    wrap.classList.toggle('is-landing',landing);controlsBar.querySelector('[data-world="roof"]').hidden=!model.roofs.length;
    if(landing){player.position.set(1.8,0,4.4);controls.target.set(0,1,1);camera.position.set(25,24,33);controls.update();}
    else if(oldLanding)resetCamera();
    const dawn=model.kind==='river';stage.background.set(dawn?0x536c7b:0x142a36);stage.fog.color.copy(stage.background);rain.visible=!dawn&&model.kind!=='danroom';
  }
  function resize(force=false) {
    if(!host)return;const r=host.getBoundingClientRect();if(r.width<2||r.height<2)return;
    if(force||Math.abs(width-r.width)>1||Math.abs(height-r.height)>1){width=r.width;height=r.height;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
  }
  const observer=new ResizeObserver(()=>resize());
  function attach(nextHost,scene,state,context) {
    observer.disconnect();host=nextHost;
    if(!host){active=false;wrap.remove();keys.clear();joy.x=joy.z=0;return;}
    host.append(wrap);host.closest('.scene-canvas')?.classList.add('has-world3d');host.dataset.ready='true';active=true;
    setScene(scene,state,context);observer.observe(host);resize(true);if(!frame)frame=requestAnimationFrame(tick);
  }
  function ndc(e) {const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);}
  canvas.addEventListener('pointerdown',e=>{pointerDown={x:e.clientX,y:e.clientY,button:e.button};canvas.focus({preventScroll:true});});
  canvas.addEventListener('pointerup',e=>{
    const down=pointerDown;pointerDown=null;if(!down||down.button!==0||Math.hypot(e.clientX-down.x,e.clientY-down.y)>7||landing||blockedUi())return;
    e.stopPropagation();ndc(e);
    // Ray-sphere picking follows the same known-object list as the visible labels.
    let hit=null,distance=Infinity;
    for(const item of items){const sphere=new T.Sphere(item.point,.75),intersection=ray.ray.intersectSphere(sphere,new T.Vector3());if(intersection){const d=ray.ray.origin.distanceTo(intersection);if(d<distance){distance=d;hit=item;}}}
    if(hit){inspect(hit);return;}
    const point=ray.ray.intersectPlane(ground,new T.Vector3());if(!point)return;
    path=findWalkPath(player.position,point,model.colliders,model.bounds);
    if(path.length){destination.position.set(path.at(-1).x,.035,path.at(-1).z);destination.visible=true;pendingInspect=null;}
    onClose();
  });
  canvas.addEventListener('click',e=>e.stopPropagation());canvas.addEventListener('contextmenu',e=>e.preventDefault());
  window.addEventListener('keydown',e=>{
    if(!active||landing||blockedUi()||e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
    const key=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift'].includes(key)){keys.add(key);path=[];e.preventDefault();}
    if(key==='e'&&!e.repeat){e.preventDefault();inspect(nearest);}
    if(key==='c')resetCamera();
    if(key==='escape'){path=[];keys.clear();destination.visible=false;}
  });
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur',()=>{keys.clear();joy.x=joy.z=0;});
  document.addEventListener('visibilitychange',()=>{keys.clear();if(audioGain)audioGain.gain.setTargetAtTime(document.hidden?0:soundOn?.28:0,audio.currentTime,.2);});
  function updateStick(e) {
    const r=stick.getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)/(r.width*.36),y=(e.clientY-r.top-r.height/2)/(r.height*.36),length=Math.max(1,Math.hypot(x,y));
    joy.x=x/length;joy.z=y/length;stick.firstElementChild.style.transform=`translate(${joy.x*22}px,${joy.z*22}px)`;path=[];
  }
  stick.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();stick.setPointerCapture(e.pointerId);updateStick(e);});
  stick.addEventListener('pointermove',e=>{if(stick.hasPointerCapture(e.pointerId))updateStick(e);});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(type,()=>{joy.x=joy.z=0;stick.firstElementChild.style.transform='';});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();active=false;onFallback('立体画卷暂时合拢，已展开平面画卷。');});
  function tick(now) {
    frame=requestAnimationFrame(tick);const dt=Math.min(.045,(now-lastTime)/1000||.016);lastTime=now;
    if(!active||document.hidden||!host?.isConnected||width<2||height<2)return;
    elapsed+=dt;const paused=blockedUi(),old=player.position.clone();let moving=false;
    if(!landing&&!paused) {
      let dx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+joy.x;
      let dz=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)+joy.z;
      if(Math.hypot(dx,dz)>.05){const az=controls.getAzimuthalAngle(),len=Math.max(1,Math.hypot(dx,dz)),speed=keys.has('shift')?5.6:3.5;
        const result=slideMove(player.position,{x:(dx*Math.cos(az)+dz*Math.sin(az))/len*dt*speed,z:(-dx*Math.sin(az)+dz*Math.cos(az))/len*dt*speed},model.colliders,model.bounds);player.position.set(result.x,0,result.z);
      }else if(path.length){const point=path[0],vx=point.x-player.position.x,vz=point.z-player.position.z,length=Math.hypot(vx,vz);
        if(length<.12)path.shift();else {const distance=Math.min(length,3.5*dt),result=slideMove(player.position,{x:vx/length*distance,z:vz/length*distance},model.colliders,model.bounds);player.position.set(result.x,0,result.z);if(old.distanceTo(player.position)<.0001)path=[];}
      }
      moving=old.distanceToSquared(player.position)>.000005;
      if(moving){player.rotation.y=Math.atan2(player.position.x-old.x,player.position.z-old.z);const delta=player.position.clone().sub(old);controls.target.add(delta);camera.position.add(delta);}
      if(!path.length)destination.visible=false;
      if(model.kind==='temple'&&presentation.areaId){const area=templeAreaAt(player.position.x,player.position.z);if(area!==lastArea){walkFromWorld=true;onAction('temple-area',area);}}
    }
    const body=player.userData;const swing=moving&&!reduceMotion?Math.sin(elapsed*10)*.5:0;
    body.arms.forEach((arm,i)=>arm.rotation.x=swing*(i?1:-1));body.legs.forEach((leg,i)=>leg.rotation.x=swing*(i?-1:1));body.body.position.y=moving&&!reduceMotion?Math.abs(Math.sin(elapsed*10))*.04:0;
    ring.position.x=player.position.x;ring.position.z=player.position.z;
    if(model.fire){model.fire.light.intensity=(model.fire.light.userData.base||10)*(1+(!reduceMotion?Math.sin(elapsed*11)*.07:0));if(!reduceMotion)model.fire.flames.rotation.y=elapsed*.4;}
    for(const roof of model.roofs)roof.traverse(o=>{if(o.isMesh){const alpha=landing||showRoof?1:.12;for(const m of Array.isArray(o.material)?o.material:[o.material]){if(m===palette.trim)continue;m.transparent=alpha<1;m.opacity=alpha;m.depthWrite=alpha===1;}o.castShadow=alpha===1;}});
    if(model.boat&&!reduceMotion)model.boat.position.y=-.1+Math.sin(elapsed*1.5)*.05;
    if(!reduceMotion&&rain.visible) {
      for(let i=0;i<720;i++){const j=i*6;rainPositions[j]-=dt*1.1;rainPositions[j+1]-=dt*16;if(rainPositions[j+1]<0){rainPositions[j+1]=24;rainPositions[j]=player.position.x+(Math.random()-.5)*50;rainPositions[j+2]=player.position.z+(Math.random()-.5)*48;}rainPositions[j+3]=rainPositions[j]-.1;rainPositions[j+4]=rainPositions[j+1]+.6;rainPositions[j+5]=rainPositions[j+2];}rainGeo.attributes.position.needsUpdate=true;
    }
    controls.enabled=!paused;controls.update();renderer.render(stage,camera);
    nearest=null;let min=3.7;
    for(const item of items) {
      const position=item.point.clone().project(camera),x=(position.x*.5+.5)*width,y=(-position.y*.5+.5)*height;
      const distance=Math.hypot(item.point.x-player.position.x,item.point.z-player.position.z);
      item.button.style.left=`${x}px`;item.button.style.top=`${y}px`;
      item.button.hidden=landing||paused||position.z>1||position.z<0||x<25||x>width-25||y<75||y>height-66;
      item.button.classList.toggle('nearby',distance<3.7);
      if(distance<min){nearest=item;min=distance;}
    }
    nearButton.hidden=!nearest||landing||paused;
    if(nearest)nearButton.textContent=`E · 查看${nearest.label}`;
  }
  return {attach,pause(){active=false;keys.clear();},dispose(){active=false;cancelAnimationFrame(frame);observer.disconnect();controls.dispose();renderer.dispose();audio?.close();}};
}
