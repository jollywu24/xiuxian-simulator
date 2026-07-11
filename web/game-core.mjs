export const RARITY = {
  gray: { label: "灰", rank: 0 },
  white: { label: "白", rank: 1 },
  blue: { label: "蓝", rank: 2 },
  purple: { label: "紫", rank: 3 },
  gold: { label: "金", rank: 4 },
};

export const INTEL_LEVELS = {
  rumor: { label: "传闻", rank: 0 },
  confirmed: { label: "确证", rank: 2 },
  stale: { label: "过期确证", rank: 1 },
};

export const TRAIT_SYNERGIES = [
  {
    id: "herbal_trail",
    name: "药性寻脉",
    openingAny: ["herbal_tongue", "keen_eye"],
    acquiredAny: ["herb_reader", "scent_thread"],
    effect: "从矿尘药味中找到旧通风井，绕过正门守卫并削弱傀儡护印。",
    cost: "必须贴近受污染的风脉，心蚀风险提高。",
    unlock: "vent",
  },
  {
    id: "borrowed_stillness",
    name: "借息藏锋",
    openingAny: ["fortunate_crisis", "borrowed_life", "broken_meridian"],
    acquiredAny: ["venom_delay", "breath_hider"],
    effect: "封脉杀招落下时可伪装气绝，立即拆除一层护印且不承受反击。",
    cost: "本次战斗结束后天妒提高一层。",
    unlock: "feign",
  },
  {
    id: "echoed_ink",
    name: "墨痕回声",
    openingAny: ["perfect_memory", "truth_compulsion"],
    acquiredAny: ["last_echo", "crisis_gaze"],
    effect: "把名册暗印与傀儡口令相互印证，可在战斗前确认第一道杀招。",
    cost: "强记前世细节会令过期确证更难辨认。",
    unlock: "intent",
  },
];

export const BUILD_PATHS = [
  {
    id: "fate_breath",
    name: "观命归息篇",
    discipline: "推演",
    effect: "进入关键场景前，可把一条传闻与现场征兆互证，避免照搬过期确证。",
    cost: "每次强行推演都会提高偏差。",
    unlock: "foresee",
  },
  {
    id: "seal_breaker",
    name: "拆阵问隙诀",
    discipline: "阵法",
    effect: "把确证转化为阵法缺口，开放破坏护山阵与祖师祭盘的规则级行动。",
    cost: "拆阵会同时毁坏归尘门传承与庇护。",
    unlock: "sever",
  },
  {
    id: "shadow_crossing",
    name: "无影渡",
    discipline: "潜行",
    effect: "绕过身份门槛潜入旧档案与敌宗暗线，并可与阿厌分头行动。",
    cost: "公开证词更难取信于人。",
    unlock: "infiltrate",
  },
  {
    id: "living_ledger",
    name: "众生谱",
    discipline: "关系",
    effect: "把同伴的自主行动编入同一方案，开放多人撤离与并行破阵。",
    cost: "任何同伴被牺牲，众生谱都会永远缺去一页。",
    unlock: "evacuate",
  },
];

export const CORE_NPCS = [
  {
    id: "pei",
    name: "裴照雪",
    motive: "证明师门仍值得守护",
    help: "剑术支援、内门担保、控制护山阵外环",
    clue: "掌门议事与护山阵换位图",
    boundary: "不接受无证据污蔑师门，也不处决已经投降的人",
  },
  {
    id: "wen",
    name: "闻青禾",
    motive: "找到失踪兄长并阻止弟子被炼成阵材",
    help: "医治、毒理、尸骨辨识、组织伤员撤离",
    clue: "丹房账册与历代弟子尸骨",
    boundary: "不会为了追击敌人放弃仍有生机的人",
  },
  {
    id: "song",
    name: "宋无咎",
    motive: "让宗门活下来，即使必须隐瞒真相",
    help: "调档、审讯、调动杂役、打开建宗密库",
    clue: "建宗旧档与长老隐情",
    boundary: "没有可控替代方案时，会优先维持宗门稳定",
  },
  {
    id: "ayen",
    name: "阿厌",
    motive: "重获自由并让利用她的人付出代价",
    help: "潜行、禁术、敌方语言、山外撤离路线",
    clue: "赤霞宗营地与日核交易暗线",
    boundary: "不会为归尘门牺牲自由，也拒绝成为新的祭品",
  },
];

export const BUILD_SYNERGIES = [
  {
    id: "ink_breaks_array",
    name: "墨痕拆阵",
    buildIds: ["seal_breaker"],
    openingAny: ["perfect_memory", "keen_eye", "truth_compulsion"],
    intelAny: ["mine_old_seal", "guardian_cadence", "founder_phrase"],
    effect: "旧印、阵图与记忆互证，终局可直接定位祭阵主脉。",
  },
  {
    id: "poison_reads_life",
    name: "毒理观命",
    buildIds: ["fate_breath"],
    openingAny: ["herbal_tongue", "river_root", "yin_sense"],
    acquiredAny: ["herb_reader", "scent_thread", "venom_delay"],
    effect: "从尸骨残毒判断寿元流向，旧档案调查无需官方文书。",
  },
  {
    id: "shadow_speaks_enemy",
    name: "敌语无影",
    buildIds: ["shadow_crossing"],
    npcAny: ["ayen"],
    intelAny: ["red_token", "handoff_time", "mine_old_seal"],
    effect: "与阿厌沿敌宗暗线潜入，第五年可从外环反转护山阵。",
  },
  {
    id: "people_form_array",
    name: "众志成阵",
    buildIds: ["living_ledger"],
    minAllies: 2,
    effect: "两名以上同伴可并行行动，终局开放全员撤离与分区破阵。",
  },
];

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

export function createIntel({
  id,
  title,
  detail,
  status = "rumor",
  source = "未知来源",
  gainedAtDeviation = 0,
  expiresAtDeviation = null,
}) {
  if (!INTEL_LEVELS[status]) throw new Error(`Unknown intel status: ${status}`);
  return {
    id,
    title,
    detail,
    status,
    source,
    gainedAtDeviation,
    expiresAtDeviation,
  };
}

export function upsertIntel(records = [], nextRecord) {
  const current = records.find((record) => record.id === nextRecord.id);
  if (!current) return [...records, { ...nextRecord }];
  const currentRank = INTEL_LEVELS[current.status]?.rank ?? -1;
  const nextRank = INTEL_LEVELS[nextRecord.status]?.rank ?? -1;
  const merged = nextRank >= currentRank
    ? { ...current, ...nextRecord }
    : { ...nextRecord, ...current };
  return records.map((record) => record.id === nextRecord.id ? merged : record);
}

export function ageIntel(records = [], deviation = 0) {
  return records.map((record) => {
    if (
      record.status !== "confirmed"
      || record.expiresAtDeviation === null
      || deviation < record.expiresAtDeviation
    ) {
      return { ...record };
    }
    return {
      ...record,
      status: "stale",
      staleAtDeviation: deviation,
    };
  });
}

export function getIntel(records = [], id) {
  return records.find((record) => record.id === id);
}

export function getBuildPath(id) {
  return BUILD_PATHS.find((build) => build.id === id);
}

export function getCoreNpc(id) {
  return CORE_NPCS.find((npc) => npc.id === id);
}

export function evaluateNpcAlliance({
  npcId,
  confirmedIntelIds = [],
  buildId = null,
  p1Companion = null,
  p1Choice = null,
  archiveChoice = null,
  year5Choice = null,
}) {
  const intel = new Set(confirmedIntelIds);
  let allied = false;
  let state = "cautious";
  let reason = "尚未获得足以跨越底线的证据。";

  if (npcId === "wen") {
    allied = p1Companion === "wen"
      || p1Choice === "rescue"
      || archiveChoice === "bones"
      || intel.has("sacrifice_ledger");
    reason = allied ? "尸骨、失踪名册或共同救援证明了献祭链。" : "她仍在寻找兄长，不会离开伤者。";
  } else if (npcId === "pei") {
    allied = p1Companion === "pei"
      || year5Choice === "pei"
      || (intel.has("founding_deed") && intel.has("array_heart"));
    reason = allied ? "建宗旧档与护山阵证据迫使她承认师门制度有罪。" : "她只接受可核验的师门罪证。";
  } else if (npcId === "song") {
    allied = archiveChoice === "audit"
      || year5Choice === "song"
      || (intel.has("founding_deed") && buildId === "living_ledger");
    state = allied ? "allied" : archiveChoice === "accuse" ? "hostile" : "cautious";
    reason = allied ? "你给出了既能止祭又能维持撤离秩序的方案。" : "没有可控替代方案，他会继续封锁旧档。";
  } else if (npcId === "ayen") {
    allied = archiveChoice === "free_ayen"
      || year5Choice === "ayen"
      || (buildId === "shadow_crossing" && intel.has("red_token"));
    reason = allied ? "你承诺自由而非新的归属，她愿意交换敌宗暗线。" : "她拒绝替归尘门承担任何牺牲。";
  }

  return {
    npcId,
    allied,
    state: allied ? "allied" : state,
    reason,
  };
}

export function deriveBuildSynergies({
  buildId,
  openingTraitIds = [],
  acquiredTraitIds = [],
  confirmedIntelIds = [],
  alliedNpcIds = [],
}) {
  const opening = new Set(openingTraitIds);
  const acquired = new Set(acquiredTraitIds);
  const intel = new Set(confirmedIntelIds);
  const allies = new Set(alliedNpcIds);
  return BUILD_SYNERGIES.filter((synergy) => {
    if (!synergy.buildIds.includes(buildId)) return false;
    if (synergy.openingAny && !synergy.openingAny.some((id) => opening.has(id))) return false;
    if (synergy.acquiredAny && !synergy.acquiredAny.some((id) => acquired.has(id))) return false;
    if (synergy.intelAny && !synergy.intelAny.some((id) => intel.has(id))) return false;
    if (synergy.npcAny && !synergy.npcAny.some((id) => allies.has(id))) return false;
    if (synergy.minAllies && allies.size < synergy.minAllies) return false;
    return true;
  });
}

export function evaluateFinaleOptions({
  confirmedIntelIds = [],
  alliedNpcIds = [],
  buildId = null,
  envy = 0,
  deviation = 0,
  archiveChoice = null,
  year5Choice = null,
}) {
  const intel = new Set(confirmedIntelIds);
  const allies = new Set(alliedNpcIds);
  const hasSacrificeTruth = intel.has("sacrifice_ledger") || intel.has("founding_deed");
  const hasArrayTruth = intel.has("array_heart");
  const exileEnabled = allies.size >= 2 || buildId === "living_ledger" || year5Choice === "ayen";
  const severEnabled = hasSacrificeTruth
    && hasArrayTruth
    && allies.size >= 2
    && ["seal_breaker", "fate_breath"].includes(buildId)
    && deviation <= 5;
  const seizeEnabled = (buildId === "seal_breaker" || intel.has("founder_phrase"))
    && (allies.has("ayen") || envy >= 1)
    && year5Choice !== "pei";

  return [
    {
      id: "exile",
      name: "携火离山",
      enabled: exileEnabled,
      reason: exileEnabled ? "至少两名同伴或众生谱可并行带走人和典籍。" : "需要两名同伴、众生谱或阿厌的山外路线。",
      cost: "放弃归尘门；祭阵秘密可能在别处继续害人。",
    },
    {
      id: "sever",
      name: "斩祖散门",
      enabled: severEnabled,
      reason: severEnabled ? "献祭真相、阵心位置、同伴与拆阵方法已经齐备。" : "需要献祭确证、阵心确证、两名同伴、合适法门且偏差不超过 5。",
      cost: "宗门名誉、护山阵与制度一并终结。",
    },
    {
      id: "seize",
      name: "夺盘续世",
      enabled: seizeEnabled,
      reason: seizeEnabled ? "你能接管祭盘，并有力量或阿厌的禁术承受反噬。" : "需要拆阵/祖师口令，以及阿厌或至少 1 点天妒；裴照雪控阵路线会阻止此举。",
      cost: "把收割转嫁给他者，成为下一轮劫难的制造者。",
    },
  ];
}

export function resolveFinalEnding(optionId, context) {
  const option = evaluateFinaleOptions(context).find((item) => item.id === optionId);
  if (!option?.enabled) return null;
  const endings = {
    exile: {
      id: "exile",
      name: "携火离山",
      epitaph: "山门在身后熄灭，人还活着，火种也还活着。",
      consequence: "你带走核心人物与典籍，放弃归尘门。祖师失去这一季祭品，却仍可能在别处寻找下一座山门。",
      legacyId: "embers_map",
    },
    sever: {
      id: "sever",
      name: "斩祖散门",
      epitaph: "不是守住归尘门，而是让它再也不能吃人。",
      consequence: "祭阵被瓦解，祖师被封回无名石中。宗门声名与制度一并终结，幸存者各自开始新的生活。",
      legacyId: "broken_seal",
    },
    seize: {
      id: "seize",
      name: "夺盘续世",
      epitaph: "黑日仍然升起，只是这一次由你决定照向谁。",
      consequence: "你控制命盘，把寿元收割转向敌宗与战俘。归尘门得以延续，而你成为下一轮劫难的主人。",
      legacyId: "black_sun_mark",
    },
  };
  return { ...endings[optionId], cost: option.cost };
}

export function createCycleLegacy(endingId) {
  const map = {
    exile: {
      id: "embers_map",
      name: "余烬山图",
      effect: "下一世开局即知道一条安全撤离路；闻青禾会对你产生似曾相识的信任。",
      openingIntel: "safe_route",
      npcReaction: "wen",
    },
    sever: {
      id: "broken_seal",
      name: "断阵残印",
      effect: "下一世可从晚宴异象直接追查旧印；裴照雪会认出你携带的破阵痕迹。",
      openingIntel: "old_seal_memory",
      npcReaction: "pei",
    },
    seize: {
      id: "black_sun_mark",
      name: "黑日命痕",
      effect: "下一世开局即听见祖师口令，但天妒 +1；阿厌会本能地警惕你。",
      openingIntel: "founder_echo",
      npcReaction: "ayen",
      envy: 1,
    },
  };
  return map[endingId] ? { ...map[endingId] } : null;
}

export function createRealityAnchor(state, screen) {
  const snapshot = structuredClone({ ...state, realityAnchor: null });
  snapshot.screen = screen;
  return {
    screen,
    snapshot,
  };
}

export function restoreRealityAnchor(anchor) {
  if (!anchor?.snapshot || !anchor?.screen) return null;
  const restored = structuredClone(anchor.snapshot);
  restored.screen = anchor.screen;
  restored.realityAnchor = structuredClone(anchor);
  return restored;
}

export function migrateSaveData(saved, defaults) {
  if (!saved || ![1, 2, 3].includes(saved.version) || !saved.screen || !saved.seed) return null;
  const migrated = {
    ...structuredClone(defaults),
    ...saved,
    character: { ...defaults.character, ...saved.character },
    timeline: { ...defaults.timeline, ...saved.timeline },
    version: 3,
  };
  migrated.intel ??= [];
  migrated.activeSynergies ??= [];
  migrated.p1Path ??= [];
  migrated.p2Path ??= [];
  migrated.npcStates ??= structuredClone(defaults.npcStates || {});
  migrated.completedEndings ??= [];
  if (saved.version === 1 && ["mine", "ending"].includes(saved.screen)) {
    migrated.screen = "mineApproach";
    migrated.mineChoice = null;
    migrated.mineOutcome = null;
    migrated.battle = null;
    migrated.p1Path = ["旧命盘在乌铜矿前重新续上因果"];
  }
  if (saved.version === 2 && saved.screen === "ending") {
    migrated.screen = "p2Interlude";
    migrated.p2Path = ["旧命盘越过矿难，重新展开七年因果"];
  }
  return migrated;
}

export function deriveTraitSynergies(openingIds = [], acquiredIds = []) {
  const opening = new Set(openingIds);
  const acquired = new Set(acquiredIds);
  return TRAIT_SYNERGIES.filter((synergy) =>
    synergy.openingAny.some((id) => opening.has(id))
    && synergy.acquiredAny.some((id) => acquired.has(id)),
  );
}

export function resolveCompanionOffer({
  companion,
  intel = [],
  clues = [],
  rewardType = null,
  acquiredTraitIds = [],
}) {
  const confirmedIds = new Set(
    intel.filter((record) => record.status === "confirmed").map((record) => record.id),
  );
  const clueText = clues.join(" ");

  if (companion === "wen") {
    const evidence = confirmedIds.has("poisoner_family")
      || /家人被囚|闻青禾兄长|乌舌草/.test(clueText)
      || acquiredTraitIds.includes("guarding_vow");
    return evidence
      ? {
          accepted: true,
          companion,
          reason: "你拿出了与失踪者、毒物或囚徒有关的证据。闻青禾决定同行，但会优先救人。",
          boundary: "发现仍活着的受困者时，她会中止追击、优先救人。",
        }
      : {
          accepted: false,
          companion,
          reason: "你只有矿难传闻，没有能指向失踪兄长或药毒的证据。闻青禾拒绝拿病人赌一次预感。",
          boundary: "需要毒理、囚徒或失踪者相关确证。",
        };
  }

  if (companion === "pei") {
    const evidence = confirmedIds.has("red_token")
      || /赤纹腰牌|青檀纸|内门专用/.test(clueText)
      || rewardType === "dao";
    return evidence
      ? {
          accepted: true,
          companion,
          reason: "证据足以证明矿难背后有人布置。裴照雪答应护送，但不会执行无证据的处决。",
          boundary: "敌人投降或证据冲突时，她会先控制局面。",
        }
      : {
          accepted: false,
          companion,
          reason: "你无法证明矿难与宗门内应有关。裴照雪拒绝擅离内门值守。",
          boundary: "需要势力凭证、内门文书或足以自保的道行。",
        };
  }

  return {
    accepted: true,
    companion: "alone",
    reason: "你决定独自下矿，不必说服任何人，也无人替你承担失误。",
    boundary: "没有同伴援护。",
  };
}

const MINE_INTENTS = ["seal", "burst", "drag"];

export function createMineBattle({
  seed,
  entry = "main",
  envy = 0,
  intelStatus = "rumor",
}) {
  const rng = createRng(`${seed}:mine-battle:${entry}`);
  const offset = Math.floor(rng() * MINE_INTENTS.length);
  const intents = MINE_INTENTS.map((_, index) => MINE_INTENTS[(index + offset) % MINE_INTENTS.length]);
  return {
    turn: 1,
    maxTurns: 6,
    resolve: envy >= 3 ? 3 : 4,
    enemyHealth: 2,
    enemyWard: ["vent", "drain"].includes(entry) ? 1 : 2,
    intents,
    intentIndex: 0,
    intelStatus,
    insight: intelStatus === "confirmed" ? 1 : 0,
    counterUsed: false,
    synergyUsed: false,
    companionUsed: false,
    enemyPrepared: envy >= 2,
    outcome: "active",
    intelFailed: false,
    log: [entry === "vent" ? "你从旧风井切入，傀儡少了一层外侧护印。" : "守核傀儡踏住正井，双重护印同时亮起。"],
  };
}

function damageEnemy(next, amount = 1) {
  let remaining = amount;
  while (remaining > 0 && next.enemyWard > 0) {
    next.enemyWard -= 1;
    remaining -= 1;
  }
  if (remaining > 0) next.enemyHealth = Math.max(0, next.enemyHealth - remaining);
}

export function resolveMineBattleTurn(
  battle,
  action,
  { synergyIds = [], companion = "alone" } = {},
) {
  if (battle.outcome !== "active") return structuredClone(battle);
  const next = structuredClone(battle);
  const intent = next.intents[next.intentIndex];
  let avoidRetaliation = false;

  if (action === "observe") {
    next.insight = 1;
    avoidRetaliation = true;
    next.log.push(`你没有抢攻，确认傀儡下一式是“${intent}”。`);
  } else if (action === "counter") {
    if (next.counterUsed) return next;
    next.counterUsed = true;
    if (next.intelStatus === "confirmed" || next.insight > 0) {
      damageEnemy(next, 2);
      next.insight = 0;
      avoidRetaliation = true;
      next.log.push("口令与膝印变化吻合，你抢在杀招前拆掉两层防护。 ");
    } else {
      next.resolve -= 1;
      next.intelFailed = next.intelStatus === "stale";
      next.log.push(next.intelFailed
        ? "你照搬过期口令，傀儡却已换式；错误情报让你先受一击。"
        : "传闻缺少准确时机，你的反制落空。 ");
    }
  } else if (action === "synergy") {
    if (next.synergyUsed || synergyIds.length === 0) return next;
    next.synergyUsed = true;
    damageEnemy(next, 2);
    avoidRetaliation = true;
    next.log.push("两枚词条形成规则联动：你绕开正面强弱，直接破坏护印成立的条件。 ");
  } else if (action === "companion") {
    if (next.companionUsed || companion === "alone") return next;
    next.companionUsed = true;
    if (companion === "wen") {
      next.resolve = Math.min(4, next.resolve + 1);
      next.insight = 1;
      next.log.push("闻青禾以银针截断封脉余波，并指出傀儡灵流的断点。 ");
    } else {
      damageEnemy(next, 1);
      next.log.push("裴照雪只斩护印不斩人，为你劈开一个安全行动窗口。 ");
    }
    avoidRetaliation = true;
  } else if (action === "brace") {
    next.insight = 1;
    avoidRetaliation = true;
    next.log.push("你守住心脉，逼傀儡完整暴露这一式的征兆。 ");
  } else if (action === "strike") {
    damageEnemy(next, 1);
    next.log.push(next.enemyWard > 0 ? "你的攻击削去一层护印。" : "攻击穿过破损护印，击中傀儡核心。 ");
  } else {
    return next;
  }

  if (next.enemyHealth <= 0) {
    next.outcome = "won";
    next.log.push("守核傀儡停在杀招前，通往日核的路已经打开。 ");
    return next;
  }

  if (!avoidRetaliation) {
    const damage = intent === "burst" && next.enemyPrepared ? 2 : 1;
    next.resolve -= damage;
    next.log.push(`傀儡执行“${intent}”，你失去 ${damage} 点心志。`);
  }

  if (next.resolve <= 0 || next.turn >= next.maxTurns) {
    next.resolve = Math.max(0, next.resolve);
    next.outcome = "lost";
    next.log.push("护印锁死经脉；这条命结束前，你看清傀儡膝印会先于杀招亮起。 ");
    return next;
  }

  next.turn += 1;
  next.intentIndex = (next.intentIndex + 1) % next.intents.length;
  return next;
}
