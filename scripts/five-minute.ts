/**
 * First-five-minutes diagnostic: damage, mana, movement, incoming damage, enemy pressure
 * and upgrades for every hero × difficulty × strategy. Pure JSONL on stdout.
 * Node simulation, not human or Android measurement.
 */
import { Game } from "../src/game/engine";
import { HERO_IDS } from "../src/game/heroes";
import { DIFFICULTIES, FOCUS, STRATEGIES, chooseCard, parseSeed, steer } from "./sim-lib";

const seed = parseSeed();
for (const hero of HERO_IDS) for (const difficulty of DIFFICULTIES) for (const planning of [false, true]) {
  let g: Game;
  const stats = { dealt: 0, taken: 0, hitsTaken: 0, gems: 0, gemValue: 0, distance: 0, enemySum: 0, nearSum: 0, frames: 0, maxEnemies: 0, minNearest: Infinity, nearestSum: 0 };
  g = new Game((e) => {
    if (e.type === "levelup") {
      while (g.pendingBoon > 0) g.chooseBoon(g.rollBoons()[0]);
      while (g.pending > 0) g.applyChoice(chooseCard(g, planning));
    }
    if (e.type === "relic") { const o = g.relicOffers(); if (o.length) g.chooseRelic(o[0]); }
  }, seed);
  g.setView(720, 1280); g.setHero(hero); g.setMode("stage"); g.setDifficulty(difficulty);
  if (planning) g.setFusionFocus(FOCUS[hero]);

  const any = g as any;
  const realHit = any.hit.bind(g);
  any.hit = (e: any, dmg: number, kx: number, ky: number, color: string, quiet?: boolean) => {
    const before = e.hp;
    realHit(e, dmg, kx, ky, color, quiet);
    if (Number.isFinite(before) && e.hp < before) stats.dealt += Math.min(before, before - e.hp);
  };
  const realHurt = any.hurtPlayer.bind(g);
  any.hurtPlayer = (raw: number) => {
    const before = any.player.hp;
    realHurt(raw);
    if (any.player.hp < before) { stats.taken += before - any.player.hp; stats.hitsTaken++; }
  };
  const alive = () => new Set<object>(any.gems.filter((x: any) => !x.dead));
  let lastPos = { x: any.player.x, y: any.player.y };
  let steps = 0;
  while (!g.over && steps < 60 * 300) {
    // gem collection: count gems that died during this step
    const beforeGems: any[] = [...any.gems];
    steer(g);
    g.update(1 / 60);
    for (const gm of beforeGems) if (gm.dead) { stats.gems++; stats.gemValue += gm.value; }
    const p = any.player;
    const dx = p.x - lastPos.x, dy = p.y - lastPos.y;
    stats.distance += Math.hypot(dx, dy);
    lastPos = { x: p.x, y: p.y };
    const near = any.enemies.filter((e: any) => Math.hypot(e.x - p.x, e.y - p.y) < 120).length;
    const nearest = any.enemies.reduce((m: number, e: any) => Math.min(m, Math.hypot(e.x - p.x, e.y - p.y)), Infinity);
    stats.enemySum += any.enemies.length; stats.nearSum += near; stats.nearestSum += Number.isFinite(nearest) ? nearest : 600;
    stats.maxEnemies = Math.max(stats.maxEnemies, any.enemies.length);
    stats.minNearest = Math.min(stats.minNearest, nearest);
    stats.frames++;
    steps++;
  }
  const s = g.snapshot();
  const f = stats.frames || 1;
  const row = {
    seed, hero, difficulty, strategy: planning ? "focused" : "naive",
    survivedAt5m: !g.over,
    deathSecond: g.over ? Math.round(s.time) : null,
    damageDealt: Math.round(stats.dealt),
    dps: +(stats.dealt / Math.min(300, s.time || 1)).toFixed(1),
    damageTaken: Math.round(stats.taken),
    hitsTaken: stats.hitsTaken,
    gemsCollected: stats.gems,
    gemValue: stats.gemValue,
    distance: Math.round(stats.distance),
    hpPct: Math.round((s.hp / s.maxHp) * 100),
    level: s.level,
    avgEnemies: +(stats.enemySum / f).toFixed(1),
    avgNearEnemies: +(stats.nearSum / f).toFixed(2),
    minEnemyDistance: Number.isFinite(stats.minNearest) ? +stats.minNearest.toFixed(1) : null,
    spells: s.spells, passives: s.passives,
    stageClock: Math.round(s.clock),
  };
  process.stdout.write(JSON.stringify(row) + "\n");
}
