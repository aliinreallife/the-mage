import { describe, expect, it } from "vitest";
import { Game, getProgressionTable } from "../src/game/engine";
import { ReferenceLevelingV1Session } from "../src/game/reference/playable-leveling-v1";
import { getStoredManaRequirement } from "../src/game/reference/progression-stored";

const SEED = { limitRatio: 0.0035 }; // Explicit fixture input; not a claimed native default.

describe("reference-accurate leveling V1: playable opt-in boundary", () => {
  it("starts from complete stored 0.9941 data without touching normal global progression", () => {
    const priorTable = getProgressionTable();
    const normal = new Game(() => {}, 135);
    expect(normal.snapshot()).toMatchObject({ level: 1, xp: 0, xpNeed: 7 });
    expect(normal.referenceLevelingV1State()).toBeNull();

    const dev = new Game(() => {}, 136);
    dev.enableReferenceLevelingV1(SEED);
    expect(dev.snapshot()).toMatchObject({ level: 1, xp: 0, xpNeed: 100 });
    expect(dev.referenceLevelingV1State()).toMatchObject({
      level: 1, level_add: 0, cost: 100, stock: 0,
      max_level: 100, max_level_add: 50, pending: null,
    });
    expect(getProgressionTable()).toBe(priorTable);
    expect(normal.snapshot().xpNeed).toBe(7);
  });

  it("delays level increment until a successful playable choice and does not eagerly drain surplus", () => {
    const g = new Game(() => {}, 137);
    g.enableReferenceLevelingV1(SEED);
    expect(g.devReferenceManaGainV1(500)).toBe(true);
    expect(g.snapshot()).toMatchObject({ level: 1, xp: 400, xpNeed: 100 });
    expect(g.pending).toBe(1);
    expect(g.referenceLevelingV1State()?.pending).toBe("primary");

    expect(() => g.devReferenceManaGainV1(0)).toThrow(/choice already pending/);
    expect(g.applyChoice({ id: "heal", next: 1 })).toBe(true);
    expect(g.snapshot()).toMatchObject({ level: 2, xp: 400, xpNeed: 136 });
    expect(g.pending).toBe(0);
    expect(g.referenceLevelingV1State()?.pending).toBeNull();
    // No automatic ManaGain(0) on accepting a choice.
    expect(g.snapshot().xp).toBe(400);

    // Only EXPLICIT additional native gain events consume more thresholds.
    expect(g.devReferenceManaGainV1(0)).toBe(true);
    expect(g.snapshot()).toMatchObject({ level: 2, xp: 264, xpNeed: 136 });
    expect(g.applyChoice({ id: "heal", next: 1 })).toBe(true);
    expect(g.snapshot()).toMatchObject({ level: 3, xp: 264, xpNeed: 173 });
    expect(g.devReferenceManaGainV1(0)).toBe(true);
    expect(g.snapshot()).toMatchObject({ level: 3, xp: 91, xpNeed: 173 });
    expect(g.applyChoice({ id: "heal", next: 1 })).toBe(true);
    expect(g.snapshot()).toMatchObject({ level: 4, xp: 91, xpNeed: 212 });
  });

  it("has no legacy v2 checkpoint serialization and does not grant another game's unlocks", () => {
    const g = new Game(() => {}, 138);
    g.setMode("stage");
    g.enableReferenceLevelingV1(SEED);
    expect(g.referenceLevelingV1Enabled).toBe(true);
    expect(g.canCheckpoint()).toBe(false);
    expect(g.toCheckpoint()).toBeNull();
    // The existing telemetry constructor records the initial [0, 1].
    const beforeChoices = g.telemetry.levels.length;
    g.devReferenceManaGainV1(100);
    expect(g.telemetry.levels).toHaveLength(beforeChoices);
    g.applyChoice({ id: "heal", next: 1 });
    expect(g.telemetry.levels).toHaveLength(beforeChoices + 1);
  });

  it("routes the real collected-gem path through one source gain per frame", () => {
    const g = new Game(() => {}, 140);
    g.enableReferenceLevelingV1(SEED);
    const raw = g as unknown as {
      gems: Array<{ x: number; y: number; value: number; seed: number; pull: boolean; sp: number; dead: boolean; glow: number }>;
      updateGems: (dt: number) => void;
    };
    raw.gems = [
      { x: g.player.x, y: g.player.y, value: 120, seed: 1, pull: true, sp: 0, dead: false, glow: 0 },
      { x: g.player.x, y: g.player.y, value: 200, seed: 2, pull: true, sp: 0, dead: false, glow: 0 },
    ];
    raw.updateGems(1 / 60);
    expect(g.snapshot()).toMatchObject({ level: 1, xp: 20, xpNeed: 100 });
    expect(g.pending).toBe(1);
    // The second orb stays on the field until after the current choice;
    // we never silently turn two item pickup calls into a single huge gain.
    expect(raw.gems).toHaveLength(1);
    expect(raw.gems[0].value).toBe(200);
  });

  it("rejects guessed defaults, duplicate enabling and missing choice events", () => {
    expect(() => new ReferenceLevelingV1Session({ limitRatio: Number.NaN })).toThrow(/limitRatio/);
    expect(() => new ReferenceLevelingV1Session({ limitRatio: -1 })).toThrow(/limitRatio/);
    const g = new Game(() => {}, 139);
    g.enableReferenceLevelingV1(SEED);
    expect(() => g.enableReferenceLevelingV1(SEED)).toThrow(/fresh game/);
    expect(() => new ReferenceLevelingV1Session(SEED).acceptOrdinaryChoice()).toThrow(/no evidenced/);
  });

  it("uses source additional-level pathway after the primary cap, without falsifying primary levels", () => {
    const session = new ReferenceLevelingV1Session(SEED);
    const cost100 = getStoredManaRequirement(100);
    expect(cost100).not.toBeNull();
    const restored = session.restoreManaBlock({
      level: 100, level_add: 0, stock: 0, cost: cost100!, obtain_limit: 1, queue: 0,
    });
    expect(restored.level).toBe(100);
    const gained = session.gain(cost100! + 10);
    expect(gained.queuedChoice).toBe(true);
    expect(gained.state.pending).toBe("additional");
    const chosen = session.acceptOrdinaryChoice();
    expect(chosen.levelChanged).toBe(false);
    expect(chosen.state).toMatchObject({ level: 100, level_add: 1, pending: null });
  });

  it("applies restore clamping only through an explicit reference save event", () => {
    const session = new ReferenceLevelingV1Session(SEED);
    expect(session.restoreManaBlock({
      level: 2, level_add: 0, stock: 999, cost: 136, obtain_limit: 10, queue: 1,
    })).toMatchObject({ level: 2, cost: 136, stock: 135, queue: 1 });
  });

  it("keeps rejected talent/fusion cards pending and prevents duplicate reference acceptance", () => {
    const g = new Game(() => {}, 141);
    g.enableReferenceLevelingV1(SEED);
    // A stray click before the native-derived pending event cannot apply anything.
    expect(g.applyChoice({ id: "heal", next: 1 })).toBe(false);
    expect(g.devReferenceManaGainV1(120)).toBe(true);
    const before = g.referenceLevelingV1State();
    expect(g.applyChoice({ id: "bolt", next: 1, talent: "doppel" })).toBe(false);
    expect(g.applyChoice({ id: "bolt", next: 1, fusion: "polymorph" })).toBe(false);
    expect(g.referenceLevelingV1State()).toEqual(before);
    expect(g.snapshot()).toMatchObject({ level: 1, xp: 20, xpNeed: 100 });
    expect(g.pending).toBe(1);

    expect(g.applyChoice({ id: "heal", next: 1 })).toBe(true);
    const accepted = g.referenceLevelingV1State();
    expect(accepted).toMatchObject({ level: 2, stock: 20, pending: null });
    expect(g.applyChoice({ id: "heal", next: 1 })).toBe(false);
    expect(g.referenceLevelingV1State()).toEqual(accepted);
    expect(g.snapshot()).toMatchObject({ level: 2, xp: 20, xpNeed: 136 });
    expect(g.pending).toBe(0);
  });

  it("routes explicitly supplied source item/enemy modifiers without guessing game-world inputs", () => {
    const g = new Game(() => {}, 142);
    g.enableReferenceLevelingV1(SEED);
    // Source fixture 'item_not_universally_capped': item gain 100, limit .35,
    // item path must NOT apply the enemy-specific gain cap.
    expect(g.devReferenceSourceGainV1({
      kind: "item", base: 100, up: 0, ghost: 0, peace: 0, down: 0,
      ball: 0, enemy: 0, time: 0, limit: 0.35,
    })).toBe(true);
    expect(g.snapshot()).toMatchObject({ level: 1, xp: 0, xpNeed: 100 });
    expect(g.pending).toBe(1);
    expect(g.applyChoice({ id: "heal", next: 1 })).toBe(true);

    // Source fixture 'enemy_source_capped': only .5 mana reaches ManaGain.
    const other = new Game(() => {}, 143);
    other.enableReferenceLevelingV1(SEED);
    expect(other.devReferenceSourceGainV1({
      kind: "enemy", base: 100, up: 0, ghost: 0, peace: 0, down: 0,
      ball: 0, enemy: 0, time: 0, limit: 0.5,
    })).toBe(false);
    expect(other.snapshot()).toMatchObject({ level: 1, xp: 0.5, xpNeed: 100 });
    expect(other.pending).toBe(0);
  });
});
