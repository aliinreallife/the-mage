# Magic Survival 0.9941 — Research checkpoint (2026-11-14)

> **Source:** November 14 project handoff supplied by the user from the **separate** WSL reverse-engineering workspace, `/home/ali/rea-magic`. These are **research-reported findings**, not independently re-extracted from the APK in this repository. The raw source tables/native traces have **not** been provided to The Mage yet.

## Scope

The goal is to compare verified numerical mechanics with the existing Persian-language game, not to replace current balancing based on unverified descriptions. Preserve the current playable PWA and keep reference mode development-only. Do not commit the source APK, proprietary media, credentials, or decompiled binaries.

## Reported reference extraction

| Item | Research-reported finding | What it establishes |
|---|---:|---|
| Native methods with addresses | 51,909 | Native mapping coverage, not proof of semantic recovery |
| Unity TextAssets | 59 | Extracted tables/localized contents |
| Player progression | 129 rows (0–128) | Stored progression data, not yet imported |
| Player base fields | 143/146 | Three unresolved |
| Magic parameter groups | 21/21 | Parameter structures identified, application still under investigation |
| Enemy definitions | 38 named rows; 36 active | Base stats, not final runtime effective stats |
| Stat-variable namespace | **479 (458 ally + 21 enemy)** | Saved namespace and metadata declarations agree; older 492 count unsupported |
| Effect IDs | 371 shipped | Distinct IDs, not all implemented effects |
| Effect IDs with native-supported bindings | 272/371 | Native code evidence for relevant stat writes |
| Effect-to-stat-variable bindings | 458 | Mappings; **not** 458 distinct effect IDs |
| Effect IDs with inferred descriptions | 299/371 | Inferred semantics, **not** runtime-verified |
| Magic combination definitions | 65 stored rows | Stored definitions; do not presume all are playable |
| Synergy definitions | 100 stored rows, 63 identified active | Active subset matters for in-game parity |
| Named classes | 49 | Dataset entries, not current game's playable class count |
| Research validation — full source workspace | 2,607 passed, 0 failed | Includes binary-dependent checks, **not** game-to-game parity |
| Research validation — portable handoff | 2,580 passed, 0 failed; 27 binary-dependent skipped | Skipped checks must not be counted as portable passes |
| Handoff record inventories | 182 artifacts; 49 classes; 22 research definitions; 16 formula records | Raw exported counts, **not** full runtime implementation |
| Wave/probability records | 71 + 71 alternate wave timings; 77 HP increments; 18 probability inputs | Alternatives unresolved; inputs are not final distributions |

## Native stat dispatch

The research reports a native dispatcher:

- `V_Ability_Manager.AbilityStatApply` at `0x1103210`
- Reported 458 native effect-to-stat-variable bindings, covering 272 distinct shipped effect IDs
- Some IDs increase magic levels, and special cases/array effects are handled separately
- Static code evidence **does not alone prove** end-to-end damage, buff stacking, trigger ordering, or runtime semantics

The separate research reports the packaged handoff at `/home/ali/rea-magic/handoff/magic-survival-0.9941-research-handoff.zip` (SHA-256 `c5eb6039953d5a5a1393a2aee7ee72e8dd0dc12a2e1084e92420d103eb4ee10d`, 2,592,848 bytes). **This repository has not received or inspected that ZIP yet**. The package reportedly contains 33 JSON/CSV pairs, 341 files, and 373 integrity/round-trip checks passing. Its data will be independently validated when uploaded.

Progression keys span levels 0–128, but the RE evidence **does not establish whether the runtime lookup uses current or destination level**, or the XP reset/carry-over behavior. Preserve raw keys; do not assume indexing semantics based on a fitted formula.

The separate research team should export a machine-readable table of mappings with at least: effect ID, target variable, operation, operand(s), native source/address, confidence/evidence, and unresolved paths. The current importer has **no `effects` dataset kind**; add an appropriately tested schema *before* importing these mappings, not by forcing them into unrelated kinds.

## High-priority handoff to this repository

1. **Full progression 0–128:** Provide the 129 real rows, source provenance and clarify whether each level index means mana to reach that level or to advance from it. Do not fabricate missing values.
2. **Enemy base definitions:** Send all 38 rows with an explicit active flag for the 36 used rows; retain base values separately from any not-yet-verified scaling formula.
3. **Effect bindings:** Export all 458 mappings and the 272-ID native-supported subset, including a trace to the stat writer and source location. Preserve special-case/unknown IDs.
4. **Magic/combinations/synergies:** Supply complete stored tables with version, activation/active status and known unknowns. Reconcile counts by *row count vs active subset vs distinct IDs*, not by overwriting earlier numbers.
5. **Damage, wave, drops and RNG:** Supply formulas and deterministic fixtures only when numerical meaning is supported, with realistic inputs/outputs and explicitly stated uncertainties.

See [HANDOFF.md](HANDOFF.md) for the current accepted data schema. That schema needs versioned extensions for effect binding records, active flags, and new row types; until then, unsupported values must be reported, not silently dropped.

## Integration gate

- All records must include their reference version `0.9941`, stable ID, provenance and evidence category.
- Separate `stored` / `inferred` / `static_verified` / `runtime_verified`.
- A valid extracted row is not automatically a verified game formula.
- Reference data must be compared through deterministic fixtures before any production-balance change.
- Keep Persian player-facing localization and all existing saves intact.
- **No complete extracted dataset was imported in this documentation update.** Inventory counts in `manifest.json` describe external research only.
