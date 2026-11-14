/**
 * Small-portrait audit (360×800, 393×873). There is no real browser in this environment,
 * so these are structural checks on the rendered markup and source — not pixel layout.
 * Physical Android testing has NOT been performed.
 */
import { existsSync, readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Hud } from "../src/components/Hud";
import { LevelUp } from "../src/components/LevelUp";
import { Research } from "../src/components/Research";
import { GameOver, Menu } from "../src/components/Screens";
import { NO_RESEARCH } from "../src/game/progression";
import { invulnerable, makeGame, run } from "./helpers";

const noop = () => {};
const classes = (html: string) => [...html.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/));

/** Any fixed width wider than the narrowest supported phone (360 px) would overflow. */
function fixedWidthsOver(html: string, limit = 360) {
  return classes(html).filter((c) => {
    const px = c.match(/^(?:min-)?w-\[(\d+)px\]$/);
    if (px) return Number(px[1]) > limit;
    const t = c.match(/^(?:min-)?w-(\d+)$/); // tailwind spacing: n × 4 px
    return t ? Number(t[1]) * 4 > limit : false;
  });
}

const screens = () => {
  const h = makeGame(3, { mode: "stage" });
  invulnerable(h);
  h.g.devJumpToWave(0);
  run(h.g, 3.2);
  const s = h.g.snapshot();
  return {
    menu: renderToString(
      <Menu best={0} discovered={2} total={30} difficulty="adaptive" hero="farzan" onHero={noop} onDifficulty={noop} onStart={noop} onCodex={noop} mode="stage" onMode={noop} gold={450} bestStage={0} reducedFx={false} onReducedFx={noop} onResearch={noop} resumable={{ level: 12, wavesCleared: 1, clock: 330 }} onResumeRun={noop} />,
    ),
    hud: renderToString(<Hud s={s} muted={false} onPause={noop} onMute={noop} onUlt={noop} />),
    levelup: renderToString(<LevelUp level={9} choices={h.g.rollChoices()} dealKey={1} onChoose={noop} />),
    research: renderToString(<Research gold={300} ranks={NO_RESEARCH} onBuy={() => true} onBack={noop} />),
    over: renderToString(<GameOver s={s} record={false} best={100} victory={false} gold={120} wallet={500} onRestart={noop} onMenu={noop} />),
  };
};

describe("small portrait screens (structural audit)", () => {
  const all = screens();

  it("no element has a fixed width wider than a 360 px phone", () => {
    for (const [name, html] of Object.entries(all)) expect(fixedWidthsOver(html), name).toEqual([]);
  });

  it("full-screen dialogs scroll instead of clipping on short screens", () => {
    for (const name of ["menu", "levelup", "research", "over"] as const) {
      expect(classes(all[name]).includes("overflow-y-auto"), name).toBe(true);
    }
  });

  it("the HUD keeps clear of notches and the gesture bar (safe-area insets)", () => {
    expect(all.hud).toMatch(/safe-area-inset-top/);
    expect(all.hud).toMatch(/safe-area-inset-bottom/);
  });

  it("the resume button appears when a checkpoint exists", () => {
    expect(all.menu).toContain("ادامهٔ دستِ نیمه‌تمام");
  });

  it("the page is set up for full-screen portrait touch play", () => {
    const html = readFileSync("index.html", "utf8");
    expect(html).toMatch(/viewport-fit=cover/);
    expect(html).toMatch(/user-scalable=no/);
    const app = readFileSync("src/App.tsx", "utf8");
    // the canvas must not scroll or zoom the page while the thumb drags the joystick
    expect(app).toMatch(/className="block h-full w-full touch-none"/);
    expect(app).toMatch(/onPointerDown=\{onPointerDown\}/);
    expect(app).toMatch(/setPointerCapture/);
    expect(app).toMatch(/onPointerCancel/);
    // losing focus (app switch, notification shade) pauses the game
    expect(app).toMatch(/visibilitychange/);
  });

  it("the main touch buttons are at least 44 px tall", () => {
    const tall = new Set(["min-h-11", "min-h-12", "min-h-13", "h-11", "h-12", "h-13", "h-16"]);
    expect(classes(all.menu).some((c) => tall.has(c))).toBe(true);
    expect(classes(all.hud).some((c) => tall.has(c))).toBe(true);
  });
});

/**
 * Android readiness — static/simulated checks only.
 * A physical Android device was NOT available in this environment; nothing here
 * proves device performance, installer behaviour or real touch latency.
 */
describe("Android readiness (static checks)", () => {
  it("the document and manifest are Persian, portrait and right-to-left", () => {
    const html = readFileSync("index.html", "utf8");
    expect(html).toMatch(/lang="fa"/);
    expect(html).toMatch(/dir="rtl"/);
    expect(html).toMatch(/viewport-fit=cover/);
    const m = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));
    expect(m.dir).toBe("rtl");
    expect(m.lang).toBe("fa");
    expect(m.orientation).toBe("portrait");
    expect(m.display).toBe("fullscreen");
    expect(m.icons.length).toBeGreaterThanOrEqual(3);
  });

  it("launcher icons exist on disk and are referenced by the manifest", () => {
    const m = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));
    for (const icon of m.icons) {
      const p = `public/${icon.src.replace(/^\.\//, "")}`;
      expect(existsSync(p), p).toBe(true);
      const b = readFileSync(p);
      expect(b.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
      expect(`${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`).toBe(icon.sizes);
    }
  });

  it("touch: a pointer joystick with capture, cancel handling and no page scrolling", () => {
    const app = readFileSync("src/App.tsx", "utf8");
    expect(app).toMatch(/touch-none/);
    expect(app).toMatch(/onPointerDown/);
    expect(app).toMatch(/onPointerMove/);
    expect(app).toMatch(/onPointerUp/);
    expect(app).toMatch(/onPointerCancel/);
    expect(app).toMatch(/setPointerCapture/);
    expect(app).toMatch(/onContextMenu/);
  });

  it("background/resume: losing focus pauses and a checkpoint is written", () => {
    const app = readFileSync("src/App.tsx", "utf8");
    expect(app).toMatch(/visibilitychange/);
    expect(app).toMatch(/window\.addEventListener\("blur"/);
    expect(app).toMatch(/canCheckpoint\(\)\) writeCheckpoint\(\)/);
  });

  it("offline: the service worker is registered only in production, from a relative path", () => {
    const main = readFileSync("src/main.tsx", "utf8");
    expect(main).toMatch(/import\.meta\.env\.PROD/);
    expect(main).toMatch(/serviceWorker\.register\("\.\/sw\.js"\)/);
  });

  it("small-phone layout keeps its safe-area padding", () => {
    const hud = readFileSync("src/components/Hud.tsx", "utf8");
    expect(hud).toMatch(/safe-area-inset-top/);
    expect(hud).toMatch(/safe-area-inset-bottom/);
  });
});
