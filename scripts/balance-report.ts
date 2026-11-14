/**
 * Stage balance report: an unprotected bot plays «میدان آزمایش» on each difficulty.
 *   npx esbuild scripts/balance-report.ts --bundle --platform=node --format=esm --outfile=/tmp/br.mjs && node /tmp/br.mjs
 */
import { Game } from "../src/game/engine";
import { summarize } from "../src/game/telemetry";
import { pickCard, steer } from "../tests/bot";

function play(seed: number, difficulty: "normal" | "adaptive" | "brutal") {
  const g: Game = new Game((e) => {
    if (e.type === "levelup") { while (g.pendingBoon > 0) g.chooseBoon(g.rollBoons()[0]); while (g.pending > 0) g.applyChoice(pickCard(g)); }
    if (e.type === "relic") { const o = g.relicOffers(); if (o.length) g.chooseRelic(o[0]); }
  }, seed);
  g.setView(720, 1280); g.setHero("farzan"); g.setMode("stage"); g.setDifficulty(difficulty);
  const hpAt: Record<string, number> = {};
  let steps = 0, bossStart: number | null = null;
  const boss0: number | null = null;
  while (!g.over && steps < 60 * 60 * 32) {
    steer(g);
    if (g.waveIdx >= 0) hpAt[`w${g.waveIdx}`] = Math.round((100 * g.player.hp) / g.player.maxHp);
    if (g.waveIdx === 3 && bossStart === null) bossStart = g.time;
    g.update(1 / 60); steps++;
  }
  const s = g.snapshot();
  const sum = summarize(g.telemetry);
  return { sum, clock: s.clock, level: s.level, wavesCleared: s.wavesCleared, boss: bossStart !== null ? +(g.time - bossStart).toFixed(1) : null, hp: Math.round((100 * g.player.hp) / g.player.maxHp), hpAt, fusions: sum.fusions, waves: sum.waves };
}
const seeds = [11, 12, 13, 14, 15, 16];
for (const difficulty of ["normal", "adaptive", "brutal"] as const) {
  console.log(`\n=== ${difficulty} ===`);
  const rs = seeds.map((s) => play(s, difficulty));
  for (const [i, r] of rs.entries())
    console.log(`seed ${seeds[i]}: ${r.sum.outcome ?? "cap"} @ ${(r.clock / 60).toFixed(1)}m, waves ${r.wavesCleared}/4, L${r.level}, fusions [${r.fusions.join(",")}], boss ${r.boss ?? "-"}s, hp ${r.hp}%, wave-times ${r.waves.map((w) => `W${w.wave}:${w.seconds ?? "×"}`).join(" ")}`);
  const wins = rs.filter((r) => r.sum.outcome === "victory").length;
  const bossT = rs.map((r) => r.boss).filter((b): b is number => b !== null);
  console.log(`SUMMARY ${difficulty}: victories ${wins}/6, boss fight ${bossT.length ? `${Math.min(...bossT)}–${Math.max(...bossT)}s` : "none reached"}, ending HP ${rs.map((r) => r.hp + "%").join(",")}`);
}
