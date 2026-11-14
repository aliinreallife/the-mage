# Dependency audit — release candidate

Commands: `npm audit --json` and `npm audit --omit=dev --json`.

## Before

| Severity | Count | Package | Scope | Notes |
| --- | --- | --- | --- | --- |
| critical | 2 | `vitest`, `tinypool` | dev | test runner only; not shipped |
| high | 1 | `vite` 7.3.2 | dev | fix available: 7.3.8 (non-major) |
| moderate | 1 | `@vitest/mocker` | dev | test runner only |
| low | 1 | `esbuild` 0.27.7 | dev | Windows dev-server file read |

**Production dependencies:** 0 vulnerabilities (`--omit=dev`).

## Actions

- `vite` **7.3.2 → 7.3.8** (patched, non-major).
- `vitest` **3.2.4 → 4.1.12** (patched; full suite re-run).
- `overrides.esbuild = 0.28.2` — Vite accepts `^0.27 || ^0.28`; patches the low advisory.
- No runtime dependency was changed.

## After

```
npm audit              → 0 vulnerabilities (info 0, low 0, moderate 0, high 0, critical 0)
npm audit --omit=dev   → 0 vulnerabilities
```

JSON evidence: `docs/logs/audit-before.json`, `docs/logs/audit-final.json`,
`docs/logs/audit-prod-final.json`.

## Notes

- All advisories were in development tooling (test runner/dev server), not in the shipped
  `dist/` bundle. Production exposure was already zero before the upgrade.
- `npm ci` on a clean extraction passed after the upgrade, and 139/139 tests passed.
