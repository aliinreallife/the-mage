/**
 * Validate every balance JSONL file: each non-empty line must be one complete JSON
 * object with the fields the reports require. Used by `npm run verify`.
 *   node scripts/check-jsonl.mjs [dir ...]
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = process.argv.slice(2).length ? process.argv.slice(2) : ["docs/balance"];
const files = [];
const walk = (p) => {
  if (statSync(p).isDirectory()) for (const n of readdirSync(p)) walk(join(p, n));
  else if (p.endsWith(".jsonl")) files.push(p);
};
for (const r of roots) walk(r);
let bad = 0;
let rows = 0;
for (const f of files) {
  const lines = readFileSync(f, "utf8").split("\n").filter((l) => l.trim());
  for (const [i, line] of lines.entries()) {
    try {
      const o = JSON.parse(line);
      if (typeof o !== "object" || o === null || Array.isArray(o)) throw new Error("not an object");
      const matrix = "outcome" in o && ("survival" in o || "clock" in o);
      const fiveMinute = "survivedAt5m" in o && "dps" in o;
      if (!("hero" in o) || !("difficulty" in o) || !("seed" in o) || !(matrix || fiveMinute)) throw new Error("unknown JSONL schema");
      rows++;
    } catch (e) {
      bad++;
      console.log(`FAIL ${f}:${i + 1} ${e.message}: ${line.slice(0, 100)}`);
    }
  }
  if (!lines.length) { bad++; console.log(`FAIL ${f}: no JSON rows`); continue; }
  console.log(`PASS ${f} (${lines.length} JSON rows)`);
}
console.log(bad ? `${bad} invalid JSONL line(s)` : `all ${rows} JSONL rows valid across ${files.length} files`);
process.exit(bad ? 1 : 0);
