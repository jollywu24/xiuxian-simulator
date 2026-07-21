export const P1_ARCS = [
  {
    id: "shen_fu_reckoning",
    title: "曹青离场与沈福反目",
    entry: "cao_departure",
    exits: ["m4_journey_end"],
    situation: {
      question: "曹青不在以后，这笔来路不正的钱和逐步失控的沈福该怎么处理？",
      stableFacts: [
        "曹青已经离开金陵，药库、指点与担保不再随叫随到。",
        "沈福私藏的钱带有毒蛇帮转运痕迹。",
        "沈福既怕事情败露，也不愿放弃继续取利。",
        "无论如何处置，原有沈福门路都不会原样保留。",
      ],
      actors: [
        { id: "shen_fu", wants: "保住私财并继续利用陈司命", fears: "被沈家或毒蛇帮灭口", bottomLine: "不会主动交出全部账证" },
        { id: "bai_zhiyun", wants: "查清沈家旧账并控制影响范围", fears: "七杀旧事提前惊动家中高层", bottomLine: "不会替无凭无据的指控公开站队" },
      ],
    },
    coreVariants: ["controlled", "exposed", "broken"],
    solutionMatrix: [
      { id: "control", kind: "noncombat", requires: ["完整账证或预先设局"], costs: ["彼此把柄", "持续监视"], longTerm: "沈福成为高风险的受控联系人" },
      { id: "expose", kind: "noncombat", requires: ["两项物证", "白栀云或曹青留下的担保"], costs: ["灰色门路关闭"], longTerm: "沈福成为证人或囚徒，由内宅替换联系人" },
      { id: "release", kind: "noncombat", requires: [], costs: ["沈福失踪", "毒蛇帮警觉上升"], longTerm: "旧门路永久断裂，留下远方追索" },
      { id: "kill", kind: "combat", requires: ["锻体", "已经实战的杀伐手段"], costs: ["尸身", "沈家怀疑", "毒蛇帮警觉"], longTerm: "斩草除根，沈福门路永久消失" },
    ],
  },
];

export const P1_CONTENT_NODES = [
  {
    id: "cao_departure",
    arc: "shen_fu_reckoning",
    title: "药铺留灯",
    actions: [
      { id: "medicine_key", next: "shen_fu_offer", outcomes: ["aid"] },
      { id: "sealed_letter", next: "shen_fu_offer", outcomes: ["aid"] },
      { id: "enemy_warning", next: "shen_fu_offer", outcomes: ["aid"] },
    ],
  },
  {
    id: "shen_fu_offer",
    arc: "shen_fu_reckoning",
    title: "沉木钱匣",
    actions: [
      { id: "inspect_seal", next: "shen_fu_offer", outcomes: ["evidence"] },
      { id: "compare_tally", next: "shen_fu_offer", outcomes: ["evidence"] },
      { id: "question_source", next: "shen_fu_offer", outcomes: ["evidence", "suspicion"] },
      { id: "finish_inquiry", next: "dirty_money_choice", outcomes: ["continue"] },
    ],
  },
  {
    id: "dirty_money_choice",
    arc: "shen_fu_reckoning",
    title: "钱不能只算钱",
    actions: [
      { id: "report", next: "shen_fu_reckoning", outcomes: ["witness", "hostility"] },
      { id: "share", next: "shen_fu_reckoning", outcomes: ["profit", "compromised"] },
      { id: "hide", next: "shen_fu_reckoning", outcomes: ["evidence", "exposure"] },
      { id: "trap", next: "shen_fu_reckoning", outcomes: ["counterplot"] },
      { id: "refuse", next: "shen_fu_reckoning", outcomes: ["clean", "hostility"] },
    ],
  },
  {
    id: "shen_fu_reckoning",
    arc: "shen_fu_reckoning",
    title: "竭泽而渔",
    actions: [
      { id: "shadow_steps", next: "m4_tracking", outcomes: ["tracked", "costly", "failed"] },
      { id: "water_break", next: "m4_tracking", outcomes: ["tracked", "costly", "failed"] },
      { id: "countermark", next: "m4_tracking", outcomes: ["tracked", "costly", "failed"] },
      { id: "protect_witness", next: "m4_tracking", outcomes: ["protected", "partial"] },
    ],
  },
  {
    id: "m4_tracking",
    arc: "shen_fu_reckoning",
    title: "一路尾灯",
    actions: [{ id: "continue", next: "seven_kill_house", outcomes: ["continue"] }],
  },
  {
    id: "seven_kill_house",
    arc: "shen_fu_reckoning",
    title: "旧宅刀痕",
    actions: [
      { id: "search_drawer", next: "shen_fu_confrontation", outcomes: ["evidence", "alert"] },
      { id: "watch_door", next: "shen_fu_confrontation", outcomes: ["ambush_seen"] },
      { id: "send_bai_message", next: "shen_fu_confrontation", outcomes: ["support", "blocked"] },
    ],
  },
  {
    id: "shen_fu_confrontation",
    arc: "shen_fu_reckoning",
    title: "月黑风高",
    actions: [
      { id: "control", next: "m4_world_echo", outcomes: ["controlled", "blocked"] },
      { id: "expose", next: "m4_world_echo", outcomes: ["exposed", "blocked"] },
      { id: "release", next: "m4_world_echo", outcomes: ["released"] },
      { id: "kill", next: "m4_world_echo", outcomes: ["killed", "blocked"] },
    ],
  },
  {
    id: "m4_world_echo",
    arc: "shen_fu_reckoning",
    title: "旧路已经变了",
    actions: [{ id: "continue", next: "bai_return", outcomes: ["echo"] }],
  },
  {
    id: "bai_return",
    arc: "shen_fu_reckoning",
    title: "寡妇拍门",
    actions: [
      { id: "receive", next: "m4_training", outcomes: ["instruction", "blocked"] },
      { id: "decline", next: "m4_training", outcomes: ["declined"] },
    ],
  },
  {
    id: "m4_training",
    arc: "shen_fu_reckoning",
    title: "闭门试势",
    actions: [
      { id: "apply_to_stake", next: "m4_journey_end", outcomes: ["body_progress", "blocked"] },
      { id: "seal_old_blade", next: "m4_journey_end", outcomes: ["seven_kill_insight", "blocked"] },
      { id: "leave_city", next: "m4_journey_end", outcomes: ["safe_departure"] },
    ],
  },
  {
    id: "m4_journey_end",
    arc: "shen_fu_reckoning",
    title: "独自行路",
    actions: [{ id: "rest", next: null, outcomes: ["ending"] }],
  },
];

export function getP1Node(id) {
  return P1_CONTENT_NODES.find((node) => node.id === id) || null;
}

export function getP1Arc(id) {
  return P1_ARCS.find((arc) => arc.id === id) || null;
}
