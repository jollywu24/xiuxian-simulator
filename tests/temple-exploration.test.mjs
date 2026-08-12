import test from "node:test";
import assert from "node:assert/strict";

import {
  TEMPLE_AREAS,
  TEMPLE_OBJECTS,
  TEMPLE_SITUATION_LIMIT,
  beginTempleArrival,
  createTempleExplorationState,
  enterTempleArea,
  getTempleAreaView,
  getTempleCrisisOptions,
  getTempleLadyResponses,
  getTempleObjectView,
  getTempleOutcomeSummary,
  getTemplePorterView,
  getTempleSituationClock,
  migrateTempleExplorationState,
  revealTempleObject,
  resolveTempleCasketAction,
  resolveTempleCrisis,
  resolveTempleLadyResponse,
  resolveTempleObjectAction,
  resolveTemplePorterAction,
} from "../web/temple-exploration.mjs";

function see(state, objectId) {
  const result = revealTempleObject(state, objectId);
  assert.equal(result.available, true);
  return result.state;
}

function act(state, objectId, actionId) {
  const result = resolveTempleObjectAction(state, objectId, actionId);
  assert.equal(result.available, true, result.reason);
  return result;
}

test("the first ruined-temple slice exposes three areas and twelve bounded objects", () => {
  assert.deepEqual(TEMPLE_AREAS.map((area) => area.id), ["forecourt", "hall", "rear"]);
  assert.equal(TEMPLE_OBJECTS.length, 12);
  for (const area of TEMPLE_AREAS) {
    assert.equal(TEMPLE_OBJECTS.filter((object) => object.areaId === area.id).length, 4);
  }
  const state = createTempleExplorationState();
  assert.equal(getTempleAreaView(state).objects.length, 4);
  assert.equal(getTempleSituationClock(state).remaining, TEMPLE_SITUATION_LIMIT);
});

test("looking and changing areas are free, while acting advances the situation", () => {
  let state = createTempleExplorationState();
  state = see(state, "embers");
  assert.equal(state.elapsed, 0);
  const moved = enterTempleArea(state, "forecourt");
  assert.equal(moved.available, true);
  assert.equal(moved.state.elapsed, 0);
  assert.deepEqual(moved.state.visitedAreaIds, ["hall", "forecourt"]);

  state = enterTempleArea(moved.state, "hall").state;
  const result = act(state, "embers", "tend_embers");
  assert.equal(result.state.elapsed, 1);
  assert.equal(result.state.objectStates.embers.stage, "kindled");
});

test("objects can change once and become useful again without duplicating rewards", () => {
  let state = see(createTempleExplorationState(), "embers");
  state = act(state, "embers", "tend_embers").state;
  let view = getTempleObjectView(state, "embers");
  assert.equal(view.stage, "kindled");
  assert.equal(view.actions.find((action) => action.id === "bank_embers").disabled, false);

  state = act(state, "embers", "bank_embers").state;
  view = getTempleObjectView(state, "embers");
  assert.equal(view.stage, "banked");
  assert.equal(view.state, "completed");
  assert.equal(resolveTempleObjectAction(state, "embers", "bank_embers").available, false);
});

test("rain and footsteps advance automatically and close the exploration window", () => {
  let state = createTempleExplorationState();
  const route = [
    ["hall", "embers", "tend_embers"],
    ["hall", "offering_table", "inspect_offerings"],
    ["hall", "incense_rack", "inspect_rack"],
    ["hall", "deity_statue", "inspect_statue"],
    ["forecourt", "doorway", "listen_at_gate"],
    ["forecourt", "broken_window", "inspect_window"],
    ["forecourt", "rain_tracks", "trace_rain_tracks"],
  ];
  let sawRain = false;
  let sawFootsteps = false;
  let final = null;
  for (const [areaId, objectId, actionId] of route) {
    state = enterTempleArea(state, areaId).state;
    state = see(state, objectId);
    const result = act(state, objectId, actionId);
    state = result.state;
    sawRain ||= state.phase === "driving_rain";
    sawFootsteps ||= state.phase === "footsteps";
    final = result;
  }
  assert.equal(sawRain, true);
  assert.equal(sawFootsteps, true);
  assert.equal(final.arrivalTriggered, true);
  assert.equal(state.elapsed, TEMPLE_SITUATION_LIMIT);
  assert.equal(state.phase, "arrival");
  assert.match(final.phaseOutcome, /脚步/);
  assert.equal(resolveTempleObjectAction(state, "broken_window", "brace_window").available, false);
});

test("a long action records every situation threshold it crosses", () => {
  let state = createTempleExplorationState({ elapsed: 6 });
  state = enterTempleArea(state, "rear").state;
  state = see(state, "roof_scratches");
  const result = act(state, "roof_scratches", "inspect_scratches");
  assert.equal(result.state.elapsed, 8);
  assert.equal(result.state.phase, "arrival");
  assert.equal(result.phaseOutcomes.length, 2);
  assert.match(result.phaseOutcomes[0], /脚步/);
  assert.match(result.phaseOutcomes[1], /石阶/);
});

test("the action budget prevents resolving every object before someone arrives", () => {
  let state = createTempleExplorationState();
  const attempted = [];
  for (const area of TEMPLE_AREAS) {
    state = enterTempleArea(state, area.id).state;
    for (const object of TEMPLE_OBJECTS.filter((entry) => entry.areaId === area.id)) {
      state = see(state, object.id);
      const first = getTempleObjectView(state, object.id).actions.find((action) => !action.disabled);
      if (!first) continue;
      const result = resolveTempleObjectAction(state, object.id, first.id);
      if (!result.available) continue;
      attempted.push(first.id);
      state = result.state;
      if (state.arrivalTriggered) break;
    }
    if (state.arrivalTriggered) break;
  }
  assert.ok(attempted.length < TEMPLE_OBJECTS.length);
  assert.equal(state.arrivalTriggered, true);
});

test("legacy temple saves migrate without reviving the old three-action gate", () => {
  const migrated = migrateTempleExplorationState({
    version: 11,
    screen: "fateSight",
    templeOpening: { fireTended: true, wallSeen: true, actions: ["tend_fire", "check_belongings", "eat_peach"] },
  });
  assert.equal(migrated.objectStates.embers.stage, "kindled");
  assert.equal(migrated.objectStates.patched_wall.stage, "measured");
  assert.ok(migrated.elapsed < migrated.limit);

  const versionTwelve = migrateTempleExplorationState({
    version: 12,
    screen: "ladyArrival",
    inventory: ["opened_medicine_box"],
    porterEncounter: { encountered: true, resolved: true, rescued: true, questioned: true, alive: true },
    templeExploration: { elapsed: 8, arrivalTriggered: true },
  });
  assert.equal(versionTwelve.casket.opened, true);
  assert.equal(versionTwelve.casket.holder, "player");
  assert.equal(versionTwelve.porter.questioned, true);
  assert.equal(versionTwelve.porter.aidSpent, true);
});

test("the medicine casket keeps inspect, seal, holder and loss as separate persistent facts", () => {
  let state = enterTempleArea(createTempleExplorationState(), "rear").state;
  state = see(state, "patched_wall");
  state = act(state, "patched_wall", "inspect_wall").state;
  state = act(state, "patched_wall", "sound_wall").state;
  assert.equal(state.casket.discovered, true);

  const inspected = resolveTempleCasketAction(state, "inspect_casket", "shen_branch");
  assert.equal(inspected.available, true);
  assert.equal(inspected.state.casket.inspected, true);
  assert.equal(inspected.state.casket.opened, false);
  assert.equal(inspected.state.casket.holder, "wall");
  assert.match(inspected.outcome, /沈家旧式黄蜡/);

  const taken = resolveTempleCasketAction(inspected.state, "take_casket_intact", "shen_branch");
  assert.equal(taken.state.casket.holder, "player");
  assert.equal(taken.state.casket.opened, false);
  assert.equal(resolveTempleCasketAction(taken.state, "take_casket_intact", "shen_branch").available, false);

  const opened = resolveTempleCasketAction(state, "open_casket", "streetborn");
  assert.equal(opened.state.casket.opened, true);
  assert.equal(opened.state.casket.holder, "player");
  assert.match(opened.outcome, /外港货签/);
});

test("each origin can earn at least three distinct ruined-temple readings", () => {
  for (const originId of ["shen_branch", "streetborn", "mystery"]) {
    let state = createTempleExplorationState();
    for (const [areaId, objectId, actionId] of [
      ["forecourt", "rain_tracks", "trace_rain_tracks"],
      ["hall", "deity_statue", "inspect_statue"],
      ["rear", "patched_wall", "inspect_wall"],
    ]) {
      state = enterTempleArea(state, areaId).state;
      state = see(state, objectId);
      const result = resolveTempleObjectAction(state, objectId, actionId, originId);
      assert.equal(result.available, true);
      state = result.state;
      assert.match(getTempleObjectView(state, objectId, originId).detail, /[\u4e00-\u9fff]/);
    }
    assert.equal(state.originClueIds.filter((id) => id.startsWith(`${originId}:`)).length, 3);
  }
});

test("the injured porter costs time and clothing, then independently yields testimony or cargo evidence", () => {
  let state = enterTempleArea(createTempleExplorationState(), "rear").state;
  state = see(state, "blood_trail");
  state = act(state, "blood_trail", "follow_blood_trail").state;
  assert.equal(getTemplePorterView(state).label, "受伤脚夫");
  assert.equal(resolveTemplePorterAction(state, "question_porter").available, false);

  const rescued = resolveTemplePorterAction(state, "rescue_porter");
  assert.equal(rescued.state.elapsed, 3);
  assert.equal(rescued.state.porter.alive, true);
  assert.equal(rescued.state.porter.aidSpent, true);
  const questioned = resolveTemplePorterAction(rescued.state, "question_porter");
  assert.equal(questioned.state.porter.questioned, true);
  assert.match(questioned.outcome, /乌篷船/);
  const searched = resolveTemplePorterAction(questioned.state, "search_porter_cargo");
  assert.equal(searched.state.porter.searched, true);
  assert.match(searched.outcome, /泊位/);
});

test("Long Qingyu judges prior behavior through trust, suspicion and debt instead of a single favor score", () => {
  const prepared = createTempleExplorationState({
    casket: { discovered: true, holder: "player", opened: false },
    porter: { discovered: true, rescued: true, alive: true, questioned: true, aidSpent: true },
    objectStates: {
      collapsed_wall: { seen: true, stage: "cleared", actionIds: ["inspect_breach", "clear_breach"] },
    },
  });
  const arrived = beginTempleArrival(prepared);
  assert.ok(arrived.lady.trust >= 3);
  assert.equal(arrived.lady.debt, 1);
  assert.equal(arrived.lady.suspicion, 0);
  assert.ok(arrived.lady.observations.some((line) => /脚夫/.test(line)));
  assert.equal(getTempleLadyResponses(arrived).length, 3);

  const guarded = resolveTempleLadyResponse(arrived, "guard_casket");
  assert.equal(guarded.available, true);
  assert.equal(guarded.state.lady.suspicion, 1);
  assert.equal(guarded.state.crisis.active, true);
});

test("the pursuer crisis supports authored environment, escape, deception and direct combat outcomes", () => {
  const prepared = createTempleExplorationState({
    casket: { discovered: true, holder: "player" },
    porter: { discovered: true, rescued: true, alive: true },
    objectStates: {
      embers: { seen: true, stage: "banked", actionIds: ["tend_embers", "bank_embers"] },
      incense_rack: { seen: true, stage: "loosened", actionIds: ["inspect_rack", "loosen_rack"] },
      collapsed_wall: { seen: true, stage: "cleared", actionIds: ["inspect_breach", "clear_breach"] },
      woodpile: { seen: true, stage: "hollowed", actionIds: ["sort_woodpile", "hide_in_woodpile"] },
    },
  });
  const arrived = beginTempleArrival(prepared);
  const crisis = resolveTempleLadyResponse(arrived, "ask_intent").state;
  const options = getTempleCrisisOptions(crisis, { attributes: { strength: 2, constitution: 2 } });
  assert.deepEqual(options.filter((option) => !option.disabled).map((option) => option.id), ["drop_rack", "escape_breach", "hide_casket", "hold_door"]);

  const trapped = resolveTempleCrisis(crisis, "drop_rack", { attributes: { strength: 2, constitution: 2 } });
  assert.equal(trapped.state.crisis.pursuers, "driven_off");
  assert.equal(trapped.wound, null);

  const hidden = resolveTempleCrisis(crisis, "hide_casket", { attributes: { strength: 2, constitution: 2 } });
  assert.equal(hidden.state.casket.holder, "woodpile");
  assert.equal(hidden.state.crisis.pursuers, "misdirected");

  const fought = resolveTempleCrisis(crisis, "hold_door", { attributes: { strength: 1, constitution: 1 } });
  assert.equal(fought.wound.severity, 2);
  assert.equal(fought.state.completed, true);
});

test("departure summary preserves people, objects, relationship, injury and resource costs", () => {
  const state = createTempleExplorationState({
    casket: { discovered: true, inspected: true, holder: "player" },
    porter: { discovered: true, rescued: true, alive: true, questioned: true, aidSpent: true },
    lady: { arrived: true, trust: 4, suspicion: 1, debt: 1 },
    crisis: { resolved: true, method: "hold_door", pursuers: "driven_off", playerWound: { bodyPart: "arm", severity: 1 } },
    completed: true,
  });
  const summary = getTempleOutcomeSummary(state);
  assert.match(summary.casket, /查过封口/);
  assert.match(summary.porter, /夜船/);
  assert.match(summary.relation, /担保/);
  assert.equal(summary.wound.severity, 1);
  assert.equal(summary.aidSpent, true);
  assert.doesNotThrow(() => JSON.stringify(state));
});
