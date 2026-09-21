import {TownView} from './render.mjs';
import {initialState,validateSave,SAVE_KEY,QUESTS,reduce,combat,distance} from './rules.mjs';
import {TARGETS,findPath,canStep,nearby,groundHeight} from './world.mjs';
const $=s=>document.querySelector(s),escapeHtml=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state=initialState(),saveBlocked=false,startNotice='';
try{const raw=localStorage.getItem(SAVE_KEY);if(raw)state=validateSave(JSON.parse(raw));}catch{saveBlocked=true;startNotice='旧行录未能辨清，已原样保留。可在行旅中导入行录，或另起一程。';}
if(new URLSearchParams(location.search).get('quality')==='low')state.settings.quality='low';
const view=new TownView($('#world'));let path=[],pendingTarget=null,keys=new Set(),direction=0,modal=false,toastTimer,previousFocus=null,selectedSkill='attack',selectedEnemy='a',audioContext,ambient,stepTime=0,battleLock=0;
view.setQuality(state.settings.quality);
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),4200);}
function save(){if(saveBlocked)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch{toast('行录未能记下，请在行旅中导出随身携带。');}}
function close(){modal=false;$('#overlay').hidden=true;keys.clear();previousFocus?.focus?.();}
function panel(title,body,choices=[],speaker=''){
 previousFocus=document.activeElement;modal=true;path=[];pendingTarget=null;keys.clear();$('#overlay').hidden=false;$('#panel').innerHTML=`<button class="close" data-action="close" aria-label="收起">×</button>${speaker?`<div class="speaker">${escapeHtml(speaker)}</div>`:''}<h2 id="panel-title">${escapeHtml(title)}</h2>${body}<div class="choices">${choices.map(([action,label,value])=>`<button data-action="${escapeHtml(action)}"${value!==undefined?` data-value="${escapeHtml(value)}"`:''}>${escapeHtml(label)}</button>`).join('')}</div>`;$('#panel').focus();
}
function talk(title,text,choices=[],speaker=''){panel(title,`<p>${escapeHtml(text)}</p>`,[...choices,['close','就此别过']],speaker);}
function apply(action,value){const result=reduce(state,action,value);state=result.state;toast(result.text);save();hud();return result;}
function enter(scene){close();path=[];pendingTarget=null;keys.clear();state.scene=scene;state.position=scene==='inn'?{x:0,z:4}:{x:-6.5,z:-6.7};save();hud();toast(scene==='inn'?'酒香与茶声迎面而来。镖师在右手客桌旁等候。':'出了客栈，河风吹散了衣上的酒气。');}
function interact(id){
 if(state.battle)return;
 const t=TARGETS.find(t=>t.id===id)||nearby(state);if(!t||t.scene!==state.scene||Math.hypot(t.x-state.position.x,t.z-state.position.z)>1.85||!canStep(state.position,t,state.scene))return toast('再走近些，才能看得分明。');
 path=[];pendingTarget=null;
 switch(t.id){
 case 'tea':talk('一盏茶里的消息',state.quest===0?'周伯将粗瓷茶碗推到你面前。\n「药船今早到了，药箱却不见了。程镖师在客栈等得焦心。你若愿意搭把手，去渡口瞧瞧那段断缆，再看看搬货时落下的货签。」':state.quest===7?'「事了拂衣去，茶还温着。」周伯笑着为你续上一碗。':'「断缆看去向，货签认主人。听人说话之前，先看眼前的东西。」',state.quest===0?[['accept','替程镖师查一查']]:[['buy','买一份伤药 · 十二文']],'周伯 · 临河茶摊');break;
 case 'rope':case 'tag':if(state.quest===0)return talk(t.name,'渡口留下些零碎痕迹，先向茶摊老人打听一下来龙去脉。');{const r=apply(t.id);talk(t.name,r.text,[],'渡口 · 察看');}break;
 case 'innDoor':enter('inn');break;case 'innExit':enter('town');break;
 case 'escort':{
  if(state.quest===2)talk('药字十七', '程岳摊开账册，指尖停在「沈记·药字十七」。\n「是这只箱子。东岸仓院在追前任货主欠下的旧债，药材却是沈家救急用的。他们若执意扣货，还得请你去说个明白。」',[['confirm','核对货号，答应去东岸仓院']],'程岳 · 护镖人');
  else if(state.quest===6)talk('镖箱归主','封蜡一分未损，程岳终于松开紧皱的眉头。\n「三十文是说好的酬劳，这里另有三十文谢礼。兄弟，请收下。」',[['deliver','收下六十文 · 结一份善缘','accept'],['deliver','只收约定三十文 · 情义更重','decline']],'程岳 · 护镖人');
  else talk('临水一面',state.quest===7?(state.choice==='decline'?'「叶兄不贪浮财，这份情我记下了。往后同走水路，程某为你照应。」':'「往后水路上见，便是朋友。这碗酒，我敬你。」'):state.quest>=3?'「过桥往北便是东岸仓院。你查到的两条线索，我都记在账上了。万事小心。」':'「箱子没到，船却已靠岸。劳烦先去渡口查看断缆和货签，空口争论是找不回药的。」',[],'程岳 · 护镖人');break;}
 case 'guard':if(state.quest===3)talk('旧债与新货','「前任货主欠了仓钱，我们只好扣下这箱药。」\n你将货签和账目一一对明，看守却将刀横在门前。\n「账有账的道理，想搬走箱子，先问过我兄弟二人！」',[['fight','拔剑止争 · 仓院交锋']],'东岸 · 仓院');else talk('仓院前','「闲人莫近，货物不得擅取。」\n先查清渡口的货签，再找客栈镖师核对账目。');break;
 case 'chest':if(state.quest===5){const r=apply('recover');talk('完璧归赵',r.text);}else talk('沈字镖箱',state.quest>=6?'木架上只剩一块方形积尘。镖箱已经取走了。':'箱身有沈字封蜡。看守寸步不让，眼下不能取走。');break;
 case 'keeper':talk('行路须有备','「刀伤跌打，不能硬撑。十二文一份伤药，敷一次可回四十气血。」',[['buy','买一份伤药 · 十二文']],'掌柜 · 临水客栈');break;
 case 'porter':talk('搬货的人',state.quest===7?'「原来药是救人的！方才程镖师来过，没再为难我。多谢你说清楚。」':'陆七搓着沾蓝的手。\n「仓里让我搬，我只管下力。今早那箱沉得很，从这儿上岸，抬过桥去了。别的，我真不知道。」');break;
 case 'boatman':talk('水路无言','「绳断了还能接，信断了可难续。那刀口利落得很，可不是浪打的。」\n老艄公收紧篙绳，望向东岸。');break;
 case 'herbalist':talk('秋药入市','「这一带山里产白芷。药是救命的东西，错过了时辰，再贵也没用。」\n采药人将竹篓里的叶子摊开晾晒。');break;
 case 'waiter':talk('客来茶热','「程镖师就在右边桌旁。我还得去后厨端菜，客官请自便。」');break;
 default:talk('客栈闲谈','「临水镇靠一条河吃饭，货船误一天，两岸都不得安生。」');
 }
}
function go(id){const t=TARGETS.find(t=>t.id===id);if(!t||t.scene!==state.scene||state.battle)return false;close();const route=findPath(state.position,t,state.scene);if(!route.length){toast('这条路走不通，请沿街绕行。');return false;}path=route;pendingTarget=id;view.cursor.position.set(t.x,groundHeight(t.x,t.z,state.scene)+.04,t.z);view.cursor.visible=true;return true;}
function inventory(){panel('行囊',`<p>铜钱 <b>${state.coins}</b> 文 · 伤药 <b>${state.medicine}</b> 份<br>江湖情义 ${state.reputation}</p><p>${state.clues.includes('rope')?'断缆：平整刀口与靛青染料。<br>':''}${state.clues.includes('tag')?'货签：沈记·药字十七，东岸仓印。<br>':''}${state.box?'沈字镖箱：封蜡完好，药材未损。':''}</p>`,[['heal','使用伤药 · 恢复四十气血']]);}
function journal(){panel('江湖行录',`<p>${escapeHtml(QUESTS[state.quest])}</p><ol class="ledger">${state.log.map(t=>`<li>${escapeHtml(t)}</li>`).join('')}</ol>`);}
function map(){const points=state.scene==='inn'?[['innExit','沿河街',50,86],['escort','程岳',68,57],['keeper','掌柜',32,25]]:[['tea','周伯 · 茶摊',26,56],['innDoor','临水客栈',26,22],['rope','渡口 · 断缆',48,74],['tag','货签',48,89],['guard','东岸仓院',84,35]];panel('临水行路图',`<p>点选地点，沿可走的道路前往。跨河须走木桥。</p><div class="map-full"><span class="bridge"></span>${points.map(([id,n,x,y])=>`<button data-action="go" data-value="${id}" style="left:${x}%;top:${y}%">${n}</button>`).join('')}</div>`);}
function settings(){panel('行旅',`<p>临水镇的这一程，独立记在随身行录中。</p>`,[['sound',state.settings.sound?'收起声响':'听水与足音'],['light',state.settings.evening?'看午后天光':'看河岸晚照'],['quality',state.settings.quality==='high'?'轻装行旅 · 减轻画面负担':'细看山河 · 完整画面'],['export','导出这一程'],['import','导入随身行录'],['resetAsk','另起一程']]);}
function hud(){
 $('#objective').textContent=QUESTS[state.quest];$('#clue-count').textContent=state.quest===7?'旧账已了 · 江湖再会':`渡口线索 ${state.clues.length} / 2`;
 $('#location').textContent=state.scene==='inn'?'临水客栈 · 一层':state.position.x>10?'大曜 · 东岸仓院':'大曜 · 东南水乡';
 const hp=state.battle?.hero.hp??state.hp,mp=state.battle?.hero.mp??state.mp;$('#hp').textContent=`气血 ${hp} / 120`;$('#mp').textContent=`内力 ${mp} / 36`;$('#hp-bar').style.width=`${hp/120*100}%`;$('#mp-bar').style.width=`${mp/36*100}%`;
 $('#battle').hidden=!state.battle;view.showGrid(state.battle);
 if(state.battle){const b=state.battle;if(!b.enemies.some(e=>e.id===selectedEnemy&&e.hp>0))selectedEnemy=b.enemies.find(e=>e.hp>0)?.id;$('#battle').innerHTML=`<span class="eyebrow">仓院交锋 · 第${b.round}回合</span><p>${b.moved?'已走位 · 选择招式后收势':'点击地面走位，至多三格；行动后对方出招。'}</p><div class="row">${[['attack','1 平刺 · 一格'],['skill','2 流水剑 · 两格 / 十二内力'],['defend','3 守势'],['medicine','4 伤药']].map(([id,label])=>`<button data-action="selectSkill" data-value="${id}" class="${selectedSkill===id?'selected':''}">${label}</button>`).join('')}</div><div class="row">${b.enemies.filter(e=>e.hp>0).map(e=>`<button data-action="selectEnemy" data-value="${e.id}" class="${selectedEnemy===e.id?'selected':''}">${e.name} ${e.hp} · ${distance(b.hero,e)}格</button>`).join('')}<button data-action="strike">确认出招</button></div>`;}
}
function strike(action=selectedSkill,target=selectedEnemy){if(performance.now()<battleLock)return;const priorBattle=state.battle;const result=combat(state,action,target);if(result.state!==state){state=result.state;if(action!=='move'){view.effect(state.battle?.events||[{who:'hero',target,damage:0}],state.battle||priorBattle);battleLock=performance.now()+Math.max(450,(state.battle?.events.length||1)*320);tone(130,.12);}hud();save();}toast(result.text);}
function tone(freq=220,duration=.04){if(!state.settings.sound)return;audioContext??=new AudioContext();if(audioContext.state==='suspended')audioContext.resume();const o=audioContext.createOscillator(),g=audioContext.createGain();o.frequency.value=freq;o.type='triangle';g.gain.setValueAtTime(.025,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audioContext.currentTime+duration);o.connect(g).connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+duration);}
function soundscape(){if(!state.settings.sound){ambient?.gain.gain.setTargetAtTime(0,audioContext.currentTime,.2);return;}tone(340,.08);if(!ambient){const buffer=audioContext.createBuffer(1,audioContext.sampleRate*3,audioContext.sampleRate),data=buffer.getChannelData(0);let v=0;for(let i=0;i<data.length;i++){v=(v+(Math.random()*2-1)*.03)/1.03;data[i]=v;}const source=audioContext.createBufferSource();source.buffer=buffer;source.loop=true;const filter=audioContext.createBiquadFilter();filter.type='lowpass';filter.frequency.value=650;const gain=audioContext.createGain();source.connect(filter).connect(gain).connect(audioContext.destination);source.start();ambient={source,gain};}ambient.gain.gain.setTargetAtTime(.12,audioContext.currentTime,.3);}
async function action(name,value){
 if(name==='close')return close();if(name==='interact')return interact();
 if(name==='go')return go(value);if(name==='inventory')return inventory();if(name==='journal')return journal();if(name==='map')return map();if(name==='settings')return settings();
 if(name==='selectSkill'){selectedSkill=value;return hud();}if(name==='selectEnemy'){selectedEnemy=value;return hud();}if(name==='strike')return strike();
 if(['accept','confirm','fight','deliver'].includes(name)){close();apply(name,value);if(name==='fight'){path=[];view.effect();}return;}
 if(name==='buy'){apply('buy');return;}if(name==='heal'){apply('heal');return inventory();}
 if(name==='light'){state.settings.evening=!state.settings.evening;save();return settings();}
 if(name==='quality'){state.settings.quality=state.settings.quality==='high'?'low':'high';view.setQuality(state.settings.quality);save();return settings();}
 if(name==='sound'){state.settings.sound=!state.settings.sound;soundscape();save();return settings();}
 if(name==='resetAsk')return panel('再入临水','<p>另起一程会清去临水镇现有的经历。大曜其他旅程不受影响。</p>',[['reset','放下旧行录，重新入镇'],['close','保留这一程']]);
 if(name==='reset'){const preferences=state.settings;state=initialState();state.settings=preferences;saveBlocked=false;close();view.setQuality(state.settings.quality);soundscape();save();hud();return;}
 if(name==='export'){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='临水行录.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;}
 if(name==='import')return $('#import-file').click();
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b&&!b.disabled)action(b.dataset.action,b.dataset.value);});
$('#import-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>100000)throw Error('行录太厚，无法辨认。');const candidate=validateSave(JSON.parse(await file.text()));state=candidate;saveBlocked=false;path=[];pendingTarget=null;close();save();view.setQuality(state.settings.quality);hud();toast('随身行录已展开。');}catch(error){toast(`未替换当前行录：${error.message}`);}e.target.value='';});
$('#world').addEventListener('pointerdown',e=>{
 if(modal||e.button!==0)return;tone(310,.015);const hit=view.pick(e.clientX,e.clientY,!state.battle);if(!hit)return;
 if(state.battle){if(hit.target)return;const cell={x:Math.round(hit.x-13),z:Math.round(hit.z+5)},enemy=state.battle.enemies.find(en=>en.hp>0&&en.x===cell.x&&en.z===cell.z);if(enemy){selectedEnemy=enemy.id;hud();}else strike('move',cell);return;}
 if(hit.target)return go(hit.target);const route=findPath(state.position,hit,state.scene);if(!route.length)return toast('那里不能落脚，沿石路或木桥走吧。');path=route;pendingTarget=null;view.cursor.position.set(hit.x,groundHeight(hit.x,hit.z,state.scene)+.05,hit.z);view.cursor.visible=true;
});
document.addEventListener('keydown',e=>{
 if(e.target.matches('input,textarea'))return;const key=e.key.toLowerCase();
 if(modal){if(key==='escape'){e.preventDefault();close();}else if(key==='tab'){const els=[...$('#panel').querySelectorAll('button,a,input')];if(e.shiftKey&&document.activeElement===els[0]){e.preventDefault();els.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===els.at(-1)){e.preventDefault();els[0].focus();}}else if(/^[1-9]$/.test(key))$('#panel .choices button:nth-child('+key+')')?.click();return;}
 if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift',' '].includes(key)){e.preventDefault();keys.add(key);path=[];pendingTarget=null;}
 if(e.repeat)return;
 if(key==='e'){e.preventDefault();interact();}else if(key==='i')inventory();else if(key==='j')journal();else if(key==='m')map();else if(key==='escape')settings();else if(state.battle&&'1234'.includes(key)){selectedSkill=['attack','skill','defend','medicine'][Number(key)-1];hud();}else if(state.battle&&key==='enter')strike();
});
document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());document.addEventListener('visibilitychange',()=>{keys.clear();if(document.hidden){audioContext?.suspend();save();}else if(state.settings.sound)audioContext?.resume();});
for(const button of document.querySelectorAll('[data-move]')){button.addEventListener('pointerdown',e=>{e.preventDefault();if(modal||state.battle)return;button.setPointerCapture(e.pointerId);keys.add(button.dataset.move);path=[];pendingTarget=null;});for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>keys.delete(button.dataset.move));}
window.addEventListener('resize',()=>view.resize());window.addEventListener('pagehide',save);
$('#world').addEventListener('webglcontextlost',e=>{e.preventDefault();keys.clear();save();$('#loading').hidden=false;$('#loading h2').textContent='山河暂时隐去';$('#loading p').textContent='画面连接已中断，请刷新后重返临水。';});
function minimap(){const c=$('#minimap').getContext('2d');c.clearRect(0,0,180,180);c.fillStyle='#52664e';c.fillRect(0,0,180,180);c.fillStyle='#729a86';c.beginPath();c.moveTo(105,0);c.lineTo(131,0);c.lineTo(125,180);c.lineTo(97,180);c.fill();c.strokeStyle='#adab82';c.lineWidth=6;c.beginPath();c.moveTo(45,168);c.lineTo(78,98);c.lineTo(73,20);c.moveTo(73,98);c.lineTo(153,98);c.lineTo(150,45);c.stroke();c.fillStyle='#293c30';for(const [x,y,w,h]of [[20,58,36,28],[35,15,39,21],[144,12,27,36],[10,120,26,42]])c.fillRect(x,y,w,h);c.fillStyle='#d1ba7a';for(const t of TARGETS.filter(t=>t.scene==='town'&&['tea','innDoor','guard','rope'].includes(t.id))){const x=(t.x+23)/50*180,y=(t.z+17)/35*180;c.fillRect(x-2,y-2,4,4);}const p=state.scene==='inn'?{x:-9,z:-7}:state.position,x=(p.x+23)/50*180,y=(p.z+17)/35*180;c.fillStyle='#f8df8e';c.beginPath();c.moveTo(x,y-6);c.lineTo(x-4,y+4);c.lineTo(x,y+2);c.lineTo(x+4,y+4);c.fill();c.fillStyle='#e2d9b6';c.font='12px serif';c.fillText('北',84,17);}
let previous=performance.now(),elapsed=0,accumulator=0,saveTime=0,mapTime=0;
function tick(dt){
 let moving=false;if(!modal&&!state.battle){let dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),dz=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));const speed=keys.has('shift')?5:3.15;
  if(dx||dz){const n=Math.hypot(dx,dz);dx=dx/n*dt*speed;dz=dz/n*dt*speed;}else if(path.length){const to=path[0],vx=to.x-state.position.x,vz=to.z-state.position.z,d=Math.hypot(vx,vz),step=dt*speed;if(d<=step){dx=vx;dz=vz;path.shift();}else{dx=vx/d*step;dz=vz/d*step;}}
  if(dx||dz){const from=state.position,to={x:from.x+dx,z:from.z+dz};if(canStep(from,to,state.scene)){state.position=to;moving=true;}else{const sx={x:from.x+dx,z:from.z},sz={x:from.x,z:from.z+dz};if(canStep(from,sx,state.scene))state.position=sx;else if(canStep(from,sz,state.scene))state.position=sz;else path=[];}direction=Math.abs(dx)>Math.abs(dz)?dx>0?1:3:dz<0?2:0;}
  if(pendingTarget){const t=TARGETS.find(t=>t.id===pendingTarget);if(t&&Math.hypot(t.x-state.position.x,t.z-state.position.z)<1.25&&canStep(state.position,t,state.scene)){const id=pendingTarget;pendingTarget=null;path=[];interact(id);}else if(!path.length)pendingTarget=null;}
 }
 return moving;
}
function frame(now){requestAnimationFrame(frame);if(document.hidden){previous=now;return;}const rawDt=(now-previous)/1000,dt=Math.min(rawDt,.1);previous=now;elapsed+=dt;accumulator=Math.min(accumulator+dt,5/60);let moving=false;while(accumulator>=1/60){moving=tick(1/60)||moving;accumulator-=1/60;}
 view.render(state,elapsed,rawDt,moving,direction);view.cursor.visible=path.length>0&&!modal;
 const t=!modal&&!state.battle?nearby(state):null;$('#prompt').hidden=!t;if(t){const p=view.screen(t.x,groundHeight(t.x,t.z,state.scene)+2,t.z);$('#prompt').style.left=`${Math.max(90,Math.min(innerWidth-90,p.x))}px`;$('#prompt').style.top=`${Math.max(50,Math.min(innerHeight-100,p.y))}px`;$('#prompt span').textContent=t.name;}
 if(elapsed-mapTime>.2){minimap();mapTime=elapsed;}if(moving&&elapsed-stepTime>.32){tone(state.scene==='inn'||state.position.x>3&&state.position.x<10?160:100,.035);stepTime=elapsed;}if(ambient)ambient.gain.gain.value=state.settings.sound?(state.scene==='inn'?.018:Math.max(.01,.14-Math.abs(state.position.x-6)*.012)):0;
 if(elapsed-saveTime>3){save();saveTime=elapsed;}
}
hud();$('#loading').hidden=true;requestAnimationFrame(frame);if(startNotice)toast(startNotice);
// Read-only inspection plus the same navigation command used by the map. No state injection.
if(new URLSearchParams(location.search).has('debug'))window.__jiangnan={snapshot:()=>structuredClone(state),go,stats:()=>view.stats(),screenTarget:id=>{const t=TARGETS.find(t=>t.id===id);return t?view.screen(t.x,groundHeight(t.x,t.z,t.scene)+.8,t.z):null;},screenCell:(x,z)=>view.screen(13+x,1.1,-5+z)};
