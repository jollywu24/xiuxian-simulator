export const ORIGINS = [
  {
    id: "shen_branch",
    name: "世家旁支",
    tag: "世家旁支",
    cardImage: "./assets/creation-v1/origin-shen-branch-v1.webp",
    summary: "你生在世家旁支。小时候读过书，也跟族中教习练过几手拳脚。只是家里的田产一年少过一年，到了十六岁，该轮到你自己找出路了。",
    belongings: "旧式腰牌、抄旧的拳谱、二两银",
    opening: "金陵城南，一处族宅的西偏院",
    undertone: "今晚有人点你的名，不是为了抬举你。",
    taskName: "取回封药木匣",
    taskId: "sealed_medicine_box",
    startScreen: "shenOriginArrival",
  },
  {
    id: "streetborn",
    name: "市井子弟",
    tag: "市井",
    cardImage: "./assets/creation-v1/origin-streetborn-v1.webp",
    summary: "你在金陵外城长大，给鱼贩看过摊，也跟码头伙计搬过货。你认得几条省脚程的小路，也知道城里哪些人不能轻易招惹。",
    belongings: "火镰、两块粗粮、红绳样",
    opening: "秦淮外港，收摊后的鱼市",
    undertone: "一趟看似寻常的跑腿，价钱高得不像好事。",
    taskName: "取回红绳油布包",
    taskId: "red_cord_package",
    startScreen: "streetOriginMarket",
  },
  {
    id: "mystery",
    name: "身世成谜",
    tag: "残忆",
    cardImage: "./assets/creation-v1/origin-mystery-v1.webp",
    summary: "十六岁以前的事，你只记得零碎几段。偶尔见到某些笔迹、听见某些名字，会觉得自己以前遇见过。除此之外，没人能说清你的来历。",
    belongings: "半块玉佩、染血旧书、三枚山桃",
    opening: "金陵东郊，一座漏雨的破庙",
    undertone: "有人抹掉了你的来路，却没来得及收走所有东西。",
    taskName: "查清随身旧物",
    taskId: "broken_memory",
    startScreen: "templeWake",
  },
];

export const LEGACY_ORIGIN_IDS = {
  clan: "shen_branch",
  common: "streetborn",
  street: "streetborn",
  mystery: "mystery",
  shen_branch: "shen_branch",
  streetborn: "streetborn",
};

export const ORIGIN_PROLOGUE_SCREENS = new Set([
  "shenOriginArrival",
  "shenOriginBriefing",
  "shenOriginPreparation",
  "shenOriginRoad",
  "streetOriginMarket",
  "streetOriginOffer",
  "streetOriginBargain",
  "streetOriginRoute",
  "eastRoadPorter",
  "originTempleTask",
]);

export const ORIGIN_RETURN_SCREENS = new Set([
  "shenOriginReturn",
  "shenOriginPlacement",
  "streetOriginDelivery",
  "streetOriginEntry",
  "originPersonalEvent",
]);

export const ORIGIN_SCENES = {
  shen_branch: {
    id: "shen_west_courtyard",
    title: "城南族宅 · 西偏院",
    image: "./assets/origins/shen-west-courtyard-v1.webp",
    imageAspect: 5 / 4,
    alt: "雨夜里狭窄的族宅西偏院，旧屋、腰牌和远处灯火分隔出旁支与主宅",
  },
  streetborn: {
    id: "qinhuai_fish_market",
    title: "秦淮外港 · 鱼市",
    image: "./assets/origins/qinhuai-fish-market-v1.webp",
    imageAspect: 5 / 4,
    alt: "雨夜收摊后的秦淮鱼市，鱼摊、经纪、码头与归路都浸在水光里",
  },
};

export const ORIGIN_PROLOGUES = {
  shen_branch: {
    shenOriginArrival: {
      kicker: "西偏院 · 戌初",
      title: "有人在雨里点了你的名",
      text: "西偏院的瓦漏了三处，主宅的灯却亮得像白昼。门房隔着雨帘喊你过去——旁支子弟平日轮不到这声传唤。",
      choices: [
        { id: "study_token", title: "先看腰牌上的旧刻痕", meta: "见闻", detail: "这块腰牌换过绳，却没换过主人。旧刻痕能告诉你，今夜是谁越过管事点了你的名。" },
        { id: "ask_door", title: "替门房收起被雨打湿的名册", meta: "人情", detail: "先替人省一桩麻烦，再问自己的麻烦从哪里来。" },
        { id: "answer_call", title: "披衣应门，不让主宅久等", meta: "谨慎", detail: "旁支最先学会的不是拳，是别让人抓住迟到的把柄。" },
      ],
    },
    shenOriginBriefing: {
      kicker: "西偏院 · 门廊",
      title: "一只木匣，换一次被看见",
      text: "管事只说东郊破庙里遗下一只封药木匣，天亮前要原样取回。谁丢的、匣里装什么，他一字不提。",
      choices: [
        { id: "accept_brief", title: "接下差事，只问木匣模样", meta: "稳妥", detail: "少问一句，便少给人一分防备。" },
        { id: "ask_seal", title: "问清封条是谁家的规矩", meta: "悟性", detail: "若封条不是族中旧式，这趟差事就不只是取物。" },
        { id: "request_writ", title: "讨一张出入侧门的手令", meta: "门路", detail: "事情成不成另说，先把以后能用的门留下。" },
      ],
    },
    shenOriginPreparation: {
      kicker: "西偏院 · 出门前",
      title: "二两银，够买一次周全",
      text: "雨还没停。你只能带一样东西上路：护匣的油布、撑过后半夜的干粮，或者把银子留到更要命的时候。",
      choices: [
        { id: "buy_oilcloth", title: "花二钱买一幅旧油布", meta: "银两 -0.2两", detail: "木匣怕水。若封条还完好，这幅油布能替你保住它。" },
        { id: "buy_rations", title: "花三钱添两块粗粮", meta: "银两 -0.3两", detail: "东郊往返不近。腹中有食，才有余力管路上的闲事。" },
        { id: "save_silver", title: "一文不花，把银子贴身收好", meta: "银两不变", detail: "江湖上最有用的准备，有时就是没把退路提前花掉。" },
      ],
    },
    shenOriginRoad: {
      kicker: "城南至东郊 · 雨路",
      title: "出城以后，族规管不到泥里",
      text: "去破庙有三条走法。驿路最快，也最容易留下行迹；避雨绕行更稳；跟着车辙走，或许能知道木匣是谁遗下的。",
      choices: [
        { id: "take_post_road", title: "沿驿路直奔东郊", meta: "时辰", detail: "抢在雨水毁掉封条之前赶到。" },
        { id: "take_shelter_path", title: "贴着废窑和屋檐绕行", meta: "体力", detail: "慢一刻，少淋一身冷雨。" },
        { id: "follow_cart_tracks", title: "循着新车辙追过去", meta: "见闻 · 暴露 +1", detail: "知道得更多，也更容易让前面的人知道有人跟来。" },
      ],
    },
  },
  streetborn: {
    streetOriginMarket: {
      kicker: "秦淮外港 · 酉末",
      title: "鱼市收摊以后，消息才开价",
      text: "雨把腥气压在青石上。最后一批鱼贩正在收秤，牙人却还守着灯，像是在等一个不会被人记住的跑腿。",
      choices: [
        { id: "help_fisher", title: "先替老渔人压住翻倒的鱼篓", meta: "人情", detail: "码头上先伸手的人，往往比先开口的人听见更多。" },
        { id: "count_boats", title: "数一遍今夜提前离港的船", meta: "见闻", detail: "空泊位有时比满船货更会说话。" },
        { id: "meet_broker", title: "径直走到牙人的灯下", meta: "时辰", detail: "不装路过，也不给他临时压价的机会。" },
      ],
    },
    streetOriginOffer: {
      kicker: "秦淮外港 · 鱼棚",
      title: "八百文，只取一个油布包",
      text: "牙人把一截红绳推到你面前：东郊破庙，供桌后，新灰墙根。包要原样带回，天亮前交到沈宅货门。",
      choices: [
        { id: "accept_offer", title: "收下红绳样，不问雇主", meta: "稳妥", detail: "跑腿只认货和价，是市井里最旧的规矩。" },
        { id: "name_price", title: "先问为何值八百文", meta: "口风", detail: "价钱高得反常。让他自己解释，便能听出哪句话事先背过。" },
        { id: "inspect_cargo_tag", title: "看一眼他袖口露出的货签", meta: "见闻", detail: "货签上的泊位与牙人说的来路未必一样。" },
      ],
    },
    streetOriginBargain: {
      kicker: "秦淮外港 · 灯下",
      title: "先把退路谈进价钱里",
      text: "牙人肯先付四百文，但要你留下常走的渡口。你也可以只记红绳的结法，或者不拿定钱，换一个干净的退身。",
      choices: [
        { id: "take_advance", title: "收四百文定钱，报一处假渡口", meta: "银两 +0.4两 · 暴露 +1", detail: "钱是真的，渡口是假的；可对方会记住你撒谎时的样子。" },
        { id: "memorize_knot", title: "不碰定钱，只记红绳结法", meta: "见闻", detail: "能被仿造的信物，迟早能替你开第二道门。" },
        { id: "refuse_deposit", title: "不拿定钱，只要货门暗号", meta: "门路", detail: "少四百文，多一条以后还能走的路。" },
      ],
    },
    streetOriginRoute: {
      kicker: "外港至东郊 · 雨路",
      title: "快路、暗路和人情路",
      text: "破庙不远，却有三种到法。走河堤最快；穿货栈不显眼；绕老渔人的船棚，会迟一点，但有人能替你看身后。",
      choices: [
        { id: "take_embankment", title: "沿河堤抄近路", meta: "时辰", detail: "让雨洗掉脚印，在更大的雨来前进庙。" },
        { id: "take_warehouses", title: "穿过关门的货栈", meta: "藏踪", detail: "檐下无雨，却可能撞见不该看见的货。" },
        { id: "take_fisher_route", title: "绕老渔人的船棚", meta: "人情", detail: "慢一些，换一句“后面没人跟你”。" },
      ],
    },
  },
};

export const ORIGIN_TEMPLE_CHOICES = {
  shen_branch: [
    { id: "take_box_intact", title: "不动封条，连匣带灰包起", meta: "差事完成", detail: "你只取自己该取的东西。若备了油布，木匣能原样回去。" },
    { id: "inspect_box_seal", title: "借火辨认封蜡和药气", meta: "悟性 · 有代价", detail: "不拆封，也能从蜡痕与苦香看出木匣曾被人换手。" },
    { id: "open_box", title: "撬开木匣，先知道自己替谁卖命", meta: "危险 · 暴露 +2", detail: "答案拿得到，原样交差的机会却会当场失去。" },
  ],
  streetborn: [
    { id: "take_package_intact", title: "对照红绳，原样收起油布包", meta: "差事完成", detail: "绳结、油布和牙人给的样子全对。你可以不替好奇心付账。" },
    { id: "inspect_package_seam", title: "只挑开外层线脚，闻一闻夹层", meta: "见闻 · 暴露 +1", detail: "包仍能交，只是缝口会留下懂行人看得出的手脚。" },
    { id: "open_package", title: "割断红绳，把里面的东西看清", meta: "危险 · 暴露 +2", detail: "这趟跑腿从此不再是一桩跑腿，你也不再只是送货的人。" },
  ],
};

export const ORIGIN_LADY_INSIGHTS = {
  shen_branch: {
    title: "先看她鞋底沾的漆灰",
    meta: "出身 · 世家旁支",
    detail: "那不是荒路泥，是大宅修廊常用的青砖漆灰。她今夜到过一处讲规矩的门庭。",
    knowledge: "lady_courtyard_dust",
  },
  streetborn: {
    title: "从雨声里分辨有没有第二道脚步",
    meta: "出身 · 市井子弟",
    detail: "门外只有她一个人。没有追兵，不代表她没有来意。",
    knowledge: "lady_came_alone",
  },
  mystery: {
    title: "把半块玉佩压回衣襟",
    meta: "出身 · 残忆",
    detail: "她的目光在玉佩上停了半瞬。她或许认得这东西，却在等你先问。",
    knowledge: "lady_noticed_jade",
  },
};

export const ORIGIN_PERSONAL_EVENTS = {
  shen_branch: {
    kicker: "沈家密会之后",
    title: "旁谱缺名",
    text: "你在送回的旧册里看见同一页被刮过两次。与你同辈的旁支都有名字，唯独本该属于你的那一行，只剩一道逆着纸纹的刀痕。",
    choices: [
      { id: "trace_missing_name", title: "顺着墨色查是谁重抄了旁谱", meta: "见闻", detail: "先查动手的人，再问为什么。" },
      { id: "hide_genealogy_leaf", title: "暗藏这一页，不惊动管事", meta: "藏踪", detail: "把疑问留在自己手里，也把被发现的风险带在身上。" },
      { id: "ask_shen_fu_origin", title: "拿刀痕去试探沈福", meta: "关系", detail: "他若知道，会先开价；他若不知道，会先害怕。" },
    ],
  },
  streetborn: {
    kicker: "沈家密会之后",
    title: "鱼市催信",
    text: "一个送菜小童把湿透的鱼鳞塞进你手里。老渔人只托来一句：牙人换了灯，昨夜问过你的人却还守着原来的泊位。",
    choices: [
      { id: "answer_fish_market", title: "托小童带回一句旧暗号", meta: "联系人", detail: "告诉鱼市你还活着，也告诉盯梢的人你仍会说假话。" },
      { id: "burn_fish_scale", title: "当面烧掉鱼鳞，不留回信", meta: "藏踪", detail: "断一条来路，换沈家里几日安静。" },
      { id: "redirect_broker", title: "把催信引向沈福常走的货门", meta: "借势 · 暴露 +1", detail: "让两条都不干净的路先撞在一起。" },
    ],
  },
  mystery: {
    kicker: "沈家密会之后",
    title: "血书旧字",
    text: "密会名册上的一个旧字，和血书背面被血糊住的笔画同出一手。写信的人来过沈家，而且不是客人。",
    choices: [
      { id: "compare_old_hand", title: "借灯拓下那一笔旧字", meta: "见闻", detail: "把猜测变成以后能与别人对照的证据。" },
      { id: "ask_cao_old_hand", title: "拿笔画去问曹青", meta: "关系", detail: "他会先问你愿意用什么换答案。" },
      { id: "conceal_blood_letter", title: "暂不追问，先藏好血书", meta: "藏踪", detail: "线索不会自己逃走，盯着线索的人却会。" },
    ],
  },
};

export function getOrigin(id) {
  return ORIGINS.find((origin) => origin.id === id) || null;
}

export function normalizeOriginId(id) {
  return LEGACY_ORIGIN_IDS[id] || null;
}

export function createOriginProgress(originId = null, { completed = false } = {}) {
  const origin = getOrigin(originId);
  return {
    started: Boolean(origin),
    completed: Boolean(origin && completed),
    nodeId: origin?.startScreen || null,
    taskId: origin?.taskId || null,
    taskState: originId === "mystery" ? "in_progress" : origin ? "unassigned" : "not_started",
    preparationIds: [],
    discoveredFactIds: [],
    choiceIds: [],
    convergenceState: completed ? "temple_joined" : "not_joined",
    personalEventComplete: false,
    returnComplete: false,
  };
}

function unique(values = []) {
  return [...new Set((Array.isArray(values) ? values : []).filter(Boolean))];
}

export function migrateOriginState(saved = {}) {
  const originId = normalizeOriginId(saved.originId || saved.backgroundId);
  const leftTemple = Boolean(
    saved.screen
    && ![
      "landing",
      "worldIntro",
      "characterDraft",
      "originSelect",
      "vow",
      "destiny",
      "characterSheet",
      "templeWake",
      "fateSight",
      "allocation",
      "originTempleTask",
      "templeTasks",
      ...ORIGIN_PROLOGUE_SCREENS,
    ].includes(saved.screen),
  );
  const fallbackProgress = createOriginProgress(originId, { completed: leftTemple });
  const incoming = saved.originPrologue && typeof saved.originPrologue === "object" ? saved.originPrologue : {};
  const progress = {
    ...fallbackProgress,
    ...incoming,
    started: Boolean(originId && (incoming.started ?? true)),
    completed: Boolean(incoming.completed ?? leftTemple),
    preparationIds: unique(incoming.preparationIds),
    discoveredFactIds: unique(incoming.discoveredFactIds),
    choiceIds: unique(incoming.choiceIds),
  };
  if (progress.completed && progress.convergenceState === "not_joined") progress.convergenceState = "temple_joined";
  return {
    originId,
    backgroundId: originId,
    originPrologue: progress,
    originKnowledge: unique(saved.originKnowledge),
    originAccess: unique(saved.originAccess),
    originContacts: saved.originContacts && typeof saved.originContacts === "object" ? { ...saved.originContacts } : {},
    originExposure: Math.max(0, Number(saved.originExposure || 0)),
    originEchoes: unique(saved.originEchoes),
    openingAttributePool: 3,
    originSupplies: Math.max(0, Number(saved.originSupplies || 0)),
  };
}

function updateProgress(progress, choiceId, nextScreen, updates = {}) {
  return {
    ...createOriginProgress(updates.originId || null),
    ...(progress || {}),
    nodeId: nextScreen,
    taskState: updates.taskState ?? progress?.taskState,
    preparationIds: unique([...(progress?.preparationIds || []), ...(updates.preparationIds || [])]),
    discoveredFactIds: unique([...(progress?.discoveredFactIds || []), ...(updates.discoveredFactIds || [])]),
    choiceIds: unique([...(progress?.choiceIds || []), choiceId]),
    completed: Boolean(updates.completed ?? progress?.completed),
    convergenceState: updates.convergenceState ?? progress?.convergenceState,
  };
}

const PROLOGUE_RESULTS = {
  study_token: { next: "shenOriginBriefing", facts: ["waist_token_recut"] },
  ask_door: { next: "shenOriginBriefing", contact: ["side_door_keeper", 1] },
  answer_call: { next: "shenOriginBriefing" },
  accept_brief: { next: "shenOriginPreparation", taskState: "assigned" },
  ask_seal: { next: "shenOriginPreparation", taskState: "assigned", facts: ["seal_not_from_branch"], exposure: 1 },
  request_writ: { next: "shenOriginPreparation", taskState: "assigned", access: ["shen_side_door_writ"] },
  buy_oilcloth: { next: "shenOriginRoad", silver: -0.2, prep: ["oilcloth"] },
  buy_rations: { next: "shenOriginRoad", silver: -0.3, supplies: 2, prep: ["extra_rations"] },
  save_silver: { next: "shenOriginRoad", prep: ["kept_silver"] },
  take_post_road: { next: "templeWake", prep: ["arrived_early"] },
  take_shelter_path: { next: "templeWake", prep: ["kept_dry"] },
  follow_cart_tracks: { next: "templeWake", facts: ["medicine_cart_tracks"], exposure: 1 },
  help_fisher: { next: "streetOriginOffer", contact: ["old_fisher", 1] },
  count_boats: { next: "streetOriginOffer", facts: ["missing_night_boat"] },
  meet_broker: { next: "streetOriginOffer" },
  accept_offer: { next: "streetOriginBargain", taskState: "assigned" },
  name_price: { next: "streetOriginBargain", taskState: "assigned", facts: ["broker_rehearsed_answer"] },
  inspect_cargo_tag: { next: "streetOriginBargain", taskState: "assigned", facts: ["cargo_tag_wrong_berth"], exposure: 1 },
  take_advance: { next: "streetOriginRoute", silver: 0.4, exposure: 1, prep: ["false_ferry_named"] },
  memorize_knot: { next: "streetOriginRoute", facts: ["red_cord_knot"] },
  refuse_deposit: { next: "streetOriginRoute", access: ["shen_cargo_gate_password"] },
  take_embankment: { next: "templeWake", prep: ["arrived_early"] },
  take_warehouses: { next: "templeWake", facts: ["sealed_night_cargo"] },
  take_fisher_route: { next: "templeWake", contact: ["old_fisher", 1], prep: ["tail_checked"] },
};

export function resolveOriginPrologueChoice(originId, screen, choiceId, context = {}) {
  const origin = getOrigin(originId);
  const choiceExists = ORIGIN_PROLOGUES[originId]?.[screen]?.choices?.some((choice) => choice.id === choiceId);
  const result = PROLOGUE_RESULTS[choiceId];
  if (!origin || !choiceExists || !result) return { available: false, reason: "眼下不能这样做。" };
  const silver = Number(context.silver || 0);
  if (silver + Number(result.silver || 0) < 0) return { available: false, reason: "身上的银钱不够。" };
  return {
    available: true,
    nextScreen: result.next,
    progress: updateProgress(context.progress, choiceId, result.next, {
      originId,
      taskState: result.taskState,
      preparationIds: result.prep,
      discoveredFactIds: result.facts,
    }),
    silverDelta: Number(result.silver || 0),
    suppliesDelta: Number(result.supplies || 0),
    exposureDelta: Number(result.exposure || 0),
    knowledgeIds: unique(result.facts),
    accessIds: unique(result.access),
    contact: result.contact || null,
  };
}

export function resolveOriginTempleTask(originId, choiceId, progress = {}) {
  const exists = ORIGIN_TEMPLE_CHOICES[originId]?.some((choice) => choice.id === choiceId);
  if (!exists || progress.completed) return { available: false, reason: "这件事已经有了结果。" };
  const outcomes = {
    take_box_intact: { taskState: "success", itemId: "sealed_medicine_box", echo: "封药木匣原样取回" },
    inspect_box_seal: { taskState: "costly_success", itemId: "sealed_medicine_box", fact: "box_changed_hands", exposure: 1, echo: "辨出木匣曾经换手" },
    open_box: { taskState: "failed_forward", itemId: "opened_medicine_box", fact: "box_contains_bitter_pills", exposure: 2, echo: "拆开木匣，失去原样交差的可能" },
    take_package_intact: { taskState: "success", itemId: "red_cord_package", echo: "红绳油布包原样取回" },
    inspect_package_seam: { taskState: "costly_success", itemId: "red_cord_package", fact: "package_smells_of_medicine", exposure: 1, echo: "挑开线脚，闻出包中药气" },
    open_package: { taskState: "failed_forward", itemId: "opened_red_cord_package", fact: "package_contains_cargo_tokens", exposure: 2, echo: "割断红绳，看见包中货签" },
  };
  const outcome = outcomes[choiceId];
  return {
    available: true,
    itemId: outcome.itemId,
    factId: outcome.fact || null,
    exposureDelta: outcome.exposure || 0,
    echo: outcome.echo,
    progress: updateProgress(progress, choiceId, "templeTasks", {
      originId,
      taskState: outcome.taskState,
      discoveredFactIds: outcome.fact ? [outcome.fact] : [],
      completed: true,
      convergenceState: "temple_joined",
    }),
  };
}

export function resolveOriginPersonalEvent(originId, choiceId, progress = {}) {
  const exists = ORIGIN_PERSONAL_EVENTS[originId]?.choices?.some((choice) => choice.id === choiceId);
  if (!exists || progress.personalEventComplete) return { available: false, reason: "这道旧痕已经留下了你的选择。" };
  const resultMap = {
    trace_missing_name: { knowledge: "genealogy_recopied", echo: "追查旁谱缺名的重抄者" },
    hide_genealogy_leaf: { knowledge: "genealogy_leaf_hidden", exposure: 1, echo: "暗藏被刮去名字的旁谱" },
    ask_shen_fu_origin: { contact: ["shen_fu", 1], echo: "以旁谱刀痕试探沈福" },
    answer_fish_market: { contact: ["old_fisher", 1], exposure: 1, echo: "向鱼市回了一句旧暗号" },
    burn_fish_scale: { access: "fish_market_contact_closed", echo: "烧掉鱼鳞，暂断鱼市来路" },
    redirect_broker: { knowledge: "broker_redirected_to_shen_fu", exposure: 1, echo: "把鱼市盯梢引向沈福货门" },
    compare_old_hand: { knowledge: "blood_letter_hand_confirmed", echo: "拓下与血书同源的旧字" },
    ask_cao_old_hand: { contact: ["cao_qing", 1], echo: "拿血书旧字试探曹青" },
    conceal_blood_letter: { access: "blood_letter_concealed", echo: "藏好血书，暂缓追问" },
  };
  const result = resultMap[choiceId] || {};
  return {
    available: true,
    knowledgeId: result.knowledge || null,
    accessId: result.access || null,
    contact: result.contact || null,
    exposureDelta: result.exposure || 0,
    echo: result.echo,
    progress: {
      ...updateProgress(progress, choiceId, "shenFuChoice", { originId }),
      personalEventComplete: true,
    },
  };
}
