import test from "node:test";
import assert from "node:assert/strict";

import {
  RARITY,
  deriveSettlementTraits,
  generateOpeningSets,
  scoreSettlement,
} from "../web/game-core.mjs";

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
