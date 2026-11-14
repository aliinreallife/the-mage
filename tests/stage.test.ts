import { describe, expect, it } from "vitest";
import { PROVING_GROUNDS } from "../src/game/stage";
import { enemyNear, invulnerable, makeGame, run } from "./helpers";

const stage = (seed = 3, autoChoose = true) => {
  const h = makeGame(seed, { mode: "stage", autoChoose });
  invulnerable(h);
  return h;
};

describe("the 20-minute stage «میدان آزمایش»", () => {
  it("waves start at 05:00, 10:00, 15:00 and 20:00 of survival time", () => {
    expect(PROVING_GROUNDS.waves.map((w) => w.at)).toEqual([300, 600, 900, 1200]);
    const h = stage();
    h.any.stageTime = 299;
    run(h.g, 0.5);
    expect(h.g.waveIdx).toBe(-1);
    run(h.g, 1);
    expect(h.g.waveIdx).toBe(0);
    expect(h.g.stageTime).toBe(300);
  });

  it("the survival timer is paused during a wave", () => {
    const h = stage();
    h.any.stageTime = 299.9;
    run(h.g, 0.2);
    expect(h.g.waveIdx).toBe(0);
    run(h.g, 10);
    expect(h.g.stageTime).toBe(300);
    expect(h.g.snapshot().clock).toBe(300);
  });

  it("wave objectives show progress and complete the wave", () => {
    const h = stage();
    h.g.devJumpToWave(0);
    run(h.g, 3.5);
    const view = h.g.snapshot().wave!;
    expect(view.kind).toBe("slay");
    expect(view.target).toBe(120);
    // kills of enemies that were not spawned by the wave do not count
    h.any.kill(h.any.addEnemy("shade", h.any.player.x + 50, h.any.player.y));
    expect(h.g.snapshot().wave!.current).toBe(view.current);
    h.any.waveObjKills = 119;
    const e = h.any.addEnemy("shade", h.any.player.x + 50, h.any.player.y);
    e.objective = true;
    h.any.kill(e);
    expect(h.g.snapshot().wave!.progress).toBe(1);
    run(h.g, 1 / 60);
    expect(h.g.waveIdx).toBe(-1);
    expect(h.g.wavesCleared).toBe(1);
  });

  it("each reward is granted exactly once", () => {
    const h = stage(3, false);
    h.g.devJumpToWave(0);
    run(h.g, 3.5);
    h.any.waveObjKills = 120;
    run(h.g, 1 / 60);
    expect(h.count("relic")).toBe(1);
    h.any.waveIdx = 0; // try to complete the same wave again
    h.any.completeWave();
    expect(h.count("relic")).toBe(1);
  });

  it("standing outside the boundary hurts", () => {
    const h = stage();
    h.g.devJumpToWave(0);
    run(h.g, 3.5);
    h.any.player.x += 2000;
    h.any.player.iframe = 0;
    const hp = h.any.player.hp;
    run(h.g, 0.6);
    expect(h.g.snapshot().wave!.outside).toBe(true);
    expect(h.any.player.hp).toBeLessThan(hp);
  });

  it("elite wave counts only its marked chieftains", () => {
    const h = stage();
    h.g.devJumpToWave(1);
    run(h.g, 3.5);
    const targets = h.any.enemies.filter((e: any) => e.objective);
    expect(targets).toHaveLength(4);
    for (const e of targets) h.any.kill(e);
    run(h.g, 1 / 60);
    expect(h.g.wavesCleared).toBe(2);
  });

  it("hold wave only progresses inside the ring", () => {
    const h = stage();
    h.g.devJumpToWave(2);
    run(h.g, 3.5);
    h.any.player.x += 2000;
    invulnerable(h);
    run(h.g, 5);
    expect(h.g.snapshot().wave!.current).toBe(0);
    h.any.player.x = h.any.waveCenter.x;
    h.any.player.y = h.any.waveCenter.y;
    run(h.g, 41);
    expect(h.g.wavesCleared).toBe(3);
  });

  it("the final boss telegraphs attacks and enters phase two", () => {
    const h = stage();
    h.g.devJumpToWave(3);
    run(h.g, 3.5);
    const boss = h.any.stageBoss;
    expect(boss).toBeTruthy();
    expect(h.g.bossPhase).toBe(1);
    run(h.g, 3);
    expect(h.any.telegraphs.length).toBeGreaterThan(0);
    boss.hp = boss.maxHp * 0.49;
    run(h.g, 1 / 60);
    expect(h.g.bossPhase).toBe(2);
  });

  it("a telegraphed boss attack exposes its type and time remaining to the HUD", () => {
    const h = stage(29);
    h.g.devJumpToWave(3);
    run(h.g, 5.8);
    const warning = h.g.snapshot().wave?.warning;
    expect(warning).not.toBeNull();
    expect(["circle", "line", "ring"]).toContain(warning?.kind);
    expect(warning!.remaining).toBeGreaterThan(0);
    expect(warning!.remaining).toBeLessThanOrEqual(warning!.delay);
  });

  it("defeating the boss wins exactly once and blocks a later death", () => {
    const h = stage();
    h.g.devJumpToWave(3);
    run(h.g, 3.5);
    h.any.kill(h.any.stageBoss);
    expect(h.g.outcome).toBe("victory");
    expect(h.g.over).toBe(true);
    h.any.revivesUsed = 99;
    h.any.player.iframe = 0;
    h.any.hurtPlayer(9999);
    expect(h.g.outcome).toBe("victory");
    expect(h.count("victory")).toBe(1);
    expect(h.count("gameover")).toBe(0);
  });

  it("dying first means the boss kill cannot turn it into a victory", () => {
    const h = stage();
    h.g.devJumpToWave(3);
    run(h.g, 3.5);
    const boss = h.any.stageBoss;
    h.any.revivesUsed = 99;
    h.any.player.iframe = 0;
    h.any.player.hp = 1;
    h.any.hurtPlayer(9999);
    expect(h.g.outcome).toBe("defeat");
    h.any.kill(boss);
    expect(h.g.outcome).toBe("defeat");
    expect(h.count("victory")).toBe(0);
    expect(h.count("gameover")).toBe(1);
    expect(h.any.finish("victory")).toBe(false);
  });

  it("endless mode has no waves", () => {
    const h = makeGame(4, { mode: "endless" });
    invulnerable(h);
    run(h.g, 20);
    expect(h.g.waveIdx).toBe(-1);
    expect(h.g.stageTime).toBe(0);
  });
});

describe("wave objectives match their descriptions", () => {
  it("every goal sentence states the real target number", async () => {
    const { PROVING_GROUNDS, waveGoal } = await import("../src/game/stage");
    const { fa } = await import("../src/game/fa");
    for (const w of PROVING_GROUNDS.waves) {
      const text = waveGoal(w);
      if (w.kind === "boss") expect(text).toContain(PROVING_GROUNDS.boss.name);
      else expect(text).toContain(fa(w.target));
    }
  });

  it("the HUD view uses the same target and goal text as the data", async () => {
    const { PROVING_GROUNDS, waveGoal } = await import("../src/game/stage");
    for (let i = 0; i < 3; i++) {
      const h = makeGame(9, { mode: "stage" });
      invulnerable(h);
      h.g.devJumpToWave(i);
      run(h.g, 3.1); // the jump lands 3 s before the wave
      const v = h.g.snapshot().wave!;
      const w = PROVING_GROUNDS.waves[i];
      expect(v.target).toBe(w.target);
      expect(v.goal).toBe(waveGoal(w));
    }
  });

  it("elites wave: exactly as many objective chieftains as the goal says", async () => {
    const { PROVING_GROUNDS } = await import("../src/game/stage");
    const h = makeGame(10, { mode: "stage" });
    invulnerable(h);
    h.g.devJumpToWave(1);
    run(h.g, 3.05);
    const objectives = h.any.enemies.filter((e: any) => e.objective);
    expect(objectives.length).toBe(PROVING_GROUNDS.waves[1].target);
    expect(objectives.every((e: any) => e.elite)).toBe(true);
  });

  it("slay wave: enemies that were already on the field do not count", () => {
    const h = makeGame(11, { mode: "stage" });
    invulnerable(h);
    const old = enemyNear(h, 60);
    h.g.devJumpToWave(0);
    run(h.g, 3.05);
    expect(old.objective).toBeFalsy();
    h.any.kill(old);
    expect(h.g.snapshot().wave!.current).toBe(0);
  });

  it("hold wave: time inside the ring accumulates across exits", async () => {
    const { PROVING_GROUNDS } = await import("../src/game/stage");
    const h = makeGame(12, { mode: "stage" });
    invulnerable(h);
    h.any.spells.clear();
    h.g.devJumpToWave(2);
    run(h.g, 3.05);
    run(h.g, 5);
    const inside = h.g.snapshot().wave!.current;
    expect(inside).toBeGreaterThanOrEqual(4);
    h.any.player.x += PROVING_GROUNDS.waves[2].radius + 200; // step out
    run(h.g, 3);
    expect(h.g.snapshot().wave!.current).toBe(inside); // paused, not reset
    h.any.player.x = h.any.waveCenter.x;
    h.any.player.y = h.any.waveCenter.y;
    run(h.g, 2);
    expect(h.g.snapshot().wave!.current).toBeGreaterThan(inside);
  });
});
