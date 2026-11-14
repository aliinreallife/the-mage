# Verification — Android release candidate

**Environment:** Node v20.20.2 on Linux sandbox; Chromium **141.0.7390.37** (Playwright 1.56.1,
headless mobile emulation). **No physical Android device or emulator was available.**
Every Android hardware item remains **PENDING**. Browser tests are emulation, not device tests.

## Release artifacts

| Artifact | Where |
| --- | --- |
| Complete source | `release/the-mage-source.zip`; served at `/downloads/the-mage-source.zip` |
| Deployable game | `release/the-mage-production.zip`; served at `/downloads/the-mage-production.zip` |
| Checksums | `release/SHA256SUMS.txt`, `/downloads/SHA256SUMS.txt` |
| Temporary HTTPS staging | See `docs/ANDROID-TESTING.md` (ephemeral Cloudflare quick tunnel) |

Exact archive hashes are generated at packaging time and are **not** embedded inside the
archives (that would create a self-reference). They are published in `SHA256SUMS.txt`,
`release/EXPORT-PROOF.md`, `release/MANIFEST.sha256` and `release/ZIP-CONTENTS.txt`.

## Commands and results (this build)

| Check | Command | Result |
| --- | --- | --- |
| Dependency audit | `npm audit --json` | **0 vulnerabilities** (was: 2 critical, 1 high, 1 moderate, 1 low — all dev tooling) |
| Production audit | `npm audit --omit=dev --json` | **0 vulnerabilities** |
| TypeScript | `npx tsc --noEmit -p tsconfig.json` | exit 0 |
| Tests | `npm test` | **14 files, 139 tests passed** |
| JSONL reports | `node scripts/check-jsonl.mjs docs/balance` | **816 rows / 34 files, 0 invalid** |
| Production build | `npm run build` | exit 0 — `dist/index.html 709.55 kB / gzip 308.33 kB` |
| Release checks | `node scripts/verify-build.mjs` | **17/17 passed** |
| Browser QA production | `node scripts/browser-smoke.mjs` | **25/25 passed** |
| Browser QA staging | `node scripts/browser-smoke.mjs --staging` | **26/26 passed** (boss warning) |
| Clean archive build | extract source ZIP → `npm ci`, tsc, test, build, verify, JSONL | all exit 0; 139/139 tests |
| Delivery verification | `node scripts/verify-delivery.mjs <public-base-url>` | **35/35 checks** — downloads both archives over HTTPS, matches SHA-256, extracts, asserts icons/screenshots/tests/logs/balance data, then builds and tests the delivered source |
| Production archive | extract → release verify + Chromium QA | 17/17 and 25/25 passed |

Logs: `docs/logs/*.log`, `docs/qa/browser-{production,staging}.log`.
The final archive extraction logs live in `release/` (outside the archives).

## Dependency audit (fixed)

All findings were in **development tooling**, never in the shipped `dist/` bundle; production
dependencies were already clean. Fixes: `vite 7.3.2 → 7.3.8`, `vitest 3.2.4 → 4.1.12`,
and an `overrides.esbuild = 0.28.2` pin accepted by Vite. Evidence:
`docs/logs/audit-before.json`, `docs/logs/audit-final.json`,
`docs/logs/audit-prod-final.json`; details in `docs/SECURITY.md`.

## Browser QA (Chromium emulation, NOT Android hardware)

At **360×800** and **393×873**:

- Persian `lang="fa"` / `dir="rtl"`, no horizontal overflow, brand visible on first screen.
- Bundled Vazirmatn/Lalezar fonts render offline (no internet font requests).
- Service worker installs and caches the page, manifest and all three launcher icons.
- Touch starts the game; native touch drag moves the player **105–110 world units**;
  pointer down/move/up delivered.
- Browser blur pauses and saves a v2 checkpoint with the world position.
- Offline reload offers recovery and resumes at the saved position (drift **0.03 units**).
- Service-worker update removes only `afsungar-*` and preserves another app's cache
  (`other-app-cache-v1`), then still reloads offline.
- Boss telegraph shows a readable Persian warning with countdown.
- No page or console errors.
- Screenshots: `docs/qa/{menu,play,pause}-360.png`, `{menu,play}-393.png`,
  `boss-warning-360.png`.

## Packaging reproducibility

Generated binaries do not survive every workspace export, so the source keeps base64 mirrors
of the three launcher PNGs and six QA screenshots under `assets/embedded/`. `npm run package`
restores them, regenerates the screenshots with the Chromium smoke test if any are still
missing, and archives the mirrors so a received source can rebuild itself. Verified by
deleting every PNG from an extracted source: all nine restored with correct dimensions, and
`npm run package` completed successfully from that stripped tree.

## Download verification

Both downloadable ZIPs were fetched over the HTTPS staging URL and their SHA-256 matched
`release/SHA256SUMS.txt`. Each was extracted independently:

- source: icons present (3), QA screenshots (6), before/after matrices (240+240 rows),
  verification/browser logs, docs; `npm ci`, tsc, tests, build and release checks pass;
- production: `index.html`, `manifest.webmanifest`, `sw.js`, 3 icons; release checks 17/17 and
  Chromium QA 25/25 pass. It contains **no** nested ZIPs.

## Not verified

- **Physical Android** install/offline launch, touch feel, safe areas, fps, heat, battery,
  background recovery: **pending**.
- Human gameplay/balance playtest: **pending** (`docs/QA-CHECKLIST.md`).
- Public staging URL longevity: the quick tunnel is **ephemeral** and stops with the sandbox.
  For a permanent URL, deploy the production ZIP to a static HTTPS host
  (`docs/ANDROID-TESTING.md`).

---

## Update — reference-data preparation iteration

| Check | Result |
|---|---|
| `npm test` | **15 files, 164 tests passed** (139 previous + 25 new reference tests) |
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | exit 0 — `dist/index.html 718.16 kB / gzip 310.95 kB` |
| `node scripts/verify-build.mjs` | all release checks passed |
| Parity report | `docs/reference/PARITY-REPORT.md` — 3 mismatches + 3 unsupported reported, expected values untouched |
| Handoff examples | 3 files import through the real importer with 0 errors |

No gameplay, balance, save or UI changes in this iteration. Details:
`docs/reference/IMPLEMENTATION-REPORT.md`.
