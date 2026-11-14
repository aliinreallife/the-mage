/**
 * One seed = 24 runs (4 heroes × 3 difficulties × 2 strategies). Pure JSONL to stdout.
 * Summary goes to stderr, so redirecting stdout always produces a valid JSONL file.
 *   npx esbuild scripts/matrix-runner.ts --bundle --platform=node --format=esm --outfile=/tmp/matrix.mjs
 *   node /tmp/matrix.mjs --seed=11 > seed-11.jsonl
 */
import { DIFFICULTIES, HERO_IDS, STRATEGIES, parseSeed, runOne } from "./sim-lib";
const seed = parseSeed();
const results = [];
for (const hero of HERO_IDS) for (const difficulty of DIFFICULTIES) for (const strategy of STRATEGIES) {
  results.push(runOne({ seed, hero, difficulty, strategy }));
}
for (const r of results) process.stdout.write(JSON.stringify(r) + "\n");
const wins = results.filter((r) => r.outcome === "victory").length;
console.error(`SUMMARY seed=${seed} runs=${results.length} victories=${wins} fusions=${results.filter((r) => r.fusionCount > 0).length}`);
