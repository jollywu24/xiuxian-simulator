import test from "node:test";
import assert from "node:assert/strict";

import {
  TEMPLE_AREAS,
  TEMPLE_OBJECTS,
  TEMPLE_SITUATION_LIMIT,
  createTempleExplorationState,
  enterTempleArea,
  getTempleAreaView,
  getTempleObjectView,
  getTempleSituationClock,
  migrateTempleExplorationState,
  revealTempleObject,
  resolveTempleObjectAction,
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

test("looking and moving are free, while acting advances the situation", () => {
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
});
