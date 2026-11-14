import { describe, expect, it } from "vitest";
import { PRIMARY_SPELLS, SPELL_IDS, SPELLS, UPGRADES, type SpellId } from "../src/game/data";
import { FUSION_IDS, canFuse, canTakeTalent, fusionSlots, type FusionId } from "../src/game/talents";
import { enemyNear, invulnerable, makeGame, run } from "./helpers";

const setSpell = (h: ReturnType<typeof makeGame>, id: SpellId, lvl: number) => h.any.spells.set(id, { lvl, timer: 0.05 });

describe("spell levels", () => {
  it("the seven primary families go to level 7, the extra spells keep 6", () => {
    for (const id of SPELL_IDS) {
      const max = UPGRADES[id].max;
      expect(max).toBe(PRIMARY_SPELLS.includes(id) ? 7 : 6);
      expect(UPGRADES[id].levels).toHaveLength(max);
      expect((SPELLS as Record<string, readonly unknown[]>)[id]).toHaveLength(max);
    }
  });

  it("upgrades stop at the maximum level", () => {
    const h = makeGame();
    for (let i = 0; i < 12; i++) h.g.applyUpgrade("bolt");
    expect(h.any.spells.get("bolt").lvl).toBe(7);
  });
});

describe("talents", () => {
  it("are only offered once a spell reaches level 3", () => {
    const h = makeGame();
    setSpell(h, "bolt", 2);
    expect(canTakeTalent("doppel", h.g.magicView())).toBe(false);
    for (let i = 0; i < 200; i++) expect(h.g.rollChoices().some((c) => c.talent && c.id === "bolt")).toBe(false);
    setSpell(h, "bolt", 3);
    expect(canTakeTalent("doppel", h.g.magicView())).toBe(true);
    let seen = false;
    for (let i = 0; i < 300 && !seen; i++) seen = h.g.rollChoices().some((c) => c.talent && c.id === "bolt");
    expect(seen).toBe(true);
  });

  it("one talent per family", () => {
    const h = makeGame();
    setSpell(h, "bolt", 3);
    expect(h.g.takeTalent("arrow")).toBe(true);
    expect(h.g.takeTalent("firecracker")).toBe(false);
    expect(h.g.takeTalent("doppel")).toBe(false);
    expect(h.g.snapshot().talents).toEqual([{ spell: "bolt", talent: "arrow" }]);
  });

  it("change how the spell behaves (Magic Arrow pierces and flies faster)", () => {
    const h = makeGame();
    invulnerable(h);
    setSpell(h, "bolt", 3);
    h.g.takeTalent("arrow");
    enemyNear(h, 200);
    for (let i = 0; i < 30 && h.any.shots.length === 0; i++) h.g.update(1 / 60);
    const shot = h.any.shots.find((s: any) => s.kind === "bolt");
    expect(shot.pierce).toBe(2);
    expect(Math.hypot(shot.vx, shot.vy)).toBeCloseTo(610, 3);
  });
});

describe("fusions", () => {
  it("fusion slots unlock at levels 25, 50 and 75", () => {
    expect([1, 24, 25, 49, 50, 74, 75, 99].map(fusionSlots)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });

  it("validate slots, exact talents and levels", () => {
    const h = makeGame();
    h.g.devFusionKit("polymorph");
    expect(canFuse("polymorph", h.g.magicView()).ok).toBe(true);

    h.g.devSetLevel(24);
    expect(canFuse("polymorph", h.g.magicView())).toEqual({ ok: false, reason: "slot" });
    h.g.devSetLevel(25);

    h.any.talents.set("spirit", "legion"); // wrong talent
    expect(canFuse("polymorph", h.g.magicView())).toEqual({ ok: false, reason: "talent" });
    h.any.talents.set("spirit", "missile");

    setSpell(h, "spirit", 4); // secondary too low
    expect(canFuse("polymorph", h.g.magicView())).toEqual({ ok: false, reason: "level" });
  });

  it("consume the secondary spell and transform the primary", () => {
    const h = makeGame();
    invulnerable(h);
    h.g.devFusionKit("polymorph");
    expect(h.g.fuse("polymorph")).toBe(true);
    expect(h.any.spells.has("spirit")).toBe(false);
    expect(h.any.consumed.has("spirit")).toBe(true);
    expect(h.g.snapshot().fusions).toEqual([{ spell: "bolt", fusion: "polymorph" }]);
    for (let i = 0; i < 400; i++) expect(h.g.rollChoices().some((c) => c.id === "spirit")).toBe(false);
    enemyNear(h, 200);
    run(h.g, 1);
    const kinds = new Set(h.any.shots.map((s: any) => s.kind));
    expect(kinds.has("phantom")).toBe(true);
    expect(kinds.has("missile")).toBe(false);
  });

  it("each recipe produces its own attack", () => {
    // which projectile kinds (or effects) each fused primary spell must produce
    const expected: Record<FusionId, string> = {
      polymorph: "phantom",
      fireworks: "firework",
      heavyshot: "heavy",
      maelstrom: "maelstrom",
    };
    for (const id of FUSION_IDS) {
      const h = makeGame(5);
      invulnerable(h);
      h.g.devFusionKit(id);
      expect(h.g.fuse(id)).toBe(true);
      enemyNear(h, 180);
      const seen = new Set<string>();
      for (let i = 0; i < 90; i++) {
        h.g.update(1 / 60);
        for (const s of h.any.shots) seen.add(s.kind);
        if (h.any.maelstrom) seen.add("maelstrom");
      }
      expect(seen.has(expected[id]), id).toBe(true);
      // the consumed secondary spell no longer fires its own projectiles
      if (id === "polymorph") expect(seen.has("missile")).toBe(false);
      if (id === "maelstrom") expect(seen.has("cyclone")).toBe(false);
    }
  });

  it("the three Magic Bolt recipes are mutually exclusive", () => {
    const h = makeGame();
    h.g.devFusionKit("polymorph");
    h.g.devSetLevel(75);
    expect(h.g.fuse("polymorph")).toBe(true);
    for (const other of ["fireworks", "heavyshot"] as FusionId[]) {
      h.g.devFusionKit(other);
      expect(canFuse(other, h.g.magicView())).toEqual({ ok: false, reason: "conflict" });
      expect(h.g.fuse(other)).toBe(false);
    }
  });

  it("Maelstrom can coexist with one Magic Bolt recipe, given a second slot", () => {
    const h = makeGame();
    h.g.devFusionKit("heavyshot");
    expect(h.g.fuse("heavyshot")).toBe(true);
    h.g.devFusionKit("maelstrom");
    expect(canFuse("maelstrom", h.g.magicView())).toEqual({ ok: false, reason: "slot" }); // level 25: one slot
    h.g.devSetLevel(50);
    expect(h.g.fuse("maelstrom")).toBe(true);
    expect(h.g.snapshot().fusions).toHaveLength(2);
    expect(h.g.fuse("maelstrom")).toBe(false); // cannot apply twice
  });

  it("a valid fusion is offered as the first card", () => {
    const h = makeGame();
    h.g.devFusionKit("fireworks");
    const hand = h.g.rollChoices();
    expect(hand[0].fusion).toBe("fireworks");
    expect(h.g.applyChoice(hand[0])).toBe(true);
    expect(h.any.consumed.has("energy")).toBe(true);
  });
});

describe("passives and Shield", () => {
  it("Intelligence: +10% attack per rank, 5 ranks", () => {
    const h = makeGame();
    const dmg = h.any.dmgMul;
    for (let i = 0; i < 7; i++) h.g.applyUpgrade("might");
    expect(h.any.passives.get("might")).toBe(5);
    expect(h.any.dmgMul / dmg).toBeCloseTo(1.5, 9);
  });

  it("Fast Casting: −5% all cooldowns per rank, 3 ranks", () => {
    const h = makeGame();
    const cd = h.any.cdMul;
    for (let i = 0; i < 5; i++) h.g.applyUpgrade("haste");
    expect(h.any.passives.get("haste")).toBe(3);
    expect(h.any.cdMul / cd).toBeCloseTo(0.85, 9);
  });

  it("Vitality: +20% max HP per rank (healed to match) and +10% life-orb healing", () => {
    const h = makeGame();
    const hp = h.any.player.maxHp;
    h.g.applyUpgrade("vital");
    expect(h.any.player.maxHp).toBe(Math.round(hp * 1.2));
    expect(h.any.player.hp).toBe(h.any.player.maxHp);
    for (let i = 0; i < 6; i++) h.g.applyUpgrade("vital");
    expect(h.any.passives.get("vital")).toBe(5);
    expect(h.any.player.maxHp).toBe(Math.round(hp * 2));
    // a pomegranate heals 15 × (1 + 0.5)
    h.any.player.hp = 10;
    h.any.pickups.push({ kind: "anar", x: h.any.player.x, y: h.any.player.y, seed: 0, dead: false });
    h.g.update(1 / 60);
    expect(h.any.player.hp).toBeGreaterThanOrEqual(10 + 22);
  });

  it("Snipe: +5% critical-strike chance per rank, 3 ranks, at any distance", () => {
    const h = makeGame();
    for (let i = 0; i < 5; i++) h.g.applyUpgrade("snipe");
    expect(h.any.passives.get("snipe")).toBe(3);
    expect(h.any.critChance).toBeCloseTo(0.07 + 0.15, 9);
    // a roll just above the base chance crits only because of Snipe — near and far alike
    h.any.rand = () => 0.1;
    const near = enemyNear(h, 60);
    const far = enemyNear(h, 600);
    h.any.hit(near, 100, 0, 0, "#fff", true);
    h.any.hit(far, 100, 0, 0, "#fff", true);
    const crit = Math.round(100 * h.any.dmgMul * (0.9 + 0.1 * 0.2) * 1.7);
    expect(near.maxHp - near.hp).toBe(crit);
    expect(far.maxHp - far.hp).toBe(crit);
  });

  it("Snipe raises the observed crit rate (statistical, seeded)", () => {
    const rate = (ranks: number) => {
      const h = makeGame(42);
      for (let i = 0; i < ranks; i++) h.g.applyUpgrade("snipe");
      const e = enemyNear(h, 100);
      e.hp = e.maxHp = 1e12;
      let crits = 0;
      const N = 4000;
      for (let i = 0; i < N; i++) {
        const before = e.hp;
        h.any.hit(e, 100, 0, 0, "#fff", true);
        if (before - e.hp > 100 * h.any.dmgMul * 1.15) crits++;
      }
      return crits / N;
    };
    expect(rate(0)).toBeGreaterThan(0.05);
    expect(rate(0)).toBeLessThan(0.09);
    expect(rate(3)).toBeGreaterThan(0.19);
    expect(rate(3)).toBeLessThan(0.25);
  });

  it("Shield blocks one hit and recharges", () => {
    const h = makeGame();
    h.g.applyUpgrade("shield");
    expect(h.g.shieldReady).toBe(true);
    const hp = h.any.player.hp;
    h.any.hurtPlayer(40);
    expect(h.any.player.hp).toBe(hp);
    expect(h.g.shieldReady).toBe(false);
    invulnerable(h);
    run(h.g, 18.1);
    expect(h.g.shieldReady).toBe(true);
  });
});
