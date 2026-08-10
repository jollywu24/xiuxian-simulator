export const KNOWLEDGE_CATEGORIES = Object.freeze([
  { id: "all", name: "全部", glyph: "册" },
  { id: "person", name: "人", glyph: "客" },
  { id: "event", name: "事", glyph: "记" },
]);

export const KNOWLEDGE_SOURCE_LABELS = Object.freeze({
  hearsay: "耳闻",
  firsthand: "亲见",
  confirmed: "印证",
  later: "后来",
});

const SOURCE_RANK = Object.freeze({ hearsay: 1, firsthand: 2, confirmed: 3, later: 0 });

const fragment = (id, mode, text, options = {}) => Object.freeze({
  id,
  mode,
  label: options.label || KNOWLEDGE_SOURCE_LABELS[mode] || "所知",
  text,
  sceneId: options.sceneId || null,
  npcId: options.npcId || null,
  highlights: Object.freeze(options.highlights || []),
});

export const KNOWLEDGE_CATALOG = Object.freeze({
  medicine_casket: Object.freeze({
    id: "medicine_casket",
    type: "event",
    title: "乌沉药匣",
    summary: "一只走过破庙、货路与丹房的乌木旧匣，封蜡和药气都留着疑处。",
    art: "./assets/knowledge/medicine-casket-v1.webp",
    fragments: Object.freeze([
      fragment("casket_temple_seen", "firsthand", "东郊破庙暗墙夹层里，藏着一只绕有双股药绳的乌木旧匣。", { sceneId: "ruined_temple", highlights: [["东郊破庙", "entity"], ["乌木旧匣", "trace"]] }),
      fragment("casket_cao_seen", "firsthand", "曹青丹房角落摆着一只乌沉药匣，匣角的泥痕与雨夜货路相合。", { sceneId: "shen_danroom", npcId: "cao_qing", highlights: [["曹青", "entity"], ["泥痕", "trace"]] }),
      fragment("casket_shen_seal", "firsthand", "匣面封蜡是沈家药房旧式，旁支差事通常不会用这种印。", { label: "世家", sceneId: "ruined_temple", highlights: [["沈家", "entity"], ["封蜡", "trace"]] }),
      fragment("casket_street_cord", "firsthand", "匣外红绳收口是秦淮货路常见的二手交割结，与鱼市样绳同手。", { label: "市井", sceneId: "shen_danroom", highlights: [["秦淮货路", "entity"], ["红绳", "trace"]] }),
      fragment("casket_mystery_mark", "firsthand", "匣角火印的收笔与血书残字相似，半块玉佩也在靠近时微微发热。", { label: "残忆", sceneId: "shen_danroom", highlights: [["火印", "trace"], ["血书", "danger"]] }),
      fragment("casket_resealed", "confirmed", "匣盖边缘的蜡色深浅不一，封条曾被揭开后重新压回。", { sceneId: "ruined_temple", highlights: [["重新压回", "trace"]] }),
      fragment("casket_opened", "firsthand", "断蜡之后，匣中苦丸与夹层货签全都露了出来；原样交差的路已经断了。", { sceneId: "ruined_temple", highlights: [["苦丸", "trace"], ["路已经断了", "danger"]] }),
      fragment("casket_cao_residue", "later", "曹青从匣缝刮下一点苦垢，认出其中曾盛过会扰乱经脉的伏脉藤。", { sceneId: "shen_danroom", npcId: "cao_qing", highlights: [["曹青", "entity"], ["伏脉藤", "trace"]] }),
      fragment("casket_shenfu_pause", "later", "沈福听见木匣换过手时停了半息，没有追问是谁动过封条。", { sceneId: "shen_side_gate", npcId: "shen_fu", highlights: [["沈福", "entity"], ["换过手", "trace"]] }),
    ]),
    related: Object.freeze([
      { kind: "person", id: "long_qingyu", label: "龙青鱼" },
      { kind: "place", id: "ruined_temple", label: "东郊破庙", routeId: "temple" },
      { kind: "place", id: "qinhuai", label: "秦淮外港", routeId: "qinhuai" },
    ]),
  }),
  fresh_temple_peaches: Object.freeze({
    id: "fresh_temple_peaches",
    type: "event",
    title: "破庙里的新鲜山桃",
    summary: "雨落了一夜，荒庙供桌上的山桃却仍像刚从枝头摘下。",
    art: "./assets/knowledge/fresh-peaches-v1.webp",
    fragments: Object.freeze([
      fragment("peaches_seen", "firsthand", "破庙供桌没有神像，只摆着几枚沾凉露的新鲜山桃。", { sceneId: "ruined_temple", highlights: [["新鲜山桃", "trace"], ["没有神像", "trace"]] }),
      fragment("peaches_rain", "confirmed", "雨从破瓦漏了一夜，桃皮没有泡软，果蒂也没有枯。", { sceneId: "ruined_temple", highlights: [["没有泡软", "trace"], ["没有枯", "trace"]] }),
      fragment("peaches_monkey_trace", "later", "八月十五再回破庙时，檐上桃汁与湿爪印把贡品来路牵向了庙后。", { sceneId: "ruined_temple", highlights: [["八月十五", "entity"], ["湿爪印", "trace"]] }),
      fragment("peaches_missed_trace", "later", "赶到时供桌只剩干涸桃汁；没有见到来客，也仍留下了它曾来过的痕迹。", { sceneId: "ruined_temple", highlights: [["干涸桃汁", "trace"]] }),
    ]),
    related: Object.freeze([
      { kind: "place", id: "ruined_temple", label: "东郊破庙", routeId: "temple" },
    ]),
  }),
  long_qingyu: Object.freeze({
    id: "long_qingyu",
    type: "person",
    title: "龙青鱼",
    summary: "雨夜破庙相逢的青衣女子，水上身法与她掌握的船路都远超寻常江湖客。",
    art: "./assets/knowledge/long-qingyu-v1.webp",
    fragments: Object.freeze([
      fragment("qingyu_strength", "firsthand", "她踏进破庙便先看火势、活口与退路；追兵堵门时，她仍把如何收局留给你决定。", { sceneId: "ruined_temple", npcId: "long_qingyu", highlights: [["如何收局", "trace"]] }),
      fragment("qingyu_origin_shen", "firsthand", "她鞋底沾着大宅修廊常见的青砖漆灰，入庙前去过一处讲规矩的门庭。", { label: "世家", sceneId: "ruined_temple", highlights: [["青砖漆灰", "trace"]] }),
      fragment("qingyu_origin_street", "firsthand", "她入庙时故意踩乱门前一段泥印，显然熟悉码头人追货时认脚迹的法子。", { label: "市井", sceneId: "ruined_temple", highlights: [["踩乱泥印", "trace"]] }),
      fragment("qingyu_origin_mystery", "firsthand", "她的目光在半块玉佩上停了半瞬，像是认得断口，却等着你先问。", { label: "残忆", sceneId: "ruined_temple", highlights: [["半块玉佩", "trace"], ["认得断口", "trace"]] }),
      fragment("qingyu_refused_tool", "firsthand", "你拒绝成为她报复旁人的工具，她因此收住了杀机，也肯坐下说完旧事。", { sceneId: "ruined_temple", highlights: [["收住了杀机", "danger"]] }),
      fragment("qingyu_identity", "confirmed", "天明前她说出姓名：龙青鱼，漕帮帮主夫人。", { npcId: "long_qingyu", sceneId: "ruined_temple", highlights: [["龙青鱼", "entity"], ["漕帮帮主夫人", "entity"]] }),
      fragment("qingyu_mind_art", "later", "她以江鲤行波图灌顶，传下《鱼跃龙门诀》，也把临安重逢的门路留了下来。", { npcId: "long_qingyu", sceneId: "ruined_temple", highlights: [["《鱼跃龙门诀》", "trace"], ["临安", "entity"]] }),
    ]),
    related: Object.freeze([
      { kind: "event", id: "purple_river_night_boat", label: "紫金河夜船" },
      { kind: "place", id: "ruined_temple", label: "东郊破庙", routeId: "temple" },
      { kind: "place", id: "purple_gold_river", label: "紫金河", routeId: "river" },
    ]),
  }),
  purple_river_night_boat: Object.freeze({
    id: "purple_river_night_boat",
    type: "event",
    title: "紫金河夜船",
    summary: "夜深后有船熄灯逆流而行，外港少掉的泊位与沈家货路似乎连在一处。",
    art: "./assets/knowledge/purple-river-night-boat-v1.webp",
    fragments: Object.freeze([
      fragment("night_boat_missing", "hearsay", "鱼市收摊时少了一艘该在船棚里的夜船，牙人只说它提前离港。", { sceneId: "qinhuai_fish_market", npcId: "fish_broker", highlights: [["少了一艘", "trace"], ["提前离港", "trace"]] }),
      fragment("night_boat_porter", "hearsay", "受伤脚夫说，追他的人曾把带沈字货签的箱子搬上一艘无灯乌篷船。", { sceneId: "east_road", npcId: "east_road_porter", highlights: [["沈字货签", "entity"], ["无灯乌篷船", "trace"]] }),
      fragment("night_boat_seen", "confirmed", "沿紫金河下水后，你亲眼看见一艘无灯乌篷船贴着北岸逆流而上。", { sceneId: "purple_gold_river", highlights: [["亲眼看见", "trace"], ["逆流而上", "trace"]] }),
    ]),
    related: Object.freeze([
      { kind: "person", id: "long_qingyu", label: "龙青鱼" },
      { kind: "event", id: "east_road_porter_attack", label: "东郊脚夫遇袭" },
      { kind: "place", id: "purple_gold_river", label: "紫金河", routeId: "river" },
      { kind: "place", id: "qinhuai", label: "秦淮外港", routeId: "qinhuai" },
    ]),
  }),
  east_road_porter_attack: Object.freeze({
    id: "east_road_porter_attack",
    type: "event",
    title: "东郊脚夫遇袭",
    summary: "一名运药脚夫倒在东郊雨路，散货、追者与沈家货签留下了不同去向。",
    art: "./assets/knowledge/east-road-porter-v1.webp",
    fragments: Object.freeze([
      fragment("porter_found", "firsthand", "破庙后墙的血痕通向湿柴堆，一名运药脚夫倒在翻散的竹篓旁。", { sceneId: "ruined_temple", highlights: [["运药脚夫", "entity"], ["血痕", "danger"]] }),
      fragment("porter_rescued", "firsthand", "你撕下里衣压住他的伤口，他保住了性命，也记住了是谁停下脚步。", { sceneId: "ruined_temple", highlights: [["保住了性命", "trace"]] }),
      fragment("porter_questioned", "hearsay", "脚夫说追者只翻带沈字货签的箱子，还提过一艘熄灯逆行的乌篷船。", { sceneId: "ruined_temple", npcId: "east_road_porter", highlights: [["沈字货签", "entity"], ["乌篷船", "trace"]] }),
      fragment("porter_cargo_searched", "firsthand", "散货里混着两枚不同泊位的药批签；同一篓货曾在外港换过手。", { sceneId: "ruined_temple", highlights: [["药批签", "trace"], ["外港", "entity"]] }),
      fragment("porter_lost", "later", "门外来人时脚夫已经没了气息，只剩货签还能说明他为何被追。", { sceneId: "ruined_temple", highlights: [["没了气息", "danger"], ["货签", "trace"]] }),
    ]),
    related: Object.freeze([
      { kind: "event", id: "purple_river_night_boat", label: "紫金河夜船" },
      { kind: "place", id: "qinhuai", label: "秦淮外港", routeId: "qinhuai" },
    ]),
  }),
  ruined_temple_pursuit: Object.freeze({
    id: "ruined_temple_pursuit",
    type: "event",
    title: "破庙追兵",
    summary: "追者循药匣与货签来到破庙，他们认货路留下的规矩，也会灭掉见过交割的人。",
    art: "./assets/knowledge/medicine-casket-v1.webp",
    fragments: Object.freeze([
      fragment("pursuers_seek_casket", "confirmed", "追兵堵住破庙前后出口，开口先问药匣，不问脚夫姓名；他们追的是货，不是私仇。", { sceneId: "ruined_temple", highlights: [["药匣", "entity"], ["追的是货", "trace"]] }),
      fragment("pursuers_read_marks", "firsthand", "他们会认货签、脚印与封绳，却没有认出藏在柴堆夹层里的药匣。", { sceneId: "ruined_temple", highlights: [["货签", "trace"], ["封绳", "trace"]] }),
      fragment("pursuers_route_broken", "later", "破庙中的退路或机关让追者失去当夜的货，但这条取货路线已经暴露。", { sceneId: "ruined_temple", highlights: [["取货路线", "danger"]] }),
    ]),
    related: Object.freeze([
      { kind: "event", id: "medicine_casket", label: "乌沉药匣" },
      { kind: "person", id: "long_qingyu", label: "龙青鱼" },
      { kind: "place", id: "ruined_temple", label: "东郊破庙", routeId: "temple" },
    ]),
  }),
});

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function unique(values) {
  return [...new Set((Array.isArray(values) ? values : []).filter(Boolean))];
}

function getFragmentDefinition(itemId, fragmentId) {
  return KNOWLEDGE_CATALOG[itemId]?.fragments.find((entry) => entry.id === fragmentId) || null;
}

function normalizeSource(source = {}, fallback = {}) {
  return {
    mode: source.mode || fallback.mode || "firsthand",
    npcId: source.npcId || fallback.npcId || null,
    sceneId: source.sceneId || fallback.sceneId || null,
    eventId: source.eventId || fallback.eventId || null,
    chapter: Number(source.chapter || fallback.chapter || 1),
    witness: source.witness || fallback.witness || "player",
  };
}

function sourceKey(source) {
  return [source.mode, source.npcId, source.sceneId, source.eventId, source.chapter, source.witness].join("|");
}

export function createKnowledgeState() {
  return { version: 1, items: {} };
}

export function migrateKnowledgeState(saved) {
  const next = createKnowledgeState();
  const incoming = saved?.items && typeof saved.items === "object" ? saved.items : {};
  Object.entries(incoming).forEach(([itemId, item]) => {
    const definition = KNOWLEDGE_CATALOG[itemId];
    if (!definition || !item || typeof item !== "object") return;
    const fragmentIds = unique(item.fragmentIds).filter((id) => getFragmentDefinition(itemId, id));
    if (!fragmentIds.length) return;
    const sources = {};
    fragmentIds.forEach((fragmentId) => {
      const fragmentDefinition = getFragmentDefinition(itemId, fragmentId);
      const rawSources = Array.isArray(item.sources?.[fragmentId]) ? item.sources[fragmentId] : [];
      const normalized = rawSources.length
        ? rawSources.map((source) => normalizeSource(source, fragmentDefinition))
        : [normalizeSource({}, fragmentDefinition)];
      sources[fragmentId] = normalized.filter((source, index) => normalized.findIndex((candidate) => sourceKey(candidate) === sourceKey(source)) === index);
    });
    next.items[itemId] = {
      discovered: true,
      firstSeenAt: clone(item.firstSeenAt) || clone(sources[fragmentIds[0]]?.[0]) || null,
      lastUpdatedAt: clone(item.lastUpdatedAt) || clone(sources[fragmentIds.at(-1)]?.[0]) || null,
      unreadUpdate: Boolean(item.unreadUpdate),
      pinned: Boolean(item.pinned),
      archived: Boolean(item.archived),
      fragmentIds,
      refutedFragmentIds: unique(item.refutedFragmentIds).filter((id) => fragmentIds.includes(id)),
      sources,
    };
  });
  return next;
}

export function recordKnowledgeFragment(saved, itemId, fragmentId, source = {}) {
  const definition = KNOWLEDGE_CATALOG[itemId];
  const fragmentDefinition = getFragmentDefinition(itemId, fragmentId);
  const state = migrateKnowledgeState(saved);
  if (!definition || !fragmentDefinition) return { state, changed: false, reason: "unknown_knowledge_fragment" };
  const existing = state.items[itemId];
  const normalizedSource = normalizeSource(source, fragmentDefinition);
  if (existing?.fragmentIds.includes(fragmentId)) {
    const sources = existing.sources[fragmentId] || [];
    if (sources.some((entry) => sourceKey(entry) === sourceKey(normalizedSource))) {
      return { state, changed: false, reason: "already_known" };
    }
    existing.sources[fragmentId] = [...sources, normalizedSource];
    existing.lastUpdatedAt = clone(normalizedSource);
    return { state, changed: true, change: { itemId, fragmentId, kind: "source_added" } };
  }
  const firstDiscovery = !existing;
  const item = existing || {
    discovered: true,
    firstSeenAt: clone(normalizedSource),
    lastUpdatedAt: clone(normalizedSource),
    unreadUpdate: false,
    pinned: false,
    archived: false,
    fragmentIds: [],
    refutedFragmentIds: [],
    sources: {},
  };
  item.fragmentIds.push(fragmentId);
  item.sources[fragmentId] = [normalizedSource];
  item.lastUpdatedAt = clone(normalizedSource);
  item.unreadUpdate = firstDiscovery ? false : true;
  state.items[itemId] = item;
  return { state, changed: true, change: { itemId, fragmentId, kind: firstDiscovery ? "discovered" : "updated" } };
}

export function refuteKnowledgeFragment(saved, itemId, fragmentId, correctionFragmentId, source = {}) {
  const known = migrateKnowledgeState(saved);
  if (!known.items[itemId]?.fragmentIds.includes(fragmentId)) return { state: known, changed: false, reason: "fact_not_known" };
  const result = recordKnowledgeFragment(known, itemId, correctionFragmentId, source);
  result.state.items[itemId].refutedFragmentIds = unique([...result.state.items[itemId].refutedFragmentIds, fragmentId]);
  result.state.items[itemId].unreadUpdate = true;
  return { ...result, changed: true };
}

export function markKnowledgeRead(saved, itemId) {
  const state = migrateKnowledgeState(saved);
  if (!state.items[itemId]) return state;
  state.items[itemId].unreadUpdate = false;
  return state;
}

export function createPorterEncounterState(saved) {
  return {
    encountered: Boolean(saved?.encountered),
    resolved: Boolean(saved?.resolved),
    choiceId: typeof saved?.choiceId === "string" ? saved.choiceId : null,
    rescued: Boolean(saved?.rescued),
    questioned: Boolean(saved?.questioned),
    searched: Boolean(saved?.searched),
    alive: saved?.alive !== false,
  };
}

export function resolvePorterEncounter(choiceId, saved) {
  const current = createPorterEncounterState(saved);
  if (current.resolved) return { available: false, reason: "这场雨路遇袭已经留下结果。", state: current };
  const outcomes = {
    rescue_question: {
      rescued: true,
      questioned: true,
      searched: false,
      alive: true,
      result: "你先把脚夫拖到墙根压住伤口。他喘匀一口气，才说追者只认沈字货签。",
    },
    rescue_search: {
      rescued: true,
      questioned: false,
      searched: true,
      alive: true,
      result: "你用油布扎紧伤处，再把散货拢回竹篓。两枚不同泊位的药批签混在同一处。",
    },
    follow_attackers: {
      rescued: false,
      questioned: false,
      searched: true,
      alive: false,
      result: "你循着雨痕追出半里，只捡回一枚沈字货签。再回旧墙时，脚夫已经断了气。",
    },
  };
  const outcome = outcomes[choiceId];
  if (!outcome) return { available: false, reason: "眼下不能这样做。", state: current };
  return {
    available: true,
    result: outcome.result,
    state: {
      encountered: true,
      resolved: true,
      choiceId,
      rescued: outcome.rescued,
      questioned: outcome.questioned,
      searched: outcome.searched,
      alive: outcome.alive,
    },
  };
}

function hasAny(values, candidates) {
  const set = new Set(Array.isArray(values) ? values : []);
  return candidates.some((candidate) => set.has(candidate));
}

export function syncKnowledgeFromGameState(saved, game = {}) {
  let state = migrateKnowledgeState(saved);
  const changes = [];
  const add = (itemId, fragmentId, source = {}) => {
    const result = recordKnowledgeFragment(state, itemId, fragmentId, source);
    state = result.state;
    if (result.changed && result.change?.kind !== "source_added") changes.push(result.change);
  };
  const originId = game.originId || game.backgroundId;
  const originFacts = [...(game.originKnowledge || []), ...(game.originPrologue?.discoveredFactIds || [])];
  const temple = game.templeExploration || {};
  const templeActions = game.templeOpening?.actions || [];
  const hasSeenPeaches = Boolean(game.templeOpening?.peachEaten || templeActions.includes("eat_peach"));
  if (hasSeenPeaches) {
    add("fresh_temple_peaches", "peaches_seen", { sceneId: "ruined_temple", eventId: "temple_opening_peach" });
    add("fresh_temple_peaches", "peaches_rain", { mode: "confirmed", sceneId: "ruined_temple", eventId: "temple_opening_peach" });
  }
  if (game.p0?.offeringResolved || game.p0?.apeLegacy || game.screen === "monkeyTest" || game.screen === "monkeyWineChoice") {
    add("fresh_temple_peaches", "peaches_monkey_trace", { mode: "later", sceneId: "ruined_temple", eventId: "mid_autumn_return" });
  }
  if (game.p0?.missedEvent === "temple_offering" || game.p0?.missedOffering) {
    add("fresh_temple_peaches", "peaches_missed_trace", { mode: "later", sceneId: "ruined_temple", eventId: "mid_autumn_missed" });
  }

  const casketTempleSeen = Boolean(temple.casket?.discovered || hasAny(game.inventory, ["sealed_medicine_box", "opened_medicine_box"]));
  if (casketTempleSeen) add("medicine_casket", "casket_temple_seen", { sceneId: "ruined_temple", eventId: "origin_temple_task" });
  if (game.caoIdentitySeen) add("medicine_casket", "casket_cao_seen", { sceneId: "shen_danroom", eventId: "cao_arrival" });
  if (casketTempleSeen && originId === "shen_branch") add("medicine_casket", "casket_shen_seal", { sceneId: "ruined_temple", eventId: "origin_temple_task" });
  if (casketTempleSeen && originId === "streetborn") add("medicine_casket", "casket_street_cord", { sceneId: "ruined_temple", eventId: "origin_temple_task" });
  if (casketTempleSeen && originId === "mystery") add("medicine_casket", "casket_mystery_mark", { sceneId: "ruined_temple", eventId: "origin_temple_task" });
  if (temple.casket?.inspected || hasAny(originFacts, ["box_changed_hands", "reported_box_transfer_trace"])) add("medicine_casket", "casket_resealed", { mode: "confirmed", sceneId: "ruined_temple", eventId: "inspect_box_seal" });
  if (temple.casket?.opened || originFacts.includes("box_contains_bitter_pills")) add("medicine_casket", "casket_opened", { sceneId: "ruined_temple", eventId: "open_box" });
  if (game.observationChoice === "watch") add("medicine_casket", "casket_cao_residue", { mode: "later", sceneId: "shen_danroom", npcId: "cao_qing", eventId: "dan_observation" });
  if (originFacts.includes("reported_box_transfer_trace")) add("medicine_casket", "casket_shenfu_pause", { mode: "later", sceneId: "shen_side_gate", npcId: "shen_fu", eventId: "origin_return_report" });

  if (game.relationship || temple.lady?.arrived) {
    add("long_qingyu", "qingyu_strength", { sceneId: "ruined_temple", npcId: "long_qingyu", eventId: "lady_arrival" });
    if (originFacts.includes("lady_courtyard_dust")) add("long_qingyu", "qingyu_origin_shen", { sceneId: "ruined_temple", npcId: "long_qingyu" });
    if (originFacts.includes("lady_came_alone")) add("long_qingyu", "qingyu_origin_street", { sceneId: "ruined_temple", npcId: "long_qingyu" });
    if (originFacts.includes("lady_noticed_jade")) add("long_qingyu", "qingyu_origin_mystery", { sceneId: "ruined_temple", npcId: "long_qingyu" });
    if ((game.ladyChoiceLog || []).includes("refuse")) add("long_qingyu", "qingyu_refused_tool", { sceneId: "ruined_temple", npcId: "long_qingyu", eventId: "lady_test" });
    if (temple.lady?.identityKnown || (game.relationship && !temple.lady?.arrived)) add("long_qingyu", "qingyu_identity", { mode: "confirmed", sceneId: "ruined_temple", npcId: "long_qingyu", eventId: "night_talk" });
    if (game.mindArt) add("long_qingyu", "qingyu_mind_art", { mode: "later", sceneId: "ruined_temple", npcId: "long_qingyu", eventId: "mind_art_reward" });
  }

  const porter = createPorterEncounterState(game.porterEncounter);
  if (porter.encountered) add("east_road_porter_attack", "porter_found", { sceneId: "ruined_temple", eventId: "temple_porter" });
  if (porter.rescued) add("east_road_porter_attack", "porter_rescued", { sceneId: "ruined_temple", eventId: porter.choiceId });
  if (porter.questioned) add("east_road_porter_attack", "porter_questioned", { mode: "hearsay", sceneId: "ruined_temple", npcId: "east_road_porter", eventId: porter.choiceId });
  if (porter.searched) add("east_road_porter_attack", "porter_cargo_searched", { sceneId: "ruined_temple", eventId: porter.choiceId });
  if (porter.encountered && !porter.alive) add("east_road_porter_attack", "porter_lost", { mode: "later", sceneId: "ruined_temple", eventId: porter.choiceId });

  if (hasAny(originFacts, ["missing_night_boat", "sealed_night_cargo"])) add("purple_river_night_boat", "night_boat_missing", { mode: "hearsay", sceneId: "qinhuai_fish_market", eventId: "origin_fish_market" });
  if (porter.questioned) add("purple_river_night_boat", "night_boat_porter", { mode: "hearsay", sceneId: "ruined_temple", npcId: "east_road_porter", eventId: porter.choiceId });
  if (game.roadTrial === "dive") add("purple_river_night_boat", "night_boat_seen", { mode: "confirmed", sceneId: "purple_gold_river", eventId: "road_trial_dive" });

  if (temple.crisis?.resolved) {
    add("ruined_temple_pursuit", "pursuers_seek_casket", { mode: "confirmed", sceneId: "ruined_temple", eventId: temple.crisis.method });
    if (temple.crisis.method === "hide_casket") add("ruined_temple_pursuit", "pursuers_read_marks", { sceneId: "ruined_temple", eventId: temple.crisis.method });
    if (["drop_rack", "escape_breach", "hide_casket"].includes(temple.crisis.method)) add("ruined_temple_pursuit", "pursuers_route_broken", { mode: "later", sceneId: "ruined_temple", eventId: temple.crisis.method });
  }

  return { state, changes };
}

function latestPrimarySource(definition, item) {
  const known = definition.fragments.filter((entry) => item.fragmentIds.includes(entry.id) && entry.mode !== "later");
  return known.sort((a, b) => SOURCE_RANK[b.mode] - SOURCE_RANK[a.mode] || definition.fragments.indexOf(b) - definition.fragments.indexOf(a))[0] || null;
}

function relationIsVisible(relation, knowledge, game) {
  if (relation.kind === "person" || relation.kind === "event") return Boolean(knowledge.items[relation.id]);
  if (relation.id === "qinhuai") return Boolean(game.m4?.started);
  if (relation.id === "purple_gold_river") return Boolean(game.mindArt || game.roadTrial || game.shenChapterStarted);
  return true;
}

export function createKnowledgeBoard(game = {}, options = {}) {
  const synced = syncKnowledgeFromGameState(game.knowledge, game).state;
  const categoryId = KNOWLEDGE_CATEGORIES.some((entry) => entry.id === options.category) ? options.category : "all";
  const items = Object.values(KNOWLEDGE_CATALOG)
    .filter((definition) => synced.items[definition.id])
    .filter((definition) => categoryId === "all" || definition.type === categoryId)
    .map((definition) => {
      const item = synced.items[definition.id];
      const primary = latestPrimarySource(definition, item);
      const fragments = definition.fragments
        .filter((entry) => item.fragmentIds.includes(entry.id))
        .map((entry) => ({ ...entry, refuted: item.refutedFragmentIds.includes(entry.id), sources: clone(item.sources[entry.id] || []) }));
      return {
        id: definition.id,
        type: definition.type,
        title: definition.title,
        summary: definition.summary,
        art: definition.art,
        source: primary ? { mode: primary.mode, label: primary.label } : { mode: "firsthand", label: "亲见" },
        unreadUpdate: item.unreadUpdate,
        fragments: fragments.filter((entry) => entry.mode !== "later"),
        later: fragments.filter((entry) => entry.mode === "later"),
        related: definition.related.filter((relation) => relationIsVisible(relation, synced, game)),
      };
    })
    .sort((a, b) => Number(b.unreadUpdate) - Number(a.unreadUpdate) || Object.keys(KNOWLEDGE_CATALOG).indexOf(a.id) - Object.keys(KNOWLEDGE_CATALOG).indexOf(b.id));
  const selectedId = items.some((entry) => entry.id === options.selectedId) ? options.selectedId : items[0]?.id || null;
  return {
    categories: KNOWLEDGE_CATEGORIES.map((entry) => ({ ...entry, selected: entry.id === categoryId })),
    categoryId,
    items,
    selectedId,
    selected: items.find((entry) => entry.id === selectedId) || null,
  };
}
