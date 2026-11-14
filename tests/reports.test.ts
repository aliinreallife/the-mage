import { existsSync, readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BY_HERO } from "../src/game/heroes";
import { canFuse } from "../src/game/talents";
import { makeGame } from "./helpers";

type Row = Record<string, unknown>;
const rowsIn = (dir: string): Row[] => {
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
  const rows: Row[] = [];
  for (const f of files) {
    const lines = readFileSync(`${dir}/${f}`, "utf8").split("\n").filter((l) => l.trim());
    for (const [i, line] of lines.entries()) {
      let row: Row;
      try {
        row = JSON.parse(line);
      } catch {
        throw new Error(`${dir}/${f}:${i + 1} is not JSON: ${line.slice(0, 80)}`);
      }
      expect(typeof row).toBe("object");
      expect(row).not.toBeNull();
      expect(Array.isArray(row)).toBe(false);
      rows.push(row);
    }
  }
  return rows;
};

describe("balance report exports", () => {
  it("every JSONL line in every saved report is a JSON object", () => {
    for (const dir of [
      "docs/balance/archive-48",
      "docs/balance/before",
      "docs/balance/after",
      "docs/balance/iteration1",
      "docs/balance/five-minute-before",
      "docs/balance/five-minute-after",
    ]) {
      const rows = rowsIn(dir);
      expect(rows.length, `${dir} has no rows`).toBeGreaterThan(0);
    }
  });

  it("before and final after matrices cover the full 240-run grid identically", () => {
    for (const dir of ["docs/balance/before", "docs/balance/after"]) {
      const rows = rowsIn(dir);
      expect(rows).toHaveLength(240);
      expect(new Set(rows.map((r) => r.seed)).size).toBe(10);
      for (const hero of ["farzan", "azar", "bahman", "tishtar"])
        for (const difficulty of ["normal", "adaptive", "brutal"])
          for (const strategy of ["naive", "focused"]) {
            const cell = rows.filter((r) => r.hero === hero && r.difficulty === difficulty && r.strategy === strategy);
            expect(cell, `${dir} ${hero}/${difficulty}/${strategy}`).toHaveLength(10);
          }
      expect(rows.every((r) => "outcome" in r && "survival" in r)).toBe(true);
    }
    const keys = (dir: string) => new Set(rowsIn(dir).map((r) => `${r.seed}|${r.hero}|${r.difficulty}|${r.strategy}`));
    expect([...keys("docs/balance/before")].sort()).toEqual([...keys("docs/balance/after")].sort());
  });

  it("five-minute diagnostics cover each hero and difficulty", () => {
    for (const dir of ["docs/balance/five-minute-before", "docs/balance/five-minute-after"]) {
      const rows = rowsIn(dir);
      expect(rows).toHaveLength(24);
      expect(new Set(rows.map((r) => r.hero)).size).toBe(4);
      expect(rows.every((r) => "dps" in r && "gemsCollected" in r && "damageTaken" in r)).toBe(true);
    }
  });

  it("the balancing pass did not weaken fusion prerequisites", () => {
    const h = makeGame(77, { autoChoose: false });
    h.any.level = 75;
    h.any.spells.set("bolt", { lvl: 4, timer: 1 }); // below level 5
    h.any.spells.set("spirit", { lvl: 5, timer: 1 });
    h.any.talents.set("bolt", "doppel");
    h.any.talents.set("spirit", "missile");
    expect(canFuse("polymorph", h.g.magicView())).toEqual({ ok: false, reason: "level" });
    h.any.spells.set("bolt", { lvl: 5, timer: 1 });
    expect(canFuse("polymorph", h.g.magicView()).ok).toBe(true);
    for (const hero of ["farzan", "azar", "bahman", "tishtar"] as const) expect(BY_HERO[hero].start).toBeTruthy();
  });
});
