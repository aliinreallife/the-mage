# Magic Survival 0.9941 — statically verified mana/level kernel

**Source:** independently verified user-provided `magic-survival-0.9941-leveling-mana.zip`, SHA-256 `97850f543a4ad10a2cc8a887e044818a253c84e81327a15c7c170eb8286fbb03` (41,739 bytes). ZIP integrity passed, all **24** `SHA256SUMS` entries passed, and its `verify.py` passed **48 numeric kernel fixtures**. A separately authored TypeScript implementation also matched all **48** fixture outputs. The source research reports 2,607 earlier checks, not rerun in this PR. **Zero live-native game runtime observations were made.** This is static-code evidence and bounded model parity, not executed-game parity.

## Code-supported rules

- `V_Ability_Manager.ManaGain` at **0x10fc64c** reads stored `Dictionary_AllStat` column `마나 요구량` (mana requirement) with the **current** level L, not L+1. ManaGain primary lookup clamps L to **1–100**; the unshifted table still stores level **0 → 0**.
- One `ManaGain(g)` call adds float32 gain and, if live, below both applied caps, above threshold and not blocked by the artifact canvas, subtracts the **old** requirement exactly **once**, keeps the remainder, refreshes a transient requirement and queues a single ability-choice event. It **does not** increment the level or drain all remaining mana.
- Normal ability-choice acceptance occurs separately in `X_Select_Ability.Button_SelectAbility` **0x1142e48**, then `End_Ability` **0x1110c74** invokes `AbilityStatApply(mode2)` **0x1103210** to refresh the **settled** requirement. This primary refresh is not clamped to index 100. Choice effects/max bonuses may intervene.
- Additional-level requirement index: `100 + clamp(round_even(f32(A × 0.5)), 0, 10)`. Applied maxima are reset bases **100 primary** and **50 additional**, plus ties-to-even-rounded bonuses, not a fixed 129-level cap. When both applied maxima are reached, no new mana is added.
- Float32 arithmetic applies to gain, stock, cost and obtain-limit multiplication. Native nearest-even conversion **must not** use JavaScript `Math.round`.
- Source-specific gains differ: item gains do **not** receive a universal obtain-limit cap; the traced enemy-death path applies a **per-source** `ManaObtainLimit` clamp. Regen, World Tree and Obelisk have distinct call paths; `ManaGain` does not clamp all gains.
- `Button_AbilityExit` **0x1110c7c** has a separate repayment path that may consume at most one threshold and increment the queued-choice count. It is not ordinary choice acceptance.

## Implemented in this PR

- `src/game/reference/leveling-kernel.ts`: pure, development-side functions for one-shot gain, settled cost refresh, additional-level index, applied maxima, exit repayment, item/enemy gains. **No change** to production game logic, UI, current saves, XP thresholds, or level-up timing.
- `tests/fixtures/leveling-0.9941.ts`: all 48 native-derived finite-input cases represented as readable typed vectors. Each output was cross-checked against the portable Python source, with evidence address ranges and original ZIP checksum recorded; no proprietary native code/media committed.
- `tests/reference-leveling-kernel.test.ts`: all 48 cases plus source-derived L1 → L2 → L3 large-gain sequence, ties-even and additional key boundaries, missing-row rejection, and current-playable-mode isolation.

## Limits and next steps

1. **Scheduling remains unverified.** Normal choice acceptance does not itself drain mana surplus; a separate eligible `ManaGain(0)` can do so. Whether UI/coroutines call it automatically after acceptance requires targeted runtime observation.
2. Native resume code at **0x10f1398–0x10f141c** **clamps restored** stock to `max(0,min(stock,cost-1))`. That is different from the normal in-run stock carryover. Do not remove The Mage's checkpoint clamp based solely on the gain path; verify full resume state and refreshed cost first.
3. The initial start modes, choice and exit-button flags, transient sentinel costs, level-cap transitions, and modifier-reapplication ordering require separate tests.
4. Source research fixtures exercise finite bounded kernels only; NaN/Inf, overflow, full probability distributions, native runtime observations, and end-to-end UI state machine remain outside scope.
5. Once lifecycle/scheduling is confirmed, replace The Mage's custom quadratic XP curve and eager multi-level `while` loop with the source-accurate choice-driven state machine, preserving saves and Persian UI.

**This is a reference-integration milestone, not production parity.** The end goal remains faithful default gameplay with original Persian/Iranian presentation.
