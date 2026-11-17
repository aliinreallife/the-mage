import { describe, expect, it } from "vitest";
import {
  ADDITIONAL_CHOICE_SOURCE_IDS, EARLY_PRIMARY_EXCLUDED_SOURCE_IDS,
  excludeEarlyPrimarySourceIds, additionalSourceIdsByOwnedMagic,
  boundedAdditionalSourceCount, combinationControlsSuppressed,
  hasLevel99UltimateRoute, inspectSourceOfferGuards,
} from "../src/game/reference/source-offer-guards";
import { Game } from "../src/game/engine";

const flags = { random: false, special: false, additional: false };

describe("Magic Survival 0.9941 source-only offer guards (partial static verification)", () => {
  it("preserves ID30, suppresses exactly 31..39 at L1–3, and preserves input ordering", () => {
    expect(EARLY_PRIMARY_EXCLUDED_SOURCE_IDS).toEqual([31,32,33,34,35,36,37,38,39]);
    const input = [1, 31, 30, 32, 39, 4, 31, 40];
    for (const level of [1,2,3])
      expect(excludeEarlyPrimarySourceIds(level,input)).toEqual([1,30,4,40]);
    for (const level of [4,5,99])
      expect(excludeEarlyPrimarySourceIds(level,input)).toEqual(input);
    expect(input).toEqual([1, 31, 30, 32, 39, 4, 31, 40]);
  });

  it("constructs source additional IDs 9031..9039 from nine indexed levels, never arbitrary magic", () => {
    expect(ADDITIONAL_CHOICE_SOURCE_IDS).toEqual([9031,9032,9033,9034,9035,9036,9037,9038,9039]);
    expect(additionalSourceIdsByOwnedMagic([0,0,0,0,0,0,0,0,0])).toEqual([]);
    expect(additionalSourceIdsByOwnedMagic([1,0,2,0,0,0,0,0,1])).toEqual([9031,9033,9039]);
    expect(additionalSourceIdsByOwnedMagic([1,1,1,1,1,1,1,1,1])).toEqual([...ADDITIONAL_CHOICE_SOURCE_IDS]);
    expect(boundedAdditionalSourceCount(4,3)).toBe(3);
    expect(boundedAdditionalSourceCount(2,9)).toBe(2);
    expect(boundedAdditionalSourceCount(4,0)).toBe(0);
  });

  it("suppresses combination controls for every independently flagged source path", () => {
    expect(combinationControlsSuppressed(flags)).toBe(false);
    for(const kind of ["random", "special", "additional"] as const)
      expect(combinationControlsSuppressed({ ...flags, [kind]: true })).toBe(true);
    expect(combinationControlsSuppressed({ random: true, special: true, additional: true })).toBe(true);
    // Passing this suppression gate alone says nothing about recipe eligibility.
  });

  it("recognizes the narrow level-99 nonempty-ultimate alternative", () => {
    expect(hasLevel99UltimateRoute(99,1)).toBe(true);
    expect(hasLevel99UltimateRoute(99,0)).toBe(false);
    expect(hasLevel99UltimateRoute(98,9)).toBe(false);
    expect(hasLevel99UltimateRoute(100,9)).toBe(false);
  });

  it("rejects incomplete state rather than silently inventing RNG, native flags or nine slots", () => {
    expect(() => additionalSourceIdsByOwnedMagic([1,1])).toThrow(/exactly nine/);
    expect(() => additionalSourceIdsByOwnedMagic([1,1,1,1,1,1,1,1,-1])).toThrow(/additional magic level/);
    expect(() => excludeEarlyPrimarySourceIds(0,[31])).toThrow(/source level/);
    expect(() => boundedAdditionalSourceCount(3.5,9)).toThrow(/integer/);
    expect(() => combinationControlsSuppressed({ random: true, special: false, additional: undefined } as never)).toThrow(/explicit booleans/);
  });

  it("can inspect source IDs through the dev-only playable session without mapping local cards", () => {
    const g = new Game(() => {}, 504);
    expect(() => g.devReferenceOfferGuardsV1({
      primaryCandidateIds: [1,30,31,39],
      additionalMagicLevels1To9: [0,0,1,0,0,0,0,0,0],
      requestedAdditionalCount: 4, flags, ultimateCount: 0,
    })).toThrow(/reference session/);
    g.enableReferenceLevelingV1({ limitRatio: 0.0035 });
    const input = {
      primaryCandidateIds: [1,30,31,39],
      additionalMagicLevels1To9: [0,0,1,0,0,0,0,0,0],
      requestedAdditionalCount: 4, flags, ultimateCount: 0,
    };
    expect(g.devReferenceOfferGuardsV1(input)).toEqual({
      sourceLevel: 1, primaryCandidateIdsAfterEarlyExclusion: [1,30],
      additionalCandidateSourceIds: [9033], boundedAdditionalCount: 1,
      combinationControlsSuppressed: false, level99UltimateRoute: false,
    });
    expect(inspectSourceOfferGuards(3,input).primaryCandidateIdsAfterEarlyExclusion).toEqual([1,30]);
    expect(inspectSourceOfferGuards(4,input).primaryCandidateIdsAfterEarlyExclusion).toEqual([1,30,31,39]);
    expect(g.referenceLevelingV1State()).toMatchObject({ level:1,stock:0,pending:null });
    expect(g.pending).toBe(0);
    expect(g.snapshot()).toMatchObject({ level:1,xpNeed:100 });
  });
});
