import { describe, expect, it } from "vitest";
import { LIFECYCLE_FIXTURES, LIFECYCLE_FIXTURE_META } from "./fixtures/leveling-lifecycle-0.9941";
import { applyLevelingLifecycleEvent, type LevelingLifecycleState } from "../src/game/reference/lifecycle-state";
import { getStoredManaRequirement } from "../src/game/reference/progression-stored";
import { Game, getProgressionTable, setProgressionTable } from "../src/game/engine";

describe("Magic Survival 0.9941 — bounded lifecycle, not a runtime scheduler", () => {
  it("retains 13 unique source sequences and all 58 transitions", () => {
    expect(LIFECYCLE_FIXTURE_META.authority).toBe("STATIC_DERIVED_NOT_RUNTIME_OBSERVED");
    expect(LIFECYCLE_FIXTURE_META.archiveSha256).toBe("df08990efe3c715f0f98f60f6c700e5f9231843b12800f7f52ad625bee3cc661");
    expect(LIFECYCLE_FIXTURE_META.originalFixtureSha256).toBe("fa595167fe35ef78dc70032968c5d6c3d8c143d36b2ac712a4060bf4c99d87ff");
    expect(LIFECYCLE_FIXTURES).toHaveLength(13);
    expect(new Set(LIFECYCLE_FIXTURES.map(s => s.id)).size).toBe(13);
    expect(LIFECYCLE_FIXTURES.reduce((count, s) => count + s.steps.length, 0)).toBe(58);
  });
  for (const scenario of LIFECYCLE_FIXTURES) {
    it("matches source-derived multi-event sequence: " + scenario.id, () => {
      let state: LevelingLifecycleState = scenario.initial;
      for (const [index, step] of scenario.steps.entries()) {
        const expected: LevelingLifecycleState = { ...state, ...step.delta };
        const next = applyLevelingLifecycleEvent(state, step.event, getStoredManaRequirement);
        expect(next, scenario.id + " transition " + (index + 1) + " (" + step.event.op + ")").toEqual(expected);
        expect(next).not.toBe(state);
        state = next;
      }
    });
  }
  it("refuses unsatisfied choice gates instead of accepting levels", () => {
    expect(() => applyLevelingLifecycleEvent(LIFECYCLE_FIXTURES[0].initial, { op: "accept_ordinary" }, getStoredManaRequirement)).toThrow(/gate/);
  });
  it("rejects malformed cost without guessing native behavior", () => {
    const s = LIFECYCLE_FIXTURES[0].initial;
    expect(() => applyLevelingLifecycleEvent(s, { op: "restore_mana_block", level: 1, level_add: 0, stock: 10, cost: 0, obtain_limit: 1, queue: 0 }, getStoredManaRequirement)).toThrow(/malformed/);
  });
  it("never schedules a subsequent gain just because a choice was accepted", () => {
    const fixture = LIFECYCLE_FIXTURES[0];
    let state: LevelingLifecycleState = fixture.initial;
    for (const step of fixture.steps.slice(0, 5)) state = applyLevelingLifecycleEvent(state, step.event, getStoredManaRequirement);
    expect(state).toMatchObject({ level: 2, stock: 400, cost: 136, pending: null });
    // The fixture's sixth event explicitly supplies gain(0); no automatic call happened.
  });
  it("does not mutate or switch the playable Game's progression", () => {
    setProgressionTable(null);
    const game = new Game(() => {});
    const old = game.snapshot();
    applyLevelingLifecycleEvent(LIFECYCLE_FIXTURES[0].initial, { op: "gain", amount: 500 }, getStoredManaRequirement);
    expect(getProgressionTable()).toBeNull();
    expect(game.snapshot().xpNeed).toBe(old.xpNeed);
    expect(game.snapshot().level).toBe(old.level);
  });
});
