/**
 * Magic Survival 0.9941: reference-accurate leveling V1 integration boundary.
 *
 * Deliberately explicit: each source ManaGain call, choice acceptance and
 * mode2 refresh is a separate event. Nothing here predicts Unity's unknown
 * coroutine scheduling, post-choice ManaGain(0), random offers, or save flags.
 *
 * Only developer/test code may opt in. Production Game and checkpoint schemas
 * must not depend on this experimental state.
 */
import { applyLevelingLifecycleEvent, type LevelingLifecycleState } from "./lifecycle-state";
import { getStoredManaRequirement, validateStoredManaRows, STORED_MANA_ROWS } from "./progression-stored";

export interface ReferenceLevelingV1Seed {
  /** Caller-supplied source multiplier. The native runtime default is NOT established. */
  limitRatio: number;
}

export interface ReferenceLevelingV1Result {
  queuedChoice: boolean;
  levelChanged: boolean;
  state: Readonly<LevelingLifecycleState>;
}

const lookup = getStoredManaRequirement;
const f32 = Math.fround;

/**
 * Stateful bridge for the playable engine's existing gem and choice events.
 * The game may call gain(0) only when an explicit source event is observed or
 * manually requested by a developer; this class never schedules it.
 */
export class ReferenceLevelingV1Session {
  private current: LevelingLifecycleState;

  constructor(seed: ReferenceLevelingV1Seed) {
    const errors = validateStoredManaRows(STORED_MANA_ROWS);
    if (errors.length) throw new Error("incomplete reference progression: " + errors[0]);
    if (!Number.isFinite(seed.limitRatio) || seed.limitRatio < 0) {
      throw new RangeError("explicit non-negative finite limitRatio required");
    }
    const cost = lookup(1);
    if (cost === null || cost <= 0) throw new Error("missing source level 1 requirement");
    const ratio = f32(seed.limitRatio);
    this.current = {
      level: 1,
      level_add: 0,
      stock: 0,
      cost: f32(cost),
      obtain_limit: f32(ratio * f32(cost)),
      limit_ratio: ratio,
      max_level: 100,
      max_level_add: 50,
      live: true,
      artifact_active: false,
      queue: 0,
      random_queue: 0,
      special_queue: 0,
      pending: null,
      select_on: false,
      return_count: 0,
      return_ratio: 1,
    };
  }

  snapshot(): Readonly<LevelingLifecycleState> {
    return Object.freeze({ ...this.current });
  }

  /** A single explicitly supplied ManaGain event; never an eager XP loop. */
  gain(amount: number): ReferenceLevelingV1Result {
    if (!Number.isFinite(amount)) throw new RangeError("finite mana gain required");
    if (this.current.pending !== null) {
      throw new Error("choice already pending; input scheduling is not verified");
    }
    this.current = applyLevelingLifecycleEvent(this.current, { op: "gain", amount }, lookup);
    return { queuedChoice: this.current.pending !== null, levelChanged: false, state: this.snapshot() };
  }

  /**
   * One successful ordinary choice, immediately followed by the stat-refresh
   * block. The surrounding game is responsible for applying the chosen card.
   * Does NOT invoke ManaGain(0), drain surplus, or select another choice.
   */
  acceptOrdinaryChoice(): ReferenceLevelingV1Result {
    if (this.current.pending !== "primary" && this.current.pending !== "additional") {
      throw new Error("no evidenced ordinary choice to accept");
    }
    const oldLevel = this.current.level;
    this.current = applyLevelingLifecycleEvent(this.current, { op: "gate_on" }, lookup);
    this.current = applyLevelingLifecycleEvent(this.current, { op: "accept_ordinary" }, lookup);
    this.current = applyLevelingLifecycleEvent(this.current, { op: "mode2_refresh" }, lookup);
    return { queuedChoice: false, levelChanged: this.current.level !== oldLevel, state: this.snapshot() };
  }

  /** Explicit source save-mana block, for fixture-only resume validation. */
  restoreManaBlock(input: {
    level: number; level_add: number; stock: number; cost: number; obtain_limit: number; queue: number;
  }): Readonly<LevelingLifecycleState> {
    this.current = applyLevelingLifecycleEvent(this.current, { op: "restore_mana_block", ...input }, lookup);
    return this.snapshot();
  }
}
