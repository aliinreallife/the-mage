/**
 * Magic Survival 0.9941 — BOUNDED, source-ID-only choice restrictions.
 *
 * Native evidence: LEVELING-LIFECYCLE-REPORT.md (2026-11-14) and
 * LC-PRIMARY-RESTRICTION.asm.txt @10fea78..10feb3c
 * LC-ADDITIONAL.asm.txt @10fe448..10fe5a4
 * LC-COM-RESTRICTION.asm.txt @10ff67c..10ff6d4
 *
 * These rules are static_verified branch fragments, NOT the complete
 * Create_Ability pool, weighting, ordering, rerolls, or runtime parity.
 * Inputs are SOURCE ids, never The Mage's own magic/talent ids.
 */

export const EARLY_PRIMARY_EXCLUDED_SOURCE_IDS = Object.freeze([
  31, 32, 33, 34, 35, 36, 37, 38, 39,
] as const);

export const ADDITIONAL_CHOICE_SOURCE_IDS = Object.freeze([
  9031, 9032, 9033, 9034, 9035, 9036, 9037, 9038, 9039,
] as const);

/** Input booleans stand for native branch flags; they are NOT player card types. */
export interface SourceChoiceBranchFlags {
  random: boolean;
  special: boolean;
  additional: boolean;
}

export interface SourceOfferGuardProbeInput {
  /** Copied native primary candidate source IDs, supplied from another source. */
  primaryCandidateIds: readonly number[];
  /** List_AllyMagicAddLevel indexes 1..9, NOT the separate total level_add. */
  additionalMagicLevels1To9: readonly number[];
  /** Requested count from a verified branch; no assumed default of 3 or 4. */
  requestedAdditionalCount: number;
  /** The native random/special/additional flags; supplied explicitly. */
  flags: Readonly<SourceChoiceBranchFlags>;
  /** Size of the source ultimate list, not the local game's fusion count. */
  ultimateCount: number;
}

export interface SourceOfferGuardProbeResult {
  readonly sourceLevel: number;
  readonly primaryCandidateIdsAfterEarlyExclusion: readonly number[];
  readonly additionalCandidateSourceIds: readonly number[];
  readonly boundedAdditionalCount: number;
  readonly combinationControlsSuppressed: boolean;
  readonly level99UltimateRoute: boolean;
}

function integer(input: number, label: string, min: number) {
  if (!Number.isSafeInteger(input) || input < min) throw new RangeError(label + " must be an integer >= " + min);
}

function sourceIds(ids: readonly number[], label: string) {
  if (!Array.isArray(ids)) throw new TypeError(label + " must be an array");
  for (const id of ids) integer(id, label + " entry", 0);
}

/**
 * At source level L <= 3, remove IDs 31..39 from a COPY of the ordinary
 * primary pool. The source does not say to remove ID 30.
 * Preserve original input order and duplicates; other filters are unknown.
 */
export function excludeEarlyPrimarySourceIds(level: number, copiedPool: readonly number[]): number[] {
  integer(level, "source level", 1);
  sourceIds(copiedPool, "primary source pool");
  if (level > 3) return [...copiedPool];
  const excluded = new Set<number>(EARLY_PRIMARY_EXCLUDED_SOURCE_IDS);
  return copiedPool.filter(id => !excluded.has(id));
}

/**
 * Additional branch: for each List_AllyMagicAddLevel[i] >= 1 at i=1..9,
 * add source ID 9030+i. No RNG, item substitutions, or new magic is assumed.
 */
export function additionalSourceIdsByOwnedMagic(levels1To9: readonly number[]): number[] {
  if (!Array.isArray(levels1To9) || levels1To9.length !== 9) {
    throw new RangeError("exactly nine source additional-magic levels required");
  }
  return levels1To9.flatMap((n, i) => {
    integer(n, "additional magic level", 0);
    return n >= 1 ? [ADDITIONAL_CHOICE_SOURCE_IDS[i]] : [];
  });
}

/** Verified count bound, distinct from determining the request or random draw. */
export function boundedAdditionalSourceCount(requested: number, available: number): number {
  integer(requested, "requested additional offer count", 0);
  integer(available, "available additional candidates", 0);
  return Math.min(requested, available);
}

/** Only the suppression gate; a false result does NOT guarantee eligibility. */
export function combinationControlsSuppressed(flags: Readonly<SourceChoiceBranchFlags>): boolean {
  if (typeof flags?.random !== "boolean" || typeof flags?.special !== "boolean" || typeof flags?.additional !== "boolean") {
    throw new TypeError("native random, special, additional flags must be explicit booleans");
  }
  return flags.random || flags.special || flags.additional;
}

/** L99 with an available ultimate list takes a distinct branch, not a generic offer guarantee. */
export function hasLevel99UltimateRoute(level: number, ultimateCount: number): boolean {
  integer(level, "source level", 1);
  integer(ultimateCount, "ultimate count", 0);
  return level === 99 && ultimateCount > 0;
}

/**
 * Developer-facing composition of source branch fragments. No random choice,
 * sorting, dedup, filtering of source traits, card generation, or claim that
 * any of these IDs can be mapped onto The Mage's own choices.
 */
export function inspectSourceOfferGuards(
  sourceLevel: number,
  input: Readonly<SourceOfferGuardProbeInput>,
): SourceOfferGuardProbeResult {
  integer(sourceLevel, "source level", 1);
  const primary = excludeEarlyPrimarySourceIds(sourceLevel, input.primaryCandidateIds);
  const additional = additionalSourceIdsByOwnedMagic(input.additionalMagicLevels1To9);
  return Object.freeze({
    sourceLevel,
    primaryCandidateIdsAfterEarlyExclusion: Object.freeze(primary),
    additionalCandidateSourceIds: Object.freeze(additional),
    boundedAdditionalCount: boundedAdditionalSourceCount(input.requestedAdditionalCount, additional.length),
    combinationControlsSuppressed: combinationControlsSuppressed(input.flags),
    level99UltimateRoute: hasLevel99UltimateRoute(sourceLevel, input.ultimateCount),
  });
}
