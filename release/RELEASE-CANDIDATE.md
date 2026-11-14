# Android release candidate — «آخرین افسونگر»

## Downloads
- Source: `downloads/the-mage-source.zip` — SHA-256 `7ba386698b65aebceb11325f6944bababc6333a837517dfc4333fba2565fd8ab`
- Production: `downloads/the-mage-production.zip` — SHA-256 `6c407ea44d4243d1726819aa8110f6551c8b2faacf69b093a54ae9f272cb50fc`

## Verified in this build
- 139 automated tests pass; TypeScript clean.
- Production build succeeds; release checks 17/17.
- Chromium mobile QA: 25/25 production, 26/26 staging.
- Service worker deletes only `afsungar-*` caches and reloads offline.
- npm audit: 0 vulnerabilities (dev + production).

## Not verified
- **Physical Android device testing: pending.** No device or emulator was available.
- No public HTTPS staging URL can be hosted from this sandbox; see docs/ANDROID-TESTING.md.
- Human gameplay review: pending (docs/QA-CHECKLIST.md).
