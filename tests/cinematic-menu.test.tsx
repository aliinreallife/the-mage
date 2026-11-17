import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { Menu } from "../src/components/Screens";
import { HERO_MENU_ART } from "../src/components/menu-art";
import { HEROES } from "../src/game/heroes";
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
    expect(html.match(/role="radio"/g)).toHaveLength(9);
    expect(html.match(/aria-checked="true"/g)).toHaveLength(3);
    for (const text of ["آخرین افسونگر", "آغاز بازی", "انتخاب قهرمان", "میدان آزمایش", "بی‌پایان", "پژوهش", "گنجینه", "تنظیمات"]) {
      expect(html).toContain(text);
    }
    expect(html).toContain("cinematic-menu-art");
    expect(html).toContain("cinematic-menu-hero-face");
    expect(html).toContain("۳٬۲۰۰");
    expect(html).not.toContain("ادامه بازی");
    expect(html).not.toContain("شروع دست تازه");
  });

  it("changes the upper scene AND matching portrait for every playable hero", () => {
    const sceneSources = new Set<string>();
    const portraitSources = new Set<string>();
    for (const item of HEROES) {
      const art = HERO_MENU_ART[item.id];
      expect(art?.scene).toBeTruthy();
      expect(art?.portrait).toBeTruthy();
      expect(art?.ground).toBeTruthy();
      expect(art.scene).not.toBe(art.portrait);
      expect(art.scene).not.toBe(art.ground);
      sceneSources.add(art.scene);
      portraitSources.add(art.portrait);
      const html = renderToStaticMarkup(<Menu {...props} hero={item.id} />);
      expect(html).toContain(`<strong>${item.name}</strong>`);
      expect(html).toContain(`src="${art.scene}"`);
      expect(html).toContain(`src="${art.portrait}"`);
      expect(html).toContain(`src="${art.ground}"`);
      expect(html).toContain(`data-hero="${item.id}"`);
      expect(html).toContain(`aria-label="${item.name}، ${item.title}"`);
      expect(html).toContain("cinematic-menu-scenery");
      expect(html).toContain("cinematic-menu-hero-image");
    }
    expect(sceneSources.size).toBe(HEROES.length);
    expect(portraitSources.size).toBe(HEROES.length);
  });

  it("ships independently optimized WebP hero artwork for every theme", () => {
    const unique = new Set<string>();
    for (const item of HEROES) {
      for (const kind of ["scene", "portrait", "ground"] as const) {
        const file = `src/assets/cinematic/${item.id}-${kind}.webp`;
        const bytes = readFileSync(file);
        expect(bytes.subarray(0, 4).toString("ascii"), file).toBe("RIFF");
        expect(bytes.subarray(8, 12).toString("ascii"), file).toBe("WEBP");
        expect(bytes.length, file).toBeGreaterThan(kind === "scene" ? 80_000 : 18_000);
        expect(bytes.length, file).toBeLessThan(128 * 1024); // offline HTML assetsInlineLimit
        unique.add(file);
      }
    }
    expect(unique.size).toBe(HEROES.length * 3);
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
    const css = readFileSync("src/index.css", "utf8");
    const component = require("node:fs").readFileSync("src/components/CinematicMenu.tsx", "utf8");
    expect(css).toContain(".cinematic-menu-gold");
    expect(css).toContain(".cinematic-menu-settings-overlay");
    for (const name of ["farzan", "azar", "bahman", "tishtar"]) {
      expect(css).toContain(`.cinematic-menu-shell[data-hero="${name}"]`.replace("farzan", name));
    }
    expect(css).toContain(".cinematic-menu-bottom-link + .cinematic-menu-bottom-link::before");
    expect(css).toContain(".cinematic-menu-scenery");
    expect(css).toMatch(/\\.cinematic-menu-hero-options\\s*\\{[^}]*direction:\\s*ltr/s);
    expect(css).toContain("var(--ui-safe-top)");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(component).toContain("HERO_MENU_ART[hero]");
    expect(component).toContain("HERO_MENU_ART[item.id].portrait");
    expect(component).not.toContain("menu-hero-reference.webp");
    expect(component).not.toContain("menu-heroes-reference.webp");
    expect(component).toContain("role=\"dialog\"");
    expect(component).toContain("onDifficulty(item.id)");
    expect(component).toContain("onReducedFx(!reducedFx)");
  });
});
