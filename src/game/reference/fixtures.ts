/**
 * Parity fixtures: the reference expectations actually supplied so far.
 *
 * These are copied verbatim from the 0.9941 extraction report. They are the
 * authority in parity comparisons — never edited to make a test pass.
 */
import type { CombinationRow, EnemyRow, ParityFixture, ProgressionRow } from "./types";
import { REFERENCE_GAME_VERSION } from "./types";

const base = { gameVersion: REFERENCE_GAME_VERSION, evidence: "stored" as const, source: "re-magic/0.9941 extraction report" };

export const PROGRESSION_FIXTURES: ParityFixture[] = [
  { refId: "progression.mana.level1", ...base, system: "progression", input: { targetLevel: 1 }, expected: { manaRequired: 100 } },
  { refId: "progression.mana.level2", ...base, system: "progression", input: { targetLevel: 2 }, expected: { manaRequired: 136 } },
  { refId: "progression.mana.level3", ...base, system: "progression", input: { targetLevel: 3 }, expected: { manaRequired: 173 } },
];

export const ENEMY_FIXTURES: ParityFixture[] = [
  {
    refId: "enemy.small_swarm.base_hp",
    ...base,
    system: "enemy",
    input: { name: "Small Swarm" },
    expected: { baseHp: 100 },
    note: "stored value; runtime scaling by stage, wave, elapsed time and difficulty is unresolved",
  },
  {
    refId: "enemy.revenant.base_hp",
    ...base,
    system: "enemy",
    input: { name: "Revenant" },
    expected: { baseHp: 10000 },
    note: "stored 10,000 may be modified by stage, wave, elapsed time, difficulty or other multipliers",
  },
];

export const COMBINATION_FIXTURES: ParityFixture[] = [
  {
    refId: "combination.empyrean_wrath.modifiers",
    ...base,
    system: "combination",
    input: { name: "Empyrean Wrath" },
    expected: { damageMultiplier: 5, countMultiplier: 3 },
    note: "stored modifiers; native effect-to-stat application binding is not yet verified",
  },
];

export const ALL_FIXTURES: ParityFixture[] = [...PROGRESSION_FIXTURES, ...ENEMY_FIXTURES, ...COMBINATION_FIXTURES];

/** Raw dataset examples used by the handoff contract (same data as above). */
export const PROGRESSION_ROWS: ProgressionRow[] = [1, 2, 3].map((level) => ({
  refId: `progression.mana.level${level}`,
  name: `Mana requirement for level ${level}`,
  nameFa: `تجربهٔ سطح ${faNumber(level)}`,
  gameVersion: REFERENCE_GAME_VERSION,
  evidence: "stored",
  source: "re-magic/0.9941 extraction report",
  verification: "unverified",
  level,
  manaRequired: [100, 136, 173][level - 1],
}));

export const ENEMY_ROWS: EnemyRow[] = [
  {
    refId: "enemy.small_swarm",
    name: "Small Swarm",
    nameFa: "دستهٔ کوچک",
    gameVersion: REFERENCE_GAME_VERSION,
    evidence: "stored",
    source: "re-magic/0.9941 extraction report",
    verification: "unverified",
    baseHp: 100,
    runtimeModifiers: ["stage", "wave", "elapsedTime", "difficulty"],
    unresolved: ["exact runtime multiplier chain not verified"],
  },
  {
    refId: "enemy.revenant",
    name: "Revenant",
    nameFa: "دیوی بازگشته",
    gameVersion: REFERENCE_GAME_VERSION,
    evidence: "stored",
    source: "re-magic/0.9941 extraction report",
    verification: "unverified",
    baseHp: 10000,
    runtimeModifiers: ["stage", "wave", "elapsedTime", "difficulty", "other"],
    unresolved: ["stored 10000 may be modified at runtime; exact multipliers unknown"],
  },
];

export const COMBINATION_ROWS: CombinationRow[] = [
  {
    refId: "combination.empyrean_wrath",
    name: "Empyrean Wrath",
    nameFa: "خشمِ آسمانی",
    gameVersion: REFERENCE_GAME_VERSION,
    evidence: "stored",
    source: "re-magic/0.9941 extraction report",
    verification: "unverified",
    primaryMagicId: "unknown",
    storedModifiers: [
      { key: "damageMultiplier", value: 5, unit: "×" },
      { key: "countMultiplier", value: 3, unit: "×" },
    ],
    modifiersApplied: "not_verified",
    unresolved: ["primary and consumed magic ids not supplied", "native application of modifiers not verified"],
  },
];

/** Persian digits for a small integer (fixture labels only). */
function faNumber(n: number) {
  return String(n).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}
