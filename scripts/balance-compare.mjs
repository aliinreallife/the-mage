/**
 * Compare two matrix directories (pure JSONL) and two five-minute directories.
 * Writes docs/balance/comparison.json and docs/evidence/BEFORE-AFTER.md.
 *   node scripts/balance-compare.mjs docs/balance/before docs/balance/after
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const [beforeDir = "docs/balance/before", afterDir = "docs/balance/after"] = process.argv.slice(2);
const load = (dir) => readdirSync(dir).filter((f) => f.endsWith(".jsonl")).sort().flatMap((f) =>
  readFileSync(join(dir, f), "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l)));
const before = load(beforeDir);
const after = load(afterDir);
if (!before.length || !after.length) throw new Error("both matrix directories must contain JSONL rows");
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const key = (r) => `${r.seed}|${r.hero}|${r.difficulty}|${r.strategy}`;
const byKey = (rows) => new Map(rows.map((r) => [key(r), r]));
const bm = byKey(before);
const am = byKey(after);
const paired = [...bm.keys()].filter((k) => am.has(k)).map((k) => ({ before: bm.get(k), after: am.get(k) }));

const summary = (rows) => ({
  runs: rows.length,
  wins: rows.filter((r) => r.outcome === "victory").length,
  earlyDeaths: rows.filter((r) => r.earlyDeath).length,
  fusionRuns: rows.filter((r) => r.fusionCount > 0).length,
  meanSurvival: Math.round(mean(rows.map((r) => r.survival))),
  medianSurvival: Math.round(median(rows.map((r) => r.survival))),
  meanLevel: +mean(rows.map((r) => r.level)).toFixed(1),
  bossPhase2: rows.filter((r) => r.bossPhase2).length,
  meanBossFight: +mean(rows.filter((r) => r.bossFight !== null).map((r) => r.bossFight)).toFixed(1),
  telegraphs: rows.reduce((a, r) => a + r.telegraphs, 0),
});
const group = (rows, k) => [...new Set(rows.map((r) => r[k]))].sort().map((v) => {
  const b = rows.filter((r) => r[k] === v && before.includes(r));
  return { [k]: v, before: summary(rows.filter((r) => r[k] === v && before.includes(r))), after: summary(rows.filter((r) => r[k] === v && after.includes(r))) };
});
const fusionCounts = (rows) => rows.reduce((acc, r) => { for (const f of r.fusions) acc[f] = (acc[f] ?? 0) + 1; return acc; }, {});
const five = (dir) => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".jsonl")).flatMap((f) =>
    readFileSync(join(dir, f), "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l)));
};
const fiveBefore = five("docs/balance/five-minute-before");
const fiveAfter = five("docs/balance/five-minute-after");
const fiveByHero = (rows) => ["farzan", "azar", "bahman", "tishtar"].map((h) => {
  const s = rows.filter((r) => r.hero === h && r.strategy === "naive");
  return s.length ? {
    hero: h,
    aliveAt5m: `${rows.filter((r) => r.hero === h && r.strategy === "naive" && r.survivedAt5m).length}/${s.length}`,
    dps: +mean(s.map((r) => r.dps)).toFixed(1),
    damageTaken: Math.round(mean(s.map((r) => r.damageTaken))),
    gems: Math.round(mean(s.map((r) => r.gemsCollected))),
    level: +mean(s.map((r) => r.level)).toFixed(1),
    distance: Math.round(mean(s.map((r) => r.distance))),
    nearEnemies: +mean(s.map((r) => r.avgNearEnemies)).toFixed(2),
  } : null;
}).filter(Boolean);

const result = {
  seeds: [...new Set(before.map((r) => r.seed))].sort((a, b) => a - b),
  before: summary(before), after: summary(after),
  paired: {
    identicalKeys: paired.length,
    winsBefore: paired.filter((p) => p.before.outcome === "victory").length,
    winsAfter: paired.filter((p) => p.after.outcome === "victory").length,
    improved: paired.filter((p) => p.before.outcome !== "victory" && p.after.outcome === "victory").length,
    regressed: paired.filter((p) => p.before.outcome === "victory" && p.after.outcome !== "victory").length,
    meanSurvivalDelta: Math.round(mean(paired.map((p) => p.after.survival - p.before.survival))),
  },
  heroes: ["farzan", "azar", "bahman", "tishtar"].map((h) => ({
    hero: h,
    before: summary(before.filter((r) => r.hero === h)),
    after: summary(after.filter((r) => r.hero === h)),
  })),
  difficulties: ["normal", "adaptive", "brutal"].map((d) => ({
    difficulty: d,
    before: summary(before.filter((r) => r.difficulty === d)),
    after: summary(after.filter((r) => r.difficulty === d)),
  })),
  strategies: ["naive", "focused"].map((s) => ({
    strategy: s,
    before: summary(before.filter((r) => r.strategy === s)),
    after: summary(after.filter((r) => r.strategy === s)),
  })),
  fusions: { before: fusionCounts(before), after: fusionCounts(after) },
  fiveMinute: { before: fiveByHero(fiveBefore), after: fiveByHero(fiveAfter) },
  grouped: { hero: group([...before, ...after], "hero"), difficulty: group([...before, ...after], "difficulty") },
};
writeFileSync("docs/balance/comparison.json", JSON.stringify(result, null, 2));

const pct = (w, n) => `${w}/${n} (${Math.round((100 * w) / n)}%)`;
const delta = (a, b, unit = "") => `${a}${unit} → ${b}${unit}`;
const row = (label, b, a) => `| ${label} | ${b} | ${a} |`;
const md = [];
md.push("# Hero balance — 240-run before/after", "");
md.push(`Seeds: ${result.seeds.join(", ")}. 4 heroes × 3 difficulties × 2 strategies × ${result.seeds.length} seeds = **${result.before.runs} before / ${result.after.runs} after** runs.`);
md.push("Simulation: scripted kiting bot in Node. **Not human play, not Android hardware.**", "");
md.push("## Overall", "", "| Metric | Before | After |", "| --- | --- | --- |");
md.push(row("Victories", pct(result.before.wins, result.before.runs), pct(result.after.wins, result.after.runs)));
md.push(row("Early deaths (<5 min)", result.before.earlyDeaths, result.after.earlyDeaths));
md.push(row("Runs with a fusion", pct(result.before.fusionRuns, result.before.runs), pct(result.after.fusionRuns, result.after.runs)));
md.push(row("Mean survival (s)", result.before.meanSurvival, result.after.meanSurvival));
md.push(row("Mediansurvival (s)", result.before.medianSurvival, result.after.medianSurvival));
md.push(row("Mean level", result.before.meanLevel, result.after.meanLevel));
md.push(row("Reached boss phase 2", result.before.bossPhase2, result.after.bossPhase2));
md.push(row("Mean boss fight (s)", result.before.meanBossFight, result.after.meanBossFight));
md.push(row("Telegraphed attacks", result.before.telegraphs, result.after.telegraphs));
md.push("", "## Matched pairs (identical seed/hero/difficulty/strategy)", "");
md.push(`- ${result.paired.identicalKeys} pairs; wins ${result.paired.winsBefore} → ${result.paired.winsAfter}; improved ${result.paired.improved}, regressed ${result.paired.regressed}, mean survival change ${result.paired.meanSurvivalDelta}s.`);
md.push("", "## By hero", "", "| Hero | Wins before | Wins after | Early deaths | Fusion runs | Mean survival |", "| --- | --- | --- | --- | --- | --- |");
for (const h of result.heroes) md.push(`| ${h.hero} | ${pct(h.before.wins, h.before.runs)} | ${pct(h.after.wins, h.after.runs)} | ${h.before.earlyDeaths} → ${h.after.earlyDeaths} | ${pct(h.before.fusionRuns, h.before.runs)} → ${pct(h.after.fusionRuns, h.after.runs)} | ${h.before.meanSurvival}s → ${h.after.meanSurvival}s |`);
md.push("", "## Hero × difficulty (wins of 20 runs)", "", "| Hero | Normal before → after | Adaptive before → after | Brutal before → after |", "| --- | --- | --- | --- |");
for (const hero of ["farzan", "azar", "bahman", "tishtar"]) {
  const cells = ["normal", "adaptive", "brutal"].map((d) => {
    const b = before.filter((r) => r.hero === hero && r.difficulty === d);
    const a = after.filter((r) => r.hero === hero && r.difficulty === d);
    return `${b.filter((r) => r.outcome === "victory").length}/${b.length} → ${a.filter((r) => r.outcome === "victory").length}/${a.length}`;
  });
  md.push(`| ${hero} | ${cells.join(" | ")} |`);
}
md.push("", "## By difficulty", "", "| Difficulty | Wins before | Wins after | Early deaths | Mean survival |", "| --- | --- | --- | --- | --- |");
for (const d of result.difficulties) md.push(`| ${d.difficulty} | ${pct(d.before.wins, d.before.runs)} | ${pct(d.after.wins, d.after.runs)} | ${d.before.earlyDeaths} → ${d.after.earlyDeaths} | ${d.before.meanSurvival}s → ${d.after.meanSurvival}s |`);
md.push("", "## By strategy", "", "| Strategy | Wins before | Wins after | Fusion runs |", "| --- | --- | --- | --- |");
for (const s of result.strategies) md.push(`| ${s.strategy} | ${pct(s.before.wins, s.before.runs)} | ${pct(s.after.wins, s.after.runs)} | ${pct(s.before.fusionRuns, s.before.runs)} → ${pct(s.after.fusionRuns, s.after.runs)} |`);
md.push("", "## Fusion recipes obtained", "", "| Recipe | Before | After |", "| --- | --- | --- |");
for (const f of ["polymorph", "fireworks", "heavyshot", "maelstrom"]) md.push(`| ${f} | ${result.fusions.before[f] ?? 0} | ${result.fusions.after[f] ?? 0} |`);
md.push("", "## First five minutes (naive builds, all difficulties)", "", "| Hero | Alive at 5m | DPS | Damage taken | Gems | Level | Distance | Enemies within 120 |", "| --- | --- | --- | --- | --- | --- | --- | --- |");
const fb = Object.fromEntries(result.fiveMinute.before.map((r) => [r.hero, r]));
for (const a of result.fiveMinute.after) {
  const b = fb[a.hero];
  if (!b) continue;
  md.push(`| ${a.hero} | ${b.aliveAt5m} → ${a.aliveAt5m} | ${b.dps} → ${a.dps} | ${b.damageTaken} → ${a.damageTaken} | ${b.gems} → ${a.gems} | ${b.level} → ${a.level} | ${b.distance} → ${a.distance} | ${b.nearEnemies} → ${a.nearEnemies} |`);
}
md.push("", "Raw JSONL: `docs/balance/before/`, `docs/balance/after/`; five-minute: `docs/balance/five-minute-{before,after}/`. Structured summary: `docs/balance/comparison.json`.", "");
writeFileSync("docs/evidence/BEFORE-AFTER.md", md.join("\n"));
console.log(md.join("\n"));
