# آخرین افسونگر — status after the balancing pass

**Evidence:** `docs/VERIFICATION.md`, `docs/BALANCE.md`, `docs/evidence/BEFORE-AFTER.md`,
`docs/evidence/MODIFIED-FILES.md`, `docs/evidence/PREVIOUS-VS-NEW.md`, raw matrices in
`docs/balance/{before,after,iteration1}/`, QA screenshots/logs in `docs/qa/`.

## Completed and verified in this build

- 240-run baseline vs 240-run final on identical seeds/strategies.
- Hero spread narrowed: 17–55% → **35–52%**; early deaths **24 → 17**.
- Difficulty order preserved: Normal 75% > Adaptive 38% > Brutal 18%.
- All four fusion recipes remain obtainable; prerequisites untouched; no free fusions.
- JSONL exports repaired (no summary lines mixed in) and guarded by tests.
- Launcher icons generated with Node built-ins; packaging fails if icons/screenshots/logs are missing.
- 139 automated tests, TypeScript, production build and 17 release checks pass.
- Chromium mobile QA: 25/25 production, 26/26 staging (touch movement, checkpoint resume,
  offline reload, scoped cache update, boss warnings).

## Pending before Android release

1. **Physical Android device/emulator validation** — not performed. Install/offline launch,
   real touch feel, safe areas, frame timing, thermals and background recovery on hardware.
2. **Human playtest** — the balance evidence is a scripted kiting bot, not players. Bahman and
   Farzan still lead at 52% vs 35% for Azar and Tishtar.
3. **Adaptive early deaths** rose 4→5 in the measured matrix; monitor after human data.
4. Optional: endless-mode checkpoints; HTTPS/localhost deployment; TWA/Capacitor packaging,
   store listing, splash assets.

Phase 1 is **functionally complete and export-verified**; it is **not yet validated for
Android hardware release**.
