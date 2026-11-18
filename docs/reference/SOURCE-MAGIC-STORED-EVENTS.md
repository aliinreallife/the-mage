# Native stored magic-event stream — source crosscheck and read-only replay

**Magic Survival 0.9941 | source status: CONFIRMED_STORED, native effect operations: CONFIRMED_STATIC_CODE | runtime parity: NOT ESTABLISHED.**

This document is a continuation of [SOURCE-MAGIC-NUMERIC.md](SOURCE-MAGIC-NUMERIC.md); it is the verified next step toward Magic Bolt replay and **does not change the playable attack pipeline**.

## Source evidence

- `04-magic-and-combinations.json` → `datasets["research/analysis/mechanics/magic-stats.json"].data.magics[].per_level_effects` and `.effect_cells`.
- `13-research-test-fixtures.json` → `datasets["research/parity-tests/magic_levels.json"].data.cases[].levels`. The original fixture's `meta.status` is `CONFIRMED_STORED`; it is not a runtime gameplay schedule.
- `06-effect-bindings-and-dispatch.json` → `datasets["research/analysis/mechanics/effect-id-native-map.json"].data.bindings` and `.operation_semantics`; the companion code translates effect IDs into variables/operations.

## What is now executable

`src/game/reference/source-magic-stored-events.ts` crosschecks the **126 non-placeholder events across 21 source magics** against the 189 raw stored cells. It preserves each entry's `ordinal`, `rawSlot`, `effectId`, `value`, native operation, and target `AllyUnitVar_*`.

Checks: complete canonical SHA-256 of the 21 source event rows:
`7357b8a716302f176b7342d8172579dd08ca2e1beb07d9f811488b31eced0dfa`.

### Magic Bolt exact stored projection

| Event ordinal (source list) | Raw table slot | ID | Stored effect |
| ---: | ---: | ---: | --- |
| 1 | 1 | −1 | `magicLevel[1] += 1` |
| 2 | 2 | 153 | `AllyUnitVar_MagicBulletNum += 1` |
| 3 | 3 | 151 | `AllyUnitVar_MagicBulletDamageRatioU += 50` |
| 4 | 5 | 153 | `AllyUnitVar_MagicBulletNum += 1` |
| 5 | 6 | 151 | `AllyUnitVar_MagicBulletDamageRatioU += 50` |
| 6 | 8 | 151 | `AllyUnitVar_MagicBulletDamageRatioU += 50` |
| 7 | 9 | 158 | `AllyUnitVar_MagicBulletPSpeedRatioU *= (100 − 5)/100` |

The raw slot **4** and **7** have `(effectId=1,value=0)` and are **no-effect** entries; neither can be treated as an additional upgrade.

The replay API requires **caller-supplied starting values**. A deliberately chosen *test fixture*, not a claim about native initial state:

```ts
const result = replaySourceMagicStoredEvents(1, 7, {
  magicLevel: 0,
  statValues: {
    AllyUnitVar_MagicBulletNum: 1,
    AllyUnitVar_MagicBulletDamageRatioU: 0,
    AllyUnitVar_MagicBulletPSpeedRatioU: 100,
  },
});
// Explicit-input result: magicLevel=1, Num=3, DamageRatioU=150, PSpeedRatioU=95.
```

**Crucial boundary:** `per_level_effects[].level` is an extracted **effective-event ordinal**, **NOT a verified game UI level/rank**. Source Fireball contains **8** non-placeholder effects with stored `max_level=7`; source Shield has **2** stored effects with `max_level=5`. Assigning these to chronological levels would be unjustified. `-1` changes Magic Bolt's level once in the shown event stream; this does not model how the native game upgrades it to level 7.

`Game.devReferenceStoredMagicReplayV1(magicId, throughOrdinal, state)` exposes the pure replay only when the opted-in reference session exists. Missing `AllyUnitVar_*` inputs cause a hard error rather than implicit zeros; values and state are not applied to the live engine.

## What remains before real combat parity

1. Recover the exact source **ability UI choice → rank/trait → effect-event dispatch** conditions and timing.
2. Recover `StartInformation_A` / variable reset and **reapplication order** so initial `AllyUnitVar` values can be proved rather than chosen.
3. The **generic** `BulletAttack → OnCollisionEnter → EnemyUnit.Unit_Damage` argument-transfer path is now covered by `src/game/reference/source-bullet-transfer.ts` and `tests/reference-bullet-transfer.test.ts`: original/current attack fields, crit arguments, direct-hit zeroed specials, explosion original damage and piercing. The remaining task is to trace Magic Bolt's **individual `Bullet_Create` caller, derived `UnitApply_Attack`, modifier reset/reapplication and the enemy-side damage formula**. The six currently recovered magic-specific create sites in `08-combat-and-projectiles.json` still exclude Magic Bolt. Never fabricate one.
4. Build deterministic replay fixtures from recovered native behavior and compare the entire output, then authorize an experimental live combat switch.
5. Keep saved games and stable Android preview untouched until this boundary passes.

## Tests and code

`tests/reference-stored-magic-events.test.ts` validates the complete 126-entry SHA-256, raw slots, mismatch between event ordinals and rank caps, prefix replay, exact Magic Bolt operator outputs, rejection of missing inputs, dev-only isolation, and no game-state mutation.

The standard project CI and Android debug workflows continue to run on PR #16; passing these tests means **static source table/operator parity**, never native-runtime parity.

## Bullet-to-enemy argument boundary added (2026-11-17)

The pure `recordNativeBulletAttack` function copies the explicit `EUnitApply_Attack` to both `UnitApply_FirstAttack` and `UnitApply_Attack`, preserving the original/current split. `nativeBulletMainDamageArgs` forwards current attack; `nativeExplosionDamageArgs` forwards the **original** attack; `nativeBulletDirectDamageArgs` forwards the separately provided positive direct-attack field with zeroed specials. `nativeBulletDestroyedAfterHit` applies the native `++hitCount > pierceNum` comparison. These are source-confirmed parameter *transfers*, not numerical final-damage computations, not projectile movement/spawn reconstruction, and not gameplay changes. Provenance: `08-combat-and-projectiles.json` `bullet-spawn.json` and `damage-pipeline.json`.
