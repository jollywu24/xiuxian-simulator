export const P0_ITEMS = [
  {
    id: "return_spring_pill",
    name: "下品回春丹",
    category: "medicine",
    tags: ["healing", "blood", "common"],
    description: "曹青传授、由你亲手炼成，可止血补气并稳住轻中伤。",
  },
  {
    id: "purple_scale_herb",
    name: "紫鳞草",
    category: "ingredient",
    tags: ["blood", "warming"],
    description: "叶背生紫纹，能引动衰弱气血。",
  },
  {
    id: "blood_vine_core",
    name: "血藤芯",
    category: "ingredient",
    tags: ["blood", "binding"],
    description: "只取藤心一线，用来约束换血时的药力。",
  },
  {
    id: "calm_pulse_sand",
    name: "定脉砂",
    category: "ingredient",
    tags: ["meridian", "cooling"],
    description: "沈家秘库所藏，可以暂压逆行经脉。",
  },
  {
    id: "purple_dragon_blood_pill",
    name: "紫龙换血丹",
    category: "medicine",
    tags: ["blood", "meridian", "dangerous"],
    description: "以猛药换动气血，服用前必须先稳住经脉。",
  },
  {
    id: "spring_rain_needles",
    name: "春风银针",
    category: "tool",
    tags: ["medical", "needle", "weapon"],
    description: "既可止血封穴，也能在一念之间夺命。",
  },
  {
    id: "fish_scale_token",
    name: "鱼鳞铜签",
    category: "clue",
    tags: ["assailant", "signal", "counterplan"],
    description: "刀客用来回报成败的凭证，背面刻着东水门桥洞与丑时暗记。",
  },
  {
    id: "monkey_wine",
    name: "猴儿酒",
    category: "treasure",
    tags: ["body", "warming", "rare"],
    description: "百果山泉自然发酵，药力足以洗练初入锻体者。",
  },
  {
    id: "ape_relief_rubbing",
    name: "神猿残刻拓痕",
    category: "clue",
    tags: ["legacy", "ape", "martial"],
    description: "水洞石壁上的挥棒残势，只够记下一段发力轮廓。",
  },
];

export const P0_SKILLS = [
  {
    id: "spring_rain_needles",
    name: "春风化雨针",
    type: "technique",
    grade: "黄级",
    tags: ["medical", "needle", "ranged", "lethal"],
    moves: ["止血针", "封穴针", "穿喉针"],
  },
  {
    id: "deadwood_stake",
    name: "神农枯木桩",
    type: "stake",
    grade: "黄级",
    tags: ["healing", "poison", "endurance"],
    moves: ["枯息守身", "纳药入骨"],
  },
  {
    id: "sea_stilling_stake",
    name: "沧澜定海桩",
    type: "stake",
    grade: "黄级",
    tags: ["water", "balance", "impact"],
    moves: ["定浪沉身", "听潮行气"],
  },
  {
    id: "ape_legacy_clue",
    name: "神猿挥棒残势",
    type: "legacy_clue",
    grade: "未明",
    tags: ["ape", "strength", "unresolved"],
    moves: [],
  },
];

export const P0_NPCS = [
  {
    id: "bai_zhiyun",
    name: "白栀云",
    knownAs: "沈家三夫人",
    initialRelation: { favor: 0, trust: 0, debt: 0, suspicion: 5 },
  },
  {
    id: "night_assailant",
    name: "蒙面刀客",
    knownAs: "夜袭者",
    initialRelation: { favor: -30, trust: 0, debt: 0, suspicion: 0 },
  },
  {
    id: "temple_monkeys",
    name: "破庙灵猴",
    knownAs: "檐上猴群",
    initialRelation: { favor: 0, trust: 0, debt: 0, suspicion: 10 },
  },
];

export const P0_LOCATIONS = [
  { id: "east_pharmacy", name: "东门药铺", routes: ["shen_inner_house", "purple_river"] },
  { id: "shen_inner_house", name: "沈家内宅", routes: ["east_pharmacy", "purple_river"] },
  { id: "purple_river", name: "紫金河", routes: ["east_pharmacy", "ruined_temple"] },
  { id: "ruined_temple", name: "东郊破庙", routes: ["purple_river", "monkey_trail"] },
  { id: "monkey_trail", name: "庙后猴道", routes: ["ruined_temple", "ape_water_cave"] },
  { id: "ape_water_cave", name: "神猿水洞", routes: ["monkey_trail"] },
];

export function getP0Item(id) {
  return P0_ITEMS.find((item) => item.id === id) || null;
}

export function getP0Skill(id) {
  return P0_SKILLS.find((skill) => skill.id === id) || null;
}

export function getP0Npc(id) {
  return P0_NPCS.find((npc) => npc.id === id) || null;
}

export function getP0Location(id) {
  return P0_LOCATIONS.find((location) => location.id === id) || null;
}
