# Magic Survival 0.9941 — verified *fragments* of choice construction

**Status:** static_verified branch fragments; **not** an end-to-end selection/offer algorithm and **not** runtime_verified.

## Sources, in order of authority

- `16-supporting-documents-and-evidence.json` → `documents["analysis/mechanics/LEVELING-LIFECYCLE-REPORT.md"].content`, § "Choice restrictions: confirmed subset, not complete pool parity" (lines 149–168).
- `16-supporting-documents-and-evidence.json` → `documents["lifecycle/evidence/LC-PRIMARY-RESTRICTION.asm.txt"].content` (ARM64 0x10fea78–0x10feb3c).
- Same package → `documents["lifecycle/evidence/LC-ADDITIONAL.asm.txt"].content` (ARM64 0x10fe448–0x10fe5a4).
- Same package → `documents["lifecycle/evidence/LC-COM-RESTRICTION.asm.txt"].content` (ARM64 0x10ff67c–0x10ff6d4).
- `02-catalog-and-identities.json` → `datasets["research/analysis/mechanics/catalog.json"].data.reference_layer`, retaining reference IDs/types and names. The source has 21 `magic`, 10 `passive`, 24 `special_passive`, 66 `trait` rows. These are **stored**, not inferred gameplay weights.

## Source-ID rules implemented

| Source branch | Evidenced operation | In code |
| --- | --- | --- |
| Primary, L ≤ 3 | Remove IDs **31..39** from the copied primary candidate list; **30 is not removed** by this block | `excludeEarlyPrimarySourceIds` |
| Additional | Test nine `List_AllyMagicAddLevel[1..9]` values; where value ≥ 1, append **9031..9039** in that index order | `additionalSourceIdsByOwnedMagic` |
| Additional count | Cap the number of requested choices by the number of candidates | `boundedAdditionalSourceCount` |
| Combination controls | Suppress when source **random**, **special**, or **additional** branch flag is true | `combinationControlsSuppressed` |
| Level 99 | A nonempty ultimate list has a dedicated UI route; **not** an ordinary three-card offer rule | `hasLevel99UltimateRoute` |

**Source ID caveat:** Source 31..39 are passive abilities (e.g. 31 Intelligence and 32 Fast Casting). Source IDs **9031..9039** are **generated additional-choice IDs in the traced native branch**, not the same IDs as passives 31..39. Do not pair The Mage's Persian cards with these IDs by name similarity.

## Scope and conservative API

`src/game/reference/source-offer-guards.ts` exposes deterministic source-ID-only functions and `inspectSourceOfferGuards(sourceLevel, explicitlySuppliedInputs)`. The experimental `Game.devReferenceOfferGuardsV1(...)` forwards the current reference-session primary level. It **does not** produce playable cards, consume RNG, settle levels, mutate mana or queues, infer source flags, or map The Mage's own IDs onto the reference catalog.

Developer/test example (the candidate inputs are **illustrative**, not a recovered native full candidate pool):

```ts
const g = new Game(() => {}, 504);
g.enableReferenceLevelingV1({ limitRatio: 0.0035 }); // explicit fixture parameter
const result = g.devReferenceOfferGuardsV1({
  primaryCandidateIds: [1, 30, 31, 39],     // SOURCE IDs
  additionalMagicLevels1To9: [0, 0, 1, 0, 0, 0, 0, 0, 0],
  requestedAdditionalCount: 4,           // explicit input, NOT a default
  flags: { random: false, special: false, additional: false },
  ultimateCount: 0,
});
// result.primaryCandidateIdsAfterEarlyExclusion => [1, 30]
// result.additionalCandidateSourceIds => [9033]
// result.boundedAdditionalCount => 1
```

## Still UNKNOWN (do not implement as source facts)

Complete ordinary candidate pool construction, weights, draw order, deduplication, rerolls, eligibility/choice effects, trait selection details, class-6 override, probability inputs, random and special queue activation and all ultimate routes. No source-derived mapping from those IDs to the existing The Mage cards has been verified. In particular:

- **A suppressed combination control is not a statement about combination eligibility.**
- **A candidate that survives these filters is not guaranteed to be offered.**
- **Additional IDs are not ordinary spell IDs.**
- **The standard three-card UI belongs to The Mage until its source rule is verified.**
- **No native source runtime parity or complete saved-state parity is claimed.**

Existing normal-game `rollChoices`, local rarity-free UI, save data and Android release behavior are left untouched. Only the source-reference experiment can call this diagnostic.
