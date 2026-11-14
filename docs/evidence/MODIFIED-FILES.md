# Modified files — this balancing pass

Workspace: `/home/user/sandbox` — the only workspace present. The previous export ZIP
(`the-mage (6).zip`) is **not present** in this workspace, so it cannot be byte-compared here.
A pre-change snapshot of this workspace was preserved before edits (77 files; see
`docs/evidence/baseline-source-manifest.sha256`). The tables below compare that snapshot with
the final source, which is the strongest available proof that files changed.

## Source changes (actual differs/new, excluding docs/evidence)

| File | Status | Before SHA-256 | After SHA-256 | Reason |
| --- | --- | --- | --- | --- |
| `public/sw.js` | modified | `4901a49d736313c827666defcb6d6bc5f5147923601f88c037f8bb436ecb3610` | `c16f87f39876b5c9709db772dbf426678260bc702d5be816973343ee4933813f` | Cache afsungar-v6; activation deletes only afsungar-* caches |
| `scripts/browser-smoke.mjs` | modified | `11ad2a39481ee92920e79092f20f1e57327ae8c0747590216c6c5ef1625da929` | `2f43163daa4e370d4722e5b8a0d4cf0c51f04d0adf240784cbfab411b0852b13` | Browser QA: cache isolation, touch displacement, resume position |
| `src/game/engine.ts` | modified | `6de57c7e785a2957779c59a503df4bc208b10abc6f2500faeb3b2d09b7443572` | `54896ee262955c0f625542601a97243ea15a55ac18aa6480270da0e13fc37f02` | Fold new hero stats into addMods; Bahman's cold bonus on mild slows |
| `src/game/heroes.ts` | modified | `ab4ecd722de2265ca3030c75aaf49360d83bd0a0390999097b11870879bef60c` | `b2f18b36ae337518447640aa04a87b6745eeefea1635a29f44b7894b0b713d7c` | Hero rebalance: Azar/Bahman buffs, Farzan XP trim; new taken/spellCd/frozenAnySlow fields |
| `package.json` | modified | `5f45caf2abec6f828e850b741e79e03064b82e208d10cd62a5adb95804ba8575` | `09938a3e4efe373b08ba027e1d3510c8dca0456d961daa3e79d742d1de15f3e5` | `package`, `check:jsonl` and strict `verify` scripts |
| `tests/pwa.test.ts` | modified | `c6250ddc9da8fb74fde317351248f424efa294b0dd6025071be928a93948ec2c` | `395e211df065d90ee45f5ed31748a693de1a1bc94a686fa37594d206dbb54570` | Cache-isolation regression tests |
| `tests/heroes.test.ts` | new | — | `55fe28da13494412fcaf41ec39013062ebad4d4281ca9968d2f6dc66a1afd846` | Hero identity and passive regression tests |
| `tests/reports.test.ts` | new | — | `9a1b1b1fdfe3b46746665a4b34237e3139a88cf3b9ef8bad965a8b09871abe07` | JSONL validity and 240-run coverage tests |
| `scripts/sim-lib.ts` | new | — | `0f6206bffb816d0a0f4ee74c08bf795b90f9d757f1b74844b4b561c36aa69990` | Deterministic simulation harness shared before/after |
| `scripts/matrix-runner.ts` | new | — | `093604774530a576df78648e93239445fa133887de5d0ed3cda1ed744f7d472e` | Pure-JSONL 24-run seed runner |
| `scripts/five-minute.ts` | new | — | `9591dc1d167a706b916ecbd23cfd6af75dc7f9af41e20e02fc42baf3e1fc1320` | First-five-minute diagnostics |
| `scripts/balance-compare.mjs` | new | — | `9aa5d2c6eef132eedff9e3d157d3430859f4fea8b27e85766d5b523194058917` | Paired before/after report generator |
| `scripts/check-jsonl.mjs` | new | — | `1fd3657cf140414629f04d8ab20652de186a14d060208737f966ab8703c0a98d` | Strict JSONL validator |
| `scripts/package.mjs` | new | — | `1df002c07ec3cffa06d6eec97956c15ae51b8d93b2950c1f6d3dcee11be6ca4b` | Packaging gate: icons/screenshots/logs/JSONL required |
| `public/icons/icon-192.png` | new | — | `719ce79b98b4f2a048172942a3d86813681990cc9e480b80a4f3453d59aad294` | Generated launcher icon included in both ZIPs |
| `public/icons/icon-512.png` | new | — | `34d8f8aaf700aa309c18ed94fd4a205dda3891a5fcc118a5112d9b9f768f2da9` | Generated launcher icon included in both ZIPs |
| `public/icons/icon-maskable-512.png` | new | — | `e2dabd4c5d45aa5e44ccfe2e353f08600463f8150b92c227375daf9afcbc9c99` | Generated launcher icon included in both ZIPs |

Fusion prerequisites are untouched: `src/game/talents.ts` before/after SHA-256 are both
`71a633f236ec83d9c788efbc31433f0bf7332ab6e476707faad473a8510bfb29` (see `talents.before.ts`/`talents.after.ts`).

## New evidence and generated assets

- `docs/balance/before/` and `docs/balance/after/`: 240 JSONL runs each, identical seeds.
- `docs/balance/iteration1/`: intermediate tuning matrix (240 runs).
- `docs/balance/five-minute-{before,after}/`: early-game diagnostics.
- `docs/balance/comparison.json`, `docs/evidence/BEFORE-AFTER.md`, `docs/BALANCE.md`.
- `docs/qa/*.png` (6 screenshots), `docs/qa/browser-*.log`, `docs/logs/*.log`.
- `docs/evidence/heroes.{before,iteration1,after}.ts`, `engine.{before,iteration1,after}.ts`.

## Why generated binaries previously vanished

The workspace snapshot retains source but not generated binary files. `public/icons/` was
empty again at the start of this session. `scripts/make-icons.mjs` now uses only Node built-ins,
runs via `prebuild`/`pretest`, and `scripts/package.mjs` **refuses to create archives** unless
the three PNGs, screenshots and logs exist and are present in both ZIPs.

## Appendix — heroes.ts diff
```diff
--- docs/evidence/heroes.before.ts	2026-11-12 10:26:00.133461675 +0000
+++ src/game/heroes.ts	2026-11-12 10:50:32.353930568 +0000
@@ -35,9 +35,14 @@
   speed?: number;
   maxHp?: number;
   xp?: number;
-  /** extra damage multiplier against frozen enemies */
+  /** extra damage multiplier against slowed/frozen enemies */
   frozen?: number;
+  /** apply the frozen bonus even to mild slows (the frost aura starts at 25%) */
+  frozenAnySlow?: boolean;
+  /** damage taken reduction, 0.05 = −5% */
+  taken?: number;
   spellDmg?: Partial<Record<SpellId, number>>;
+  spellCd?: Partial<Record<SpellId, number>>;
   spellRadius?: Partial<Record<SpellId, number>>;
 }
 
@@ -47,9 +52,9 @@
     name: "فرزان",
     title: "افسونگرِ فیروزه",
     lore: "پیرِ دانا که تیرهای افسون را بی‌وقفه می‌بارد.",
-    passive: "آسیب تیر افسون ۲۰٪ بیشتر و تجربهٔ گوهرها ۸٪ بیشتر.",
+    passive: "آسیب تیر افسون ۲۰٪ بیشتر و تجربهٔ گوهرها ۵٪ بیشتر.",
     start: "bolt",
-    xp: 0.08,
+    xp: 0.05,
     spellDmg: { bolt: 0.2 },
     palette: {
       robe: ["#2ad3c2", "#17a99b", "#0d7d75"],
@@ -69,10 +74,12 @@
     name: "آذر",
     title: "آتش‌بانِ آذرگشسب",
     lore: "نگهبانِ آتشکدهٔ کهن؛ شعله از عصایش فرو نمی‌نشیند.",
-    passive: "آسیب گوی آتش ۲۵٪ و شعاع انفجارش ۱۵٪ بیشتر.",
+    passive: "گوی آتش ۵۵٪ آسیب و ۳۵٪ شعاع بیشتر و ۲۲٪ زودتر پرتاب می‌شود؛ همهٔ افسون‌هایش ۶٪ قوی‌ترند.",
     start: "fire",
-    spellDmg: { fire: 0.25 },
-    spellRadius: { fire: 0.15 },
+    dmg: 0.06,
+    spellDmg: { fire: 0.55 },
+    spellCd: { fire: -0.22 },
+    spellRadius: { fire: 0.35 },
     palette: {
       robe: ["#f0574a", "#c6303a", "#86182a"],
       robeShade: "rgba(60,6,14,0.38)",
@@ -91,10 +98,13 @@
     name: "بهمن",
     title: "سرماافسونِ البرز",
     lore: "از قلّه‌های یخ‌زده آمده و نفسش دیوان را می‌خشکاند.",
-    passive: "دشمنان یخ‌زده ۲۵٪ آسیب بیشتر می‌بینند و ۲۰ جان بیشتر داری.",
+    passive: "دشمنانِ سرد ۳۰٪ آسیب بیشتر می‌بینند، جان ۳۰ بیشتر و ۳٪ آسیب کمتر می‌گیری.",
     start: "frost",
-    frozen: 1.25,
-    maxHp: 20,
+    frozen: 1.3,
+    frozenAnySlow: true,
+    taken: 0.03,
+    maxHp: 30,
+    spellRadius: { frost: 0.2 },
     palette: {
       robe: ["#e6f4ff", "#a9d6f5", "#6aa6d6"],
       robeShade: "rgba(20,52,92,0.3)",
```

## Appendix — engine.ts balancing diff
```diff
--- docs/evidence/engine.before.ts	2026-11-12 10:26:00.145461777 +0000
+++ src/game/engine.ts	2026-11-12 10:26:00.173462014 +0000
@@ -1640,7 +1640,17 @@
     }
     // the hero's passive behaves like a permanent, built-in relic
     const hero = BY_HERO[this.hero];
-    addMods(a, { dmg: hero.dmg, speed: hero.speed, maxHp: hero.maxHp, xp: hero.xp, frozen: hero.frozen, spellDmg: hero.spellDmg, spellRadius: hero.spellRadius });
+    addMods(a, {
+      dmg: hero.dmg,
+      speed: hero.speed,
+      maxHp: hero.maxHp,
+      xp: hero.xp,
+      taken: hero.taken,
+      frozen: hero.frozen,
+      spellDmg: hero.spellDmg,
+      spellCd: hero.spellCd,
+      spellRadius: hero.spellRadius,
+    });
     const rb = researchBonus(this.research);
     a.pickup += rb.pickup;
     // tier-2 masteries fold into the same per-spell tables the spells already read
@@ -2160,7 +2170,9 @@
     if (e.dead) return;
     const crit = this.rand() < this.critChance;
     let mul = this.dmgMul * (0.9 + this.rand() * 0.2) * (crit ? PASSIVE_TUNING.critMultiplier : 1);
-    if (e.slowAmt >= 0.35 && e.slowT > 0) mul *= this.a.frozen; // «بلور ماه»
+    // «بلور ماه» and Bahman's cold passive. Bahman's chill works on the mild
+    // 25% slow of a rank-one frost aura; other sources need a real freeze.
+    if (e.slowT > 0 && (e.slowAmt >= 0.35 || BY_HERO[this.hero].frozenAnySlow)) mul *= this.a.frozen;
     if (this.a.aged > 0 && this.time - e.born > 5) mul *= 1 + this.a.aged; // «نشان کهنه»
     const d = Math.max(1, Math.round(dmg * mul));
     // «داس دروگر» و هم‌مانندها: شانس کشتار فوری
```
