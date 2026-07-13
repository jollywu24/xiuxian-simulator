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
    title: "顺紫金河游往沈家",
    condition: "已习得鱼跃龙门诀",
    result: "你从钟山脚下入水，借鱼跃龙门诀顺流而下。水中身法远胜陆路，体力将尽时，沈家大宅终于出现在东湖岸边。",
    reward: "缩短路程 · 在饥饿前抵达沈家",
    potential: 0,
  },
  detour: {
    id: "detour",
    title: "沿官道步行",
    condition: "无",
    result: "你的脚力太弱，剩余干粮不足以支撑漫长官道。你只能在路边休息，暂时错过沈家开门的时辰。",
    reward: "安全 · 暂时无法进入沈家路线",
    potential: 0,
  },
};

export const SHEN_JOBS = [
  {
    id: "guard",
    name: "外院护卫",
    requirements: { strength: 5, agility: 4 },
    requiresSkill: true,
    pay: "每月二两 · 可学沈家基础武功",
  },
  {
    id: "laborer",
    name: "挑水劈柴杂役",
    requirements: { strength: 4, constitution: 3 },
    pay: "每月五钱 · 一日三餐",
  },
  {
    id: "runner",
    name: "跑腿小厮",
    requirements: { agility: 3 },
    pay: "每月三钱 · 一日两餐",
  },
  {
    id: "clerk",
    name: "账房学徒",
    requirements: { insight: 4 },
    requiresArithmetic: true,
    pay: "每月八钱 · 包吃住",
  },
];

export const CAO_ENCOUNTERS = [
  {
    id: "traitor",
    rank: "地级",
    name: "药王叛徒",
    condition: "将曹青真实身份庞不凡的踪迹送往药王谷",
    result: "可换取药王谷重赏，但消息泄露后，曹青与你不死不休。",
  },
  {
    id: "blood_scripture",
    rank: "地级",
    name: "血灵丹经",
    condition: "帮助曹青炼成血丹",
    result: "提高曹青好感，并有机会接触以人血入药的血灵丹术。",
  },
  {
    id: "poison_legacy",
    rank: "阶段奇遇",
    name: "毒师传承",
    condition: "曹青好感达到二十、四十、六十与八十",
    result: "依次获得医药辨认、炼丹医术、武功毒术与共同钻研丹经的机会。",
  },
];

export const BLOOD_CHOICES = {
  fight: {
    id: "fight",
    title: "抄起菜刀反抗",
    description: "趁曹青靠近时刺向他。",
    outcome: "death",
    forecast: "未入后天境，无法伤到曹青，反被一掌毙命。",
  },
  comply: {
    id: "comply",
    title: "割腕取一碗血",
    description: "忍下这一刀，先保住性命，再找曹青愿意留下你的理由。",
    outcome: "observe",
    forecast: "体力永久受损 · 获得旁观炼丹的机会",
  },
  refuse: {
    id: "refuse",
    title: "拒绝献血",
    description: "没有武功、身份或援手，却当面违逆曹青。",
    outcome: "death",
    forecast: "曹青不会留下失去用途的药童。",
  },
};

export const OBSERVATION_CHOICES = {
  rest: {
    id: "rest",
    title: "回偏房休息",
    outcome: "neglected",
    result: "曹青不再关注你，只把你当作每日取血的普通药童。",
  },
  watch: {
    id: "watch",
    title: "忍住虚弱继续观看",
    outcome: "exam",
    result: "你把投药顺序、火候变化和用水比例牢牢记下。",
  },
};

export const CAO_QUESTIONS = {
  fire: {
    id: "fire",
    prompt: "这一炉丹，火候如何变化？",
    correct: "strong_slow_strong",
    requiredInsight: 3,
  },
  ingredients: {
    id: "ingredients",
    prompt: "药材与水的先后比例如何？",
    correct: "recite_order",
    requiredInsight: 3,
  },
  motive: {
    id: "motive",
    prompt: "你是真心想学岐黄之术？",
    correct: "survive",
  },
};

export const QINGQING_BOOK = {
  id: "qingqing_book",
  name: "《青青册》",
  type: "医术与采集入门书",
  requirement: 3,
  studyCost: 85,
  effect: "医术入门 · 采集入门 · 曹青好感可继续提升",
};

export const FIVE_ANIMAL_PLAY = {
  id: "five_animal_play",
  name: "《五禽戏》",
  type: "基础健体功",
  description: "曹青传下的强身之术，形似虎、鹿、熊、猿、鸟；没有杀伤力，需要继续修炼才能踏入炼体。",
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
  } else if (focus === "insight") {
    values.insight = 3;
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

export function resolveShenJob(id, attributes = {}, capabilities = {}) {
  const job = SHEN_JOBS.find((item) => item.id === id);
  if (!job) return null;
  const missing = Object.entries(job.requirements).filter(([attribute, required]) => Number(attributes[attribute] || 0) < required).map(([attribute]) => attribute);
  if (job.requiresSkill && !capabilities.hasBasicSkill) missing.push("basic_skill");
  if (job.requiresArithmetic && !capabilities.hasArithmetic) missing.push("arithmetic");
  return { ...job, missing, available: missing.length === 0 };
}

export function getCaoEncounter(id) {
  const encounter = CAO_ENCOUNTERS.find((item) => item.id === id);
  return encounter ? { ...encounter } : null;
}

export function resolveBloodChoice(id, lives = LIFE_RULE.lives) {
  const choice = BLOOD_CHOICES[id];
  if (!choice) return null;
  const available = choice.outcome !== "death" || lives > 1;
  return { ...choice, available };
}

export function resolveObservationChoice(id, attributes = {}, hasMindArt = false) {
  const choice = OBSERVATION_CHOICES[id];
  if (!choice) return null;
  const effectiveInsight = Number(attributes.insight || 0) + (hasMindArt ? 2 : 0);
  return { ...choice, effectiveInsight };
}

export function resolveCaoAnswer(questionId, answerId, effectiveInsight = 0) {
  const question = CAO_QUESTIONS[questionId];
  if (!question) return null;
  const correct = answerId === question.correct;
  const meetsInsight = Number(effectiveInsight) >= Number(question.requiredInsight || 0);
  const available = correct ? meetsInsight : true;
  const outcome = !correct ? (answerId === "forget" ? "neglected" : "death") : available ? "continue" : "locked";
  return { questionId, answerId, correct, available, outcome };
}

export function canStudyQingQing(insight = 0, potential = 0) {
  const missingInsight = Math.max(0, QINGQING_BOOK.requirement - Number(insight || 0));
  const missingPotential = Math.max(0, QINGQING_BOOK.studyCost - Number(potential || 0));
  return { available: missingInsight === 0 && missingPotential === 0, missingInsight, missingPotential };
}
