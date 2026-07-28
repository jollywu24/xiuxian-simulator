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
    art: "./assets/inventory/family-jade.png",
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
    art: "./assets/inventory/blood-letter.png",
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
    art: "./assets/inventory/mountain-peach.png",
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
    art: "./assets/inventory/shen-token.png",
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
    art: "./assets/inventory/east-map.png",
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
    art: "./assets/inventory/return-spring-pill.png",
    detailArt: "./assets/inventory/return-spring-pill-detail.png",
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
    art: "./assets/inventory/purple-scale-herb.png",
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
    art: "./assets/inventory/blood-vine-core.png",
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
    art: "./assets/inventory/calm-pulse-sand.png",
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
    art: "./assets/inventory/purple-dragon-pill.png",
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
    art: "./assets/inventory/spring-rain-needles.png",
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
    art: "./assets/inventory/fish-scale-token.png",
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
    art: "./assets/inventory/monkey-wine.png",
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
    art: "./assets/inventory/ape-rubbing.png",
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
    art: "./assets/inventory/qingqing-book.png",
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
    art: "./assets/inventory/hundred-pills-notes.png",
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
    art: "./assets/inventory/hundred-pills-notes.png",
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
    art: "./assets/inventory/fish-scale-token.png",
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
    art: "./assets/inventory/east-map.png",
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
    art: "./assets/inventory/qingqing-book.png",
    description: "一本磨损严重的算术抄本，足以应付普通账目。",
    effect: "满足部分账房差事的基础门槛。",
  },
  branch_waist_token: {
    id: "branch_waist_token",
    name: "旁支旧腰牌",
    category: "token",
    typeName: "身份信物",
    quality: "fine",
    maxStack: 1,
    art: "./assets/inventory/shen-token.png",
    description: "木牌边角被摩挲得发亮，旧绳换过两次。它能让你进族宅侧门，却不能让主宅的人记住你的名字。",
    effect: "证明你出身世家旁支，也能辨认部分宅门旧规。",
  },
  copied_fist_manual: {
    id: "copied_fist_manual",
    name: "抄旧的拳谱",
    category: "clue",
    typeName: "武学抄本",
    quality: "common",
    maxStack: 1,
    art: "./assets/inventory/qingqing-book.png",
    description: "纸页缺了前后几张，墨色也不一致。旁支子弟只能轮着抄，能学到多少全看自己。",
    effect: "保留一段族中拳架的发力见闻，尚不足以成为可用武学。",
  },
  side_door_writ: {
    id: "side_door_writ",
    name: "侧门手令",
    category: "token",
    typeName: "门令",
    quality: "fine",
    maxStack: 1,
    art: "./assets/inventory/fish-scale-token.png",
    description: "只盖了半枚朱印的临时手令，认令不认人，用过便要收回。",
    effect: "可作为族宅侧门的一次正式通行凭证。",
  },
  sealed_medicine_box: {
    id: "sealed_medicine_box",
    name: "封药木匣",
    category: "token",
    typeName: "差事物",
    quality: "rare",
    maxStack: 1,
    art: "./assets/inventory/fish-scale-token.png",
    description: "乌木匣外绕着双股药绳，封蜡尚在。雨气里仍压不住一线苦香。",
    effect: "原样带回可完成西偏院交下的差事；封条状态会改变回宅后的安排。",
  },
  opened_medicine_box: {
    id: "opened_medicine_box",
    name: "拆封的药匣",
    category: "clue",
    typeName: "差事物",
    quality: "rare",
    maxStack: 1,
    art: "./assets/inventory/fish-scale-token.png",
    description: "封蜡已经断开，匣中药丸与夹层货签全都暴露出来。你知道了更多，也失去了原样交差的可能。",
    effect: "可作为药物流向的证据，但会提高族宅对你的警觉。",
  },
  fire_striker: {
    id: "fire_striker",
    name: "旧火镰",
    category: "tool",
    typeName: "随身工具",
    quality: "common",
    maxStack: 1,
    art: "./assets/inventory/spring-rain-needles.png",
    description: "刃口缺了一角，擦出的火星却还可靠。外港讨生活的人，很少把夜路交给别人的灯。",
    effect: "在潮湿环境中更容易保住火种。",
  },
  coarse_rations: {
    id: "coarse_rations",
    name: "粗粮饼",
    category: "medicine",
    typeName: "干粮",
    quality: "common",
    maxStack: 6,
    art: "./assets/inventory/mountain-peach.png",
    description: "掺了豆渣和粗盐，冷硬得硌牙，却能让人在雨夜多走几里。",
    effect: "市井出身随身携带的口粮。",
  },
  red_cord_sample: {
    id: "red_cord_sample",
    name: "红绳样",
    category: "token",
    typeName: "取货信物",
    quality: "fine",
    maxStack: 1,
    art: "./assets/inventory/fish-scale-token.png",
    description: "绳结看似随手，收口却藏着码头牙人的旧记号。",
    effect: "用来确认东郊破庙里的油布包。",
  },
  red_cord_package: {
    id: "red_cord_package",
    name: "红绳油布包",
    category: "token",
    typeName: "差事物",
    quality: "rare",
    maxStack: 1,
    art: "./assets/inventory/east-map.png",
    description: "油布裹得严实，红绳结法与样绳完全相同。包角透出极淡的药气。",
    effect: "可送往沈宅货门换取报酬与入门机会。",
  },
  opened_red_cord_package: {
    id: "opened_red_cord_package",
    name: "割开的油布包",
    category: "clue",
    typeName: "差事物",
    quality: "rare",
    maxStack: 1,
    art: "./assets/inventory/east-map.png",
    description: "红绳已经割断，里面是数枚不同货栈的药批签。有人在借一趟普通跑腿掩盖换货。",
    effect: "可用于追查沈宅货路，但原雇主不会再把你当成只会送货的人。",
  },
});

const LEGACY_ITEM_ALIASES = Object.freeze({
  return_spring_pills: "return_spring_pill",
});
const INVENTORY_ITEM_ORDER = Object.freeze(Object.keys(INVENTORY_ITEMS));

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
  if (Number(state.originSupplies || 0) > 0) addItem(items, "coarse_rations", state.originSupplies);
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

  return [...items.values()].sort((left, right) => (
    INVENTORY_ITEM_ORDER.indexOf(left.id) - INVENTORY_ITEM_ORDER.indexOf(right.id)
  ));
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
  const totalWen = Math.round(amount * 1000);
  const whole = Math.floor(totalWen / 1000);
  const wen = totalWen % 1000;
  return wen > 0 ? `${whole}两 ${wen}文` : `${whole}两`;
}
