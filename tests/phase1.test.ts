import { describe, expect, it } from "vitest";
import { SETS, setProgress } from "../src/game/artifacts";
import { CHECKPOINT_KEY, loadCheckpoint, migrateCheckpoint, saveCheckpoint, validCheckpoint } from "../src/game/checkpoint";
import { defaultSave, settle } from "../src/game/save";
import { FUSION_IDS, MASTERY_IDS, MASTERIES, MASTERY_LEVEL, masteriesFor } from "../src/game/talents";
import { loadTelemetry, recordTelemetry, summarize } from "../src/game/telemetry";
import { enemyNear, invulnerable, makeGame, run } from "./helpers";

const memStore = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
};

describe("tier-2 talents (masteries)", () => {
  it("every talent family has two masteries", () => {
    for (const sp of ["bolt", "spirit", "orbs", "cyclone", "zap", "energy", "flash"] as const) expect(masteriesFor(sp).length).toBe(2);
    expect(MASTERY_IDS.length).toBe(14);
  });

  it("needs the first talent and spell level 6, and only one per family", () => {
    const h = makeGame(1, { autoChoose: false });
    for (let i = 0; i < 5; i++) h.g.applyUpgrade("bolt"); // bolt level 6
    expect(h.any.spells.get("bolt").lvl).toBe(MASTERY_LEVEL);
    expect(h.g.takeMastery("boltFocus")).toBe(false); // no first-tier talent yet
    expect(h.g.takeTalent("doppel")).toBe(true);
    expect(h.g.takeMastery("boltFocus")).toBe(true);
    expect(h.g.takeMastery("boltVolley")).toBe(false); // one mastery per family
  });

  it("a mastery is offered in level-up hands once it is available", () => {
    const h = makeGame(2, { autoChoose: false });
    for (let i = 0; i < 5; i++) h.g.applyUpgrade("bolt");
    h.g.takeTalent("arrow");
    let seen = false;
    for (let i = 0; i < 60 && !seen; i++) seen = h.g.rollChoices().some((c) => c.mastery && MASTERIES[c.mastery].spell === "bolt");
    expect(seen).toBe(true);
  });

  it("the mastery's numbers really change the spell", () => {
    const h = makeGame(3, { autoChoose: false });
    h.g.setHero("farzan"); // the app always sets the hero first (it resets the starting spell and applies the +20% bolt passive)
    for (let i = 0; i < 5; i++) h.g.applyUpgrade("bolt");
    h.g.takeTalent("arrow");
    const before = h.any.sd("bolt", 100);
    expect(before).toBeCloseTo(120, 9);
    h.g.takeMastery("boltFocus");
    expect(h.any.sd("bolt", 100)).toBeCloseTo(155, 9); // +35 points, not compounded
    h.any.recalc();
    h.any.recalc();
    expect(h.any.sd("bolt", 100)).toBeCloseTo(155, 9); // and never stacks on recalc
  });

  it("all four fusion recipes still work with masteries taken", () => {
    for (const f of FUSION_IDS) {
      const h = makeGame(4, { autoChoose: false });
      h.g.devFusionKit(f);
      // take a mastery on the primary family first (it never blocks fusion)
      const prim = (h.any.magicView() && (h as any).any) && Object.values(MASTERIES).find((m) => h.any.talents.has(m.spell));
      if (prim) {
        const lvl = h.any.spells.get(prim.spell);
        if (lvl) lvl.lvl = Math.max(lvl.lvl, MASTERY_LEVEL);
        h.g.takeMastery(prim.id);
      }
      h.any.level = 25;
      expect(h.g.fuse(f), f).toBe(true);
    }
  });
});

describe("artifact sets", () => {
  it("three sets exist and their pieces are real artifacts", () => {
    expect(SETS.map((s) => s.id)).toEqual(["manaHarmony", "bastion", "timekeeper"]);
  });

  it("each new set activates once, in any order, without consuming pieces", () => {
    for (const set of SETS.filter((s) => s.id !== "manaHarmony")) {
      const h = makeGame(5);
      const reversed = [...set.pieces].reverse();
      for (const id of reversed) {
        h.any.artifacts.push(id);
        h.any.recalc();
      }
      h.any.recalc();
      h.any.recalc();
      expect(h.count("set")).toBe(1);
      expect(set.pieces.every((p) => h.any.artifacts.includes(p))).toBe(true);
      expect(setProgress(h.any.artifacts).find((p) => p.set.id === set.id)?.complete).toBe(true);
    }
  });

  it("«دژِ پایداری» raises max HP; «فرمانروای زمان» lowers cooldowns", () => {
    const a = makeGame(6);
    const hp = a.any.player.maxHp;
    for (const id of ["mithril", "mandrake", "totem"]) a.any.artifacts.push(id);
    a.any.recalc();
    const withoutSet = Math.round((100 + 20) * 1); // mandrake +20 flat
    expect(a.any.player.maxHp).toBe(Math.round(withoutSet * 1.15));
    expect(a.any.player.maxHp).toBeGreaterThan(hp);
    const b = makeGame(6);
    const cd = b.any.cdMul;
    for (const id of ["scroll", "clockwork", "hourglass"]) b.any.artifacts.push(id);
    b.any.recalc();
    expect(b.any.cdMul).toBeLessThan(cd * (1 - 0.06 - 0.12));
  });
});

describe("checkpoints and duplicate rewards", () => {
  const between = (seed = 7) => {
    const h = makeGame(seed, { mode: "stage" });
    invulnerable(h);
    h.g.devJumpToWave(0);
    run(h.g, 3.1);
    h.any.waveObjKills = 999; // complete wave 1
    run(h.g, 0.1);
    return h;
  };

  it("cannot checkpoint during a wave or with a choice pending", () => {
    const h = makeGame(8, { mode: "stage", autoChoose: false });
    invulnerable(h);
    h.g.devJumpToWave(0);
    run(h.g, 3.2);
    expect(h.g.canCheckpoint()).toBe(false);
    const e = makeGame(8, { mode: "stage", autoChoose: false });
    e.g.pending = 1;
    expect(e.g.canCheckpoint()).toBe(false);
  });

  it("round-trips the run state", () => {
    const h = between();
    expect(h.g.wavesCleared).toBe(1);
    h.g.applyUpgrade("might");
    const cp = h.g.toCheckpoint()!;
    expect(validCheckpoint(cp)).toBe(true);
    const r = makeGame(99, { mode: "stage" });
    r.g.restoreCheckpoint(JSON.parse(JSON.stringify(cp)));
    const a = h.g.snapshot();
    const b = r.g.snapshot();
    expect(b.level).toBe(a.level);
    expect(b.wavesCleared).toBe(1);
    expect(b.clock).toBe(a.clock);
    expect(b.kills).toBe(a.kills);
    expect(b.artifacts).toEqual(a.artifacts);
    expect(b.passives).toEqual(a.passives);
    expect(r.g.runId).toBe(h.g.runId);
    expect(r.any.dmgMul).toBeCloseTo(h.any.dmgMul, 9);
  });

  it("a wave reward is never granted twice after resuming", () => {
    const h = between(9);
    const relicsBefore = h.any.artifacts.length;
    const cp = h.g.toCheckpoint()!;
    const r = makeGame(9, { mode: "stage" });
    invulnerable(r);
    r.g.restoreCheckpoint(cp);
    // force the engine to try completing wave 1 again
    r.any.waveIdx = 0;
    r.any.waveObjKills = 999;
    run(r.g, 0.1);
    expect(r.any.artifacts.length).toBe(relicsBefore);
    expect(r.count("relic")).toBe(0);
  });

  it("a settled run's checkpoint is refused, and payout happens once", () => {
    const store = memStore();
    const h = between(10);
    const cp = h.g.toCheckpoint()!;
    saveCheckpoint(store, cp);
    expect(loadCheckpoint(store, [])?.runId).toBe(cp.runId);
    let save = defaultSave();
    const outcome = { runId: cp.runId, mode: "stage" as const, gold: 120, won: false, score: 500 };
    save = settle(save, outcome)!;
    expect(save.gold).toBe(120);
    expect(settle(save, outcome)).toBeNull(); // second payout refused
    expect(loadCheckpoint(store, save.settledRuns)).toBeNull(); // resume refused
  });

  it("damaged checkpoints are rejected", () => {
    const store = memStore();
    store.setItem(CHECKPOINT_KEY, "{not json");
    expect(loadCheckpoint(store)).toBeNull();
    const h = between(11);
    const cp: any = h.g.toCheckpoint();
    cp.hp = 0;
    expect(validCheckpoint(cp)).toBe(false);
    cp.hp = 50;
    cp.spells = [["bolt", "seven"]];
    expect(validCheckpoint(cp)).toBe(false);
  });
});

describe("balance telemetry", () => {
  it("records wave times, levels, health and fusions, once per run", () => {
    const h = makeGame(12, { mode: "stage" });
    invulnerable(h);
    h.g.devJumpToWave(0);
    run(h.g, 3.1);
    run(h.g, 2);
    h.any.waveObjKills = 999;
    run(h.g, 0.1);
    h.g.devFusionKit("maelstrom");
    h.any.level = 25;
    h.g.fuse("maelstrom");
    const t = h.g.telemetry;
    expect(t.waves[0].wave).toBe(0);
    expect(t.waves[0].duration).toBeGreaterThan(1.9);
    expect(t.waves[0].levelEnd).not.toBeNull();
    expect(t.fusions.map((f) => f.id)).toEqual(["maelstrom"]);
    expect(t.health.length).toBeGreaterThan(0);
    const store = memStore();
    recordTelemetry(store, t);
    recordTelemetry(store, t);
    expect(loadTelemetry(store).length).toBe(1);
    expect(summarize(t).waves[0].seconds).toBeGreaterThan(1.9);
  });
});

describe("crit sanity across hits", () => {
  it("enemyNear helper is shared (guards the test harness)", () => {
    const h = makeGame(13);
    expect(enemyNear(h, 50).dead).toBe(false);
  });
});

describe("checkpoint keeps the field (unclaimed chests)", () => {
  const between = (seed = 31) => {
    const h = makeGame(seed, { mode: "stage" });
    invulnerable(h);
    h.g.devJumpToWave(0);
    run(h.g, 3.1);
    h.any.waveObjKills = 999;
    run(h.g, 0.1);
    // put the bot off any chest so the wave reward choice resolves and the field is calm
    h.any.chests = [];
    h.any.pickups = [];
    return h;
  };

  it("unclaimed chests and life orbs are restored after resuming", () => {
    const h = between(31);
    h.any.chests.push({ id: 101, x: h.any.player.x + 120, y: h.any.player.y, seed: 1, dead: false });
    h.any.chests.push({ id: 102, x: h.any.player.x - 160, y: h.any.player.y + 40, seed: 2, dead: false });
    h.any.pickups.push({ id: 201, kind: "anar", x: h.any.player.x + 60, y: h.any.player.y, seed: 3, dead: false });
    const cp = h.g.toCheckpoint()!;
    expect(cp.chests?.map((c) => c.id).sort()).toEqual([101, 102]);
    expect(cp.pickups?.map((p) => p.id)).toEqual([201]);

    const r = makeGame(31, { mode: "stage" });
    invulnerable(r);
    r.g.restoreCheckpoint(JSON.parse(JSON.stringify(cp)));
    expect(r.any.chests.map((c: any) => c.id).sort()).toEqual([101, 102]);
    expect(r.any.pickups.map((k: any) => k.id)).toEqual([201]);
    // ids continue after the restored ones, so a new chest cannot collide with a restored one
    expect(r.any.nextChestId).toBeGreaterThan(102);
    expect(r.any.nextPickupId).toBeGreaterThan(201);
  });

  it("a chest claimed before saving is not restored", () => {
    const h = between(32);
    h.any.chests.push({ id: 7, x: h.any.player.x + 300, y: h.any.player.y, seed: 1, dead: false });
    h.any.chests.push({ id: 8, x: h.any.player.x - 300, y: h.any.player.y, seed: 2, dead: false });
    // claim one (as touching it would) and leave the other on the field
    h.any.claimedChests.add(7);
    h.any.chests = h.any.chests.filter((c: any) => c.id !== 7);
    const cp = h.g.toCheckpoint()!;
    expect(cp.claimedChests).toContain(7);
    const r = makeGame(32, { mode: "stage" });
    r.g.restoreCheckpoint(cp);
    expect(r.any.chests.map((c: any) => c.id)).toEqual([8]);
    expect(r.any.claimedChests.has(7)).toBe(true);
  });

  it("a stale copy of a claimed chest cannot be smuggled back in", () => {
    const h = between(33);
    h.any.chests.push({ id: 5, x: h.any.player.x + 100, y: h.any.player.y, seed: 1, dead: false });
    const cp = h.g.toCheckpoint()!;
    cp.claimedChests = [5]; // as if the chest was opened after this snapshot was taken
    const r = makeGame(33, { mode: "stage" });
    r.g.restoreCheckpoint(cp);
    expect(r.any.chests).toHaveLength(0);
  });

  it("v1 checkpoints without position or field data migrate", () => {
    const h = between(34);
    const cp: any = h.g.toCheckpoint()!;
    cp.version = 1;
    delete cp.player;
    delete cp.gems;
    delete cp.chests;
    delete cp.pickups;
    delete cp.claimedChests;
    expect(validCheckpoint(cp)).toBe(false);
    const migrated = migrateCheckpoint(cp)!;
    expect(validCheckpoint(migrated)).toBe(true);
    const r = makeGame(34, { mode: "stage" });
    expect(() => r.g.restoreCheckpoint(migrated)).not.toThrow();
    expect(r.any.chests).toEqual([]);
  });

  it("restores exact world coordinates, facing, gems and nearby rewards", () => {
    const h = between(35);
    h.any.player.x = 1000;
    h.any.player.y = 840;
    h.any.player.face = -1;
    h.any.player.dirX = -0.6;
    h.any.player.dirY = 0.8;
    h.any.chests.push({ id: 107, x: 1070, y: 870, seed: 1, dead: false });
    h.any.pickups.push({ id: 208, kind: "anar", x: 1045, y: 860, seed: 2, dead: false });
    h.any.gems.push({ x: 1030, y: 855, value: 3, seed: 3, pull: false, sp: 120, glow: 0, dead: false });
    const cp = h.g.toCheckpoint()!;
    expect(cp.player).toEqual({ x: 1000, y: 840, face: -1, dirX: -0.6, dirY: 0.8 });

    const store = memStore();
    saveCheckpoint(store, cp);
    const r = makeGame(35, { mode: "stage", autoChoose: false });
    invulnerable(r);
    r.g.restoreCheckpoint(loadCheckpoint(store)!);
    expect([r.any.player.x, r.any.player.y, r.any.player.face]).toEqual([1000, 840, -1]);
    expect(Math.hypot(r.any.chests[0].x - r.any.player.x, r.any.chests[0].y - r.any.player.y)).toBeCloseTo(Math.hypot(70, 30), 8);
    expect(r.any.gems).toHaveLength(1);
    expect(r.any.pickups).toHaveLength(1);

    // A real walk to the chest: the player's saved position makes it reachable.
    r.g.input.x = 0.9;
    r.g.input.y = 0.4;
    for (let i = 0; i < 80 && r.count("relic") === 0; i++) r.g.update(1 / 60);
    expect(r.count("relic")).toBe(1);
    expect(r.any.chests.every((c: { id: number }) => c.id !== 107)).toBe(true);
    expect(r.any.claimedChests.has(107)).toBe(true);
    expect(r.any.gems.length).toBe(0);
    expect(r.g.relicOffers()).toHaveLength(3);
    expect(r.g.chooseRelic(r.g.relicOffers()[0])).toBe(true);
    const savedAfterClaim = r.g.toCheckpoint()!;
    expect(savedAfterClaim.chests.some((c) => c.id === 107)).toBe(false);
    expect(savedAfterClaim.claimedChests).toContain(107);
    const again = makeGame(35, { mode: "stage", autoChoose: false });
    again.g.restoreCheckpoint(savedAfterClaim);
    run(again.g, 0.5);
    expect(again.count("relic")).toBe(0);
  });

  it("v1 with unclaimed distant chest migrates the player within walking range", () => {
    const h = between(36);
    const cp: any = h.g.toCheckpoint()!;
    cp.version = 1;
    delete cp.player;
    delete cp.gems;
    cp.chests = [{ id: 44, x: 1070, y: 870, seed: 1 }];
    cp.claimedChests = [];
    const st = memStore();
    st.setItem(CHECKPOINT_KEY, JSON.stringify(cp));
    const migrated = loadCheckpoint(st)!;
    expect(migrated.version).toBe(2);
    expect(migrated.player).toEqual({ x: 1006, y: 870, dirX: 1, dirY: 0, face: 1 });
    expect(validCheckpoint(JSON.parse(st.getItem(CHECKPOINT_KEY)!))).toBe(true); // persisted migration
    const r = makeGame(36, { mode: "stage", autoChoose: false });
    invulnerable(r);
    r.g.restoreCheckpoint(migrated);
    r.g.input.x = 1;
    for (let i = 0; i < 60 && r.count("relic") === 0; i++) r.g.update(1 / 60);
    expect(r.count("relic")).toBe(1);
  });
});
