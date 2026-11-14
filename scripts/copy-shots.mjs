/** Copy the Chromium smoke-test screenshots from /tmp into docs/qa. */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
const src = "/tmp/the-mage-browser-screenshots";
const dest = "docs/qa";
if (!existsSync(src)) {
  console.error(`no screenshots found in ${src}`);
  process.exit(1);
}
mkdirSync(dest, { recursive: true });
let n = 0;
for (const f of readdirSync(src)) {
  if (!f.endsWith(".png")) continue;
  copyFileSync(join(src, f), join(dest, f));
  n++;
  console.log(`copied ${f}`);
}
console.log(`${n} screenshot(s) copied to ${dest}`);
