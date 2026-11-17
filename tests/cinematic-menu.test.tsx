import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Menu } from "../src/components/Screens";
const noop = () => {};

const props = {
  best: 92,
  discovered: 2,
  total: 14,
  difficulty: "adaptive" as const,
  hero: "farzan" as const,
  onHero: noop,
  onDifficulty: noop,
  onStart: noop,
  onResumeRun: noop,
  onCodex: noop,
  mode: "stage" as const,
  onMode: noop,
  gold: 3200,
  bestStage: 54,
  reducedFx: false,
  onReducedFx: noop,
  onResearch: noop,
};

describe("cinematic Persian game menu", () => {
  it("renders live hero, modes, currency and reachable primary navigation", () => {
    const html = renderToStaticMarkup(<Menu {...props} />);
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('role="radiogroup"');
    expect(html.match(/role="radio"/g)).toHaveLength(6);
    expect(html.match(/aria-checked="true"/g)).toHaveLength(2);
    for (const text of ["آخرین افسونگر", "آغاز بازی", "انتخاب قهرمان", "میدان آزمایش", "بی‌پایان", "پژوهش", "گنجینه", "تنظیمات"]) {
      expect(html).toContain(text);
    }
    expect(html).toContain("cinematic-menu-art");
    expect(html).toContain("cinematic-menu-hero-face");
    expect(html).toContain("۳٬۲۰۰");
    expect(html).not.toContain("ادامه بازی");
    expect(html).not.toContain("شروع دست تازه");
  });

  it("shows Continue and a separate New Game action only for a valid checkpoint", () => {
    const cp = { level: 12, wavesCleared: 2, clock: 143 };
    const resumed = renderToStaticMarkup(<Menu {...props} resumable={cp} />);
    expect(resumed).toContain("ادامه بازی");
    expect(resumed).toContain("شروع دست تازه");
    expect(resumed).toContain("۱۲");
    expect(resumed).toContain("۲");
    const noCallback = renderToStaticMarkup(<Menu {...props} onResumeRun={undefined} resumable={cp} />);
    expect(noCallback).toContain("آغاز بازی");
    expect(noCallback).not.toContain("ادامه بازی");
  });

  it("uses only lightweight offline art and preserves mobile safe-area and accessible settings controls", () => {
    const css = require("node:fs").readFileSync("src/index.css", "utf8") as string;
    const component = require("node:fs").readFileSync("src/components/CinematicMenu.tsx", "utf8") as string;
    expect(css).toContain(".cinematic-menu-gold");
    expect(css).toContain(".cinematic-menu-settings-overlay");
    expect(css).toContain("var(--ui-safe-top)");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(component).toContain("menu-hero-reference.webp");
    expect(component).toContain("menu-heroes-reference.webp");
    expect(component).toContain("role=\"dialog\"");
    expect(component).toContain("onDifficulty(item.id)");
    expect(component).toContain("onReducedFx(!reducedFx)");
  });
});
