/**
 * Production browser smoke: Chromium, actual touch events, small portrait screens,
 * checkpoint resume, offline reload and a real service-worker update that preserves other apps' caches.
 *
 * First: npm run build && npx playwright install chromium-headless-shell
 * Then:  node scripts/browser-smoke.mjs
 * A physical Android device is NOT involved.
 */
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, join, extname, sep } from "node:path";
import { chromium } from "playwright";

const staging = process.argv.includes("--staging");
const root = resolve(process.env.DIST_DIR ?? (staging ? "/tmp/the-mage-staging" : "dist"));
const out = resolve("/tmp/the-mage-browser-screenshots");
await mkdir(out, { recursive: true });
let swVersion = "afsungar-v6";
const mime = { ".html": "text/html; charset=utf-8", ".png": "image/png", ".js": "text/javascript; charset=utf-8", ".webmanifest": "application/manifest+json" };
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const name = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
  const path = resolve(root, name);
  if (path !== root && !path.startsWith(root + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    let body = await readFile(path);
    if (name === "sw.js") body = Buffer.from(body.toString().replace("afsungar-v6", swVersion));
    res.writeHead(200, { "Content-Type": mime[extname(name)] ?? "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
let checks = 0;
const pass = (name, ok, details = "") => {
  if (!ok) throw Error(`${name} FAILED${details ? `: ${details}` : ""}`);
  checks++;
  console.log(`PASS ${name}${details ? ` (${details})` : ""}`);
};

try {
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const errors = [];

  async function portrait(width, height, offline) {
    const ctx = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(`${width}x${height}: ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error") errors.push(`${width}x${height}: ${m.text()}`); });
    await page.goto(base + "/", { waitUntil: "networkidle" });
    pass(`${width}x${height} Persian RTL`, await page.evaluate(() => document.documentElement.lang === "fa" && document.documentElement.dir === "rtl"));
    pass(`${width}x${height} no horizontal page overflow`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), await page.evaluate(() => `${document.documentElement.scrollWidth}/${window.innerWidth}`));
    const title = await page.locator("h1").boundingBox();
    pass(`${width}x${height} brand visible on first screen`, Boolean(title && title.y >= 0 && title.y + title.height < height), title ? `y=${title.y.toFixed(0)}` : "missing");
    const fonts = await page.evaluate(async () => {
      await document.fonts.ready;
      return [document.fonts.check("16px Vazirmatn"), document.fonts.check("24px Lalezar")];
    });
    pass(`${width}x${height} offline-capable fonts render`, fonts.every(Boolean), fonts.join(","));
    await page.screenshot({ path: join(out, `menu-${width}.png`) });

    if (offline) {
      await page.waitForFunction(() => navigator.serviceWorker.controller !== null, { timeout: 15_000 });
      const keys = await page.evaluate(() => caches.keys());
      pass("service worker installed and controlling the page", keys.includes("afsungar-v6"), keys.join(","));
      const entries = await page.evaluate(async () => (await (await caches.open("afsungar-v6")).keys()).map((r) => new URL(r.url).pathname));
      pass("core page, manifest, all launcher icons cached", ["/", "/index.html", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-maskable-512.png"].every((p) => entries.includes(p)), entries.join(","));
    }

    const start = page.getByRole("button", { name: /آغاز بازی با|دستِ تازه با/ });
    await start.tap();
    await page.waitForTimeout(450);
    pass(`${width}x${height} game starts on touch`, await page.locator("canvas").count() === 1 && await page.getByText("سطح", { exact: true }).count() > 0);
    const cdp = await ctx.newCDPSession(page);
    const x = 85, y = Math.round(height * 0.72);
    await page.evaluate(() => {
      window.__touchEvents = { down: 0, move: 0, up: 0 };
      const c = document.querySelector("canvas");
      c.addEventListener("pointerdown", () => window.__touchEvents.down++);
      c.addEventListener("pointermove", () => window.__touchEvents.move++);
      c.addEventListener("pointerup", () => window.__touchEvents.up++);
    });
    const pos = () => page.evaluate(() => ({ x: Number(document.querySelector("canvas").dataset.px), y: Number(document.querySelector("canvas").dataset.py) }));
    const before = await pos();
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y, id: 1 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + 58, y: y - 18, id: 1 }] });
    await page.waitForTimeout(700);
    const after = await pos();
    const moved = Math.hypot(after.x - before.x, after.y - before.y);
    pass(`${width}x${height} touch drag actually moves the player`, Number.isFinite(moved) && moved > 10, `${moved.toFixed(1)} world units`);
    await page.screenshot({ path: join(out, `play-${width}.png`) });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    const touch = await page.evaluate(() => window.__touchEvents);
    pass(`${width}x${height} native touch pointer down/move/up`, touch.down >= 1 && touch.move >= 1 && touch.up >= 1, JSON.stringify(touch));

    if (offline) {
      // The app writes a checkpoint when the browser loses focus.
      await page.evaluate(() => window.dispatchEvent(new Event("blur")));
      await page.getByRole("dialog", { name: "مکث" }).waitFor({ timeout: 5_000 });
      await page.waitForTimeout(450); // screenshot and bounds after the entrance animation
      const heading = await page.getByRole("heading", { name: "مکث" }).boundingBox();
      const resume = await page.getByRole("button", { name: "ادامه", exact: true }).boundingBox();
      pass("pause title and resume action both visible on 360x800", Boolean(heading && heading.y >= 0 && resume && resume.y + resume.height < height), `heading=${heading?.y.toFixed(0)} resume=${resume?.y.toFixed(0)}`);
      const checkpoint = await page.evaluate(() => JSON.parse(localStorage.getItem("afsungar.checkpoint")));
      pass("background blur pauses and saves the player's world position", checkpoint?.version === 2 && Number.isFinite(checkpoint.player?.x) && checkpoint.player.x > 20, checkpoint ? `x=${checkpoint.player.x.toFixed(1)}` : "missing");
      await page.screenshot({ path: join(out, "pause-360.png") });

      await ctx.setOffline(true);
      await page.reload({ waitUntil: "domcontentloaded" });
      pass("offline reload renders the Persian game", await page.locator("h1").filter({ hasText: "آخرین افسونگر" }).count() === 1);
      pass("offline reload offers recovery", await page.getByRole("button", { name: /ادامهٔ دستِ نیمه‌تمام/ }).count() === 1);
      await page.getByRole("button", { name: /ادامهٔ دستِ نیمه‌تمام/ }).tap();
      await page.waitForTimeout(400);
      pass("touch resumes the saved run offline", await page.getByText("سطح", { exact: true }).count() > 0);
      const resumed = await page.evaluate(() => ({ x: Number(document.querySelector("canvas").dataset.px), y: Number(document.querySelector("canvas").dataset.py) }));
      const drift = Math.hypot(resumed.x - checkpoint.player.x, resumed.y - checkpoint.player.y);
      pass("resumed player is at the saved world position, near saved rewards", drift < 5, `drift ${drift.toFixed(2)} units, x=${resumed.x.toFixed(1)}`);

      await ctx.setOffline(false);
      // Simulate another app on the same origin. It must survive our update.
      await page.evaluate(async () => { await caches.open("other-app-cache-v1"); });
      swVersion = "afsungar-v7"; // pretend the server deployed a new SW version
      await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());
      await page.waitForFunction(async () => {
        const reg = await navigator.serviceWorker.getRegistration();
        const keys = await caches.keys();
        return reg?.active?.state === "activated" && navigator.serviceWorker.controller?.state === "activated" && keys.includes("afsungar-v7") && !keys.includes("afsungar-v6");
      }, null, { timeout: 15_000 });
      // A reload while offline can queue an automatic update. Wait for it and
      // any in-flight activation to finish, not merely for the new cache to appear.
      await page.waitForTimeout(2_000);
      const afterUpdate = await page.evaluate(() => caches.keys());
      pass("service worker updates, removes its old cache and preserves another app's cache", afterUpdate.filter((k) => k.startsWith("afsungar-")).length === 1 && afterUpdate.includes("afsungar-v7") && afterUpdate.includes("other-app-cache-v1"), afterUpdate.join(","));
      await ctx.setOffline(true);
      await page.reload({ waitUntil: "domcontentloaded" });
      pass("updated service worker still reloads offline", await page.locator("h1").filter({ hasText: "آخرین افسونگر" }).count() === 1);
    }
    await ctx.close();
  }

  await portrait(360, 800, true);
  await portrait(393, 873, false);

  if (staging) {
    // Staging alone includes the developer panel. Production has been verified to exclude it.
    const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(`staging: ${e.message}`));
    await page.goto(base + "/?dev", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /آغاز بازی با|دستِ تازه با/ }).tap();
    await page.getByRole("button", { name: "DEV" }).tap();
    await page.getByRole("button", { name: /پرش به موج/ }).nth(3).tap();
    await page.getByRole("button", { name: "DEV" }).tap(); // close the panel so the HUD is visible
    // Boss attacks are telegraphed only briefly; poll the DOM instead of sampling once.
    await page.waitForFunction(
      () => /آستانهٔ انفجار|تیرهای نگهبان|موجِ حلقه‌ای/.test(document.body.innerText),
      null,
      { timeout: 20_000 },
    );
    const warning = await page.getByRole("alert").innerText();
    await page.screenshot({ path: join(out, "boss-warning-360.png") });
    pass("boss telegraph has a readable Persian browser warning", /ث/.test(warning), warning.replace(/\s+/g, " ").slice(0, 80));
    await page.screenshot({ path: join(out, "boss-warning-360.png") });
    await ctx.close();
  }
  pass("no browser page/console errors", errors.length === 0, errors.join(" | "));
  console.log(`BROWSER SMOKE: ${checks} passed, screenshots: ${out}`);
} catch (error) {
  console.error(`BROWSER SMOKE FAILED after ${checks} checks:`, error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}