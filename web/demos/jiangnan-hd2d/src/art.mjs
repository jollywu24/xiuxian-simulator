import * as T from '../vendor/three-0.186.0/three.module.min.js';
// Original, editable pixel artwork. No external imagery or game assets.
export function random(seed=41){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
export function canvasTexture(width,height,draw){const c=document.createElement('canvas');c.width=width;c.height=height;draw(c.getContext('2d'),width,height);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.magFilter=T.NearestFilter;return t;}
export function surface(kind){return canvasTexture(256,256,(c,w,h)=>{
 const r=random(kind.length*533);c.fillStyle={stone:'#898875',wall:'#d1c7a6',wood:'#6c4a30',roof:'#3d504e',floor:'#806548'}[kind];c.fillRect(0,0,w,h);
 if(kind==='stone'){
  c.fillStyle='#626d50';c.fillRect(0,0,256,256);
  // Jittered, clipped Voronoi stones tile seamlessly, rather than uniform brickwork.
  const sites=[];for(let y=0;y<8;y++)for(let x=0;x<7;x++)sites.push({x:(x+r()*.7)*256/7,y:(y+r()*.7)*32});
  const expanded=[];for(const p of sites)for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)expanded.push({x:p.x+dx*256,y:p.y+dy*256});
  for(const p of expanded){if(p.x< -35||p.x>291||p.y< -35||p.y>291)continue;let poly=[[p.x-50,p.y-50],[p.x+50,p.y-50],[p.x+50,p.y+50],[p.x-50,p.y+50]];
   for(const q of expanded){const dx=q.x-p.x,dy=q.y-p.y;if(q===p||dx*dx+dy*dy>6500)continue;const edge=(q.x*q.x+q.y*q.y-p.x*p.x-p.y*p.y)/2;const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],va=a[0]*dx+a[1]*dy-edge,vb=b[0]*dx+b[1]*dy-edge;if(va<=0)out.push(a);if((va<0)!==(vb<0)){const t=va/(va-vb);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}}poly=out;if(!poly.length)break;}
   if(poly.length){c.fillStyle=['#8c9280','#9b9e8d','#a7a693','#828d79','#b3af97'][Math.floor(r()*5)];c.beginPath();poly.forEach(([x,y],i)=>{x=p.x+(x-p.x)*.9;y=p.y+(y-p.y)*.9;i?c.lineTo(x,y):c.moveTo(x,y);});c.closePath();c.fill();c.strokeStyle='#c5bea155';c.lineWidth=1;c.stroke();}
  }
 }else if(kind==='roof'){
  for(let x=0;x<256;x+=16){c.fillStyle='#233d3c';c.fillRect(x,0,4,256);c.fillStyle='#62716a';c.fillRect(x+5,0,3,256);for(let y=0;y<256;y+=24){c.fillStyle='#263b3a';c.fillRect(x,y+21,16,3);c.fillStyle='#829087';c.fillRect(x+5,y+2,6,1);}}
 }else if(kind==='wood'||kind==='floor'){
  for(let y=0;y<256;y+=32){c.fillStyle='#362f25';c.fillRect(0,y,256,2);for(let i=0;i<30;i++){c.fillStyle=r()>.5?'#977249':'#4c3b29';c.fillRect(r()*256,y+r()*28+3,r()*70+10,1);}}
 }else {for(let i=0;i<2500;i++){c.globalAlpha=r()*.22;c.fillStyle=r()>.5?'#fff5d2':'#5f654d';c.fillRect(r()*256,r()*256,r()*8+1,r()*3+1);}c.globalAlpha=1;}
 for(let i=0;i<1100;i++){c.globalAlpha=.08;c.fillStyle=r()>.5?'#fff6cb':'#182f28';c.fillRect(r()*256,r()*256,2,2);}c.globalAlpha=1;
 });}
export function actorTexture(role='hero',frame=0,direction=0,attack=false){return canvasTexture(48,72,c=>{
 c.imageSmoothingEnabled=false;const pal={hero:['#344c5c','#799298','#d7d4b3'],tea:['#6a5440','#b6a582','#e1d3b6'],woman:['#704e5e','#b98791','#eed5b9'],boat:['#58665a','#929178','#d6c5a4'],porter:['#725237','#ab8656','#dec09a'],guard:['#583e3a','#a56c52','#c2aa84'],escort:['#293c49','#5b737a','#c1c9b3']}[role];
 const p=(color,points)=>{c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
 const rect=(col,x,y,w,h)=>{c.fillStyle=col;c.fillRect(x,y,w,h);};
 const step=[0,2,0,-2][frame%4],side=direction===1||direction===3,back=direction===2;
 // Scabbard, boots and split robe have separate silhouettes and fixed foot pivot.
 p('#1c2527',[[29,31],[32,32],[18,65],[15,63]]);rect('#baad77',28,32,5,3);
 rect('#202628',18+step,59,5,8);rect('#202628',27-step,59,5,8);rect('#aaa18a',16+step,66,7,2);rect('#aaa18a',26-step,66,7,2);
 p('#20282b',[[18,30],[29,30],[34,42],[36,59],[28,63],[24,59],[18,63],[12,59],[15,40]]);
 p(pal[0],[[18,31],[28,31],[32,44],[34,58],[27,60],[24,55],[19,61],[14,58],[17,43]]);
 p(pal[1],[[18,32],[23,34],[20,47],[16,56],[17,40]]);p(pal[1],[[27,35],[30,43],[31,56],[28,52],[25,43]]);
 p(pal[2],[[19,30],[24,36],[28,30],[27,38],[23,43],[20,38]]);rect('#2a2924',16,43,16,4);rect('#c8ac64',22,43,4,3);
 p(pal[0],[[17,32],[12,35],[9,47],[13,50],[17,41]]);p(pal[1],[[28,32],[33,34],[37,44],[33,48],[28,40]]);
 rect('#c7a67a',10,48,4,5);rect('#e0bd91',33,45,4,5);
 p('#151e22',[[16,11],[19,7],[28,7],[33,13],[34,25],[30,32],[17,30],[13,23],[13,15]]);
 if(!back){p('#c69569',[[17,16],[29,15],[31,23],[27,30],[21,30],[16,25]]);p('#e8c497',[[19,16],[28,16],[29,23],[26,28],[21,27],[18,23]]);rect('#1e2929',side?26:19,21,2,2);if(!side)rect('#1e2929',27,21,2,2);rect('#aa7052',24,26,3,1);}
 p('#222b2c',[[14,16],[15,10],[20,7],[28,9],[32,14],[31,21],[27,18],[24,13],[21,18],[17,20]]);
 rect('#526060',17,11,3,3);rect('#414e4e',21,8,6,2);rect('#1c2428',21,3,6,5);rect('#ad9664',20,7,8,2);
 if(role==='tea'){rect('#bdbbae',14,13,5,6);rect('#d5cfb7',28,13,4,6);p('#c3bda4',[[21,26],[28,26],[25,35],[22,31]]);}
 if(role==='boat'||role==='porter'){p('#544b31',[[8,17],[21,5],[29,7],[39,17],[30,21],[14,21]]);p('#b5a171',[[9,16],[22,5],[28,7],[37,16]]);rect('#776945',11,17,25,2);}
 if(role==='woman'){p('#292a2c',[[14,14],[17,27],[15,44],[11,40],[12,23]]);rect('#d5a587',30,14,4,3);}
 if(role==='hero'||role==='escort'||role==='guard'){
  const tip=attack?44:39;p('#202b2c',[[33,44],[tip,attack?23:54],[tip-2,attack?21:56],[31,45]]);p('#d1ded5',[[34,44],[tip,attack?23:54],[tip-1,attack?22:55],[33,44]]);rect('#c6a86c',31,43,7,2);
 }
 });}
export function makeActor(role){
 const textures=Array.from({length:4},(_,d)=>Array.from({length:4},(_,f)=>actorTexture(role,f,d)));
 const mat=new T.MeshLambertMaterial({map:textures[0][0],alphaTest:.5,side:T.DoubleSide});
 const mesh=new T.Mesh(new T.PlaneGeometry(1.2,1.8),mat);mesh.geometry.translate(0,.86,0);mesh.castShadow=true;mesh.receiveShadow=true;
 mesh.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:mat.map,alphaTest:.5,side:T.DoubleSide});
 const shadowTexture=canvasTexture(32,32,c=>{const g=c.createRadialGradient(16,16,2,16,16,15);g.addColorStop(0,'#0009');g.addColorStop(1,'#0000');c.fillStyle=g;c.fillRect(0,0,32,32);});const shadow=new T.Mesh(new T.PlaneGeometry(.9,.48),new T.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false,opacity:.5}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.025;mesh.add(shadow);
 const attackMap=actorTexture(role,1,0,true);
 return {mesh,update(t,moving,direction=0,attack=false){const map=attack?attackMap:textures[direction][moving?Math.floor(t*9)%4:0];mat.map=map;mesh.customDepthMaterial.map=map;}};
}
