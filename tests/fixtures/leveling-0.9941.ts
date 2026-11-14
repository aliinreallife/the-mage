/**
 * Compact, human-readable encoding of ALL 48 independently checked OpenCode
 * leveling-fixtures.json finite-input cases; no native binary or raw TextAsset.
 * Archive SHA256: 97850f543a4ad10a2cc8a887e044818a253c84e81327a15c7c170eb8286fbb03
 * Authority: STATIC_DERIVED_NOT_RUNTIME_OBSERVED. Original Python verifier
 * passed 48/48; an independent JS translation passed 48/48 before this PR.
 * No real game runtime observations are represented here.
 */
import type {
  ManaGainInput, ManaGainResult, CostRefreshInput, CostRefreshResult,
  MaximumInput, MaximumResult, ExitStockInput, ExitStockResult,
  SourceGainInput, SourceGainResult, LevelingKernelCase,
} from "../../src/game/reference/leveling-kernel";

type Case = LevelingKernelCase & { id: string; expected: object };
const baseGain: ManaGainInput = {
  level: 1, level_add: 0, stock: 0, cost: 100, gain: 100,
  max_level: 100, max_level_add: 50, live: true, artifact_active: false,
};
const baseGainExpected: ManaGainResult = {
  level: 1, level_add: 0, stock: 0, cost: 100, events: 1, key: 1,
};
function gain(id: string, patch: Partial<ManaGainInput>, expected: Partial<ManaGainResult>): Case {
  const input = { ...baseGain, ...patch };
  return {
    id, operation: "gain", input,
    expected: { ...baseGainExpected, level: input.level, level_add: input.level_add, ...expected },
  };
}
function refresh(id: string, input: CostRefreshInput, expected: CostRefreshResult): Case {
  return { id, operation: "refresh_cost", input, expected };
}
function maxima(id: string, p: Partial<MaximumInput>, expected: MaximumResult): Case {
  return {
    id, operation: "maxima",
    input: { base_max: 100, base_add_max: 50, primary_bonus: 0.5, additional_bonus: 0.5, ...p },
    expected,
  };
}
function exit(id: string, p: Partial<ExitStockInput>, expected: ExitStockResult): Case {
  return { id, operation: "exit_stock_kernel", input: { stock: 0, cost: 100, repay_num: 0, return_ratio: 1, ...p }, expected };
}
function source(id: string, p: Partial<SourceGainInput>, expected: SourceGainResult): Case {
  return {
    id, operation: "source_gain",
    input: { kind: "item", base: 100, up: 0, ghost: 0, peace: 0, down: 0, ball: 0, enemy: 0, time: 0, limit: 1, ...p },
    expected,
  };
}

export const NATIVE_LEVELING_FIXTURES: readonly Case[] = [
  gain("below", { gain: 99 }, { stock: 99, events: 0, key: null }),
  gain("exact", { stock: 99, gain: 1 }, { stock: 0 }),
  gain("above", { gain: 150 }, { stock: 50 }),
  gain("large_gain_single_event", { gain: 500 }, { stock: 400 }),
  gain("artifact_gate_keeps_stock", { gain: 500, artifact_active: true }, { stock: 500, events: 0, key: null }),
  gain("zero_gain_rechecks_after_gate", { stock: 500, gain: 0 }, { stock: 400 }),
  gain("dead", { stock: 8, gain: 500, live: false }, { stock: 8, events: 0, key: null }),
  gain("both_caps_ignore_gain", { level: 100, level_add: 50, stock: 8, gain: 500 }, { stock: 8, events: 0, key: null }),
  gain("primary_cap_enters_additional", { level: 100 }, { cost: 24553232, key: 100 }),
  gain("row_zero_not_loaded_on_primary_event", { level: 0 }, { cost: 100, key: 1 }),
  gain("L2_carry", { level: 2, cost: 136, gain: 150 }, { stock: 14, cost: 136, key: 2 }),
  gain("large_reentry_L2", { level: 2, cost: 136, stock: 400, gain: 0 }, { stock: 264, cost: 136, key: 2 }),
  gain("large_reentry_L3", { level: 3, cost: 173, stock: 264, gain: 0 }, { stock: 91, cost: 173, key: 3 }),
  gain("large_reentry_L4_below", { level: 4, cost: 212, stock: 91, gain: 0 }, { stock: 91, cost: 212, key: null, events: 0 }),
  gain("negative_gain_not_clamped", { gain: -1 }, { stock: -1, key: null, events: 0 }),
  gain("f32_increment_lost", { stock: 16777216, cost: 33554432, gain: 1, artifact_active: true }, { stock: 16777216, cost: 33554432, key: null, events: 0 }),
  gain("primary_event_key_clamp_100", { level: 105, max_level: 110 }, { cost: 24553232, key: 100 }),
  gain("additional_rounding_A0", { level: 100 }, { cost: 24553232, key: 100 }),
  gain("additional_rounding_A1", { level: 100, level_add: 1 }, { cost: 24553232, key: 100 }),
  gain("additional_rounding_A2", { level: 100, level_add: 2 }, { cost: 27253840, key: 101 }),
  gain("additional_rounding_A3", { level: 100, level_add: 3 }, { cost: 30251512, key: 102 }),
  gain("additional_rounding_A4", { level: 100, level_add: 4 }, { cost: 30251512, key: 102 }),
  gain("additional_rounding_A5", { level: 100, level_add: 5 }, { cost: 30251512, key: 102 }),
  gain("additional_rounding_A6", { level: 100, level_add: 6 }, { cost: 33578928, key: 103 }),
  gain("additional_rounding_A19", { level: 100, level_add: 19 }, { cost: 69712656, key: 110 }),
  gain("additional_rounding_A20", { level: 100, level_add: 20 }, { cost: 69712656, key: 110 }),
  gain("additional_rounding_A49", { level: 100, level_add: 49 }, { cost: 69712656, key: 110 }),
  refresh("refresh_L1_A0", { level: 1, level_add: 0, max_level: 100, limit_ratio: 0.5 }, { key: 1, cost: 100, obtain_limit: 50 }),
  refresh("refresh_L2_A0", { level: 2, level_add: 0, max_level: 100, limit_ratio: 0.5 }, { key: 2, cost: 136, obtain_limit: 68 }),
  refresh("refresh_L3_A0", { level: 3, level_add: 0, max_level: 100, limit_ratio: 0.5 }, { key: 3, cost: 173, obtain_limit: 86.5 }),
  refresh("refresh_L99_A0", { level: 99, level_add: 0, max_level: 100, limit_ratio: 0.5 }, { key: 99, cost: 13826074, obtain_limit: 6913037 }),
  refresh("refresh_L100_A0", { level: 100, level_add: 0, max_level: 100, limit_ratio: 0.5 }, { key: 100, cost: 24553232, obtain_limit: 12276616 }),
  refresh("refresh_L100_A3", { level: 100, level_add: 3, max_level: 100, limit_ratio: 0.5 }, { key: 102, cost: 30251512, obtain_limit: 15125756 }),
  refresh("refresh_L100_A5", { level: 100, level_add: 5, max_level: 100, limit_ratio: 0.5 }, { key: 102, cost: 30251512, obtain_limit: 15125756 }),
  refresh("refresh_L100_A50", { level: 100, level_add: 50, max_level: 100, limit_ratio: 0.5 }, { key: 110, cost: 69712656, obtain_limit: 34856328 }),
  maxima("maximum_bonus_0.5", {}, { max_level: 100, max_level_add: 50 }),
  maxima("maximum_bonus_1.5", { primary_bonus: 1.5, additional_bonus: 1.5 }, { max_level: 102, max_level_add: 52 }),
  maxima("maximum_bonus_2.5", { primary_bonus: 2.5, additional_bonus: 2.5 }, { max_level: 102, max_level_add: 52 }),
  maxima("maximum_bonus_-1.5", { primary_bonus: -1.5, additional_bonus: -1.5 }, { max_level: 98, max_level_add: 48 }),
  exit("exit_no_repay", { stock: 400 }, { stock: 300, queued_delta: 1 }),
  exit("exit_exact_repay", { repay_num: 100 }, { stock: 0, queued_delta: 1 }),
  exit("exit_half_repay", { repay_num: 50 }, { stock: 50, queued_delta: 0 }),
  exit("exit_clamp_repay", { repay_num: 200 }, { stock: 0, queued_delta: 1 }),
  exit("exit_clamp_negative_repay", { repay_num: -100 }, { stock: 0, queued_delta: 0 }),
  source("item_not_universally_capped", { limit: 0.35 }, { gain: 100 }),
  source("enemy_source_capped", { kind: "enemy", limit: 0.5 }, { gain: 0.5 }),
  source("item_percent_order", { up: 100, down: 50, ball: 100, limit: 0.5 }, { gain: 200 }),
  source("enemy_negative_clamped", { kind: "enemy", down: 200 }, { gain: 0 }),
];

export const NATIVE_LEVELING_EVIDENCE = Object.freeze({
  gain: "0x10fc64c..0x10fcd6c",
  refresh_cost: "0x110fef0..0x1110194",
  maxima: "0x110fc5c..0x110fe18",
  exit_stock_kernel: "0x1110df0..0x1110e68",
  source_gain_item: "0x10ccd30..0x10cce08",
  source_gain_enemy: "0x10c620c..0x10c62f4",
  sourcePackageSha256: "97850f543a4ad10a2cc8a887e044818a253c84e81327a15c7c170eb8286fbb03",
  authority: "STATIC_DERIVED_NOT_RUNTIME_OBSERVED",
});
