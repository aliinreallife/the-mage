# Hero balance — evidence-driven pass

## Method

- **Harness:** deterministic Node simulation, fixed 60 Hz steps, identical kiting bot and
  fusion-focus choices for every run (`scripts/sim-lib.ts`, `scripts/matrix-runner.ts`).
- **Grid:** 4 heroes × 3 difficulties × 2 strategies (naive / fusion-focused) × **10 seeds
  (11–20)** = **240 baseline + 240 final** runs, identical seeds and strategies.
- **Baseline:** the pre-change source was snapshotted before edits and bundled separately
  (`docs/evidence/heroes.before.ts`, `engine.before.ts`).
- **Not human play, not Android hardware.**

## Exact results (240 vs 240)

| Metric | Before | After |
| --- | --- | --- |
| Victories | 78/240 (33%) | **104/240 (43%)** |
| Early deaths before wave 1 | 24 | **17** |
| Runs with ≥1 fusion | 200 (83%) | **216 (90%)** |
| Mean survival | 826 s | **920 s** |
| Median survival | 1170 s | **1200 s** |
| Mean level | 70.9 | **81.2** |
| Boss phase 2 reached | 106 | **124** |
| Mean boss fight | 30.9 s | **27.4 s** |
| Telegraphed attacks observed | 2,792 | **2,925** |

### By hero

| Hero | Before | After | Early deaths | Fusion runs |
| --- | --- | --- | --- | --- |
| Farzan | 33/60 (55%) | 31/60 (52%) | 3 → 2 | 95% → 93% |
| Azar | 10/60 (17%) | 21/60 (35%) | 11 → 4 | 78% → 90% |
| Bahman | 14/60 (23%) | 31/60 (52%) | 6 → 7 | 80% → 97% |
| Tishtar | 21/60 (35%) | 21/60 (35%) | 4 → 4 | 80% → 80% |

Hero spread narrowed from **17–55%** to **35–52%**. Tishtar was left untouched because the
evidence showed no defect; Farzan’s XP snowball was trimmed, not his bolt identity.

### By difficulty (ordering preserved)

| Difficulty | Before | After | Early deaths | Mean survival |
| --- | --- | --- | --- | --- |
| Normal | 50/80 (63%) | 60/80 (75%) | 0 → 0 | 1108 → 1158 s |
| Adaptive | 20/80 (25%) | 30/80 (38%) | 4 → 5 | 798 → 887 s |
| Brutal | 8/80 (10%) | 14/80 (18%) | 20 → 12 | 571 → 716 s |

### Hero × difficulty (wins of 20; before → after)

| Hero | Normal | Adaptive | Brutal |
| --- | --- | --- | --- |
| Farzan | 14→14 | 11→11 | 6→6 |
| Azar | 9→13 | 1→4 | 0→4 |
| Bahman | 10→19 | 3→9 | 1→3 |
| Tishtar | 14→14 | 6→6 | 1→1 |

### Strategy and fusions

| Strategy | Before | After | Fusion runs |
| --- | --- | --- | --- |
| Naive | 38/120 (32%) | 57/120 (48%) | 82 → 96 |
| Fusion-focused | 40/120 (33%) | 47/120 (39%) | 118 → 120 |

All recipes remain obtainable: Polymorph 57→57, Fireworks 49→55, Heavy Shot 58→68,
Maelstrom 119→137. Fusion prerequisites are unchanged (`talents.ts` before/after SHA-256 are
identical: `71a633f…`), and no recipe is free.

## First five minutes (naive, all difficulties, seed 11; illustrative single seed)

| Hero | Alive at 5m | DPS | Damage taken | Gems | Level | Distance | Enemies <120 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Farzan | 3/3 → 3/3 | 276 → 174 | 10 → 40 | 1444 → 1015 | 28.0 → 21.3 | 41663 → 37110 | 0.81 → 1.54 |
| Azar | 2/3 → 3/3 | 186 → 238 | 98 → 49 | 932 → 1326 | 21.3 → 28.3 | 34692 → 37559 | 2.50 → 1.15 |
| Bahman | 3/3 → 3/3 | 134 → 332 | 64 → 39 | 980 → 1710 | 22.0 → 29.0 | 31651 → 32210 | 1.77 → 0.97 |
| Tishtar | 3/3 → 3/3 | 227 → 227 | 121 → 121 | 1317 → 1317 | 30.3 → 30.3 | 40339 → 40339 | 1.17 → 1.17 |

The Azar change is visible in the early game: in the same Brutal seed he previously died at
279 s at level 9; with the final tuning he survives past five minutes. Across the three
difficulties his early DPS rises 186→238, damage taken falls 98→49 and mana collection rises
932→1326, with the same single-seed caveat. Bahman also clears much faster (134→332 DPS) but
his survivability was tempered so he does not dominate Brutal. Farzan’s level edge shrinks
as intended.

## Why the changes were made (and what changed)

1. **Bahman’s passive was inactive early.** The engine only applied the “frozen” bonus at
   ≥35% slow, but rank-one frost is a 25% slow. Added a data-driven `frozenAnySlow` flag so
   Bahman’s cold identity works from rank 1; raised his HP by 30 (not 45 — iteration 1
   overshot to 57% wins, so it was tempered) and gave 3% damage reduction plus 20% frost
   radius. Result: 23% → 52%, without dominating Brutal.
2. **Azar had the slowest, smallest early nuke.** A 2.4 s fireball with 58 radius was the
   lowest reliable output. Fire now gets +55% damage, +35% radius, −22% cooldown and a small
   +6% global magic floor so focused builds that branch away from fire are not punished.
   Result: 17% → 35%, early deaths 11 → 4.
3. **Farzan compounded two advantages** (bolt damage + 8% XP), reaching mean level 89 and
   55% wins. XP bonus reduced to 5%; bolt remains +20%. Result: 55% → 52%, still the
   straightforward beginner hero.
4. **Tishtar unchanged** (35% before and after); the evidence did not support a change.

An intermediate full matrix (240 runs) with the first version of the changes is preserved in
`docs/balance/iteration1/` for comparison. The final tuning is in `docs/balance/after/`.

## Remaining issues

- Bahman and Farzan sit at 52%, Azar and Tishtar at 35%. This is within a reasonable band for
  a bot, but not proven for humans; a playtest is required.
- Adaptive early deaths rose 4→5; Brutal early deaths fell 20→12 but Bahman still contributes
  5 of them.
- Fusion-focused builds consistently underperform naive builds (39% vs 48% wins). This is a
  build-strategy tradeoff, not a prerequisite failure; all recipes still form in 100% of
  focused runs.
- Physical Android validation remains pending.

## Intermediate iteration (transparency)

A first 240-run iteration with an earlier version of the fixes (`docs/balance/iteration1/`)
reached **103 wins**, but overshot Bahman to **34/60 (57%)** while Azar was still **17/60 (28%)**.
The final tuning above tempered Bahman (HP +30, −3% damage taken) and strengthened Azar’s fire
(+55% damage, +35% radius, −22% cooldown, +6% global) to reach the final 35–52% spread.
