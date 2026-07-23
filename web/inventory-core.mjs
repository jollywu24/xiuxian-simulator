export const INVENTORY_CAPACITY = 24;

export const INVENTORY_CATEGORIES = Object.freeze([
  { id: "all", name: "全部物品", icon: "bag" },
  { id: "medicine", name: "丹药", icon: "gourd" },
  { id: "ingredient", name: "材料", icon: "leaf" },
  { id: "tool", name: "兵具", icon: "needle" },
  { id: "token", name: "信物", icon: "token" },
  { id: "clue", name: "线索", icon: "book" },
]);

export const INVENTORY_QUALITIES = Object.freeze({
  common: { id: "common", name: "凡品" },
  fine: { id: "fine", name: "良品" },
  precious: { id: "precious", name: "珍品" },
  rare: { id: "rare", name: "稀有" },
  treasure: { id: "treasure", name: "奇珍" },
});

const INVENTORY_ITEMS = Object.freeze({
  family_jade: {
    id: "family_jade",
    name: "半块家传玉佩",
    category: "token",
    typeName: "旧物",
    quality: "treasure",
    maxStack: 1,
    art: "./assets/items/family-jade.png",
    description: "玉质温润，断口却像被利器生生斩开。贴在胸口时，总有一丝不合时宜的暖意。",
    effect: "怀中玉佩会对与身世、命格有关的异常生出反应。",
  },
  blood_letter: {
    id: "blood_letter",
    name: "一封染暗的血书",
    category: "clue",
    typeName: "线索",
    quality: "rare",
    maxStack: 1,
    art: "./assets/items/blood-letter.png",
    description: "纸上血迹已经发黑，大半字句被雨水泡烂，只剩末尾一行还能辨认。",
    effect: "可辨字迹：金龙会万鲤堂，孙不离。",
  },
  mountain_peach: {
    id: "mountain_peach",
    name: "山桃",
    category: "medicine",
    typeName: "食物",
    quality: "fine",
    maxStack: 12,
    art: "./assets/items/mountain-peach.png",
    description: "贡桌所得，果皮还带着凉意，新鲜得不像荒庙之物。",
    effect: "服用：缓解一层饥饿。",
    useAction: "eat_peach",
  },
  shen_token: {
    id: "shen_token",
    name: "沈字铜钱",
    category: "token",
    typeName: "信物",
    quality: "rare",
    maxStack: 1,
    art: "./assets/items/shen-token.png",
    description: "边缘刻着三道火纹，不是银钱，而是金陵沈家留下的一份旧诺。",
    effect: "可让沈家侧门为一个来路不明的人开一次。",
  },
  east_map: {
    id: "east_map",
    name: "金陵东郊残图",
    category: "clue",
    typeName: "舆图",
    quality: "fine",
    maxStack: 1,
    art: "./assets/items/east-map.png",
    description: "一张被火烟熏脆的残图，标出了破庙、紫金河与东湖之间的旧路。",
    effect: "使紫金河水路成为可以验证的去路。",
  },
  return_spring_pill: {
    id: "return_spring_pill",
    name: "下品回春丹",
    category: "medicine",
    typeName: "丹药",
    quality: "fine",
    maxStack: 20,
    art: "./assets/items/return-spring-pill.png",
    detailArt: "./assets/items/return-spring-pill-detail.png",
    description: "曹青传授、由你亲手炼成，可止血补气并稳住轻中伤。",
    effect: "服用：恢复气血，稳定一处轻中伤。",
    useAction: "treat_wound",
  },
  purple_scale_herb: {
    id: "purple_scale_herb",
    name: "紫鳞草",
    category: "ingredient",
    typeName: "药材",
    quality: "fine",
    maxStack: 20,
    art: "./assets/items/purple-scale-herb.png",
    description: "叶背生着细密紫纹，药性偏暖，能引动衰弱气血。",
    effect: "炼制换血类丹药的主材之一。",
  },
  blood_vine_core: {
    id: "blood_vine_core",
    name: "血藤芯",
    category: "ingredient",
    typeName: "药材",
    quality: "fine",
    maxStack: 20,
    art: "./assets/items/blood-vine-core.png",
    description: "只取藤心一线，离土后仍像细小血脉般轻轻抽动。",
    effect: "用于约束换血时过猛的药力。",
  },
  calm_pulse_sand: {
    id: "calm_pulse_sand",
    name: "定脉砂",
    category: "ingredient",
    typeName: "药材",
    quality: "precious",
    maxStack: 20,
    art: "./assets/items/calm-pulse-sand.png",
    description: "沈家秘库所藏，砂砾触手冰凉，落入水中却不沉底。",
    effect: "可以暂压逆行经脉。",
  },
  purple_dragon_blood_pill: {
    id: "purple_dragon_blood_pill",
    name: "紫龙换血丹",
    category: "medicine",
    typeName: "丹药",
    quality: "rare",
    maxStack: 6,
    art: "./assets/items/purple-dragon-pill.png",
    description: "以猛药换动气血，丹气刚烈，不辨病势便服下等同自寻死路。",
    effect: "只可用于已经查明的换血病局。",
  },
  spring_rain_needles: {
    id: "spring_rain_needles",
    name: "春风银针",
    category: "tool",
    typeName: "兵具",
    quality: "fine",
    maxStack: 20,
    art: "./assets/items/spring-rain-needles.png",
    description: "针身轻细，既可止血封穴，也能在一念之间夺命。",
    effect: "作为春风化雨针的施术兵具。",
  },
  fish_scale_token: {
    id: "fish_scale_token",
    name: "鱼鳞铜签",
    category: "token",
    typeName: "暗记",
    quality: "rare",
    maxStack: 1,
    art: "./assets/items/fish-scale-token.png",
    description: "刀客用来回报成败的凭证，背面刻着东水门桥洞与丑时暗记。",
    effect: "可用于伪报、改写交接或追查回报链。",
  },
  monkey_wine: {
    id: "monkey_wine",
    name: "猴儿酒",
    category: "medicine",
    typeName: "灵酿",
    quality: "rare",
    maxStack: 6,
    art: "./assets/items/monkey-wine.png",
    description: "百果与山泉自然发酵，开封便有暖香直透筋骨。",
    effect: "药力足以洗练初入锻体者，不宜在寻常状态下贸然饮用。",
  },
  ape_relief_rubbing: {
    id: "ape_relief_rubbing",
    name: "神猿残刻拓痕",
    category: "clue",
    typeName: "武学残线",
    quality: "precious",
    maxStack: 1,
    art: "./assets/items/ape-rubbing.png",
    description: "水洞石壁上的挥棒残势，只来得及拓下一段发力轮廓。",
    effect: "补齐相应条件后，可继续追索神猿传承。",
  },
  qingqing_book: {
    id: "qingqing_book",
    name: "《青青册》",
    category: "clue",
    typeName: "医书",
    quality: "precious",
    maxStack: 1,
    art: "./assets/items/qingqing-book.png",
    description: "曹青随手抛来的薄册，记着药性、经脉与数种险症的辨法。",
    effect: "研读后可提升医术。",
  },
  hundred_pills_notes: {
    id: "hundred_pills_notes",
    name: "《百丹注解》",
    category: "clue",
    typeName: "丹书",
    quality: "rare",
    maxStack: 1,
    art: "./assets/items/hundred-pills-notes.png",
    description: "曹青批注过的丹书，页边满是对火候、药序和废丹的刻薄评语。",
    effect: "继续炼成丹药后，可据此换取更深的指点。",
  },
  return_spring_recipe: {
    id: "return_spring_recipe",
    name: "回春丹方",
    category: "clue",
    typeName: "丹方",
    quality: "precious",
    maxStack: 1,
    art: "./assets/items/hundred-pills-notes.png",
    description: "回春丹的药序、火候与收丹手法已经被完整记下。",
    effect: "允许在材料与丹炉齐备时再次炼制回春丹。",
  },
  herb_token: {
    id: "herb_token",
    name: "沈家药牌",
    category: "token",
    typeName: "信物",
    quality: "fine",
    maxStack: 1,
    art: "./assets/items/fish-scale-token.png",
    description: "沈家外院发下的取药木牌，牌角留着一缕药香。",
    effect: "可在仍有权限时调用一批普通药材。",
  },
  shen_batch_clue: {
    id: "shen_batch_clue",
    name: "沈家药批暗记",
    category: "clue",
    typeName: "线索",
    quality: "precious",
    maxStack: 1,
    art: "./assets/items/east-map.png",
    description: "药批编号与丹房出入记录对不上，说明有人绕开了外院账目。",
    effect: "可用于追查沈家药物流向。",
  },
  arithmetic: {
    id: "arithmetic",
    name: "账房算术抄本",
    category: "clue",
    typeName: "书册",
    quality: "common",
    maxStack: 1,
    art: "./assets/items/qingqing-book.png",
    description: "一本磨损严重的算术抄本，足以应付普通账目。",
    effect: "满足部分账房差事的基础门槛。",
  },
});

const LEGACY_ITEM_ALIASES = Object.freeze({
  return_spring_pills: "return_spring_pill",
});

function addItem(map, id, quantity = 1) {
  const item = INVENTORY_ITEMS[id];
  const count = Math.max(0, Number(quantity || 0));
  if (!item || count <= 0) return;
  const previous = map.get(id);
  map.set(id, { ...item, quantity: Number(previous?.quantity || 0) + count });
}

export function getInventoryItemDefinition(id) {
  return INVENTORY_ITEMS[id] || null;
}

export function getInventoryCategory(id) {
  return INVENTORY_CATEGORIES.find((category) => category.id === id) || INVENTORY_CATEGORIES[0];
}

export function getInventoryItems(state = {}) {
  const items = new Map();
  const belongingsKnown = state.screen !== "templeWake" || Boolean(state.templeOpening?.belongingsChecked);

  if (belongingsKnown && state.backgroundId === "mystery") {
    addItem(items, "family_jade");
    addItem(items, "blood_letter");
  }
  if (state.templeOpening?.peachEaten) addItem(items, "mountain_peach", state.peaches);
  if (state.completedTempleTasks?.includes("traveler_relic")) addItem(items, "east_map");
  if (state.completedTempleTasks?.includes("shen_promise")) addItem(items, "shen_token");

  for (const rawId of state.inventory || []) {
    const id = LEGACY_ITEM_ALIASES[rawId] || rawId;
    if (id === "return_spring_pill") {
      if (!state.p0?.started) addItem(items, id, state.alchemyPills);
      continue;
    }
    addItem(items, id);
  }

  for (const [id, quantity] of Object.entries(state.p0?.items || {})) {
    addItem(items, id, quantity);
  }

  return [...items.values()];
}

export function getInventoryUseState(itemId, state = {}) {
  const item = INVENTORY_ITEMS[itemId];
  if (!item?.useAction) return { visible: false, available: false, reason: "" };

  if (item.useAction === "eat_peach") {
    if (Number(state.peaches || 0) <= 0) return { visible: true, available: false, reason: "山桃已经吃完。" };
    if (Number(state.hungerLevel || 0) <= 0) return { visible: true, available: false, reason: "腹中暂且不饥。" };
    return { visible: true, available: true, reason: "当前状态可使用", action: item.useAction };
  }

  if (item.useAction === "treat_wound") {
    if (["firstNeedleAmbush", "wangBattle"].includes(state.screen)) {
      return { visible: true, available: false, reason: "交手未歇，无暇服药。" };
    }
    if (Number(state.p0?.items?.return_spring_pill || 0) <= 0 && Number(state.alchemyPills || 0) <= 0) {
      return { visible: true, available: false, reason: "回春丹已经用尽。" };
    }
    const wound = (state.p0?.wounds || []).find((entry) => Number(entry.severity || 0) <= 2);
    if (!wound) return { visible: true, available: false, reason: "眼下没有需要稳定的轻中伤。" };
    return { visible: true, available: true, reason: "当前状态可使用", action: item.useAction };
  }

  return { visible: false, available: false, reason: "" };
}

export function createInventoryBoard(state = {}, options = {}) {
  const category = getInventoryCategory(options.category).id;
  const items = getInventoryItems(state);
  const filteredItems = category === "all"
    ? items
    : items.filter((item) => item.category === category);
  const requested = filteredItems.find((item) => item.id === options.selectedId);
  const selected = requested || filteredItems[0] || null;

  return {
    capacity: INVENTORY_CAPACITY,
    usedSlots: items.length,
    category: getInventoryCategory(category),
    categories: INVENTORY_CATEGORIES,
    items,
    filteredItems,
    selected,
    selectedQuality: selected ? INVENTORY_QUALITIES[selected.quality] : null,
    use: selected ? getInventoryUseState(selected.id, state) : { visible: false, available: false, reason: "" },
    silver: Math.max(0, Number(state.shenSilver || 0)),
  };
}

export function formatSilver(value) {
  const amount = Math.max(0, Number(value || 0));
  const whole = Math.floor(amount);
  const qian = Math.round((amount - whole) * 10);
  return qian > 0 ? `${whole}两 ${qian}钱` : `${whole}两`;
}
