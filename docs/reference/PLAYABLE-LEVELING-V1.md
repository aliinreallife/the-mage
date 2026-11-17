# Reference-Accurate Leveling v1 — experimental playable bridge

**Status (2026-11-17): DEV ONLY.** Static-code-derived Magic Survival 0.9941 events are integrated into the existing playable Game behind explicit opt-in. The shipped game, its XP curve, normal save schema and Android APK **remain unchanged**.

## What actually changed

- `src/game/reference/playable-leveling-v1.ts` owns a per-run session built on the existing 129 source-indexed mana rows, `leveling-kernel.ts`, and `lifecycle-state.ts`.
- In a dev run, each collected gem is delivered as one explicit gain invocation. No `while (xp >= xpNeed)` loop runs in this mode: one call can consume at most one threshold. Other orbs are deferred to later frames.
- Invalidated talent/fusion cards now leave both the pending session and the level-up UI intact; duplicate clicks cannot accept an additional level. Successful cards alone advance the phase.
- A developer-only `Game.devReferenceSourceGainV1(input)` pathway now evaluates exact finite input parameters through the audited item/enemy source-gain function before delivering one ManaGain event. Its inputs must be explicitly supplied; no native item/enemy values have been mapped onto actual The Mage gems or enemies.
- The Game queues the existing card interface **without incrementing primary level**. After a successful choice, the session emits the evidenced `gate_on → accept_ordinary → mode2_refresh` sequence and updates level, remaining stock and settled cost. The normal spell/passive/talent/fusion cards still apply their original **The Mage** effects and are **not** reference-accurate content.
- Surplus mana does **not** automatically trigger `ManaGain(0)` after the choice. Native coroutine timing remains unknown; a developer must explicitly call this event.
- An isolated source save-mana restore-block implementation is testable. This is **not** integrated with The Mage's v2 checkpoint and does not claim complete native resume.
- A reference run cannot write or restore a normal checkpoint, settle gold, record run history or delete a normal run's checkpoint. UI preferences are still ordinary app settings.

## Enable on a local development server

Run `npm ci && npm run dev`, then open:

```
http://localhost:5173/?ref-leveling&limitRatio=0.0035
```

The numeric `limitRatio` above is an **explicit fixture input**, NOT an evidenced native default. Supply a different finite nonnegative value when testing a researched case. Missing or invalid values are refused with a console warning and the regular mode remains active.

`?ref-leveling` cannot enable this feature in production or the Android packaged production build. `?ref` is a separate legacy reference-data importing path and should not be combined with this experiment.

For a deterministic non-UI sequence, tests call:

```ts
const g = new Game(() => {}, 1234);
g.enableReferenceLevelingV1({ limitRatio: 0.0035 });
g.devReferenceManaGainV1(500); // first threshold only; level remains 1
g.applyChoice({ id: "heal", next: 1 }); // level becomes 2, 400 stock remains
g.devReferenceManaGainV1(0); // explicitly process one remaining threshold
```

Run `npx vitest run tests/reference-playable-leveling-v1.test.ts`.

## Validation and limitations

This milestone validates the bridge between source-derived numerical functions and our actual Game card acceptance path. It does **not** establish end-to-end native parity, real timing, drop values, source ability pools, source-specific item/enemy gain multipliers, bonus-level choice eligibility, chest/boon mechanics, special/return queue wiring, or player save serialization.

- `got * xpMul * phaseBonus` is **The Mage's legacy input calculation**, not an extracted Magic Survival `ManaGain` source formula; more research is required to replace it.
- The current game only has its preexisting card pool. On reaching primary cap, additional-level arithmetic is covered by isolated session tests, but playable additional-level content and UI are not validated.
- A regular checkpoint lacks the reference `level_add`, queue, requirement, flags and ratio. Never silently reinterpret existing saves as a reference save.
- No automatic surplus-drain scheduling is invented. Need native runtime trace or complete call-chain evidence for the Unity gain/regen and post-choice lifecycle.
- Device behavior and source-game gameplay parity require separate live validation.

Once the remaining source lifecycle scheduling and input formula evidence arrives, extend this same boundary (with new fixtures), then gate progression promotion behind comparison tests and a save migration plan. Do not globally flip production `setProgressionTable()`.
