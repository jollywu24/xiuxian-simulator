export const RARITY = {
  gray: { label: "灰", rank: 0 },
  white: { label: "白", rank: 1 },
  blue: { label: "蓝", rank: 2 },
  purple: { label: "紫", rank: 3 },
  gold: { label: "金", rank: 4 },
};

export const ORIGINS = [
  {
    id: "herbalist",
    name: "药农之子",
    icon: "草",
    description: "认得山野草木，也知道穷人如何看病。",
    tag: "毒理",
  },
  {
    id: "hunter",
    name: "流亡猎户",
    icon: "弓",
    description: "熟悉足迹、风向与伏击，却不轻信门派规矩。",
    tag: "追踪",
  },
  {
    id: "scholar",
    name: "落第书生",
    icon: "卷",
    description: "善读旧文、辨字迹，知道一句话如何取信于人。",
    tag: "文书",
  },
  {
    id: "caravan",
    name: "商队遗孤",
    icon: "秤",
    description: "见过各地口音与暗号，凡事先问代价。",
    tag: "交涉",
  },
];

export const APPEARANCES = [
  { id: "pine", name: "松烟", accent: "#637c70", mark: "山" },
  { id: "cinnabar", name: "朱砂", accent: "#a44b3f", mark: "火" },
  { id: "moon", name: "月白", accent: "#728c9c", mark: "月" },
  { id: "amber", name: "琥珀", accent: "#9a7442", mark: "石" },
];

export const OPENING_TRAITS = [
  {
    id: "ember_root",
    group: "root",
    volatility: "stable",
    name: "烬火灵根",
    rarity: "blue",
    effect: "火属功法领悟更快，并能感知异常热源。",
    cost: "寒毒伤势恢复更慢。",
    tags: ["灵根", "感知"],
    trigger: "灯焰掠过井口时忽然泛青——那里藏着不属于春夜的冷意。",
  },
  {
    id: "river_root",
    group: "root",
    volatility: "stable",
    name: "澄木灵根",
    rarity: "blue",
    effect: "疗伤与草木术法更稳定，可感知水脉变化。",
    cost: "爆发术法威力略低。",
    tags: ["灵根", "水脉"],
    trigger: "你听见井下水脉有一瞬断流，像有人把另一桶水接进了命里。",
  },
  {
    id: "iron_bones",
    group: "root",
    volatility: "stable",
    name: "铁骨天成",
    rarity: "blue",
    effect: "重伤阈值提高，强行行动时少积累一层伤势。",
    cost: "神识类修行更慢。",
    tags: ["体质", "求生"],
    trigger: "毒意压住四肢时，你的筋骨仍替你争回了半口气。",
  },
  {
    id: "old_wound",
    group: "root",
    volatility: "risky",
    name: "旧伤复发",
    rarity: "gray",
    effect: "解锁医馆、旧军营与追查身世的特殊路线。",
    cost: "伤势上限降低一格。",
    tags: ["缺陷", "医术"],
    trigger: "旧伤在毒气靠近前先一步抽痛——它第一次不像拖累，倒像警钟。",
  },
  {
    id: "yin_sense",
    group: "root",
    volatility: "risky",
    name: "阴脉灵觉",
    rarity: "purple",
    effect: "可看见残魂与阵法阴面，夜间调查更强。",
    cost: "每次接触死气都会积累心蚀。",
    tags: ["灵视", "心蚀"],
    trigger: "井栏后浮着一道刚散去的阴影，手里还提着换水用的木桶。",
  },
  {
    id: "broken_meridian",
    group: "root",
    volatility: "risky",
    name: "残脉藏锋",
    rarity: "purple",
    effect: "外人难以判断你的真实修为，濒危时术法消耗降低。",
    cost: "每次突破都需要额外准备。",
    tags: ["隐匿", "突破"],
    trigger: "蒙面人探错了你的气息，你因此多看清了他腰间的一枚赤纹牌。",
  },
  {
    id: "herbal_tongue",
    group: "talent",
    volatility: "stable",
    name: "百草舌",
    rarity: "blue",
    effect: "可从气味与药渣识别常见药毒。",
    cost: "首次接触未知毒物时发作更快。",
    tags: ["毒理", "调查"],
    trigger: "水里有乌舌草的苦甜味；这种药只会让人失去行动，不会直接致死。",
  },
  {
    id: "keen_eye",
    group: "talent",
    volatility: "stable",
    name: "见微知著",
    rarity: "blue",
    effect: "首次调查地点时额外显示一项环境细节。",
    cost: "长时间调查更易积累疲惫。",
    tags: ["观察", "调查"],
    trigger: "井沿的新水痕在酉时刻线之上，换水的人来得很晚。",
  },
  {
    id: "warm_words",
    group: "talent",
    volatility: "stable",
    name: "善结人缘",
    rarity: "white",
    effect: "初次交谈更容易获得一条私人信息。",
    cost: "拒绝他人请求时关系损失更大。",
    tags: ["社交", "关系"],
    trigger: "闻青禾犹豫片刻，还是告诉你：夜班杂役今早忽然换了人。",
  },
  {
    id: "perfect_memory",
    group: "talent",
    volatility: "risky",
    name: "过目不忘",
    rarity: "purple",
    effect: "首次见到的文书会自动记录关键字。",
    cost: "心神创伤更难随模拟结束淡去。",
    tags: ["记忆", "文书"],
    trigger: "你认出蒙面人手中名册的纸纹，正是内门议事堂专用的青檀纸。",
  },
  {
    id: "truth_compulsion",
    group: "talent",
    volatility: "risky",
    name: "闻伪知谎",
    rarity: "purple",
    effect: "能察觉对方刻意隐藏的半句话。",
    cost: "直接说谎时会积累心神压力。",
    tags: ["审讯", "交涉"],
    trigger: "杂役说‘水一直没人碰过’，但他唯独避开了酉时之后。",
  },
  {
    id: "reckless_insight",
    group: "talent",
    volatility: "risky",
    name: "险中求悟",
    rarity: "gold",
    effect: "首次濒死会领悟一项与死因有关的术法。",
    cost: "恢复类效果降低，初始天妒提高。",
    tags: ["悟性", "天妒"],
    trigger: "毒气逆冲经脉的一刻，你反而看懂了如何将它压回丹田。",
  },
  {
    id: "lone_star",
    group: "fate",
    volatility: "stable",
    name: "命犯孤辰",
    rarity: "purple",
    effect: "独自行动时隐匿与悟性提高。",
    cost: "核心关系在化解因果前存在上限。",
    tags: ["独行", "隐匿"],
    trigger: "你独自守到夜深，无人分神，终于听见墙外第二个人的脚步。",
  },
  {
    id: "fortunate_crisis",
    group: "fate",
    volatility: "stable",
    name: "逢凶见隙",
    rarity: "blue",
    effect: "每次模拟的首次致命危机额外出现一个撤退窗口。",
    cost: "选择撤退会失去当前场景的一项成果。",
    tags: ["求生", "机会"],
    trigger: "短刃落下前，你看见窗棂有一瞬空隙——足够逃，但不足以救下旁人。",
  },
  {
    id: "debt_of_kindness",
    group: "fate",
    volatility: "stable",
    name: "旧恩未偿",
    rarity: "white",
    effect: "开局有一名山下旧识愿意提供帮助。",
    cost: "对方会在第一年提出无法忽视的请求。",
    tags: ["关系", "山下"],
    trigger: "山下旧识送来的纸条提醒你：近日有人大量收购乌舌草。",
  },
  {
    id: "heaven_hates_genius",
    group: "fate",
    volatility: "risky",
    name: "天厌早慧",
    rarity: "gold",
    effect: "开局额外掌握基础术法，词条联动更早显现。",
    cost: "初始天妒提高，幕后者更早留意你。",
    tags: ["早慧", "天妒"],
    trigger: "你太早看懂了毒气走向，也因此感觉到黑暗里有什么东西回望了你。",
  },
  {
    id: "misfortune_bargain",
    group: "fate",
    volatility: "risky",
    name: "祸福相倚",
    rarity: "purple",
    effect: "主动接受代价时，结算更容易生成高阶词条。",
    cost: "无法选择完全无风险的长期行动。",
    tags: ["代价", "结算"],
    trigger: "你明知水有问题仍端起碗，这一命的代价开始凝成清晰命痕。",
  },
  {
    id: "borrowed_life",
    group: "fate",
    volatility: "risky",
    name: "借命一刻",
    rarity: "purple",
    effect: "模拟中首次死亡会延迟一个行动阶段。",
    cost: "延迟期间受到的痛苦会转为现实心蚀。",
    tags: ["死亡", "心蚀"],
    trigger: "心脉明明已经断了，你却又借来一息，看清补刀者袖口的赤线。",
  },
];

export const SETTLEMENT_TRAITS = [
  {
    id: "venom_delay",
    name: "毒息迟滞",
    rarity: "blue",
    effect: "新毒首次发作延迟一个行动阶段。",
    source: "中毒后仍完成一次有效行动",
    tags: ["poison", "survival"],
    route: "bait",
    weight: 1,
  },
  {
    id: "crisis_gaze",
    name: "临危静观",
    rarity: "blue",
    effect: "濒死时额外看清一项可观察细节。",
    source: "在低伤势状态主动调查",
    tags: ["observe", "survival"],
    route: "observe",
    weight: 1,
  },
  {
    id: "herb_reader",
    name: "草木辨性",
    rarity: "white",
    effect: "接触药材时显示其一项主要药性。",
    source: "本轮检查过药渣或井水",
    tags: ["poison", "observe"],
    route: "trace",
    weight: 0,
  },
  {
    id: "breath_hider",
    name: "龟息藏脉",
    rarity: "purple",
    effect: "每次模拟可令敌人误判一次生死。",
    source: "中毒后佯装失去意识",
    tags: ["deceive", "survival"],
    route: "bait",
    weight: 2,
  },
  {
    id: "scent_thread",
    name: "余香寻迹",
    rarity: "blue",
    effect: "接触药毒后可追踪最近的同源气息。",
    source: "同时调查毒物与人员动线",
    tags: ["poison", "observe"],
    route: "trace",
    weight: 1,
  },
  {
    id: "last_echo",
    name: "末声入耳",
    rarity: "blue",
    effect: "死亡前听见的一句模糊话会被完整记录。",
    source: "保持清醒直到补刀者靠近",
    tags: ["observe", "survival"],
    route: "observe",
    weight: 1,
  },
  {
    id: "guarding_vow",
    name: "护命执念",
    rarity: "purple",
    effect: "替同伴承受致命伤时保留一线生机。",
    source: "主动替人承担死亡风险",
    tags: ["protect", "survival"],
    route: "protect",
    weight: 2,
  },
];

export function hashSeed(value) {
  const text = String(value);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createRng(seed) {
  let value = hashSeed(seed) || 1;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function pickOne(items, rng) {
  return items[Math.floor(rng() * items.length)];
}

function pickDistinct(items, count, rng) {
  const pool = [...items];
  const picked = [];
  while (pool.length && picked.length < count) {
    const index = Math.floor(rng() * pool.length);
    picked.push(pool.splice(index, 1)[0]);
  }
  return picked;
}

export function generateOpeningSets(seed, rerollIndex = 0) {
  const rng = createRng(`${seed}:opening:${rerollIndex}`);
  return ["root", "talent", "fate"].map((group) => {
    const groupTraits = OPENING_TRAITS.filter((trait) => trait.group === group);
    const stable = pickOne(
      groupTraits.filter((trait) => trait.volatility === "stable"),
      rng,
    );
    let riskyPool = groupTraits.filter((trait) => trait.volatility === "risky");
    if (group !== "fate") {
      riskyPool = riskyPool.filter((trait) => trait.rarity !== "gold");
    }
    const risky = pickOne(riskyPool, rng);
    return { group, choices: [stable, risky] };
  });
}

export function getOpeningTrait(id) {
  return OPENING_TRAITS.find((trait) => trait.id === id);
}

export function getOrigin(id) {
  return ORIGINS.find((origin) => origin.id === id);
}

export function getAppearance(id) {
  return APPEARANCES.find((appearance) => appearance.id === id);
}

export function scoreSettlement(tags = [], clueCount = 0) {
  const uniqueTags = new Set(tags);
  const score = uniqueTags.size + Math.min(clueCount, 2);
  if (score >= 7) return "乙";
  if (score >= 4) return "丙";
  return "丁";
}

export function deriveSettlementTraits({ seed, tags = [], rating = "丙" }) {
  const rng = createRng(`${seed}:settlement:${[...tags].sort().join("-")}:${rating}`);
  const activeTags = new Set(tags);
  let eligible = SETTLEMENT_TRAITS.filter((trait) =>
    trait.tags.every((tag) => activeTags.has(tag)),
  );
  if (eligible.length < 3) eligible = [...SETTLEMENT_TRAITS];

  const drawCount = rating === "丁" ? 2 : rating === "甲" ? 4 : 3;
  let selected = pickDistinct(eligible, drawCount, rng);

  if (rating !== "丁" && !selected.some((trait) => RARITY[trait.rarity].rank >= 2)) {
    const guaranteed = eligible.find((trait) => RARITY[trait.rarity].rank >= 2);
    if (guaranteed) selected[selected.length - 1] = guaranteed;
  }

  const unique = [];
  for (const trait of selected) {
    if (!unique.some((item) => item.id === trait.id)) unique.push(trait);
  }
  for (const trait of eligible) {
    if (unique.length >= drawCount) break;
    if (!unique.some((item) => item.id === trait.id)) unique.push(trait);
  }
  return unique;
}

export function getSettlementTrait(id) {
  return SETTLEMENT_TRAITS.find((trait) => trait.id === id);
}

export function uniqueTags(tags = []) {
  return [...new Set(tags)];
}
