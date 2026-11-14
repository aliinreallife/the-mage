import { readFileSync, existsSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const PUBLIC = "public";
const BASE = "https://game.test/";
const SW_SOURCE = readFileSync(`${PUBLIC}/sw.js`, "utf8");
const CACHE = SW_SOURCE.match(/const CACHE = "([^"]+)"/)![1];

/** PNG width/height straight from the IHDR chunk. */
function pngSize(path: string) {
  const b = readFileSync(path);
  expect(b.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

/** Maps a URL on our origin to a file the static host would serve. */
function fileFor(url: string) {
  const path = new URL(url).pathname.replace(/^\//, "");
  if (path === "" || path === "index.html") return "index.html";
  return `${PUBLIC}/${path}`;
}

/**
 * A small, honest stand-in for the browser's Cache Storage + fetch, enough to run the
 * real sw.js: install, activate, and then answer requests with the network switched off.
 */
function harness() {
  let online = true;
  const stores = new Map<string, Map<string, Response>>();
  const key = (r: string | Request, ignoreSearch = false) => {
    const u = new URL(typeof r === "string" ? r : r.url, BASE);
    if (ignoreSearch) u.search = "";
    return u.href;
  };
  const open = async (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const m = stores.get(name)!;
    return {
      async addAll(urls: string[]) {
        const fetched = await Promise.all(urls.map((u) => fakeFetch(new Request(new URL(u, BASE)))));
        if (fetched.some((r) => !r.ok)) throw new TypeError("addAll: a request failed");
        urls.forEach((u, i) => m.set(key(u), fetched[i]));
      },
      async put(r: string | Request, res: Response) {
        m.set(key(r), res);
      },
      async match(r: string | Request, o?: { ignoreSearch?: boolean }) {
        const res = m.get(key(r, o?.ignoreSearch));
        return res ? res.clone() : undefined;
      },
    };
  };
  const caches = {
    open,
    async keys() {
      return [...stores.keys()];
    },
    async delete(n: string) {
      return stores.delete(n);
    },
    async match(r: string | Request, o?: { ignoreSearch?: boolean }) {
      for (const name of stores.keys()) {
        const hit = await (await open(name)).match(r, o);
        if (hit) return hit;
      }
      return undefined;
    },
  };
  async function fakeFetch(req: Request): Promise<Response> {
    if (!online) throw new TypeError("network offline");
    const f = fileFor(req.url);
    return existsSync(f) ? new Response(readFileSync(f), { status: 200 }) : new Response("missing", { status: 404 });
  }
  const listeners: Record<string, (e: any) => void> = {};
  const self = {
    location: new URL(BASE),
    addEventListener: (t: string, fn: (e: any) => void) => (listeners[t] = fn),
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  };
  runInNewContext(readFileSync(`${PUBLIC}/sw.js`, "utf8"), { self, caches, fetch: fakeFetch, URL, Promise, console });

  const run = async (type: string, extra: object = {}) => {
    let waited: Promise<unknown> = Promise.resolve();
    let responded: Promise<Response> | null = null;
    listeners[type]?.({ ...extra, waitUntil: (p: Promise<unknown>) => (waited = p), respondWith: (p: Promise<Response>) => (responded = p) });
    await waited;
    return responded ? await responded : null;
  };
  return {
    stores,
    setOnline: (v: boolean) => (online = v),
    install: () => run("install"),
    activate: () => run("activate"),
    /** Request.mode cannot be set in Node, so the worker receives a plain request object it reads the same way. */
    request: async (url: string, mode: "navigate" | "no-cors") => {
      let responded: Promise<Response> | null = null;
      listeners.fetch({ request: { url: new URL(url, BASE).href, method: "GET", mode }, respondWith: (p: Promise<Response>) => (responded = p) });
      return responded ? await responded : null;
    },
  };
}

describe("PWA assets", () => {
  // index.html is produced by the build; tests run before it exists, so serve a stand-in page
  if (!existsSync("index.html")) throw new Error("index.html missing");

  it("every icon in the manifest exists with the declared size", () => {
    const manifest = JSON.parse(readFileSync(`${PUBLIC}/manifest.webmanifest`, "utf8"));
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
    for (const icon of manifest.icons) {
      const path = `${PUBLIC}/${icon.src.replace(/^\.\//, "")}`;
      expect(existsSync(path), path).toBe(true);
      const [w, h] = icon.sizes.split("x").map(Number);
      expect(pngSize(path)).toEqual({ w, h });
    }
    expect(manifest.icons.some((i: { purpose: string }) => i.purpose.includes("maskable"))).toBe(true);
    expect(manifest.display).toBe("fullscreen");
    expect(manifest.orientation).toBe("portrait");
    expect(manifest.dir).toBe("rtl");
  });

  it("the apple touch icon referenced by index.html exists", () => {
    const html = readFileSync("index.html", "utf8");
    const m = html.match(/rel="apple-touch-icon" href="\.\/([^"]+)"/);
    expect(m).not.toBeNull();
    expect(existsSync(`${PUBLIC}/${m![1]}`)).toBe(true);
  });

  it("fonts are bundled from the project, never fetched from the internet", () => {
    const css = readFileSync("src/fonts.css", "utf8");
    const urls = [...css.matchAll(/url\("([^"]+)"\)/g)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThanOrEqual(5);
    for (const u of urls) {
      expect(u.startsWith("@fontsource/")).toBe(true);
      expect(existsSync(`node_modules/${u}`), u).toBe(true);
    }
    expect(readFileSync("index.html", "utf8")).not.toMatch(/fonts\.googleapis|fonts\.gstatic/);
  });
});

describe("service worker", () => {
  it("installs: every core file is cached", async () => {
    const h = harness();
    await h.install();
    const cache = [...h.stores.values()][0];
    const core = readFileSync(`${PUBLIC}/sw.js`, "utf8").match(/const CORE = \[([\s\S]*?)\]/)![1].match(/"[^"]+"/g)!;
    expect(cache.size).toBe(core.length);
  });

  it("install fails loudly if a core file is missing (no silent half-cache)", async () => {
    const h = harness();
    const realExists = existsSync("public/icons/icon-maskable-512.png");
    expect(realExists).toBe(true);
    // point one CORE entry at a missing file by running a modified worker
    const src = readFileSync(`${PUBLIC}/sw.js`, "utf8").replace("./icons/icon-192.png", "./icons/missing.png");
    const listeners: Record<string, (e: any) => void> = {};
    let failed = false;
    runInNewContext(src, {
      self: { location: new URL(BASE), addEventListener: (t: string, fn: any) => (listeners[t] = fn), skipWaiting: async () => {}, clients: { claim: async () => {} } },
      caches: { open: async () => ({ addAll: async (u: string[]) => { if (u.some((x) => x.includes("missing"))) throw new TypeError("404"); } }) },
      URL,
      Promise,
    });
    let p: Promise<unknown> = Promise.resolve();
    listeners.install({ waitUntil: (x: Promise<unknown>) => (p = x) });
    await p.catch(() => (failed = true));
    expect(failed).toBe(true);
    void h;
  });

  it("reloads offline: the game page is served from cache, even with a query string", async () => {
    const h = harness();
    await h.install();
    await h.activate();
    h.setOnline(false);
    const page = await h.request("./", "navigate");
    expect(page?.ok).toBe(true);
    expect(await page!.text()).toContain('id="root"');
    const withQuery = await h.request("./?from=homescreen", "navigate");
    expect(withQuery?.ok).toBe(true);
    const icon = await h.request("./icons/icon-512.png", "no-cors");
    expect(icon?.ok).toBe(true);
  });

  it("activation removes only this game's older caches", async () => {
    const h = harness();
    h.stores.set("afsungar-v3", new Map());
    h.stores.set("afsungar-v2", new Map());
    // caches belonging to other apps on the same origin must survive
    h.stores.set("other-game-v1", new Map());
    h.stores.set("not-afsungar-cache", new Map());
    h.stores.set("afsungarizer-app", new Map());
    await h.install();
    await h.activate();
    const keys = [...h.stores.keys()].sort();
    expect(keys).toContain(CACHE);
    expect(keys).not.toContain("afsungar-v3");
    expect(keys).not.toContain("afsungar-v2");
    expect(keys).toEqual([CACHE, "afsungarizer-app", "not-afsungar-cache", "other-game-v1"].sort());
  });

  it("updates from the previous game version: new game cached, old version removed, unrelated cache kept", async () => {
    const h = harness();
    h.stores.set("afsungar-v5", new Map([
      [new URL("./index.html", BASE).href, new Response("old game", { status: 200 })],
    ]));
    h.stores.set("other-game-v1", new Map());
    await h.install();
    await h.activate();
    h.setOnline(false);
    const page = await h.request("./?updated=1", "navigate");
    expect(page?.ok).toBe(true);
    expect(await page!.text()).toContain('id="root"');
    const keys = [...h.stores.keys()].sort();
    expect(keys).toContain(CACHE);
    expect(keys).toContain("other-game-v1");
    expect(keys).not.toContain("afsungar-v5");
  });

  it("updates from v3: new game is cached and an offline reload cannot serve the old version", async () => {
    const h = harness();
    h.stores.set("afsungar-v4", new Map([
      [new URL("./index.html", BASE).href, new Response("old game", { status: 200 })],
    ]));
    await h.install();
    await h.activate();
    h.setOnline(false);
    const page = await h.request("./?updated=1", "navigate");
    expect(page?.ok).toBe(true);
    expect(await page!.text()).toContain('id="root"');
    expect([...h.stores.keys()]).toEqual([CACHE]);
  });
});
