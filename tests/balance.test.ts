import { describe, expect, it } from "vitest";
import { PROVING_GROUNDS } from "../src/game/stage";
import { canFuse } from "../src/game/talents";
import { FUSIONS } from "../src/game/talents";
import { enemyNear, invulnerable, makeGame, run } from "./helpers";

const toBoss = (h: ReturnType<typeof makeGame>) => {
  invulnerable(h);
  h.g.devJumpToWave(3);
  run(h.g, 3.2);
  return h.any.stageBoss;
};

describe("stage balance: enemies and boss follow the player's power", () => {
  it("boss HP scales with the player's level", () => {
    const low = toBoss(makeGame(1, { mode: "stage" }));
    const lowHp = low.maxHp;
    const high = makeGame(1, { mode: "stage" });
    high.g.devSetLevel(90);
    const highBoss = toBoss(high);
    expect(highBoss.maxHp).toBeGreaterThan(lowHp * 3);
  });

  it("the player-power factor is capped, so it cannot explode", () => {
    const h = makeGame(2, { mode: "stage" });
    h.any.level = 100_000;
    h.any.waveIdx = -1;
    expect(h.any.stagePower()).toBeLessThanOrEqual(PROVING_GROUNDS.playerPower.max);
    h.any.level = 1;
    expect(h.any.stagePower()).toBe(1);
  });

  it("wave enemies are tougher than field enemies at the same moment", () => {
    const h = makeGame(3, { mode: "stage" });
    invulnerable(h);
    h.any.level = 40;
    h.any.waveIdx = -1;
    const field = h.any.addEnemy("ghoul", 0, 0);
    h.g.devJumpToWave(2);
    run(h.g, 3.1);
    const wave = h.any.addEnemy("ghoul", 0, 0);
    expect(wave.maxHp).toBeGreaterThan(field.maxHp * PROVING_GROUNDS.wavePower[2]);
  });

  it("endless mode is not affected by the stage power factor", () => {
    const h = makeGame(4, { mode: "endless" });
    h.any.level = 300;
    expect(h.any.stagePower()).toBe(1);
  });

  it("the boss is a real fight, not a two-second kill (7,000 → data-driven 45,000 × power)", () => {
    expect(PROVING_GROUNDS.boss.hp).toBeGreaterThanOrEqual(40_000);
    expect(PROVING_GROUNDS.boss.attackGap[0]).toBeLessThanOrEqual(2.5);
  });
});

describe("fusion builds stay reachable without breaking the rules", () => {
  it("holding a recipe talent biases offers toward its two spells", () => {
    const partnerOffers = (withTalent: boolean) => {
      const h = makeGame(5, { autoChoose: false });
      h.any.level = 30;
      h.any.spells.set("bolt", { lvl: 3, timer: 1 });
      h.any.spells.set("spirit", { lvl: 3, timer: 1 });
      if (withTalent) h.any.talents.set("bolt", "doppel");
      let hits = 0;
      for (let i = 0; i < 400; i++) if (h.g.rollChoices().some((c) => c.id === "spirit" || (c.id === "bolt" && !c.talent))) hits++;
      return hits;
    };
    expect(partnerOffers(true)).toBeGreaterThan(partnerOffers(false) * 1.3);
  });

  it("the bias never waives prerequisites or conflicts", () => {
    const h = makeGame(6, { autoChoose: false });
    h.any.level = 30;
    h.any.spells.set("bolt", { lvl: 3, timer: 1 });
    h.any.spells.set("spirit", { lvl: 3, timer: 1 });
    h.any.talents.set("bolt", "doppel");
    // spells below the fusion level, and the partner talent missing
    expect(canFuse("polymorph", h.g.magicView())).toEqual({ ok: false, reason: "talent" });
    h.any.spells.set("spirit", { lvl: 5, timer: 1 });
    expect(canFuse("polymorph", h.g.magicView())).toEqual({ ok: false, reason: "talent" });
    h.any.spells.set("bolt", { lvl: 5, timer: 1 }); // the primary must also reach the fusion level
    h.any.talents.set("spirit", "missile");
    expect(canFuse("polymorph", h.g.magicView()).ok).toBe(true);
    // still one Magic Bolt recipe only
    h.g.fuse("polymorph");
    h.any.level = 75;
    h.any.spells.set("energy", { lvl: 5, timer: 1 });
    h.any.spells.set("bolt", { lvl: 5, timer: 1 });
    h.any.talents.set("energy", "flare");
    expect(canFuse("fireworks", h.g.magicView()).ok).toBe(false);
  });

  it("every recipe needs its exact pair", () => {
    for (const f of Object.values(FUSIONS)) {
      const h = makeGame(7, { autoChoose: false });
      h.g.devFusionKit(f.id);
      expect(canFuse(f.id, h.g.magicView()).ok, f.id).toBe(true);
    }
  });
});

describe("performance proxy (Node, not a device)", () => {
  it("a heavy frame stays inside the 60 fps budget on average", () => {
    const h = makeGame(8);
    invulnerable(h);
    h.any.spells.set("fire", { lvl: 6, timer: 0.01 });
    h.any.spells.set("orbs", { lvl: 6, timer: 0.01 });
    h.any.spells.set("spirit", { lvl: 6, timer: 0.01 });
    for (let i = 0; i < 260; i++) enemyNear(h, Math.cos(i) * (200 + (i % 5) * 40), Math.sin(i) * (200 + (i % 5) * 40), i % 4 ? "shade" : "ghoul");
    const t0 = performance.now();
    const steps = 600;
    for (let i = 0; i < steps; i++) {
      h.g.input.x = Math.cos(i / 20);
      h.g.input.y = Math.sin(i / 20);
      h.g.update(1 / 60);
    }
    const avg = (performance.now() - t0) / steps;
    console.log(`[perf proxy] ${h.any.enemies.length} enemies, ${steps} steps, average ${avg.toFixed(3)} ms/step`);
    expect(avg).toBeLessThan(16.6);
  }, 60_000);
});
