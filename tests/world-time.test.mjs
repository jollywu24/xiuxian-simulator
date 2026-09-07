import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_WORLD_TIME,
  KE_PER_DAY,
  advanceWorldTime,
  calendarToTotalKe,
  createWorldTime,
  elapsedKeSince,
  formatWorldTime,
  migrateWorldTime,
  totalKeToCalendar,
  worldTimeFromLegacyClock,
} from "../web/world-time.mjs";

test("十二时辰各有八刻，亥时七刻之后进入次日子时", () => {
  const start = createWorldTime(DEFAULT_WORLD_TIME);
  assert.equal(formatWorldTime(start).time, "亥时");
  assert.equal(formatWorldTime(advanceWorldTime(start, 7)).time, "亥时七刻");
  const next = formatWorldTime(advanceWorldTime(start, 8));
  assert.equal(next.time, "子时");
  assert.equal(next.day, 13);
});

test("绝对刻数可以稳定往返日期、时辰与刻数", () => {
  const totalKe = calendarToTotalKe({ year: 427, month: 8, day: 29, shichen: "shen", ke: 5 });
  assert.deepEqual(totalKeToCalendar(totalKe), {
    year: 427,
    month: 8,
    day: 29,
    shichen: "shen",
    shichenName: "申时",
    ke: 5,
  });
  assert.equal(totalKeToCalendar(totalKe + KE_PER_DAY * 2).month, 9);
  assert.equal(totalKeToCalendar(totalKe + KE_PER_DAY * 2).day, 1);
});

test("旧粗时段与破庙经过刻数只在迁移时写入统一世界时间", () => {
  const oldTemple = migrateWorldTime({ templeExploration: { elapsed: 4 } });
  assert.equal(formatWorldTime(oldTemple).time, "亥时四刻");

  const oldP0 = migrateWorldTime({
    p0: { started: true, clock: { year: 427, month: 8, day: 15, segment: "dawn", weather: "clear" } },
  });
  assert.equal(formatWorldTime(oldP0).full, "大曜427年8月15日 · 卯时");
  assert.equal(oldP0.weather, "clear");

  const explicit = migrateWorldTime({
    worldTime: advanceWorldTime(DEFAULT_WORLD_TIME, 6),
    templeExploration: { elapsed: 1 },
  });
  assert.equal(formatWorldTime(explicit).time, "亥时六刻");
});

test("场景经过时间由进入时刻与世界时间相减得出", () => {
  const enteredAtKe = DEFAULT_WORLD_TIME.totalKe;
  const later = advanceWorldTime(DEFAULT_WORLD_TIME, 11);
  assert.equal(elapsedKeSince(later, enteredAtKe), 11);
  assert.equal(elapsedKeSince(later, enteredAtKe, 8), 8);
  assert.equal(elapsedKeSince(createWorldTime({ totalKe: 3 }), 0), 3);
});

test("旧P0粗时段转换不会生成另一套分钟时间", () => {
  const worldTime = worldTimeFromLegacyClock({ year: 427, month: 8, day: 14, segment: "evening", weather: "clear" });
  assert.equal(formatWorldTime(worldTime).time, "酉时");
  assert.deepEqual(Object.keys(worldTime).sort(), ["totalKe", "weather"]);
});
