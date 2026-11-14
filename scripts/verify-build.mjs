/**
 * Release check for the production build in dist/:   npm run build && node scripts/verify-build.mjs
 * Fails (exit 1) if a PWA asset is missing, fonts are not bundled, or developer tools leaked in.
 */
import { existsSync, readFileSync } from "node:fs";

let failed = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
  if (!ok) failed++;
};
const png = (p) => {
  const b = readFileSync(p);
  return b.subarray(0, 8).toString("hex") === "89504e470d0a1a0a" ? { w: b.readUInt32BE(16), h: b.readUInt32BE(20) } : null;
};

const DIST = process.env.DIST_DIR ?? "dist";
const html = readFileSync(`${DIST}/index.html`, "utf8");
const manifest = JSON.parse(readFileSync(`${DIST}/manifest.webmanifest`, "utf8"));
for (const icon of manifest.icons) {
  const p = `${DIST}/` + icon.src.replace(/^\.\//, "");
  const size = existsSync(p) ? png(p) : null;
  check(`manifest icon ${icon.src} (${icon.sizes}, ${icon.purpose})`, !!size && `${size.w}x${size.h}` === icon.sizes, size ? `${size.w}x${size.h}` : "missing");
}
const sw = readFileSync(`${DIST}/sw.js`, "utf8");
const core = sw.match(/const CORE = \[([\s\S]*?)\]/)[1].match(/"([^"]+)"/g).map((s) => s.slice(1, -1));
for (const u of core) {
  const p = u === "./" ? `${DIST}/index.html` : `${DIST}/` + u.replace(/^\.\//, "");
  check(`service-worker core file ${u}`, existsSync(p));
}
const fonts = (html.match(/data:font\/woff2;base64/g) || []).length;
check("fonts inlined into the page (offline)", fonts >= 5, `${fonts} woff2 faces`);
check("no internet font requests", !/fonts\.googleapis|fonts\.gstatic/.test(html));
check("service worker registered in the page", html.includes("sw.js"));
for (const marker of ["+۱۰۰۰", "پرش به موج", "کیت ", "کپی داده‌های تعادل"]) check(`developer panel absent ("${marker}")`, !html.includes(marker));
check("apple touch icon exists", existsSync(`${DIST}/icons/icon-192.png`));
console.log(failed ? `\n${failed} check(s) FAILED` : "\nall release checks passed");
process.exit(failed ? 1 : 0);
