# Stat & combat architecture audit («آخرین افسونگر»)

Audit of where every damage/stat category is handled today, whether it is data-driven, and
where a verified Magic Survival 0.9941 formula would plug in. **No formula was replaced in
this iteration** — this is the map, not a rewrite.

Machine-readable version: `COMBAT_CATEGORIES` in `src/game/reference/formulas.ts`
(the tests assert that all twelve categories exist with an integration point).

## Where each calculation lives

| # | Category | Handled at | Configurable | Extension point |
|---|---|---|---|---|
| 1 | Base attack | `data.ts → SPELLS[spell][level].dmg` | **data** | `patchSpellLevel(spell, level, {dmg})` |
| 2 | Attack amplification (all-magic attack) | `engine.ts → Game.recalc() → this.dmgMul` | hybrid | `runPipeline(stage='attackAmplify')` |
| 3 | Individual magic damage | `engine.ts → Game.sd()` | **data** | `a.spellDmg` table (artifact/hero/set/talent) |
| 4 | All-magic damage | `engine.ts → Game.recalc() → this.dmgMul` | hybrid | `runPipeline(stage='allMagicDamage')` |
| 5 | Critical chance & damage | `engine.ts → Game.hit()` + `PASSIVE_TUNING` | hybrid | `PASSIVE_TUNING.baseCritChance` / `critMultiplier` |
| 6 | Cooldown modifiers | `engine.ts → Game.recalc() → cdMul`, `Game.scd()` | **data** | `SPELLS[…].cd` + `spellCd` table |
| 7 | Projectile count | `engine.ts → Game.sc()` | **data** | `SPELLS[…].count` + `spellCount` table |
| 8 | Magic size & duration | `Game.scr()/sr()`; shot `life` per kind | hybrid | radius/size fields exist; **durations are engine constants** |
| 9 | Hit frequency | spell timers; `BURN_TICK` / `BURN_FRACTION` | hybrid | row `cd` (data); burn tick hardcoded |
| 10 | Enemy resistance / damage taken | `Game.hurtPlayer()` flat armor; artifact `taken` | hybrid | armor formula hardcoded; sources are data |
| 11 | Enemy max-HP modifiers | `Game.addEnemy()` `hpMul` chain | hybrid | `patchEnemyBase()` for base; **curve formula hardcoded until verified** |
| 12 | Conditional effects (artifacts, talents, fusions) | `addMods()`, `updateSpells()` talent branches, fusion `fx` flags | hybrid | mods are data; **talent/fusion behaviour is code** |

## Stacking semantics today

1. **attackAmplify / allMagicDamage**: additive sources are summed into `dmg`, then applied
   multiplicatively: `dmgMul = (1 + Σpassive) × (1 + Σartifact) × hero × research`.
2. **Critical**: flat multiplier on top of `dmgMul` (`×1.7`).
3. **Per-spell damage**: `base × (1 + Σ spellDmg[spell])`, then `× dmgMul`.
4. **Cooldowns**: additive `Σ` of −% sources, applied as one multiplier (Fast Casting,
   artifact `cd`, mastery `cd`).
5. **Conditionals** (frozen, aged, snipe range) multiply after the crit decision.

Reference-mode ordering/stacking can be expressed in
`runPipeline(ops)` (`src/game/reference/formulas.ts`): stages run in
`PIPELINE_ORDER`, multiplicative ops in a stage combine first, then the flat addition.
That pipeline is **pure and unused by the running game** until a reference formula and its
inputs are verified; the current chain in `Game.recalc()`/`Game.hit()` is untouched.

## What is data-driven vs hardcoded

**Data tables (safe to replace with verified rows):**
- `SPELLS` — per-level damage, count, cooldown, radius/size for every spell (`data.ts`).
- `ENEMY` — base hp/speed/damage/radius/xp per enemy type (`engine.ts`).
- `UPGRADES` — level descriptions; `PASSIVE_TUNING` — crit constants.
- `ARTIFACTS` / `SETS` / `HEROES` / `FUSIONS` prerequisites / `PROVING_GROUNDS`.

**Hardcoded behaviour (needs verified reference semantics before any change):**
- the `hpMul` time curve and `diffHp()` difficulty multipliers;
- talent and fusion *effect code* (their prerequisites are data);
- shot lifetimes, burn tick, boss telegraph timings;
- the modifier ordering described above.

## Extension points added (no behaviour change in Current Mode)

| Point | Signature | Refuses |
|---|---|---|
| Progression table | `setProgressionTable(rows \| null)` + `Game.refreshProgression()` | incomplete tables (caller must supply 0–128) |
| Spell row patch | `patchSpellLevel(spell, level, patch)` | unknown spell/level/field — never invents a field |
| Enemy base patch | `patchEnemyBase(type, patch)` | unknown type/field — never invents a stat |
| Modifier pipeline | `runPipeline(ops)` | inactive ops are skipped and reported |

All default to **no-op**: with no reference data installed the shipped numbers are byte-for-byte
the same (locked by `tests/reference.test.ts` → "keeps the shipped progression curve locked").
