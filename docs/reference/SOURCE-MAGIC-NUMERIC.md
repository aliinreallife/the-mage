# Source magic numeric boundary — initializer stores and effect dispatcher

**Game:** Magic Survival 0.9941. **Evidence:** static-code extraction and stored tables, not runtime observation. **Status:** dev reference only; no live combat changes.

## Source data used

1. `04-magic-and-combinations.json` → `datasets["research/analysis/mechanics/magic-stats.json"].data.magics`, from `eng_Dictionary_Ability` plus `C_Battle_AllyUnit.StartInformation_A @ 0x1043fa0`. The 21 magic groups include **131 base fields** and **nine stored effect slots each (189 cells)**.
2. `06-effect-bindings-and-dispatch.json` → `datasets["research/analysis/mechanics/effect-id-native-map.json"].data.bindings` and `.operation_semantics`. Every positive non-no-op effect ID used by these 189 cells has a **CONFIRMED_STATIC_CODE** destination field and operation.
3. `13-research-test-fixtures.json` → `datasets["research/parity-tests/magic_levels.json"].data.cases` for stored rank-event extracts. These are **not identical** to the nine raw cell positions when `(1,0)` gaps exist; do not blindly equate raw slot with elapsed magic rank.
4. `16-supporting-documents-and-evidence.json` → `documents["analysis/mechanics/unknowns.md"].content`, plus `documents["analysis/mechanics/COMBAT-REAPPLICATION-CONTINUATION.md"].content` for known missing runtime scheduling and derived combat values.

## Recovered implementation

- `src/game/reference/source-magic-base.ts`: all **131 initializer stores**, preserving 125 IEEE754 float32 values by their original four bytes and six integer stores. `getSourceMagicBaseParameter(id, field)` returns immutable `UnitBase_*` values, or **null** when absent. SHA256 over the complete compact representation: `5d39650f24a23c057a7767feace3975b72ac373e2fa016f40d80cffd2cd81bc3`.
- `src/game/reference/source-magic-effects.ts`: all **189 raw effect cells**, including `(1,0)` no-ops, and **58 distinct positive effect dispatcher bindings** to `AllyUnitVar_*` fields. SHA256 over raw source slot order: `df5c2c1b021cdec64aef834652e57a01fdd7ca8a425bf9a1d246835a041805d2`.
- `evaluateSourceMagicEffectSlot(magicId, slot, current)` is a **single isolated native-operator evaluation**, requiring caller-supplied current stat. Implemented operations: `add`, `ratio_down`, `ratio_up` (supported semantics though not used by the 58 included effect IDs), `increase_magic_level` on a negative effect ID, and `no_effect`. Uses float32 intermediates. This is *not* a self-initializing stat engine.
- `Game.devReferenceMagicEffectSlotV1` exposes that evaluator only if explicit dev reference mode is active. It never changes local spell levels, HP, projectile counts, combat modifiers, main progression, or saved state.

**Known numeric examples:**

| Source spell | Initializer (UnitBase) | Raw stored effect operation |
| --- | --- | --- |
| Magic Bolt #1 | Damage **5**, projectile number **1**, PSpeed **0.75** | slot 2 → `AllyUnitVar_MagicBulletNum += 1`; slot 3 → damage bonus field `+= 50`; slot 9 → cooldown-ratio field `*= (100−5)/100` |
| Fireball #2 | Damage **7**, number **1**, PSpeed **1.5**, area **100** | slot 3 → fireball damage bonus field `+= 50`; slot 4 → area bonus field `+= 20` |
| Spirit #3 | Damage **6.5**, number **0** | slot 2 → damage bonus field `+= 20` |
| Shield #6 | MaxNum **2 (integer)**, ProductNum **1 (integer)** | slot 2 → shield cooldown-ratio field `*= (100−10)/100` |

The `UnitBase_*` fields and `AllyUnitVar_*` fields are **different namespaces**. Simply adding a percent effect to the raw base damage would be a false reconstruction. The native global damage multiplier, cast scheduler, trait transformations, modifier reset/reapply, and post-stat conversion to bullet hit damage remain distinct tasks.

## Deliberate non-claims and next gate

- The **nine raw effect cells** are stored in sequence, but whether any cell is consumed on a particular UI level/rank requires the separate `per_level_effects` evidence plus verified trait branches; no automatic `rank -> slot` conversion is provided.
- Initial `AllyUnitVar` values are **not** assumed to be zero or 100; caller must supply them.
- No inference of projectile damage, rate, hit ordering, target selection, chain behavior, cooldown reset timing, or Android performance from table stores alone.
- Local Game `SPELLS` and `UPGRADES` still have mismatched numbers and effects; no incomplete source values are silently patched into the local combat system.
- **Next:** recover a source-accurate stat initialization and rank-to-slot/event dispatch sequence for Magic Bolt first, then trace how the native accumulated `AllyUnitVar_*` values feed projectile spawning and hit damage. Only then promote an effect from isolated reference testing into experimental combat.

## Tests

`tests/reference-magic-base.test.ts` covers all 131 byte-encoded fields, integer/float distinction, checksums and selected spell source values.

`tests/reference-magic-effects.test.ts` covers all 189 stored slots, 58 unique confirmed bindings, no-op slots, source operators, invalid inputs, and dev-only isolation.

Run `npx vitest run tests/reference-magic-base.test.ts tests/reference-magic-effects.test.ts` plus normal CI. Never merge this isolated reference phase based only on a green Web/Android build as evidence of runtime parity.

## Next confirmed stored-event milestone (2026-11-17)

[Native stored magic-event stream](SOURCE-MAGIC-STORED-EVENTS.md) now cross-validates **126 non-placeholder per_level_effects across 21 magics** against the 189 raw cells and preserves effective-event ordinal → raw-slot positions. Exact SHA-256 and a read-only replay with explicit caller-supplied source stat values are tested, including Magic Bolt's raw no-op slots 4 and 7. It is **not** a rank-to-event UI scheduler, final damage formula, or a combat engine migration. Fireball's eight event entries vs its stored max rank seven illustrate why that distinction is essential.
