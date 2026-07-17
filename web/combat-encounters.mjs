export const WANG_ZHUO_DEFAULTS = Object.freeze({
  fateSeed: "east-lake-0",
  lives: 2,
  attributes: {
    constitution: 2,
    insight: 3,
    agility: 3,
    strength: 2,
    fortune: 1,
  },
  playerStage: "body",
  skills: {
    spring_rain_needles: { stage: "skilled", progress: 60 },
    fish_leap_art: { stage: "skilled", progress: 60 },
    fishing_rod_method: { stage: "learned", progress: 20 },
    sea_stilling_stake: { stage: "learned", progress: 20 },
  },
  relationships: {
    yan_jinghong: { favor: 48, trust: 58, debt: 0, suspicion: 0 },
  },
  items: {
    antidote: 1,
  },
  wounds: [],
  knownFacts: [],
});

function hasFact(state, factId) {
  return state.battle.knownFacts.includes(factId);
}

function relationValue(state, relationId, field) {
  return Number(state.battle.ledger.relationships?.[relationId]?.[field] || 0);
}

function enemy(state, enemyId) {
  return state.battle.participants.enemies[enemyId];
}

function ally(state, allyId) {
  return state.battle.participants.allies[allyId];
}

function playerHasStatus(state, statusId) {
  return state.battle.participants.player.statuses.some((entry) => entry.id === statusId);
}

function hasLearnedSkill(context, skillId) {
  const skill = context.skills?.[skillId];
  const stage = typeof skill === "string" ? skill : skill?.stage;
  return ["learned", "entered", "skilled", "mastered"].includes(stage);
}

function enemyHasStatus(state, enemyId, statusId) {
  return enemy(state, enemyId)?.statuses.some((entry) => entry.id === statusId);
}

function wangDistance(state, helpers) {
  return helpers.distance(state.positions.player, state.positions.wang_zhuo);
}

function playerCovered(state) {
  return ["mooring_post", "willow_root"].includes(state.positions.player)
    || Boolean(state.battle.conditions.chokePoint);
}

function outnumberingActive(state) {
  return Object.values(state.battle.participants.enemies).filter((entry) => entry.active && !entry.defeated && entry.current > 0).length > 1;
}

function directAdvantages(state, context) {
  const reasons = [];
  if (state.battle.conditions.weakPoint) reasons.push("已看破锁链刀左腕换劲");
  if (["shallow_water", "skiff"].includes(state.positions.player) && hasLearnedSkill(context, "fish_leap_art")) reasons.push("鱼跃龙门诀借到水势");
  if (enemyHasStatus(state, "wang_zhuo", "off_balance")) reasons.push("王卓已经失衡");
  return reasons;
}

function directDisadvantages(state) {
  const reasons = [];
  if (["wet_stones", "bank_entry"].includes(state.positions.player) && !state.battle.conditions.steadyFooting) reasons.push("湿石削弱下盘");
  if (outnumberingActive(state) && !state.battle.conditions.allyEngaged && !state.battle.conditions.chokePoint) reasons.push("毒蛇帮众形成夹击");
  return reasons;
}

function subdueOutcome(state, tier) {
  const current = enemy(state, "wang_zhuo").current;
  if (tier === "failure") {
    return {
      text: "封穴一针被锁链刀荡开，回锋沿着肩口带出一道深伤。",
      effects: [
        { type: "damage", targetId: "player", amount: 5 },
        { type: "wound", targetId: "player", wound: { id: "wang_chain_shoulder", type: "cut", bodyPart: "shoulder", severity: 2, tags: ["limits_training"] } },
        { type: "condition", key: "provoked", value: true },
      ],
    };
  }
  const costly = tier === "costly";
  return {
    text: costly
      ? "银针封住左腕与肩井，王卓跪倒时锁链末端仍擦开你的手臂。"
      : "银针截断王卓换劲的两处要穴，锁链刀落入浅水，他仍能开口。",
    effects: [
      { type: "damage", targetId: "wang_zhuo", amount: Math.max(0, current - 1), floor: 1 },
      ...(costly ? [
        { type: "damage", targetId: "player", amount: 2 },
        { type: "wound", targetId: "player", wound: { id: "wang_chain_arm", type: "cut", bodyPart: "arm", severity: 1, tags: ["limits_needles"] } },
      ] : []),
      { type: "evidence", evidenceId: "wang_zhuo_testimony" },
      { type: "relationship", relationId: "yan_jinghong", field: "trust", amount: 4 },
    ],
    pendingOutcome: {
      outcome: "subdued",
      label: "生擒王卓",
      text: "王卓穴道受制，毒蛇帮的口供与官面暗线都留下了活证。",
      edge: tier === "great" ? "intact_captive" : costly ? "bloodied_finish" : null,
    },
  };
}

function killOutcome(state, tier) {
  const current = enemy(state, "wang_zhuo").current;
  if (tier === "failure") {
    return {
      text: "杀针擦过咽侧，锁链刀反卷回来，把你逼进湿石死角。",
      effects: [
        { type: "damage", targetId: "player", amount: 5 },
        { type: "condition", key: "provoked", value: true },
      ],
    };
  }
  const costly = tier === "costly";
  return {
    text: costly
      ? "杀针穿喉，王卓临死前仍以锁链割开你的肋下。"
      : "杀针穿过咽喉，王卓的锁链刀砸进浅水，再没有抬起。",
    effects: [
      { type: "damage", targetId: "wang_zhuo", amount: current },
      ...(costly ? [
        { type: "damage", targetId: "player", amount: 3 },
        { type: "wound", targetId: "player", wound: { id: "wang_last_chain", type: "cut", bodyPart: "torso", severity: 1, tags: ["limits_training"] } },
      ] : []),
      { type: "evidence", evidenceId: "bronze_serpent_badge" },
      { type: "alert", amount: 2 },
      { type: "relationship", relationId: "yan_jinghong", field: "trust", amount: -3 },
    ],
    pendingOutcome: {
      outcome: "killed",
      label: "针下取命",
      text: "王卓死在河岸，尸身与铜牌留下证据，也让毒蛇帮立刻提高警戒。",
      edge: tier === "great" ? "intact_token" : costly ? "bloodied_finish" : null,
    },
  };
}

function releaseOutcome(state, tier) {
  if (tier === "failure") {
    return {
      text: "你故意留下的破口太过明显，王卓看穿试探，反手封住船路。",
      effects: [
        { type: "condition", key: "escapeRoute", value: false },
        { type: "alert", amount: 1 },
      ],
    };
  }
  return {
    text: "你让出半步，王卓以为抓住生路，腰间蛇纹铜牌也随急退露出。",
    effects: [
      { type: "deactivate", targetId: "wang_zhuo" },
      { type: "evidence", evidenceId: "wang_escape_route" },
      { type: "contact", contactId: "poison_snake_dead_drop" },
      { type: "alert", amount: tier === "costly" ? 2 : 1 },
      { type: "relationship", relationId: "yan_jinghong", field: "trust", amount: tier === "great" ? 2 : 0 },
    ],
    pendingOutcome: {
      outcome: "released",
      label: "放线追踪",
      text: "王卓带伤遁走，你没有活口，却得到一条通往毒蛇帮死信箱的逃踪。",
      edge: tier === "great" ? "marked_escape" : null,
    },
  };
}

function retreatOutcome(state, tier) {
  if (tier === "failure") {
    return {
      text: "湿石让你慢了一步，王卓的锁链越过肩头缠住退路。",
      effects: [
        { type: "damage", targetId: "player", amount: 4 },
        { type: "wound", targetId: "player", wound: { id: "river_retreat_leg", type: "strain", bodyPart: "leg", severity: 1, tags: ["limits_travel"] } },
      ],
    };
  }
  const costly = tier === "costly";
  return {
    text: costly
      ? "你把燕惊鸿推上松开的舟，她脱离弩线，你却被毒刃划伤腿侧。"
      : "你借浅水送舟，先让燕惊鸿脱离弩线，再踏水退到对岸。",
    effects: [
      { type: "condition", key: "allySafe", value: true },
      { type: "relationship", relationId: "yan_jinghong", field: "trust", amount: tier === "great" ? 6 : 4 },
      { type: "relationship", relationId: "yan_jinghong", field: "debt", amount: 1 },
      ...(costly ? [
        { type: "damage", targetId: "player", amount: 2 },
        { type: "wound", targetId: "player", wound: { id: "river_retreat_leg", type: "cut", bodyPart: "leg", severity: 1, tags: ["limits_travel"] } },
      ] : []),
    ],
    pendingOutcome: {
      outcome: "protected_escape",
      label: "护人撤离",
      text: "燕惊鸿安全离开东湖，你放弃当场拿下王卓，却保住了最重要的人证。",
      edge: tier === "great" ? "unseen_exit" : costly ? "bloodied_finish" : null,
    },
  };
}

function abandonOutcome(state, tier) {
  if (tier === "failure") {
    return {
      text: "小舟尚未脱桩，锁链刀已经先一步压住船舷。",
      effects: [{ type: "damage", targetId: "player", amount: 5 }],
    };
  }
  const allySafe = Boolean(state.battle.conditions.allySafe);
  return {
    text: allySafe ? "你翻入浅水，借水势离开河岸。" : "你独自翻入浅水，把燕惊鸿留在了锁链与毒刃之间。",
    effects: [
      { type: "alert", amount: allySafe ? 1 : 3 },
      ...(!allySafe ? [{ type: "relationship", relationId: "yan_jinghong", field: "trust", amount: -12 }] : []),
    ],
    pendingOutcome: {
      outcome: "escaped",
      label: "独自脱身",
      text: allySafe ? "你保住性命离开东湖，王卓与帮众也带着警觉退走。" : "你保住自己，却失去燕惊鸿的信任与官面协力。",
      edge: tier === "great" ? "unseen_exit" : null,
    },
  };
}

function wangTailIntents(state, helpers) {
  const marked = Boolean(state.battle.conditions.playerMarked || state.battle.conditions.provoked);
  const from = state.positions.wang_zhuo;
  const path = helpers.path(from, state.positions.player);
  const to = path.length > 1 ? path[1] : from;
  return [{
    id: `tail_${state.turn.round}_wang`,
    unitId: "wang_zhuo",
    order: 1,
    kind: marked ? "probe" : "shadow",
    label: marked ? "锁链试探" : "借人流尾随",
    detail: marked ? "身份已被怀疑｜逼你暴露同伴去向" : "保持两处摊位距离｜继续封住河岸出口",
    from,
    to,
    effects: [
      { type: "move", targetId: "wang_zhuo", to },
      { type: "increment", key: "tailPressure", amount: 1 },
      ...(marked ? [{ type: "damage", targetId: "player", amount: 2 }] : []),
    ],
    text: marked ? "尾随者骤然抖开一截锁链，试探你的肩线，气血下降2。" : "尾随者借人流换到下一个门洞，仍没有露出真正身份。",
  }];
}

function outcomeIntents(state) {
  const intents = [];
  const crossbow = enemy(state, "dock_crossbow");
  if (crossbow?.active && !crossbow.defeated) {
    const damage = playerCovered(state) ? 1 : 2;
    intents.push({
      id: `outcome_${state.turn.round}_crossbow`,
      unitId: "dock_crossbow",
      order: 2,
      kind: "parting_shot",
      label: "断后毒矢",
      detail: `撤入芦苇前放出最后一箭｜预计气血−${damage}`,
      effects: [
        { type: "damage", targetId: "player", amount: damage },
        { type: "deactivate", targetId: "dock_crossbow" },
      ],
      text: `弩手撤入芦苇前放出最后一箭，你的气血下降${damage}。`,
      death: {
        causeId: "dock_poison_bolt",
        cause: "断后的毒弩穿入胸口，气血在王卓倒下后才断绝。",
        memory: "首领倒下不等于远程威胁消失，必须先处理已经形成的射击窗口。",
        factId: "crossbow_parting_shot",
      },
    });
  }
  const blade = enemy(state, "poison_blade");
  if (blade?.active && !blade.defeated) {
    intents.push({
      id: `outcome_${state.turn.round}_blade`,
      unitId: "poison_blade",
      order: 3,
      kind: "withdraw",
      label: "弃首撤走",
      detail: "首领已失去战力｜帮众不再恋战",
      effects: [{ type: "deactivate", targetId: "poison_blade" }],
      text: "毒刃帮众看见王卓失去战力，转身没入柳影。",
    });
  }
  const wang = enemy(state, "wang_zhuo");
  if (wang?.active && state.pendingOutcome?.outcome !== "released") {
    intents.push({
      id: `outcome_${state.turn.round}_wang`,
      unitId: "wang_zhuo",
      order: 4,
      kind: "settled",
      label: state.pendingOutcome?.outcome === "subdued" ? "穴道受制" : "倒地无声",
      detail: "首领已经无法继续出手",
      effects: [{ type: "deactivate", targetId: "wang_zhuo" }],
      text: state.pendingOutcome?.outcome === "subdued" ? "王卓穴道受制，只能看着余党撤走。" : "王卓倒在浅水中，再没有动作。",
    });
  }
  return intents;
}

function wangRiverIntents(state, helpers) {
  if (state.pendingOutcome) return outcomeIntents(state);
  const intents = [];
  const wang = enemy(state, "wang_zhuo");
  if (wang.active && !wang.defeated) {
    const from = state.positions.wang_zhuo;
    const path = helpers.path(from, state.positions.player);
    const distance = wangDistance(state, helpers);
    if (enemyHasStatus(state, "wang_zhuo", "off_balance")) {
      intents.push({
        id: `river_${state.turn.round}_wang_recover`,
        unitId: "wang_zhuo",
        order: 1,
        kind: "recover",
        label: "收链稳身",
        detail: "失衡迫使王卓放弃本轮强攻",
        from,
        to: from,
        effects: [{ type: "removeStatus", targetId: "wang_zhuo", statusId: "off_balance" }],
        text: "王卓收回锁链稳住湿石，没有抢到出刀窗口。",
      });
    } else if (distance <= 1) {
      const hidden = !hasFact(state, "wang_chain_blade");
      const guarded = Boolean(state.battle.conditions.steadyFooting);
      const damage = Math.max(2, (hidden ? 7 : 4) - (guarded ? 2 : 0));
      intents.push({
        id: `river_${state.turn.round}_wang_chain`,
        unitId: "wang_zhuo",
        order: 1,
        kind: "attack",
        label: hidden ? "袖底回链" : "锁链回锋",
        detail: `${helpers.nodeName(from)}→${helpers.nodeName(state.positions.player)}｜预计气血−${damage}${hidden ? " · 后手未明" : ""}`,
        from,
        to: state.positions.player,
        effects: [
          { type: "damage", targetId: "player", amount: damage },
          { type: "fact", factId: "wang_chain_blade" },
          ...(damage >= 6 ? [{ type: "wound", targetId: "player", wound: { id: "wang_chain_torso", type: "cut", bodyPart: "torso", severity: 3, countdown: 2, tags: ["must_stabilize"] } }] : []),
        ],
        text: hidden
          ? `锁链刀从袖底折返，真正后手直到贴身才显形，你的气血下降${damage}。`
          : `王卓抖链回锋，你的气血下降${damage}。`,
        death: {
          causeId: "wang_chain_blade",
          cause: "锁链刀从袖底折返，沿旧伤割断气血。",
          memory: "王卓正手只是引线，锁链会从左腕袖底折返。",
          factId: "wang_chain_blade",
        },
      });
    } else {
      const to = path.length > 1 ? path[1] : from;
      intents.push({
        id: `river_${state.turn.round}_wang_close`,
        unitId: "wang_zhuo",
        order: 1,
        kind: "move",
        label: "踏水收距",
        detail: `${helpers.nodeName(from)}→${helpers.nodeName(to)}｜锁链进入适中距离`,
        from,
        to,
        effects: [{ type: "move", targetId: "wang_zhuo", to }],
        text: `王卓踏过浅水，从${helpers.nodeName(from)}逼到${helpers.nodeName(to)}。`,
      });
    }
  }

  const blade = enemy(state, "poison_blade");
  if (blade.active && !blade.defeated) {
    const from = state.positions.poison_blade;
    const path = helpers.path(from, state.positions.player);
    const distance = helpers.distance(from, state.positions.player);
    if (state.battle.conditions.allyEngaged && ally(state, "yan_jinghong")?.active) {
      intents.push({
        id: `river_${state.turn.round}_blade_pinned`,
        unitId: "poison_blade",
        order: 2,
        kind: "restrained",
        label: "被同伴牵制",
        detail: "燕惊鸿截住毒刃｜本轮不能夹击",
        from,
        to: from,
        effects: [
          { type: "damage", targetId: "poison_blade", amount: 2 },
          { type: "condition", key: "allyEngaged", value: false },
        ],
        text: "燕惊鸿以刀鞘截住毒刃，帮众这一轮没能靠近。",
      });
    } else if (distance <= 1) {
      const guarded = Boolean(state.battle.conditions.allyGuard);
      const damage = guarded ? 1 : 3;
      intents.push({
        id: `river_${state.turn.round}_blade_poison`,
        unitId: "poison_blade",
        order: 2,
        kind: "poison",
        label: "淬毒短刃",
        detail: `柳根→${helpers.nodeName(state.positions.player)}｜预计气血−${damage}${guarded ? " · 同伴格开刀锋" : " · 附加蛇毒"}`,
        from,
        to: state.positions.player,
        effects: [
          { type: "damage", targetId: "player", amount: damage },
          ...(!guarded ? [{ type: "status", targetId: "player", status: { id: "snake_venom", label: "蛇毒", duration: 3, potency: 1, tickDamage: 1 } }] : []),
          { type: "condition", key: "allyGuard", value: false },
        ],
        text: guarded ? "燕惊鸿格开大半刀锋，你只被擦去一点气血。" : "淬毒短刃擦过手臂，蛇毒随伤口侵入。",
        death: {
          causeId: "poison_blade",
          cause: "淬毒短刃沿手臂切入，蛇毒与失血一同抽空气力。",
          memory: "毒刃帮众贴身后会附加持续蛇毒，必须先牵制或压毒。",
          factId: "poison_blade_venom",
        },
      });
    } else {
      const to = path.length > 1 ? path[1] : from;
      const caught = Boolean(state.battle.conditions.ropeArmed && to === "mooring_post");
      intents.push({
        id: `river_${state.turn.round}_blade_close`,
        unitId: "poison_blade",
        order: 2,
        kind: caught ? "trap" : "move",
        label: caught ? "绊入船索" : "沿柳根包抄",
        detail: caught ? "松索骤紧｜毒刃失衡并损失气血" : `${helpers.nodeName(from)}→${helpers.nodeName(to)}｜形成夹击`,
        from,
        to,
        effects: [
          { type: "move", targetId: "poison_blade", to },
          ...(caught ? [
            { type: "damage", targetId: "poison_blade", amount: 8 },
            { type: "status", targetId: "poison_blade", status: { id: "off_balance", label: "失衡", duration: 1 } },
            { type: "condition", key: "ropeArmed", value: false },
            { type: "environment", environmentId: "loose_rope", state: "spent" },
          ] : []),
        ],
        text: caught ? "毒刃踩进松开的船索，被骤然绷紧的麻绳拖倒在湿石上。" : "毒刃帮众贴着柳根包抄，开始压缩你的退路。",
      });
    }
  }

  const crossbow = enemy(state, "dock_crossbow");
  if (!crossbow.defeated && !crossbow.active && (state.turn.stageRound >= 2 || Number(state.battle.ledger.alert || 0) >= 2)) {
    intents.push({
      id: `river_${state.turn.round}_crossbow_arrive`,
      unitId: "dock_crossbow",
      order: 3,
      kind: "reinforce",
      label: "芦苇援弩",
      detail: "援兵登上小舟｜下一轮开始放箭",
      from: "skiff",
      to: "skiff",
      effects: [{ type: "activate", targetId: "dock_crossbow" }],
      text: "芦苇后亮起弩机冷光，毒蛇帮的援手已经登上小舟。",
    });
  } else if (crossbow.active && !crossbow.defeated) {
    const damage = playerCovered(state) ? 1 : state.positions.player === "shallow_water" ? 2 : 3;
    intents.push({
      id: `river_${state.turn.round}_crossbow_shoot`,
      unitId: "dock_crossbow",
      order: 3,
      kind: "shoot",
      label: "毒弩封岸",
      detail: `小舟→${helpers.nodeName(state.positions.player)}｜预计气血−${damage}${damage === 1 ? " · 有遮挡" : ""}`,
      from: "skiff",
      to: "skiff",
      effects: [
        { type: "damage", targetId: "player", amount: damage },
        ...(damage >= 3 ? [{ type: "wound", targetId: "player", wound: { id: "dock_bolt_arm", type: "pierce", bodyPart: "arm", severity: 1, tags: ["limits_needles"] } }] : []),
      ],
      text: damage === 1 ? "弩箭撞上系舟桩，只擦去一点气血。" : `毒弩穿过河雾，你的气血下降${damage}。`,
      death: {
        causeId: "dock_poison_bolt",
        cause: "毒弩从芦苇后的死角贯入，气血随毒一起断绝。",
        memory: "第二轮后援弩会从小舟出现，必须取得遮挡、抢先破弩或尽快收束。",
        factId: "dock_crossbow_reinforcement",
      },
    });
  }
  return intents;
}

export const WANG_ZHUO_ENCOUNTER = Object.freeze({
  id: "wang_zhuo_east_lake",
  title: "东湖截命",
  location: "金陵 · 东湖",
  objective: "护住燕惊鸿，并决定生擒、取命、放线或撤离。",
  sceneClass: "east-lake",
  sceneImage: "./assets/scenes/purple-gold-river-dawn.webp",
  historyLabel: "东湖战录",
  maxEnergy: 3,
  defaults: WANG_ZHUO_DEFAULTS,
  player: { name: "陈司命" },
  defaultDeath: {
    causeId: "wang_chain_blade",
    cause: "锁链刀绕过正面，从袖底折返回来，气血顷刻断绝。",
    memory: "王卓正手只是引线，真正杀招会从左腕袖底折返。",
    factId: "wang_chain_blade",
  },
  statusDeath: {
    causeId: "snake_venom_exhaustion",
    cause: "蛇毒在敌招之后侵入心脉，气血终于断绝。",
    memory: "蛇毒会在每轮敌方行动后继续扣减气血，不能只看眼前刀伤。",
    factId: "poison_ticks_after_enemy_phase",
  },
  participants: [
    { id: "wang_zhuo", name: "王卓", role: "聚气首领", side: "enemy", stageId: "qi", max: 26, primary: true, icon: "chain", portrait: "./assets/combat/portrait-black-leader.webp" },
    { id: "poison_blade", name: "毒刃", role: "近身夹击", side: "enemy", stageId: "body", max: 10, icon: "blade", portrait: "./assets/combat/portrait-masked-blade.webp" },
    { id: "dock_crossbow", name: "援弩", role: "远程增援", side: "enemy", stageId: "body", max: 8, icon: "bow", portrait: "./assets/combat/portrait-roof-crossbow.webp" },
    { id: "yan_jinghong", name: "燕惊鸿", role: "官面同伴", side: "ally", stageId: "body", max: 16, icon: "ally", portrait: "" },
  ],
  nodes: [
    { id: "lane_mouth", name: "柳巷入口", shortName: "巷口", type: "ground", x: 12, y: 72, playerSelectable: true },
    { id: "awning", name: "旧布摊棚", shortName: "摊棚", type: "cover", x: 31, y: 47, playerSelectable: true },
    { id: "crowd", name: "晚市人流", shortName: "人流", type: "crowd", x: 48, y: 70, playerSelectable: true },
    { id: "tea_stall", name: "歇业茶摊", shortName: "茶摊", type: "cover", x: 54, y: 28, playerSelectable: true },
    { id: "gate", name: "临河门洞", shortName: "门洞", type: "cover", x: 72, y: 47, playerSelectable: true },
    { id: "river_turn", name: "东湖转角", shortName: "河口", type: "exit", x: 89, y: 68, playerSelectable: true },
    { id: "bank_entry", name: "河岸入口", shortName: "岸口", type: "ground", x: 11, y: 72, playerSelectable: true },
    { id: "wet_stones", name: "湿滑石滩", shortName: "湿石", type: "wet", movementDifficulty: 3, x: 29, y: 53, playerSelectable: true },
    { id: "shallow_water", name: "东湖浅水", shortName: "浅水", type: "water", movementDifficulty: 2, x: 47, y: 75, playerSelectable: true },
    { id: "mooring_post", name: "系舟木桩", shortName: "木桩", type: "cover", x: 58, y: 42, playerSelectable: true },
    { id: "willow_root", name: "老柳盘根", shortName: "柳根", type: "cover", x: 77, y: 61, playerSelectable: true },
    { id: "skiff", name: "岸边小舟", shortName: "小舟", type: "escape", x: 89, y: 29, playerSelectable: true },
  ],
  edges: {
    lane_mouth: ["awning", "crowd"],
    awning: ["lane_mouth", "crowd", "tea_stall"],
    crowd: ["lane_mouth", "awning", "tea_stall", "gate"],
    tea_stall: ["awning", "crowd", "gate"],
    gate: ["crowd", "tea_stall", "river_turn"],
    river_turn: ["gate"],
    bank_entry: ["wet_stones", "shallow_water"],
    wet_stones: ["bank_entry", "shallow_water", "mooring_post"],
    shallow_water: ["bank_entry", "wet_stones", "mooring_post", "skiff"],
    mooring_post: ["wet_stones", "shallow_water", "willow_root", "skiff"],
    willow_root: ["mooring_post", "skiff"],
    skiff: ["shallow_water", "mooring_post", "willow_root"],
  },
  environment: [
    { id: "market_awning", name: "旧布摊棚", state: "standing", icon: "awning", panelTitle: "借摊棚断视线", hint: "摊棚能隔开尾随者与燕惊鸿，也会把你逼进更窄的门洞。", nodeId: "awning", x: 30, y: 37 },
    { id: "market_crowd", name: "晚市人流", state: "moving", icon: "crowd", panelTitle: "借人流换位", hint: "人流只提供一次遮断机会，福缘足够时还能留下反跟踪标记。", nodeId: "crowd", x: 48, y: 59 },
    { id: "river_gate", name: "临河门洞", state: "open", icon: "gate", panelTitle: "抢占门洞", hint: "狭窄门洞可以抵消多人夹击，但会暴露通往东湖的路线。", nodeId: "gate", x: 72, y: 38 },
    { id: "wet_bank", name: "湿滑石滩", state: "slick", icon: "water", panelTitle: "借湿石诱敌", hint: "普通换位处于不利，鱼跃龙门诀或定海桩可以把湿滑变成优势。", nodeId: "wet_stones", x: 29, y: 53 },
    { id: "mooring_post_env", name: "系舟木桩", state: "fixed", icon: "post", panelTitle: "绕桩断链", hint: "木桩提供弩箭遮挡，也能迫使锁链刀改变轨迹。", nodeId: "mooring_post", x: 58, y: 42 },
    { id: "loose_rope", name: "松动船索", state: "loose", icon: "rope", panelTitle: "放松船索", hint: "船索可以绊住包抄者，也能把小舟变成护人撤离的退路。", nodeId: "skiff", x: 86, y: 34 },
    { id: "shallow_water_env", name: "东湖浅水", state: "open", icon: "water", panelTitle: "踏入浅水", hint: "鱼跃龙门诀在水中提供优势，弩箭也更难锁定落脚。", nodeId: "shallow_water", x: 47, y: 72 },
  ],
  stages: [
    {
      id: "willow_tail",
      label: "第一幕 · 柳巷尾随",
      title: "柳巷尾随",
      location: "金陵 · 柳巷",
      objective: "确认尾随者身份，并让燕惊鸿先离开视线。",
      sceneClass: "willow-tail",
      sceneImage: "./assets/combat/jinling-rain-ambush.webp",
      mapLabel: "柳巷身位图",
      nodeIds: ["lane_mouth", "awning", "crowd", "tea_stall", "gate", "river_turn"],
      links: [["lane_mouth", "awning"], ["lane_mouth", "crowd"], ["awning", "crowd"], ["awning", "tea_stall"], ["crowd", "tea_stall"], ["crowd", "gate"], ["tea_stall", "gate"], ["gate", "river_turn"]],
      environmentIds: ["market_awning", "market_crowd", "river_gate"],
      activeEnemyIds: ["wang_zhuo"],
      activeAllyIds: ["yan_jinghong"],
      positions: { player: "lane_mouth", wang_zhuo: "gate", poison_blade: "river_turn", dock_crossbow: "river_turn", yan_jinghong: "crowd" },
      conditions: { identityProgress: 0, allySafe: false, tailPressure: 0, playerMarked: false, provoked: false, companionUsedRound: 0 },
      entryText: "柳巷里总有一道人影隔着两处摊位跟随，临河门洞已经被他提前占住。",
    },
    {
      id: "riverbank",
      label: "第二幕 · 河岸截命",
      title: "河岸截命",
      location: "金陵 · 东湖",
      objective: "在聚气境王卓手中保命，并决定生擒、取命、放线或护人撤离。",
      sceneClass: "east-lake",
      sceneImage: "./assets/scenes/purple-gold-river-dawn.webp",
      mapLabel: "东湖河岸身位图",
      nodeIds: ["bank_entry", "wet_stones", "shallow_water", "mooring_post", "willow_root", "skiff"],
      links: [["bank_entry", "wet_stones"], ["bank_entry", "shallow_water"], ["wet_stones", "shallow_water"], ["wet_stones", "mooring_post"], ["shallow_water", "mooring_post"], ["shallow_water", "skiff"], ["mooring_post", "willow_root"], ["mooring_post", "skiff"], ["willow_root", "skiff"]],
      environmentIds: ["wet_bank", "mooring_post_env", "loose_rope", "shallow_water_env"],
      activeEnemyIds: ["wang_zhuo", "poison_blade"],
      activeAllyIds: ["yan_jinghong"],
      positions: { player: "bank_entry", wang_zhuo: "mooring_post", poison_blade: "willow_root", dock_crossbow: "skiff", yan_jinghong: "bank_entry" },
      conditions: { weakPoint: false, steadyFooting: false, ropeArmed: false, escapeRoute: false, allyGuard: false, allyEngaged: false, companionUsedRound: 0, reinforcementArrived: false, provoked: false, chokePoint: false },
      entryText: "尾随者在河岸抖开锁链刀，王卓的身份与聚气境气机一同显露；柳根后还有毒刃帮众包抄。",
    },
  ],
  actions: [
    {
      id: "observe_tail",
      stageIds: ["willow_tail"],
      icon: "eye",
      verb: "识招",
      objectId: "wang_zhuo",
      objectName: "尾随者",
      intent: "识招",
      title: "借橱窗看他的左腕",
      description: "不回头，只从雨后橱窗里看清尾随者换手与藏兵的位置。",
      attribute: "insight",
      difficulty: 3,
      energyCost: 1,
      ignoreStage: true,
      successPreview: "确认身份并积累两点识破进度",
      riskPreview: "看得太久会让对方确认你已经察觉",
      focusIds: ["default", "target:wang_zhuo"],
      recommendationWeight: 30,
      advantages: (state) => hasFact(state, "wang_chain_blade") ? "命灯已经照见袖底锁链" : null,
      outcomes: {
        great: { text: "你从橱窗倒影看见蛇纹铜牌与左腕锁扣，一眼确认尾随者正是王卓。", effects: [{ type: "increment", key: "identityProgress", amount: 2 }, { type: "fact", factId: "wang_identity" }, { type: "evidence", evidenceId: "bronze_serpent_badge" }] },
        success: { text: "你看清他左腕缠着锁链扣，尾随绝非偶然。", effects: [{ type: "increment", key: "identityProgress", amount: 1 }, { type: "fact", factId: "wang_identity" }] },
        costly: { text: "你确认锁链扣时也在橱窗里和他对上视线。", effects: [{ type: "increment", key: "identityProgress", amount: 1 }, { type: "fact", factId: "wang_identity" }, { type: "condition", key: "playerMarked", value: true }, { type: "alert", amount: 1 }] },
        failure: { text: "橱窗只映出一截空巷，尾随者却已经知道你在找他。", effects: [{ type: "condition", key: "playerMarked", value: true }, { type: "alert", amount: 1 }] },
      },
    },
    {
      id: "send_yan_ahead",
      stageIds: ["willow_tail"],
      icon: "ally",
      verb: "示意",
      objectId: "yan_jinghong",
      objectName: "燕惊鸿",
      intent: "同伴",
      title: "让燕惊鸿先过门洞",
      description: "由你留在人流中拖住视线，让她先带官面线索离开。",
      energyCost: 1,
      successPreview: "同伴脱离视线，关系转为战术优势",
      riskPreview: "你会独自承受尾随者下一次试探",
      focusIds: ["default", "ally:yan_jinghong"],
      recommendationWeight: 28,
      availableWhen: (state) => {
        if (state.battle.conditions.allySafe) return "燕惊鸿已经脱离尾随视线。";
        return relationValue(state, "yan_jinghong", "trust") >= 40 ? true : "她还不信任你独自留下断后。";
      },
      outcomes: {
        success: { text: "燕惊鸿读懂你的手势，借人流先一步穿过门洞。", effects: [{ type: "condition", key: "allySafe", value: true }, { type: "move", targetId: "yan_jinghong", to: "river_turn" }, { type: "relationship", relationId: "yan_jinghong", field: "trust", amount: 2 }] },
      },
    },
    {
      id: "lure_awning",
      stageIds: ["willow_tail"],
      icon: "shadow",
      verb: "诱敌",
      objectId: "market_awning",
      objectName: "旧布摊棚",
      intent: "借势",
      title: "绕摊棚逼他换手",
      description: "借垂下的湿布切断视线，迫使尾随者露出藏兵的左腕。",
      attribute: "agility",
      difficulty: 3,
      energyCost: 2,
      ignoreStage: true,
      successPreview: "换到摊棚并识破一层身份",
      riskPreview: "失手会在窄处被锁链试探",
      focusIds: ["market_awning", "position:awning"],
      recommendationWeight: 18,
      advantages: (state) => state.battle.conditions.crowdBetween ? "人流遮断追踪视线" : null,
      outcomes: {
        great: { text: "湿布掀落时你已经绕到摊棚另一侧，王卓换手的动作再无遮掩。", effects: [{ type: "move", targetId: "player", to: "awning" }, { type: "increment", key: "identityProgress", amount: 2 }, { type: "condition", key: "chokePoint", value: true }, { type: "fact", factId: "wang_identity" }] },
        success: { text: "你绕过摊棚，看见尾随者左腕扣着一截乌沉锁链。", effects: [{ type: "move", targetId: "player", to: "awning" }, { type: "increment", key: "identityProgress", amount: 1 }, { type: "condition", key: "chokePoint", value: true }] },
        costly: { text: "你钻过湿布时肩头被锁链末端擦过，但也逼他露了兵器。", effects: [{ type: "move", targetId: "player", to: "awning" }, { type: "increment", key: "identityProgress", amount: 1 }, { type: "damage", targetId: "player", amount: 2 }, { type: "wound", targetId: "player", wound: { id: "awning_chain_shoulder", type: "bruise", bodyPart: "shoulder", severity: 1, tags: ["limits_training"] } }] },
        failure: { text: "湿布缠住脚步，尾随者反而先封住门洞。", effects: [{ type: "condition", key: "playerMarked", value: true }] },
      },
    },
    {
      id: "crowd_screen",
      stageIds: ["willow_tail"],
      icon: "crowd",
      verb: "借势",
      objectId: "market_crowd",
      objectName: "晚市人流",
      intent: "借势",
      title: "借收摊人流错开视线",
      description: "利用只出现一次的人流交错，把尾随与同伴路线分开。",
      attribute: "fortune",
      difficulty: 2,
      energyCost: 1,
      ignoreStage: true,
      successPreview: "形成狭窄人墙并抵消夹击",
      riskPreview: "时机不对会让尾随者更快看清目标",
      focusIds: ["market_crowd", "position:crowd"],
      recommendationWeight: 16,
      advantages: (state) => state.battle.fortuneOpportunity ? "入场福缘保留了收摊窗口" : null,
      outcomes: {
        great: { text: "车架与行人恰好横过巷中，你在遮挡里留下反跟踪记号。", effects: [{ type: "condition", key: "crowdBetween", value: true }, { type: "condition", key: "chokePoint", value: true }, { type: "increment", key: "identityProgress", amount: 1 }, { type: "evidence", evidenceId: "tail_route_mark" }] },
        success: { text: "收摊人流从中穿过，暂时切断尾随者和燕惊鸿之间的视线。", effects: [{ type: "condition", key: "crowdBetween", value: true }, { type: "condition", key: "chokePoint", value: true }] },
        costly: { text: "人流挡住视线，也把你挤向尾随者占住的门洞。", effects: [{ type: "condition", key: "crowdBetween", value: true }, { type: "condition", key: "playerMarked", value: true }] },
        failure: { text: "人流散得太快，尾随者已经看清你和燕惊鸿的去向。", effects: [{ type: "condition", key: "playerMarked", value: true }, { type: "alert", amount: 1 }] },
      },
    },
    {
      id: "intercept_tail",
      stageIds: ["willow_tail"],
      icon: "chain",
      verb: "截击",
      objectId: "wang_zhuo",
      objectName: "身份未明的尾随者",
      intent: "强攻",
      title: "回身扣住他的正手",
      description: "在身份与兵器未明时直接截击，可能踏进聚气锁链的袖底回锋。",
      attribute: "strength",
      difficulty: 4,
      energyCost: 2,
      targetId: "wang_zhuo",
      directCombat: true,
      successPreview: "逼停尾随并抢下先手",
      riskPreview: "未知后手可能直接击碎命灯",
      focusIds: ["target:wang_zhuo"],
      recommendationWeight: -15,
      fatalWhen: (state) => Number(state.turn.stageRound) === 1,
      knownFatalWhen: (state) => hasFact(state, "wang_chain_blade"),
      advantages: directAdvantages,
      outcomes: {
        great: { text: "你扣住正手并撞开门洞，尾随者第一次被迫显出锁链。", effects: [{ type: "damage", targetId: "wang_zhuo", amount: 4, floor: 1 }, { type: "increment", key: "identityProgress", amount: 2 }, { type: "fact", factId: "wang_identity" }] },
        success: { text: "你逼停尾随脚步，也看见他袖底垂下一截锁链。", effects: [{ type: "damage", targetId: "wang_zhuo", amount: 3, floor: 1 }, { type: "increment", key: "identityProgress", amount: 1 }, { type: "fact", factId: "wang_identity" }] },
        costly: { text: "你撞开正手，锁链末端仍在肋下留下血线。", effects: [{ type: "damage", targetId: "wang_zhuo", amount: 2, floor: 1 }, { type: "damage", targetId: "player", amount: 3 }, { type: "increment", key: "identityProgress", amount: 1 }] },
        failure: { text: "你扣住的只是引线，锁链从袖底折返，沿肋下切入。", effects: [{ type: "damage", targetId: "player", amount: 99 }, { type: "fact", factId: "wang_chain_blade" }], death: { causeId: "wang_chain_blade", cause: "锁链从袖底折返，沿肋下切入，气血顷刻断绝。", memory: "王卓正手只是引线，锁链会从左腕袖底折返。", factId: "wang_chain_blade" } },
      },
    },
    {
      id: "fate_to_insight",
      stageIds: ["willow_tail", "riverbank"],
      icon: "fate",
      verb: "改命",
      objectId: "insight",
      objectName: "悟性",
      intent: "改命",
      title: "改命换悟",
      description: "把当前最高的一点其他属性转入悟性；本轮敌招仍会照常推进。",
      energyCost: 3,
      successPreview: "悟性提高一点并改变后续因果键",
      riskPreview: "耗尽本轮三点气机",
      recommendationWeight: -25,
      outcomes: { success: { text: "玉佩微热，一点旧力转入悟性，这一轮也随之耗尽。", effects: [{ type: "reallocate", to: "insight" }] } },
    },
    {
      id: "fate_to_agility",
      stageIds: ["willow_tail", "riverbank"],
      icon: "fate",
      verb: "改命",
      objectId: "agility",
      objectName: "身法",
      intent: "改命",
      title: "改命换身",
      description: "把当前最高的一点其他属性转入身法；本轮敌招仍会照常推进。",
      energyCost: 3,
      successPreview: "身法提高一点并改变后续因果键",
      riskPreview: "耗尽本轮三点气机",
      recommendationWeight: -26,
      outcomes: { success: { text: "玉佩把一点旧力转入身法，你用完这一轮才稳住新的气机。", effects: [{ type: "reallocate", to: "agility" }] } },
    },
    {
      id: "read_chain",
      stageIds: ["riverbank"],
      icon: "eye",
      verb: "识招",
      objectId: "wang_zhuo",
      objectName: "王卓左腕",
      intent: "识招",
      title: "只看锁链回收的左腕",
      description: "不追刀头，只看王卓换劲时左腕与肩井的停顿。",
      attribute: "insight",
      difficulty: 4,
      energyCost: 1,
      ignoreStage: true,
      successPreview: "看破左腕弱点并开放制伏",
      riskPreview: "失手会让王卓抢进适中距离",
      focusIds: ["default", "target:wang_zhuo"],
      recommendationWeight: 32,
      advantages: (state) => hasFact(state, "wang_chain_blade") ? "命灯已照见袖底回链" : null,
      outcomes: {
        great: { text: "你看见锁链每次折返前左腕都会停半息，连肩井落点也一并记下。", effects: [{ type: "condition", key: "weakPoint", value: true }, { type: "fact", factId: "wang_chain_blade" }, { type: "status", targetId: "wang_zhuo", status: { id: "off_balance", label: "换劲受阻", duration: 1 } }] },
        success: { text: "锁链刀再快，也必须从左腕换劲；你终于看清那一处停顿。", effects: [{ type: "condition", key: "weakPoint", value: true }, { type: "fact", factId: "wang_chain_blade" }] },
        costly: { text: "你看清左腕停顿时，链尾也擦伤了持针手臂。", effects: [{ type: "condition", key: "weakPoint", value: true }, { type: "fact", factId: "wang_chain_blade" }, { type: "damage", targetId: "player", amount: 2 }, { type: "wound", targetId: "player", wound: { id: "chain_read_arm", type: "cut", bodyPart: "arm", severity: 1, tags: ["limits_needles"] } }] },
        failure: { text: "你被刀头牵走视线，王卓已经借锁链抢近。", effects: [{ type: "condition", key: "provoked", value: true }] },
      },
    },
    {
      id: "needle_wang",
      stageIds: ["riverbank"],
      icon: "needles",
      verb: "夺械",
      objectId: "wang_zhuo",
      objectName: "王卓左腕",
      intent: "夺械",
      title: "春风针·截腕",
      description: "趁锁链回收时截断左腕发力；聚气越阶仍会压低胜算。",
      attribute: "insight",
      skillId: "spring_rain_needles",
      skillName: "春风化雨针",
      masteryRequired: "learned",
      difficulty: 5,
      energyCost: 2,
      targetId: "wang_zhuo",
      directCombat: true,
      bodyParts: ["arm", "shoulder"],
      requiresHealthy: true,
      successPreview: "王卓气血 -4～7并削弱锁链",
      riskPreview: "夹击或湿滑会抵消水边优势",
      focusIds: ["default", "target:wang_zhuo", "mooring_post_env"],
      recommendationWeight: 24,
      availableWhen: (state) => {
        const distance = ["bank_entry", "skiff"].includes(state.positions.player) ? 3 : 2;
        return distance <= 2 || state.battle.conditions.weakPoint ? true : "王卓仍在银针有效距离之外。";
      },
      advantages: directAdvantages,
      disadvantages: directDisadvantages,
      outcomes: {
        great: { text: "银针先钉腕脉再擦过链扣，王卓的聚气被截断一瞬。", effects: [{ type: "damage", targetId: "wang_zhuo", amount: 7, floor: 1 }, { type: "condition", key: "weakPoint", value: true }, { type: "status", targetId: "wang_zhuo", status: { id: "off_balance", label: "锁链失衡", duration: 1 } }] },
        success: { text: "银针钉入左腕，锁链回收明显慢了一拍。", effects: [{ type: "damage", targetId: "wang_zhuo", amount: 5, floor: 1 }, { type: "condition", key: "weakPoint", value: true }] },
        costly: { text: "银针截腕得手，链尾也在持针手臂留下一道伤。", effects: [{ type: "damage", targetId: "wang_zhuo", amount: 4, floor: 1 }, { type: "damage", targetId: "player", amount: 2 }, { type: "wound", targetId: "player", wound: { id: "needle_chain_arm", type: "cut", bodyPart: "arm", severity: 1, tags: ["limits_needles"] } }] },
        failure: { text: "银针被锁链荡开，王卓借回收之势抢进。", effects: [{ type: "condition", key: "provoked", value: true }] },
      },
    },
    {
      id: "rod_trip_blade",
      stageIds: ["riverbank"],
      icon: "rod",
      verb: "牵制",
      objectId: "poison_blade",
      objectName: "毒刃帮众",
      intent: "强攻",
      title: "打鱼杆·缠踝拖倒",
      description: "长杆绕过毒刃，借柳根与湿石把夹击者拖出阵形。",
      attribute: "strength",
      skillId: "fishing_rod_method",
      skillName: "打鱼杆法",
      difficulty: 3,
      energyCost: 2,
      targetId: "poison_blade",
      directCombat: true,
      successPreview: "重创毒刃并解除夹击",
      riskPreview: "贴身或手臂重伤时长杆难以展开",
      focusIds: ["target:poison_blade", "willow_root"],
      recommendationWeight: 22,
      availableWhen: (state) => enemy(state, "poison_blade")?.active && !enemy(state, "poison_blade")?.defeated ? true : "毒刃帮众已经失去战力。",
      advantages: (state) => state.positions.poison_blade === "willow_root" ? "柳根可以固定长杆发力" : null,
      disadvantages: (state) => state.positions.player === state.positions.poison_blade ? "贴身难以展开长杆" : directDisadvantages(state),
      outcomes: {
        great: { text: "长杆缠踝借柳根一绞，毒刃整个人砸进湿石。", effects: [{ type: "damage", targetId: "poison_blade", amount: 10 }, { type: "condition", key: "chokePoint", value: true }] },
        success: { text: "杆梢缠住脚踝，毒刃被拖离夹击位置。", effects: [{ type: "damage", targetId: "poison_blade", amount: 6 }, { type: "status", targetId: "poison_blade", status: { id: "off_balance", label: "失衡", duration: 1 } }, { type: "condition", key: "chokePoint", value: true }] },
        costly: { text: "毒刃被拖倒，杆尾反震也扯伤了你的肩口。", effects: [{ type: "damage", targetId: "poison_blade", amount: 5 }, { type: "damage", targetId: "player", amount: 2 }, { type: "wound", targetId: "player", wound: { id: "rod_shoulder_strain", type: "strain", bodyPart: "shoulder", severity: 1, tags: ["limits_training"] } }] },
        failure: { text: "长杆被短刃贴住，没能把夹击者拖出阵形。", effects: [{ type: "condition", key: "chokePoint", value: false }] },
      },
    },
    {
      id: "sea_stake_guard",
      stageIds: ["riverbank"],
      icon: "stance",
      verb: "立桩",
      objectId: "wet_bank",
      objectName: "湿滑河岸",
      intent: "护人",
      title: "沧澜定海桩·稳岸",
      description: "沉肩落胯，把湿滑与推挤都收进桩架，同时替燕惊鸿挡住一侧。",
      attribute: "constitution",
      skillId: "sea_stilling_stake",
      skillName: "沧澜定海桩",
      difficulty: 3,
      energyCost: 2,
      ignoreStage: true,
      successPreview: "抵消湿滑与一次夹击，保护同伴",
      riskPreview: "苦成会替同伴承受轻伤",
      focusIds: ["default", "wet_bank", "ally:yan_jinghong"],
      recommendationWeight: 27,
      advantages: (state) => ["wet_stones", "shallow_water"].includes(state.positions.player) ? "桩功正适合水边立足" : null,
      outcomes: {
        great: { text: "桩架沉入湿石，你同时封住锁链与毒刃靠近燕惊鸿的路线。", effects: [{ type: "condition", key: "steadyFooting", value: true }, { type: "condition", key: "allyGuard", value: true }, { type: "condition", key: "allyEngaged", value: true }, { type: "relationship", relationId: "yan_jinghong", field: "trust", amount: 2 }] },
        success: { text: "你在湿石上稳住下盘，下一轮不再受地形与夹击所制。", effects: [{ type: "condition", key: "steadyFooting", value: true }, { type: "condition", key: "allyGuard", value: true }] },
        costly: { text: "你替燕惊鸿挡开毒刃，肩头也被刀背撞出轻伤。", effects: [{ type: "condition", key: "steadyFooting", value: true }, { type: "condition", key: "allyGuard", value: true }, { type: "damage", targetId: "player", amount: 2 }, { type: "wound", targetId: "player", wound: { id: "stake_guard_shoulder", type: "bruise", bodyPart: "shoulder", severity: 1, tags: ["limits_training"] } }] },
        failure: { text: "脚下湿石一滑，桩架没能及时落稳。", effects: [{ type: "status", targetId: "player", status: { id: "off_balance", label: "失衡", duration: 1 } }] },
      },
    },
    {
      id: "deadwood_suppress",
      stageIds: ["riverbank"],
      icon: "healing",
      verb: "运功",
      objectId: "player_wounds",
      objectName: "蛇毒与致命伤",
      intent: "疗伤",
      title: "神农枯木桩·压伤",
      description: "以枯木桩守住经脉，压下蛇毒并为致命伤止血。",
      attribute: "constitution",
      skillId: "deadwood_stake",
      skillName: "神农枯木桩",
      difficulty: 3,
      energyCost: 2,
      ignoreStage: true,
      successPreview: "移除蛇毒并稳定致命伤",
      riskPreview: "失手不会移除下一轮的死亡倒计时",
      focusIds: ["status:snake_venom", "default"],
      recommendationWeight: 35,
      availableWhen: (state) => playerHasStatus(state, "snake_venom") || state.wounds.some((wound) => Number(wound.severity || 0) >= 3 && !wound.stabilized) ? true : "眼下没有需要运功压制的毒伤。",
      outcomes: {
        great: { text: "枯木桩把毒性逼回伤口，连致命血线也一并封住。", effects: [{ type: "removeStatus", targetId: "player", statusId: "snake_venom" }, { type: "stabilizeWounds" }, { type: "heal", targetId: "player", amount: 2 }] },
        success: { text: "你守住经脉，把蛇毒与失血暂时压住。", effects: [{ type: "removeStatus", targetId: "player", statusId: "snake_venom" }, { type: "stabilizeWounds" }] },
        costly: { text: "毒性被压住，强行运功也让旧伤再疼了一层。", effects: [{ type: "removeStatus", targetId: "player", statusId: "snake_venom" }, { type: "stabilizeWounds" }, { type: "damage", targetId: "player", amount: 1 }] },
        failure: { text: "毒性沿经脉散开，枯木桩没能在这一息压住伤口。", effects: [] },
      },
    },
    {
      id: "companion_pin",
      stageIds: ["riverbank"],
      icon: "ally",
      verb: "配合",
      objectId: "yan_jinghong",
      objectName: "燕惊鸿",
      intent: "同伴",
      title: "请燕惊鸿牵制毒刃",
      description: "她每轮只响应一次明确协作，不另开独立操作面板。",
      energyCost: 1,
      successPreview: "本轮抵消夹击并削弱毒刃",
      riskPreview: "关系不足时她不会把后背交给你",
      focusIds: ["ally:yan_jinghong", "target:poison_blade"],
      recommendationWeight: 29,
      availableWhen: (state) => {
        if (Number(state.battle.conditions.companionUsedRound || 0) === Number(state.turn.round)) return "本轮已经请求过同伴协作。";
        if (!ally(state, "yan_jinghong")?.active || relationValue(state, "yan_jinghong", "trust") < 45) return "燕惊鸿还不能在乱战中完全相信你的判断。";
        if (!enemy(state, "poison_blade")?.active || enemy(state, "poison_blade")?.defeated) return "眼下没有需要她牵制的近身帮众。";
        return true;
      },
      outcomes: {
        success: { text: "燕惊鸿以刀鞘截住毒刃，把王卓正面完整留给你。", effects: [{ type: "condition", key: "allyEngaged", value: true }, { type: "condition", key: "companionUsedRound", value: 1 }, { type: "damage", targetId: "poison_blade", amount: 2 }] },
      },
      resolve: (state) => ({ text: "燕惊鸿以刀鞘截住毒刃，把王卓正面完整留给你。", effects: [{ type: "condition", key: "allyEngaged", value: true }, { type: "condition", key: "companionUsedRound", value: state.turn.round }, { type: "damage", targetId: "poison_blade", amount: 2 }] }),
    },
    {
      id: "protect_yan",
      stageIds: ["riverbank"],
      icon: "guard",
      verb: "护人",
      objectId: "yan_jinghong",
      objectName: "燕惊鸿",
      intent: "护人",
      title: "替燕惊鸿守住河岸侧翼",
      description: "用自己的下盘封住毒刃，让她能保住官面证据与撤离路线。",
      attribute: "constitution",
      difficulty: 3,
      energyCost: 2,
      ignoreStage: true,
      successPreview: "同伴安全并提高信任",
      riskPreview: "得手有损会由你承受侧翼伤害",
      focusIds: ["ally:yan_jinghong"],
      recommendationWeight: 18,
      availableWhen: (state) => ally(state, "yan_jinghong")?.active && !state.battle.conditions.allyGuard ? true : "燕惊鸿当前已经处在保护之下。",
      outcomes: {
        great: { text: "你封死侧翼，燕惊鸿得以把证据与退路都握在手里。", effects: [{ type: "condition", key: "allyGuard", value: true }, { type: "condition", key: "allySafe", value: true }, { type: "relationship", relationId: "yan_jinghong", field: "trust", amount: 4 }] },
        success: { text: "你替燕惊鸿守住侧翼，她不再受毒刃直接威胁。", effects: [{ type: "condition", key: "allyGuard", value: true }, { type: "relationship", relationId: "yan_jinghong", field: "trust", amount: 2 }] },
        costly: { text: "侧翼守住了，毒刃也在你肩头留下一道轻伤。", effects: [{ type: "condition", key: "allyGuard", value: true }, { type: "damage", targetId: "player", amount: 2 }, { type: "wound", targetId: "player", wound: { id: "protect_yan_shoulder", type: "cut", bodyPart: "shoulder", severity: 1, tags: ["limits_training"] } }, { type: "relationship", relationId: "yan_jinghong", field: "trust", amount: 2 }] },
        failure: { text: "毒刃从你和燕惊鸿之间切过，侧翼仍未稳住。", effects: [{ type: "condition", key: "allyGuard", value: false }] },
      },
    },
    {
      id: "arm_boat_rope",
      stageIds: ["riverbank"],
      icon: "rope",
      verb: "设绊",
      objectId: "loose_rope",
      objectName: "松动船索",
      intent: "借势",
      title: "放松船索，留一道绊扣",
      description: "不立即拉索，只等包抄者踏过系舟桩时收紧。",
      attribute: "fortune",
      difficulty: 3,
      energyCost: 1,
      ignoreStage: true,
      successPreview: "机关可重创下一名包抄者",
      riskPreview: "失手会提前惊动援弩",
      focusIds: ["loose_rope", "position:skiff"],
      recommendationWeight: 23,
      availableWhen: (state) => state.battle.environment.find((entry) => entry.id === "loose_rope")?.state === "loose" && !state.battle.conditions.ropeArmed ? true : "船索已经被使用或收紧。",
      advantages: (state) => state.battle.fortuneOpportunity ? "入场福缘看见绳结已经受潮" : null,
      outcomes: {
        great: { text: "你无声放出两尺船索，既留绊扣，也让小舟脱离死结。", effects: [{ type: "condition", key: "ropeArmed", value: true }, { type: "condition", key: "escapeRoute", value: true }, { type: "environment", environmentId: "loose_rope", state: "armed" }] },
        success: { text: "松索藏进水痕，下一名经过系舟桩的包抄者会被绊住。", effects: [{ type: "condition", key: "ropeArmed", value: true }, { type: "environment", environmentId: "loose_rope", state: "armed" }] },
        costly: { text: "绊扣留成了，绳响也惊动芦苇后的援手。", effects: [{ type: "condition", key: "ropeArmed", value: true }, { type: "environment", environmentId: "loose_rope", state: "armed" }, { type: "alert", amount: 2 }] },
        failure: { text: "船索在木桩上打滑，芦苇后的弩手先听见了声音。", effects: [{ type: "alert", amount: 2 }] },
      },
    },
    {
      id: "cut_skiff_loose",
      stageIds: ["riverbank"],
      icon: "escape",
      verb: "开路",
      objectId: "loose_rope",
      objectName: "岸边小舟",
      intent: "借势",
      title: "割断船索，放舟入浅水",
      description: "把固定小舟变成护人或独自撤离的明确退路。",
      attribute: "agility",
      difficulty: 3,
      energyCost: 2,
      ignoreStage: true,
      successPreview: "开放护人撤离与水路脱身",
      riskPreview: "失手会把自己暴露在弩线中",
      focusIds: ["loose_rope", "position:skiff", "shallow_water_env"],
      recommendationWeight: 17,
      advantages: (state, context) => hasLearnedSkill(context, "fish_leap_art") ? "鱼跃龙门诀熟悉放舟水势" : null,
      outcomes: {
        great: { text: "船索断开，小舟顺水贴到脚边，弩手还没看清你的用意。", effects: [{ type: "condition", key: "escapeRoute", value: true }, { type: "environment", environmentId: "loose_rope", state: "cut" }] },
        success: { text: "小舟脱桩进入浅水，撤离路线已经打开。", effects: [{ type: "condition", key: "escapeRoute", value: true }, { type: "environment", environmentId: "loose_rope", state: "cut" }] },
        costly: { text: "小舟放开了，弩箭也在你腿侧擦出血线。", effects: [{ type: "condition", key: "escapeRoute", value: true }, { type: "damage", targetId: "player", amount: 2 }, { type: "wound", targetId: "player", wound: { id: "skiff_bolt_leg", type: "pierce", bodyPart: "leg", severity: 1, tags: ["limits_travel"] } }, { type: "environment", environmentId: "loose_rope", state: "cut" }] },
        failure: { text: "船索没断，弩线却已经锁住小舟。", effects: [{ type: "alert", amount: 1 }] },
      },
    },
    {
      id: "use_antidote",
      stageIds: ["riverbank"],
      icon: "healing",
      verb: "服药",
      objectId: "antidote",
      objectName: "解毒散",
      intent: "疗伤",
      title: "吞下随身解毒散",
      description: "解除蛇毒持续伤害，不移除已经形成的部位伤势。",
      energyCost: 1,
      successPreview: "立即移除蛇毒",
      riskPreview: "消耗唯一一份解毒散",
      focusIds: ["status:snake_venom"],
      recommendationWeight: 45,
      availableWhen: (state) => playerHasStatus(state, "snake_venom") && Number(state.setup.items.antidote || 0) > 0 ? true : "没有需要处理的蛇毒，或解毒散已经用尽。",
      outcomes: { success: { text: "苦涩药粉压住蛇毒，持续侵蚀终于停下。", effects: [{ type: "removeStatus", targetId: "player", statusId: "snake_venom" }, { type: "item", itemId: "antidote", amount: -1 }] } },
    },
    {
      id: "bind_fatal_wound",
      stageIds: ["riverbank"],
      icon: "healing",
      verb: "包扎",
      objectId: "fatal_wound",
      objectName: "致命伤",
      intent: "疗伤",
      title: "撕衣压住致命伤",
      description: "解除下一轮死亡倒计时，但伤势本身仍会留到战后。",
      energyCost: 2,
      successPreview: "稳定全部致命伤",
      riskPreview: "耗费两点气机且不会恢复气血",
      focusIds: ["status:fatal_wound"],
      recommendationWeight: 60,
      availableWhen: (state) => state.wounds.some((wound) => Number(wound.severity || 0) >= 3 && !wound.stabilized) ? true : "当前没有尚未止血的致命伤。",
      outcomes: { success: { text: "布带压紧血线，致命伤不再继续倒数，但仍需战后求医。", effects: [{ type: "stabilizeWounds" }] } },
    },
    {
      id: "subdue_wang",
      stageIds: ["riverbank"],
      icon: "needles",
      verb: "封穴",
      objectId: "wang_zhuo",
      objectName: "王卓肩井与左腕",
      intent: "制伏",
      title: "春风针·封链留命",
      description: "截断锁链换劲并保留活口，让官面暗线仍有口供。",
      attribute: "insight",
      skillId: "spring_rain_needles",
      skillName: "春风化雨针",
      masteryRequired: "skilled",
      difficulty: 5,
      energyCost: 3,
      targetId: "wang_zhuo",
      directCombat: true,
      requiresHealthy: true,
      successPreview: "王卓气血压至1并留下完整活口",
      riskPreview: "必须先看破左腕并削弱王卓",
      focusIds: ["target:wang_zhuo"],
      recommendationWeight: 55,
      availableWhen: (state) => {
        if (!state.battle.conditions.weakPoint) return "必须先看破锁链刀左腕换劲。";
        return enemy(state, "wang_zhuo").current <= 9 ? true : "王卓气血仍足，封穴窗口尚未形成。";
      },
      advantages: directAdvantages,
      disadvantages: directDisadvantages,
      resolve: subdueOutcome,
    },
    {
      id: "kill_wang",
      stageIds: ["riverbank"],
      icon: "blade",
      verb: "取命",
      objectId: "wang_zhuo",
      objectName: "王卓咽喉",
      intent: "击杀",
      title: "春风针·断喉",
      description: "以杀针直接结束锁链威胁，放弃活口并提高毒蛇帮警戒。",
      attribute: "insight",
      skillId: "spring_rain_needles",
      skillName: "春风化雨针",
      difficulty: 4,
      energyCost: 3,
      targetId: "wang_zhuo",
      directCombat: true,
      requiresHealthy: true,
      successPreview: "王卓气血归零，留下尸身与铜牌",
      riskPreview: "燕惊鸿不赞同在仍可生擒时取命",
      focusIds: ["target:wang_zhuo"],
      recommendationWeight: 42,
      availableWhen: (state) => enemy(state, "wang_zhuo").current <= 9 ? true : "王卓气血仍足，杀针无法一击收束。",
      advantages: directAdvantages,
      disadvantages: directDisadvantages,
      resolve: killOutcome,
    },
    {
      id: "release_wang",
      stageIds: ["riverbank"],
      icon: "shadow",
      verb: "放线",
      objectId: "wang_zhuo",
      objectName: "王卓逃路",
      intent: "追踪",
      title: "故意放开柳根一线",
      description: "让王卓带伤逃走，跟踪蛇纹铜牌通往的死信箱。",
      attribute: "insight",
      difficulty: 4,
      energyCost: 3,
      ignoreStage: true,
      successPreview: "取得逃踪与毒蛇帮死信箱联系人",
      riskPreview: "放走首领会提高后续警戒",
      focusIds: ["target:wang_zhuo", "willow_root"],
      recommendationWeight: 38,
      availableWhen: (state) => state.battle.conditions.weakPoint && enemy(state, "wang_zhuo").current <= 10 ? true : "必须先看破王卓并把他逼到带伤退路。",
      advantages: (state) => state.battle.ledger.evidence.includes("tail_route_mark") ? "柳巷已经留下反跟踪标记" : null,
      resolve: releaseOutcome,
    },
    {
      id: "escort_retreat",
      stageIds: ["riverbank"],
      icon: "ally",
      verb: "护送",
      objectId: "yan_jinghong",
      objectName: "燕惊鸿与小舟",
      intent: "护人",
      title: "送燕惊鸿上舟后踏水撤离",
      description: "优先保住同伴与官面线索，放弃当场处置王卓。",
      attribute: "agility",
      skillId: "fish_leap_art",
      skillName: "鱼跃龙门诀",
      difficulty: 4,
      energyCost: 3,
      ignoreStage: true,
      successPreview: "同伴安全撤离并提高信任与救命债",
      riskPreview: "必须先放开小舟或踏入浅水",
      focusIds: ["ally:yan_jinghong", "loose_rope", "shallow_water_env"],
      recommendationWeight: 50,
      availableWhen: (state) => state.battle.conditions.escapeRoute || state.positions.player === "shallow_water" ? true : "必须先放开小舟或踏入浅水。",
      advantages: (state) => state.battle.conditions.allyGuard || state.battle.conditions.allySafe ? "燕惊鸿已经脱离近身威胁" : null,
      disadvantages: directDisadvantages,
      resolve: retreatOutcome,
    },
    {
      id: "flee_east_lake",
      stageIds: ["riverbank"],
      icon: "escape",
      verb: "脱身",
      objectId: "shallow_water",
      objectName: "东湖水路",
      intent: "脱身",
      title: "独自翻入浅水",
      description: "放弃首领、证据与同伴结果，只保住自己离开河岸。",
      attribute: "agility",
      skillId: "fish_leap_art",
      skillName: "鱼跃龙门诀",
      difficulty: 3,
      energyCost: 3,
      ignoreStage: true,
      successPreview: "立即脱离战斗",
      riskPreview: "燕惊鸿未安全时会永久失去大量信任",
      focusIds: ["shallow_water_env", "position:shallow_water", "position:skiff"],
      recommendationWeight: 20,
      availableWhen: (state) => state.battle.conditions.escapeRoute || ["shallow_water", "skiff"].includes(state.positions.player) ? true : "必须先抵达浅水或放开小舟。",
      advantages: (state, context) => hasLearnedSkill(context, "fish_leap_art") ? "鱼跃龙门诀熟悉水路" : null,
      resolve: abandonOutcome,
    },
  ],
  createFortuneOpportunity: (setup) => Number(setup.attributes?.fortune || 0) >= 1,
  nextStage: (state, trigger) => {
    if (state.battle.stageId !== "willow_tail") return null;
    const ready = Number(state.battle.conditions.identityProgress || 0) >= 2 && Boolean(state.battle.conditions.allySafe);
    const forced = trigger.type === "roundEnd" && Number(state.turn.stageRound || 1) >= 3;
    if (!ready && !forced) return null;
    return {
      stageId: "riverbank",
      text: ready
        ? "身份与同伴路线都已落定，王卓索性在东湖岸边抖开锁链刀。"
        : "尾随拖得太久，王卓主动封住东湖退路，燕惊鸿也被迫卷入河岸截杀。",
    };
  },
  getEnemyIntents: (state, context, helpers) => state.battle.stageId === "willow_tail" ? wangTailIntents(state, helpers) : wangRiverIntents(state, helpers),
  buildConsequences: (state, outcome, base) => ({
    ...base,
    wangZhuo: outcome.outcome === "subdued" ? "captive" : outcome.outcome === "killed" ? "corpse" : outcome.outcome === "released" ? "tracked" : "escaped",
    yanJinghong: state.battle.conditions.allySafe || outcome.outcome === "protected_escape" ? "safe" : outcome.outcome === "escaped" ? "abandoned" : "engaged",
    poison: playerHasStatus(state, "snake_venom") ? "active" : "clear",
    fatalWoundsStabilized: state.wounds.filter((wound) => Number(wound.severity || 0) >= 3).every((wound) => wound.stabilized),
  }),
});

export const COMBAT_ENCOUNTER_CATALOG = Object.freeze([
  {
    id: "rain_ambush",
    title: "东门伏杀",
    location: "金陵雨巷",
    description: "三点气机、六节点空间与三名敌人的普通遭遇。",
  },
  {
    id: WANG_ZHUO_ENCOUNTER.id,
    title: "东湖截命",
    location: "柳巷至东湖",
    description: "同伴、多敌、聚气越阶、毒伤、机关与两阶段首领战。",
  },
]);
