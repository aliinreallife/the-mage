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
- **Next data task:** import complete progression levels 0–128, verify level/index and mana semantics, run parity tests without altering normal game mode.
- After that: 38 named enemy rows (36 active), spell parameters, **458 native effect-to-stat bindings covering 272 IDs**, 65 stored magic-combination definitions, 100 synergy definitions (63 active), damage formula/stacking, wave schedules and RNG. These are **reported inventories**, not yet imported datasets.

### New external RE checkpoint — November 14, 2026

The separate WSL research reports **2,607 passing checks**, native dispatch at `V_Ability_Manager.AbilityStatApply` (`0x1103210`), 458 effect-to-stat bindings, and 272/371 shipped effect IDs backed by native-code analysis. The source-workspace suite passed 2,607 checks; the binary-free portable handoff passed 2,580 with 27 binary-dependent checks skipped. The latest audited namespace is **479 variables (458 ally + 21 enemy)**, correcting the earlier unsubstantiated 492. This is static evidence, not verified end-to-end gameplay or imported data. Details: [`docs/reference/RESEARCH-CHECKPOINT-2026-11-14.md`](reference/RESEARCH-CHECKPOINT-2026-11-14.md).

**Next integration gate:** obtain actual versioned 129-row progression data, confirm level index semantics, validate fixture outputs. Extend schemas for effect binding and active/inactive record flags **before** importing later data, without changing current mode or saves.

## Workflow for continued ChatGPT development

1. Link to the repo and specify an issue or feature to address.
2. Review `AGENTS.md`, current status, reference handoff and relevant code/tests.
3. Implement on a branch with focused commits or a pull request.
4. Run focused tests and CI; report unknowns and remaining device tests.
5. Merge reviewed changes to `main` after verification.
