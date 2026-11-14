import { describe, expect, it } from "vitest";
import { BOONS, BY_BOON } from "../src/game/boons";
import { fa } from "../src/game/fa";
import { makeRng } from "../src/game/rng";
import { makeGame, run } from "./helpers";

describe("seeded randomness and fixed-step simulation", () => {
  it("the RNG is reproducible", () => {
    const a = makeRng(42);
    const b = makeRng(42);
    const seqA = Array.from({ length: 20 }, () => a());
    expect(Array.from({ length: 20 }, () => b())).toEqual(seqA);
    expect(seqA.every((x) => x >= 0 && x < 1)).toBe(true);
  });

  it("same seed + same inputs → identical run", () => {
    const state = (seed: number) => {
      const h = makeGame(seed);
      for (let i = 0; i < 60 * 90 && !h.g.over; i++) {
        h.g.input.x = Math.cos(h.g.time * 0.4);
        h.g.input.y = Math.sin(h.g.time * 0.4);
        h.g.update(1 / 60);
      }
      const s = h.g.snapshot();
      return { kills: s.kills, level: s.level, hp: s.hp, x: h.any.player.x.toFixed(3), spells: s.spells };
    };
    expect(state(7)).toEqual(state(7));
    expect(state(7)).not.toEqual(state(8));
  });

  it("advance() gives the same result at 30, 60 and 120 fps", () => {
    const result = (fps: number) => {
      const h = makeGame(99);
      h.g.input.x = 0.6;
      h.g.input.y = 0.2;
      for (let i = 0; i < fps * 45; i++) h.g.advance(1 / fps);
      const s = h.g.snapshot();
      return { t: h.g.time.toFixed(4), kills: s.kills, level: s.level, hp: s.hp, x: h.any.player.x.toFixed(3), enemies: h.any.enemies.length };
    };
    const at60 = result(60);
    expect(result(30)).toEqual(at60);
    expect(result(120)).toEqual(at60);
  });

  it("a long hitch is clamped instead of simulating seconds at once", () => {
    const h = makeGame(1);
    expect(h.g.advance(5)).toBe(15); // MAX_FRAME 0.25 s → 15 steps
  });
});

describe("revival charges", () => {
  const kill = (h: ReturnType<typeof makeGame>) => {
    h.any.player.iframe = 0;
    h.any.shieldReady = false;
    h.any.player.hp = 1;
    h.any.hurtPlayer(500);
  };

  it("spent charges are not restored by stat recalculation", () => {
    const h = makeGame();
    expect(h.g.winds).toBe(1);
    kill(h);
    expect(h.g.over).toBe(false);
    expect(h.g.winds).toBe(0);
    // stat upgrades used to call recalc() and refill the charge
    h.g.applyUpgrade("might");
    h.g.applyUpgrade("vital");
    h.any.recalc();
    expect(h.g.winds).toBe(0);
  });

  it("new charges add on top of what was spent, and the last death ends the run once", () => {
    const h = makeGame();
    kill(h);
    h.any.pendingBoon = 1;
    h.any.boonOffer = ["soul"];
    expect(h.g.chooseBoon("soul")).toBe(true);
    expect(h.g.winds).toBe(1); // granted 2, used 1
    kill(h);
    expect(h.g.over).toBe(false);
    expect(h.g.winds).toBe(0);
    kill(h);
    expect(h.g.over).toBe(true);
    expect(h.g.outcome).toBe("defeat");
    kill(h);
    expect(h.count("gameover")).toBe(1);
  });
});

describe("conditional (Totem) regeneration", () => {
  it("only heals on frames where the player stands still", () => {
    const h = makeGame();
    h.any.artifacts.push("totem");
    h.any.recalc();
    h.any.player.hp = 50;
    h.g.input.x = 0;
    run(h.g, 1);
    const afterStill = h.any.player.hp;
    expect(afterStill).toBeGreaterThan(51);

    // start moving WITHOUT any recalc: regen must stop immediately
    h.g.input.x = 1;
    run(h.g, 1);
    expect(h.any.player.hp).toBeCloseTo(afterStill, 6);

    // a recalc while moving must not re-enable it either
    h.any.recalc();
    run(h.g, 1);
    expect(h.any.player.hp).toBeCloseTo(afterStill, 6);

    h.g.input.x = 0;
    run(h.g, 1);
    expect(h.any.player.hp).toBeGreaterThan(afterStill + 1);
  });
});

describe("boon descriptions match their effects", () => {
  it("every boon's text contains its real numbers", () => {
    for (const b of BOONS) {
      for (const v of [b.dmg, b.cd, b.speed, b.xp, b.pickup, b.ult]) {
        if (v) expect(b.text).toContain(fa(Math.round(Math.abs(v) * 100)));
      }
      if (b.maxHp) expect(b.text).toContain(fa(b.maxHp));
    }
  });

  it("mind and flame say what they do", () => {
    expect(BY_BOON.mind.text).toContain("۱۸");
    expect(BY_BOON.mind.text).not.toContain("۲۵");
    expect(BY_BOON.flame.text).toContain("۱۰");
    expect(BY_BOON.flame.text).not.toContain("۱۲");
  });

  it("the engine applies exactly the described values", () => {
    const h = makeGame();
    const dmg0 = h.any.dmgMul;
    const cd0 = h.any.cdMul;
    h.any.pendingBoon = 2;
    h.any.boonOffer = ["mind"];
    h.g.chooseBoon("mind");
    expect(h.any.dmgMul / dmg0).toBeCloseTo(1 + BY_BOON.mind.dmg!, 9);
    h.any.boonOffer = ["flame"];
    h.g.chooseBoon("flame");
    expect(h.any.cdMul / cd0).toBeCloseTo(1 + BY_BOON.flame.cd!, 9);
  });
});
