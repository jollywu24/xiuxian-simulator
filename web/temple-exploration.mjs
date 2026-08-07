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
  Object.freeze({ id: "old_well", areaId: "rear", label: "接雨陶缸", x: 86, y: 70, initialDetail: "檐下陶缸接了半缸浑水，搭在缸沿的细绳却没有朽。", actionIds: ["test_well"] }),
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

function uniqueKnown(values, known) {
  return [...new Set((Array.isArray(values) ? values : []).filter((value) => known.has(value)))];
}

function phaseForElapsed(elapsed) {
  if (elapsed >= TEMPLE_SITUATION_LIMIT) return "arrival";
  if (elapsed >= 7) return "footsteps";
  if (elapsed >= 4) return "driving_rain";
  return "quiet";
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
    objectStates,
    actionLog: (Array.isArray(incoming.actionLog) ? incoming.actionLog : [])
      .filter((entry) => entry && ACTION_BY_ID.has(entry.actionId) && OBJECT_BY_ID.has(entry.objectId))
      .slice(-24)
      .map((entry) => ({ objectId: entry.objectId, actionId: entry.actionId, at: Math.max(0, Number(entry.at || 0)) })),
  };
}

export function migrateTempleExplorationState(savedGame = {}) {
  const existing = createTempleExplorationState(savedGame?.templeExploration);
  if (savedGame?.templeExploration) return existing;
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
  if (object.id === "patched_wall" && objectState.stage === "mapped") {
    return "夹层边界已经找清。它不需要蛮力敲上一千次，只缺一件合适工具或一个愿意留下痕迹的决定。";
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
  return {
    ...object,
    detail: detailForObject(object, objectState, ORIGIN_IDS.has(originId) ? originId : "mystery"),
    state: objectState.actionIds.length ? (availableActionsForObject(object, objectState).some((action) => !action.disabled) ? "special" : "completed") : "available",
    seen: objectState.seen,
    stage: objectState.stage,
    actions: availableActionsForObject(object, objectState),
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

export function resolveTempleObjectAction(exploration, objectId, actionId) {
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
