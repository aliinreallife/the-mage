import { describe, expect, it } from "vitest";
import { NATIVE_LEVELING_FIXTURES, NATIVE_LEVELING_EVIDENCE } from "./fixtures/leveling-0.9941";
import {
  additionalLevelKey,
  evaluateLevelingCase,
  evaluateManaGain,
  evaluateExitStock,
  refreshManaRequirement,
  roundNearestEven,
} from "../src/game/reference/leveling-kernel";
import { getStoredManaRequirement } from "../src/game/reference/progression-stored";
import { Game, getProgressionTable, setProgressionTable } from "../src/game/engine";

describe("Magic Survival 0.9941: native-derived bounded leveling kernels", () => {
  it("preserves all 48 source fixtures and labels their evidence honestly", () => {
    expect(NATIVE_LEVELING_FIXTURES).toHaveLength(48);
    expect(new Set(NATIVE_LEVELING_FIXTURES.map((x) => x.id)).size).toBe(48);
    expect(NATIVE_LEVELING_EVIDENCE.authority).toBe("STATIC_DERIVED_NOT_RUNTIME_OBSERVED");
    expect(NATIVE_LEVELING_EVIDENCE.sourcePackageSha256).toBe("97850f543a4ad10a2cc8a887e044818a253c84e81327a15c7c170eb8286fbb03");
    expect(NATIVE_LEVELING_FIXTURES.filter((c) => c.operation === "gain")).toHaveLength(27);
    expect(NATIVE_LEVELING_FIXTURES.filter((c) => c.operation === "refresh_cost")).toHaveLength(8);
    expect(NATIVE_LEVELING_FIXTURES.filter((c) => c.operation === "maxima")).toHaveLength(4);
    expect(NATIVE_LEVELING_FIXTURES.filter((c) => c.operation === "exit_stock_kernel")).toHaveLength(5);
    expect(NATIVE_LEVELING_FIXTURES.filter((c) => c.operation === "source_gain")).toHaveLength(4);
  });

  for (const c of NATIVE_LEVELING_FIXTURES) {
    it(`matches source finite-input fixture: ${c.id}`, () => {
      expect(evaluateLevelingCase(c, getStoredManaRequirement)).toEqual(c.expected);
    });
  }

  it("uses nearest-even ties and the source's additional-level key plateau", () => {
    expect([-2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 3.5].map(roundNearestEven))
      .toEqual([-2, -2, 0, 0, 2, 2, 4]);
    expect([0, 1, 2, 3, 4, 5, 6, 19, 20].map(additionalLevelKey))
      .toEqual([100, 100, 101, 102, 102, 102, 103, 110, 110]);
  });

  it("runs explicit L1 → L2 → L3 source calls without eager draining", () => {
    const base = { level_add: 0, max_level: 100, max_level_add: 50, live: true, artifact_active: false };
    const a = evaluateManaGain({ ...base, level: 1, stock: 0, cost: 100, gain: 500 }, getStoredManaRequirement);
    expect(a).toMatchObject({ level: 1, stock: 400, cost: 100, events: 1 });
    // Normal choice acceptance happens EXTERNALLY, before a mode2 refresh.
    // Mode2 does not itself call ManaGain or automatically drain the surplus.
    const b = refreshManaRequirement({ level: 2, level_add: 0, max_level: 100, limit_ratio: 0.0035 }, getStoredManaRequirement);
    expect(b).toMatchObject({ key: 2, cost: 136 });
    const c = evaluateManaGain({ ...base, level: 2, stock: a.stock, cost: b.cost, gain: 0 }, getStoredManaRequirement);
    expect(c).toMatchObject({ level: 2, stock: 264, cost: 136, events: 1 });
    const d = refreshManaRequirement({ level: 3, level_add: 0, max_level: 100, limit_ratio: 0.0035 }, getStoredManaRequirement);
    const e = evaluateManaGain({ ...base, level: 3, stock: c.stock, cost: d.cost, gain: 0 }, getStoredManaRequirement);
    expect(e).toMatchObject({ level: 3, stock: 91, cost: 173, events: 1 });
    expect(refreshManaRequirement({ level: 4, level_add: 0, max_level: 100, limit_ratio: 0.0035 }, getStoredManaRequirement).cost).toBe(212);
  });

  it("refuses missing source rows instead of inventing or fitting a new value", () => {
    expect(() => refreshManaRequirement({ level: 1, level_add: 0, max_level: 100, limit_ratio: 0.1 }, () => null))
      .toThrow(/missing\/invalid/);
  });

  it("does not install reference data or alter the current playable game", () => {
    setProgressionTable(null);
    const game = new Game(() => {});
    const before = game.snapshot().xpNeed;
    evaluateManaGain({ level: 1, level_add: 0, stock: 0, cost: 100, gain: 500, max_level: 100, max_level_add: 50, live: true, artifact_active: false }, getStoredManaRequirement);
    evaluateExitStock({ stock: 0, cost: 100, repay_num: 100, return_ratio: 1 });
    expect(getProgressionTable()).toBeNull();
    expect(game.snapshot().xpNeed).toBe(before);
  });
});
