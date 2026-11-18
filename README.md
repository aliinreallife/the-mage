# آخرین افسونگر — The Last Sorcerer

Persian (RTL) portrait survival game built with React, TypeScript, Vite and Canvas 2D.
No physical Android device validation has been performed yet.

## Run

```bash
npm ci
npm run dev            # development
npm test               # run the current automated suite
npm run build          # production build in dist/
npm run verify         # icons + JSONL + tests + build + release checks
npm run staging:https  # local HTTPS server for phone testing on the same Wi-Fi
```

## Downloadable builds

After `npm run package`:

- `public/downloads/the-mage-source.zip` — complete source, icons, screenshots, logs, balance data
- `public/downloads/the-mage-production.zip` — deployable game for any HTTPS static host
- `public/downloads/index.html` — a small Persian download page
- `release/` — same archives plus SHA-256 sums and verification logs

The build is served as a single `dist/index.html`; icons, manifest and service worker live
beside it. See `docs/ANDROID-TESTING.md` for installation and HTTPS requirements.

## Documentation

**Canonical project handoff:** [PRD](the-mage-docs/PRD.md) · [decisions](the-mage-docs/decisions.md) · [current status](the-mage-docs/status.md) · [documentation update guide](the-mage-docs/how_to_update_docs.md). The PRD is a **reconstructed draft requiring approval**. Every development session should read the current status and update the same T/D records as warranted. Run `node docs/check-project-docs.mjs` to validate the read-only four-file structure and links.

The existing `docs/DECISIONS.md`, `docs/PROJECT-ROADMAP.md` and `docs/PHASE1-STATUS.md` are preserved for provenance; use `the-mage-docs/` for future active product decisions and status.

`docs/VERIFICATION.md` (what was run), `docs/BALANCE.md` (hero tuning), `docs/SECURITY.md`
(dependency audit), `docs/QA-CHECKLIST.md` (human Android test plan),
`docs/evidence/` (before/after source, manifests), `docs/qa/` (screenshots, browser logs).

## Status

The Phase 1 scaffold is export-verified, **not** 0.9941 runtime parity and **not** phone-release validated. Physical Android QA and human playtesting remain outstanding. See [current status](the-mage-docs/status.md) and historic `docs/PHASE1-STATUS.md`.

## Continue development with ChatGPT and GitHub

This repository is the canonical development source. See [AGENTS.md](AGENTS.md),
[the current roadmap](docs/PROJECT-ROADMAP.md), [recorded decisions](docs/DECISIONS.md),
and [GitHub onboarding](docs/REPOSITORY-SETUP.md).

The separate [Magic Survival 0.9941 reference-data layer](src/game/reference/)
is experimental; see [its handoff contract](docs/reference/HANDOFF.md).
The extracted inventory counts are **not** proof that complete reference datasets are imported.

Run `npm run binaries:restore` to reconstruct missing PNGs from tracked base64 mirrors.
Generated releases and certificates are excluded from Git.
