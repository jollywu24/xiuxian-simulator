// Shared collision, navigation and interaction coordinates. Y is always groundHeight().
export const OBSTACLES = {
 town: [[-20,-8,-8,0],[-18,-15,-5,-8],[-22,4,-14,13],[15,-14,25,-8],[21,-7,26,5],[-11,0,-7,2],[-12,6,-10,9.8],[2.35,-15,2.7,-2.1],[2.35,2.1,2.7,6.5],[.05,-1.7,.75,-1.1],[12.7,-9.3,13.3,-8.7],[.3,10.9,1.1,11.8],[18.425,-7.075,19.575,-5.925]],
 inn: [[-5,-3,-3,-1],[2,-3,4,-1],[-5,1,-3,3],[2,1,4,3],[-5,-5,1,-3.7],[4,-5,5.5,-2.5]],
};
export const TARGETS = [
 {id:'tea',name:'周伯 · 茶摊',scene:'town',x:-9,z:3.2,actor:true,role:'tea'},
 {id:'herbalist',name:'采药人',scene:'town',x:-6,z:1.8,actor:true,role:'woman'},
 {id:'rope',name:'断开的缆绳',scene:'town',x:1.6,z:8.5},
 {id:'tag',name:'遗落的货签',scene:'town',x:1.8,z:11.3},
 {id:'boatman',name:'老艄公',scene:'town',x:2.2,z:13,actor:true,role:'boat'},
 {id:'porter',name:'脚夫陆七',scene:'town',x:0,z:6.7,actor:true,role:'porter'},
 {id:'innDoor',name:'进入临水客栈',scene:'town',x:-6.5,z:-7.1},
 {id:'guard',name:'仓院看守',scene:'town',x:17,z:-4,actor:true,role:'guard'},
 {id:'chest',name:'沈字镖箱',scene:'town',x:18,z:-6.5},
 {id:'innExit',name:'回到沿河街',scene:'inn',x:0,z:4},
 {id:'escort',name:'程岳 · 镖师',scene:'inn',x:1.4,z:1.8,actor:true,role:'escort'},
 {id:'keeper',name:'客栈掌柜',scene:'inn',x:-1.6,z:-3.3,actor:true,role:'tea'},
 {id:'waiter',name:'跑堂',scene:'inn',x:0,z:-1,actor:true,role:'porter'},
 {id:'guestA',name:'行脚商',scene:'inn',x:-4,z:3.5,actor:true,role:'boat'},
 {id:'guestB',name:'食客',scene:'inn',x:3,z:-3.5,actor:true,role:'woman'},
];
export function groundHeight(x,z,scene='town') {
 if(scene==='inn') return 0;
 if(x>=3 && x<=10 && Math.abs(z)<1.8) return 1.1 + Math.sin((x-3)/7*Math.PI)*0.65;
 if(x>0 && x<3 && z>7) return 1.1 - Math.min(1,(z-7)/2)*0.6;
 return 1.1;
}
export function walkable(x,z,scene='town',radius=.25) {
 if(!Number.isFinite(x)||!Number.isFinite(z)) return false;
 if(scene==='inn') { if(x<-5.7+radius||x>5.7-radius||z<-4.6+radius||z>4.6-radius)return false; }
 else {
  if(x<-21+radius||x>26-radius||z<-15+radius||z>16-radius)return false;
  if(x>3-radius && x<10+radius && Math.abs(z)>1.4-radius)return false;
 }
 return !OBSTACLES[scene]?.some(([a,b,c,d])=>x>a-radius&&x<c+radius&&z>b-radius&&z<d+radius);
}
export function canStep(a,b,scene='town') {
 const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.15));
 for(let i=1;i<=n;i++)if(!walkable(a.x+(b.x-a.x)*i/n,a.z+(b.z-a.z)*i/n,scene))return false;
 return true;
}
export function findPath(from,to,scene='town') {
 if(!walkable(to.x,to.z,scene))return [];
 const step=.5, key=(x,z)=>`${x},${z}`;
 const snap=p=>{const candidates=[];const x=Math.round(p.x/step),z=Math.round(p.z/step);for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const n={x:x+dx,z:z+dz};if(canStep(p,{x:n.x*step,z:n.z*step},scene))candidates.push(n);}return candidates.sort((a,b)=>Math.hypot(a.x*step-p.x,a.z*step-p.z)-Math.hypot(b.x*step-p.x,b.z*step-p.z))[0];};
 const start=snap(from),goal=snap(to);if(!start||!goal)return [];
 const open=[{...start,g:0,f:0}], known=new Map(), parents=new Map();
 known.set(key(start.x,start.z),0);
 let end;
 for(let visits=0;open.length&&visits<12000;visits++) {
  open.sort((a,b)=>b.f-a.f); const c=open.pop(),ck=key(c.x,c.z);
  if(c.g>known.get(ck))continue;
  if(c.x===goal.x&&c.z===goal.z){end=c;break;}
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]]) {
   const x=c.x+dx,z=c.z+dz,k=key(x,z),g=c.g+Math.hypot(dx,dz);
   if(g>=(known.get(k)??Infinity)||!canStep({x:c.x*step,z:c.z*step},{x:x*step,z:z*step},scene))continue;
   known.set(k,g);parents.set(k,ck);open.push({x,z,g,f:g+Math.hypot(x-goal.x,z-goal.z)});
  }
 }
 if(!end)return [];
 const path=[]; let k=key(end.x,end.z);
 while(k!==key(start.x,start.z)){const [x,z]=k.split(',').map(Number);path.unshift({x:x*step,z:z*step});k=parents.get(k);}
 path.unshift({x:start.x*step,z:start.z*step});
 if(path.length&&!canStep(from,path[0],scene))return [];
 path.push({x:to.x,z:to.z});return path;
}
export function nearby(state) {
 return TARGETS.filter(t=>t.scene===state.scene&&Math.hypot(t.x-state.position.x,t.z-state.position.z)<1.8&&canStep(state.position,t,state.scene)).sort((a,b)=>Math.hypot(a.x-state.position.x,a.z-state.position.z)-Math.hypot(b.x-state.position.x,b.z-state.position.z))[0];
}
