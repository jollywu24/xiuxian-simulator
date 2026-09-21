import {walkable} from './world.mjs';
export const SAVE_KEY='wudao-jiangnan-hd2d-v1';
export const QUESTS=['先去茶摊，向周伯打听渡口的争执','调查渡口的断缆与货签','进入临水客栈，找镖师程岳核对货号','过桥前往东岸，与仓院看守交涉','击败仓院的两名看守','取回仓院里的沈字镖箱','回客栈向程岳交付镖箱','渡口旧账已了，临水镇任君行'];
export function initialState(){return {version:1,scene:'town',position:{x:-4,z:5},quest:0,clues:[],coins:30,medicine:1,hp:120,mp:36,box:false,rewarded:false,choice:null,reputation:0,battle:null,log:['初秋午后，你随药船来到大曜东南的临水镇。渡口有人争执，茶摊上的老人似乎知道缘由。'],settings:{evening:false,sound:false,quality:'high'}};}
function note(s,text){s.log=[...s.log,text].slice(-40);return {state:s,text};}
export function reduce(state,action,value) {
 const s=structuredClone(state);
 switch(action){
 case 'accept':if(s.quest===0){s.quest=1;return note(s,'周伯：沈家的药箱没能交到镖师手上。去渡口看看，别急着信任何一面之词。');}break;
 case 'rope':case 'tag':
  if(s.quest>=1&&!s.clues.includes(action)){s.clues.push(action);if(s.clues.length===2&&s.quest===1)s.quest=2;return note(s,action==='rope'?'缆绳切口平整，绳上还留着仓院用的靛青染料。这不是被水浪扯断的。':'货签写着「沈记·药字十七」，背面多盖了一枚东岸仓印。药箱被搬进了仓院。');}break;
 case 'confirm':if(s.quest===2){s.quest=3;return note(s,'程岳核对账册：货号确实是十七。仓院索要的是前任货主的旧债，这批救急药不能扣。');}break;
 case 'fight':if(s.quest===3){s.quest=4;s.battle=newBattle();return note(s,'看守拔刀拦住去路。先走位，再出招；东岸仓院无处藏身。');}break;
 case 'recover':if(s.quest===5&&!s.box){s.box=true;s.quest=6;return note(s,'你找回沈字镖箱。封蜡完好，药材未损。程岳还在客栈等消息。');}break;
 case 'deliver':if(s.quest===6&&s.box&&!s.rewarded&&['accept','decline'].includes(value)){s.rewarded=true;s.quest=7;s.box=false;s.choice=value;s.coins+=value==='accept'?60:30;s.reputation+=value==='accept'?1:3;return note(s,value==='accept'?'程岳交给你六十文酬劳，抱拳道：往后水路上见，便是朋友。':'你只收下三十文约定酬劳，将额外谢礼退回。程岳记住了这份情义。');}break;
 case 'buy':if(s.coins>=12){s.coins-=12;s.medicine++;return note(s,'付出十二文，购得一份伤药。');}return {state,text:'铜钱不足十二文。'};
 case 'heal':if(s.medicine>0&&s.hp<120&&!s.battle){s.medicine--;s.hp=Math.min(120,s.hp+40);return note(s,'敷上伤药，气血恢复四十。');}return {state,text:'眼下无需用药，或行囊中已无伤药。'};
 }
 return {state,text:'此事已经记下。'};
}
export const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z);
export function newBattle(){return {round:1,moved:false,hero:{x:1,z:3,hp:120,mp:36,attack:24,defense:8},enemies:[{id:'a',name:'持刀看守',x:5,z:2,hp:68,attack:18,defense:5},{id:'b',name:'短棍看守',x:6,z:4,hp:60,attack:16,defense:4}],events:[]};}
export function battlePath(b,to){
 if(!Number.isInteger(to.x)||!Number.isInteger(to.z)||to.x<0||to.x>7||to.z<0||to.z>5)return [];
 const occupied=p=>b.enemies.some(e=>e.hp>0&&e.x===p.x&&e.z===p.z);
 const queue=[{...b.hero,path:[]}],seen=new Set([`${b.hero.x},${b.hero.z}`]);
 while(queue.length){const p=queue.shift();if(p.x===to.x&&p.z===to.z)return p.path;if(p.path.length>=3)continue;
 for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const n={x:p.x+dx,z:p.z+dz},key=`${n.x},${n.z}`;if(n.x<0||n.x>7||n.z<0||n.z>5||seen.has(key)||occupied(n))continue;seen.add(key);queue.push({...n,path:[...p.path,n]});}}
 return [];
}
export function combat(state,action,target) {
 if(!state.battle||state.quest!==4)return {state,text:'眼下没有交锋。'};
 const s=structuredClone(state),b=s.battle,h=b.hero;b.events=[];
 if(action==='move'){
  if(b.moved||!target||!battlePath(b,target).length)return {state,text:'每回合可走三格；不能穿过对手。'};
  h.x=target.x;h.z=target.z;b.moved=true;return {state:s,text:'站稳脚步，选择招式。'};
 }
 if(['attack','skill'].includes(action)){
  const e=b.enemies.find(e=>e.id===target&&e.hp>0),range=action==='skill'?2:1;
  if(!e||distance(h,e)>range)return {state,text:`目标太远，需在${range}格之内。`};
  if(action==='skill'&&h.mp<12)return {state,text:'内力不足十二点。'};
  const damage=Math.max(1,(action==='skill'?36:24)-e.defense);e.hp=Math.max(0,e.hp-damage);if(action==='skill')h.mp-=12;
  b.events.push({id:`${b.round}-hero`,who:'hero',target:e.id,damage,skill:action==='skill'});
 }else if(action==='medicine'){
  if(s.medicine<1||h.hp===120)return {state,text:'无法用药。'};s.medicine--;h.hp=Math.min(120,h.hp+40);
 }else if(action!=='defend')return {state,text:'请选择招式。'};
 if(b.enemies.every(e=>e.hp<=0)){s.quest=5;s.hp=h.hp;s.mp=h.mp;s.battle=null;return note(s,'两名看守收起兵器，让开仓门。沈字镖箱就在货垛旁。');}
 for(const e of b.enemies.filter(e=>e.hp>0)){
  for(let step=0;step<2&&distance(e,h)>1;step++){
   const options=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dz])=>({x:e.x+dx,z:e.z+dz})).filter(p=>p.x>=0&&p.x<8&&p.z>=0&&p.z<6&&distance(p,h)>0&&!b.enemies.some(o=>o!==e&&o.hp>0&&o.x===p.x&&o.z===p.z)).sort((a,c)=>distance(a,h)-distance(c,h));
   if(options.length&&distance(options[0],h)<distance(e,h)){e.x=options[0].x;e.z=options[0].z;}
  }
  if(distance(e,h)===1){let damage=e.attack-h.defense;if(action==='defend')damage=Math.ceil(damage/2);h.hp=Math.max(0,h.hp-damage);b.events.push({id:`${b.round}-${e.id}`,who:e.id,target:'hero',damage});}
 }
 if(h.hp<=0){s.battle=null;s.quest=3;s.hp=120;s.mp=36;s.position={x:13,z:1};return note(s,'你被逼退到桥头。调息后可以再去仓院，已查明的线索仍然有效。');}
 b.round++;b.moved=false;s.hp=h.hp;s.mp=h.mp;return {state:s,text:b.events.map(e=>`${e.who==='hero'?'你':'看守'}造成${e.damage}点伤害`).join('；')||'你收剑守势，等待对手靠近。'};
}
export function validateSave(raw){
 if(!raw||raw.version!==1||!['town','inn'].includes(raw.scene))throw Error('行录版本不合。');
 const s=initialState();
 for(const k of ['quest','coins','medicine','hp','mp','reputation'])if(!Number.isInteger(raw[k])||raw[k]<0||raw[k]>100000)throw Error('行录数值有误。');
 if(raw.quest>7||raw.hp>120||raw.mp>36||!Array.isArray(raw.clues)||raw.clues.some(c=>!['rope','tag'].includes(c))||new Set(raw.clues).size!==raw.clues.length)throw Error('行录内容有误。');
 if(typeof raw.box!=='boolean'||typeof raw.rewarded!=='boolean'||!Array.isArray(raw.log)||raw.log.some(v=>typeof v!=='string'||v.length>1000))throw Error('行录记录有误。');
 if(raw.quest>=2&&raw.clues.length!==2||raw.rewarded!==(raw.quest===7)||raw.box!==(raw.quest===6))throw Error('行录前后不符。');
 Object.assign(s,{scene:raw.scene,quest:raw.quest,coins:raw.coins,medicine:raw.medicine,hp:raw.hp,mp:raw.mp,reputation:raw.reputation,clues:[...raw.clues],box:raw.box,rewarded:raw.rewarded,choice:['accept','decline'].includes(raw.choice)?raw.choice:null,log:raw.log.slice(-40)});
 s.position=walkable(raw.position?.x,raw.position?.z,s.scene)?{x:raw.position.x,z:raw.position.z}:s.scene==='inn'?{x:0,z:4}:{x:-4,z:5};
 if(s.quest===4){s.quest=3;s.scene='town';s.position={x:13,z:1};s.hp=120;s.mp=36;}
 if(raw.settings)s.settings={evening:raw.settings.evening===true,sound:raw.settings.sound===true,quality:raw.settings.quality==='low'?'low':'high'};
 return s;
}
