# Magic Survival 0.9941 — leveling lifecycle evidence (2026-11-14)

Source: `magic-survival-0.9941-leveling-lifecycle.zip` (60,135 bytes).
SHA-256: `df08990efe3c715f0f98f60f6c700e5f9231843b12800f7f52ad625bee3cc661`.

The provided ZIP passed integrity verification and its 39 internal checksum entries matched. The bundled Python verifier passed 13 explicit sequences / 58 transitions. An independently written TypeScript adapter also passed all 58, with the same input-event ordering and output states. The external research workspace reports 2,607 other checks passing; those are **not** rerun by this integration.

**Evidence is STATIC_CODE + DERIVED_SEQUENCE; no native runtime execution or full gameplay parity is claimed.**

## What the pure reference model represents

- `First_Fade_IN.MoveNext` at 0x10ef944 calls Start_Ability. A fresh mode-1 tail assigns a nearest-even-rounded initial ability queue; resume mode-1 displays saved cost/stock without performing the mode-2 lookup in that tail.
- Restored valid positive-cost saves clamp stock below saved cost. A later battle-start path may recompute additional levels from 9 magic-level entries. A full-cap branch writes float32(1e11) requirement and zero mana stock.
- Delayed `First_Fade_IN_Add` at 0x10f2f0c dequeues one queued ability selection after a scaled 0.15-second delay, without consuming mana.
- A gain call consumes at most one requirement; ordinary choice acceptance increments the primary or additional level; `End_Ability → AbilityStatApply(mode2)` refreshes the cost/limit using the new level.
- During the Ability-scene queue tail, positive queues are consumed one at a time in order **level > random > special**. Queuing an ability does not itself consume a mana threshold.
- The separate exit path may repay mana, update a return counter, queue one more choice and invoke mode2. Known ratio writes are 1, 0.5, and float32(0.2) for counts 0, 1, and 2; the traced block makes no new ratio write for greater counts.
- Regeneration at 0x107d444 forwards its mana gain without a positivity gate. The existence of a possible `ManaGain(0)` call **does not prove** automatic surplus drainage or precise scheduling after accepting an ability.

These functions are pure and are not wired into the production Game. The fixtures use a **synthetic** pending-kind label for clarity. It is not a native flag; phase labels are not the original game's enums.

## Automated checks

- 13 complete explicit multi-event scenarios / 58 individual transitions, including large gain with **explicit** zero-gain calls, artifact gate, fresh startup, restore clamping, saved requirement preserved at mode1, bonus-level reconstruction, full caps, selection exit, repayment ratio, and queue priority.
- Additional tests reject invalid acceptance and malformed save costs, prove no implicit gain is scheduled, and preserve the existing playable game's progression.
- The independently authored TypeScript translation passed 58/58 before committing; GitHub CI validates the committed implementation.

Original fixture JSON SHA-256: `fa595167fe35ef78dc70032968c5d6c3d8c143d36b2ac712a4060bf4c99d87ff`.
The test data is encoded as human-reviewable **state deltas**; applying each delta to the preceding expected state reproduces the full source expectation. No original APK, proprietary media, full native disassembly, or confidential files were committed.

## Unresolved — do not fill with guesses

- Exact Unity frame/coroutine scheduling and whether post-acceptance regen automatically re-enters ManaGain(0), including pause behavior and per-source rates.
- Full startup/resume side effects, final on-device flags and save encoding; the reference is valid-cost-only and partial.
- Complete ability-choice pools, RNG, special/class6/ultimate gating, external mutations and full maximum-level behavior.
- Native-executed confirmation. The tests establish a bounded model aligned with static evidence, **not live runtime parity**.

## Combat investigation lead (not implemented)

The new handoff also reports that AbilityStatApply resets attack scalar fields before later additive accumulation: 0x1104834–0x11048dc resets AttackNum/AttackRatioU/AttackRatioD to zero, 0xa04/0xa08 to one, ManaRepayNum to 20. Later dispatch at 0x11099e8–0x1109a5c adds attack modifiers. Mode2 calls C_Battle_AllyUnit.StartInformation_A at 0x110fed8. Full modifier ordering, UnitApply_* consumers, special IDs 911/914, projectile argument lanes and complete damage formula remain open.

**Next gate:** targeted reference-game runtime tracing or complete call-chain evidence for post-choice gain scheduling, then coherent playable Game choice/checkpoint integration. Do not switch the production XP curve or remove its checkpoint clamp based on the isolated model.
