# Data handoff contract — Magic Survival 0.9941 → «آخرین افسونگر»

> **Research checkpoint (2026-11-14):** [See reported native-dispatch and inventory findings](RESEARCH-CHECKPOINT-2026-11-14.md). Counts now distinguish 65 stored combination rows, 100 synergy rows (63 identified active), and 458 native effect-to-stat bindings covering 272 shipped IDs. None of those full datasets are imported here yet. The current schema does not support importing native effect bindings; it must be extended and tested first.

You do **not** need to send the APK or decompilation output. Structured numerical exports
(JSON preferred, CSV accepted) are sufficient. Upload them as they become ready; each file is
validated on arrival and reported, never guessed.

Reverse-engineering workspace: `/home/ali/rea-magic` (WSL). Arena cannot read it — send files.

## 1. File naming and envelope

```
reference-0.9941-<kind>.json
reference-0.9941-<kind>.csv          # CSV: header row = record field names
```

`kind` is one of:

| kind | contents |
|---|---|
| `progression` | level → mana/exp rows |
| `enemies` | enemy base stat rows |
| `magic` | magic parameter groups with per-level numbers |
| `combinations` | magic-combination definition rows, active status and stored modifiers |
| `artifacts` | artifacts/abilities with effects |
| `synergies` | synergy definition rows with active/inactive status |
| `formulas` | recovered equations (mana, research, chest, wave ratio…) |
| `stats` | stat-variable catalog (492 identifiers) |
| `stages` | zones and stage variants |

JSON envelope (every file):

```json
{
  "gameVersion": "0.9941",
  "kind": "progression",
  "source": "rea-magic/run-2026-11-12/progression.csv",
  "records": [ { "...": "one record per row" } ]
}
```

## 2. Record header (every record, all kinds)

| field | type | required | notes |
|---|---|---|---|
| `refId` | string | yes | unique, stable across extractions, e.g. `enemy.revenant`, `progression.mana.level7` |
| `name` | string | yes | original in-game name (kept for traceability) |
| `nameFa` | string | for player-facing kinds | Persian translation; **required** for `enemies`, `magic`, `combinations`, `artifacts`, `synergies` |
| `gameVersion` | string | yes | must be `0.9941` (a string, never a number) |
| `evidence` | enum | yes | `stored` \| `inferred` \| `static_verified` \| `runtime_verified` |
| `source` | string | yes | dataset file / extraction run / native address |
| `verification` | enum | yes | `unverified` \| `partial` \| `verified` — **the importer never upgrades this** |
| `unresolved` | string[] | when known | open questions: modifier semantics, dependencies |
| `description` | string | optional | original text |

## 3. Kind-specific fields

- **progression**: `level` (number), `manaRequired` (number > 0).
  A dataset is accepted only if it covers **every level 0–128**; partial tables are refused
  with `refusing to extrapolate` rather than filled in.
- **enemies**: `baseHp` (required), `baseDamage`, `baseSpeed` (optional),
  `runtimeModifiers` (string[], e.g. `["stage","wave","elapsedTime","difficulty"]`).
  Stored values are compared to **base** values only; runtime scaling stays our formula until
  its reference equation is verified.
- **magic**: `magicId`, `levels` object keyed by level index with numeric values,
  `unknownFields` listing anything unmodelled.
- **combinations**: `primaryMagicId`, `consumedMagicId?`,
  `storedModifiers: [{key, value, unit?}]`,
  `modifiersApplied: "not_verified" | "static_verified" | "runtime_verified"`.
- **artifacts**: `artifactId?`, `effectIds?`, `triggers?`, `stacking?`.
- **synergies**: `members` (string[]), `bonus?`.
- **formulas**: `system`, `formula`, `inputs?`.

## 4. Validation rules (enforced by `src/game/reference/validator.ts`)

1. Missing/duplicate `refId` → **error**.
2. `gameVersion ≠ 0.9941` → **error** (whole file refused by the importer).
3. Unknown `evidence` or `verification` value → **error**.
4. Required numeric field missing or non-finite → **error**.
5. Missing Persian `nameFa` on player-facing kinds → **error** (no English UI).
6. Unknown field → **warning**: reported as *unsupported*, **never mapped or guessed**.
7. `stored` enemy value without `unresolved`/`runtimeModifiers` note → **warning**.
8. Evidence status is copied through verbatim — the importer cannot promote it.

## 5. CSV

Header must contain the same columns as the JSON record (including `refId`, `name`,
`evidence`, `source`, `verification`, `gameVersion`). Purely numeric cells become numbers;
`gameVersion` and identifiers stay strings. Metadata columns are never invented.

## 6. Workflow

```bash
# 1. upload files anywhere under docs/reference/incoming/
# 2. validate + import (development build)
npm run dev            # then in the console:
#   localStorage.setItem("afsungar.reference", JSON.stringify([ds1, ds2]))
#   open http://localhost:5173/?ref   → console prints the ApplyReport
# 3. parity report
npm test               # writes/refreshes docs/reference/PARITY-REPORT.md
```

`resolveConfigMode()` only enables reference mode in a **non-production** build **and** with
`?ref` in the URL; production builds can never switch. Nothing is written to the save.

## 7. What Arena needs from you next (priority order)

1. **progression** — all 129 rows (levels 0–128), with the meaning of the level index
   (is "mana for level N" the cost *to reach* N, or *to advance from* N?).
2. **enemies** — the 36 base rows plus the runtime multiplier chain, or a clear statement
   that the chain is still unknown.
3. **magic** — 21 parameter groups with per-level rows and the units of each field.
4. **combinations** — 65 stored definition rows reported as of Nov 14; supply primary/consumed IDs and explicitly mark active/unknown entries. Do not assume all are playable.
5. **effect bindings** — 458 research-reported native bindings across 272 distinct effect IDs; extend the schema before import and include source addresses, target stat fields, operations, and unresolved special cases.
6. **formulas** — recovered equations, each with inputs, evidence, and worked examples.

Partial batches are welcome: each is validated and reported on its own. Never send a file
with invented rows to fill a gap — gaps are reported as gaps.
