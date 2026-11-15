# Project roadmap — The Mage

Updated: November 14, 2026. Based on the imported `the-mage (11).zip` source; historical test/QA reports came from Arena and have not all been independently rerun in the new GitHub environment.

## Phase 1: playable Persian Android-first web game

**Implemented in source (not necessarily physically device-validated):** React/Canvas game, touch controls, spells/talents/fusions, artifacts and synergies, waves and bosses, four heroes, Gold/research, local checkpoints, PWA offline files, 0.9941 reference-data *infrastructure*, tests and deterministic balance simulations.

**Pending / blockers:**
- Validate full CI on the new GitHub repository.
- Physical Android install, background/resume, touch feel, thermal/FPS and offline test.
- Human playtesting of 20-minute runs and qualitative tuning.
- Choose stable hosting and Android packaging (PWA vs TWA vs Capacitor or later native port).

## Reference-mechanics track — Magic Survival 0.9941

- Reference layer: `src/game/reference/` (development-only, experimental).
- Integration instructions: `docs/reference/HANDOFF.md`.
- Research summary inventories in `src/game/reference/manifest.json` are **not actual imported datasets**.
- Only a few example fixtures are present; do not confuse inventory counts with data parity.
- **Progression data integrated:** all 129 source rows are staged in a reference-only dataset (PR #5). Native statically verified current-level lookup, float32 one-event gain, carryover and choice-later increment are modeled in a separate pure test kernel (this change). **Production engine migration is not yet done** because live scheduling/start/resume remain unresolved.
- After that: 38 named enemy rows (36 active), spell parameters, **458 native effect-to-stat bindings covering 272 IDs**, 65 stored magic-combination definitions, 100 synergy definitions (63 active), damage formula/stacking, wave schedules and RNG. These are **reported inventories**, not yet imported datasets.

### New external RE checkpoint — November 14, 2026

The separate WSL research reports **2,607 passing checks**, native dispatch at `V_Ability_Manager.AbilityStatApply` (`0x1103210`), 458 effect-to-stat bindings, and 272/371 shipped effect IDs backed by native-code analysis. The source-workspace suite passed 2,607 checks; the binary-free portable handoff passed 2,580 with 27 binary-dependent checks skipped. The latest audited namespace is **479 variables (458 ally + 21 enemy)**, correcting the earlier unsubstantiated 492. This is static evidence, not verified end-to-end gameplay or imported data. Details: [`docs/reference/RESEARCH-CHECKPOINT-2026-11-14.md`](reference/RESEARCH-CHECKPOINT-2026-11-14.md).

**Next integration gate:** obtain actual versioned 129-row progression data, confirm level index semantics, validate fixture outputs. Extend schemas for effect binding and active/inactive record flags **before** importing later data, without changing current mode or saves.

### Leveling and mana native trace — November 14, 2026

An independently verified 41,739-byte ZIP supplies 48 static-derived finite-input fixtures (48/48 reproduced by an independent TypeScript kernel). The native reader is `V_Ability_Manager.ManaGain` at `0x10fc64c`. It selects current-level requirements, subtracts one old threshold per eligible call, carries over stock and defers level increment until choice acceptance; applied maxima, float32 arithmetic and nearest-even additional-level indexing have verified static evidence. **No live-native behavior has yet been observed.** See [LEVELING-MANA-NATIVE-2026-11-14.md](reference/LEVELING-MANA-NATIVE-2026-11-14.md).

The engine's current eager `while (xp >= xpNeed)` leveling and static quadratic formula remain temporary approximations. Replace them only as a coherent, tested choice/checkpoint state machine after scheduling evidence. Native resume also clamps saved stock under its saved cost; do not remove current checkpoint truncation without full flow comparison.

### Leveling lifecycle static reconstruction — November 14, 2026

Received and verified 60,135-byte `magic-survival-0.9941-leveling-lifecycle.zip` (SHA-256 `df08990efe3c715f0f98f60f6c700e5f9231843b12800f7f52ad625bee3cc661`), including 39/39 file hashes, 13 source-derived multi-event sequences and 58 transitions. The independent TypeScript lifecycle adapter matches **58/58 expected states** in explicit-call tests. It covers fresh/resume mode1, stock clamping, primary/additional choice acceptance, delayed queue dequeue, queue priority, ability exit/repayment and full-cap sentinel. **Live game scheduling and automatic mana reentry are not verified.** No default engine/progression/save changes. See [LEVELING-LIFECYCLE-2026-11-14.md](reference/LEVELING-LIFECYCLE-2026-11-14.md).

**Next mechanics gate:** runtime or stronger call-chain evidence about gain/regen after choice completion, complete startup/save states and choice restrictions before migrating the playable engine's eager leveling loop. Combat reset-before-reapplication is recorded as a partial lead; UnitApply_* ordering and the six projectile attack lanes remain unresolved.

## Workflow for continued ChatGPT development

1. Link to the repo and specify an issue or feature to address.
2. Review `AGENTS.md`, current status, reference handoff and relevant code/tests.
3. Implement on a branch with focused commits or a pull request.
4. Run focused tests and CI; report unknowns and remaining device tests.
5. Merge reviewed changes to `main` after verification.
