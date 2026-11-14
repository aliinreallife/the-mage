/**
 * Independent delivery verification: downloads the two release archives over HTTPS
 * from a public base URL, checks their SHA-256 against the published sums, extracts
 * them into a clean temporary directory and asserts their contents.
 *
 *   node scripts/verify-delivery.mjs https://host/downloads
 *
 * Exits non-zero on any failure, so it can gate a release.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const base = (process.argv[2] ?? "").replace(/\/+$/, "");
if (!base) {
  console.error("usage: node scripts/verify-delivery.mjs <https-base-url>");
  process.exit(2);
}
const work = mkdtempSync(join(tmpdir(), "the-mage-verify-"));
let checks = 0;
const failures = [];
const check = (name, ok, detail = "") => {
  if (ok) {
    checks++;
    console.log(`PASS  ${name}${detail ? `  — ${detail}` : ""}`);
  } else {
    failures.push(name);
    console.log(`FAIL  ${name}${detail ? `  — ${detail}` : ""}`);
  }
};
const sha = (buf) => createHash("sha256").update(buf).digest("hex");

try {
  console.log(`verifying delivery from ${base}\n`);

  // 1. published checksums
  const sumsText = await (await fetch(`${base}/SHA256SUMS.txt`)).text();
  const expected = new Map(
    sumsText
      .trim()
      .split("\n")
      .map((line) => line.trim().split(/\s+/))
      .map(([hash, name]) => [name, hash]),
  );
  check("SHA256SUMS.txt is published", expected.size >= 2, [...expected.keys()].join(", "));

  // 2. download both archives
  const files = {};
  for (const name of ["the-mage-source.zip", "the-mage-production.zip"]) {
    const res = await fetch(`${base}/${name}`);
    const buf = Buffer.from(await res.arrayBuffer());
    files[name] = buf;
    const got = sha(buf);
    check(`${name} downloads`, res.ok && buf.length > 1000, `${buf.length} bytes`);
    check(`${name} SHA-256 matches published sum`, expected.get(name) === got, got);
    writeFileSync(join(work, name), buf);
  }

  // 3. extract both
  const srcDir = join(work, "source");
  const prodDir = join(work, "production");
  mkdirSync(srcDir, { recursive: true });
  mkdirSync(prodDir, { recursive: true });
  execFileSync("unzip", ["-q", join(work, "the-mage-source.zip"), "-d", srcDir]);
  execFileSync("unzip", ["-q", join(work, "the-mage-production.zip"), "-d", prodDir]);
  check("both archives extract cleanly", true);

  // 4. source contents
  const entries = execFileSync("unzip", ["-Z1", join(work, "the-mage-source.zip")]).toString().trim().split("\n");
  const icons = ["public/icons/icon-192.png", "public/icons/icon-512.png", "public/icons/icon-maskable-512.png"];
  const shots = [
    "docs/qa/menu-360.png",
    "docs/qa/play-360.png",
    "docs/qa/pause-360.png",
    "docs/qa/menu-393.png",
    "docs/qa/play-393.png",
    "docs/qa/boss-warning-360.png",
  ];
  for (const f of icons) check(`source contains ${f}`, entries.includes(f));
  for (const f of shots) check(`source contains ${f}`, entries.includes(f));
  check("source contains tests", entries.some((e) => e.startsWith("tests/") && e.endsWith(".ts")));
  check("source contains build logs", entries.some((e) => e.startsWith("docs/logs/")));
  check("source contains browser logs", entries.some((e) => e.startsWith("docs/qa/") && e.endsWith(".log")));
  const balanceRows = entries.filter((e) => e.startsWith("docs/balance/") && e.endsWith(".jsonl")).length;
  check("source contains balance JSONL files", balanceRows >= 20, `${balanceRows} files`);
  check("source contains no private keys", !entries.some((e) => e.endsWith(".pem") || e.includes(".certs")));
  check("source contains no nested archives", !entries.some((e) => e.endsWith(".zip")));

  // 5. production contents
  const prod = execFileSync("unzip", ["-Z1", join(work, "the-mage-production.zip")]).toString().trim().split("\n");
  for (const f of ["index.html", "manifest.webmanifest", "sw.js"]) check(`production contains ${f}`, prod.includes(f));
  for (const f of ["icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png"])
    check(`production contains ${f}`, prod.includes(f));
  check("production contains no nested archives", !prod.some((e) => e.endsWith(".zip")));
  const sw = readFileSync(join(prodDir, "sw.js"), "utf8");
  check("service worker scoped to afsungar-*", sw.includes('const CACHE_PREFIX = "afsungar-"'));
  const manifest = JSON.parse(readFileSync(join(prodDir, "manifest.webmanifest"), "utf8"));
  check("manifest is installable", manifest.display === "fullscreen" && manifest.orientation === "portrait" && manifest.icons.length === 3);

  // 6. the delivered source must build and test on its own
  console.log("\nbuilding the delivered source in a clean directory…");
  const install = execFileSync("npm", ["ci"], { cwd: srcDir, stdio: "pipe" });
  check("npm ci succeeds in the delivered source", /added|vulnerabilit/i.test(install.toString() + String(install)));
  execFileSync("npx", ["tsc", "--noEmit", "-p", "tsconfig.json"], { cwd: srcDir, stdio: "pipe" });
  check("TypeScript passes in the delivered source", true);
  // vitest prints its summary to stderr and colourises it: capture both streams
  const testRun = spawnSync("npm", ["test"], { cwd: srcDir, encoding: "utf8" });
  // strip ANSI colour codes
  const plain = `${testRun.stdout ?? ""}\n${testRun.stderr ?? ""}`.replace(/\[[0-9;]*m/g, "");
  const passed = /Tests\s+(\d+)\s+passed/.exec(plain)?.[1] ?? "0";
  const suiteFiles = /Test Files\s+(\d+)\s+passed/.exec(plain)?.[1] ?? "0";
  check("tests pass in the delivered source", Number(passed) >= 100, `${passed} tests in ${suiteFiles} files`);
  execFileSync("npm", ["run", "build"], { cwd: srcDir, stdio: "pipe" });
  check("production build succeeds in the delivered source", true);
  const verify = execFileSync("node", ["scripts/verify-build.mjs"], { cwd: srcDir, stdio: "pipe" }).toString();
  const okCount = (verify.match(/^PASS/gm) ?? []).length;
  check("release checks pass in the delivered source", okCount >= 15, `${okCount} checks`);

  console.log(`\n${failures.length ? `${failures.length} FAILED` : `all ${checks} delivery checks passed`}`);
  if (failures.length) {
    for (const f of failures) console.log(`  - ${f}`);
    process.exitCode = 1;
  }
} catch (error) {
  console.error("delivery verification failed:", error.message);
  process.exitCode = 1;
} finally {
  rmSync(work, { recursive: true, force: true });
}
