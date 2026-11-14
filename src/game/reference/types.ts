/**
 * Types for the Magic Survival reference-data layer.
 *
 * This layer is a *separate, versioned* container for data recovered from the
 * original game. It never feeds the running game unless a dataset is complete,
 * validated and explicitly applied by the development-only experimental mode.
 *
 * Evidence categories (never upgraded automatically):
 *   stored          — numeric value extracted from game data
 *   inferred        — meaning inferred from descriptions or context
 *   static_verified — supported by native-code analysis
 *   runtime_verified— demonstrated through actual/authoritative runtime evidence
 */

export const EVIDENCE_CATEGORIES = ["stored", "inferred", "static_verified", "runtime_verified"] as const;
export type EvidenceCategory = (typeof EVIDENCE_CATEGORIES)[number];

export const VERIFICATION_STATES = ["unverified", "partial", "verified"] as const;
export type VerificationState = (typeof VERIFICATION_STATES)[number];

/** The reference game version these datasets describe. */
export type GameVersion = "0.9941";

export const REFERENCE_GAME_VERSION: GameVersion = "0.9941";

/** Common header every imported record must carry. */
export interface ReferenceRecordBase {
  /** Unique reference identifier, stable across extractions (e.g. `enemy.revenant`). */
  refId: string;
  /** Original in-game name (kept for traceability). */
  name: string;
  /** Persian translation — required for anything that can reach player-facing UI. */
  nameFa?: string;
  gameVersion: GameVersion;
  evidence: EvidenceCategory;
  /** Where the value came from (dataset file, extraction run, native address…). */
  source: string;
  verification: VerificationState;
  /** Any unresolved modifier semantics or dependencies. */
  unresolved?: string[];
  /** Original description, when one exists. */
  description?: string;
}

/* ------------------------------------------------------------------ rows */

/** One explicit level → mana requirement row. */
export interface ProgressionRow extends ReferenceRecordBase {
  level: number;
  manaRequired: number;
}

/** One enemy base-stat row (before any runtime multiplier). */
export interface EnemyRow extends ReferenceRecordBase {
  baseHp: number;
  baseDamage?: number;
  baseSpeed?: number;
  /** Runtime modifiers that may apply — explicitly unresolved until verified. */
  runtimeModifiers?: string[];
}

/** One magic parameter group (21 groups identified in 0.9941). */
export interface MagicParamGroupRow extends ReferenceRecordBase {
  magicId: string;
  /** Per-level numeric parameters, keyed by level index. */
  levels: Record<string, number>;
  /** Fields present in the source but not yet understood. */
  unknownFields?: string[];
}

/** One combination (63 identified). Stored modifiers are *not* runtime effects. */
export interface CombinationRow extends ReferenceRecordBase {
  primaryMagicId: string;
  consumedMagicId?: string;
  storedModifiers: { key: string; value: number; unit?: string }[];
  /** Whether native application of these modifiers has been verified. */
  modifiersApplied: "not_verified" | "static_verified" | "runtime_verified";
}

/** One artifact/ability record (351 abilities, artifacts within). */
export interface ArtifactRow extends ReferenceRecordBase {
  artifactId?: string;
  effectIds?: string[];
  /** Conditional triggers and stacking semantics, when known. */
  triggers?: string[];
  stacking?: string;
}

/** One synergy row (63 identified). */
export interface SynergyRow extends ReferenceRecordBase {
  members: string[];
  bonus?: string;
}

/** One formula record (mana progression, research, chest thresholds…). */
export interface FormulaRow extends ReferenceRecordBase {
  system: string;
  formula: string;
  inputs?: string[];
}

/* --------------------------------------------------------------- dataset */

export type ReferenceDatasetKind =
  | "progression"
  | "enemies"
  | "magic"
  | "combinations"
  | "artifacts"
  | "synergies"
  | "formulas"
  | "stats"
  | "stages";

export interface ReferenceDataset<T> {
  /** File naming: reference-<gameVersion>-<kind>.json */
  gameVersion: GameVersion;
  kind: ReferenceDatasetKind;
  /** Extraction run / source dataset name. */
  source: string;
  records: T[];
}

/** What the reverse-engineering project has recovered (inventory, not yet supplied data). */
export interface InventoryEntry {
  found: number;
  of?: number;
  /** True when rows exist locally in this repository. */
  imported: boolean;
  note?: string;
}

export interface ReferenceManifest {
  schemaVersion: 1;
  gameVersion: GameVersion;
  /** Categories allowed in `evidence`. */
  evidenceCategories: typeof EVIDENCE_CATEGORIES;
  /** What the reference project reports as recovered. */
  inventory: Record<string, InventoryEntry>;
  /** Datasets actually present in this repository right now. */
  datasets: { kind: ReferenceDatasetKind; file: string; records: number; source: string }[];
  handoff: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ parity */

export type ParitySystem = "progression" | "enemy" | "magic" | "combination" | "artifact" | "formula";

/**
 * A single reference expectation. `expected` is authoritative: the harness
 * compares against it and reports differences. It is never edited to pass.
 */
export interface ParityFixture {
  refId: string;
  gameVersion: GameVersion;
  system: ParitySystem;
  input: Record<string, unknown>;
  expected: Record<string, number>;
  evidence: EvidenceCategory;
  /** Free-text note about unresolved semantics. */
  note?: string;
}

export type ParityStatus =
  | "match"
  | "mismatch" // reference exists but our implementation differs (reported, not edited)
  | "unsupported" // no implementation / no mapping exists yet
  | "unverified"; // reference itself is not runtime-verified

export interface ParityResult {
  refId: string;
  system: ParitySystem;
  status: ParityStatus;
  expected: Record<string, number>;
  actual: Record<string, number | null>;
  /** expected − actual per key, for numbers. */
  delta: Record<string, number | null>;
  evidence: EvidenceCategory;
  detail: string;
}
