import test from "node:test";
import assert from "node:assert/strict";

import {
  BUILD_PATHS,
  CORE_NPCS,
  ENCOUNTERS,
  RARITY,
  ageIntel,
  createIntel,
  createMineBattle,
  createCycleLegacy,
  createRealityAnchor,
  deriveBuildSynergies,
  deriveSettlementTraits,
  deriveTraitSynergies,
  generateOpeningSets,
  listAvailableEncounters,
  migrateSaveData,
  evaluateFinaleOptions,
  evaluateNpcAlliance,
  resolveFinalEnding,
  restoreRealityAnchor,
  resolveCompanionOffer,
  resolveEncounterChoice,
  resolveMineBattleTurn,
  scoreSettlement,
  upsertIntel,
} from "../web/game-core.mjs";

test("ruined-temple encounter offers three distinct long-term boons", () => {
  assert.equal(ENCOUNTERS.length >= 1, true);
  const encounter = listAvailableEncounters({ phase: "before_sect" })[0];
  assert.equal(encounter.id, "ruined_temple_rain");
  assert.equal(encounter.choices.length, 3);

  const outcomes = encounter.choices.map((choice) => resolveEncounterChoice({
    encounterId: encounter.id,
    choiceId: choice.id,
  }));
  assert.equal(new Set(outcomes.map((outcome) => outcome.boon.id)).size, 3);
  assert.equal(new Set(outcomes.map((outcome) => outcome.morningAction.value)).size, 3);
  assert.ok(outcomes.every((outcome) => outcome.longTerm && outcome.morningAction.clue && outcome.morningAction.spentLabel));
});

test("encounter depth reacts to character background and remains once-only", () => {
  const herbalist = resolveEncounterChoice({
    encounterId: "ruined_temple_rain",
    choiceId: "heal",
    originId: "herbalist",
  });
  const traitReader = resolveEncounterChoice({
    encounterId: "ruined_temple_rain",
    choiceId: "bargain",
    openingTraitIds: ["truth_compulsion"],
  });
  assert.equal(herbalist.synergy, "辨出箭毒");
  assert.equal(traitReader.synergy, "听出半句真话");
  assert.deepEqual(listAvailableEncounters({
    phase: "before_sect",
    completedIds: ["ruined_temple_rain"],
  }), []);
  assert.equal(resolveEncounterChoice({
    encounterId: "ruined_temple_rain",
    choiceId: "missing",
  }), null);
});

test("opening draw is deterministic and provides three stable/risky pairs", () => {
  const first = generateOpeningSets("balance-42", 0);
  const again = generateOpeningSets("balance-42", 0);
  assert.deepEqual(first, again);
  assert.equal(first.length, 3);
  assert.deepEqual(first.map((set) => set.group), ["root", "talent", "fate"]);
  for (const set of first) {
    assert.equal(set.choices.length, 2);
    assert.equal(set.choices[0].volatility, "stable");
    assert.equal(set.choices[1].volatility, "risky");
    assert.notEqual(set.choices[0].id, set.choices[1].id);
  }
  const goldCount = first
    .flatMap((set) => set.choices)
    .filter((trait) => trait.rarity === "gold").length;
  assert.ok(goldCount <= 1);
});

test("the one allowed reroll produces a different deterministic set", () => {
  const original = generateOpeningSets("balance-42", 0);
  const rerolled = generateOpeningSets("balance-42", 1);
  assert.notDeepEqual(
    original.map((set) => set.choices.map((trait) => trait.id)),
    rerolled.map((set) => set.choices.map((trait) => trait.id)),
  );
  assert.deepEqual(rerolled, generateOpeningSets("balance-42", 1));
});

test("settlement pool derives candidates from actions and honors blue guarantee", () => {
  const candidates = deriveSettlementTraits({
    seed: "balance-42",
    tags: ["poison", "observe", "survival"],
    rating: "丙",
  });
  assert.equal(candidates.length, 3);
  assert.equal(new Set(candidates.map((trait) => trait.id)).size, 3);
  assert.ok(candidates.some((trait) => RARITY[trait.rarity].rank >= 2));
  assert.ok(candidates.every((trait) => trait.tags.some((tag) => ["poison", "observe", "survival"].includes(tag))));
});

test("settlement rating rewards varied meaningful behavior", () => {
  assert.equal(scoreSettlement(["poison"], 0), "丁");
  assert.equal(scoreSettlement(["poison", "observe", "survival"], 1), "丙");
  assert.equal(
    scoreSettlement(["poison", "observe", "survival", "protect", "deceive"], 2),
    "乙",
  );
});

test("intel moves from rumor to confirmation and becomes stale after deviation", () => {
  let intel = [createIntel({
    id: "mine_bell",
    title: "封井钟",
    detail: "三响后封井",
    status: "rumor",
  })];
  intel = upsertIntel(intel, createIntel({
    id: "mine_bell",
    title: "封井钟",
    detail: "第三响前傀儡会先亮膝印",
    status: "confirmed",
    source: "矿底亲历",
    gainedAtDeviation: 1,
    expiresAtDeviation: 2,
  }));
  assert.equal(intel.length, 1);
  assert.equal(intel[0].status, "confirmed");
  assert.equal(ageIntel(intel, 1)[0].status, "confirmed");
  assert.equal(ageIntel(intel, 2)[0].status, "stale");
});

test("two independent trait combinations unlock rule-level mine actions", () => {
  const herbal = deriveTraitSynergies(["herbal_tongue"], ["scent_thread"]);
  const feign = deriveTraitSynergies(["borrowed_life"], ["breath_hider"]);
  assert.ok(herbal.some((item) => item.id === "herbal_trail" && item.unlock === "vent"));
  assert.ok(feign.some((item) => item.id === "borrowed_stillness" && item.unlock === "feign"));
  assert.deepEqual(deriveTraitSynergies(["herbal_tongue"], ["breath_hider"]), []);
});

test("companions accept evidence and retain explicit refusal conditions", () => {
  const accepted = resolveCompanionOffer({
    companion: "wen",
    clues: ["下毒杂役的家人被囚于白石镇废染坊。"],
  });
  const refused = resolveCompanionOffer({ companion: "wen", clues: [] });
  const pei = resolveCompanionOffer({ companion: "pei", rewardType: "dao" });
  assert.equal(accepted.accepted, true);
  assert.match(accepted.boundary, /救人/);
  assert.equal(refused.accepted, false);
  assert.match(refused.boundary, /确证/);
  assert.equal(pei.accepted, true);
});

test("mine battle is deterministic and confirmed intel changes its rules", () => {
  const first = createMineBattle({
    seed: "balance-42",
    entry: "main",
    envy: 2,
    intelStatus: "confirmed",
  });
  assert.deepEqual(first, createMineBattle({
    seed: "balance-42",
    entry: "main",
    envy: 2,
    intelStatus: "confirmed",
  }));
  const countered = resolveMineBattleTurn(first, "counter");
  assert.equal(countered.enemyWard, 0);
  assert.equal(countered.resolve, first.resolve);

  const stale = createMineBattle({
    seed: "balance-42",
    entry: "main",
    intelStatus: "stale",
  });
  const failed = resolveMineBattleTurn(stale, "counter");
  assert.equal(failed.intelFailed, true);
  assert.ok(failed.resolve < stale.resolve);
});

test("short battle supports companion and synergy routes without stat grinding", () => {
  let battle = createMineBattle({
    seed: "battle-route",
    entry: "vent",
    intelStatus: "rumor",
  });
  battle = resolveMineBattleTurn(battle, "synergy", {
    synergyIds: ["herbal_trail"],
    companion: "wen",
  });
  assert.equal(battle.enemyWard, 0);
  battle = resolveMineBattleTurn(battle, "companion", {
    synergyIds: ["herbal_trail"],
    companion: "wen",
  });
  assert.equal(battle.companionUsed, true);
  battle = resolveMineBattleTurn(battle, "strike");
  battle = resolveMineBattleTurn(battle, "strike");
  assert.equal(battle.outcome, "won");
});

test("observation persists into the next turn and counters unverified intel", () => {
  let battle = createMineBattle({ seed: "observe-route", intelStatus: "rumor" });
  battle = resolveMineBattleTurn(battle, "observe");
  assert.equal(battle.insight, 1);
  const countered = resolveMineBattleTurn(battle, "counter");
  assert.equal(countered.enemyWard, 0);
  assert.equal(countered.insight, 0);
});

test("envy prepares the enemy and materially increases burst damage", () => {
  const base = createMineBattle({ seed: "envy-route", envy: 0 });
  const prepared = createMineBattle({ seed: "envy-route", envy: 2 });
  base.intents = ["burst"];
  prepared.intents = ["burst"];
  const baseHit = resolveMineBattleTurn(base, "strike");
  const preparedHit = resolveMineBattleTurn(prepared, "strike");
  assert.equal(baseHit.resolve - preparedHit.resolve, 1);
  assert.equal(prepared.enemyPrepared, true);
});

test("v1 P0 ending save migrates to the complete P1 mine approach", () => {
  const defaults = {
    version: 2,
    seed: "legacy",
    screen: "landing",
    character: { name: "", origin: null },
    timeline: { feast: "unknown", mine: "hidden" },
    intel: [],
    activeSynergies: [],
    p1Path: [],
  };
  const migrated = migrateSaveData({
    version: 1,
    seed: "legacy",
    screen: "ending",
    character: { name: "沈砚", origin: "herbalist" },
    timeline: { feast: "shifted", mine: "revealed" },
    mineChoice: "touch",
  }, defaults);
  assert.equal(migrated.version, 3);
  assert.equal(migrated.screen, "mineApproach");
  assert.equal(migrated.character.name, "沈砚");
  assert.equal(migrated.timeline.feast, "shifted");
  assert.equal(migrated.mineChoice, null);
  assert.match(migrated.p1Path[0], /乌铜矿前重新续上因果/);
  assert.equal(migrateSaveData({ version: 99, seed: "bad", screen: "ending" }, defaults), null);
});

test("complete demo exposes four rule-changing build paths", () => {
  assert.equal(BUILD_PATHS.length, 4);
  assert.equal(new Set(BUILD_PATHS.map((build) => build.id)).size, 4);
  assert.ok(BUILD_PATHS.every((build) => build.effect && build.cost && build.unlock));
});

test("all four core NPCs cross their boundaries only with relevant evidence or choices", () => {
  assert.equal(CORE_NPCS.length, 4);
  const wen = evaluateNpcAlliance({ npcId: "wen", p1Choice: "rescue" });
  const pei = evaluateNpcAlliance({ npcId: "pei", confirmedIntelIds: ["founding_deed", "array_heart"] });
  const song = evaluateNpcAlliance({ npcId: "song", archiveChoice: "audit" });
  const ayen = evaluateNpcAlliance({ npcId: "ayen", archiveChoice: "free_ayen" });
  assert.ok([wen, pei, song, ayen].every((result) => result.allied));
  assert.equal(evaluateNpcAlliance({ npcId: "song", archiveChoice: "accuse" }).state, "hostile");
  assert.equal(evaluateNpcAlliance({ npcId: "ayen" }).allied, false);
});

test("builds form at least three distinct rule-level synergies", () => {
  const ink = deriveBuildSynergies({
    buildId: "seal_breaker",
    openingTraitIds: ["perfect_memory"],
    confirmedIntelIds: ["mine_old_seal"],
  });
  const poison = deriveBuildSynergies({
    buildId: "fate_breath",
    openingTraitIds: ["herbal_tongue"],
    acquiredTraitIds: ["scent_thread"],
  });
  const people = deriveBuildSynergies({
    buildId: "living_ledger",
    alliedNpcIds: ["wen", "song"],
  });
  assert.equal(ink[0].id, "ink_breaks_array");
  assert.equal(poison[0].id, "poison_reads_life");
  assert.equal(people[0].id, "people_form_array");
});

test("finale options open from evidence, allies, build, envy and prior choices", () => {
  const context = {
    confirmedIntelIds: ["sacrifice_ledger", "array_heart", "founder_phrase"],
    alliedNpcIds: ["wen", "song", "ayen"],
    buildId: "seal_breaker",
    envy: 2,
    deviation: 3,
    archiveChoice: "free_ayen",
    year5Choice: "ayen",
  };
  const options = evaluateFinaleOptions(context);
  assert.deepEqual(options.map((option) => option.enabled), [true, true, true]);
  assert.equal(resolveFinalEnding("exile", context).name, "携火离山");
  assert.equal(resolveFinalEnding("sever", context).name, "斩祖散门");
  assert.equal(resolveFinalEnding("seize", context).name, "夺盘续世");
  assert.equal(resolveFinalEnding("sever", { ...context, alliedNpcIds: ["wen"] }), null);
  assert.equal(evaluateFinaleOptions({ ...context, year5Choice: "pei" }).find((option) => option.id === "seize").enabled, false);
});

test("reality anchor restores the last safe state after a real death", () => {
  const state = { version: 3, screen: "year1Archive", envy: 2, clues: ["旧印"], realityAnchor: null };
  const anchor = createRealityAnchor(state, "year1Approach");
  state.envy = 9;
  state.clues.push("不应保留");
  const restored = restoreRealityAnchor(anchor);
  assert.equal(restored.screen, "year1Approach");
  assert.equal(restored.envy, 2);
  assert.deepEqual(restored.clues, ["旧印"]);
  assert.equal(restoreRealityAnchor(null), null);
});

test("v2 P1 ending migrates into the compressed seven-year finale", () => {
  const defaults = {
    version: 3,
    seed: "p1-save",
    screen: "landing",
    character: { name: "", origin: null },
    timeline: { feast: "unknown", mine: "hidden" },
    npcStates: {},
    p2Path: [],
  };
  const migrated = migrateSaveData({
    version: 2,
    seed: "p1-save",
    screen: "ending",
    character: { name: "沈砚", origin: "herbalist" },
    timeline: { feast: "shifted", mine: "shifted" },
    p1Payoff: "矿难已偏转",
  }, defaults);
  assert.equal(migrated.version, 3);
  assert.equal(migrated.screen, "p2Interlude");
  assert.match(migrated.p2Path[0], /重新展开七年因果/);
});

test("each ending creates a distinct playable second-cycle legacy", () => {
  const exile = createCycleLegacy("exile");
  const sever = createCycleLegacy("sever");
  const seize = createCycleLegacy("seize");
  assert.equal(new Set([exile.id, sever.id, seize.id]).size, 3);
  assert.equal(exile.npcReaction, "wen");
  assert.equal(sever.openingIntel, "old_seal_memory");
  assert.equal(seize.envy, 1);
});
