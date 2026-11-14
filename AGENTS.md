# Agent guide — The Mage (آخرین افسونگر)

Use this file as persistent project context when working on the repository from ChatGPT, Codex, or another development agent.

## Product and platform
- Android is the target platform; the current implementation is a portrait-first Persian RTL PWA.
- Tech stack: React 19, TypeScript, Vite, Canvas 2D, Vitest. Do **not** require Godot or rewrite the engine without an explicit reason.
- Player-facing text is Persian. Keep the joystick/game-world coordinates independent of RTL layout.
- Keep art, characters, names and branding original; the Magic Survival 0.9941 data is a mechanics reference, not permission to redistribute proprietary artwork or the APK.

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
1. Read `README.md`, `docs/PHASE1-STATUS.md` and `docs/reference/HANDOFF.md` before major work.
2. Make a small, focused change. Prefer adding a regression test first for a reproduced bug.
3. Update `docs/PROJECT-ROADMAP.md` with verified status and any newly discovered blockers.
4. Record decisions that affect architecture, mechanics, data semantics, or Android packaging in `docs/DECISIONS.md`.
5. Report exactly which checks actually ran, and distinguish simulations and Chromium emulation from real Android phone tests.
6. Never add secrets, private keys, decompiled APK files or paid/proprietary third-party assets to Git.

## Current priorities
1. Set up GitHub and verify its CI on an actual pushed commit.
2. Physical Android playtest: touch feel, install, offline, background recovery, performance, heat.
3. Import genuine 0.9941 datasets incrementally, starting with the full progression table, and resolve level-index meaning before activating reference mode.
4. Continue only verified mechanical parity work; keep normal mode stable.
