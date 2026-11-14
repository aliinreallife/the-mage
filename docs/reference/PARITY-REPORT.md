# Parity report

Generated from the supplied 0.9941 examples.

| Fixture | System | Status | Expected | Actual | Delta | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `progression.mana.level1` | progression | ❌ mismatch | manaRequired=100 | manaRequired=7 | manaRequired:+93 | stored |
| `progression.mana.level2` | progression | ❌ mismatch | manaRequired=136 | manaRequired=11 | manaRequired:+125 | stored |
| `progression.mana.level3` | progression | ❌ mismatch | manaRequired=173 | manaRequired=15 | manaRequired:+158 | stored |
| `enemy.small_swarm.base_hp` | enemy | ⚪ unsupported | baseHp=100 | — | — | stored |
| `enemy.revenant.base_hp` | enemy | ⚪ unsupported | baseHp=10000 | — | — | stored |
| `combination.empyrean_wrath.modifiers` | combination | ⚪ unsupported | damageMultiplier=5, countMultiplier=3 | — | — | stored |

**Totals:** ❌ mismatch 3 · ⚪ unsupported 3

> Expected values are reference data and are never edited to make a check pass.