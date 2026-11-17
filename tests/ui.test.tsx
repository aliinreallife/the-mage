import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Codex } from "../src/components/Codex";
import { Hud } from "../src/components/Hud";
import { LevelUp } from "../src/components/LevelUp";
import { Research } from "../src/components/Research";
import { GameOver, Menu } from "../src/components/Screens";
import { NO_RESEARCH } from "../src/game/progression";
import { invulnerable, makeGame, run } from "./helpers";

const noop = () => {};

describe("screens render with the new systems", () => {
  it("menu offers both modes, research, gold and reduced effects", () => {
    const html = renderToString(
      <Menu
        best={0}
        discovered={2}
        total={27}
        difficulty="adaptive"
        hero="farzan"
        onHero={noop}
        onDifficulty={noop}
        onStart={noop}
        onCodex={noop}
        mode="stage"
        onMode={noop}
        gold={450}
        bestStage={0}
        reducedFx={false}
        onReducedFx={noop}
        onResearch={noop}
      />,
    );
    for (const text of ["میدان آزمایش", "بی‌پایان", "پژوهش", "۴۵۰", "جلوه‌های کمتر"]) expect(html).toContain(text);
  });

  it("HUD shows the experience number and the wave objective", () => {
    const h = makeGame(2, { mode: "stage" });
    invulnerable(h);
    h.g.devJumpToWave(0);
    run(h.g, 3.5);
    const html = renderToString(<Hud s={h.g.snapshot()} muted={false} onPause={noop} onMute={noop} onUlt={noop} />);
    expect(html).toContain("تجربه");
    expect(html).toContain("موج نخست");
    expect(html).toContain("دیوِ تازه‌رسیدهٔ این موج را بکُش");
    expect(html).toContain("۱۲۰");
  });

  it("boss telegraphs give a legible Persian warning with a countdown", () => {
    const h = makeGame(29, { mode: "stage" });
    invulnerable(h);
    h.g.devJumpToWave(3);
    run(h.g, 5.8);
    const html = renderToString(<Hud s={h.g.snapshot()} muted={false} onPause={noop} onMute={noop} onUlt={noop} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain("آستانهٔ انفجار");
    expect(html).toContain("ث");
  });

  it("talent and fusion cards use their own names and ability types", () => {
    const html = renderToString(
      <LevelUp
        level={25}
        choices={[
          { id: "bolt", next: 5, fusion: "polymorph" },
          { id: "orbs", next: 3, talent: "antigrav" },
          { id: "might", next: 1 },
        ]}
        dealKey={1}
        onChoose={noop}
      />,
    );
    expect(html).toContain("چندپیکر");
    expect(html).toContain("card-type-combination");
    expect(html).toContain("ضدجاذبه");
    expect(html).toContain("card-type-trait");
    expect(html).toContain("مصرف می‌شود");
  });

  it("victory screen and gold summary", () => {
    const h = makeGame(2, { mode: "stage" });
    invulnerable(h);
    h.g.devJumpToWave(3);
    run(h.g, 3.5);
    h.any.kill(h.any.stageBoss);
    const html = renderToString(<GameOver s={h.g.snapshot()} record best={0} victory gold={520} wallet={900} onRestart={noop} onMenu={noop} />);
    expect(html).toContain("پیروزی!");
    expect(html).toContain("۵۲۰");
  });

  it("research screen shows costs and ranks", () => {
    const html = renderToString(<Research gold={150} ranks={{ ...NO_RESEARCH, attack: 1 }} onBuy={() => true} onBack={noop} />);
    expect(html).toContain("پژوهش");
    expect(html).toContain("۲۰۰"); // next attack rank
    expect(html).toContain("۱۰۰"); // first rank of the others
  });

  it("encyclopedia shows set progress", () => {
    const h = makeGame();
    h.any.artifacts.push("crystalseed");
    const html = renderToString(<Codex s={h.g.snapshot()} discovered={["crystalseed"]} initialTab="arts" />);
    expect(html).toContain("هم‌آوایی مانا");
    expect(html).toContain("۱ / ۳");
  });
});
