export const P0_ARCS = [
  {
    id: "third_lady",
    title: "沈家三夫人",
    entry: "third_lady_summons",
    exits: ["needle_inheritance", "third_lady_missed"],
    firstPayoffs: [
      { ability: "purple_dragon_blood_pill", acquireNode: "purple_dragon_alchemy", useNode: "third_lady_treatment" },
      { ability: "spring_rain_needles", acquireNode: "needle_inheritance", useNode: "first_needle_ambush" },
    ],
  },
  {
    id: "apprenticeship",
    title: "针下第一命",
    entry: "first_needle_ambush",
    exits: ["mid_autumn_warning", "apprenticeship_refused"],
    firstPayoffs: [
      { ability: "chosen_stake", acquireNode: "stake_choice", useNode: "stake_training" },
    ],
  },
  {
    id: "monkey_ruins",
    title: "八月十五",
    entry: "mid_autumn_departure",
    exits: ["p0_journey_end", "mid_autumn_missed"],
    firstPayoffs: [
      { ability: "monkey_wine", acquireNode: "monkey_wine_choice", useNode: "ape_water_cave" },
    ],
  },
];

export const P0_CONTENT_NODES = [
  {
    id: "third_lady_summons",
    arc: "third_lady",
    title: "沈家夜召",
    actions: [
      { id: "accept", next: "third_lady_diagnosis", outcomes: ["enter"] },
      { id: "decline", next: "third_lady_missed", outcomes: ["missed"] },
    ],
  },
  {
    id: "third_lady_diagnosis",
    arc: "third_lady",
    title: "帘后问脉",
    actions: [
      { id: "observe", next: "third_lady_diagnosis", outcomes: ["evidence"] },
      { id: "pulse", next: "third_lady_diagnosis", outcomes: ["evidence", "partial"] },
      { id: "ask_manual", next: "third_lady_diagnosis", outcomes: ["evidence", "blocked"] },
      { id: "conclude", next: "purple_dragon_formula", outcomes: ["confirmed", "failure"] },
    ],
  },
  {
    id: "purple_dragon_formula",
    arc: "third_lady",
    title: "换血之方",
    actions: [
      { id: "cao", next: "purple_dragon_alchemy", outcomes: ["ingredients"] },
      { id: "shen", next: "purple_dragon_alchemy", outcomes: ["ingredients", "suspicion"] },
      { id: "merchant", next: "purple_dragon_alchemy", outcomes: ["ingredients", "cost"] },
    ],
  },
  {
    id: "purple_dragon_alchemy",
    arc: "third_lady",
    title: "一炉换血丹",
    actions: [
      { id: "strict", next: "third_lady_treatment", outcomes: ["stable"] },
      { id: "rush", next: "third_lady_treatment", outcomes: ["volatile"] },
      { id: "substitute", next: "third_lady_treatment", outcomes: ["failure"] },
    ],
  },
  {
    id: "third_lady_treatment",
    arc: "third_lady",
    title: "封穴换血",
    actions: [
      { id: "seal_then_pill", next: "needle_inheritance", outcomes: ["saved", "aftereffect"] },
      { id: "pill_direct", next: "needle_inheritance", outcomes: ["stabilized", "failure"] },
      { id: "withdraw", next: "third_lady_missed", outcomes: ["missed"] },
    ],
  },
  {
    id: "needle_inheritance",
    arc: "third_lady",
    title: "春风化雨",
    actions: [{ id: "receive", next: "first_needle_ambush", outcomes: ["skill"] }],
  },
  {
    id: "third_lady_missed",
    arc: "third_lady",
    title: "帘后灯灭",
    actions: [{ id: "leave", next: "p0_journey_end", outcomes: ["ending"] }],
  },
  {
    id: "first_needle_ambush",
    arc: "apprenticeship",
    title: "长街夜袭",
    actions: [
      { id: "observe", next: "first_needle_ambush", outcomes: ["round"] },
      { id: "needle_wrist", next: "first_needle_ambush", outcomes: ["round", "wound"] },
      { id: "extinguish", next: "first_needle_ambush", outcomes: ["round"] },
      { id: "seal", next: "first_kill_aftermath", outcomes: ["subdued"] },
      { id: "kill", next: "first_kill_aftermath", outcomes: ["killed"] },
      { id: "flee", next: "first_kill_aftermath", outcomes: ["escaped"] },
      { id: "reckless", next: "first_needle_ambush", outcomes: ["death"] },
    ],
  },
  {
    id: "first_kill_aftermath",
    arc: "apprenticeship",
    title: "针下留命",
    actions: [{ id: "return", next: "apprenticeship_offer", outcomes: ["continue"] }],
  },
  {
    id: "apprenticeship_offer",
    arc: "apprenticeship",
    title: "曹青问徒",
    actions: [
      { id: "accept", next: "stake_choice", outcomes: ["apprentice"] },
      { id: "decline", next: "apprenticeship_refused", outcomes: ["declined"] },
    ],
  },
  {
    id: "stake_choice",
    arc: "apprenticeship",
    title: "两门桩功",
    actions: [
      { id: "deadwood_stake", next: "stake_training", outcomes: ["skill"] },
      { id: "sea_stilling_stake", next: "stake_training", outcomes: ["skill"] },
    ],
  },
  {
    id: "stake_training",
    arc: "apprenticeship",
    title: "一夜站桩",
    actions: [{ id: "train", next: "body_breakthrough", outcomes: ["progress", "strain"] }],
  },
  {
    id: "body_breakthrough",
    arc: "apprenticeship",
    title: "锻体第一关",
    actions: [
      { id: "steady", next: "mid_autumn_warning", outcomes: ["breakthrough"] },
      { id: "force", next: "body_breakthrough", outcomes: ["death", "wound"] },
    ],
  },
  {
    id: "apprenticeship_refused",
    arc: "apprenticeship",
    title: "师徒缘止",
    actions: [{ id: "leave", next: "p0_journey_end", outcomes: ["ending"] }],
  },
  {
    id: "mid_autumn_warning",
    arc: "apprenticeship",
    title: "月已将圆",
    actions: [{ id: "prepare", next: "mid_autumn_departure", outcomes: ["window"] }],
  },
  {
    id: "mid_autumn_departure",
    arc: "monkey_ruins",
    title: "八月十四出发",
    actions: [
      { id: "water", next: "temple_offering_source", outcomes: ["on_time"] },
      { id: "road", next: "mid_autumn_missed", outcomes: ["late"] },
      { id: "mountain", next: "temple_offering_source", outcomes: ["wounded"] },
      { id: "delay", next: "mid_autumn_missed", outcomes: ["missed"] },
    ],
  },
  {
    id: "temple_offering_source",
    arc: "monkey_ruins",
    title: "贡品有主",
    actions: [{ id: "follow", next: "monkey_test", outcomes: ["discovery"] }],
  },
  {
    id: "monkey_test",
    arc: "monkey_ruins",
    title: "檐上试客",
    actions: [
      { id: "share_peach", next: "monkey_wine_choice", outcomes: ["friend"] },
      { id: "trade", next: "monkey_wine_choice", outcomes: ["neutral"] },
      { id: "grab", next: "monkey_conflict", outcomes: ["hostile"] },
    ],
  },
  {
    id: "monkey_conflict",
    arc: "monkey_ruins",
    title: "林间猴战",
    actions: [
      { id: "root_and_endure", next: "mid_autumn_missed", outcomes: ["wound", "escape"] },
      { id: "anchor_and_withdraw", next: "mid_autumn_missed", outcomes: ["escape"] },
      { id: "flee", next: "mid_autumn_missed", outcomes: ["wound", "escape"] },
    ],
  },
  {
    id: "monkey_wine_choice",
    arc: "monkey_ruins",
    title: "一瓮百果香",
    actions: [
      { id: "share", next: "ape_water_cave", outcomes: ["wine", "bond"] },
      { id: "drink", next: "ape_water_cave", outcomes: ["wine", "body"] },
      { id: "keep", next: "ape_water_cave", outcomes: ["wine", "suspicion"] },
    ],
  },
  {
    id: "ape_water_cave",
    arc: "monkey_ruins",
    title: "水洞神猿",
    actions: [
      { id: "observe", next: "p0_journey_end", outcomes: ["legacy"] },
      { id: "imitate", next: "p0_journey_end", outcomes: ["legacy", "strain"] },
    ],
  },
  {
    id: "mid_autumn_missed",
    arc: "monkey_ruins",
    title: "辰时已过",
    actions: [{ id: "leave", next: "p0_journey_end", outcomes: ["ending"] }],
  },
  {
    id: "p0_journey_end",
    arc: "monkey_ruins",
    title: "月落东郊",
    actions: [{ id: "rest", next: null, outcomes: ["ending"] }],
  },
];

export function getP0Node(id) {
  return P0_CONTENT_NODES.find((node) => node.id === id) || null;
}

export function getP0Arc(id) {
  return P0_ARCS.find((arc) => arc.id === id) || null;
}
