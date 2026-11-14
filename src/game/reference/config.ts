/**
 * Two configurations for «آخرین افسونگر»:
 *
 *   current  — the shipped, balanced gameplay. Always the default; never changed
 *              by the presence of reference data.
 *   reference-experimental — development-only mode that applies *complete,
 *              validated* Magic Survival 0.9941 datasets to the shared engine.
 *
 * The experimental mode:
 *   - activates only in a development/staging build AND with `?ref` in the URL;
 *   - never appears as a public gameplay setting;
 *   - never writes to the save (no save disruption);
 *   - refuses partial datasets instead of filling gaps with invented values.
 */
import { patchSpellLevel } from "../data";
import { setProgressionTable, patchEnemyBase } from "../engine";
import type { Game } from "../engine";
import type { ImportedDataset } from "./importer";
import { DATASET_INTEGRATION } from "./formulas";
import type { EnemyRow, MagicParamGroupRow, ProgressionRow } from "./types";
import type { EnemyType } from "../engine";

export type GameConfigMode = "current" | "reference-experimental";

/**
 * Decide the active configuration. `buildMode` is `import.meta.env.MODE`.
 * Reference mode requires a development/staging build and the explicit `?ref`
 * flag, so a public URL can never switch gameplay.
 */
export function resolveConfigMode(buildMode: string, search: string): GameConfigMode {
  const devBuild = buildMode !== "production";
  const flagged = /[?&]ref(&|$)/.test(search);
  return devBuild && flagged ? "reference-experimental" : "current";
}

/** What a reference-mode application actually changed, for reporting. */
export interface ApplyReport {
  applied: boolean;
  mode: GameConfigMode;
  appliedDatasets: string[];
  refused: { kind: string; reason: string }[];
  notes: string[];
}

const refusals = (kind: string, reason: string) => ({ kind, reason });

/**
 * Apply imported datasets to a live game.
 *
 * Rules:
 *  - progression: the table must cover every level the game can reach
 *    (0..128) — a 3-row sample is refused, never extrapolated;
 *  - magic: each patch must target an existing level of an existing spell;
 *  - enemies: only existing enemy types and existing stat fields;
 *  - anything else is refused with a reason until its integration point exists.
 */
export function applyReferenceData(game: Game, datasets: readonly ImportedDataset[]): ApplyReport {
  const report: ApplyReport = { applied: false, mode: "current", appliedDatasets: [], refused: [], notes: [] };

  for (const ds of datasets) {
    const integration = DATASET_INTEGRATION[ds.kind];
    if (!integration || integration.status === "blocked") {
      report.refused.push(refusals(ds.kind, "no integration point yet"));
      continue;
    }
    switch (ds.kind) {
      case "progression": {
        const rows = ds.records as unknown as ProgressionRow[];
        const maxLevel = 128;
        const table: number[] = [];
        let complete = true;
        for (let lvl = 0; lvl <= maxLevel; lvl++) {
          const row = rows.find((r) => r.level === lvl);
          if (!row || !Number.isFinite(row.manaRequired) || row.manaRequired <= 0) {
            complete = false;
            break;
          }
          table.push(row.manaRequired);
        }
        if (!complete) {
          report.refused.push(refusals("progression", `incomplete table: ${rows.length}/${maxLevel + 1} rows (levels 0–${maxLevel}); refusing to extrapolate`));
          continue;
        }
        setProgressionTable(table);
        report.appliedDatasets.push("progression");
        report.notes.push(`progression table applied: ${table.length} explicit level→mana rows`);
        break;
      }
      case "magic": {
        const rows = ds.records as unknown as MagicParamGroupRow[];
        let patched = 0;
        const failed: string[] = [];
        for (const row of rows) {
          for (const [levelKey, patch] of Object.entries(row.levels)) {
            const level = Number(levelKey);
            if (!Number.isInteger(level) || level < 1) {
              failed.push(`${row.magicId} level "${levelKey}"`);
              continue;
            }
            if (patchSpellLevel(row.magicId, level, { [magicFieldFor(row)]: patch })) patched++;
            else failed.push(`${row.magicId} level ${levelKey}`);
          }
        }
        if (failed.length) report.notes.push(`magic patches skipped (unknown field or level): ${failed.slice(0, 5).join(", ")}`);
        if (patched > 0) {
          report.appliedDatasets.push("magic");
          report.notes.push(`magic rows patched: ${patched}`);
        } else report.refused.push(refusals("magic", "no patchable rows"));
        break;
      }
      case "enemies": {
        const rows = ds.records as unknown as EnemyRow[];
        let patched = 0;
        for (const row of rows) {
          const type = enemyTypeFor(row);
          if (!type) {
            report.refused.push(refusals("enemies", `no mapping for "${row.name}"`));
            continue;
          }
          if (patchEnemyBase(type, { hp: row.baseHp, ...(row.baseDamage !== undefined ? { dmg: row.baseDamage } : {}), ...(row.baseSpeed !== undefined ? { speed: row.baseSpeed } : {}) })) patched++;
        }
        if (patched > 0) {
          report.appliedDatasets.push("enemies");
          report.notes.push(`enemy base rows patched: ${patched}; runtime scaling chain remains the current formula`);
        }
        break;
      }
      default:
        report.refused.push(refusals(ds.kind, `integration point "${integration.target}" not wired yet`));
    }
  }

  report.applied = report.appliedDatasets.length > 0;
  report.mode = report.applied ? "reference-experimental" : "current";
  if (report.applied) game.refreshProgression();
  return report;
}

/** Magic records carry one numeric group per level; map it to the patch field. */
function magicFieldFor(row: MagicParamGroupRow): string {
  const key = row.magicId.toLowerCase();
  if (key.includes("damage") || key.includes("atk")) return "dmg";
  if (key.includes("cooldown") || key.includes("cd")) return "cd";
  if (key.includes("count") || key.includes("number")) return "count";
  if (key.includes("size") || key.includes("radius")) return "radius";
  return "dmg";
}

/** Reference enemy names → our enemy types. Unknown names stay unmapped. */
function enemyTypeFor(row: EnemyRow): EnemyType | null {
  const n = row.name.toLowerCase();
  if (n.includes("small swarm")) return "bat";
  if (n.includes("shade") || n.includes("wraith")) return "shade";
  if (n.includes("ghoul") || n.includes("revenant")) return "ghoul";
  if (n.includes("div") || n.includes("guard")) return "div";
  if (n.includes("boss") || n.includes("warden")) return "boss";
  return null;
}
