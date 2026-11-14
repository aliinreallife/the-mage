import { describe, expect, it } from "vitest";
import { Game } from "../src/game/engine";
import { buyResearch, goldForRun } from "../src/game/progression";
import { defaultSave, loadSave, settle, writeSave } from "../src/game/save";
import { PROVING_GROUNDS } from "../src/game/stage";
import { pickCard, steer } from "./bot";

const memStore = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

/**
 * One complete «میدان آزمایش» run through the real engine and real choice flow.
 * The player cannot die here (iframes held), so the test reaches the end and checks
 * every system along the way; how far an unprotected bot gets is measured separately
 * in scripts/balance-report.ts.
 */
describe("a complete stage playthrough", () => {
  it("waves, upgrades, talents, fusions, boss, victory, gold and research", () => {
    const store = memStore();
    let save = defaultSave();
    writeSave(save, store);
    const events: string[] = [];
    const g: Game = new Game((e) => {
      events.push(e.type);
      if (e.type === "levelup") {
        while (g.pendingBoon > 0) g.chooseBoon(g.rollBoons()[0]);
        while (g.pending > 0) g.applyChoice(pickCard(g));
      }
      if (e.type === "relic") {
        const offers = g.relicOffers();
        if (offers.length) g.chooseRelic(offers[0]);
      }
    }, 2024);
    g.setView(720, 1280);
    g.setHero("farzan");
    g.setMode("stage");
    g.setDifficulty("normal");
    g.setResearch(save.research);
    const any = g as any;

    let steps = 0;
    while (!g.over && steps < 60 * 60 * 32) {
      any.player.iframe = 1; // cannot be hurt: we are testing systems, not balance
      steer(g);
      g.update(1 / 60);
      steps++;
    }

    const s = g.snapshot();
    // stage completed through all four waves and the warden
    expect(g.over).toBe(true);
    expect(events.filter((t) => t === "victory").length).toBe(1);
    expect(events).not.toContain("gameover");
    expect(s.wavesCleared).toBe(PROVING_GROUNDS.waves.length);
    expect(s.clock).toBe(PROVING_GROUNDS.duration);
    // all three wave rewards were granted, exactly once each
    expect([...any.rewardsGiven].sort()).toEqual([0, 1, 2]);
    // the run really used the magic systems
    expect(s.level).toBeGreaterThanOrEqual(25);
    expect(s.talents.length).toBeGreaterThan(0);
    expect(s.fusions.length).toBeGreaterThanOrEqual(1);
    expect(s.artifacts.length).toBeGreaterThanOrEqual(3);
    // telemetry has a record for every wave, each completed
    expect(g.telemetry.waves.map((w) => w.wave)).toEqual([0, 1, 2, 3]);
    expect(g.telemetry.waves.every((w) => w.duration !== null && w.duration > 0)).toBe(true);
    expect(g.telemetry.bossPhase2At).not.toBeNull();
    expect(g.telemetry.outcome).toBe("victory");

    // gold is paid once, persists, and buys research that the next run receives
    const gold = goldForRun({ time: s.clock, kills: s.kills, wavesCleared: s.wavesCleared, victory: true, difficulty: "normal" });
    expect(gold).toBeGreaterThan(400);
    save = settle(save, { runId: g.runId, mode: "stage", gold, won: true, score: s.totalWaves * 300 + 1 })!;
    expect(settle(save, { runId: g.runId, mode: "stage", gold, won: true, score: 1 })).toBeNull();
    const bought = buyResearch(save.gold, save.research, "attack")!;
    save = { ...save, gold: bought.gold, research: bought.ranks };
    writeSave(save, store);
    const reloaded = loadSave(store);
    expect(reloaded.research.attack).toBe(1);
    expect(reloaded.gold).toBe(gold - 100);
    expect(reloaded.stats.victories).toBe(1);

    const next = new Game(() => {}, 1);
    next.setHero("farzan");
    next.setResearch({ ...reloaded.research, attack: 0 });
    const plain = (next as any).dmgMul;
    next.setResearch(reloaded.research);
    expect((next as any).dmgMul / plain).toBeCloseTo(1.05, 9);
  }, 180_000);
});
