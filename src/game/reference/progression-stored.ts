/**
 * Evidence-preserving stored mana rows from Magic Survival 0.9941.
 *
 * These are source-indexed Dictionary_AllStat values; they do NOT say whether
 * the runtime reads current level L or next level L+1. Nothing here patches
 * the shipping Game engine or chooses level-up/carry-over semantics.
 */
import raw from "./datasets/progression-mana-0.9941.json";
import type { ProgressionRow, ReferenceDataset } from "./types";
import { REFERENCE_GAME_VERSION } from "./types";

export interface StoredManaRow {
  readonly storedLevel: number;
  readonly manaRequired: number;
}

export const STORED_MANA_SOURCE = Object.freeze({
  gameVersion: raw.gameVersion,
  source: raw.source,
  sourceCsvSha256: raw.sourceCsvSha256,
  handoffArchiveSha256: raw.handoffArchiveSha256,
  valuesSha256: raw.valuesSha256,
  evidence: raw.evidence,
  runtimeLookupSemantics: raw.runtimeLookupSemantics,
});

export const STORED_MANA_ROWS: readonly StoredManaRow[] = Object.freeze(
  raw.rows.map((row) => Object.freeze({ storedLevel: row.storedLevel, manaRequired: row.manaRequired })),
);

/** Reject gaps, reordering, duplicated indices, and an invalid zero-level sentinel. */
export function validateStoredManaRows(rows: readonly StoredManaRow[]): string[] {
  const errors: string[] = [];
  if (rows.length !== 129) errors.push("expected exactly 129 stored rows; got " + rows.length);
  const seen = new Set<number>();
  for (const [position, row] of rows.entries()) {
    if (!row || !Number.isInteger(row.storedLevel) || row.storedLevel < 0 || row.storedLevel > 128) {
      errors.push("row " + position + ": storedLevel must be an integer from 0 through 128");
      continue;
    }
    if (seen.has(row.storedLevel)) errors.push("row " + position + ": duplicate storedLevel " + row.storedLevel);
    seen.add(row.storedLevel);
    if (row.storedLevel !== position) errors.push("row " + position + ": found level " + row.storedLevel + "; source order must be preserved");
    if (!Number.isSafeInteger(row.manaRequired)) errors.push("level " + row.storedLevel + ": mana must be a safe integer");
    else if (row.storedLevel === 0 && row.manaRequired !== 0) errors.push("level 0 must retain its stored value of 0");
    else if (row.storedLevel > 0 && row.manaRequired <= 0) errors.push("level " + row.storedLevel + ": mana must be positive");
  }
  for (let level = 0; level <= 128; level++) {
    if (!seen.has(level)) errors.push("missing storedLevel " + level);
  }
  return errors;
}

/** Literal, unshifted source lookup; null means missing or out of range. */
export function getStoredManaRequirement(storedLevel: number): number | null {
  if (!Number.isInteger(storedLevel) || storedLevel < 0 || storedLevel > 128) return null;
  const row = STORED_MANA_ROWS[storedLevel];
  return row?.storedLevel === storedLevel ? row.manaRequired : null;
}

/**
 * Convert stored rows to the existing dev-only reference importer contract.
 * An accepted dataset is not permission to apply the table to a live Game:
 * the native runtime level-index semantics remain unknown.
 */
export function getStoredManaReferenceDataset(): ReferenceDataset<ProgressionRow> {
  return {
    gameVersion: REFERENCE_GAME_VERSION,
    kind: "progression",
    source: raw.source,
    records: STORED_MANA_ROWS.map(({ storedLevel, manaRequired }) => ({
      refId: "progression.mana.storedLevel" + storedLevel,
      name: "Mana at stored row " + storedLevel,
      gameVersion: REFERENCE_GAME_VERSION,
      evidence: "stored" as const,
      source: raw.source,
      verification: "partial" as const,
      unresolved: ["runtime current/destination-level lookup and XP carry-over unverified"],
      level: storedLevel,
      manaRequired,
    })),
  };
}
