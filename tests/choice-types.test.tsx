import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { LevelUp } from "../src/components/LevelUp";
import { CHOICE_TYPE_LABEL, choiceTypeFor } from "../src/game/choice-types";
import { Game } from "../src/game/engine";

const noop = () => {};

describe("level-up choice types and source-reference isolation", () => {
  it("uses category, not level number, for existing playable cards", () => {
    expect(choiceTypeFor({ id: "bolt", next: 1 })).toBe("active");
    expect(choiceTypeFor({ id: "bolt", next: 7 })).toBe("active");
    expect(choiceTypeFor({ id: "might", next: 1 })).toBe("passive");
    expect(choiceTypeFor({ id: "might", next: 5 })).toBe("passive");
    expect(choiceTypeFor({ id: "bolt", next: 4, talent: "doppel" })).toBe("trait");
    expect(choiceTypeFor({ id: "bolt", next: 6, mastery: "boltFocus" })).toBe("trait");
    expect(choiceTypeFor({ id: "bolt", next: 5, fusion: "polymorph" })).toBe("combination");
    expect(choiceTypeFor({ id: "heal", next: 1 })).toBe("recovery");
    expect(Object.values(CHOICE_TYPE_LABEL)).not.toContain("نادر");
    expect(Object.values(CHOICE_TYPE_LABEL)).not.toContain("افسانه‌ای");
  });

  it("renders only type badges, never artifact rarity", () => {
    const html = renderToString(<LevelUp level={25} dealKey={1} choices={[
      { id: "bolt", next: 1 },
      { id: "might", next: 3 },
      { id: "bolt", next: 5, fusion: "polymorph" },
    ]} onChoose={noop} />);
    for (const type of ["active", "passive", "combination"])
      expect(html).toContain('data-choice-type="' + type + '"');
    expect(html).not.toContain("data-rarity");
    expect(html).not.toMatch(/card-(common|rare|epic|mythic|legendary)/);
  });

  it("does not mint fixed-level boons on source-reference level five", () => {
    const g = new Game(() => {}, 152);
    g.enableReferenceLevelingV1({ limitRatio: 0.0035 });
    expect(g.devReferenceManaGainV1(2000)).toBe(true);
    for (let level = 2; level <= 5; level++) {
      expect(g.applyChoice({ id: "heal", next: 1 })).toBe(true);
      expect(g.level).toBe(level);
      expect(g.pendingBoon).toBe(0);
      if (level < 5) expect(g.devReferenceManaGainV1(0)).toBe(true);
    }
    expect(g.referenceLevelingV1State()).toMatchObject({ level: 5, pending: null });
  });
});
