# Magic Survival 0.9941 stored mana progression — first real data handoff

> **Update (2026-11-14):** The follow-up native instruction audit resolved the original current-vs-next-level question: the `ManaGain` reader uses **current level L** (clamped to rows 1–100) and the level increment occurs on ordinary choice acceptance. The earlier uncertainty below is historical; see [native kernel audit](LEVELING-MANA-NATIVE-2026-11-14.md). Live scheduling, startup and resume still require verification.

The uploaded research ZIP was verified against SHA-256:
`c5eb6039953d5a5a1393a2aee7ee72e8dd0dc12a2e1084e92420d103eb4ee10d`.
All 340 files named in its `SHA256SUMS` were independently checked, with no missing/mismatched files. **File integrity is not runtime parity.**

## What this PR stages

- `src/game/reference/datasets/progression-mana-0.9941.json`: **129** stored numerical records with explicit source indices, levels **0–128**. Every record was cross-checked between the handoff's `exports/json/progression_all_columns.json` and `exports/json/progression_mana_requirement.json`.
- `src/game/reference/progression-stored.ts`: immutable literal lookup, strict zero-based coverage validation, and an adapter to the existing reference importer. It does **not** apply data to `Game`.
- `tests/reference-progression-stored.test.ts`: full 129-value SHA-256 digest, known boundaries, gaps/duplication, accepted data contract, and no mutation of the running game's default progression.

Source: `Dictionary_AllStat`, columns **0** (stored level), **1** (stored mana). Source CSV SHA-256:
`769df81d56d6210862b842a39aae7bacbcbb8620ad53a922a5ac242c0c078eb5`.
Only the numeric pairs and provenance are included in this public repository, not the original localized text dictionaries, APK, binaries, or full research archive.

## Explicit unknowns / integration blocker

These are **stored cells**, with later **static-code support** for current-level lookup, single-threshold subtraction, and in-run carry-over. However, the exact live UI/coroutine scheduling, initialization and resume state are not established by runtime observation. Level **0** stores **0** mana; the playable game clamps level >= 1, and existing `applyReferenceData` would reject the source's zero-valued sentinel. Do **not** bypass its refusal or shift row indices simply to make the table apply.

The current game requests **7 XP** at level 1, while stored row 1 contains **100**, but that is now a confirmed **stored requirement versus our custom progression** difference; full runtime parity still requires choice scheduling, save/resume and cap integration. The fitted mana-growth formula is `inferred` (even though it matches the stored rows); this PR preserves the stored numbers rather than recomputing them.

**Next OpenCode evidence needed:** observe the actual choice/coroutine scheduling, initialize/resume transitions and worked level-up lifecycle in a running instance. Then add actual runtime-parity fixtures and safely wire reference progression into the final game, preserving saves and Persian UI.

A separate later PR should add a typed schema for the 458 effect-to-stat bindings after their original field and operation semantics are reviewed.
