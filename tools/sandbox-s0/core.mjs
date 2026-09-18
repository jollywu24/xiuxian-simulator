import {calculateDamageRange,damageForTier,applyDamageReduction} from '../../web/character-system.mjs?v=20260910.1';
import {rollCausalDie} from '../../web/wudao-p0-core.mjs?v=20260910.1';
import {sameCell,isInside,validateCatalog} from './domain.mjs';

export const RULES=Object.freeze({schemaVersion:1,partyLimit:4,ap:3,moveSteps:3,guardReduction:2,retreatColumn:1});
export function createSession(catalog,{topology='grid',seed='qinghe-s0',battle=false}={}){
 const validation=validateCatalog(catalog);if(!validation.ok)throw Error(validation.errors.join('; '));
 if(!['grid','nodes'].includes(topology))throw Error('Unknown topology');
 const map=structuredClone(catalog.maps.find(m=>m.id==='map.qinghe-courtyard'));
 const actors=catalog.actors.map(a=>({...structuredClone(a),hp:a.maxHp,ap:RULES.ap,guard:false}));
 return {schemaVersion:1,seed,topology,map,actors,phase:battle?'party':'explore',round:1,selectedId:'actor.chen-siming',commandIndex:0,worldKe:40,weather:'day',result:null,events:[],history:[],log:['青河渡口，风把银杏叶吹落在石板上。']};
}
export const actorById=(s,id)=>s.actors.find(a=>a.id===id);
export function neighbors(s,p){
 if(s.topology==='nodes'){
  const anchors=[[1,1],[4,1],[8,1],[1,3],[2,4],[1,5],[2,6],[5,2],[5,5],[7,4],[7,6],[8,2],[9,5]];
  return anchors.filter(n=>!sameCell(n,p)&&distance(n,p)<=4&&lineOfSight(s,p,n)&&!s.map.blocked.some(b=>sameCell(b,n)));
 }
 return [[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>[p[0]+dx,p[1]+dy]).filter(n=>isInside(s.map,n)&&!s.map.blocked.some(b=>sameCell(b,n)));
}
export function pathSteps(from,path){let cost=0,p=from;for(const n of path){cost+=distance(p,n);p=n;}return cost;}
export function pathTo(s,actorId,target,{ignoreOccupancy=false}={}){
 const actor=actorById(s,actorId);if(!actor||!isInside(s.map,target))return null;
 if(s.map.blocked.some(p=>sameCell(p,target)))return null;
 if(sameCell(actor.position,target))return [];
 const key=p=>p.join(',');const queue=[{p:actor.position,path:[],cost:0}],visited=new Set();
 while(queue.length){
  queue.sort((a,b)=>a.cost-b.cost);const {p,path,cost}=queue.shift();if(visited.has(key(p)))continue;visited.add(key(p));
  if(sameCell(p,target))return path;
  for(const n of neighbors(s,p)){
   if(visited.has(key(n)))continue;
   if(!ignoreOccupancy&&s.actors.some(a=>a.id!==actorId&&a.hp>0&&sameCell(a.position,n)))continue;
   const next=[...path,n];queue.push({p:n,path:next,cost:cost+distance(p,n)});
  }
 }
 return null;
}
export function lineOfSight(s,from,to){
 // Supercover-style sampling blocks rays that pass through occupied obstacle cells.
 const dx=to[0]-from[0],dy=to[1]-from[1],steps=Math.max(Math.abs(dx),Math.abs(dy))*8;
 for(let i=1;i<steps;i++){const p=[Math.round(from[0]+dx*i/steps),Math.round(from[1]+dy*i/steps)];if(s.map.blocked.some(b=>sameCell(b,p)))return false;}
 return true;
}
export const distance=(a,b)=>Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]);
function damagePreview(s,actor,target,skill){
 const range=calculateDamageRange({attributes:{strength:actor.strength,agility:actor.agility},stageId:'body',kind:skill.kind,techniquePower:skill.power});
 const reduce=raw=>applyDamageReduction(raw,target.reduction+(target.guard?RULES.guardReduction:0),range.penetration).final;
 return {min:reduce(range.min),max:reduce(range.max),range};
}
export function inspectAction(s,catalog,command){
 const fail=reason=>({ok:false,reason});
 if(!command||typeof command.type!=='string')return fail('行动无效。');
 if(command.type==='start')return s.phase==='explore'?{ok:true}:fail('这场切磋已经开始。');
 if(command.type==='weather')return ['day','night','rain'].includes(command.value)?{ok:true}:fail('时景无效。');
 if(command.type==='select'){const a=actorById(s,command.actorId);return a?.side==='party'&&a.hp>0?{ok:true}:fail('此人无法行动。');}
 if(command.type==='end')return s.phase==='party'?{ok:true}:fail('现在不能交还回合。');
 if(s.phase==='finished')return fail('切磋已结束。');
 if(!['party','explore'].includes(s.phase))return fail('请等待对手行动。');
 const actor=actorById(s,command.actorId||s.selectedId);if(!actor||actor.side!=='party'||actor.hp<=0)return fail('此人无法行动。');
 if(command.type==='move'){
  const path=pathTo(s,actor.id,command.target);if(!path||!path.length)return fail('这里无法落脚。');
  const cost=s.phase==='explore'?0:Math.ceil(pathSteps(actor.position,path)/RULES.moveSteps);
  if(cost>actor.ap)return fail(`需要 ${cost} 点行动，当前只有 ${actor.ap} 点。`);
  return {ok:true,path,cost,actorId:actor.id};
 }
 if(s.phase==='explore')return fail('请先与护院约定切磋。');
 if(command.type==='guard')return actor.ap>=1?{ok:true,cost:1,actorId:actor.id}:fail('行动不足，无法凝神守势。');
 if(command.type==='retreat')return actor.position[0]<=RULES.retreatColumn?{ok:true,actorId:actor.id}:fail('先回到左侧退路，再离开切磋。');
 if(command.type==='skill'){
  const skill=catalog.skills.find(k=>k.id===actor.skillId),target=actorById(s,command.targetId);
  if(!skill||!target||target.hp<=0)return fail('没有可用的目标。');
  if(skill.effect==='heal'&&target.side!==actor.side||skill.effect==='damage'&&target.side===actor.side)return fail('这一招不适合此目标。');
  if(skill.effect==='heal'&&target.hp>=target.maxHp)return fail('对方气血充足，无需疗伤。');
  if(actor.ap<skill.cost)return fail(`需要 ${skill.cost} 点行动。`);
  if(distance(actor.position,target.position)>skill.range)return fail(`目标超出 ${skill.range} 格距离。`);
  if(!lineOfSight(s,actor.position,target.position))return fail('木箱挡住了出手路线。');
  return {ok:true,cost:skill.cost,actorId:actor.id,targetId:target.id,skillId:skill.id,...(skill.effect==='damage'?damagePreview(s,actor,target,skill):{min:skill.power,max:skill.power})};
 }
 return fail('尚无这种行动。');
}
function strike(s,catalog,actor,target,skill){
 const preview=damagePreview(s,actor,target,skill);
 const roll=rollCausalDie(s.seed,`${s.round}:${s.commandIndex}:${actor.id}:${target.id}:${skill.id}`,10);
 const tier=roll>=8?'great':roll>=3?'success':'costly';
 const amount=applyDamageReduction(damageForTier(preview.range,tier),target.reduction+(target.guard?RULES.guardReduction:0),preview.range.penetration).final;
 target.hp=Math.max(0,target.hp-amount);
 s.events.push({type:'hit',actorId:actor.id,targetId:target.id,amount,skillId:skill.id,roll});
 s.log.push(`${actor.name}使出${skill.name}，${target.name}损失 ${amount} 点气血。`);
}
function finishIfNeeded(s){
 const party=s.actors.some(a=>a.side==='party'&&a.hp>0),enemy=s.actors.some(a=>a.side==='enemy'&&a.hp>0);
 if(!party||!enemy){s.phase='finished';s.result=party?'victory':'defeat';s.worldKe+=1;s.log.push(party?'护院收起兵器，认下了这一场。众人随后会得到包扎。':'众人暂时退到屋檐下包扎。这场切磋没有伤及性命。');}
}
function enemyRound(s,catalog){
 s.phase='enemy';
 for(const enemy of s.actors.filter(a=>a.side==='enemy'&&a.hp>0)){
  const targets=s.actors.filter(a=>a.side==='party'&&a.hp>0).sort((a,b)=>distance(enemy.position,a.position)-distance(enemy.position,b.position)||a.id.localeCompare(b.id));
  const target=targets[0];if(!target)break;
  const skill=catalog.skills.find(k=>k.id===enemy.skillId);
  if(distance(enemy.position,target.position)>skill.range||!lineOfSight(s,enemy.position,target.position)){
   const options=[];for(let y=0;y<s.map.height;y++)for(let x=0;x<s.map.width;x++){
    const p=[x,y],path=pathTo(s,enemy.id,p);
    if(path&&path.length>0&&pathSteps(enemy.position,path)<=RULES.moveSteps)options.push({p,path,score:distance(p,target.position)+(lineOfSight(s,p,target.position)?0:2)});
   }
   options.sort((a,b)=>a.score-b.score||a.path.length-b.path.length||a.p[1]-b.p[1]||a.p[0]-b.p[0]);
   if(options.length){const from=[...enemy.position];enemy.position=options[0].p;s.events.push({type:'move',actorId:enemy.id,from,path:options[0].path});}
  }
  if(distance(enemy.position,target.position)<=skill.range&&lineOfSight(s,enemy.position,target.position))strike(s,catalog,enemy,target,skill);
  finishIfNeeded(s);if(s.phase==='finished')return;
 }
 s.round+=1;s.phase='party';for(const a of s.actors){a.ap=RULES.ap;a.guard=false;}
 const selected=actorById(s,s.selectedId);if(!selected||selected.hp<=0)s.selectedId=s.actors.find(a=>a.side==='party'&&a.hp>0).id;
 s.log.push(`第 ${s.round} 回合，重新寻找出手机会。`);
}
export function applyCommand(state,catalog,command){
 const check=inspectAction(state,catalog,command);if(!check.ok)return {ok:false,reason:check.reason,state};
 const s=structuredClone(state);s.events=[];
 if(command.type==='select'){s.selectedId=command.actorId;return {ok:true,state:s};}
 if(command.type==='weather'){s.weather=command.value;return {ok:true,state:s};}
 s.commandIndex+=1;s.history.push(structuredClone(command));
 const actor=actorById(s,check.actorId||s.selectedId);
 if(command.type==='start'){s.phase='party';s.log.push('双方约定点到为止。以身法寻机，莫让同伴落单。');}
 if(command.type==='move'){const from=[...actor.position];actor.position=[...command.target];actor.ap-=check.cost;s.events.push({type:'move',actorId:actor.id,from,path:check.path});}
 if(command.type==='guard'){actor.ap-=1;actor.guard=true;s.log.push(`${actor.name}沉肩守势。`);}
 if(command.type==='retreat'){s.phase='finished';s.result='retreat';s.worldKe+=1;s.log.push('众人退回渡口，拱手结束了这场切磋。');}
 if(command.type==='skill'){
  actor.ap-=check.cost;const skill=catalog.skills.find(k=>k.id===check.skillId),target=actorById(s,check.targetId);
  if(skill.effect==='heal'){const amount=Math.min(skill.power,target.maxHp-target.hp);target.hp+=amount;s.events.push({type:'heal',actorId:actor.id,targetId:target.id,amount});s.log.push(`${actor.name}替${target.name}止血，恢复 ${amount} 点气血。`);}
  else strike(s,catalog,actor,target,skill);
  finishIfNeeded(s);
 }
 if(command.type==='end')enemyRound(s,catalog);
 s.log=s.log.slice(-50);return {ok:true,state:s};
}
export function exportSession(s){return JSON.stringify({format:'wudao-s0-session',version:1,state:s});}
export function restoreSession(text,catalog){
 const payload=JSON.parse(text);if(payload.format!=='wudao-s0-session'||payload.version!==1)throw Error('不支持的练武记录。');
 const s=payload.state,base=createSession(catalog,{topology:s?.topology,seed:s?.seed});
 if(!s||s.schemaVersion!==1||!['explore','party','finished'].includes(s.phase)||s.map?.id!==base.map.id||!Number.isInteger(s.round)||s.round<1||!Number.isInteger(s.commandIndex)||s.commandIndex<0||!['day','night','rain'].includes(s.weather)||!Number.isInteger(s.worldKe)||!Array.isArray(s.log)||!s.log.every(x=>typeof x==='string')||!Array.isArray(s.history))throw Error('练武记录损坏。');
 if(!Array.isArray(s.actors)||s.actors.length!==base.actors.length)throw Error('人物记录缺失。');
 const seen=new Set(),occupied=new Set();
 for(const a of s.actors){const def=base.actors.find(x=>x.id===a.id);if(!def||seen.has(a.id)||!Number.isFinite(a.hp)||a.hp<0||a.hp>def.maxHp||!Number.isInteger(a.ap)||a.ap<0||a.ap>3||!isInside(base.map,a.position)||base.map.blocked.some(p=>sameCell(p,a.position)))throw Error('人物状态损坏。');seen.add(a.id);if(a.hp>0){const cell=a.position.join(',');if(occupied.has(cell))throw Error('人物位置重叠。');occupied.add(cell);}}
 if(!base.actors.some(a=>a.id===s.selectedId&&a.side==='party'))throw Error('队伍选择损坏。');
 // Definition-owned stats and map collision cannot be overwritten by imported records.
 const partyAlive=s.actors.some(a=>base.actors.find(d=>d.id===a.id).side==='party'&&a.hp>0),enemyAlive=s.actors.some(a=>base.actors.find(d=>d.id===a.id).side==='enemy'&&a.hp>0);
 if((s.phase!=='finished'&&(!partyAlive||!enemyAlive||s.result!==null))||(s.phase==='finished'&&(!['victory','defeat','retreat'].includes(s.result)||(s.result==='victory'&&(!partyAlive||enemyAlive))||(s.result==='defeat'&&(partyAlive||!enemyAlive))||(s.result==='retreat'&&(!partyAlive||!enemyAlive)))))throw Error('切磋结算状态损坏。');
 if(typeof s.seed!=='string'||s.seed.length>200||s.actors.some(a=>typeof a.guard!=='boolean'))throw Error('因果或守势记录损坏。');
 const actors=base.actors.map(def=>{const a=s.actors.find(x=>x.id===def.id);return {...def,hp:a.hp,ap:a.ap,guard:Boolean(a.guard),position:[...a.position]};});
 return {...base,actors,phase:s.phase,round:s.round,commandIndex:s.commandIndex,selectedId:s.selectedId,weather:s.weather,worldKe:s.worldKe,result:['victory','defeat','retreat'].includes(s.result)?s.result:null,history:s.history,log:s.log.slice(-50),events:[]};
}
