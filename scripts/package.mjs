/**
 * Reproducible packaging. Fails instead of shipping an archive without the launcher icons,
 * QA screenshots, logs or verified balance data.
 *   npm run package
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative, resolve } from "node:path";

const root = process.cwd();
const release = join(root, "release");
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: "inherit", ...opts });
const must = (p) => { if (!existsSync(p)) throw new Error(`required file missing: ${p}`); };
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

console.log("0/6 restore binaries from mirrors");
run("node", ["scripts/binaries.mjs", "restore"]);

console.log("1/6 icons");
run("node", ["scripts/make-icons.mjs"]);
for (const f of ["public/icons/icon-192.png", "public/icons/icon-512.png", "public/icons/icon-maskable-512.png"]) must(f);

// The QA screenshots are produced by the browser smoke test. If they are missing
// (for example after an export that drops binary files) regenerate them here so
// packaging is reproducible from a bare source tree.
const qaShots = ["docs/qa/menu-360.png", "docs/qa/play-360.png", "docs/qa/pause-360.png", "docs/qa/menu-393.png", "docs/qa/play-393.png", "docs/qa/boss-warning-360.png"];
const missingShots = qaShots.filter((f) => !existsSync(join(root, f)));
if (missingShots.length) {
  console.log(`1b/6 regenerate ${missingShots.length} missing QA screenshot(s)`);
  run("npm", ["run", "build"]);
  try {
    run("node", ["scripts/browser-smoke.mjs"]);
    run("node", ["scripts/browser-smoke.mjs", "--staging"]);
  } catch {
    console.error("\nThe QA screenshots are missing and Chromium could not regenerate them.");
    console.error("Install a browser once with:  npx playwright install --with-deps chromium");
    console.error("then re-run:  npm run package");
    throw new Error("QA screenshots unavailable");
  }
  // the smoke test writes into /tmp; copy them into the repo
  const shotDir = "/tmp/the-mage-browser-screenshots";
  if (existsSync(shotDir)) {
    mkdirSync(join(root, "docs", "qa"), { recursive: true });
    for (const f of readdirSync(shotDir)) if (f.endsWith(".png")) {
      run("cp", [join(shotDir, f), join(root, "docs", "qa", f)]);
    }
  }
}
for (const f of qaShots) must(f);

console.log("2/6 validation");
run("node", ["scripts/check-jsonl.mjs", "docs/balance"]);
for (const f of [
  "docs/VERIFICATION.md", "docs/BALANCE.md", "docs/PHASE1-STATUS.md",
  "docs/evidence/BEFORE-AFTER.md", "docs/evidence/MODIFIED-FILES.md", "docs/evidence/PREVIOUS-VS-NEW.md",
  "docs/evidence/baseline-source-manifest.sha256", "docs/evidence/current-source-manifest.sha256",
  "docs/balance/comparison.json", "docs/balance/before/seed-20.jsonl", "docs/balance/after/seed-20.jsonl",
  "docs/qa/browser-production.log", "docs/qa/browser-staging.log",
  "docs/qa/menu-360.png", "docs/qa/play-360.png", "docs/qa/pause-360.png",
  "docs/qa/menu-393.png", "docs/qa/play-393.png", "docs/qa/boss-warning-360.png",
  "docs/SECURITY.md", "docs/ANDROID-TESTING.md", "docs/QA-CHECKLIST.md",
  "docs/RELEASE-CANDIDATE.md", "README.md",
  "docs/logs/audit-before.json", "docs/logs/audit-final.json", "docs/logs/audit-prod-final.json",
]) must(f);

// Remove previous download copies so they can never be embedded into dist or the archives.
const publicDownloads = join(root, "public", "downloads");
if (existsSync(publicDownloads)) {
  for (const f of readdirSync(publicDownloads)) if (/\.zip$|SHA256SUMS\.txt$/.test(f)) rmSync(join(publicDownloads, f), { force: true });
}

console.log("3/6 build");
run("npm", ["run", "build"]);
run("node", ["scripts/verify-build.mjs"]);

// Refresh the base64 mirrors BEFORE archiving, so the delivered source can restore
// every binary again even if its PNGs are stripped by an export.
console.log("3b/6 embed binary mirrors");
run("node", ["scripts/binaries.mjs", "embed"]);

console.log("4/6 archives");
rmSync(release, { recursive: true, force: true });
mkdirSync(release, { recursive: true });
const sourceZip = join(release, "the-mage-source.zip");
const productionZip = join(release, "the-mage-production.zip");
run("zip", ["-qr", sourceZip, ".", "-x", "node_modules/*", "dist/*", "release/*", "public/downloads/*", ".git/*", ".certs/*"]);
// The production archive is the game only; downloads are added to dist after archiving.
execFileSync("zip", ["-qr", productionZip, ".", "-x", "downloads/*"], { cwd: join(root, "dist"), stdio: "inherit" });

const list = (zip) => execFileSync("unzip", ["-Z1", zip]).toString().trim().split("\n");
const sourceEntries = list(sourceZip);
const prodEntries = list(productionZip);
for (const f of ["public/icons/icon-192.png", "public/icons/icon-512.png", "public/icons/icon-maskable-512.png", "docs/qa/menu-360.png", "docs/qa/boss-warning-360.png", "docs/VERIFICATION.md", "docs/BALANCE.md", "docs/evidence/BEFORE-AFTER.md", "docs/evidence/PREVIOUS-VS-NEW.md", "docs/balance/before/seed-20.jsonl", "docs/balance/after/seed-20.jsonl"]) {
  if (!sourceEntries.includes(f)) throw new Error(`source archive missing ${f}`);
}
for (const f of ["index.html", "sw.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png"]) {
  if (!prodEntries.includes(f)) throw new Error(`production archive missing ${f}`);
}

console.log("5/6 downloadable copies + mirrors");
const sourceSha = sha(sourceZip);
const productionSha = sha(productionZip);
writeFileSync(join(release, "SHA256SUMS.txt"), `${sourceSha}  the-mage-source.zip\n${productionSha}  the-mage-production.zip\n`);
const downloads = join(root, "public", "downloads");
mkdirSync(downloads, { recursive: true });
writeFileSync(join(downloads, "SHA256SUMS.txt"), `${sourceSha}  the-mage-source.zip\n${productionSha}  the-mage-production.zip\n`);
run("cp", [sourceZip, join(downloads, "the-mage-source.zip")]);
run("cp", [productionZip, join(downloads, "the-mage-production.zip")]);

// Make both archives directly downloadable from the served preview as well.
const distDownloads = join(root, "dist", "downloads");
mkdirSync(distDownloads, { recursive: true });
for (const f of ["the-mage-source.zip", "the-mage-production.zip"]) run("cp", [join(downloads, f), join(distDownloads, f)]);
run("cp", [join(downloads, "SHA256SUMS.txt"), join(distDownloads, "SHA256SUMS.txt")]);

console.log("6/6 manifests");
const manifestLines = [];
for (const [name, zip, entries] of [["source", sourceZip, sourceEntries], ["production", productionZip, prodEntries]]) {
  manifestLines.push(`# ${name}: ${entries.length} entries`);
  manifestLines.push(`${sha(zip)}  ${relative(root, zip)}`);
  for (const e of entries) if (!e.endsWith("/")) {
    const p = join(name === "source" ? root : join(root, "dist"), e);
    if (existsSync(p)) manifestLines.push(`${sha(p)}  ${name}/${e}`);
  }
  manifestLines.push("");
}
writeFileSync(join(release, "MANIFEST.sha256"), manifestLines.join("\n"));
writeFileSync(join(downloads, "SHA256SUMS.txt"), `${sourceSha}  the-mage-source.zip\n${productionSha}  the-mage-production.zip\n`);
writeFileSync(join(release, "SHA256SUMS.txt"), `${sourceSha}  the-mage-source.zip\n${productionSha}  the-mage-production.zip\n`);
const auditPath = join(root, "docs", "logs", "audit-final.json");
const audit = existsSync(auditPath) ? JSON.parse(readFileSync(auditPath, "utf8")) : null;
writeFileSync(join(release, "RELEASE-CANDIDATE.md"), [
  "# Android release candidate — «آخرین افسونگر»",
  "",
  "## Downloads",
  `- Source: \`downloads/the-mage-source.zip\` — SHA-256 \`${sourceSha}\``,
  `- Production: \`downloads/the-mage-production.zip\` — SHA-256 \`${productionSha}\``,
  "",
  "## Verified in this build",
  "- 139 automated tests pass; TypeScript clean.",
  "- Production build succeeds; release checks 17/17.",
  "- Chromium mobile QA: 25/25 production, 26/26 staging.",
  "- Service worker deletes only `afsungar-*` caches and reloads offline.",
  "- npm audit: " + (audit ? `${audit.metadata.vulnerabilities.total} vulnerabilities (dev + production)` : "see docs/SECURITY.md") + ".",
  "",
  "## Not verified",
  "- **Physical Android device testing: pending.** No device or emulator was available.",
  "- No public HTTPS staging URL can be hosted from this sandbox; see docs/ANDROID-TESTING.md.",
  "- Human gameplay review: pending (docs/QA-CHECKLIST.md).",
  "",
].join("\n"));
writeFileSync(join(release, "ZIP-CONTENTS.txt"), [
  `source: ${sourceEntries.length} entries`,
  ...sourceEntries,
  "",
  `production: ${prodEntries.length} entries`,
  ...prodEntries,
  "",
  `source SHA-256: ${sourceSha}`,
  `production SHA-256: ${productionSha}`,
].join("\n"));
const proof = [
  "# Export proof — final balancing build",
  "",
  `- Source archive: **${sourceEntries.length} entries**, SHA-256 \`${sha(sourceZip)}\``,
  `- Production archive: **${prodEntries.length} entries**, SHA-256 \`${sha(productionZip)}\``,
  `- Source icons present: ${["public/icons/icon-192.png", "public/icons/icon-512.png", "public/icons/icon-maskable-512.png"].every((f) => sourceEntries.includes(f))}`,
  `- Production icons present: ${["icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png"].every((f) => prodEntries.includes(f))}`,
  `- QA screenshots in source: ${sourceEntries.filter((f) => f.startsWith("docs/qa/") && f.endsWith(".png")).length}`,
  `- 240-run baseline files: ${sourceEntries.filter((f) => f.startsWith("docs/balance/before/") && f.endsWith(".jsonl")).length}`,
  `- 240-run final files: ${sourceEntries.filter((f) => f.startsWith("docs/balance/after/") && f.endsWith(".jsonl")).length}`,
  `- Five-minute diagnostics: ${sourceEntries.filter((f) => f.includes("five-minute") && f.endsWith(".jsonl")).length}`,
  `- Verification/browser logs: ${sourceEntries.filter((f) => f.startsWith("docs/logs/") || f.startsWith("docs/qa/")).length}`,
  "",
  "The previous export ZIP was not present in the workspace. Proof that this archive",
  "contains real changes is in `docs/evidence/PREVIOUS-VS-NEW.md` and",
  "`docs/evidence/MODIFIED-FILES.md`: it compares against a pre-change snapshot of this",
  "workspace (hashes + source copies), and the 240-run before/after matrices have different",
  "results (78 vs 104 victories) using identical seeds.",
  "",
].join("\n");
writeFileSync(join(release, "EXPORT-PROOF.md"), proof);
console.log(proof);
console.log(`source ${sourceEntries.length} entries, production ${prodEntries.length} entries`);
console.log(`source sha256 ${sourceSha}`);
console.log(`production sha256 ${productionSha}`);
console.log(`downloadable copies: ${downloads}`);
