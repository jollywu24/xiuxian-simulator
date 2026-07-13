export const WORLD_FACTS = [
  {
    id: "dynasty",
    name: "大曜天下",
    summary: "朝廷守城池、驿路与律法，州府之外的山川水泽，却未必由官印说了算。",
  },
  {
    id: "jianghu",
    name: "江湖秩序",
    summary: "山门传武，世家守土，帮会控制水陆生计。普通人依附其中，武者也要为一碗饭和一本秘籍低头。",
  },
  {
    id: "martial",
    name: "高武之世",
    summary: "武者从锻体起步；强者可踏水越城，宗师足以改变一州格局。可你此刻连第一道门槛都没迈过。",
  },
];

export const MARTIAL_STAGES = [
  { id: "mortal", name: "未入门", description: "尚未完成锻体，气血与寻常少年无异。" },
  { id: "body", name: "锻体", description: "熬炼筋骨气血，能够正式修习招式。" },
  { id: "breath", name: "聚气", description: "内息成流，武学开始超出凡俗技艺。" },
  { id: "meridian", name: "通脉", description: "气走周天，可隔空发劲、踏水疾行。" },
  { id: "master", name: "宗师", description: "精神与天地相合，一人足以镇住一方势力。" },
];

export const ATTRIBUTES = [
  { id: "constitution", name: "根骨", description: "气血与武学承载之基。" },
  { id: "insight", name: "悟性", description: "参悟武学、突破瓶颈的灵慧。" },
  { id: "agility", name: "身法", description: "脚力、腾挪与轻功根基。" },
  { id: "strength", name: "力道", description: "体力、负重与外功威力。" },
  { id: "fortune", name: "福缘", description: "宝物、人物与奇遇分支的运势。" },
];

export const BACKGROUNDS = [
  {
    id: "clan",
    name: "世家旁支",
    summary: "读过拳谱，也认得城中规矩；家族给你的每一分照拂，日后都要偿还。",
    gain: "一册家传拳谱 · 二十两银",
    cost: "旧债：宗族差事",
  },
  {
    id: "common",
    name: "寒门子弟",
    summary: "没有显赫来处，靠眼力、口才和一双脚在市井中寻找机会。",
    gain: "市井见闻 · 一两银",
    cost: "没有庇护，也没有旧债",
  },
  {
    id: "mystery",
    name: "身世成谜",
    summary: "十六岁前的记忆支离破碎，怀里只有半块玉佩与一封难辨真假的血书。",
    gain: "家传玉佩 · 金龙会线索",
    cost: "暗债：有人在追查血书",
  },
  {
    id: "street",
    name: "江湖遗孤",
    summary: "幼时家破人亡，熟悉饥饿、恶犬和三教九流，却不知仇家姓名。",
    gain: "生存之道 · 三份干粮",
    cost: "部分名门初见时心存戒备",
  },
];

export const VOWS = [
  { id: "answer", name: "寻一个答案", title: "执念者", effect: "追查亲故与身世时，更容易锁定关键线索。" },
  { id: "path", name: "证一条武道", title: "求道者", effect: "参悟武学时更专注，也更容易获得前辈指点。" },
  { id: "guard", name: "守一方安宁", title: "守护者", effect: "保护他人时，更容易获得信任与临时援助。" },
  { id: "free", name: "求一世逍遥", title: "逍遥者", effect: "脱离势力羁绊时，承受的关系损失降低。" },
  { id: "rule", name: "掌一方权柄", title: "野心者", effect: "经营势力时，更容易看见利益与人心的节点。" },
];

export const DESTINY = {
  id: "defy_fate",
  name: "逆天改命",
  rank: "唯一命格",
  effect: "可随时重新分配自身五维，并看见场景、人物身上的奇遇及触发条件。",
  cost: "五维基础属性全部归零；你只能重新调配装备与武学已经赋予的力量。",
};

export const LIFE_RULE = {
  name: "双灯照命",
  lives: 2,
  effect: "命灯熄灭一盏，可带着死前记忆回到最近的因果节点；两灯皆灭，此生终结。",
};

export const TEMPLE_ENCOUNTERS = [
  {
    id: "traveler_relic",
    name: "旅人遗物",
    rank: "凡",
    condition: "篝火只余一刻钟时，以供桌旧布添火",
    reward: "金陵东郊残图、干粮、潜能五十",
    result: "你等到火光将灭，扯下供桌旧布。夹层里掉出一张残图和一块干粮，庙外原本漆黑的道路终于有了去向。",
  },
  {
    id: "shen_promise",
    name: "沈氏承诺",
    rank: "凡",
    condition: "连续敲击东北角墙体一千次",
    reward: "沈字铜钱、沈家门路、潜能五十",
    result: "墙灰剥落后，一枚刻着‘沈’字的旧铜钱从砖缝里滚出。它足以让金陵沈家给一个陌生人开门。",
  },
  {
    id: "mysterious_offering",
    name: "神秘贡品",
    rank: "地",
    condition: "晴日初一或十五，辰时，根骨不高于二，再回破庙",
    reward: "未知",
    result: "时辰未到。那几枚山桃背后的香火因果仍藏在黑暗里。",
  },
];

export const LADY_STAGES = {
  first: [
    {
      id: "retort",
      title: "反唇相讥",
      description: "指出她把旁人的过错迁怒于你。",
      forecast: "人蠢话多 · 聚气境以下会被一掌打死",
      outcome: "death",
    },
    {
      id: "silent",
      title: "沉默避让",
      description: "不接她的话，也不靠近篝火另一侧。",
      forecast: "我是路过的 · 天亮后再无交集",
      outcome: "depart",
    },
    {
      id: "deny_beggar",
      title: "只说：我不是乞丐",
      description: "不讨好，也不争辩她是否有资格评断你。",
      forecast: "因爱成恨 · 进入后续奇遇",
      outcome: "pressure",
    },
  ],
  pressure: [
    {
      id: "defy",
      title: "宁死不屈",
      description: "再次否认她对你的贬斥。",
      forecast: "勇气可嘉 · 聚气境以下死亡",
      outcome: "death",
    },
    {
      id: "yield",
      title: "顺着她的话活下来",
      description: "先承认自己是乞丐，观察她真正恨的是谁。",
      forecast: "因爱成恨 · 她会说出更多",
      outcome: "test",
    },
  ],
  test: [
    {
      id: "exploit",
      title: "顺势利用她的失意",
      description: "接受她提出的亲近与庇护，把这一夜当成捷径。",
      forecast: "条件不足 · 根骨不够会招致杀身之祸",
      outcome: "death",
    },
    {
      id: "refuse",
      title: "拒绝成为她报复别人的工具",
      description: "告诉她：今夜的决定，不该由另一个人的背叛替她作出。",
      forecast: "破庙夜话 · 可能建立真正关系",
      outcome: "talk",
    },
  ],
};

export const NIGHT_TALK = [
  {
    id: "plain",
    title: "直说这段感情不值得",
    description: "不粉饰她的选择，也不否定她曾付出的真心。",
    favor: 5,
    insight: "坦率",
  },
  {
    id: "blame",
    title: "指出变心之人才是过错一方",
    description: "让她停止用陆连山的选择惩罚自己。",
    favor: 7,
    insight: "宽慰",
  },
  {
    id: "sincere",
    title: "她不是愚蠢，只是曾经相信得太深",
    description: "承认她的痛苦来自被辜负的信任，而不是软弱。",
    favor: 10,
    insight: "知心",
  },
];

export const MIND_ART = {
  id: "carp_dragon_gate",
  name: "鱼跃龙门诀",
  rank: "黄级心法",
  source: "龙青鱼以江鲤行波图灌顶所授",
  traits: [
    "江鲤行波：水中身法提高，体力消耗降低，可长时间水下闭气。",
    "潜流于渊：修炼水意武学时，悟性与根骨判定提高。",
    "鱼跃龙门：战胜境界高于自身的敌人，可令心法晋升并可能提升品级。",
  ],
};

export const ROAD_TRIALS = {
  dive: {
    id: "dive",
    title: "潜入黑水涧底",
    condition: "已习得鱼跃龙门诀",
    result: "内息沿着江鲤行波图自行流转。你在冰冷涧水下找到一段沉没石阶，捞起刻有沈氏丹纹的铜匣残片。",
    reward: "潜能一百 · 沈家丹房线索",
    potential: 100,
  },
  detour: {
    id: "detour",
    title: "沿山道绕行",
    condition: "无",
    result: "你避开深水，花了半日翻过山脊。路更安全，却错过了涧底沉没多年的东西。",
    reward: "平安抵达金陵外道",
    potential: 0,
  },
};

export const SHEN_CLUES = [
  {
    id: "ledger",
    name: "药材簿上的新墨",
    location: "东墙账台",
    description: "今日入炉的宁神草被人改成了同色同形的伏脉藤，改字处没有丹师押印。",
    unlock: "可援引沈家双押规矩，要求封炉复验",
  },
  {
    id: "waterway",
    name: "冷水槽里的逆流",
    location: "丹炉背面",
    description: "冷却水没有流向院外，而是被新铜管引入回风槽；药烟会先灌满值守小室。",
    unlock: "鱼跃龙门诀可从水道潜入，改回风向",
  },
  {
    id: "door_lock",
    name: "门闩上的旧灰",
    location: "西侧小门",
    description: "门闩只能从外面落下，旧灰里有三道相同擦痕；这不是一次意外，而是重复过的手法。",
    unlock: "确认死局需要有人在开炉后从外面封门",
  },
];

export const SHEN_SOLUTIONS = {
  ignite: {
    id: "ignite",
    title: "照令点燃青炉",
    description: "不改变任何安排，亲自确认命格没有显示出来的最后一环。",
    outcome: "death",
    potential: 0,
    relation: null,
    forecast: "伏脉烟封住经脉，门闩从外落下，丹火随后吞没小室。",
  },
  procedure: {
    id: "procedure",
    title: "按沈家规矩封炉复验",
    description: "拿药材簿缺失的押印作证，要求两名丹师共同验药。",
    outcome: "safe",
    requirements: ["ledger"],
    potential: 200,
    relation: "可信差事人",
    result: "沈砚秋依家规封炉。伏脉藤被当众验出，外门执役带走了换药的药童，但幕后递药之人抢先断了线。",
    reward: "潜能二百 · 沈家信任 · 伏脉藤样本",
  },
  waterway: {
    id: "waterway",
    title: "潜入冷水暗渠改风",
    description: "借鱼跃龙门诀潜过狭窄水道，把毒烟导向无人灰池，再守住出口。",
    outcome: "counter",
    requirements: ["waterway"],
    requiresMindArt: true,
    potential: 300,
    relation: "丹房救火人",
    result: "午时毒烟尽数涌进灰池。前来堵死水口的换药人被你从水下拖住，丹房和两名药徒都保了下来。",
    reward: "潜能三百 · 丹房水道图 · 换药人口供",
  },
  bait: {
    id: "bait",
    title: "假装中毒，引换药人补刀",
    description: "按死前记忆伪造毒发，藏住呼吸，等对方进门回收毒证。",
    outcome: "takeover",
    requiresDeathMemory: true,
    requiresMindArt: true,
    potential: 450,
    relation: "沈家救命恩人",
    result: "你让青炉照常冒烟，倒在门后。换药人木七果然折返搜走药包，被你借水息从死角制住；他供出丹房内还有一名接应者。",
    reward: "潜能四百五十 · 木七口供 · 内应名单残角",
  },
};

export const SHEN_REWARDS = {
  five_animals: {
    id: "five_animals",
    name: "《五禽桩》",
    type: "基础锻体法",
    description: "以虎、鹿、熊、猿、鸟五势熬炼筋骨，立刻踏入锻体第一重。",
    cost: 300,
    stage: "body",
    effect: "潜能 -300 · 境界提升至锻体一重",
  },
  marrow_powder: {
    id: "marrow_powder",
    name: "洗髓散",
    type: "沈家秘药",
    description: "不急于突破，以药力补足逆天改命留下的先天亏空。",
    cost: 0,
    attribute: "constitution",
    effect: "根骨永久 +1",
  },
  herb_token: {
    id: "herb_token",
    name: "青木药牌",
    type: "沈家门路",
    description: "保留自由身，却能查阅外院药簿并接取沈家药材差事。",
    cost: 0,
    potential: 100,
    effect: "潜能 +100 · 沈家药库入口",
  },
};

export function getBackground(id) {
  return BACKGROUNDS.find((item) => item.id === id) || null;
}

export function getVow(id) {
  return VOWS.find((item) => item.id === id) || null;
}

export function allocateJadeBonus(focus = "strength") {
  const values = Object.fromEntries(ATTRIBUTES.map((attribute) => [attribute.id, 0]));
  if (focus === "strength") {
    values.strength = 3;
  } else if (focus === "balanced") {
    values.constitution = 1;
    values.agility = 1;
    values.strength = 1;
  } else if (focus === "fortune") {
    values.fortune = 3;
  }
  return values;
}

export function templeTaskCost(taskId, allocation) {
  if (taskId === "traveler_relic") return { minutes: 90, peaches: 0 };
  if (taskId === "shen_promise") {
    const strength = allocation?.strength || 0;
    return strength >= 3
      ? { minutes: 110, peaches: 0 }
      : strength >= 1
        ? { minutes: 180, peaches: 1 }
        : { minutes: 240, peaches: 2 };
  }
  return null;
}

export function getTempleEncounter(id) {
  return TEMPLE_ENCOUNTERS.find((item) => item.id === id) || null;
}

export function resolveLadyChoice(stage, choiceId) {
  const choice = LADY_STAGES[stage]?.find((item) => item.id === choiceId);
  return choice ? { ...choice } : null;
}

export function resolveNightTalk(choiceId, priorFavor = 20) {
  const choice = NIGHT_TALK.find((item) => item.id === choiceId);
  if (!choice) return null;
  const favor = priorFavor + choice.favor + 20;
  return {
    ...choice,
    totalFavor: favor,
    relation: favor >= 50 ? "莫逆之交" : favor >= 40 ? "红颜知己" : "泛泛之交",
    reward: favor >= 40 ? MIND_ART : null,
  };
}

export function resolveRoadTrial(choiceId, hasMindArt = false) {
  const choice = ROAD_TRIALS[choiceId];
  if (!choice || (choiceId === "dive" && !hasMindArt)) return null;
  return { ...choice };
}

export function getShenClue(id) {
  const clue = SHEN_CLUES.find((item) => item.id === id);
  return clue ? { ...clue } : null;
}

export function resolveShenSolution(choiceId, context = {}) {
  const solution = SHEN_SOLUTIONS[choiceId];
  if (!solution) return null;
  const clues = new Set(context.clues || []);
  const missing = (solution.requirements || []).filter((requirement) => !clues.has(requirement));
  if (solution.requiresMindArt && !context.hasMindArt) missing.push("mind_art");
  if (solution.requiresDeathMemory && !context.deathMemory) missing.push("death_memory");
  if (choiceId === "ignite" && Number(context.lives || 0) <= 1) missing.push("last_lamp");
  return { ...solution, missing, available: missing.length === 0 };
}

export function getShenReward(id, potential = 0) {
  const reward = SHEN_REWARDS[id];
  if (!reward) return null;
  return { ...reward, available: potential >= reward.cost, missingPotential: Math.max(0, reward.cost - potential) };
}
