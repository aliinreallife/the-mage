import { describe, expect, it } from "vitest";
import { enemyNear, invulnerable, makeGame, run } from "./helpers";

/** Only the fireball acts: no bolts or other spells disturb the numbers. */
const isolate = (h: ReturnType<typeof makeGame>) => {
  h.any.spells.clear();
  h.any.enemies = [];
};

/** An enemy placed for a test; the grid is rebuilt the same way a frame would rebuild it. */
const placed = (h: ReturnType<typeof makeGame>, dx: number, dy: number) => {
  const e = enemyNear(h, dx, dy);
  h.any.buildGrid();
  return e;
};

/** A fireball already in flight, as the spell would have launched it. */
const launch = (h: ReturnType<typeof makeGame>, x: number, y: number, vx: number, vy: number, radius = 58) =>
  h.any.shots.push({ kind: "fire", x, y, vx, vy, r: 8, dmg: 20, life: 1.5, pierce: 0, radius, hit: null, dead: false, trail: [], seed: 1 });

describe("fireball: flight", () => {
  it("homes in on an enemy that is off its launch line", () => {
    const h = makeGame(3);
    invulnerable(h);
    isolate(h);
    const p = h.any.player;
    const e = placed(h, 0, 150); // 90 degrees away from where the fireball is flying
    const before = e.hp;
    launch(h, p.x, p.y, 310, 0);
    run(h.g, 1.6); // a little longer than its 1.5 s lifetime, so it has certainly burst
    expect(e.hp).toBeLessThan(before);
    expect(h.any.shots.some((s: any) => s.kind === "fire")).toBe(false);
  });

  it("the turn rate is limited, so a fireball cannot snap around", () => {
    const h = makeGame(3);
    isolate(h);
    const p = h.any.player;
    placed(h, 0, -200);
    launch(h, p.x, p.y, 310, 0);
    const shot = h.any.shots[0];
    h.any.steerFireball(shot, 1 / 60);
    const turned = Math.abs(Math.atan2(shot.vy, shot.vx));
    expect(turned).toBeGreaterThan(0);
    expect(turned).toBeLessThanOrEqual(4.0 / 60 + 1e-9);
  });

  it("leaves embers and smoke behind while flying", () => {
    const h = makeGame(4);
    isolate(h);
    launch(h, h.any.player.x, h.any.player.y, 310, 0);
    run(h.g, 0.2);
    expect(h.any.fireFx.length).toBeGreaterThan(0);
    expect(h.any.fireFx.some((p: any) => p.smoke)).toBe(true);
  });
});

describe("fireball: impact and burning", () => {
  it("the blast sets enemies alight inside its radius only", () => {
    const h = makeGame(4);
    invulnerable(h);
    isolate(h);
    const near = placed(h, 0, 0);
    const edge = placed(h, 300, 0);
    h.any.fireBlast(near.x, near.y, 58, 20);
    expect(near.burnT).toBe(3);
    expect(edge.burnT).toBe(0);
    expect(edge.hp).toBe(edge.maxHp);
  });

  it("burning deals damage over time, then stops", () => {
    const h = makeGame(5);
    invulnerable(h);
    isolate(h);
    const e = placed(h, 0, 0);
    h.any.fireBlast(e.x, e.y, 58, 20);
    const hp0 = e.hp;
    run(h.g, 3.6); // three seconds of burning, a tick every half second
    const dealt = hp0 - e.hp;
    const perTick = 20 * 0.12 * h.any.dmgMul;
    expect(dealt).toBeGreaterThan(perTick * 4);
    expect(dealt).toBeLessThan(perTick * 8);
    const settled = e.hp;
    run(h.g, 2);
    expect(e.hp).toBe(settled);
  });

  it("re-igniting refreshes the burn instead of stacking it", () => {
    const h = makeGame(6);
    isolate(h);
    const e = placed(h, 0, 0);
    h.any.ignite(e, 20, 3);
    run(h.g, 2);
    h.any.ignite(e, 20, 3);
    expect(e.burnT).toBe(3);
    expect(e.burnDmg).toBeCloseTo(20 * 0.12, 9);
  });

  it("a level 6 fireball burns for five seconds", () => {
    const h = makeGame(7);
    isolate(h);
    h.any.spells.set("fire", { lvl: 6, timer: 9 });
    const e = placed(h, 0, 0);
    h.any.fireBlast(e.x, e.y, 90, 48);
    expect(e.burnT).toBe(5);
  });

  it("the blast leaves a scorch mark that fades away", () => {
    const h = makeGame(8);
    for (let i = 0; i < 30; i++) h.any.fireBlast(i * 10, 0, 58, 20);
    expect(h.any.scorches.length).toBeLessThanOrEqual(14);
    run(h.g, 4);
    expect(h.any.scorches.length).toBe(0);
  });
});

describe("fireball: budgets and reduced effects", () => {
  const busy = (reduced: boolean) => {
    const h = makeGame(9);
    h.g.reducedFx = reduced;
    invulnerable(h);
    h.any.spells.set("fire", { lvl: 3, timer: 0 });
    h.any.enemies = [];
    for (let k = 0; k < 12; k++) enemyNear(h, Math.cos(k) * 150, Math.sin(k) * 150);
    let max = 0;
    for (let i = 0; i < 300; i++) {
      h.g.update(1 / 60);
      max = Math.max(max, h.any.fireFx.length);
    }
    return max;
  };

  it("particle counts stay within budget", () => {
    expect(busy(false)).toBeGreaterThan(0);
    expect(busy(false)).toBeLessThanOrEqual(180);
    expect(busy(true)).toBeLessThanOrEqual(60);
  });
});

describe("cosmetic effects never change the simulation", () => {
  const play = (reduced: boolean) => {
    const h = makeGame(21);
    h.g.reducedFx = reduced;
    h.any.spells.set("fire", { lvl: 3, timer: 0.1 });
    h.any.spells.set("bolt", { lvl: 3, timer: 0.1 });
    for (let i = 0; i < 60 * 90 && !h.g.over; i++) {
      h.g.input.x = Math.cos(h.g.time * 0.5);
      h.g.input.y = Math.sin(h.g.time * 0.5);
      h.g.update(1 / 60);
    }
    const s = h.g.snapshot();
    return { kills: s.kills, level: s.level, hp: s.hp, time: s.time, enemies: h.any.enemies.length, x: h.any.player.x.toFixed(4), y: h.any.player.y.toFixed(4) };
  };

  it("reduced effects produce exactly the same run", () => {
    expect(play(true)).toEqual(play(false));
  });
});
