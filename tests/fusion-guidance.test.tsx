import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Codex } from "../src/components/Codex";
import { LevelUp } from "../src/components/LevelUp";
import { canFuse, recipePath } from "../src/game/talents";
import { makeGame } from "./helpers";

describe("fusion recipe paths", () => {
  it("seeded discoveries include different Magic Bolt recipes, not just the first recipe", () => {
    const suggested = new Set<string>();
    for (let seed = 1; seed <= 24; seed++) {
      const h = makeGame(seed, { autoChoose: false });
      h.any.spells.get("bolt").lvl = 3;
      const recommended = h.g.rollChoices().find((c) => c.guidance);
      if (recommended?.talent) suggested.add(recommended.talent);
    }
    expect(suggested).toEqual(new Set(["doppel", "firecracker", "arrow"]));
  });

  it("shows a valid step and tracks exact talent and spell levels", () => {
    const h = makeGame(42, { autoChoose: false });
    h.g.devSetLevel(25);
    expect(h.g.setFusionFocus("polymorph")).toBe(true);
    expect(recipePath("polymorph", h.g.magicView()).next).toEqual({ spell: "bolt", next: 2 });
    h.any.spells.get("bolt").lvl = 3;
    expect(recipePath("polymorph", h.g.magicView()).next).toEqual({ spell: "bolt", next: 3, talent: "doppel" });
    expect(h.g.rollChoices()[0]).toMatchObject({ id: "bolt", talent: "doppel", guidance: "polymorph" });
  });

  it("a focused path offers one actionable card at a time, without bypassing rules", () => {
    const h = makeGame(2, { autoChoose: false });
    h.g.devSetLevel(25);
    h.g.setFusionFocus("polymorph");
    const steps: string[] = [];
    for (let i = 0; i < 16 && !canFuse("polymorph", h.g.magicView()).ok; i++) {
      const hand = h.g.rollChoices();
      expect(hand).toHaveLength(3);
      const pinned = hand[0];
      expect(pinned.guidance).toBe("polymorph");
      steps.push(pinned.talent ?? `${pinned.id}:${pinned.next}`);
      expect(h.g.applyChoice(pinned)).toBe(true);
    }
    expect(steps).toContain("doppel");
    expect(steps).toContain("missile");
    expect(h.g.magicView().spellLevel("bolt")).toBeGreaterThanOrEqual(5);
    expect(h.g.magicView().spellLevel("spirit")).toBeGreaterThanOrEqual(5);
    expect(canFuse("polymorph", h.g.magicView()).ok).toBe(true);
    const fusion = h.g.rollChoices()[0];
    expect(fusion.fusion).toBe("polymorph");
    expect(h.g.applyChoice(fusion)).toBe(true);
    expect(h.any.consumed.has("spirit")).toBe(true);
    expect(h.g.setFusionFocus("fireworks")).toBe(false); // conflicting Magic Bolt fusion
  });

  it("an incompatible first-tier talent blocks focus; a player can clear a blocked focus", () => {
    const h = makeGame(3, { autoChoose: false });
    h.g.devSetLevel(25);
    h.any.spells.get("bolt").lvl = 3;
    h.g.setFusionFocus("polymorph");
    h.g.takeTalent("firecracker");
    expect(recipePath("polymorph", h.g.magicView()).status).toBe("blocked");
    expect(h.g.setFusionFocus("polymorph")).toBe(false);
    expect(h.g.setFusionFocus(null)).toBe(true);
    expect(h.g.snapshot().fusionFocus).toBeNull();
  });

  it("focus survives a checkpoint round-trip", () => {
    const h = makeGame(4, { mode: "stage", autoChoose: false });
    h.g.setFusionFocus("heavyshot");
    const cp = h.g.toCheckpoint()!;
    const r = makeGame(4, { mode: "stage", autoChoose: false });
    r.g.restoreCheckpoint(cp);
    expect(r.g.snapshot().fusionFocus).toBe("heavyshot");
    expect(r.g.rollChoices()[0].guidance).toBe("heavyshot");
  });
});

describe("Persian recipe guidance in existing screens", () => {
  it("level cards explain which recipe a recommended step advances", () => {
    const html = renderToString(
      <LevelUp level={12} choices={[{ id: "spirit", next: 3, talent: "missile", guidance: "polymorph" }, { id: "might", next: 1 }, { id: "zap", next: 1 }]} dealKey={1} onChoose={() => {}} />,
    );
    expect(html.replace(/<!-- -->/g, "")).toContain("گامِ ترکیب «چندپیکر»");
  });

  it("the pause book gives all four recipes, exact ingredients, next step and focus buttons", () => {
    const h = makeGame(5);
    h.g.setFusionFocus("polymorph");
    const html = renderToString(<Codex s={h.g.snapshot()} discovered={[]} onFusionFocus={() => {}} />);
    for (const title of ["چندپیکر", "آتش‌بازی", "شلیک سنگین", "گرداب"]) expect(html).toContain(title);
    expect(html).toContain("دوپیکر");
    expect(html).toContain("موشک جادویی");
    expect(html).toContain("گام بعد:");
    expect(html).toContain("رها کردن مسیر");
    expect(html).toContain("دنبال کردن مسیر");
  });
});