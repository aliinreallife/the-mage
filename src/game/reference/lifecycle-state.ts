/**
 * Magic Survival 0.9941 — partial, explicitly driven leveling lifecycle.
 * This is a static-code-derived block adapter, NOT a real-time UI scheduler.
 * The pending kind is an analyst label, not a real native game field.
 * No frame/coroutine timing, random choices, or ability side effects are modeled.
 * Evidence: 2026-11-14 lifecycle handoff (13 sequences / 58 steps).
 */
import {
  evaluateManaGain, evaluateExitStock, refreshManaRequirement, roundNearestEven,
  type RequirementLookup,
} from "./leveling-kernel";

export type PendingChoiceKind = "primary" | "additional" | "random" | "special" | null;

export interface LevelingLifecycleState {
  level: number;
  level_add: number;
  stock: number;
  cost: number;
  obtain_limit: number;
  limit_ratio: number;
  max_level: number;
  max_level_add: number;
  live: boolean;
  artifact_active: boolean;
  queue: number;
  random_queue: number;
  special_queue: number;
  /** ANALYST-ONLY placeholder for explicit event tests; NOT a native flag. */
  pending: PendingChoiceKind;
  select_on: boolean;
  return_count: number;
  return_ratio: number;
}

export type LevelingLifecycleEvent =
  | { op: "gain"; amount: number }
  | { op: "accept_ordinary" }
  | { op: "mode2_refresh" }
  | { op: "ability_queue_tail"; scene_present_add: "Ability" }
  | { op: "exit"; repay_num: number }
  | { op: "create_return_ratio_block" }
  | { op: "restore_mana_block"; level: number; level_add: number; stock: number; cost: number; obtain_limit: number; queue: number }
  | { op: "mode1_tail"; resume: true }
  | { op: "mode1_tail"; resume: false; start_ability_num: number }
  | { op: "startup_dequeue_block"; existing_kind: PendingChoiceKind }
  | { op: "startup_additional_reconstruction"; magic_add_levels_1_to_9: number[] }
  | { op: "gate_on" }
  | { op: "artifact_visibility"; active: boolean };

const f32 = Math.fround;

/**
 * Run ONE explicitly supplied native block boundary.
 * This function NEVER invokes a subsequent event automatically. In particular,
 * choice acceptance/refresh does not automatically call ManaGain(0).
 */
export function applyLevelingLifecycleEvent(
  state: Readonly<LevelingLifecycleState>,
  event: LevelingLifecycleEvent,
  lookup: RequirementLookup,
): LevelingLifecycleState {
  const s: LevelingLifecycleState = { ...state };
  switch (event.op) {
    case "gain": {
      const result = evaluateManaGain({
        level: s.level, level_add: s.level_add, stock: s.stock, cost: s.cost,
        gain: event.amount, max_level: s.max_level, max_level_add: s.max_level_add,
        live: s.live, artifact_active: s.artifact_active,
      }, lookup);
      s.stock = result.stock;
      s.cost = result.cost;
      if (result.events) s.pending = s.level >= s.max_level ? "additional" : "primary";
      break;
    }
    case "accept_ordinary": {
      if (!s.select_on || (s.pending !== "primary" && s.pending !== "additional")) {
        throw new Error("ordinary choice acceptance requires selection gate and primary/additional pending kind");
      }
      if (s.pending === "primary") s.level++;
      else s.level_add++;
      s.pending = null;
      s.select_on = false;
      break;
    }
    case "mode2_refresh": {
      const result = refreshManaRequirement({
        level: s.level, level_add: s.level_add, max_level: s.max_level, limit_ratio: s.limit_ratio,
      }, lookup);
      s.cost = result.cost;
      s.obtain_limit = result.obtain_limit;
      break;
    }
    case "ability_queue_tail": {
      if (event.scene_present_add !== "Ability") throw new Error("only the Ability-scene queue tail is evidenced");
      if (s.queue >= 1) {
        s.queue--;
        s.pending = s.level >= s.max_level ? "additional" : "primary";
        s.select_on = false;
      } else if (s.random_queue >= 1) {
        s.random_queue--;
        s.pending = "random";
        s.select_on = false;
      } else if (s.special_queue >= 1) {
        s.special_queue--;
        s.pending = "special";
        s.select_on = false;
      }
      break;
    }
    case "exit": {
      if (!s.select_on) break;
      s.select_on = false;
      if (s.pending !== "random" && s.pending !== "special") s.return_count++;
      const result = evaluateExitStock({
        stock: s.stock, cost: s.cost, repay_num: event.repay_num, return_ratio: s.return_ratio,
      });
      s.stock = result.stock;
      s.queue += result.queued_delta;
      s.pending = null;
      break;
    }
    case "create_return_ratio_block": {
      if (s.return_count === 0) s.return_ratio = 1;
      else if (s.return_count === 1) s.return_ratio = 0.5;
      else if (s.return_count === 2) s.return_ratio = f32(0.2);
      // The native block does not write a ratio for other return counts.
      break;
    }
    case "restore_mana_block": {
      const cost = f32(event.cost);
      if (cost < 1 || !Number.isFinite(cost)) throw new RangeError("malformed source save cost outside evidenced range");
      const stock = f32(event.stock);
      s.level = event.level;
      s.level_add = event.level_add;
      s.queue = event.queue;
      s.cost = cost;
      s.stock = stock >= 0 ? Math.min(stock, f32(cost - 1)) : 0;
      s.obtain_limit = f32(event.obtain_limit);
      break;
    }
    case "mode1_tail": {
      if (!event.resume) s.queue = roundNearestEven(f32(event.start_ability_num));
      // Resume mode1 renders the saved values; it does not call mode2 here.
      break;
    }
    case "startup_dequeue_block": {
      if (s.queue >= 1) {
        s.queue--;
        s.pending = event.existing_kind;
        s.select_on = false;
      }
      break;
    }
    case "startup_additional_reconstruction": {
      if (event.magic_add_levels_1_to_9.length !== 9) throw new RangeError("expected exactly 9 additional magic-level cells");
      s.level_add = event.magic_add_levels_1_to_9.reduce((sum, n) => sum + (9 - n), 0);
      if (s.level >= s.max_level && s.level_add >= s.max_level_add) {
        s.cost = f32(1e11);
        s.stock = 0;
      }
      break;
    }
    case "gate_on": s.select_on = true; break;
    case "artifact_visibility": s.artifact_active = event.active; break;
  }
  return s;
}
