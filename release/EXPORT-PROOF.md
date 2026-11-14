# Export proof — final balancing build

- Source archive: **252 entries**, SHA-256 `7ba386698b65aebceb11325f6944bababc6333a837517dfc4333fba2565fd8ab`
- Production archive: **7 entries**, SHA-256 `6c407ea44d4243d1726819aa8110f6551c8b2faacf69b093a54ae9f272cb50fc`
- Source icons present: true
- Production icons present: true
- QA screenshots in source: 6
- 240-run baseline files: 10
- 240-run final files: 10
- Five-minute diagnostics: 2
- Verification/browser logs: 32

The previous export ZIP was not present in the workspace. Proof that this archive
contains real changes is in `docs/evidence/PREVIOUS-VS-NEW.md` and
`docs/evidence/MODIFIED-FILES.md`: it compares against a pre-change snapshot of this
workspace (hashes + source copies), and the 240-run before/after matrices have different
results (78 vs 104 victories) using identical seeds.
