/**
 * Matrix balance run: four heroes × three difficulties × two build strategies.
 * Two seeds make 48 full runs; call separately with --seed=11 and --seed=12.
 *   npx esbuild scripts/broader-balance.ts --bundle --platform=node --format=esm --outfile=/tmp/the-mage-matrix.mjs
 *   node /tmp/the-mage-matrix.mjs --seed=11
 *   node /tmp/the-mage-matrix.mjs --seed=12
 * Node simulation, NOT human play or Android hardware measurements.
 */
import { Game } from "../src/game/engine";
import { HERO_IDS, type HeroId } from "../src/game/heroes";
import type { Difficulty } from "../src/game/engine";
import type { FusionId } from "../src/game/talents";
import { pickCard, steer } from "../tests/bot";

const focus: Record<HeroId, FusionId> = {
  farzan: "fireworks",
  azar: "heavyshot",
  bahman: "maelstrom",
  tishtar: "polymorph",
};
const seed = Number(process.argv.find((arg) => arg.startsWith("--seed="))?.split("=")[1] ?? 11);
if (!Number.isInteger(seed) || seed < 0) throw new Error("--seed must be a non-negative integer");

function run(hero: HeroId, difficulty: Difficulty, planning: boolean) {
  let g: Game;
  g = new Game((e) => {
    if (e.type === "levelup") {
      while (g.pendingBoon > 0) g.chooseBoon(g.rollBoons()[0]);
      while (g.pending > 0) g.applyChoice(pickCard(g, planning));
    }
    if (e.type === "relic") {
      const offers = g.relicOffers();
      if (offers.length) g.chooseRelic(offers[0]);
    }
  }, seed);
  g.setView(720, 1280);
  g.setHero(hero);
  g.setMode("stage");
  g.setDifficulty(difficulty);
  if (planning) g.setFusionFocus(focus[hero]);

  const seen = new Set<object>();
  let telegraphs = 0;
  let steps = 0;
  while (!g.over && steps < 60 * 60 * 32) {
    steer(g);
    g.update(1 / 60);
    steps++;
    for (const tg of (g as unknown as { telegraphs: object[] }).telegraphs) {
      if (!seen.has(tg)) {
        seen.add(tg);
        telegraphs++;
      }
    }
  }
  const snap = g.snapshot();
  return {
    hero, difficulty, strategy: planning ? "focused" : "naive", seed,
    outcome: snap.outcome ?? "cap", clock: Math.floor(snap.clock), level: snap.level,
    kills: snap.kills, hp: Math.round(snap.hp / snap.maxHp * 100),
    waves: snap.wavesCleared, fusions: snap.fusions.map((f) => f.fusion),
    bossPhase2: g.telemetry.bossPhase2At !== null, telegraphs,
    waveTimes: g.telemetry.waves.map((w) => w.duration === null ? null : +w.duration.toFixed(1)),
  };
}

const results: ReturnType<typeof run>[] = [];
for (const hero of HERO_IDS) {
  for (const difficulty of ["normal", "adaptive", "brutal"] as Difficulty[]) {
    for (const planning of [false, true]) {
      const result = run(hero, difficulty, planning);
      results.push(result);
      console.log(JSON.stringify(result));
    }
  }
}
console.log(`SUMMARY seed=${seed} runs=${results.length} victories=${results.filter((r) => r.outcome === "victory").length} fusions=${results.filter((r) => r.fusions.length > 0).length} bossPhase2=${results.filter((r) => r.bossPhase2).length}`);