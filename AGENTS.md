# Agent guide — The Mage (آخرین افسونگر)

Use this file as persistent project context when working on the repository from ChatGPT, Codex, or another development agent.

**Canonical project documentation (read first, update during work):** `the-mage-docs/PRD.md`, `the-mage-docs/decisions.md`, `the-mage-docs/status.md`, and `the-mage-docs/how_to_update_docs.md`. On entry, check all four files, read current status and related decisions, reuse stable T/D IDs, and avoid rewriting an accepted PRD. These four files supersede old general progress/decision pointers as the *active* docs; the existing `docs/` reports remain historic/specialized evidence and must not be silently deleted. Changes to the documentation system itself follow D-007. **PRD is currently a reconstructed draft, not an approved source of truth.**

## Product and platform
- Android is the target platform; the current implementation is a portrait-first Persian RTL PWA.
- Tech stack: React 19, TypeScript, Vite, Canvas 2D, Vitest. Do **not** require Godot or rewrite the engine without an explicit reason.
- Player-facing text is Persian. Keep the joystick/game-world coordinates independent of RTL layout.
- Keep art, characters, names and branding original; the Magic Survival 0.9941 data is a mechanics reference, not permission to redistribute proprietary artwork or the APK.

## Non-negotiable product goal — mechanical fidelity

**The Mage is an original Persian/Iranian-localized adaptation whose intended gameplay target is Magic Survival 0.9941, not a loosely inspired or independently rebalanced roguelite.** This goal has applied since the project began.

- Replicate **verified** rules and functional relationships: player stats, progression, spells and levels, combinations, artifacts, class distinctions, damage/critical/defense/cooldown formulas and ordering, enemy AI and wave schedules, drops, probability rules, and permanent progression.
- Treat the current four-hero / reduced-spell Phase 1 game as a **working scaffold**, not proof of full content or mechanical completion. Existing win-rate tuning against our own bots is diagnostic, not the definition of correct balance.
- Do not invent alternative mechanics or rebalance heroes/spells based merely on equal win rates or perceived fun when reference values/behavior can be recovered.
- Mark unknown behavior as **unknown**. Temporary implementations may keep the current game playable, but must be isolated, documented and replaced only after sufficient evidence and parity tests.
- Keep gameplay parity distinct from presentation: natural Persian and Iranian cultural adaptation of text, terminology, names, and original visual identity must **not change mechanics**.
- Do not copy/distribute proprietary game sprites, audio, logos, dialogue, source assets, or APK content without rights. Pursue mechanical accuracy with our own protected creative expression.
- Use development-only reference mode as a **temporary verification gate**. Once a mechanic is supported and validated, the intended long-term default is faithful reference behavior, not permanent coexistence of two differently balanced games.
- Track progress with **system coverage and measured parity** (verified fixtures, behavior, numerical outputs), not just completed tickets, test counts or 20-minute-run success.
- Keep regressions under control: update one coherent subsystem at a time, validate against reference fixtures and the existing tests, and preserve current saves and Android/PWA usability.

## Existing functionality to preserve
- Core survival game, enemy AI, 4 heroes, combat, spells, talents/fusions, artifact choices and synergies, waves and bosses.
- Local Gold/research progression, checkpoint/resume, PWA offline behavior and asset self-healing export.
- The existing tests, balance evidence and developer-only diagnostics.
- `src/game/reference/` is **experimental** and must not change current production gameplay until backed by verified evidence and tests.

## Evidence standards for reverse-engineered data
- `stored`: extracted data, with no claim about its dynamic application.
- `inferred`: suggested meaning, not yet established.
- `static_verified`: supported by traced native code.
- `runtime_verified`: behavior demonstrated at runtime.
- Import actual complete datasets; never fabricate missing rows or silently reclassify evidence.
- Record version, source provenance, units and known uncertainties.
- Validate numerical parity separately from the balanced, shipped game mode.

## Routine verification
```bash
npm ci
npx tsc --noEmit -p tsconfig.json
npm test
npm run check:jsonl
npm run build
node scripts/verify-build.mjs
```
Use `npm run package` for reproducible release archives. It restores generated PNGs from tracked mirrors under `assets/embedded/`.

## Required development process
1. First verify and read all four `the-mage-docs/` files (especially current `status.md`, relevant D/T and PRD); then use `README.md`, `docs/PHASE1-STATUS.md` and `docs/reference/HANDOFF.md` as supporting history for major work.
2. Make a small, focused change. Prefer adding a regression test first for a reproduced bug.
3. Update `the-mage-docs/status.md` (the active handoff, same T identifier) with verified progress, blockers, tests and the next action. Older `docs/PROJECT-ROADMAP.md` is supporting historical context, not a second active task ledger.
4. Record newly accepted material product/architecture decisions in `the-mage-docs/decisions.md` with the next stable D identifier; keep `docs/DECISIONS.md` as preserved legacy history and do not duplicate entries.
5. Run `node docs/check-project-docs.mjs` and relevant code tests; record exactly which checks actually ran in `status.md`, distinguishing CI, simulations and Chromium emulation from real Android phone tests.
6. Never add secrets, private keys, decompiled APK files or paid/proprietary third-party assets to Git.

## Current priorities
1. Keep `the-mage-docs/status.md` aligned with `main`, the open experimental PRs, and the latest actually observed CI results; do not conflate them.
2. Physical Android playtest: touch feel, install, offline, background recovery, performance, heat.
3. Import genuine 0.9941 datasets incrementally, starting with the full progression table, and resolve level-index meaning before activating reference mode.
4. Continue only verified mechanical parity work; keep normal mode stable.
