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
    name: "世家少年",
    summary: "有武学、有银钱，也要不断完成家族交付的差事。",
    gain: "随机黄级武学 · 二十两银",
    cost: "羁绊：家族期望",
  },
  {
    id: "common",
    name: "寒门子弟",
    summary: "没有显赫来处，靠买卖、交涉或偷窃在市井立足。",
    gain: "一项市井能力 · 一两银",
    cost: "没有庇护，也没有旧债",
  },
  {
    id: "mystery",
    name: "身世成谜",
    summary: "记忆残缺，怀里只有半块玉佩与一封难辨的血书。",
    gain: "家传玉佩 · 金龙会邀请线索",
    cost: "黑衣人会循线追杀",
  },
  {
    id: "street",
    name: "流落街头",
    summary: "幼时家破人亡，熟悉饥饿、恶犬和三教九流。",
    gain: "命格：生存之道",
    cost: "部分名门初始关系降低",
  },
];

export const VOWS = [
  { id: "answer", name: "寻一个答案", title: "执念者", effect: "追查亲故与身世时更容易锁定关键线索。" },
  { id: "path", name: "证一条大道", title: "求道者", effect: "修行效率提高，更容易获得隐世高手青睐。" },
  { id: "guard", name: "守一方安宁", title: "守护者", effect: "保护他人时更容易获得信任与临时援助。" },
  { id: "free", name: "求一世逍遥", title: "逍遥者", effect: "脱离势力羁绊时，承受的声望损失降低。" },
  { id: "rule", name: "掌一朝天下", title: "野心者", effect: "经营势力与调动他人时，更快看见利益节点。" },
];

export const DESTINY = {
  id: "defy_fate",
  name: "逆天改命",
  rank: "专属",
  effect: "可随时重新分配自身五维，并看见场景、人物身上的全部奇遇及触发条件。",
  cost: "五维基础属性全部归零；一旦暴露，任何势力都会把你当作寻找奇遇的工具。",
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
    reward: "沈字铜钱、沈家好感、潜能五十",
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
      forecast: "人蠢话多 · 先天以下会被一掌打死",
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
      forecast: "勇气可嘉 · 先天以下死亡",
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

export function bureauConsequence(choiceId) {
  const outcomes = {
    conceal: {
      id: "conceal",
      title: "只登记鱼跃龙门诀",
      effect: "武道局确认你已经获得现实同步能力，却不知道你能看见全部奇遇条件。",
      risk: "林毅会继续调查你为何在第一夜便获得心法。",
    },
    partial: {
      id: "partial",
      title: "承认能看见部分奇遇征兆",
      effect: "于可心提供一次官方保护与基础情报交换资格。",
      risk: "你被列入需要持续接触的高潜力新人名单。",
    },
    reveal: {
      id: "reveal",
      title: "公开逆天改命",
      effect: "武道局愿意立刻调集资深玩家保护你的第二条命。",
      risk: "从此每次行动都可能被要求优先为他人寻找奇遇。",
    },
  };
  return outcomes[choiceId] ? { ...outcomes[choiceId] } : null;
}
