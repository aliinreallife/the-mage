/**
 * Shared simulation harness for balance measurement. Identical for baseline and
 * post-change runs: only the game source differs between the two bundles.
 * Node-only, no rendering. Pure JSONL output: one JSON object per run, nothing else.
 */
import { Game } from "../src/game/engine";
import type { Difficulty } from "../src/game/engine";
import { HERO_IDS, type HeroId } from "../src/game/heroes";
import { FUSIONS, FUSION_IDS, recipesForTalent, type FusionId } from "../src/game/talents";

export { HERO_IDS };
export const FOCUS: Record<HeroId, FusionId> = {
  farzan: "fireworks",
  azar: "heavyshot",
  bahman: "maelstrom",
  tishtar: "polymorph",
};
export const STRATEGIES = ["naive", "focused"] as const;
export const DIFFICULTIES: Difficulty[] = ["normal", "adaptive", "brutal"];

/** Card preference: fusion > planned partner > talent > spell level > passive. */
export function chooseCard(g: Game, planning: boolean) {
  const hand = g.rollChoices();
  const any = g as any;
  const wanted = new Set<string>();
  if (planning) {
    for (const id of FUSION_IDS) {
      const f = FUSIONS[id];
      if (any.talents.get(f.primary.spell) === f.primary.talent || any.talents.get(f.secondary.spell) === f.secondary.talent) {
        wanted.add(f.primary.spell);
        wanted.add(f.secondary.spell);
      }
    }
  }
  const score = (c: (typeof hand)[number]) => {
    if (c.fusion) return 100;
    if (c.talent) return planning ? (recipesForTalent(c.talent).length ? 70 : 30) : 50;
    if (c.mastery) return 60;
    if (c.id === "heal") return 0;
    return 10 + c.next + (wanted.has(c.id) ? 40 : 0);
  };
  return [...hand].sort((a, b) => score(b) - score(a))[0];
}

/**
 * Kiting bot. Reads engine internals directly instead of g.snapshot() every frame
 * (snapshot allocation dominated the old harness). Behaviour matches tests/bot.ts.
 */
export function steer(g: Game) {
  const any = g as any;
  const p = any.player;
  let rx = 0;
  let ry = 0;
  for (const e of any.enemies) {
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const reach = 140 + e.r * 2;
    if (d < reach) {
      const w = ((reach - d) / reach) ** 2;
      rx += (dx / d) * w;
      ry += (dy / d) * w;
    }
  }
  for (const h of any.hazards) {
    const dx = p.x - h.x;
    const dy = p.y - h.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < 140) {
      rx += (dx / d) * 3;
      ry += (dy / d) * 3;
    }
  }
  for (const tg of any.telegraphs ?? []) {
    const dx = p.x - tg.x;
    const dy = p.y - tg.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < (tg.r ?? 90) + 30) {
      rx += (dx / d) * 4;
      ry += (dy / d) * 4;
    }
  }
  let tx = 0;
  let ty = 0;
  let best = Infinity;
  for (const c of any.chests) {
    const d2 = (c.x - p.x) ** 2 + (c.y - p.y) ** 2;
    if (d2 < best) { best = d2; tx = c.x - p.x; ty = c.y - p.y; }
  }
  if (best === Infinity) for (const gm of any.gems) {
    const d2 = (gm.x - p.x) ** 2 + (gm.y - p.y) ** 2;
    if (d2 < best && d2 < 160000) { best = d2; tx = gm.x - p.x; ty = gm.y - p.y; }
  }
  const tl = Math.hypot(tx, ty) || 1;
  const danger = Math.hypot(rx, ry);
  let ix = 0;
  let iy = 0;
  if (danger > 0.02) {
    const k = Math.min(1, danger * 3);
    ix = (rx / danger) * k + (tx / tl) * (1 - k);
    iy = (ry / danger) * k + (ty / tl) * (1 - k);
  } else if (best < Infinity) {
    ix = tx / tl;
    iy = ty / tl;
  } else {
    ix = Math.cos(g.time * 0.4);
    iy = Math.sin(g.time * 0.4);
  }
  if (any.waveIdx >= 0 && any.waveCenter) {
    const w = any.stage.waves[any.waveIdx];
    const cx = any.waveCenter.x - p.x;
    const cy = any.waveCenter.y - p.y;
    const dc = Math.hypot(cx, cy) || 1;
    if (w && dc > w.radius * 0.7) {
      const k = Math.min(1, (dc - w.radius * 0.7) / (w.radius * 0.25));
      ix = ix * (1 - k) + (cx / dc) * k;
      iy = iy * (1 - k) + (cy / dc) * k;
    }
  }
  g.input.x = ix;
  g.input.y = iy;
  if (g.ult >= 100 && any.enemies.length > 12) g.useUlt();
}

export interface RunSpec { seed: number; hero: HeroId; difficulty: Difficulty; strategy: (typeof STRATEGIES)[number] }

export function runOne({ seed, hero, difficulty, strategy }: RunSpec) {
  const planning = strategy === "focused";
  let g: Game;
  g = new Game((e) => {
    if (e.type === "levelup") {
      while (g.pendingBoon > 0) g.chooseBoon(g.rollBoons()[0]);
      while (g.pending > 0) g.applyChoice(chooseCard(g, planning));
    }
    if (e.type === "relic") {
      const offers = g.relicOffers();
      if (offers.length) g.chooseRelic(offers[0]);
    }
  }, seed);
  g.setView(720, 1280);
  g.setHero(hero);
  g.setMode("stage");
  g.setDifficulty(difficulty);
  if (planning) g.setFusionFocus(FOCUS[hero]);
  const seen = new Set<object>();
  let telegraphs = 0;
  let steps = 0;
  let bossStart: number | null = null;
  while (!g.over && steps < 60 * 60 * 32) {
    steer(g);
    if ((g as any).waveIdx === 3 && bossStart === null) bossStart = g.time;
    g.update(1 / 60);
    steps++;
    for (const tg of (g as any).telegraphs) { if (!seen.has(tg)) { seen.add(tg); telegraphs++; } }
  }
  const s = g.snapshot();
  return {
    seed, hero, difficulty, strategy,
    outcome: s.outcome ?? "cap",
    survival: Math.round(s.clock),
    level: s.level,
    kills: s.kills,
    hpPct: Math.round((s.hp / s.maxHp) * 100),
    wavesCleared: s.wavesCleared,
    earlyDeath: s.outcome === "defeat" && s.clock < 300,
    fusionCount: g.telemetry.fusions.length,
    fusions: g.telemetry.fusions.map((f) => f.id),
    bossReached: bossStart !== null,
    bossPhase2: g.telemetry.bossPhase2At !== null,
    bossFight: bossStart !== null ? +(g.time - bossStart).toFixed(1) : null,
    telegraphs,
    waveTimes: g.telemetry.waves.map((w) => (w.duration === null ? null : +w.duration.toFixed(1))),
    spells: s.spells,
    passives: s.passives,
  };
}

export function parseSeed(argv = process.argv) {
  const raw = argv.find((a) => a.startsWith("--seed="))?.split("=")[1] ?? "11";
  const seed = Number(raw);
  if (!Number.isInteger(seed) || seed < 1) throw new Error(`--seed must be a positive integer, got ${raw}`);
  return seed;
}
