import test from "node:test";
import assert from "node:assert/strict";

import {
  createKnowledgeBoard,
  createKnowledgeState,
  createPorterEncounterState,
  markKnowledgeRead,
  migrateKnowledgeState,
  recordKnowledgeFragment,
  refuteKnowledgeFragment,
  resolvePorterEncounter,
  syncKnowledgeFromGameState,
} from "../web/knowledge-core.mjs";

function game(patch = {}) {
  return {
    originId: "shen_branch",
    backgroundId: "shen_branch",
    originPrologue: { completed: true, discoveredFactIds: ["box_changed_hands"] },
    originKnowledge: ["box_changed_hands"],
    inventory: ["sealed_medicine_box"],
    templeOpening: { actions: ["eat_peach"], peachEaten: true, belongingsChecked: true },
    ladyChoiceLog: ["deny_beggar", "yield", "refuse", "sincere"],
    relationship: "莫逆之交",
    mindArt: "carp_dragon_gate",
    roadTrial: "dive",
    porterEncounter: createPorterEncounterState(),
    knowledge: createKnowledgeState(),
    ...patch,
  };
}

test("见闻按稳定条目与片段ID去重，并合并不同来源", () => {
  const first = recordKnowledgeFragment(createKnowledgeState(), "purple_river_night_boat", "night_boat_missing", { npcId: "fisher_a" });
  const repeated = recordKnowledgeFragment(first.state, "purple_river_night_boat", "night_boat_missing", { npcId: "fisher_a" });
  const secondSource = recordKnowledgeFragment(repeated.state, "purple_river_night_boat", "night_boat_missing", { npcId: "porter_b" });
  assert.equal(first.changed, true);
  assert.equal(repeated.changed, false);
  assert.equal(secondSource.state.items.purple_river_night_boat.fragmentIds.length, 1);
  assert.equal(secondSource.state.items.purple_river_night_boat.sources.night_boat_missing.length, 2);
});

test("旧闻追加会标记未读，打开详情后可以消除回声标记", () => {
  let state = recordKnowledgeFragment(createKnowledgeState(), "medicine_casket", "casket_temple_seen").state;
  assert.equal(state.items.medicine_casket.unreadUpdate, false);
  state = recordKnowledgeFragment(state, "medicine_casket", "casket_resealed").state;
  assert.equal(state.items.medicine_casket.unreadUpdate, true);
  state = markKnowledgeRead(state, "medicine_casket");
  assert.equal(state.items.medicine_casket.unreadUpdate, false);
});

test("错误耳闻保留来源并可被后续事实标为此说已误", () => {
  let state = recordKnowledgeFragment(createKnowledgeState(), "purple_river_night_boat", "night_boat_missing").state;
  const corrected = refuteKnowledgeFragment(state, "purple_river_night_boat", "night_boat_missing", "night_boat_seen");
  assert.equal(corrected.changed, true);
  assert.deepEqual(corrected.state.items.purple_river_night_boat.refutedFragmentIds, ["night_boat_missing"]);
  assert.ok(corrected.state.items.purple_river_night_boat.fragmentIds.includes("night_boat_seen"));
});

test("三种出身在曹青丹房看见同一药匣时形成不同认知", () => {
  const boards = [
    game({ originId: "shen_branch", backgroundId: "shen_branch", caoIdentitySeen: true }),
    game({ originId: "streetborn", backgroundId: "streetborn", caoIdentitySeen: true, originPrologue: { completed: true, discoveredFactIds: ["red_cord_knot"] }, originKnowledge: ["red_cord_knot"] }),
    game({ originId: "mystery", backgroundId: "mystery", caoIdentitySeen: true, originPrologue: { completed: true, discoveredFactIds: [] }, originKnowledge: [] }),
  ].map((state) => createKnowledgeBoard(state, { selectedId: "medicine_casket" }).selected);
  assert.ok(boards[0].fragments.some((entry) => entry.label === "世家"));
  assert.ok(boards[1].fragments.some((entry) => entry.label === "市井"));
  assert.ok(boards[2].fragments.some((entry) => entry.label === "残忆"));
});

test("脚夫遇袭的救人、问话、搜货与失手结果进入不同片段", () => {
  const rescued = resolvePorterEncounter("rescue_question", createPorterEncounterState());
  const searched = resolvePorterEncounter("rescue_search", createPorterEncounterState());
  const failed = resolvePorterEncounter("follow_attackers", createPorterEncounterState());
  assert.equal(rescued.state.alive, true);
  assert.equal(rescued.state.questioned, true);
  assert.equal(searched.state.searched, true);
  assert.equal(failed.state.alive, false);
  const synced = syncKnowledgeFromGameState(createKnowledgeState(), game({ porterEncounter: failed.state }));
  assert.ok(synced.state.items.east_road_porter_attack.fragmentIds.includes("porter_lost"));
});

test("列表只显示已知条目，只有全部、人、事三类且不暴露完成度", () => {
  const board = createKnowledgeBoard(game(), { category: "person" });
  assert.deepEqual(board.categories.map((entry) => entry.id), ["all", "person", "event"]);
  assert.ok(board.items.every((entry) => entry.type === "person"));
  assert.equal("completion" in board, false);
  assert.equal("total" in board, false);
});

test("见闻迁移丢弃未知目录项并保持JSON可序列化", () => {
  const migrated = migrateKnowledgeState({ items: { unknown: { fragmentIds: ["x"] } } });
  assert.deepEqual(migrated, createKnowledgeState());
  assert.doesNotThrow(() => JSON.stringify(syncKnowledgeFromGameState(migrated, game()).state));
});
