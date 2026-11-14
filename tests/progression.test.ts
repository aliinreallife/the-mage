import { describe, expect, it } from "vitest";
import { ARTIFACT_IDS, RARITY, SETS, setProgress, type ArtifactId } from "../src/game/artifacts";
import { buyResearch, goldForRun, nextCost, NO_RESEARCH } from "../src/game/progression";
import { SAVE_KEY, defaultSave, loadSave, sanitize, writeSave, type KeyValueStore } from "../src/game/save";
import { makeGame } from "./helpers";

class MemoryStore implements KeyValueStore {
  map = new Map<string, string>();
  getItem(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
}

const ORIGINAL: ArtifactId[] = [
  "ruby", "mithril", "broom", "backpack", "scroll", "mandrake", "totem", "magicbullet", "torch", "mooncrystal",
  "thunderspear", "galaxycore", "dimgate", "forcefield", "spiderweb", "scythe", "clockwork", "blackcat", "hourglass",
  "pandora", "uranium", "secondheart", "exorcism", "brand",
];

describe("artifacts and sets", () => {
  it("keeps the 24 original artifacts and uses five rarity tiers", () => {
    for (const id of ORIGINAL) expect(ARTIFACT_IDS).toContain(id);
    expect(Object.keys(RARITY)).toEqual(["common", "rare", "epic", "mythic", "legendary"]);
    expect(Object.values(RARITY).map((r) => r.name)).toEqual(["معمولی", "نادر", "نفیس", "ممتاز", "افسانه‌ای"]);
  });

  it("set progress works in any acquisition order", () => {
    const pieces = SETS[0].pieces;
    const orders = [
      [0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0],
    ];
    for (const order of orders) {
      const owned: ArtifactId[] = [];
      order.forEach((idx, k) => {
        owned.push(pieces[idx]);
        const prog = setProgress(owned)[0];
        expect(prog.have).toHaveLength(k + 1);
        expect(prog.complete).toBe(k === 2);
      });
    }
  });

  it("completing «هم‌آوایی مانا» adds +10% damage and pickup once, without consuming pieces", () => {
    const h = makeGame();
    const [a, b, c] = SETS[0].pieces;
    h.any.artifacts.push(c, a);
    h.any.recalc();
    const dmgBefore = h.any.dmgMul;
    const magBefore = h.any.magnet;
    h.any.artifacts.push(b);
    h.any.recalc();
    expect(h.count("set")).toBe(1);
    // before: +6% (بلور آغازین). after: +6% and the set's +10%, the wheel itself adds no damage
    expect(h.any.dmgMul / dmgBefore).toBeCloseTo(1.16 / 1.06, 9);
    expect(h.any.magnet).toBeGreaterThan(magBefore);
    const dmgDone = h.any.dmgMul;
    for (let i = 0; i < 5; i++) h.any.recalc();
    h.g.applyUpgrade("swift");
    expect(h.count("set")).toBe(1);
    expect(h.any.dmgMul).toBeCloseTo(dmgDone, 9);
    expect(h.any.artifacts).toEqual(expect.arrayContaining([a, b, c]));
  });
});

describe("research and gold", () => {
  it("costs 100, 200 and 350 and caps at three ranks", () => {
    expect([0, 1, 2, 3].map((r) => nextCost("attack", r))).toEqual([100, 200, 350, null]);
    let state = { gold: 1000, ranks: { ...NO_RESEARCH } };
    for (let i = 0; i < 3; i++) state = buyResearch(state.gold, state.ranks, "hp")!;
    expect(state.ranks.hp).toBe(3);
    expect(state.gold).toBe(350);
    expect(buyResearch(state.gold, state.ranks, "hp")).toBeNull();
    expect(buyResearch(50, NO_RESEARCH, "attack")).toBeNull();
  });

  it("research affects the next run", () => {
    const base = makeGame();
    const h = makeGame();
    h.g.setResearch({ attack: 2, hp: 1, pickup: 3 });
    expect(h.any.dmgMul / base.any.dmgMul).toBeCloseTo(1.1, 9);
    expect(h.any.player.maxHp).toBe(110);
    expect(h.any.player.hp).toBe(110);
    expect(h.any.magnet / base.any.magnet).toBeCloseTo(1.3, 9);
  });

  it("gold rewards grow with performance", () => {
    const run = { time: 600, kills: 1500, wavesCleared: 2, victory: false, difficulty: "adaptive" as const };
    expect(goldForRun(run)).toBeGreaterThan(0);
    expect(goldForRun({ ...run, victory: true, wavesCleared: 4 })).toBeGreaterThan(goldForRun(run) + 400);
    expect(goldForRun({ ...run, difficulty: "brutal" })).toBeGreaterThan(goldForRun(run));
  });
});

describe("save data", () => {
  it("migrates the original per-key storage", () => {
    const store = new MemoryStore();
    store.setItem("afsungar.best", "312");
    store.setItem("afsungar.found", JSON.stringify(["ruby", "totem"]));
    store.setItem("afsungar.difficulty", "brutal");
    store.setItem("afsungar.hero", "azar");
    store.setItem("afsungar.muted", "1");
    const save = loadSave(store);
    expect(save.best).toBe(312);
    expect(save.found).toEqual(["ruby", "totem"]);
    expect(save.difficulty).toBe("brutal");
    expect(save.hero).toBe("azar");
    expect(store.getItem(SAVE_KEY)).not.toBeNull();
    expect(store.getItem("afsungar.muted")).toBe("1"); // sound setting untouched
  });

  it("persists gold and research across restarts", () => {
    const store = new MemoryStore();
    const save = loadSave(store);
    const bought = buyResearch(500, save.research, "attack")!;
    writeSave({ ...save, gold: bought.gold, research: bought.ranks }, store);
    const again = loadSave(store);
    expect(again.gold).toBe(400);
    expect(again.research.attack).toBe(1);
  });

  it("recovers from corrupted or hostile data", () => {
    const store = new MemoryStore();
    store.setItem(SAVE_KEY, "{not json");
    store.setItem("afsungar.best", "90");
    expect(() => loadSave(store)).not.toThrow();
    expect(loadSave(store).best).toBe(90);
    const s = sanitize({ gold: -5, research: { attack: 9, hp: "x" }, difficulty: "insane", found: ["a", "a", 3] });
    expect(s.gold).toBe(0);
    expect(s.research).toEqual({ attack: 3, hp: 0, pickup: 0 });
    expect(s.difficulty).toBe("adaptive");
    expect(s.found).toEqual(["a"]);
    expect(sanitize(null)).toEqual(defaultSave());
  });
});
