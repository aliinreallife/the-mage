# آخرین افسونگر — Human QA checklist (Android release candidate)

Device: ____________  Android version: ______  Browser/Chrome: ______  Screen: ______
Network: Wi-Fi / 4G / airplane   Tester: ____________  Date: ________
Mark each line **PASS / FAIL / BLOCKED** and add notes. Physical-device runs only.

## 0. Install and launch (10 min)
- [ ] Open the HTTPS staging URL in Chrome; no security warning.
- [ ] Page is Persian and right-to-left; title «آخرین افسونگر» is visible without scrolling.
- [ ] Menu → **Install app** is offered; icon uses the gold star emblem.
- [ ] Launch from the home-screen icon; it opens fullscreen portrait (no browser bars).
- [ ] First launch online completes loading; no console crash, no blank canvas.
- [ ] Enable airplane mode and relaunch: game still starts from cache.
- [ ] Delete the app from the home screen and reinstall: still works.

## 1. Touch and layout (15 min)
- [ ] 360×800 device: nothing overflows horizontally; every bottom button is reachable.
- [ ] 393×873 or larger: same checks.
- [ ] Notch/gesture area: level bar, mute/pause and ultimate button are not obscured.
- [ ] Drag anywhere on the field: the joystick appears under the thumb and the sorcerer
      moves in that direction; releasing stops movement.
- [ ] Multi-touch: move with one thumb, tap pause/ultimate with the other.
- [ ] While dragging, the page does not scroll, zoom, select text or show a context menu.
- [ ] Ultimate button: disabled while charging, glowing at 100%, casts on tap.
- [ ] Pause (button and Esc if keyboard available): «ادامه» is visible without scrolling.

## 2. Four heroes (20 min — one short run each)
For each hero, confirm the starting spell, portrait colours, passive description and feel:

| Hero | Starting spell to observe | Identity to feel | PASS |
| --- | --- | --- | --- |
| فرزان | تیر جادویی | reliable ranged bolts, faster leveling | [ ] |
| آذر | گوی آتش | fast, large fireballs with burn | [ ] |
| بهمن | دمِ زمستان | frost aura, slowed enemies take extra damage, hardier | [ ] |
| تیشتر | آذرخش | chain lightning, slightly faster movement | [ ] |

- [ ] All four portraits/passives fit their cards on a small screen.
- [ ] Hero selection persists after closing and reopening the app.
- [ ] No hero starts with another hero's spell.

## 3. Difficulty (20 min)
Play at least one run each; confirm they feel ordered.
- [ ] عادی: forgiving early game, reachable first wave; still can lose later.
- [ ] لبهٔ تیغ: pressure visibly rises when you are strong; pause shows the pressure %.
- [ ] بی‌رحم: early game is dangerous; fewer healing drops; not unfair/unwinnable.
- [ ] Difficulty persists after app restart.
- [ ] Record: hero, difficulty, survival time, level reached, waves cleared, died at ____ s.

## 4. Fusions and talents (25 min)
- [ ] Level-up cards show rarity clearly (عادی / نادر / نفیس / ممتاز / افسانه‌ای).
- [ ] Talent cards appear once a spell reaches level 3; mastery cards at spell level 6.
- [ ] Pause → ساختار افسونگر → **مسیر ترکیب** lists all four recipes with exact spells/talents.
- [ ] «دنبال کردن مسیر» changes the next level-up hand to include one guided step
      (a teal «گامِ ترکیب» card) without granting free levels.
- [ ] Form at least two different fusions across runs:
      چندپیکر، آتش‌بازی، شلیک سنگین، گرداب.
- [ ] The secondary spell is consumed and disappears from the bars.
- [ ] A second Magic Bolt recipe is refused; گرداب can coexist with one Magic Bolt recipe.
- [ ] Fusion effect is visibly different (phantoms / firework bursts / giant arrow / vortex).
- [ ] Fusion slot unlocks at level 25, 50, 75.

## 5. Stage, boss, checkpoint (25 min)
- [ ] «میدان آزمایش» shows the stage clock; waves start at 05:00, 10:00, 15:00, 20:00.
- [ ] Wave objective text matches what happens (kills / chieftains / seconds).
- [ ] Leaving the ring damages you and shows the Persian warning.
- [ ] First three waves each grant a treasure chest and a three-relic choice.
- [ ] Boss: two phases; telegraphed ground/arrow/ring attacks have a visible warning and
      readable countdown; dodge them.
- [ ] Victory screen appears exactly once; defeat screen appears exactly once.
- [ ] Gold is awarded once; research purchase persists after restart.
- [ ] Checkpoint: start a stage, finish wave 1, leave a chest unopened, background the app.
- [ ] Reopen → «ادامهٔ دستِ نیمه‌تمام» is offered; resume near the same position.
- [ ] Walk to the saved chest and open it: relic granted once.
- [ ] Background/force-close/reopen again: claimed chest is gone, reward not duplicated.
- [ ] Old save/discovered artifacts/difficulty/hero survive an update from a previous build.

## 6. Performance, heat and battery (25 min)
Use Chrome remote debugging or the phone's developer tools if available. Record numbers.
- [ ] Normal early game: steady 60 fps on your device (or no visible stutter).
- [ ] Wave with >150 enemies: measure fps; note dips.
- [ ] Boss phase two with projectiles: measure fps.
- [ ] Reduced-effects setting (pause) visibly reduces particles and improves fps on weak phones.
- [ ] Device temperature after 10 minutes: cool / warm / hot. Stop if hot and report.
- [ ] Battery drain estimate over 15 minutes: ____ %.
- [ ] RAM/JS heap from Chrome DevTools (optional): ____ MB.
- [ ] No crash, freeze, audio glitch or runaway memory over a 20-minute session.

## 7. Audio and feedback (10 min)
- [ ] Spell casts, hits, chest fanfare, hurt, level-up and victory sounds play and are distinct.
- [ ] Mute button persists after restart.
- [ ] Sound does not play while the app is backgrounded.
- [ ] Visuals: hit sparks, damage numbers, boss warnings, chest beams, ultimate flash.

## 8. Offline and updates (10 min)
- [ ] While online, reload once so the service worker installs.
- [ ] Airplane mode: cold launch works; checkpoint resume works offline.
- [ ] Return online; deployed update is picked up after a reload/relaunch.
- [ ] Other apps' caches/site data are not deleted by the game's service worker.
- [ ] Installation can be removed cleanly from Android app settings.

## 9. Release blockers to record
- [ ] Any logical error (duplicate reward, missing wave, two victory screens).
- [ ] Any crash / blank screen / unresponsive control.
- [ ] Any blocker on install or offline launch.
- [ ] Any device where critical HUD is hidden by the notch/gesture bar.

**Sign-off:** tester signature ____________  Build SHA-256: ____________  Result: PASS / FAIL
