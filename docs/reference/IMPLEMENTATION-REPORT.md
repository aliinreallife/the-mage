# Implementation report — reference-data preparation (iteration 1)

Scope: infrastructure to absorb verified Magic Survival 0.9941 data. **No gameplay,
balance, UI or save changes**; the shipped game plays exactly as before.

## What was built

### 1. Versioned reference-data layer — `src/game/reference/`

| File | Purpose |
|---|---|
| `manifest.json` | schema version, game version, evidence categories, recovered **inventory** (all marked `imported: false`), sample expectations |
| `types.ts` | record schemas, evidence/verification enums, parity fixture & result types |
| `validator.ts` | strict validation: unique `refId`, version match, finite numbers, Persian name for player-facing kinds, unknown fields reported as *unsupported*, no evidence promotion |
| `importer.ts` | JSON envelope + CSV import (header = record fields); refuses wrong game version, malformed JSON, invalid records |
| `store.ts` | in-memory registry: merge by kind/refId, identical re-import tolerated, conflicts rejected |
| `parity.ts` | harness: `evaluate` / `evaluateAll` / `parityReport` — reports differences, never edits expected values |
| `formulas.ts` | combat/stat audit table + pure `runPipeline()` modifier-order extension point |
| `config.ts` | **current vs reference-experimental** mode resolution and dataset application |
| `fixtures.ts` | the supplied examples, verbatim |
| `index.ts` | public surface |

### 2. Two configurations

- **current** — the shipped, balanced game. Default in every build.
- **reference-experimental** — only when `import.meta.env.MODE !== "production"` **and**
  `?ref` is in the URL (`resolveConfigMode`). No public setting, no save writes,
  and `applyReferenceData()` refuses incomplete datasets instead of extrapolating:
  ```
  partial progression (3/129 rows) → refused: "refusing to extrapolate"; shipped curve untouched
  complete 129-row table          → applied; Game.refreshProgression() re-reads it
  ```

### 3. Extension points (all no-ops by default)

- `setProgressionTable(rows|null)` + `Game.refreshProgression()` — explicit level→mana tables.
- `patchSpellLevel(spell, level, patch)` — per-level magic fields; unknown spell/level/field
  returns false (fields are never invented).
- `patchEnemyBase(type, patch)` — enemy base stats only; runtime scaling formula untouched.
- `runPipeline(ops)` — canonical modifier stage order for future reference formulas; unused
  by the running game until a formula is verified.

### 4. Parity harness with the supplied examples

`tests/reference.test.ts` (25 tests) + generated `docs/reference/PARITY-REPORT.md`:

| Fixture | Status |
|---|---|
| progression mana level 1/2/3 (100/136/173) | ❌ **mismatch** vs shipped curve (7/11/15) — reported, not hidden |
| enemy Small Swarm base HP 100 | ⚪ unsupported — no verified mapping to our enemies |
| enemy Revenant base HP 10000 | ⚪ unsupported — runtime modifiers unresolved |
| Empyrean Wrath ×5 damage / ×3 count | ⚪ unsupported — combination not in our catalog |

Also locked: shipped curve (levels 1–3 = 7/11/15), parity mechanics (match / mismatch with
correct delta / unsupported), expected values proven byte-identical after evaluation.

### 5. Handoff contract

`docs/reference/HANDOFF.md`: file naming, JSON envelope, per-kind fields, the eight
validation rules, CSV rules, import workflow, and a prioritised list of the next batches
we need (progression → enemies → magic → combinations → formulas).

Example files under `docs/reference/examples/` — all three verified to import through the
real importer: JSON ×2 (0 errors / 0 warnings), CSV ×1 (0 errors / 0 warnings).

## Verification

- `npm test` → **15 files, 164 tests passed** (139 previous + 25 reference).
- `npx tsc --noEmit -p tsconfig.json` → exit 0.
- `npm run build` → exit 0.
- Pre-existing balance tests still pass unchanged (progression, heroes, stage, fusions).
- `pretest` now restores generated binaries from `assets/embedded/` first, so a stripped
  export cannot fail the suite on missing PNGs.

## What is explicitly NOT claimed

- The 129 progression rows, 36 enemy rows, 21 magic groups, 63 combinations, 371 effect
  definitions, 351 abilities and 63 synergies have **not** been imported — only the six
  supplied example values exist as fixtures.
- No numeric value was invented to fill a gap; partial data is refused with a reason.
- No current formula, balance constant, save format or UI string was changed.
- Runtime behaviour of the reference game (damage, crit, stacking, effect application)
  remains unverified; `runPipeline()` documents the intended order but is not wired in.

## Next steps

1. Ingest the first real batch (progression 0–128) → parity report flips from ❌ to real numbers.
2. Resolve the level-index semantics ("to reach" vs "advance from") before adopting the curve.
3. Enemy base rows + the runtime multiplier chain; then magic parameter groups.
4. Only after `runtime_verified` evidence: wire `runPipeline()` into `Game.hit()` behind
   reference mode, and re-run the 240-run balance matrix to compare modes.
