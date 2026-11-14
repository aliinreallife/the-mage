/**
 * Binary assets (launcher PNGs, QA screenshots) are stored as base64 text mirrors
 * inside the source tree, because generated binary files do not survive every
 * export/snapshot of this workspace. `restore` recreates the real PNGs from the
 * mirrors; `embed` refreshes the mirrors from the real PNGs.
 *
 *   node scripts/binaries.mjs restore   # safe to run any time; only fills gaps
 *   node scripts/binaries.mjs embed     # run after new screenshots are produced
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const root = resolve(process.cwd());
const mirrorDir = join(root, "assets", "embedded");

/** Where the real files live, and the mirrors that back them. */
const TARGETS = [
  { file: "public/icons/icon-192.png", mirror: "icons/icon-192.png.b64" },
  { file: "public/icons/icon-512.png", mirror: "icons/icon-512.png.b64" },
  { file: "public/icons/icon-maskable-512.png", mirror: "icons/icon-maskable-512.png.b64" },
  { file: "docs/qa/menu-360.png", mirror: "qa/menu-360.png.b64" },
  { file: "docs/qa/play-360.png", mirror: "qa/play-360.png.b64" },
  { file: "docs/qa/pause-360.png", mirror: "qa/pause-360.png.b64" },
  { file: "docs/qa/menu-393.png", mirror: "qa/menu-393.png.b64" },
  { file: "docs/qa/play-393.png", mirror: "qa/play-393.png.b64" },
  { file: "docs/qa/boss-warning-360.png", mirror: "qa/boss-warning-360.png.b64" },
];

const mode = process.argv[2] === "embed" ? "embed" : "restore";
let restored = 0;
let embedded = 0;
let missing = 0;

if (mode === "restore") {
  for (const t of TARGETS) {
    const target = join(root, t.file);
    const mirror = join(mirrorDir, t.mirror);
    if (existsSync(target)) continue;
    if (!existsSync(mirror)) {
      missing++;
      console.log(`  MISSING  ${t.file} (no mirror)`);
      continue;
    }
    mkdirSync(dirname(target), { recursive: true });
    const buf = Buffer.from(readFileSync(mirror, "utf8").replace(/\s+/g, ""), "base64");
    // sanity: PNG signature and a plausible size
    if (buf.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" || buf.length < 500) {
      console.log(`  CORRUPT  ${t.file} (mirror invalid)`);
      missing++;
      continue;
    }
    writeFileSync(target, buf);
    restored++;
    console.log(`  restored ${t.file} (${buf.length} bytes)`);
  }
  console.log(restored ? `restored ${restored} file(s)` : "nothing to restore");
  if (missing) {
    console.log(`${missing} file(s) could not be restored; run "npm run icons" and "npm run qa:screenshots".`);
  }
} else {
  for (const t of TARGETS) {
    const target = join(root, t.file);
    const mirror = join(mirrorDir, t.mirror);
    if (!existsSync(target)) {
      console.log(`  SKIP     ${t.file} (not present)`);
      missing++;
      continue;
    }
    mkdirSync(dirname(mirror), { recursive: true });
    writeFileSync(mirror, readFileSync(target).toString("base64"));
    embedded++;
    console.log(`  mirrored ${relative(root, mirror)}`);
  }
  console.log(`embedded ${embedded} mirror(s)`);
}
