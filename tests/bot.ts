/** A simple player bot shared by the full-stage test and the balance script. */
import type { Game } from "../src/game/engine";

import { FUSIONS, FUSION_IDS, recipesForTalent } from "../src/game/talents";

/**
 * Card preference. `plan: true` plays like an informed player: it takes talents that lead
 * to a fusion recipe and levels the partner spells of a recipe it has started.
 * `plan: false` takes any talent and levels whatever comes up.
 */
export function pickCard(g: Game, plan = true) {
  const hand = g.rollChoices();
  const any = g as any;
  const wanted = new Set<string>();
  if (plan)
    for (const id of FUSION_IDS) {
      const f = FUSIONS[id];
      const started = any.talents.get(f.primary.spell) === f.primary.talent || any.talents.get(f.secondary.spell) === f.secondary.talent;
      if (started) {
        wanted.add(f.primary.spell);
        wanted.add(f.secondary.spell);
      }
    }
  const score = (c: (typeof hand)[number]) => {
    if (c.fusion) return 100;
    if (c.talent) return plan ? (recipesForTalent(c.talent).length ? 70 : 30) : 50;
    if (c.mastery) return 60;
    if (c.id === "heal") return 0;
    return 10 + c.next + (wanted.has(c.id) ? 40 : 0);
  };
  return [...hand].sort((a, b) => score(b) - score(a))[0];
}

/** Kite away from enemies and enemy fire, collect gems and chests, stay inside a wave's ring. */
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
    if (d2 < best) {
      best = d2;
      tx = c.x - p.x;
      ty = c.y - p.y;
    }
  }
  if (best === Infinity)
    for (const gm of any.gems) {
      const d2 = (gm.x - p.x) ** 2 + (gm.y - p.y) ** 2;
      if (d2 < best && d2 < 400 * 400) {
        best = d2;
        tx = gm.x - p.x;
        ty = gm.y - p.y;
      }
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
  // during a wave, never leave the ring: pull back toward its centre near the edge
  const wave = g.snapshot().wave;
  if (wave && any.waveCenter) {
    const w = any.stage.waves[any.waveIdx];
    const cx = any.waveCenter.x - p.x;
    const cy = any.waveCenter.y - p.y;
    const dc = Math.hypot(cx, cy);
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
