# 0.9941 source ability IDs → The Mage: audited identity boundary

**Status (2026-11-17): source catalog STORED; local correspondence reviewed, partially confirmed; runtime parity NOT claimed. Dev reference experiment only.**

## Canonical source data

The attached handoff file `02-catalog-and-identities.json` dataset
`research/analysis/mechanics/catalog.json` → `reference_layer` is the authority.

| Kind | Stored source rows | Source IDs |
| --- | ---: | --- |
| Magic (active) | 21 | 1–21 |
| Ordinary passive | 10 | 30–39 |
| Special passive | 24 | 301–324 |
| Trait | 66 | see explicit source catalog; 362–544, not contiguous |

`src/game/reference/source-ability-identities.ts` preserves every source ID, English `internal_name`, `max_level`, `required_level`, and for traits `derived_ability_id` as `parentMagicId` (not `trait_id`). This is **121 source records**, not the full game dataset. Raw 0.9941 catalog retained outside the repository remains authoritative; evidence is **stored** rather than runtime-confirmed.

`tests/reference-ability-identities.test.ts` checks all four populations, uniqueness, selected values, and a full-source SHA-256 of the 121 canonical compact identity records:
`0f867baa3680afa0342b716a81fb9c14d0aa9cb037f5d0979a9ddb456488a832`.

Canonical string for hash: source category (singular `special_passive`), source ID, English name, max level, required level, trait parent (0 for non-traits), pipe-separated per row, joined by LF in source `magic → passives → special_passives → traits` order.

## Reviewed correspondences, NOT mechanical parity

Local IDs do NOT equal source IDs. `src/game/reference/local-source-links.ts` is an explicit, auditable overlay, with status:

- `supported_correspondence`: same gameplay role and central ability effect, sometimes different values or level caps; **not an assertion of exact gameplay parity**
- `identity_only`: exact English trait name and source parent spell align, but **the actual effect is substantially different** in The Mage
- `analogy_only`: related gameplay role, but major numerical discrepancies, never used to enforce source rules
- Missing record: **unmapped**; no automatic pairing, no placeholder source ID

Current supported correspondence: 8 active magics (Bolt→1, Fireball→2, Spirit→3, Satellite→4, Thunderstorm→7, Meteor→10, Cyclone→12, Arcane Ray→18) and 4 local passives (Intelligence→31, Fast Casting→32, Vitality→33, Snipe→37). **This does not assert same full behavior.**

Two explicit analogies: local `swift` vs source Haste (source +10% movement/2 ranks, local +8%/5 ranks); local `magnet` vs source Explorer (source +33% pickup range/3 ranks, local +30%/5 ranks).

Five name-and-parent matches that **fail effect parity**:

| Local talent | Source | Confirmed difference |
| --- | --- | --- |
| `arrow` | Magic Arrow #362 | Native pierces all, damage ×1.5, size +180%; local pierces 2 extra and boosts damage 40% |
| `doppel` | Doppelganger #367 | Native replaces bolts with 3 mirage casters and +50% cooldown; local adds bolt/reduces cooldown |
| `missile` | Magic Missile #380 | Native Spirit cooldown/interval change; local explosion and another spirit |
| `antigrav` | Anti-Gravity #389 | Native oscillating Satellite rotation speed up to ×3; local knockback/increased radius |
| `void` | Void #463 | Native stationary Cyclones at random positions; local pulls enemies inward |

**False matches that remain unlinked:** source Shield #6 is **active magic**, while local shield is **passive**; source Flare #499 belongs to **Energy Bolt #16**, but local `flare` talent is attached to `energy` which corresponds to **Arcane Ray #18**; source Wipeout #542 belongs to **Flash Shock #21**, whereas local `flash` is closer to Thunderstorm #7. The local zap/chain mechanics, wisdom, regen and other names cannot be silently mapped.

The source's original **combination** data is a distinct table; none of The Mage's four local fusions is source-certified here.

## One actual, bounded gameplay integration

Within `?ref-leveling&limitRatio=0.0035` **dev-only mode**, `Game.rollChoices` now filters **only** the four audited local passives `might`, `haste`, `vital`, `snipe` at current **source level 1–3**. This projects the verified native early exclusion of source IDs 31–39 through their supported local correspondence.

- Normal/prod runs are unchanged.
- Source-analogous `swift` and `magnet` are **not** filtered: their link is not strong enough to assert source identity/eligibility.
- Source identity-only traits are likewise not silently changed.
- This remains a **partial restriction**, NOT the complete source offer generator. Other local cards and choices, weights, guarantees, and local fusion recipes still behave like The Mage.

## Work required for actual parity

1. Recover and validate **complete ordinary pool construction**, required rank/trait gating, source draw weighting, and reroll scheduling.
2. Recover source traits' full rank/effect blocks, implement the exact mutations in a separate audited runtime path, and verify with fixtures.
3. Establish missing source relationships for all currently unmapped local abilities or replace non-matching local data, without guessing.
4. Integrate special passives (24 stored identities alone do not establish native choice timing).
5. Keep physical Android benchmarks, saves, lifecycle timing, and native parity gates separate.

Do not claim any of those five are done; do not merge into production until validated.
