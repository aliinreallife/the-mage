/**
 * Magic Survival 0.9941: statically reconstructed, bounded MANA KERNELS.
 *
 * Source: 2026-11-14 portable handoff (V_Ability_Manager.ManaGain @0x10fc64c,
 * AbilityStatApply(mode2) and Button_AbilityExit). All operations are
 * explicit; these helpers DO NOT schedule UI, accept choice effects, alter
 * Game state or claim observed native runtime parity.
 *
 * Input domain: finite ordinary numbers and resolved integer levels. No
 * support for NaN/Inf, source-internal item bases, asynchronous UI scheduling,
 * HP restoration, packed save fields or generic overflow behavior.
 */

export type LevelingKernelOperation = "gain" | "refresh_cost" | "maxima" | "exit_stock_kernel" | "source_gain";
export type RequirementLookup = (index: number) => number | null;

export interface ManaGainInput {
  level: number;
  level_add: number;
  stock: number;
  cost: number;
  gain: number;
  max_level: number;
  max_level_add: number;
  live: boolean;
  artifact_active: boolean;
}
export interface ManaGainResult {
  stock: number;
  cost: number;
  events: number;
  key: number | null;
  level: number;
  level_add: number;
}
export interface CostRefreshInput {
  level: number;
  level_add: number;
  max_level: number;
  limit_ratio: number;
}
export interface CostRefreshResult { key: number; cost: number; obtain_limit: number }
export interface MaximumInput {
  base_max: number;
  base_add_max: number;
  primary_bonus: number;
  additional_bonus: number;
}
export interface MaximumResult { max_level: number; max_level_add: number }
export interface ExitStockInput { stock: number; cost: number; repay_num: number; return_ratio: number }
export interface ExitStockResult { stock: number; queued_delta: number }
export interface SourceGainInput {
  kind: "item" | "enemy";
  base: number;
  up: number;
  ghost: number;
  peace: number;
  down: number;
  ball: number;
  enemy: number;
  time: number;
  limit: number;
}
export interface SourceGainResult { gain: number }

/** ARM64 nearest integer with ties to even, unlike Math.round. */
export function roundNearestEven(input: number): number {
  if (!Number.isFinite(input)) throw new RangeError("nearest-even rounding requires finite input");
  const floor = Math.floor(input);
  const remainder = input - floor;
  if (remainder < 0.5) return floor;
  if (remainder > 0.5) return floor + 1;
  return floor % 2 === 0 ? floor : floor + 1;
}

const f32 = Math.fround;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(n, hi));

/** Additional level row: 100 + clamp(round_even(f32(A*0.5)), 0, 10). */
export function additionalLevelKey(levelAdd: number): number {
  return 100 + clamp(roundNearestEven(f32(f32(levelAdd) * f32(0.5))), 0, 10);
}

function requirement(key: number, lookup: RequirementLookup): number {
  const raw = lookup(key);
  if (raw === null || !Number.isFinite(raw) || raw <= 0) {
    throw new RangeError(`missing/invalid reference mana requirement for stored row ${key}`);
  }
  return f32(raw); // int32 dictionary cell -> float32
}

/** One ManaGain invocation; consumes at most ONE old requirement. */
export function evaluateManaGain(p: ManaGainInput, lookup: RequirementLookup): ManaGainResult {
  let stock = f32(p.stock);
  let cost = f32(p.cost);
  if (!p.live || (p.level >= p.max_level && p.level_add >= p.max_level_add)) {
    return { stock, cost, events: 0, key: null, level: p.level, level_add: p.level_add };
  }
  stock = f32(stock + f32(p.gain));
  const eligible = stock >= cost && !p.artifact_active;
  let key: number | null = null;
  if (eligible) {
    stock = f32(stock - cost);
    key = p.level < p.max_level ? clamp(p.level, 1, 100) : additionalLevelKey(p.level_add);
    cost = requirement(key, lookup); // transient refresh, before ability acceptance
  }
  return { stock, cost, events: Number(eligible), key, level: p.level, level_add: p.level_add };
}

/** Mode2 settled refresh after accepted choice and modifier reapplication. */
export function refreshManaRequirement(p: CostRefreshInput, lookup: RequirementLookup): CostRefreshResult {
  // Unlike ManaGain's primary path, this primary key is NOT capped at 100.
  const key = p.level < p.max_level ? p.level : additionalLevelKey(p.level_add);
  const cost = requirement(key, lookup);
  return { key, cost, obtain_limit: f32(f32(p.limit_ratio) * cost) };
}

/** Applied caps; the 100/50 reset base values are supplied separately. */
export function computeAppliedMaxima(p: MaximumInput): MaximumResult {
  return {
    max_level: p.base_max + roundNearestEven(f32(p.primary_bonus)),
    max_level_add: p.base_add_max + roundNearestEven(f32(p.additional_bonus)),
  };
}

/** Exit button repayment path, separate from ordinary choice acceptance. */
export function evaluateExitStock(p: ExitStockInput): ExitStockResult {
  const ratio = clamp(f32(f32(f32(p.repay_num) * f32(p.return_ratio)) * f32(0.01)), 0, 1);
  let stock = f32(f32(p.stock) + f32(f32(p.cost) * ratio));
  const queued = stock >= f32(p.cost);
  if (queued) stock = f32(stock - f32(p.cost));
  return { stock, queued_delta: Number(queued) };
}

/** Source-specific gain calculation: item uncapped; enemy-death capped. */
export function evaluateSourceGain(p: SourceGainInput): SourceGainResult {
  const pct = f32(0.01);
  let bonus = f32(f32(p.up) + f32(p.ghost));
  if (p.kind === "item") bonus = f32(bonus + f32(p.peace));
  const first = f32(f32(p.base) * f32(f32(bonus * pct) + 1));
  const second = f32(first * f32(1 - f32(f32(p.down) * pct)));
  const lastBonus = p.kind === "item" ? f32(p.ball) : f32(f32(p.enemy) + f32(p.time));
  let result = f32(second * f32(f32(lastBonus * pct) + 1));
  if (p.kind === "enemy") result = clamp(result, 0, f32(p.limit));
  return { gain: result };
}

export type LevelingKernelCase =
  | { operation: "gain"; input: ManaGainInput }
  | { operation: "refresh_cost"; input: CostRefreshInput }
  | { operation: "maxima"; input: MaximumInput }
  | { operation: "exit_stock_kernel"; input: ExitStockInput }
  | { operation: "source_gain"; input: SourceGainInput };

/** Convenience dispatcher for 48 original finite-input cases. */
export function evaluateLevelingCase(fixture: LevelingKernelCase, lookup: RequirementLookup): ManaGainResult | CostRefreshResult | MaximumResult | ExitStockResult | SourceGainResult {
  switch (fixture.operation) {
    case "gain": return evaluateManaGain(fixture.input, lookup);
    case "refresh_cost": return refreshManaRequirement(fixture.input, lookup);
    case "maxima": return computeAppliedMaxima(fixture.input);
    case "exit_stock_kernel": return evaluateExitStock(fixture.input);
    case "source_gain": return evaluateSourceGain(fixture.input);
  }
}
