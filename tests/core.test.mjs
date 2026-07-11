import test from "node:test";
import assert from "node:assert/strict";

import {
  FATE_PATHS,
  MASTERY_STAGES,
  ageMemories,
  availableTheses,
  createMemory,
  deriveFateMarks,
  evaluatePathConditions,
  evaluateThesis,
  getActionDepth,
  getMasteryStage,
  upsertMemory,
} from "../web/game-core.mjs";

test("all lived information persists independently from settlement rewards", () => {
  let memories = [];
  memories = upsertMemory(memories, createMemory({ id: "well", title: "井水", detail: "酉时换水" }));
  memories = upsertMemory(memories, createMemory({ id: "well", title: "井水", detail: "现实查实酉时换水", level: "verified" }));
  assert.equal(memories.length, 1);
  assert.equal(memories[0].level, "verified");
  assert.match(memories[0].detail, /现实查实/);
});

test("weaker inference never overwrites a verified fact", () => {
  const verified = createMemory({ id: "roster", title: "名册", detail: "现实查实", level: "verified" });
  const inferred = createMemory({ id: "roster", title: "名册", detail: "新的猜测", level: "inferred" });
  assert.deepEqual(upsertMemory([verified], inferred), [verified]);
});

test("world-line deviation marks precise old information as stale without deleting it", () => {
  const memory = createMemory({ id: "timing", title: "酉时二刻", detail: "旧时序" });
  const aged = ageMemories([memory], ["timing"]);
  assert.equal(aged[0].level, "stale");
  assert.match(aged[0].source, /世界线已偏转/);
});

test("new theses unlock from lived memories rather than reward selection", () => {
  assert.deepEqual(availableTheses({ memories: [] }).map((item) => item.id), ["poison_source"]);
  const memories = [createMemory({ id: "poison_source", title: "入口", detail: "井水" })];
  assert.deepEqual(availableTheses({ memories }).map((item) => item.id), ["poison_source", "kill_list", "fallback_plan"]);
});

test("a poison-source death answers the proposition and reveals a deeper mechanism", () => {
  const report = evaluateThesis({ thesisId: "poison_source", action: "taste", feastAction: "feign", endedBy: "death" });
  const ids = report.memories.map((item) => item.id);
  assert.match(report.verdict, /证实/);
  assert.ok(ids.includes("poison_source"));
  assert.ok(ids.includes("well_timing"));
  assert.ok(ids.includes("poison_peak"));
  assert.ok(ids.includes("feign_death"));
  assert.equal(report.depth, 2);
});

test("active closure keeps the answer but returns less depth than death", () => {
  const active = evaluateThesis({ thesisId: "kill_list", action: "roster", feastAction: null, endedBy: "active" });
  const death = evaluateThesis({ thesisId: "kill_list", action: "roster", feastAction: "feign", endedBy: "death" });
  assert.equal(active.depth, 1);
  assert.equal(death.depth, 2);
  assert.ok(!active.memories.some((item) => item.id === "registry_rule"));
  assert.ok(death.memories.some((item) => item.id === "registry_rule"));
});

test("fate-mark candidates derive from behavior and do not repeat owned marks", () => {
  const candidates = deriveFateMarks({ tags: ["feign", "death", "deceive"], existing: [] });
  assert.equal(candidates.length, 3);
  assert.equal(candidates[0].id, "breath_hider");
  const next = deriveFateMarks({ tags: ["feign", "death", "deceive"], existing: ["breath_hider"] });
  assert.ok(next.every((item) => item.id !== "breath_hider"));
});

test("the same poison-tasting action reaches different depths by build", () => {
  assert.equal(getActionDepth({ action: "taste" }).depth, 1);
  assert.equal(getActionDepth({ action: "taste", marks: ["venom_delay"] }).depth, 2);
  assert.equal(getActionDepth({ action: "taste", fixedResults: ["poison_delay"] }).depth, 3);
});

test("the same roster action becomes deeper with an observation mark", () => {
  assert.equal(getActionDepth({ action: "roster" }).depth, 1);
  const deep = getActionDepth({ action: "roster", marks: ["crisis_gaze"] });
  assert.equal(deep.depth, 3);
  assert.match(deep.label, /临危静观/);
});

test("path board exposes explicit missing conditions", () => {
  const state = { memories: [], marks: [], fixedResults: [], preparations: [], flags: [] };
  const path = evaluatePathConditions("replace", state);
  assert.equal(path.enabled, false);
  assert.deepEqual(path.conditions.map((item) => item.met), [false, false, false]);
});

test("replace-water path supports a system-rule preparation", () => {
  const state = {
    memories: [
      createMemory({ id: "poison_source", title: "入口", detail: "井水" }),
      createMemory({ id: "well_timing", title: "时刻", detail: "酉时" }),
    ],
    marks: [], fixedResults: [], preparations: ["well_access"], flags: [],
  };
  assert.equal(evaluatePathConditions("replace", state).enabled, true);
});

test("fake-death path accepts knowledge, construction, relationship, and target conditions", () => {
  const state = {
    memories: [
      createMemory({ id: "poison_peak", title: "峰值", detail: "四十息" }),
      createMemory({ id: "feign_death", title: "确认", detail: "七息" }),
      createMemory({ id: "kill_list", title: "名单", detail: "朱点" }),
    ],
    marks: [], fixedResults: [], preparations: ["trusted_partner"], flags: [],
  };
  const path = evaluatePathConditions("feign", state);
  assert.equal(path.enabled, true);
  assert.ok(path.conditions.every((item) => item.met));
});

test("stale memories remain recorded but cannot satisfy a live path condition", () => {
  const state = {
    memories: [createMemory({ id: "kill_list", title: "名单", detail: "旧名单", level: "stale" })],
    marks: ["venom_delay", "breath_hider"], fixedResults: [], preparations: ["trusted_partner"], flags: [],
  };
  assert.equal(evaluatePathConditions("feign", state).conditions.find((item) => item.id === "kill_list").met, false);
});

test("reverse-list route stays hidden until the enemy contact is taken over", () => {
  const base = { memories: [], marks: [], fixedResults: [], preparations: [], flags: [] };
  assert.equal(evaluatePathConditions("reverse", base).hidden, true);
  const revealed = evaluatePathConditions("reverse", { ...base, flags: ["enemy_contact"] });
  assert.equal(revealed.hidden, false);
  assert.equal(revealed.enabled, false);
});

test("reverse-list route requires contact, false report, and the registry rule", () => {
  const state = {
    memories: [createMemory({ id: "registry_rule", title: "身份规则", detail: "正式门人" })],
    marks: [], fixedResults: [], preparations: [], flags: ["enemy_contact", "false_report"],
  };
  assert.equal(evaluatePathConditions("reverse", state).enabled, true);
});

test("mastery is a six-step climb from suffering to control", () => {
  assert.deepEqual(MASTERY_STAGES, ["受劫", "识劫", "避劫", "破劫", "借劫", "驭劫"]);
  assert.equal(getMasteryStage(-1), "受劫");
  assert.equal(getMasteryStage(99), "驭劫");
  assert.equal(FATE_PATHS.length, 4);
});
