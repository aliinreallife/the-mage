import { Game } from "../src/game/engine";
import { pickCard, steer } from "../tests/bot";
function play(seed: number, difficulty: "normal" | "adaptive", plan: boolean) {
  const g: Game = new Game((e) => {
    if (e.type === "levelup") { while (g.pendingBoon > 0) g.chooseBoon(g.rollBoons()[0]); while (g.pending > 0) g.applyChoice(pickCard(g, plan)); }
    if (e.type === "relic") { const o = g.relicOffers(); if (o.length) g.chooseRelic(o[0]); }
  }, seed);
  g.setView(720, 1280); g.setHero("farzan"); g.setMode("stage"); g.setDifficulty(difficulty);
  let steps = 0;
  while (!g.over && steps < 60 * 60 * 32) { steer(g); (g as any).player.iframe = Math.max((g as any).player.iframe, 0.2); g.update(1 / 60); steps++; }
  return { fusions: g.telemetry.fusions.map((f) => `${f.id}@L${f.level}`), level: g.level, spells: g.snapshot().spells.map((s) => s.id + s.lvl), outcome: g.snapshot().outcome };
}
for (const difficulty of ["normal", "adaptive"] as const)
  for (const plan of [false, true]) {
    const rs = [11, 12, 13, 14, 15, 16].map((s) => play(s, difficulty, plan));
    const withFusion = rs.filter((r) => r.fusions.length > 0).length;
    console.log(`${difficulty} ${plan ? "planning" : "naive   "}: runs with a fusion ${withFusion}/6 | ${rs.map((r) => (r.fusions.join("+") || "—") + ` (L${r.level})`).join(" | ")}`);
  }
