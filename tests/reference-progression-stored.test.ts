import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { Game, getProgressionTable, setProgressionTable } from "../src/game/engine";
import { importDataset } from "../src/game/reference/importer";
import {
  getStoredManaReferenceDataset,
  getStoredManaRequirement,
  STORED_MANA_ROWS,
  STORED_MANA_SOURCE,
  validateStoredManaRows,
} from "../src/game/reference/progression-stored";

describe("Magic Survival 0.9941 — stored progression (reference only)", () => {
  it("preserves all 129 zero-indexed rows and the full source-value digest", () => {
    expect(STORED_MANA_ROWS).toHaveLength(129);
    expect(validateStoredManaRows(STORED_MANA_ROWS)).toEqual([]);
    expect(STORED_MANA_SOURCE.gameVersion).toBe("0.9941");
    expect(STORED_MANA_SOURCE.evidence).toBe("stored");
    expect(STORED_MANA_SOURCE.sourceCsvSha256).toBe("769df81d56d6210862b842a39aae7bacbcbb8620ad53a922a5ac242c0c078eb5");
    const values = STORED_MANA_ROWS.map((r) => r.manaRequired);
    const digest = createHash("sha256").update(JSON.stringify(values)).digest("hex");
    expect(digest).toBe("cc74851569309ab6a4b9201ed1d2c4312240de869eb5423b9341ad42a4541b35");
    expect(digest).toBe(STORED_MANA_SOURCE.valuesSha256);
  });

  it("keeps the source's zero sentinel and milestone values (never shifts levels)", () => {
    expect(getStoredManaRequirement(0)).toBe(0);
    expect(getStoredManaRequirement(1)).toBe(100);
    expect(getStoredManaRequirement(2)).toBe(136);
    expect(getStoredManaRequirement(3)).toBe(173);
    expect(getStoredManaRequirement(30)).toBe(2994);
    expect(getStoredManaRequirement(80)).toBe(572936);
    expect(getStoredManaRequirement(128)).toBe(456153820);
    for (const bad of [-1, 129, 1.1, NaN, Infinity]) expect(getStoredManaRequirement(bad)).toBeNull();
  });

  it("rejects missing, duplicated, reordered or invented level values", () => {
    expect(validateStoredManaRows(STORED_MANA_ROWS.slice(1)).length).toBeGreaterThan(0);
    const duplicated = [...STORED_MANA_ROWS];
    duplicated[2] = { ...duplicated[1] };
    expect(validateStoredManaRows(duplicated).some((e) => e.includes("duplicate"))).toBe(true);
    const alteredZero = [...STORED_MANA_ROWS];
    alteredZero[0] = { ...alteredZero[0], manaRequired: 1 };
    expect(validateStoredManaRows(alteredZero).some((e) => e.includes("level 0"))).toBe(true);
    const altered = [...STORED_MANA_ROWS];
    altered[42] = { ...altered[42], manaRequired: NaN };
    expect(validateStoredManaRows(altered).some((e) => e.includes("safe integer"))).toBe(true);
  });

  it("can import the complete numeric table with stored evidence and unresolved semantics", () => {
    const outcome = importDataset(getStoredManaReferenceDataset());
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.dataset.records).toHaveLength(129);
    expect(outcome.dataset.records[0]).toMatchObject({ level: 0, manaRequired: 0, evidence: "stored", verification: "partial" });
    expect(outcome.dataset.records[128]).toMatchObject({ level: 128, manaRequired: 456153820 });
    expect(outcome.dataset.records.every((r) => Array.isArray(r.unresolved) && r.unresolved.length > 0)).toBe(true);
  });

  it("does not patch gameplay just by importing or reading source data", () => {
    setProgressionTable(null);
    const game = new Game(() => {});
    expect(game.snapshot().xpNeed).toBe(7); // current mode: not a verified reference-parity comparison
    getStoredManaReferenceDataset();
    expect(getProgressionTable()).toBeNull();
    expect(game.snapshot().xpNeed).toBe(7);
    expect(STORED_MANA_SOURCE.runtimeLookupSemantics).toContain("current level L");
    expect(STORED_MANA_SOURCE.runtimeLookupSemantics).toContain("unverified");
  });
});
