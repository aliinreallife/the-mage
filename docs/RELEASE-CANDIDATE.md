# Release candidate — «آخرین افسونگر»

Built from the source in `the-mage-source.zip`; deploys from `the-mage-production.zip`.
Archive SHA-256 values are published in `SHA256SUMS.txt` and `release/` (not embedded here,
to avoid a self-referencing hash).

## What is in this candidate

- Four heroes, four fusion recipes, stage «میدان آزمایش», endless mode, artifacts/sets,
  gold/research, checkpoints, talents/masteries, Persian RTL UI, PWA/offline support.
- Three launcher PNGs (192, 512, maskable 512).
- Full evidence: 240-run before/after matrices and five-minute diagnostics, six Chromium
  screenshots, test/build/browser/audit logs, before/after source snapshots.

## Verified

- 139/139 automated tests; TypeScript clean; production build clean; release checks 17/17.
- Chromium mobile QA 25/25 production, 26/26 staging (touch movement, checkpoint resume,
  offline reload, SW cache isolation, boss warnings).
- `npm audit`: 0 vulnerabilities in development and production.
- Clean extraction of both archives re-verified successfully.

## Pending

1. **Physical Android testing** — not performed. No device/emulator available.
2. **Human playtest** — use `docs/QA-CHECKLIST.md`.
3. **Permanent HTTPS URL** — the provided quick tunnel is ephemeral; deploy the production ZIP
   for a stable URL (`docs/ANDROID-TESTING.md`).
