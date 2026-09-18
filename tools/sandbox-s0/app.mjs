import {createSession,applyCommand,inspectAction,actorById,pathTo,pathSteps,exportSession,restoreSession} from './core.mjs';
import {SceneRenderer,project,unproject} from './renderer.mjs';
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storageKey='wudao.s0.workbench.v1';
const errors=[];
function recordError(message){errors.push(String(message));$('#error-report').textContent=errors.join('\n');}
addEventListener('error',e=>recordError(e.message));addEventListener('unhandledrejection',e=>recordError(e.reason?.message||e.reason));
try{
 const response=await fetch('/data/sandbox/catalog.json');if(!response.ok)throw Error('人物与地图尚未载入。');const catalog=await response.json();
 let state=createSession(catalog),mode='move',hover=null,reachable=[],benchmarking=false;
 const stage=$('#stage'),renderer=new SceneRenderer($('#scene'),$('#overlay'),catalog);
 await renderer.load('/art_source/sandbox-s0/v1/qinghe-courtyard-v1.png');
 await renderer.loadAtlas('/art_source/sandbox-s0/v1/party-motion-atlas-v1.png');
 await renderer.setBackend('canvas');$('#backend').value='canvas';
 function update(){
  const selected=actorById(state,state.selectedId),skill=catalog.skills.find(s=>s.id===selected.skillId);
  $('#party').innerHTML=state.actors.filter(a=>a.side==='party').map((a,i)=>`<button class="companion" data-action="select" data-value="${a.id}" aria-pressed="${a.id===state.selectedId}" ${a.hp<=0?'disabled':''} aria-label="选择${esc(a.name)}"><strong>${esc(a.name)}</strong><small>${i+1} · ${esc(a.role)} · ${a.hp}/${a.maxHp}</small><span class="health"><span style="width:${100*a.hp/a.maxHp}%"></span></span><span class="ap">${state.phase==='explore'?'同行中':`行动 ${'●'.repeat(a.ap)}${'○'.repeat(3-a.ap)}`}</span></button>`).join('');
  $('#selection').innerHTML=`<strong>${esc(selected.name)}</strong><p class="small">${esc(selected.role)} · 气血 ${selected.hp}/${selected.maxHp} · 行动 ${selected.ap}/3<br>落脚处 ${selected.position[0]+1}，${selected.position[1]+1}</p><span class="skill">${esc(skill.name)} · ${skill.range} 格 · ${skill.cost} 点行动</span>`;
  $('#world-status').textContent=`${{day:'申时 · 河风微凉',night:'戌时 · 灯火初上',rain:'申时 · 微雨打叶'}[state.weather]}${state.phase==='party'?` · 第 ${state.round} 回合`:''}`;
  const act=(type,label,disabled=false,cls='')=>`<button data-action="${type}" class="${cls}" ${disabled?'disabled':''}>${label}</button>`;
  $('#actions').innerHTML=state.phase==='explore'?act('start','与护院切磋',false,'primary')+act('mode-move','走动观察')+act('reset','重新相逢'):state.phase==='finished'?act('reset','再走一遍',false,'primary')+`<p>${{victory:'切磋得胜',defeat:'暂退包扎',retreat:'拱手离场'}[state.result]}</p>`:act('mode-move','移动 · 每三格一点',selected.ap<1)+act('mode-skill',skill.effect==='heal'?'扶伤 · 选择同伴':`${esc(skill.name)} · 选择对手`,selected.ap<skill.cost)+act('guard','凝神守势 · 一点',selected.ap<1)+act('retreat','返回退路')+act('end','交还回合',false,'primary');
  $('#log').innerHTML=state.log.slice(-8).map(t=>`<li>${esc(t)}</li>`).join('');$('#log').scrollTop=$('#log').scrollHeight;
  $('#targets').innerHTML=state.actors.filter(a=>a.hp>0).map(a=>{const [x,y]=project(a.position);return `<button class="actor-hit" data-action="target" data-value="${a.id}" style="left:${x/16}%;top:${y/9}%" aria-label="${a.side==='enemy'?'对手':'同伴'}${esc(a.name)}，气血${a.hp}" title="${esc(a.name)}"></button>`;}).join('');
  reachable=[];if(mode==='move'&&['party','explore'].includes(state.phase))for(let y=0;y<state.map.height;y++)for(let x=0;x<state.map.width;x++){const p=[x,y],path=pathTo(state,selected.id,p);if(path?.length&&(state.phase==='explore'||Math.ceil(pathSteps(selected.position,path)/3)<=selected.ap))reachable.push(p);}
  document.querySelectorAll('[data-action=weather]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.value===state.weather)));
 }
 function send(command){const result=applyCommand(state,catalog,command);if(!result.ok){$('#feedback').textContent=result.reason;return false;}state=result.state;renderer.consume(state.events,performance.now());update();$('#feedback').textContent=command.type==='move'?'脚步落定，可继续选择下一步。':command.type==='select'?`已转向${actorById(state,state.selectedId).name}。`:state.log.at(-1);return true;}
 let raf;
 function tick(time){renderer.draw(state,time,{reachable:mode==='move'?reachable:[],hover});raf=requestAnimationFrame(tick);}requestAnimationFrame(tick);
 async function report(kind,payload){const r=await fetch('/__s0/report',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({kind,payload})});if(!r.ok)throw Error('报告未能保存，请复制页面上的结果。');}
 async function benchmark(){
  if(benchmarking)return;benchmarking=true;const original=renderer.kind,count=renderer.stressCount,results=[];
  try{
   for(const backend of ['canvas','webgl'])for(const stress of [0,96]){
    $('#metrics').textContent=`采样中：${backend}，额外角色 ${stress}；请保持页面在前台。`;
    try{await renderer.setBackend(backend);}catch(e){results.push({backend,available:false,reason:e.message});break;}
    renderer.stressCount=stress;
    // Synchronous CPU-submit samples remain meaningful when a remote browser throttles rAF.
    // They deliberately do not claim GPU timings or display frame rate.
    for(let i=0;i<30;i++)renderer.draw(state,performance.now()+i*16.667,{reachable:[],hover:null});
    renderer.frameCosts=[];renderer.frameIntervals=[];
    for(let i=0;i<180;i++)renderer.draw(state,performance.now()+i*16.667,{reachable:[],hover:null});
    results.push({...renderer.metrics(),sampleMode:'synchronous-cpu-submit',frameIntervalMedianMs:null,frameIntervalP95Ms:null,note:'固定180次绘制提交的CPU耗时；不测GPU完成时间，不换算FPS。'});
   }
   const result={capturedAt:new Date().toISOString(),userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],devicePixelRatio,hardwareConcurrency:navigator.hardwareConcurrency,weather:state.weather,sceneActors:state.actors.length,results,caveat:'这是当前云端浏览器的局部CPU绘制提交实测；不代表目标 Windows 独显或完整游戏帧率。远端浏览器会限制rAF推进，故不发布FPS。'};
   $('#metrics').textContent=JSON.stringify(result,null,2);await report('benchmark',result);
  }catch(e){recordError(e.message);}finally{await renderer.setBackend(original);renderer.stressCount=count;$('#backend').value=original;benchmarking=false;}
 }
 async function replay(){
  const cases=[],record=(name,pass,detail)=>cases.push({name,pass,detail});
  let a=createSession(catalog,{battle:true});let r=applyCommand(a,catalog,{type:'move',actorId:'actor.chen-siming',target:[3,4]});record('四人独立行动点',r.ok&&r.state.actors[0].ap===2&&r.state.actors[1].ap===3,'只扣移动者一点');a=r.state;
  const before=JSON.stringify(a);r=applyCommand(a,catalog,{type:'move',target:[4,4]});record('阻挡与失败原子性',!r.ok&&JSON.stringify(r.state)===before,'木箱格拒绝且不扣费');
  const saved=exportSession(a),loaded=restoreSession(saved,catalog);record('记录还原',JSON.stringify(loaded.actors)===JSON.stringify(a.actors),'恢复角色、位置和行动');
  const c1=applyCommand(a,catalog,{type:'end'}),c2=applyCommand(loaded,catalog,{type:'end'});record('固定因果与敌方回合',JSON.stringify(c1.state.actors)===JSON.stringify(c2.state.actors)&&c1.state.round===2,'相同输入结果一致');
  r=applyCommand(createSession(catalog,{battle:true}),catalog,{type:'retreat',actorId:'actor.lin-zhi'});record('撤退结算',r.ok&&r.state.result==='retreat'&&r.state.worldKe===41,'一刻结算，原存档不参与');
  state=c1.state;renderer.consume(state.events,performance.now());update();
  const result={capturedAt:new Date().toISOString(),cases,pass:cases.every(c=>c.pass),runtimeErrors:errors};$('#replay-result').textContent=JSON.stringify(result,null,2);await report('replay',result);
 }
 document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-action]');if(!button||button.disabled)return;const action=button.dataset.action,value=button.dataset.value;
  if(benchmarking&&action!=='benchmark'){$('#feedback').textContent='采样结束后可继续操作。';return;}
  try{
   if(action==='weather')send({type:'weather',value});
   else if(action==='select'){send({type:'select',actorId:value});mode='move';update();}
   else if(action==='target'){const target=actorById(state,value);if(mode==='skill')send({type:'skill',targetId:value});else if(target.side==='party')send({type:'select',actorId:value});else{const p=inspectAction(state,catalog,{type:'skill',targetId:value});$('#feedback').textContent=p.ok?`点击招式，再选${target.name}：预计损失 ${p.min}—${p.max} 点气血。`:p.reason;}}
   else if(['start','end','guard','retreat'].includes(action))send({type:action});
   else if(action.startsWith('mode-')){mode=action.slice(5);update();$('#feedback').textContent=mode==='move'?'点选可落脚的地面。':'点选招式目标，出手前检查距离与遮挡。';}
   else if(action==='grid'){renderer.grid=!renderer.grid;button.setAttribute('aria-pressed',String(renderer.grid));}
   else if(action==='gray')renderer.gray=!renderer.gray;
   else if(action==='reset'){state=createSession(catalog,{topology:$('#topology').value});renderer.motion.clear();renderer.effects=[];mode='move';update();$('#feedback').textContent='众人重新来到渡口。';}
   else if(action==='save'){localStorage.setItem(storageKey,exportSession(state));$('#feedback').textContent='这一场的练武记录已留下。';}
   else if(action==='load'){const text=localStorage.getItem(storageKey);if(!text)throw Error('尚未留下练武记录。');const candidate=restoreSession(text,catalog);state=candidate;mode='move';$('#topology').value=state.topology;renderer.motion.clear();renderer.effects=[];update();$('#feedback').textContent='练武记录已恢复。';}
   else if(action==='benchmark')await benchmark();
   else if(action==='stress'){renderer.stressCount=renderer.stressCount?0:96;$('#metrics').textContent=`额外同屏角色：${renderer.stressCount}`;}
   else if(action==='replay')await replay();
  }catch(e){$('#feedback').textContent=e.message;}
 });
 stage.addEventListener('click',e=>{if(e.target.closest('[data-action]')||benchmarking)return;const rect=stage.getBoundingClientRect(),p=unproject([(e.clientX-rect.left)/rect.width*1600,(e.clientY-rect.top)/rect.height*900]);send({type:'move',target:p});stage.focus();});
 stage.addEventListener('pointermove',e=>{const rect=stage.getBoundingClientRect();const p=unproject([(e.clientX-rect.left)/rect.width*1600,(e.clientY-rect.top)/rect.height*900]);hover=p[0]>=0&&p[0]<10&&p[1]>=0&&p[1]<7?p:null;});stage.addEventListener('pointerleave',()=>hover=null);
 addEventListener('keydown',e=>{if(benchmarking||e.target.matches('input,select,textarea')||e.altKey||e.ctrlKey||e.metaKey)return;const moves={ArrowUp:[0,-1],w:[0,-1],ArrowDown:[0,1],s:[0,1],ArrowLeft:[-1,0],a:[-1,0],ArrowRight:[1,0],d:[1,0]};if(moves[e.key]){e.preventDefault();const a=actorById(state,state.selectedId),d=moves[e.key];send({type:'move',target:[a.position[0]+d[0],a.position[1]+d[1]]});}else if(/^[1-4]$/.test(e.key)){e.preventDefault();send({type:'select',actorId:state.actors[Number(e.key)-1].id});}else if(e.key===' '&&e.target===stage){e.preventDefault();send({type:'end'});}});
 $('#topology').addEventListener('change',()=>{state=createSession(catalog,{topology:$('#topology').value});renderer.motion.clear();renderer.effects=[];update();$('#feedback').textContent='对照场地已重新布置。';});
 $('#backend').addEventListener('change',async()=>{try{await renderer.setBackend($('#backend').value);}catch(e){$('#backend').value=renderer.kind;$('#feedback').textContent=e.message;}});
 $('#viewport').addEventListener('change',()=>{const value=$('#viewport').value;if(window.top===window)location.href=value==='auto'?'/':`/?viewport=${value}`;else window.top.location.href=value==='auto'?'/':`/?viewport=${value}`;});
 addEventListener('pagehide',()=>{cancelAnimationFrame(raf);renderer.dispose();});
 update();document.body.dataset.ready='true';
}catch(e){$('#fatal').hidden=false;$('#fatal-message').textContent=e.message;recordError(e.message);}
