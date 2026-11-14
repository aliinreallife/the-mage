import { describe, expect, it } from "vitest";
import { BY_HERO } from "../src/game/heroes";
import { enemyNear, makeGame } from "./helpers";

const heroGame = (hero: keyof typeof BY_HERO) => {
  const h = makeGame(3, { autoChoose: false });
  h.g.setHero(hero);
  return h;
};

describe("hero identity and passive tuning", () => {
  it("each hero keeps its starting spell", () => {
    expect(BY_HERO.farzan.start).toBe("bolt");
    expect(BY_HERO.azar.start).toBe("fire");
    expect(BY_HERO.bahman.start).toBe("frost");
    expect(BY_HERO.tishtar.start).toBe("zap");
    for (const hero of ["farzan", "azar", "bahman", "tishtar"] as const) {
      const h = heroGame(hero);
      expect(h.g.snapshot().spells.map((s) => s.id)).toEqual([BY_HERO[hero].start]);
      expect(h.g.snapshot().fusions).toEqual([]);
    }
  });

  it("Farzan keeps bolt damage, with a smaller experience edge", () => {
    expect(BY_HERO.farzan.spellDmg?.bolt).toBeCloseTo(0.2, 9);
    expect(BY_HERO.farzan.xp).toBeCloseTo(0.05, 9);
    const f = heroGame("farzan");
    expect(f.any.sd("bolt", 100)).toBeCloseTo(120, 9);
  });

  it("Azar's fire is harder, wider and faster than a plain fireball", () => {
    const a = heroGame("azar");
    expect(a.any.sd("fire", 100)).toBeCloseTo(155, 9); // +55% fire-specific
    expect(a.any.dmgMul).toBeCloseTo(1.06, 9); // +6% on top, for every spell
    expect(a.any.sr("fire", 100)).toBeCloseTo(135, 9);
    expect(a.any.scd("fire", 100)).toBeCloseTo(78, 9);
    const f = heroGame("farzan");
    expect(a.any.scd("fire", 100)).toBeLessThan(f.any.scd("fire", 100));
  });

  it("Bahman is hardier and his cold bonus works on a rank-one frost slow", () => {
    const b = heroGame("bahman");
    expect(b.any.player.maxHp).toBe(100 + 30);
    expect(b.any.a.taken).toBeCloseTo(0.03, 9);
    expect(b.any.sr("frost", 100)).toBeCloseTo(120, 9);
    expect(BY_HERO.bahman.frozenAnySlow).toBe(true);

    const damage = (hero: "bahman" | "farzan", slow: number) => {
      const h = heroGame(hero);
      h.any.rand = () => 0.5; // no crit, fixed spread
      const e = enemyNear(h, 60);
      e.hp = e.maxHp = 1e9;
      e.slowAmt = slow;
      e.slowT = 5;
      h.any.hit(e, 100, 0, 0, "#fff", true);
      return e.maxHp - e.hp;
    };
    // mild 25% slow: only Bahman benefits
    expect(damage("bahman", 0.25)).toBeGreaterThan(damage("farzan", 0.25) * 1.2);
    // a real freeze: both benefit from their frozen multiplier (Bahman more)
    expect(damage("bahman", 0.4)).toBeGreaterThan(damage("farzan", 0.4));
  });

  it("Tishtar keeps lightning damage and movement identity", () => {
    const t = heroGame("tishtar");
    expect(t.any.sd("zap", 100)).toBeCloseTo(120, 9);
    expect(t.any.speed).toBeCloseTo(150 * 1.08, 9);
  });
});
