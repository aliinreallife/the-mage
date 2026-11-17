import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Hud } from "../src/components/Hud";
import { Menu, Pause } from "../src/components/Screens";
import { LevelUp } from "../src/components/LevelUp";
import { RelicChoice } from "../src/components/RelicChoice";
import { makeGame } from "./helpers";
import { UPGRADES } from "../src/game/data";
import { readFileSync } from "node:fs";
const noop = () => {};

describe("minimal game UI and detailed pause", () => {
  const h = makeGame();
  const s = h.g.snapshot();
  it("HUD shows essential survival info, not an inventory or level badge", () => {
    const html = renderToString(<Hud s={s} muted={false} onPause={noop} onMute={noop} onUlt={noop} />);
    expect(html).toContain("جان");
    expect(html).toContain("مکث");
    expect(html).toContain("فرّ");
    expect(html).toContain("پیشرفت تجربه");
    expect(html).not.toContain("سطح");
    expect(html).not.toContain("یادگارهای این دست");
    expect(html).not.toContain(UPGRADES[s.spells[0].id].name);
  });
  it("Pause retains build, artifact, level and real derived combat information", () => {
    const html = renderToString(<Pause s={s} discovered={[]} onResume={noop} onRestart={noop} onMenu={noop} />);
    expect(html).toContain("آماده‌باش ۳ ثانیه‌ای");
    expect(html).toContain("سطح");
    expect(html).toContain("افسون‌ها و ساختار");
    expect(html).toContain("یادگارها");
    expect(html).toContain("قدرت افسون");
    expect(html).toContain(UPGRADES[s.spells[0].id].name);
  });
  it("menu keeps modes, hero selection, start and core progression reachable", () => {
    const html = renderToString(<Menu best={0} discovered={0} total={10} difficulty="adaptive" hero="farzan" onHero={noop} onDifficulty={noop} onStart={noop} onCodex={noop} mode="stage" onMode={noop} gold={0} bestStage={0} reducedFx={false} onReducedFx={noop} onResearch={noop} />);
    for (const word of ["آخرین افسونگر", "آغاز بازی", "فرزان", "بی‌پایان", "میدان آزمایش", "انتخاب قهرمان", "پژوهش", "گنجینه", "تنظیمات"]) expect(html).toContain(word);
    expect(html).toContain("cinematic-menu-hero-options");
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain("cinematic-menu-play");
  });
  it("ability choice types remain separate from relic rarity", () => {
    const css = readFileSync("src/index.css", "utf8");
    for (const tier of ["common", "rare", "epic", "mythic", "legendary"]) expect(css).toContain(`.card-${tier}`);
    const levelUp = renderToString(<LevelUp level={25} dealKey={1} choices={[{ id: "bolt", next: 5, fusion: "polymorph" }, { id: "might", next: 1 }]} onChoose={noop} />);
    const relic = renderToString(<RelicChoice offers={["crystalseed"]} held={0} onChoose={noop} />);
    expect(levelUp).toContain('data-choice-type="combination"');
    expect(levelUp).toContain('data-choice-type="passive"');
    expect(levelUp).toContain("ترکیب افسون");
    expect(levelUp).toContain("افسون غیرفعال");
    expect(levelUp).not.toContain("data-rarity");
    expect(levelUp).not.toContain("card-legendary");
    expect(levelUp).toContain("card-artwork");
    expect(relic).toContain("data-rarity");
    expect(relic).toContain("card-artwork");
  });
});
describe("touch-specific help", () => {
  it("hides desktop keyboard cues on touch devices and supplies touch instructions", () => {
    const css = readFileSync("src/index.css", "utf8");
    expect(css).toMatch(/@media \(hover: none\), \(pointer: coarse\)/);
    expect(css).toContain(".desktop-keyboard-help { display: none !important; }");
    expect(css).toContain(".touch-game-help { display: flex !important; }");
    const menu = renderToString(<Menu best={0} discovered={0} total={10} difficulty="adaptive" hero="farzan" onHero={noop} onDifficulty={noop} onStart={noop} onCodex={noop} mode="stage" onMode={noop} gold={0} bestStage={0} reducedFx={false} onReducedFx={noop} onResearch={noop} />);
    // The new menu is visual-first, and keeps controls for gameplay help in
    // the settings drawer instead of duplicating desktop keyboard hints.
    expect(menu).toContain("cinematic-menu-shell");
    expect(menu).not.toContain("desktop-keyboard-help");
    const upgrade = renderToString(<LevelUp level={2} dealKey={2} choices={[{ id: "bolt", next: 1 }]} onChoose={noop} />);
    expect(upgrade).toContain("desktop-keyboard-help");
  });
});