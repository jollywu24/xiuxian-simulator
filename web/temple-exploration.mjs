const ORIGIN_IDS = new Set(["shen_branch", "streetborn", "mystery"]);

export const TEMPLE_SITUATION_LIMIT = 8;

export const TEMPLE_AREAS = Object.freeze([
  Object.freeze({
    id: "forecourt",
    name: "庙前",
    short: "庙前",
    summary: "雨水横扫门阶。门洞、破窗和塌墙把这里变成了破庙唯一能听清外面动静的地方。",
  }),
  Object.freeze({
    id: "hall",
    name: "大殿",
    short: "大殿",
    summary: "将熄的余火照着供桌与残像。能取暖的、能藏东西的、能临时拆用的，都在这片火光里。",
  }),
  Object.freeze({
    id: "rear",
    name: "庙后",
    short: "庙后",
    summary: "雨从后墙裂口灌进来。柴堆、暗墙和旧井挤在阴影里，地上的痕迹比殿内更新。",
  }),
]);

const ACTIONS = Object.freeze({
  listen_at_gate: Object.freeze({
    id: "listen_at_gate",
    title: "贴着门框听一阵",
    description: "分清雨声、狼嚎和远处偶尔断掉的脚步。",
    cost: 1,
    nextStage: "heard",
    outcome: "你避开檐角落水，贴着门框听了片刻。狼嚎在北面，东边官道却有一阵脚步忽然停了。",
  }),
  trace_rain_tracks: Object.freeze({
    id: "trace_rain_tracks",
    title: "沿泥印辨来路",
    description: "趁大雨还没把边缘冲平，看清这些人从哪里进、往哪里走。",
    cost: 1,
    nextStage: "traced",
    outcome: "泥印一深一浅，至少两个人抬过重物。他们没进大殿，而是绕去了庙后。",
  }),
  inspect_window: Object.freeze({
    id: "inspect_window",
    title: "摸清破窗的松动处",
    description: "先知道风从哪里灌进来，也记住窗框哪一脚最容易踹开。",
    cost: 1,
    nextStage: "measured",
    outcome: "窗框下沿已经腐透。挡住它能保火，真到要走时，一脚也能把整扇木框踹进雨里。",
  }),
  brace_window: Object.freeze({
    id: "brace_window",
    title: "用碎木暂时顶住破窗",
    description: "压住灌进来的风，让殿里的火与声音都更稳一些。",
    cost: 1,
    requiresStage: "measured",
    nextStage: "braced",
    outcome: "碎木卡进窗框，冷风顿时小了。木框仍能从里面撞开，只是外头很难再看清殿内火光。",
  }),
  inspect_breach: Object.freeze({
    id: "inspect_breach",
    title: "试一试塌墙后的窄口",
    description: "看它是死角，还是能在危急时钻出去的退路。",
    cost: 1,
    nextStage: "measured",
    outcome: "碎砖后不是死墙。侧身能过，只是衣摆一定会刮上新灰，跑急了还会崴脚。",
  }),
  clear_breach: Object.freeze({
    id: "clear_breach",
    title: "清开最碍事的两块砖",
    description: "花些时间，把勉强能钻的裂口变成真正可走的退路。",
    cost: 2,
    requiresStage: "measured",
    nextStage: "cleared",
    outcome: "你托住上沿，抽出两块松砖。裂口仍不显眼，却已经够一个人俯身穿过去。",
  }),
  tend_embers: Object.freeze({
    id: "tend_embers",
    title: "拨开湿灰，救回余火",
    description: "把炭心聚拢，再用干草接住火星。",
    cost: 1,
    nextStage: "kindled",
    outcome: "炭心重新透红，火光从湿灰下面拱了出来。它能照明，也会让门外的人更容易发现这里有人。",
  }),
  bank_embers: Object.freeze({
    id: "bank_embers",
    title: "把火压成一层暗红",
    description: "留住温度，收起会穿过门窗的亮光。",
    cost: 1,
    requiresStage: "kindled",
    nextStage: "banked",
    outcome: "你把细灰覆在炭上，明火沉了下去。殿里暗了，炭心却没有灭。",
  }),
  inspect_offerings: Object.freeze({
    id: "inspect_offerings",
    title: "细看供桌上的新鲜山桃",
    description: "荒庙无人打理，桃蒂上的水却不是屋顶漏下来的。",
    cost: 1,
    nextStage: "inspected",
    outcome: "桃蒂还绿，果皮也没有冻裂。送桃的人来过不久，并且知道大殿哪一处不会漏雨。",
  }),
  inspect_rack: Object.freeze({
    id: "inspect_rack",
    title: "检查倾斜的香架",
    description: "看看它为何没倒，也看看里面是否压着别的东西。",
    cost: 1,
    nextStage: "measured",
    outcome: "倒在供桌下的香架，一脚被细麻绳系着。绳结很新，架身却已经松得能整块卸下。",
  }),
  loosen_rack: Object.freeze({
    id: "loosen_rack",
    title: "割松麻绳，保留香架",
    description: "不把它立刻拆散，只让自己之后一扯就能取下。",
    cost: 1,
    requiresStage: "measured",
    nextStage: "loosened",
    outcome: "麻绳只剩最后一绞。香架看起来仍在原处，真要用时却能顺手扯下来。",
  }),
  inspect_statue: Object.freeze({
    id: "inspect_statue",
    title: "绕到残像背后",
    description: "正面满是积灰，背面的灰却被什么东西蹭掉了一块。",
    cost: 2,
    nextStage: "inspected",
    outcome: "残像背后的灰痕齐腰高，像有人曾靠在这里等雨。石座下还压着半枚被踩裂的货签。",
  }),
  sort_woodpile: Object.freeze({
    id: "sort_woodpile",
    title: "从湿柴里拣出干芯",
    description: "外层全湿，贴墙的几根木芯或许还能烧。",
    cost: 1,
    nextStage: "sorted",
    outcome: "你拆开最外层湿柴，找到三根尚干的木芯，也看见柴堆底下有被重物压过的凹痕。",
  }),
  hide_in_woodpile: Object.freeze({
    id: "hide_in_woodpile",
    title: "把柴堆重新码出夹层",
    description: "不藏东西，只先留一个伸手可取、外面看不出的空位。",
    cost: 1,
    requiresStage: "sorted",
    nextStage: "hollowed",
    outcome: "湿柴被你原样码回去，中间却多出一处空腔。除非有人把整堆柴踢散，否则看不出来。",
  }),
  inspect_wall: Object.freeze({
    id: "inspect_wall",
    title: "比较新旧砖缝",
    description: "墙灰颜色不一，先判断这里究竟补过什么。",
    cost: 1,
    nextStage: "measured",
    outcome: "新灰只封了半臂宽，里面传回空响。有人不是在补墙，而是在把一件东西留在墙里。",
  }),
  sound_wall: Object.freeze({
    id: "sound_wall",
    title: "沿空响找出夹层边界",
    description: "不蛮力砸墙，只用碎瓦逐寸轻叩。",
    cost: 2,
    requiresStage: "measured",
    nextStage: "mapped",
    outcome: "空响在膝上三寸处收住。夹层不大，砖也不是承重墙；有合适工具便能拆开，不必敲上一千次。",
  }),
  test_well: Object.freeze({
    id: "test_well",
    title: "看清缸沿与水色",
    description: "陶缸接着檐水，缸沿却搭着一截刚换过的细绳。",
    cost: 1,
    nextStage: "tested",
    outcome: "缸水混着瓦灰，不能直接入口。细绳却是新换的，绳尾还沾着和暗墙边一样的黑泥。",
  }),
  inspect_scratches: Object.freeze({
    id: "inspect_scratches",
    title: "借瓦光辨梁下抓痕",
    description: "痕迹高过人肩，得踩上井栏才能看清。",
    cost: 2,
    nextStage: "inspected",
    outcome: "抓痕不是刀刻，也不像兽爪。三道旧痕之间夹着一道新痕，边缘还留着极细的金褐毛。",
  }),
  follow_blood_trail: Object.freeze({
    id: "follow_blood_trail",
    title: "沿着淡血痕找到来处",
    description: "雨水正把石阶上的血冲淡。循着墙根找过去，看看留下血的人是否还活着。",
    cost: 1,
    nextStage: "followed",
    outcome: "血痕绕到柴堆背后。一个脚夫侧倒在破油布上，左臂和小腿都在渗血，翻散的药篓压住了半边衣角。",
  }),
});

export const TEMPLE_OBJECTS = Object.freeze([
  Object.freeze({ id: "doorway", areaId: "forecourt", label: "雨中的庙门", x: 77, y: 44, initialDetail: "门外一片雨幕。狼嚎与风声搅在一起，偶尔又像夹着人的脚步。", actionIds: ["listen_at_gate"] }),
  Object.freeze({ id: "rain_tracks", areaId: "forecourt", label: "门阶泥印", x: 71, y: 72, initialDetail: "几道泥印被雨水冲得发白，却仍能看出有人抬着重物绕过门前。", actionIds: ["trace_rain_tracks"] }),
  Object.freeze({ id: "broken_window", areaId: "forecourt", label: "漏风的破窗", x: 23, y: 42, initialDetail: "窗纸早烂了，木框在风里轻撞墙面。这里既漏风，也是一处够近的出口。", actionIds: ["inspect_window", "brace_window"] }),
  Object.freeze({ id: "collapsed_wall", areaId: "forecourt", label: "半塌侧墙", x: 15, y: 67, initialDetail: "藤蔓和碎砖堵着一道窄缝。外面通向庙侧荒坡，里面暂时看不清是否能过人。", actionIds: ["inspect_breach", "clear_breach"] }),
  Object.freeze({ id: "embers", areaId: "hall", label: "将熄的余火", x: 51.8, y: 72.5, initialDetail: "炭心只剩一点红。拨亮能取暖照明，也会把人的影子送到门窗上。", actionIds: ["tend_embers", "bank_embers"] }),
  Object.freeze({ id: "offering_table", areaId: "hall", label: "无像供桌", x: 25.5, y: 49.5, initialDetail: "供桌上没有神像，却摆着几枚新鲜山桃。桃子与这座荒庙一样不合时宜。", actionIds: ["inspect_offerings"] }),
  Object.freeze({ id: "incense_rack", areaId: "hall", label: "供桌下的香架", x: 26.5, y: 61.5, initialDetail: "香架倒在供桌下，一脚被细绳系住，没有积起应有的灰。", actionIds: ["inspect_rack", "loosen_rack"] }),
  Object.freeze({ id: "deity_statue", areaId: "hall", label: "断首残像", x: 13.5, y: 50, initialDetail: "石像只剩半身，断口很旧，背后的灰却像被衣物蹭过。", actionIds: ["inspect_statue"] }),
  Object.freeze({ id: "woodpile", areaId: "rear", label: "贴墙湿柴", x: 29, y: 68, initialDetail: "柴火外湿内干，底下压出一个方正凹痕，像曾经搁过木匣。", actionIds: ["sort_woodpile", "hide_in_woodpile"] }),
  Object.freeze({ id: "patched_wall", areaId: "rear", label: "新砌暗墙", x: 54.5, y: 41, initialDetail: "这片墙灰比别处更深，新旧砖缝对不上。墙后像是空的。", actionIds: ["inspect_wall", "sound_wall"] }),
  Object.freeze({ id: "blood_trail", areaId: "rear", label: "石阶旧血", x: 86, y: 70, initialDetail: "几滴暗红从后门石阶一直拖到柴堆背面，边缘正被檐水一点点冲散。", actionIds: ["follow_blood_trail"] }),
  Object.freeze({ id: "roof_scratches", areaId: "rear", label: "梁下抓痕", x: 68, y: 24, initialDetail: "三道抓痕高过人肩，雨水打不到那里，痕迹一直留到了现在。", actionIds: ["inspect_scratches"] }),
]);

const OBJECT_BY_ID = new Map(TEMPLE_OBJECTS.map((object) => [object.id, object]));
const ACTION_BY_ID = new Map(Object.values(ACTIONS).map((action) => [action.id, action]));

const TIME_LABELS = Object.freeze([
  "亥时",
  "亥时一刻",
  "亥时二刻",
  "亥时三刻",
  "子时",
  "子时一刻",
  "子时二刻",
  "子时三刻",
  "丑时将尽",
]);

const PHASE_EVENTS = Object.freeze([
  Object.freeze({ at: 4, id: "driving_rain", text: "雨势忽然压低，檐水连成一道白帘。庙外旧痕正在被冲掉。" }),
  Object.freeze({ at: 7, id: "footsteps", text: "雨声里多出一阵不紧不慢的脚步，正沿东面官道靠近。" }),
  Object.freeze({ at: TEMPLE_SITUATION_LIMIT, id: "arrival", text: "你刚收回手，门外的脚步已经停在石阶下。来人没有敲门。" }),
]);

const CASKET_ACTIONS = Object.freeze({
  inspect_casket: Object.freeze({
    id: "inspect_casket",
    title: "不动封口，细查木匣",
    description: "先看蜡色、绳结和匣角泥痕；多知道一层，也多留一层摸动的痕迹。",
    cost: 1,
  }),
  take_casket_intact: Object.freeze({
    id: "take_casket_intact",
    title: "原样收起乌沉药匣",
    description: "不碰封蜡，把木匣带在身上。此后谁来搜庙，都要先过你这一关。",
    cost: 1,
  }),
  open_casket: Object.freeze({
    id: "open_casket",
    title: "拆开封蜡与夹层",
    description: "看清匣里装了什么，但原样交出去的路会就此断掉。",
    cost: 2,
  }),
});

const PORTER_ACTIONS = Object.freeze({
  rescue_porter: Object.freeze({
    id: "rescue_porter",
    title: "撕下里衣，替他扎住伤口",
    description: "救人要花两刻，也会失去一块御寒内衬；他活下来后，才能把话说清。",
    cost: 2,
  }),
  question_porter: Object.freeze({
    id: "question_porter",
    title: "问清是谁追他、为何追来",
    description: "先救活口，再从他嘴里问出追者认的货与下一处去向。",
    cost: 1,
  }),
  search_porter_cargo: Object.freeze({
    id: "search_porter_cargo",
    title: "查翻散的药篓与货签",
    description: "货不会说谎；只是你低头搜东西时，伤者也在继续流血。",
    cost: 1,
  }),
  abandon_porter: Object.freeze({
    id: "abandon_porter",
    title: "不再管他，先顾眼前的事",
    description: "明确放弃这个活口。你能省下时间，却也不会再从他口中得到答案。",
    cost: 0,
  }),
});

const LADY_RESPONSES = Object.freeze({
  show_evidence: Object.freeze({ id: "show_evidence", title: "把你查到的痕迹摆给她看" }),
  ask_intent: Object.freeze({ id: "ask_intent", title: "先问她为何循着药匣而来" }),
  guard_casket: Object.freeze({ id: "guard_casket", title: "不让开身位，只问她是谁" }),
});

const CRISIS_ACTIONS = Object.freeze({
  drop_rack: Object.freeze({
    id: "drop_rack",
    title: "熄火扯架，把追兵困在门内",
    description: "借先前松开的香架与压暗的余火，骤然放黑大殿，再让整架木料横倒封路。",
    requires: ["rack", "embers"],
  }),
  escape_breach: Object.freeze({
    id: "escape_breach",
    title: "从清开的塌墙撤进荒坡",
    description: "不与追兵硬拼，带能带的人和东西从提前清出的退路离开。",
    requires: ["breach"],
  }),
  hide_casket: Object.freeze({
    id: "hide_casket",
    title: "把药匣塞进湿柴夹层，反送一条假路",
    description: "利用提前码好的空腔藏匣，让追兵只看见一串通往庙外的假痕。",
    requires: ["woodpile", "casket"],
  }),
  hold_door: Object.freeze({
    id: "hold_door",
    title: "守住庙门，正面截下追兵",
    description: "没有布置也能做，但你的力道、根骨与身上伤处会决定付出多大代价。",
    requires: [],
  }),
});

const ORIGIN_OBJECT_INSIGHTS = Object.freeze({
  shen_branch: Object.freeze({
    rain_tracks: "泥印外撇，抬物的人走的是世家药房搬匣时的窄步，怕的不是重，而是匣里东西摇动。",
    patched_wall: "墙灰边缘压着药房封匣常用的细麻，绳上还粘着沈家旧式黄蜡。",
    deity_statue: "石座下的货签用族中旧账房的折角法压过；藏匣的人熟悉世家内院的规矩。",
  }),
  streetborn: Object.freeze({
    rain_tracks: "脚印一边深一边浅，是码头脚夫换肩后的走法；这批货从水路上过岸不久。",
    patched_wall: "墙根红绳收的是秦淮二手交割结。交货人故意让下一手知道，东西已经换过人。",
    deity_statue: "石座下油布带着外港桐油味，包法却是城里药行的；货在两拨人之间倒过手。",
  }),
  mystery: Object.freeze({
    rain_tracks: "你看见最浅那只脚印时，脑中忽然闪过一段被雨冲断的石路；有人曾用同样的步子跟在你身后。",
    patched_wall: "靠近新灰时，半块玉佩短促地热了一下。匣角火印的收笔，你似乎在别处见过。",
    deity_statue: "石座背面缺了一角，断口与你的玉佩并不相合，却让你想起一张被火燎过的名册。",
  }),
});

function uniqueKnown(values, known) {
  return [...new Set((Array.isArray(values) ? values : []).filter((value) => known.has(value)))];
}

function phaseForElapsed(elapsed) {
  if (elapsed >= TEMPLE_SITUATION_LIMIT) return "arrival";
  if (elapsed >= 7) return "footsteps";
  if (elapsed >= 4) return "driving_rain";
  return "quiet";
}

function normalizeCasket(saved = {}) {
  const holder = ["wall", "player", "woodpile", "pursuers", "gone"].includes(saved?.holder) ? saved.holder : "wall";
  return {
    discovered: Boolean(saved?.discovered),
    inspected: Boolean(saved?.inspected),
    opened: Boolean(saved?.opened),
    holder,
    lost: Boolean(saved?.lost || ["pursuers", "gone"].includes(holder)),
  };
}

function normalizePorter(saved = {}) {
  const discovered = Boolean(saved?.discovered);
  const alive = saved?.alive === true ? true : saved?.alive === false ? false : null;
  return {
    discovered,
    alive,
    rescued: Boolean(saved?.rescued),
    questioned: Boolean(saved?.questioned),
    searched: Boolean(saved?.searched),
    abandoned: Boolean(saved?.abandoned),
    aidSpent: Boolean(saved?.aidSpent),
    resolved: Boolean(saved?.resolved),
  };
}

function normalizeLady(saved = {}) {
  return {
    arrived: Boolean(saved?.arrived),
    identityKnown: Boolean(saved?.identityKnown),
    responseId: LADY_RESPONSES[saved?.responseId] ? saved.responseId : null,
    trust: Math.max(0, Math.min(9, Math.floor(Number(saved?.trust || 0)))),
    suspicion: Math.max(0, Math.min(9, Math.floor(Number(saved?.suspicion || 0)))),
    debt: Math.max(0, Math.min(9, Math.floor(Number(saved?.debt || 0)))),
    observations: [...new Set(Array.isArray(saved?.observations) ? saved.observations.filter((item) => typeof item === "string") : [])].slice(0, 8),
  };
}

function normalizeCrisis(saved = {}) {
  return {
    active: Boolean(saved?.active),
    resolved: Boolean(saved?.resolved),
    method: CRISIS_ACTIONS[saved?.method] ? saved.method : null,
    outcome: typeof saved?.outcome === "string" ? saved.outcome.slice(0, 80) : null,
    pursuers: typeof saved?.pursuers === "string" ? saved.pursuers.slice(0, 40) : "unseen",
    usedObjectIds: [...new Set(Array.isArray(saved?.usedObjectIds) ? saved.usedObjectIds.filter((item) => typeof item === "string") : [])].slice(0, 8),
    playerWound: saved?.playerWound && typeof saved.playerWound === "object" ? {
      id: "temple_pursuer_wound",
      type: "cut",
      bodyPart: ["arm", "shoulder", "torso", "leg"].includes(saved.playerWound.bodyPart) ? saved.playerWound.bodyPart : "shoulder",
      severity: Math.max(1, Math.min(3, Math.floor(Number(saved.playerWound.severity || 1)))),
      tags: ["ruined_temple", "persistent"],
    } : null,
  };
}

export function createTempleExplorationState(saved = null) {
  const incoming = saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  const objectIds = new Set(TEMPLE_OBJECTS.map((object) => object.id));
  const areaIds = new Set(TEMPLE_AREAS.map((area) => area.id));
  const objectStates = {};
  for (const object of TEMPLE_OBJECTS) {
    const prior = incoming.objectStates?.[object.id];
    const allowedActions = new Set(object.actionIds);
    objectStates[object.id] = {
      seen: Boolean(prior?.seen),
      stage: typeof prior?.stage === "string" ? prior.stage.slice(0, 40) : "untouched",
      actionIds: uniqueKnown(prior?.actionIds, allowedActions),
    };
  }
  const elapsed = Math.min(TEMPLE_SITUATION_LIMIT, Math.max(0, Math.floor(Number(incoming.elapsed || 0))));
  const areaId = areaIds.has(incoming.areaId) ? incoming.areaId : "hall";
  return {
    areaId,
    visitedAreaIds: uniqueKnown(["hall", ...(incoming.visitedAreaIds || [])], areaIds),
    seenObjectIds: uniqueKnown(incoming.seenObjectIds, objectIds),
    elapsed,
    limit: TEMPLE_SITUATION_LIMIT,
    phase: phaseForElapsed(elapsed),
    arrivalTriggered: Boolean(incoming.arrivalTriggered || elapsed >= TEMPLE_SITUATION_LIMIT),
    originClueIds: [...new Set(Array.isArray(incoming.originClueIds) ? incoming.originClueIds.filter((item) => typeof item === "string") : [])].slice(0, 12),
    casket: normalizeCasket(incoming.casket),
    porter: normalizePorter(incoming.porter),
    lady: normalizeLady(incoming.lady),
    crisis: normalizeCrisis(incoming.crisis),
    completed: Boolean(incoming.completed),
    objectStates,
    actionLog: (Array.isArray(incoming.actionLog) ? incoming.actionLog : [])
      .filter((entry) => entry && ACTION_BY_ID.has(entry.actionId) && OBJECT_BY_ID.has(entry.objectId))
      .slice(-24)
      .map((entry) => ({ objectId: entry.objectId, actionId: entry.actionId, at: Math.max(0, Number(entry.at || 0)) })),
  };
}

export function migrateTempleExplorationState(savedGame = {}) {
  let existing = createTempleExplorationState(savedGame?.templeExploration);
  if (savedGame?.templeExploration) {
    const legacyPorter = savedGame?.porterEncounter;
    if (legacyPorter?.encountered && !existing.porter.discovered) {
      existing = {
        ...existing,
        porter: {
          discovered: true,
          alive: legacyPorter.alive !== false,
          rescued: Boolean(legacyPorter.rescued),
          questioned: Boolean(legacyPorter.questioned),
          searched: Boolean(legacyPorter.searched),
          abandoned: legacyPorter.alive === false,
          aidSpent: Boolean(legacyPorter.rescued),
          resolved: Boolean(legacyPorter.resolved),
        },
      };
    }
    if (!existing.casket.discovered && (savedGame?.inventory || []).some((id) => ["sealed_medicine_box", "opened_medicine_box", "red_cord_package", "opened_red_cord_package"].includes(id))) {
      const opened = (savedGame.inventory || []).some((id) => ["opened_medicine_box", "opened_red_cord_package"].includes(id));
      existing = { ...existing, casket: { discovered: true, inspected: opened || (savedGame.originKnowledge || []).includes("box_changed_hands"), opened, holder: "player", lost: false } };
    }
    return existing;
  }
  const legacyOpening = savedGame?.templeOpening && typeof savedGame.templeOpening === "object" ? savedGame.templeOpening : {};
  const legacyActions = new Set(Array.isArray(legacyOpening.actions) ? legacyOpening.actions : []);
  let state = existing;
  const applyLegacyAction = (objectId, actionId, stage) => {
    const prior = state.objectStates[objectId];
    state = {
      ...state,
      elapsed: Math.min(state.limit, state.elapsed + 1),
      seenObjectIds: [...new Set([...state.seenObjectIds, objectId])],
      objectStates: {
        ...state.objectStates,
        [objectId]: { ...prior, seen: true, stage, actionIds: [...new Set([...prior.actionIds, actionId])] },
      },
      actionLog: [...state.actionLog, { objectId, actionId, at: Math.min(state.limit, state.elapsed + 1) }],
    };
  };
  if (legacyOpening.fireTended || legacyActions.has("tend_fire")) applyLegacyAction("embers", "tend_embers", "kindled");
  if (legacyOpening.wallSeen || ["fateSight", "allocation", "originTempleTask", "templeTasks"].includes(savedGame?.screen)) {
    state = { ...state, areaId: "rear", visitedAreaIds: [...new Set([...state.visitedAreaIds, "rear"])] };
    applyLegacyAction("patched_wall", "inspect_wall", "measured");
  }
  const hadTempleResolution = ["templeTasks"].includes(savedGame?.screen)
    || Boolean(savedGame?.originPrologue?.completed)
    || (Array.isArray(savedGame?.completedTempleTasks) && savedGame.completedTempleTasks.length > 0);
  if (hadTempleResolution) {
    const prior = state.objectStates.patched_wall;
    state = {
      ...state,
      seenObjectIds: [...new Set([...state.seenObjectIds, "patched_wall"])],
      objectStates: {
        ...state.objectStates,
        patched_wall: { ...prior, seen: true, stage: "mapped", actionIds: [...new Set([...prior.actionIds, "inspect_wall", "sound_wall"])] },
      },
      casket: {
        discovered: true,
        inspected: Boolean((savedGame?.originKnowledge || []).includes("box_changed_hands")),
        opened: (savedGame?.inventory || []).includes("opened_medicine_box"),
        holder: (savedGame?.inventory || []).some((id) => ["sealed_medicine_box", "opened_medicine_box"].includes(id)) ? "player" : "wall",
        lost: false,
      },
    };
  }
  const elapsed = Math.min(state.limit, state.elapsed);
  return { ...state, elapsed, phase: phaseForElapsed(elapsed), arrivalTriggered: elapsed >= state.limit };
}

export function getTempleArea(areaId) {
  return TEMPLE_AREAS.find((area) => area.id === areaId) || TEMPLE_AREAS[1];
}

export function getTempleSituationClock(exploration) {
  const state = createTempleExplorationState(exploration);
  return {
    elapsed: state.elapsed,
    remaining: Math.max(0, state.limit - state.elapsed),
    label: TIME_LABELS[state.elapsed] || TIME_LABELS.at(-1),
    phase: state.phase,
    phaseLabel: state.phase === "arrival"
      ? "门外有人"
      : state.phase === "footsteps"
        ? "脚步已近"
        : state.phase === "driving_rain"
          ? "雨势转急"
          : "庙中尚静",
  };
}

export function enterTempleArea(exploration, areaId) {
  const state = createTempleExplorationState(exploration);
  if (!TEMPLE_AREAS.some((area) => area.id === areaId)) return { available: false, reason: "这条路眼下走不通。", state };
  return {
    available: true,
    changed: state.areaId !== areaId,
    state: {
      ...state,
      areaId,
      visitedAreaIds: [...new Set([...state.visitedAreaIds, areaId])],
    },
  };
}

export function revealTempleObject(exploration, objectId) {
  const state = createTempleExplorationState(exploration);
  const object = OBJECT_BY_ID.get(objectId);
  if (!object || object.areaId !== state.areaId) return { available: false, reason: "你在这里看不见那件东西。", state };
  const wasSeen = state.seenObjectIds.includes(objectId);
  const nextObjectState = { ...state.objectStates[objectId], seen: true };
  return {
    available: true,
    changed: !wasSeen,
    state: {
      ...state,
      seenObjectIds: [...new Set([...state.seenObjectIds, objectId])],
      objectStates: { ...state.objectStates, [objectId]: nextObjectState },
    },
  };
}

function detailForObject(object, objectState, originId) {
  const originInsight = ORIGIN_OBJECT_INSIGHTS[originId]?.[object.id];
  if (originInsight && objectState.actionIds.length) return originInsight;
  if (object.id === "patched_wall" && objectState.stage === "mapped") {
    return "两块松砖已经挪开。夹层里横放着一只乌沉药匣，双股药绳还绕在封蜡外面。";
  }
  if (object.id === "patched_wall" && objectState.stage === "measured") {
    return originId === "shen_branch"
      ? "空响后还夹着极轻的木碰声。墙灰边缘压有世家药房封匣时常用的细麻。"
      : originId === "streetborn"
        ? "空响后有木碰声。墙根那截红绳收口，是秦淮货路惯用的二手交割结。"
        : "空响后有木碰声。你靠近时，怀里的半块玉佩短促地热了一下。";
  }
  if (object.id === "embers" && objectState.stage === "kindled") return "火已经拨亮。它能取暖照明，也会把人的影子送到门窗上。";
  if (object.id === "embers" && objectState.stage === "banked") return "炭心压在细灰下暗红未灭。殿里更暗，温度却还留着。";
  if (object.id === "broken_window" && objectState.stage === "braced") return "破窗已经被碎木顶住。外面难看清火光，从里面仍能一脚撞开。";
  if (object.id === "collapsed_wall" && objectState.stage === "cleared") return "碎砖已经清开。一条不显眼的窄路通向庙侧荒坡。";
  if (object.id === "incense_rack" && objectState.stage === "loosened") return "香架还立在原处，麻绳却只剩最后一绞，随手便能扯下。";
  if (object.id === "woodpile" && objectState.stage === "hollowed") return "湿柴已经码回原状，中间留着一处外面看不出的夹层。";
  if (object.id === "blood_trail" && objectState.stage === "followed") return "血痕尽头躺着一名受伤脚夫。他还在喘气，药篓和两枚货签散在手边。";
  return object.initialDetail;
}

function availableActionsForObject(object, objectState) {
  if (!objectState.seen) return [];
  return object.actionIds
    .map((actionId) => ACTION_BY_ID.get(actionId))
    .filter(Boolean)
    .map((action) => {
      const completed = objectState.actionIds.includes(action.id);
      const prerequisiteMet = !action.requiresStage || objectState.stage === action.requiresStage;
      return {
        id: action.id,
        title: action.title,
        description: action.description,
        cost: action.cost,
        meta: action.cost === 1 ? "耗时一刻" : `耗时${action.cost}刻`,
        disabled: completed || !prerequisiteMet,
        reason: completed ? "已经做过" : !prerequisiteMet ? "先查清这件东西" : "",
      };
    });
}

export function getTempleObjectView(exploration, objectId, originId = "mystery") {
  const state = createTempleExplorationState(exploration);
  const object = OBJECT_BY_ID.get(objectId);
  if (!object) return null;
  const objectState = state.objectStates[object.id];
  const regularActions = availableActionsForObject(object, objectState);
  const casketActions = object.id === "patched_wall" && state.casket.discovered && !state.casket.lost
    ? Object.values(CASKET_ACTIONS).map((action) => {
      const completed = action.id === "inspect_casket" ? state.casket.inspected
        : action.id === "open_casket" ? state.casket.opened
          : action.id === "take_casket_intact" ? state.casket.holder === "player" : false;
      const disabled = completed
        || (action.id === "take_casket_intact" && state.casket.opened)
        || (action.id === "open_casket" && state.casket.opened)
        || state.casket.holder === "woodpile";
      return {
        ...action,
        meta: action.cost === 1 ? "耗时一刻" : `耗时${action.cost}刻`,
        disabled,
        reason: completed ? "已经做过" : state.casket.holder === "woodpile" ? "药匣已经藏好" : state.casket.opened ? "封口已经拆开" : "",
        specialKind: "casket",
      };
    })
    : [];
  const actions = [...regularActions, ...casketActions];
  return {
    ...object,
    detail: detailForObject(object, objectState, ORIGIN_IDS.has(originId) ? originId : "mystery"),
    state: objectState.actionIds.length ? (actions.some((action) => !action.disabled) ? "special" : "completed") : "available",
    seen: objectState.seen,
    stage: objectState.stage,
    actions,
  };
}

export function getTempleAreaView(exploration, originId = "mystery") {
  const state = createTempleExplorationState(exploration);
  const area = getTempleArea(state.areaId);
  return {
    area,
    areas: TEMPLE_AREAS.map((entry) => ({ ...entry, current: entry.id === area.id, visited: state.visitedAreaIds.includes(entry.id) })),
    objects: TEMPLE_OBJECTS
      .filter((object) => object.areaId === area.id)
      .map((object) => getTempleObjectView(state, object.id, originId)),
    clock: getTempleSituationClock(state),
  };
}

export function resolveTempleObjectAction(exploration, objectId, actionId, originId = "mystery") {
  const state = createTempleExplorationState(exploration);
  if (state.arrivalTriggered) return { available: false, reason: "门外的脚步已经到了，眼下顾不得再查。", state };
  const object = OBJECT_BY_ID.get(objectId);
  const action = ACTION_BY_ID.get(actionId);
  if (!object || !action || !object.actionIds.includes(actionId) || object.areaId !== state.areaId) {
    return { available: false, reason: "眼下不能这样做。", state };
  }
  const objectState = state.objectStates[objectId];
  if (!objectState.seen) return { available: false, reason: "先看清眼前的东西。", state };
  if (objectState.actionIds.includes(actionId)) return { available: false, reason: "这件事已经做过。", state };
  if (action.requiresStage && objectState.stage !== action.requiresStage) return { available: false, reason: "先查清这件东西。", state };

  const elapsed = Math.min(state.limit, state.elapsed + action.cost);
  const previousPhase = state.phase;
  const phase = phaseForElapsed(elapsed);
  const arrivalTriggered = elapsed >= state.limit;
  const nextObjectState = {
    ...objectState,
    seen: true,
    stage: action.nextStage,
    actionIds: [...objectState.actionIds, actionId],
  };
  const next = {
    ...state,
    elapsed,
    phase,
    arrivalTriggered,
    seenObjectIds: [...new Set([...state.seenObjectIds, objectId])],
    objectStates: { ...state.objectStates, [objectId]: nextObjectState },
    actionLog: [...state.actionLog, { objectId, actionId, at: elapsed }].slice(-24),
    originClueIds: ORIGIN_OBJECT_INSIGHTS[originId]?.[objectId]
      ? [...new Set([...state.originClueIds, `${originId}:${objectId}`])]
      : state.originClueIds,
    casket: objectId === "patched_wall" && actionId === "sound_wall"
      ? { ...state.casket, discovered: true }
      : state.casket,
    porter: objectId === "blood_trail" && actionId === "follow_blood_trail"
      ? { ...state.porter, discovered: true }
      : state.porter,
  };
  const phaseOutcomes = PHASE_EVENTS
    .filter((event) => state.elapsed < event.at && elapsed >= event.at)
    .map((event) => event.text);
  const phaseOutcome = phaseOutcomes.at(-1) || "";
  return {
    available: true,
    state: next,
    object,
    action,
    outcome: action.outcome,
    phaseOutcome,
    phaseOutcomes,
    phaseChanged: phase !== previousPhase,
    arrivalTriggered,
  };
}

function advanceSituation(state, cost) {
  const elapsed = Math.min(state.limit, state.elapsed + Math.max(0, Number(cost || 0)));
  const phase = phaseForElapsed(elapsed);
  return {
    state: { ...state, elapsed, phase, arrivalTriggered: elapsed >= state.limit },
    phaseOutcomes: PHASE_EVENTS.filter((event) => state.elapsed < event.at && elapsed >= event.at).map((event) => event.text),
  };
}

export function resolveTempleCasketAction(exploration, actionId, originId = "mystery") {
  const state = createTempleExplorationState(exploration);
  const action = CASKET_ACTIONS[actionId];
  if (!action || !state.casket.discovered || state.casket.lost || state.casket.holder === "woodpile") {
    return { available: false, reason: "眼下碰不到那只药匣。", state };
  }
  if (state.arrivalTriggered) return { available: false, reason: "门外来人已经到了。", state };
  if (actionId === "inspect_casket" && state.casket.inspected) return { available: false, reason: "封口与泥痕已经看过。", state };
  if (actionId === "take_casket_intact" && (state.casket.holder === "player" || state.casket.opened)) return { available: false, reason: state.casket.opened ? "封口已经拆开。" : "药匣已经在你身上。", state };
  if (actionId === "open_casket" && state.casket.opened) return { available: false, reason: "药匣已经拆开。", state };
  const advanced = advanceSituation(state, action.cost);
  const casket = {
    ...advanced.state.casket,
    inspected: advanced.state.casket.inspected || actionId === "inspect_casket" || actionId === "open_casket",
    opened: advanced.state.casket.opened || actionId === "open_casket",
    holder: ["take_casket_intact", "open_casket"].includes(actionId) ? "player" : advanced.state.casket.holder,
  };
  const originLine = ORIGIN_OBJECT_INSIGHTS[ORIGIN_IDS.has(originId) ? originId : "mystery"]?.patched_wall || "";
  const outcomes = {
    inspect_casket: `你没有揭蜡，只把木匣翻到雨光下。${originLine}匣盖边缘的蜡色深浅不一，它曾被人揭开，又重新压了回去。`,
    take_casket_intact: "你用外衣裹住药匣，封蜡与药绳都没有动。木匣从暗墙转到你身上，也把随后而来的麻烦一并带了过来。",
    open_casket: "封蜡断开，苦涩药气立刻漫出来。匣中除了乌黑药丸，还有一张被裁去半边的外港货签。",
  };
  return {
    available: true,
    action,
    outcome: outcomes[actionId],
    phaseOutcomes: advanced.phaseOutcomes,
    arrivalTriggered: advanced.state.arrivalTriggered,
    state: {
      ...advanced.state,
      casket,
      originClueIds: [...new Set([...advanced.state.originClueIds, `${ORIGIN_IDS.has(originId) ? originId : "mystery"}:casket`])],
    },
  };
}

export function getTemplePorterView(exploration) {
  const state = createTempleExplorationState(exploration);
  if (!state.porter.discovered) return null;
  const actions = Object.values(PORTER_ACTIONS).map((action) => {
    const completed = action.id === "rescue_porter" ? state.porter.rescued
      : action.id === "question_porter" ? state.porter.questioned
        : action.id === "search_porter_cargo" ? state.porter.searched
          : action.id === "abandon_porter" ? state.porter.abandoned : false;
    const needsRescue = action.id === "question_porter" && !state.porter.rescued;
    const disabled = completed || needsRescue || state.porter.alive === false || state.arrivalTriggered;
    return {
      ...action,
      meta: action.cost === 0 ? "当即放弃" : action.cost === 1 ? "耗时一刻" : `耗时${action.cost}刻`,
      disabled,
      reason: completed ? "已经做过" : needsRescue ? "先替他止血" : state.porter.alive === false ? "他已经没气了" : state.arrivalTriggered ? "追兵已至" : "",
      specialKind: "porter",
    };
  });
  return {
    id: "injured_porter",
    label: state.porter.alive === false ? "死去的脚夫" : state.porter.rescued ? "止住血的脚夫" : "受伤脚夫",
    detail: state.porter.alive === false
      ? "雨水从他袖口流过，已经没有呼吸。翻散的货签仍在原处。"
      : state.porter.rescued
        ? "布条已经勒住出血处。他能开口，也一直看着你碰过的药匣。"
        : "伤在左臂和小腿。他还能喘气，却撑不了太久。",
    state: state.porter.alive === false ? "danger" : state.porter.rescued ? "allied" : "unknown",
    actions,
  };
}

export function resolveTemplePorterAction(exploration, actionId) {
  const state = createTempleExplorationState(exploration);
  const action = PORTER_ACTIONS[actionId];
  if (!action || !state.porter.discovered || state.porter.alive === false || state.arrivalTriggered) {
    return { available: false, reason: "眼下不能这样处置脚夫。", state };
  }
  if (actionId === "question_porter" && !state.porter.rescued) return { available: false, reason: "先替他止血。", state };
  if ((actionId === "rescue_porter" && state.porter.rescued)
    || (actionId === "question_porter" && state.porter.questioned)
    || (actionId === "search_porter_cargo" && state.porter.searched)
    || (actionId === "abandon_porter" && state.porter.abandoned)) {
    return { available: false, reason: "这件事已经做过。", state };
  }
  const advanced = advanceSituation(state, action.cost);
  const abandoned = actionId === "abandon_porter";
  const porter = {
    ...advanced.state.porter,
    rescued: advanced.state.porter.rescued || actionId === "rescue_porter",
    aidSpent: advanced.state.porter.aidSpent || actionId === "rescue_porter",
    alive: abandoned ? false : actionId === "rescue_porter" ? true : advanced.state.porter.alive,
    questioned: advanced.state.porter.questioned || actionId === "question_porter",
    searched: advanced.state.porter.searched || actionId === "search_porter_cargo",
    abandoned: advanced.state.porter.abandoned || abandoned,
    resolved: abandoned,
  };
  const outcomes = {
    rescue_porter: "你割开里衣下摆，把最干净的一段布勒在伤口上。脚夫的呼吸慢慢稳住；冷风也从少了一层衬布的腰间钻进来。",
    question_porter: "脚夫说，追者只翻带沈字货签的箱子，还提过一艘熄灯逆行的乌篷船。有人先把药匣送进破庙，他们随后便会来取。",
    search_porter_cargo: "散货里混着两枚不同泊位的药批签。货篓在外港换过手，其中一枚背面还压着与乌沉药匣相同的黑泥。",
    abandon_porter: "你把目光从伤口上移开。脚夫还想抬手，最终只抓住一把被雨泡软的药草。",
  };
  return {
    available: true,
    action,
    outcome: outcomes[actionId],
    phaseOutcomes: advanced.phaseOutcomes,
    arrivalTriggered: advanced.state.arrivalTriggered,
    state: { ...advanced.state, porter },
  };
}

export function beginTempleArrival(exploration) {
  const state = createTempleExplorationState(exploration);
  const porter = state.porter.discovered && !state.porter.rescued && state.porter.alive !== false
    ? { ...state.porter, alive: false, resolved: true }
    : { ...state.porter, resolved: state.porter.discovered ? true : state.porter.resolved };
  const observations = [];
  let trust = 0;
  let suspicion = 0;
  let debt = 0;
  if (porter.rescued) {
    observations.push("你撕了里衣替脚夫止血，没有把活口丢在雨里");
    trust += 2;
    debt += 1;
  } else if (porter.discovered && porter.alive === false) {
    observations.push("柴堆后的脚夫已经断气");
    suspicion += 1;
  }
  if (state.casket.opened) {
    observations.push("乌沉药匣的封蜡已经被拆开");
    suspicion += 2;
  } else if (state.casket.holder === "player") {
    observations.push("你拿到了药匣，却没有毁掉封口");
    trust += 1;
  } else if (state.casket.discovered) {
    observations.push("你找到了暗墙，却还没有决定药匣归谁");
  }
  const prepared = [
    state.objectStates.embers.stage === "banked" ? "压暗余火" : null,
    state.objectStates.incense_rack.stage === "loosened" ? "松开香架" : null,
    state.objectStates.collapsed_wall.stage === "cleared" ? "清出塌墙" : null,
    state.objectStates.woodpile.stage === "hollowed" ? "码出柴堆夹层" : null,
    state.objectStates.broken_window.stage === "braced" ? "顶住破窗" : null,
  ].filter(Boolean);
  if (prepared.length) {
    observations.push(`你提前${prepared.join("、")}`);
    trust += 1;
  }
  if (porter.questioned) observations.push("脚夫已经说出无灯夜船与追者认货的规矩");
  return {
    ...state,
    elapsed: state.limit,
    phase: "arrival",
    arrivalTriggered: true,
    porter,
    lady: {
      ...state.lady,
      arrived: true,
      trust: Math.max(state.lady.trust, trust),
      suspicion: Math.max(state.lady.suspicion, suspicion),
      debt: Math.max(state.lady.debt, debt),
      observations,
    },
  };
}

export function getTempleLadyResponses(exploration) {
  const state = createTempleExplorationState(exploration);
  if (!state.lady.arrived || state.lady.responseId) return [];
  return Object.values(LADY_RESPONSES).map((response) => ({
    ...response,
    description: response.id === "show_evidence"
      ? "让她先看药匣、伤者和货签。你交出的是经过，不是自己的处置权。"
      : response.id === "ask_intent"
        ? "门外还有另一批脚步。先问清她要保人、保匣，还是借你的手截住追者。"
        : "把药匣与伤者挡在身后。在她说明身份之前，不把任何东西交出去。",
    meta: response.id === "show_evidence" ? "信任" : response.id === "ask_intent" ? "查明来意" : "戒心",
  }));
}

export function resolveTempleLadyResponse(exploration, responseId) {
  const state = createTempleExplorationState(exploration);
  const response = LADY_RESPONSES[responseId];
  if (!response || !state.lady.arrived || state.lady.responseId) return { available: false, reason: "这句话已经错过时机。", state };
  const changes = responseId === "show_evidence" ? { trust: 1, suspicion: 0 }
    : responseId === "guard_casket" ? { trust: 0, suspicion: 1 }
      : { trust: 0, suspicion: 0 };
  const outcomes = {
    show_evidence: "青衣妇人先看脚夫的伤，再看药匣封口。她没有伸手，只说：“至少今夜，你做过什么都摆在明处。”",
    ask_intent: "“我循匣而来，也在等后面那几个人露面。”她侧耳听雨，“他们认名单和货签，不认脸。”",
    guard_casket: "你没有让路。她的目光在你按住药匣的手上停了一息：“有戒心不算坏事，别在该动的时候仍只会护着。”",
  };
  return {
    available: true,
    outcome: outcomes[responseId],
    state: {
      ...state,
      lady: {
        ...state.lady,
        responseId,
        trust: Math.min(9, state.lady.trust + changes.trust),
        suspicion: Math.min(9, state.lady.suspicion + changes.suspicion),
      },
      crisis: { ...state.crisis, active: true, pursuers: "at_gate" },
    },
  };
}

function crisisRequirementState(state, requirement) {
  if (requirement === "rack") return state.objectStates.incense_rack.stage === "loosened";
  if (requirement === "embers") return state.objectStates.embers.stage === "banked";
  if (requirement === "breach") return state.objectStates.collapsed_wall.stage === "cleared";
  if (requirement === "woodpile") return state.objectStates.woodpile.stage === "hollowed";
  if (requirement === "casket") return state.casket.discovered && !state.casket.lost;
  return false;
}

export function getTempleCrisisOptions(exploration, context = {}) {
  const state = createTempleExplorationState(exploration);
  const attributes = context.attributes || {};
  return Object.values(CRISIS_ACTIONS).map((action) => {
    const missing = action.requires.filter((requirement) => !crisisRequirementState(state, requirement));
    const requirementLabels = { rack: "松开的香架", embers: "压暗的余火", breach: "清开的塌墙", woodpile: "留空的柴堆", casket: "已经找到药匣" };
    const combatScore = Number(attributes.strength || 0) + Number(attributes.constitution || 0);
    return {
      ...action,
      disabled: missing.length > 0 || state.crisis.resolved,
      reason: missing.length ? `还缺：${missing.map((id) => requirementLabels[id]).join("、")}` : state.crisis.resolved ? "危机已经落定" : "",
      meta: action.id === "hold_door" ? `力道与根骨 ${combatScore}` : "利用先前布置",
      danger: action.id === "hold_door",
    };
  });
}

export function resolveTempleCrisis(exploration, actionId, context = {}) {
  const state = createTempleExplorationState(exploration);
  const option = getTempleCrisisOptions(state, context).find((entry) => entry.id === actionId);
  if (!state.crisis.active || !option || option.disabled) return { available: false, reason: option?.reason || "危机尚未逼到眼前。", state };
  const attributes = context.attributes || {};
  const combatScore = Number(attributes.strength || 0) + Number(attributes.constitution || 0);
  let casket = { ...state.casket };
  let porter = { ...state.porter };
  let lady = { ...state.lady };
  let playerWound = null;
  let outcome = "";
  let pursuers = "driven_off";
  let usedObjectIds = [];
  if (actionId === "drop_rack") {
    usedObjectIds = ["embers", "incense_rack"];
    lady.trust = Math.min(9, lady.trust + 1);
    outcome = "你一脚拨散暗炭，殿中骤黑；香架紧跟着横倒，冲在最前的追者被木料与火星逼成一团。青衣妇人从侧面封住门口，余下的人连药匣都没看清便退进雨里。";
  } else if (actionId === "escape_breach") {
    usedObjectIds = ["collapsed_wall"];
    pursuers = "bypassed";
    if (casket.holder === "wall") {
      casket = { ...casket, holder: "pursuers", lost: true };
      outcome = "你从清开的塌墙带脚夫撤进荒坡。人活着离开，暗墙里的药匣却落进追兵手中。青衣妇人断后片刻，循着你留下的碎砖痕追了上来。";
    } else {
      outcome = "你从清开的塌墙钻进荒坡，药匣贴在胸前，获救的脚夫被青衣妇人提着后领带过碎砖。追兵扑进大殿时，只看见一地被雨打乱的痕迹。";
    }
  } else if (actionId === "hide_casket") {
    usedObjectIds = ["woodpile", "rain_tracks"];
    casket = { ...casket, holder: "woodpile", lost: false };
    pursuers = "misdirected";
    lady.trust = Math.min(9, lady.trust + 1);
    outcome = "药匣滑进湿柴夹层，外层木柴重新合拢。你又从后门踩出一串仓促脚印。追者照着假痕追入雨里，谁也没有碰到真正的木匣。";
  } else {
    usedObjectIds = state.objectStates.broken_window.stage === "braced" ? ["broken_window", "doorway"] : ["doorway"];
    const severity = combatScore >= 6 ? 1 : 2;
    playerWound = { id: "temple_pursuer_wound", type: "cut", bodyPart: combatScore >= 6 ? "arm" : "shoulder", severity, tags: ["ruined_temple", "persistent"] };
    lady.trust = Math.min(9, lady.trust + 1);
    outcome = combatScore >= 6
      ? "你守住门槛，借窄处撞开第一个追者，青衣妇人随即截断后路。短刀只在你小臂留下一道口子，来人已经不敢再进第二次。"
      : "你在门槛硬接第一刀，肩头立刻见血。青衣妇人从你身侧掠过，连断两人兵器，才把追者逼退；这场胜负有一半写在你的伤口上。";
  }
  if (!porter.rescued && porter.discovered) porter = { ...porter, alive: false, resolved: true };
  return {
    available: true,
    outcome,
    wound: playerWound,
    state: {
      ...state,
      casket,
      porter,
      lady,
      crisis: {
        active: false,
        resolved: true,
        method: actionId,
        outcome,
        pursuers,
        usedObjectIds,
        playerWound,
      },
      completed: true,
    },
  };
}

export function getTempleOutcomeSummary(exploration) {
  const state = createTempleExplorationState(exploration);
  const casket = state.casket.lost ? "落入追兵手中"
    : state.casket.holder === "woodpile" ? "仍藏在破庙湿柴中"
      : state.casket.opened ? "已拆封，由你带走"
        : state.casket.holder === "player" ? (state.casket.inspected ? "查过封口，由你带走" : "封口完整，由你带走")
          : state.casket.discovered ? "仍在暗墙夹层" : "未曾发现";
  const porter = !state.porter.discovered ? "未被发现"
    : state.porter.alive ? (state.porter.questioned ? "活下，并说出夜船" : "活下") : "死在破庙";
  const relation = state.lady.trust >= state.lady.suspicion + 2 ? "她愿意替你担保一次"
    : state.lady.suspicion > state.lady.trust ? "她仍在防你" : "彼此暂可信任";
  return {
    casket,
    porter,
    relation,
    trust: state.lady.trust,
    suspicion: state.lady.suspicion,
    debt: state.lady.debt,
    pursuers: state.crisis.pursuers,
    wound: state.crisis.playerWound,
    aidSpent: state.porter.aidSpent,
  };
}
