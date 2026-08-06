import assert from "node:assert/strict";
import test from "node:test";

import {
  ORIGINS,
  ORIGIN_LADY_INSIGHTS,
  ORIGIN_PERSONAL_EVENTS,
  ORIGIN_PROLOGUES,
  ORIGIN_TEMPLE_CHOICES,
  createOriginProgress,
  getOrigin,
  migrateOriginState,
  normalizeOriginId,
  resolveOriginPersonalEvent,
  resolveOriginPrologueChoice,
  resolveOriginTempleTask,
} from "../web/origin-core.mjs";

test("three origins each establish a distinct place, task, tag and card image", () => {
  assert.deepEqual(ORIGINS.map((origin) => origin.id), ["shen_branch", "streetborn", "mystery"]);
  assert.deepEqual(ORIGINS.map((origin) => origin.name), ["世家旁支", "市井子弟", "身世成谜"]);
  assert.deepEqual(ORIGINS.map((origin) => origin.cardImage), [
    "./assets/creation-v1/origin-shen-branch-v1.webp",
    "./assets/creation-v1/origin-streetborn-v1.webp",
    "./assets/creation-v1/origin-mystery-v1.webp",
  ]);
  assert.equal(new Set(ORIGINS.map((origin) => origin.opening)).size, 3);
  assert.equal(new Set(ORIGINS.map((origin) => origin.taskId)).size, 3);
  assert.ok(ORIGINS.every((origin) => origin.tag && origin.cardImage.endsWith(".webp")));
  assert.match(ORIGINS[0].summary, /小时候读过书/);
  assert.match(ORIGINS[1].summary, /给鱼贩看过摊/);
  assert.match(ORIGINS[2].summary, /只记得零碎几段/);
  assert.doesNotMatch(getOrigin("shen_branch").summary, /沈家/);
  assert.doesNotMatch(getOrigin("shen_branch").opening, /沈家/);
});

test("family branch prologue advances through four independent nodes with real state", () => {
  let progress = createOriginProgress("shen_branch");
  let silver = 2;
  let result = resolveOriginPrologueChoice("shen_branch", "shenOriginArrival", "study_token", { progress, silver });
  assert.equal(result.available, true);
  assert.equal(result.nextScreen, "shenOriginBriefing");
  assert.deepEqual(result.knowledgeIds, ["waist_token_recut"]);
  progress = result.progress;

  result = resolveOriginPrologueChoice("shen_branch", "shenOriginBriefing", "request_writ", { progress, silver });
  assert.equal(result.nextScreen, "shenOriginPreparation");
  assert.deepEqual(result.accessIds, ["shen_side_door_writ"]);
  assert.equal(result.progress.taskState, "assigned");
  progress = result.progress;

  result = resolveOriginPrologueChoice("shen_branch", "shenOriginPreparation", "buy_oilcloth", { progress, silver });
  assert.equal(result.silverDelta, -0.2);
  silver += result.silverDelta;
  assert.ok(result.progress.preparationIds.includes("oilcloth"));
  progress = result.progress;

  result = resolveOriginPrologueChoice("shen_branch", "shenOriginRoad", "follow_cart_tracks", { progress, silver });
  assert.equal(result.nextScreen, "templeWake");
  assert.equal(result.exposureDelta, 1);
  assert.ok(result.progress.discoveredFactIds.includes("medicine_cart_tracks"));
});

test("street prologue can trade money, knowledge or access without becoming a combat class", () => {
  let progress = createOriginProgress("streetborn");
  let result = resolveOriginPrologueChoice("streetborn", "streetOriginMarket", "help_fisher", { progress, silver: 0.2 });
  assert.deepEqual(result.contact, ["old_fisher", 1]);
  progress = result.progress;

  result = resolveOriginPrologueChoice("streetborn", "streetOriginOffer", "inspect_cargo_tag", { progress, silver: 0.2 });
  assert.equal(result.progress.taskState, "assigned");
  assert.ok(result.knowledgeIds.includes("cargo_tag_wrong_berth"));
  progress = result.progress;

  result = resolveOriginPrologueChoice("streetborn", "streetOriginBargain", "take_advance", { progress, silver: 0.2 });
  assert.equal(result.silverDelta, 0.4);
  assert.equal(result.exposureDelta, 1);
  progress = result.progress;

  result = resolveOriginPrologueChoice("streetborn", "streetOriginRoute", "take_fisher_route", { progress, silver: 0.6 });
  assert.equal(result.nextScreen, "templeWake");
  assert.deepEqual(result.contact, ["old_fisher", 1]);
});

test("origin tasks support success, costly success and fail-forward while converging", () => {
  for (const originId of ["shen_branch", "streetborn"]) {
    const choices = ORIGIN_TEMPLE_CHOICES[originId];
    assert.equal(choices.length, 3);
    const outcomes = choices.map((choice) => resolveOriginTempleTask(originId, choice.id, createOriginProgress(originId)));
    assert.deepEqual(outcomes.map((outcome) => outcome.progress.taskState), ["success", "costly_success", "failed_forward"]);
    assert.ok(outcomes.every((outcome) => outcome.progress.completed));
    assert.ok(outcomes.every((outcome) => outcome.progress.convergenceState === "temple_joined"));
    assert.ok(outcomes.every((outcome) => outcome.itemId));
  }
  const completed = resolveOriginTempleTask("shen_branch", "take_box_intact", createOriginProgress("shen_branch")).progress;
  assert.equal(resolveOriginTempleTask("shen_branch", "open_box", completed).available, false);
});

test("each origin has a lady insight and a first-chapter personal event", () => {
  assert.deepEqual(Object.keys(ORIGIN_LADY_INSIGHTS), ["shen_branch", "streetborn", "mystery"]);
  for (const origin of ORIGINS) {
    const event = ORIGIN_PERSONAL_EVENTS[origin.id];
    assert.equal(event.choices.length, 3);
    const resolved = resolveOriginPersonalEvent(origin.id, event.choices[0].id, {
      ...createOriginProgress(origin.id, { completed: true }),
      personalEventComplete: false,
    });
    assert.equal(resolved.available, true);
    assert.equal(resolved.progress.personalEventComplete, true);
    assert.ok(resolved.echo);
  }
});

test("legacy background ids migrate to stable origins without replaying completed openings", () => {
  assert.equal(normalizeOriginId("clan"), "shen_branch");
  assert.equal(normalizeOriginId("common"), "streetborn");
  assert.equal(normalizeOriginId("street"), "streetborn");
  assert.equal(normalizeOriginId("mystery"), "mystery");

  const oldLateSave = migrateOriginState({ version: 7, backgroundId: "clan", screen: "shenMeeting" });
  assert.equal(oldLateSave.originId, "shen_branch");
  assert.equal(oldLateSave.originPrologue.completed, true);
  assert.equal(oldLateSave.originPrologue.convergenceState, "temple_joined");

  const oldTempleSave = migrateOriginState({ version: 7, backgroundId: "mystery", screen: "templeWake" });
  assert.equal(oldTempleSave.originId, "mystery");
  assert.equal(oldTempleSave.originPrologue.completed, false);
  assert.equal(oldTempleSave.openingAttributePool, 3);
});

test("the prologue catalogs expose enough authored choices for replayable openings", () => {
  assert.equal(Object.keys(ORIGIN_PROLOGUES.shen_branch).length, 4);
  assert.equal(Object.keys(ORIGIN_PROLOGUES.streetborn).length, 4);
  assert.ok(Object.values(ORIGIN_PROLOGUES.shen_branch).every((node) => node.choices.length === 3));
  assert.ok(Object.values(ORIGIN_PROLOGUES.streetborn).every((node) => node.choices.length === 3));
});
