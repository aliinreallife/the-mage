# Previous export vs this export — proof of actual changes

## Findings

The audit reported that `the-mage (6).zip` contained the same 75 files as the prior export.
**That ZIP is not present in this workspace**, so a byte-for-byte diff of the two archives is
not possible here. There is only one workspace: `/home/user/sandbox`. No second copy or hidden
workspace exists.

The workspace has a recurring export defect: **generated binary files do not survive the
workspace snapshot**. At the start of this session, `public/icons/` was missing again and the
QA screenshots were gone, while source survived — exactly the pattern that makes successive
ZIPs look identical. The prior “JSONL” files were also invalid because each ended with a
non-JSON `SUMMARY` line.

## What is proven here

A pre-change snapshot of this workspace was preserved **before any edit** (77 files,
56 under `src/public/scripts/tests`). It is represented by:

- `docs/evidence/baseline-source-manifest.sha256` (per-file hashes),
- `docs/evidence/heroes.before.ts`, `engine.before.ts`, `talents.before.ts`,
- the archived 48-run baseline in `docs/balance/archive-48/`.

| Fact | Previous export state | This source tree |
| --- | --- | --- |
| Source/binary files (excluding node_modules/dist/release) | 80 | **184** |
| Launcher icons | missing | **3 generated PNGs included** |
| Valid balance JSONL | 2 files with 2 invalid SUMMARY lines | **34 files, 816 rows valid** |
| 240-run balance data | none | **before + after + iteration1 (720 rows)** |
| Browser evidence | none | **6 PNG screenshots + production/staging logs** |
| Hero rebalance | none | `heroes.ts` SHA `ab4ecd…` → `b2f18b3…` |
| Fusion prerequisites | present | **unchanged**; `talents.ts` SHA `71a633f…` before and after |

## Specific changed files

See `docs/evidence/MODIFIED-FILES.md` for the table with exact SHA-256 before/after and
unified diffs. Key changes:

- `src/game/heroes.ts` — Bahman’s cold passive works on mild slows; HP/taken/spell radius;
  Azar fire damage/radius/cooldown + small global magic floor; Farzan XP 8%→5%.
- `src/game/engine.ts` — folds `taken`, `spellCd`, `frozenAnySlow`; frozen bonus honours Bahman.
- `public/sw.js` — `afsungar-v6`; activation deletes **only `afsungar-*`** caches.
- `package.json`, tests and scripts — full verification, JSONL validation and packaging gates.
- Three launcher PNGs, 240-run matrices, five-minute diagnostics, screenshots and logs.

## How packaging is now enforced

`scripts/package.mjs` runs icon generation, JSONL validation, the production build and release
checks, then **fails** if any launcher icon, QA screenshot, verification log or balance file is
missing from either archive. Therefore a future archive cannot silently omit the binaries again.

## Reproduce

```
unzip -l release/the-mage-source.zip | grep -E 'public/icons|docs/qa|docs/balance/after'
sha256sum release/the-mage-source.zip release/the-mage-production.zip
node scripts/check-jsonl.mjs docs/balance
```

The exact final ZIP entry counts and hashes are in `release/EXPORT-PROOF.md`.
