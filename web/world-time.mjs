export const KE_PER_SHICHEN = 8;
export const SHICHEN_PER_DAY = 12;
export const KE_PER_DAY = KE_PER_SHICHEN * SHICHEN_PER_DAY;
export const DAYS_PER_MONTH = 30;
export const MONTHS_PER_YEAR = 12;

export const SHICHEN = Object.freeze([
  Object.freeze({ id: "zi", name: "子时" }),
  Object.freeze({ id: "chou", name: "丑时" }),
  Object.freeze({ id: "yin", name: "寅时" }),
  Object.freeze({ id: "mao", name: "卯时" }),
  Object.freeze({ id: "chen", name: "辰时" }),
  Object.freeze({ id: "si", name: "巳时" }),
  Object.freeze({ id: "wu", name: "午时" }),
  Object.freeze({ id: "wei", name: "未时" }),
  Object.freeze({ id: "shen", name: "申时" }),
  Object.freeze({ id: "you", name: "酉时" }),
  Object.freeze({ id: "xu", name: "戌时" }),
  Object.freeze({ id: "hai", name: "亥时" }),
]);

const SHICHEN_INDEX = new Map(SHICHEN.map((entry, index) => [entry.id, index]));
const LEGACY_SEGMENTS = Object.freeze({
  dawn: "mao",
  morning: "chen",
  afternoon: "shen",
  evening: "you",
  night: "hai",
});

export const DEFAULT_WORLD_TIME = Object.freeze({
  totalKe: calendarToTotalKe({ year: 427, month: 8, day: 12, shichen: "hai", ke: 0 }),
  weather: "rain",
});

function positiveInteger(value, fallback) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

export function calendarToTotalKe(value = {}) {
  const year = positiveInteger(value.year, 427);
  const month = Math.min(MONTHS_PER_YEAR, positiveInteger(value.month, 8));
  const day = Math.min(DAYS_PER_MONTH, positiveInteger(value.day, 12));
  const shichenIndex = SHICHEN_INDEX.get(value.shichen) ?? SHICHEN_INDEX.get("hai");
  const ke = Math.min(KE_PER_SHICHEN - 1, Math.max(0, Math.floor(Number(value.ke || 0))));
  const dayOrdinal = ((year - 1) * MONTHS_PER_YEAR + (month - 1)) * DAYS_PER_MONTH + (day - 1);
  return dayOrdinal * KE_PER_DAY + shichenIndex * KE_PER_SHICHEN + ke;
}

export function totalKeToCalendar(totalKe) {
  const safeTotal = Math.max(0, Math.floor(Number(totalKe || 0)));
  const dayOrdinal = Math.floor(safeTotal / KE_PER_DAY);
  const keOfDay = safeTotal % KE_PER_DAY;
  const year = Math.floor(dayOrdinal / (MONTHS_PER_YEAR * DAYS_PER_MONTH)) + 1;
  const dayOfYear = dayOrdinal % (MONTHS_PER_YEAR * DAYS_PER_MONTH);
  const month = Math.floor(dayOfYear / DAYS_PER_MONTH) + 1;
  const day = dayOfYear % DAYS_PER_MONTH + 1;
  const shichenIndex = Math.floor(keOfDay / KE_PER_SHICHEN);
  return {
    year,
    month,
    day,
    shichen: SHICHEN[shichenIndex].id,
    shichenName: SHICHEN[shichenIndex].name,
    ke: keOfDay % KE_PER_SHICHEN,
  };
}

export function createWorldTime(saved = null) {
  const totalKe = Number.isFinite(Number(saved?.totalKe))
    ? Math.max(0, Math.floor(Number(saved.totalKe)))
    : DEFAULT_WORLD_TIME.totalKe;
  return {
    totalKe,
    weather: typeof saved?.weather === "string" && saved.weather ? saved.weather.slice(0, 32) : DEFAULT_WORLD_TIME.weather,
  };
}

export function worldTimeFromLegacyClock(clock = {}, weather = null) {
  const shichen = LEGACY_SEGMENTS[clock.segment] || "hai";
  return createWorldTime({
    totalKe: calendarToTotalKe({
      year: clock.year,
      month: clock.month,
      day: clock.day,
      shichen,
      ke: 0,
    }),
    weather: weather || clock.weather || DEFAULT_WORLD_TIME.weather,
  });
}

export function migrateWorldTime(saved = {}) {
  if (Number.isFinite(Number(saved.worldTime?.totalKe))) return createWorldTime(saved.worldTime);
  const legacyP0 = saved.p0?.clock;
  if (saved.p0?.started && legacyP0) return worldTimeFromLegacyClock(legacyP0);
  const elapsed = Math.max(0, Math.floor(Number(saved.templeExploration?.elapsed || 0)));
  return advanceWorldTime(DEFAULT_WORLD_TIME, elapsed, { weather: "rain" });
}

export function advanceWorldTime(worldTime, cost, changes = {}) {
  const current = createWorldTime(worldTime);
  const amount = Math.max(0, Math.floor(Number(cost || 0)));
  return createWorldTime({
    totalKe: current.totalKe + amount,
    weather: changes.weather || current.weather,
  });
}

export function elapsedKeSince(worldTime, enteredAtKe, cap = Number.POSITIVE_INFINITY) {
  const current = createWorldTime(worldTime);
  const entered = Number.isFinite(Number(enteredAtKe))
    ? Math.max(0, Math.floor(Number(enteredAtKe)))
    : current.totalKe;
  return Math.min(cap, Math.max(0, current.totalKe - entered));
}

export function formatWorldTime(worldTime, options = {}) {
  const current = createWorldTime(worldTime);
  const calendar = totalKeToCalendar(current.totalKe);
  const keNames = ["", "一", "二", "三", "四", "五", "六", "七"];
  const time = calendar.ke > 0 ? `${calendar.shichenName}${keNames[calendar.ke]}刻` : calendar.shichenName;
  return {
    ...calendar,
    time,
    date: `大曜${calendar.year}年${calendar.month}月${calendar.day}日`,
    full: `大曜${calendar.year}年${calendar.month}月${calendar.day}日 · ${time}`,
    weather: current.weather,
    totalKe: current.totalKe,
    compact: options.includeDate ? `大曜${calendar.year}年${calendar.month}月${calendar.day}日 · ${time}` : time,
  };
}
