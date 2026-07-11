export const INFO_LEVELS = {
  seen: { label: "见闻", rank: 2 },
  inferred: { label: "推测", rank: 1 },
  verified: { label: "已验证事实", rank: 3 },
  stale: { label: "过期情报", rank: 0 },
};

export const MASTERY_STAGES = ["受劫", "识劫", "避劫", "破劫", "借劫", "驭劫"];

export const THESES = [
  {
    id: "poison_source",
    title: "毒是否来自外院水井？",
    summary: "核对投毒入口、换水时辰与毒发峰值。",
    unlock: () => true,
  },
  {
    id: "kill_list",
    title: "蒙面人是否按照名单补刀？",
    summary: "观察他如何确认目标，以及名单与身份玉牌的关系。",
    unlock: ({ memoryIds }) => memoryIds.includes("poison_source"),
  },
  {
    id: "fallback_plan",
    title: "换水失败后，敌人会启用什么替代方案？",
    summary: "允许旧计划失效，追踪幕后者如何修补死局。",
    unlock: ({ memoryIds }) => memoryIds.includes("poison_source"),
  },
];

export const FATE_MARKS = [
  {
    id: "venom_delay",
    family: "借劫",
    name: "毒息迟滞",
    tags: ["taste", "endure", "poison"],
    effect: "主动摄入已知毒物时，延后四肢失力的峰值。",
    cost: "对未知毒物没有保护。",
  },
  {
    id: "crisis_gaze",
    family: "观命",
    name: "临危静观",
    tags: ["observe", "death", "roster"],
    effect: "濒死后仍可保持观察，额外看见一层行动规则。",
    cost: "死亡记忆造成的心神负担更重。",
  },
  {
    id: "breath_hider",
    family: "藏锋",
    name: "龟息藏命",
    tags: ["feign", "death", "deceive"],
    effect: "可伪造气绝与脉停，让补刀者完成一次错误确认。",
    cost: "伪装期间无法主动反击。",
  },
  {
    id: "guarding_pact",
    family: "守命",
    name: "护命执念",
    tags: ["protect", "warn", "ally"],
    effect: "替同伴承担危险时更容易建立生死信任。",
    cost: "同伴死亡会留下更深心伤。",
  },
  {
    id: "ink_memory",
    family: "观命",
    name: "末字留痕",
    tags: ["roster", "observe", "close"],
    effect: "看过一次的名册顺序与批注不会混淆。",
    cost: "世界线偏转后，旧顺序仍会首先浮现。",
  },
  {
    id: "borrowed_wound",
    family: "借劫",
    name: "借伤落子",
    tags: ["endure", "warn", "death"],
    effect: "受伤时可把敌人的下一步引向预先布置的位置。",
    cost: "必须真实承担一次伤势。",
  },
];

export const FATE_PATHS = [
  {
    id: "avoid",
    stage: "避劫",
    name: "避宴",
    description: "让自己离开晚宴。你能活，却放弃保护他人与追凶。",
    conditions: [{ id: "danger_known", label: "知道晚宴危险" }],
  },
  {
    id: "replace",
    stage: "破劫",
    name: "提前换水",
    description: "冻结晚宴用水流程，救下外院弟子，并观察敌人的替代计划。",
    conditions: [
      { id: "poison_source", label: "确认毒物入口" },
      { id: "well_timing", label: "知道准确换水时辰" },
      { id: "well_access", label: "取得接近水井的制度权限" },
    ],
  },
  {
    id: "feign",
    stage: "借劫",
    name: "假死追凶",
    description: "允许晚宴投毒发生，让补刀者确认死亡，再接管他的联络链。",
    conditions: [
      { id: "poison_control", label: "控制毒发窗口" },
      { id: "feign_death", label: "伪造气绝" },
      { id: "trusted_partner", label: "一名可信任配合者" },
      { id: "kill_list", label: "看懂补刀名单" },
    ],
  },
  {
    id: "reverse",
    stage: "驭劫",
    name: "反向名单",
    description: "替换灭口目标并发送假结果，决定这场死局伤害谁、暴露谁。",
    hiddenUntil: "enemy_contact",
    conditions: [
      { id: "enemy_contact", label: "敌方联络口令" },
      { id: "false_report", label: "发送假结果的方法" },
      { id: "registry_rule", label: "名单与正式身份的底层规则" },
    ],
  },
];

export function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function createMemory({ id, title, detail, level = "seen", source = "模拟亲历" }) {
  if (!INFO_LEVELS[level]) throw new Error(`Unknown memory level: ${level}`);
  return { id, title, detail, level, source };
}

export function upsertMemory(memories, next) {
  const current = memories.find((item) => item.id === next.id);
  if (!current) return [...memories, next];
  const currentRank = INFO_LEVELS[current.level]?.rank ?? -1;
  const nextRank = INFO_LEVELS[next.level]?.rank ?? -1;
  return memories.map((item) => item.id === next.id
    ? (nextRank >= currentRank ? { ...item, ...next } : item)
    : item);
}

export function ageMemories(memories, staleIds = []) {
  const stale = new Set(staleIds);
  return memories.map((memory) => stale.has(memory.id)
    ? { ...memory, level: "stale", source: `${memory.source} · 世界线已偏转` }
    : memory);
}

export function availableTheses(state) {
  const memoryIds = (state.memories || []).map((item) => item.id);
  return THESES.filter((thesis) => thesis.unlock({ memoryIds }));
}

export function evaluateThesis({ thesisId, action, feastAction, endedBy = "death" }) {
  const base = {
    poison_source: {
      verdict: "证实：毒来自外院水井，但真正的杀招是随后按名单补刀。",
      mistake: "只阻止饮水会令敌人启用替代灭口方案。",
      missing: "还不知道名单如何确认身份，也不知道补刀者向谁复命。",
      memories: [
        createMemory({ id: "poison_source", title: "晚宴毒物入口", detail: "乌舌草在酉时经外来水桶进入外院水井。" }),
        createMemory({ id: "well_timing", title: "酉时换水", detail: "酉时二刻，柴房杂役推来无宗门印记的水桶。" }),
      ],
    },
    kill_list: {
      verdict: "证实：蒙面人按照名册与身份玉牌逐一确认补刀目标。",
      mistake: "名单不是一张普通纸；毁掉纸页不会解除身份锁定。",
      missing: "还不知道谁能改写弟子名册，也不知道复命口令。",
      memories: [
        createMemory({ id: "kill_list", title: "补刀名单", detail: "蒙面人只补杀名册上被朱点标记、且玉牌仍亮的人。" }),
        createMemory({ id: "registry_link", title: "名册与玉牌同源", detail: "纸上朱点变化时，目标的身份玉牌会同步发热。", level: "inferred" }),
      ],
    },
    fallback_plan: {
      verdict: "部分证实：换水失败后，敌人会先封锁外院，再逐户核对玉牌。",
      mistake: "晚宴只是集中祭品的方便手段，不是唯一杀局。",
      missing: "还缺少能够反向使用名册的制度入口。",
      memories: [
        createMemory({ id: "fallback_plan", title: "替代灭口方案", detail: "投毒失败后，执事流程会以疫病为名封锁外院。" }),
        createMemory({ id: "registry_rule", title: "正式身份锁定", detail: "灭口术只追索被宗门正式承认、且玉牌登记仍有效的人。", level: "inferred" }),
      ],
    },
  }[thesisId];

  if (!base) throw new Error(`Unknown thesis: ${thesisId}`);
  const memories = [...base.memories];
  if (thesisId === "poison_source" && (action === "taste" || endedBy === "death")) {
    memories.push(createMemory({ id: "poison_peak", title: "毒发峰值", detail: "入口后约四十息四肢尽失，前二十息仍可缓慢行动。" }));
  }
  if (thesisId === "kill_list" && endedBy === "death") {
    memories.push(createMemory({ id: "registry_rule", title: "正式身份锁定", detail: "补刀术只锁定玉牌登记仍有效的正式门人。", level: "seen" }));
  }
  if (feastAction === "feign") {
    memories.push(createMemory({ id: "feign_death", title: "补刀确认方式", detail: "蒙面人先探鼻息，再以短刃确认心脉；两次确认之间有七息空隙。" }));
  }
  if (feastAction === "warn") {
    memories.push(createMemory({ id: "wen_response", title: "闻青禾的应变", detail: "闻青禾会先救仍能行动的人，并愿意配合控制毒发。" }));
  }
  if (endedBy === "active") {
    return { ...base, verdict: `${base.verdict} 你在答案到手后主动收束。`, memories, depth: 1 };
  }
  return { ...base, memories, depth: 2 };
}

export function deriveFateMarks({ tags = [], existing = [] }) {
  const tagSet = new Set(tags);
  const existingSet = new Set(existing);
  const scored = FATE_MARKS
    .filter((mark) => !existingSet.has(mark.id))
    .map((mark) => ({ mark, score: mark.tags.filter((tag) => tagSet.has(tag)).length }))
    .sort((a, b) => b.score - a.score || a.mark.id.localeCompare(b.mark.id));
  const matched = scored.filter((item) => item.score > 0).map((item) => item.mark);
  const fallback = scored.map((item) => item.mark);
  return unique([...matched, ...fallback].map((item) => item.id))
    .map((id) => FATE_MARKS.find((item) => item.id === id))
    .slice(0, 3);
}

export function getActionDepth({ action, marks = [], fixedResults = [] }) {
  const abilities = new Set([...marks, ...fixedResults]);
  const base = { depth: 1, label: "基础尝试", detail: "能够得到表层见闻，但会较快失去行动能力。" };
  if (action === "taste" && abilities.has("poison_delay")) {
    return { depth: 3, label: "固命·毒脉耐受", detail: "完整观察毒发曲线，并保留伪装与移动能力。" };
  }
  if (action === "taste" && abilities.has("venom_delay")) {
    return { depth: 2, label: "命痕·毒息迟滞", detail: "辨认峰值窗口，并多观察补刀者一步。" };
  }
  if (action === "roster" && abilities.has("crisis_gaze")) {
    return { depth: 3, label: "命痕·临危静观", detail: "倒地后仍能看清名册与身份玉牌的同步变化。" };
  }
  if (action === "feign" && abilities.has("breath_hider")) {
    return { depth: 3, label: "命痕·龟息藏命", detail: "让补刀者完成错误确认，并跟到他的复命点。" };
  }
  return base;
}

export function evaluatePathConditions(pathId, state) {
  const path = FATE_PATHS.find((item) => item.id === pathId);
  if (!path) throw new Error(`Unknown path: ${pathId}`);
  const memoryIds = new Set((state.memories || []).filter((item) => item.level !== "stale").map((item) => item.id));
  const marks = new Set(state.marks || []);
  const fixed = new Set(state.fixedResults || []);
  const preparations = new Set(state.preparations || []);
  const flags = new Set(state.flags || []);
  const satisfied = {
    danger_known: memoryIds.has("poison_source") || memoryIds.has("kill_list"),
    poison_source: memoryIds.has("poison_source"),
    well_timing: memoryIds.has("well_timing"),
    well_access: preparations.has("well_access"),
    poison_control: memoryIds.has("poison_peak") || marks.has("venom_delay") || fixed.has("poison_delay"),
    feign_death: memoryIds.has("feign_death") || marks.has("breath_hider"),
    trusted_partner: preparations.has("trusted_partner") || marks.has("guarding_pact") || fixed.has("wen_trust"),
    kill_list: memoryIds.has("kill_list"),
    enemy_contact: flags.has("enemy_contact"),
    false_report: flags.has("false_report"),
    registry_rule: memoryIds.has("registry_rule"),
  };
  const conditions = path.conditions.map((condition) => ({ ...condition, met: Boolean(satisfied[condition.id]) }));
  return {
    ...path,
    hidden: Boolean(path.hiddenUntil && !satisfied[path.hiddenUntil]),
    enabled: conditions.every((condition) => condition.met),
    conditions,
  };
}

export function getMasteryStage(index) {
  return MASTERY_STAGES[Math.max(0, Math.min(MASTERY_STAGES.length - 1, index))];
}
