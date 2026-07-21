import test from "node:test";
import assert from "node:assert/strict";

import {
  SCENE_ASSET_PATHS,
  getRoutePresentation,
  getScenePresentation,
} from "../web/wudao-scenes.mjs";

function state(overrides = {}) {
  return {
    name: "陈司命",
    completedTempleTasks: [],
    inventory: [],
    attributes: { strength: 0, constitution: 0, agility: 0, insight: 0, fortune: 0 },
    fireMinutes: 40,
    p0: { started: false },
    m4: {
      started: false,
      evidence: [],
      tracking: {},
      contacts: { shen_fu: { permissions: [] }, replacement: null },
      dirtyMoney: { disposition: null },
      locationStates: { shen_side_gate: "open", qinhuai_old_house: "hidden" },
    },
    ...overrides,
  };
}

test("five compressed environment assets anchor the first visual locations and combat bridge", () => {
  assert.equal(SCENE_ASSET_PATHS.length, 5);
  assert.equal(new Set(SCENE_ASSET_PATHS).size, 5);
  assert.ok(SCENE_ASSET_PATHS.every((asset) => asset.startsWith("./assets/") && asset.endsWith(".webp")));
});

test("every visual scene exposes serializable, bounded and uniquely identified markers", () => {
  for (const screen of ["templeTasks", "roadTrial", "shenArrival", "danObservation", "yanJinghongArrival", "wangBattle"]) {
    const scene = getScenePresentation(screen, state({ destinyRevealed: true, mindArt: "fish_leap_dragon_gate" }));
    assert.ok(scene?.image);
    assert.ok(scene.alt.length > 10);
    assert.doesNotThrow(() => JSON.stringify(scene));
    const markerIds = [...scene.hotspots, ...scene.actors].map((marker) => marker.id);
    assert.equal(new Set(markerIds).size, markerIds.length);
    for (const marker of [...scene.hotspots, ...scene.actors, scene.player]) {
      assert.ok(marker.x >= 0 && marker.x <= 100, `${screen}:${marker.id || "player"} x`);
      assert.ok(marker.y >= 0 && marker.y <= 100, `${screen}:${marker.id || "player"} y`);
    }
  }
});

test("柳巷尾随不会提前暴露王卓，进入河岸后才揭示身份", () => {
  const hidden = getScenePresentation("yanJinghongArrival", state({ p0: { started: true } }));
  assert.equal(hidden.id, "willow_lane");
  assert.equal(hidden.actors.find((actor) => actor.id === "wang_zhuo").label, "尾随人影");
  const revealed = getScenePresentation("wangBattle", state({ p0: { started: true, wangBattle: { battle: { stageId: "riverbank", knownFacts: ["wang_identity"], conditions: {} } } } }));
  assert.equal(revealed.id, "east_lake");
  assert.equal(revealed.actors.find((actor) => actor.id === "wang_zhuo").label, "王卓");
});

test("character identity on the ruined-temple stage follows the story reveal", () => {
  assert.equal(getScenePresentation("templeWake", state()).actors.length, 0);
  assert.equal(getScenePresentation("ladyArrival", state()).actors[0].label, "青衣妇人");
  assert.equal(getScenePresentation("encounterReward", state()).actors[0].label, "龙青鱼");
});

test("visual object descriptions react to existing game progress", () => {
  const temple = getScenePresentation("templeTasks", state({
    destinyRevealed: true,
    completedTempleTasks: ["traveler_relic", "shen_promise"],
  }));
  const wall = temple.hotspots.find((item) => item.id === "patched_wall");
  assert.equal(wall.state, "completed");
  assert.match(wall.detail, /旅人遗物.*沈字铜钱/);

  const danroom = getScenePresentation("danObservation", state({
    caoIdentitySeen: true,
    bloodChoice: "comply",
    bloodLoss: 1,
    alchemyProgress: 61,
  }));
  assert.equal(danroom.id, "shen_danroom");
  assert.equal(danroom.actors[0].label, "曹青");
  assert.match(danroom.hotspots.find((item) => item.id === "blood_bowl").detail, /损失1点根骨/);
});

test("the route board reveals locations from possessions and relationships without spoiling unknown places", () => {
  const unknown = getRoutePresentation("templeTasks", state({ destinyRevealed: true }));
  assert.deepEqual(unknown.nodes.map((node) => node.id), ["temple", "beyond_rain"]);

  const known = getRoutePresentation("roadTrial", state({
    mindArt: "fish_leap_dragon_gate",
    completedTempleTasks: ["shen_promise"],
    relationship: "莫逆之交",
  }));
  assert.deepEqual(known.nodes.map((node) => node.id), ["temple", "river", "shen", "linan"]);
  assert.equal(known.nodes.find((node) => node.id === "river").status, "current");
  assert.ok(known.edges.some((edge) => edge.from === "river" && edge.to === "shen"));
  assert.ok(known.edges.some((edge) => edge.from === "river" && edge.to === "linan"));
});

test("M4 turns the Shen gate, Qinhuai trail and old house into persistent readable places", () => {
  const offer = getScenePresentation("shenFuOffer", state({
    m4: {
      started: true,
      evidence: [],
      tracking: {},
      contacts: { shen_fu: { permissions: ["side_gate"] }, replacement: null },
      dirtyMoney: { disposition: null },
      locationStates: { shen_side_gate: "open", qinhuai_old_house: "hidden" },
    },
  }));
  assert.equal(offer.id, "shen_side_gate");
  assert.equal(offer.actors[0].label, "沈福");
  assert.equal(offer.hotspots.find((item) => item.id === "money_chest").state, "danger");

  const oldHouse = getScenePresentation("sevenKillHouse", state({
    m4: {
      started: true,
      evidence: ["hidden_ledger", "seven_kill_rubbing"],
      sevenKillClue: true,
      tracking: { grade: "success", alert: 0 },
      contacts: { shen_fu: { permissions: ["side_gate"] }, replacement: null },
      dirtyMoney: { disposition: "trap" },
      locationStates: { shen_side_gate: "open", qinhuai_old_house: "known" },
    },
  }));
  assert.equal(oldHouse.id, "qinhuai_old_house");
  assert.equal(oldHouse.hotspots.find((item) => item.id === "blade_case").state, "completed");

  const echo = getScenePresentation("m4WorldEcho", state({
    m4: {
      started: true,
      outcome: "killed",
      evidence: ["hidden_ledger"],
      tracking: { grade: "success", alert: 0 },
      contacts: { shen_fu: { permissions: [] }, replacement: null },
      dirtyMoney: { disposition: "hide" },
      locationStates: { shen_side_gate: "sealed", qinhuai_old_house: "known" },
    },
  }));
  assert.equal(echo.actors.length, 0);
  assert.match(echo.summary, /认你的人.*门后风险/);
});

test("M4 route knowledge reveals Qinhuai only after the new arc starts", () => {
  const hidden = getRoutePresentation("shenFuOffer", state({ shenChapterStarted: true }));
  assert.equal(hidden.nodes.some((node) => node.id === "qinhuai"), false);

  const revealed = getRoutePresentation("sevenKillHouse", state({
    shenChapterStarted: true,
    m4: {
      started: true,
      evidence: ["hidden_ledger"],
      sevenKillClue: false,
      tracking: { grade: "success", alert: 0 },
      contacts: { shen_fu: { permissions: ["side_gate"] }, replacement: null },
      dirtyMoney: { disposition: "trap" },
      locationStates: { shen_side_gate: "open", qinhuai_old_house: "known" },
    },
  }));
  assert.equal(revealed.nodes.find((node) => node.id === "qinhuai").status, "current");
  assert.ok(revealed.edges.some((edge) => edge.from === "east_gate" && edge.to === "qinhuai"));
});
