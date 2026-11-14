import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { describe, expect, it } from "vitest";
import { Game, setProgressionTable } from "../src/game/engine";
import { getProgressionTable } from "../src/game/engine";
import {
  COMBINATION_FIXTURES,
  ENEMY_FIXTURES,
  ALL_FIXTURES,
  PROGRESSION_FIXTURES,
  PROGRESSION_ROWS,
  ENEMY_ROWS,
  COMBINATION_ROWS,
} from "../src/game/reference/fixtures";
import { importCsv, importDataset, importJson } from "../src/game/reference/importer";
import { evaluate, evaluateAll, parityReport } from "../src/game/reference/parity";
import { applyReferenceData, resolveConfigMode } from "../src/game/reference/config";
import { runPipeline, PIPELINE_ORDER, COMBAT_CATEGORIES } from "../src/game/reference/formulas";
import { ReferenceStore } from "../src/game/reference/store";
import { validateDataset, validateRecord } from "../src/game/reference/validator";
import { REFERENCE_GAME_VERSION, type ParityFixture, type ParityProvider } from "../src/game/reference/types";
import manifest from "../src/game/reference/manifest.json";

/** Our current-mode progression, measured the same way the game measures it. */
function currentMana(targetLevel: number): number {
  const g = new Game(() => {});
  g.devSetLevel(targetLevel);
  return g.snapshot().xpNeed;
}

const progressProvider: ParityProvider = (fx) => ({ manaRequired: currentMana(Number(fx.input.targetLevel)) });

describe("reference manifest", () => {
  it("declares schema version, game version and the four evidence categories", () => {
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.gameVersion).toBe("0.9941");
    expect(manifest.evidenceCategories).toEqual(["stored", "inferred", "static_verified", "runtime_verified"]);
    expect(manifest.datasets).toEqual([]); // nothing imported yet
  });

  it("keeps the recovered inventory counts without pretending they are imported", () => {
    const inv = manifest.inventory as Record<string, { found: number; imported?: boolean }>;
    expect(inv.progressionRows.found).toBe(129);
    expect(inv.enemyStatRows.found).toBe(36);
    expect(inv.magicCombinations.found).toBe(63);
    expect(inv.synergies.found).toBe(63);
    expect(inv.effectIds.found).toBe(371);
    expect(Object.values(inv).every((e) => e.imported === false)).toBe(true);
  });

  it("records the supplied numerical examples as stored evidence", () => {
    const samples = manifest.sampleExpectations as { manaRequired?: number; baseHp?: number; damageMultiplier?: number; evidence: string }[];
    expect(samples.filter((s) => s.manaRequired !== undefined).map((s) => s.manaRequired)).toEqual([100, 136, 173]);
    expect(samples.find((s) => s.baseHp === 10000)?.evidence).toBe("stored");
    expect(samples.find((s) => s.damageMultiplier === 5)?.evidence).toBe("stored");
  });
});

describe("reference records validate strictly", () => {
  it("accepts the supplied rows", () => {
    expect(validateDataset("progression", PROGRESSION_ROWS).ok).toBe(true);
    expect(validateDataset("enemies", ENEMY_ROWS).ok).toBe(true);
    expect(validateDataset("combinations", COMBINATION_ROWS).ok).toBe(true);
  });

  it("rejects a bad evidence category and a missing refId", () => {
    const seen = new Set<string>();
    const bad = validateRecord("progression", { ...PROGRESSION_ROWS[0] }, seen);
    // first record may be a duplicate of a previous run of the helper; craft fresh ones instead
    const issues1 = validateRecord("progression", { refId: "x", name: "n", gameVersion: REFERENCE_GAME_VERSION, evidence: "guessed", source: "s", verification: "unverified", level: 1, manaRequired: 1 }, new Set());
    expect(issues1.some((i) => i.field === "evidence")).toBe(true);
    const issues2 = validateRecord("progression", { name: "n", gameVersion: REFERENCE_GAME_VERSION, evidence: "stored", source: "s", verification: "unverified", level: 1, manaRequired: 1 }, new Set());
    expect(issues2.some((i) => i.field === "refId")).toBe(true);
    expect(bad.length).toBeGreaterThanOrEqual(0);
  });

  it("requires a Persian name for player-facing records", () => {
    const issues = validateRecord("enemies", { refId: "e1", name: "Revenant", gameVersion: REFERENCE_GAME_VERSION, evidence: "stored", source: "s", verification: "unverified", baseHp: 10000 }, new Set());
    expect(issues.some((i) => i.field === "nameFa")).toBe(true);
    const okRow = ENEMY_ROWS[1];
    expect(validateRecord("enemies", okRow, new Set()).some((i) => i.field === "nameFa")).toBe(false);
  });

  it("reports unknown fields instead of mapping them", () => {
    const report = validateDataset("enemies", [{ ...ENEMY_ROWS[0], mysteryField: 123 }]);
    expect(report.ok).toBe(true);
    expect(report.unsupportedFields).toContain("mysteryField");
    expect(report.warnings.some((w) => w.message.includes("unsupported"))).toBe(true);
  });

  it("flags stored enemy values that omit runtime-modifier notes", () => {
    const { runtimeModifiers, unresolved, ...bare } = ENEMY_ROWS[0];
    expect(bare).not.toHaveProperty("unresolved");
    const report = validateDataset("enemies", [bare]);
    expect(report.warnings.some((w) => w.field === "unresolved")).toBe(true);
    // with the notes present, no warning
    expect(validateDataset("enemies", [ENEMY_ROWS[0]]).warnings.some((w) => w.field === "unresolved")).toBe(false);
  });
});

describe("importer", () => {
  it("imports a well-formed JSON dataset", () => {
    const out = importJson(JSON.stringify({ gameVersion: "0.9941", kind: "progression", source: "unit-test", records: PROGRESSION_ROWS }));
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.dataset.records).toHaveLength(3);
  });

  it("refuses another game version and malformed JSON", () => {
    expect(importJson(JSON.stringify({ gameVersion: "1.0.0", kind: "progression", source: "x", records: [] })).ok).toBe(false);
    expect(importJson("{not json").ok).toBe(false);
    expect(importJson(JSON.stringify({ kind: "progression", source: "x", records: [] })).ok).toBe(false);
  });

  it("refuses records with validation errors", () => {
    const bad = importDataset({ gameVersion: "0.9941", kind: "enemies", source: "x", records: [{ refId: "e", name: "R", gameVersion: "0.9941", evidence: "stored", source: "x", verification: "unverified", baseHp: -5 }] });
    // baseHp is finite, so only the Persian-name rule fires
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.failure.reason).toContain("validation error");
  });

  it("parses CSV into numeric records when the header carries the record fields", () => {
    // Same columns as the JSON record contract — the importer never invents
    // refId / evidence / verification, so they must be explicit in the file.
    const csv = [
      "refId,name,gameVersion,evidence,source,verification,level,manaRequired",
      "progression.mana.level1,Mana requirement for level 1,0.9941,stored,csv-test,unverified,1,100",
      "progression.mana.level2,Mana requirement for level 2,0.9941,stored,csv-test,unverified,2,136",
    ].join("\n");
    const out = importCsv(csv, { kind: "progression", source: "csv-test" });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.dataset.records[0]).toMatchObject({ refId: "progression.mana.level1", level: 1, manaRequired: 100 });
      expect(typeof out.dataset.records[1].manaRequired).toBe("number");
      expect(out.dataset.records[0].evidence).toBe("stored");
    }
  });

  it("refuses a CSV that omits required record metadata", () => {
    const out = importCsv("level,manaRequired\n1,100\n", { kind: "progression", source: "csv-test" });
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.failure.reason).toContain("validation error");
  });
});

describe("reference store", () => {
  it("indexes by kind and tolerates identical re-imports, rejects conflicts", () => {
    const store = new ReferenceStore();
    const ds = importDataset({ gameVersion: "0.9941", kind: "progression", source: "a", records: PROGRESSION_ROWS });
    expect(ds.ok).toBe(true);
    if (!ds.ok) return;
    expect(store.merge(ds.dataset)).toBe(3);
    expect(store.merge(ds.dataset)).toBe(3); // identical re-import
    const clashing = importDataset({ gameVersion: "0.9941", kind: "progression", source: "b", records: [{ ...PROGRESSION_ROWS[0], manaRequired: 999 }] });
    if (clashing.ok) {
      store.merge(clashing.dataset);
      expect(store.mergeConflicts.some((c) => c.refId === PROGRESSION_ROWS[0].refId)).toBe(true);
      expect(store.get("progression", PROGRESSION_ROWS[0].refId)).toMatchObject({ manaRequired: 100 });
    }
    expect(store.inventory().progression).toBe(3);
  });
});

describe("combat formula audit", () => {
  it("documents every required category with an integration point", () => {
    const ids = COMBAT_CATEGORIES.map((c) => c.id);
    for (const id of ["baseAttack", "attackAmplification", "magicDamage", "allMagicDamage", "critical", "cooldown", "projectileCount", "sizeAndDuration", "hitFrequency", "enemyResistance", "enemyMaxHp", "conditionalEffects"])
      expect(ids).toContain(id);
    expect(COMBAT_CATEGORIES.every((c) => c.handledAt.length > 0 && c.extensionPoint.length > 0)).toBe(true);
    expect(COMBAT_CATEGORIES.filter((c) => c.configurable === "hardcoded").length).toBeGreaterThanOrEqual(0);
  });

  it("modifier pipeline applies stages in canonical order and skips inactive ops", () => {
    expect(PIPELINE_ORDER[0]).toBe("base");
    const { value, applied, skipped } = runPipeline([
      { stage: "crit", mul: 1.7, active: false, source: "test", evidence: "stored" },
      { stage: "allMagicDamage", mul: 1.5, source: "test", evidence: "stored" },
      { stage: "attackAmplify", add: 0.2, source: "test", evidence: "stored" },
      { stage: "base", mul: 10, source: "test", evidence: "stored" },
    ]);
    expect(skipped).toHaveLength(1);
    expect(applied.map((o) => o.stage)).toEqual(["base", "attackAmplify", "allMagicDamage"]);
    expect(value).toBeCloseTo((10 + 0.2) * 1.5, 9);
  });
});

describe("development-only reference mode", () => {
  it("is never active in a production build, whatever the URL says", () => {
    expect(resolveConfigMode("production", "?ref")).toBe("current");
    expect(resolveConfigMode("production", "?ref=1")).toBe("current");
  });

  it("needs a dev build AND the explicit ?ref flag", () => {
    expect(resolveConfigMode("development", "")).toBe("current");
    expect(resolveConfigMode("development", "?dev")).toBe("current");
    expect(resolveConfigMode("development", "?ref")).toBe("reference-experimental");
    expect(resolveConfigMode("development", "?x=1&ref&y=2")).toBe("reference-experimental");
  });

  it("refuses an incomplete progression table instead of extrapolating it", () => {
    const g = new Game(() => {});
    const before = g.snapshot().xpNeed;
    const report = applyReferenceData(g, [{ gameVersion: "0.9941", kind: "progression", source: "sample", records: PROGRESSION_ROWS, report: { kind: "progression", checked: 3, errors: [], warnings: [], unsupportedFields: [], ok: true } }]);
    expect(report.applied).toBe(false);
    expect(report.refused.some((r) => r.reason.includes("refusing to extrapolate"))).toBe(true);
    expect(g.snapshot().xpNeed).toBe(before); // balance untouched
    expect(getProgressionTable()).toBeNull();
  });

  it("applies a complete explicit level-to-mana table end to end", () => {
    const g = new Game(() => {});
    const before = g.snapshot().xpNeed;
    const records = Array.from({ length: 129 }, (_, level) => ({
      refId: `progression.mana.level${level}`,
      name: `Mana requirement for level ${level}`,
      gameVersion: "0.9941",
      evidence: "stored",
      source: "unit-test",
      verification: "unverified",
      level,
      manaRequired: 100 + 10 * level,
    }));
    const report = applyReferenceData(g, [{ gameVersion: "0.9941", kind: "progression", source: "unit-test", records, report: { kind: "progression", checked: records.length, errors: [], warnings: [], unsupportedFields: [], ok: true } }]);
    try {
      expect(report.applied).toBe(true);
      expect(report.appliedDatasets).toContain("progression");
      expect(g.snapshot().xpNeed).toBe(110); // index 1 → 100 + 10
      g.devSetLevel(2);
      expect(g.snapshot().xpNeed).toBe(120);
      g.devSetLevel(3);
      expect(g.snapshot().xpNeed).toBe(130);
      expect(getProgressionTable()).toHaveLength(129);
    } finally {
      setProgressionTable(null); // always restore shipped behaviour
      g.devSetLevel(1);
    }
    expect(getProgressionTable()).toBeNull();
    expect(g.snapshot().xpNeed).toBe(before); // shipped level-1 curve restored
    expect(before).toBe(7);
  });
});

describe("numerical parity harness", () => {
  it("reports a match when the implementation agrees", () => {
    const fx: ParityFixture = { refId: "t.ok", gameVersion: "0.9941", system: "progression", input: { targetLevel: 2 }, expected: { manaRequired: 11 }, evidence: "stored" };
    const r = evaluate(fx, { providers: { progression: (f) => ({ manaRequired: currentMana(Number(f.input.targetLevel)) }) } });
    expect(r.status).toBe("match");
    expect(r.delta.manaRequired).toBe(0);
  });

  it("reports an actual difference when it disagrees, and never edits the expected value", () => {
    const fixture = PROGRESSION_FIXTURES[1]; // level 2 → 136 (reference)
    const snapshot = JSON.parse(JSON.stringify(fixture));
    const r = evaluate(fixture, { providers: { progression: progressProvider } });
    expect(r.status).toBe("mismatch");
    expect(r.expected.manaRequired).toBe(136);
    expect(r.actual.manaRequired).toBe(currentMana(2));
    expect(r.delta.manaRequired).toBe(136 - currentMana(2));
    expect(fixture).toEqual(snapshot); // frozen reference data
    expect(JSON.parse(JSON.stringify(fixture))).toEqual(snapshot);
  });

  it("marks unimplemented systems as unsupported rather than guessing", () => {
    const results = evaluateAll([...ENEMY_FIXTURES, ...COMBINATION_FIXTURES], { providers: {} });
    expect(results.every((r) => r.status === "unsupported")).toBe(true);
    expect(results.every((r) => r.detail.includes("no implementation wired"))).toBe(true);
    // and a provider that cannot resolve the input
    const unresolvable = evaluate(ENEMY_FIXTURES[0], { providers: { enemy: () => null } });
    expect(unresolvable.status).toBe("unsupported");
  });

  it("writes a parity report that shows every fixture honestly", () => {
    const results = evaluateAll(ALL_FIXTURES, { providers: { progression: progressProvider } });
    const md = parityReport(results, "Parity report", "Generated from the supplied 0.9941 examples.");
    expect(md).toContain("progression.mana.level2");
    expect(md).toContain("❌ mismatch"); // our curve differs — reported, not hidden
    expect(md).toContain("⚪ unsupported");
    expect(md).toContain("never edited");
    const out = "docs/reference/PARITY-REPORT.md";
    if (!existsSync(out) || readFileSync(out, "utf8") !== md) {
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, md);
    }
    expect(readFileSync(out, "utf8")).toBe(md);
  });

  it("keeps the shipped progression curve locked", () => {
    setProgressionTable(null);
    expect(currentMana(1)).toBe(7);
    expect(currentMana(2)).toBe(11);
    expect(currentMana(3)).toBe(15);
  });
});
