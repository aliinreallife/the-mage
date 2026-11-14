import { Game, type GameEvent } from "../src/game/engine";

export interface Harness {
  g: Game;
  /** private engine state, for white-box assertions */
  any: any;
  events: GameEvent[];
  count: (type: GameEvent["type"]) => number;
}

/**
 * A deterministic game. By default level-ups, boons and relic offers are
 * answered immediately with the first option so long runs never stall.
 */
export function makeGame(seed = 1234, opts: { mode?: "stage" | "endless"; autoChoose?: boolean } = {}): Harness {
  const events: GameEvent[] = [];
  const auto = opts.autoChoose !== false;
  const g: Game = new Game((e) => {
    events.push(e);
    if (!auto) return;
    if (e.type === "levelup") {
      while (g.pendingBoon > 0) g.chooseBoon(g.rollBoons()[0]);
      while (g.pending > 0) g.applyChoice(g.rollChoices()[0]);
    }
    if (e.type === "relic") {
      const offers = g.relicOffers();
      if (offers.length) g.chooseRelic(offers[0]);
    }
  }, seed);
  g.setView(1280, 720);
  if (opts.mode) g.setMode(opts.mode);
  return { g, any: g as any, events, count: (type) => events.filter((e) => e.type === type).length };
}

/** Advance the fixed-step simulation by `seconds` of game time. */
export function run(g: Game, seconds: number) {
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps && !g.over; i++) g.update(1 / 60);
}

/** Make the player immune to contact damage for a while (boundary checks re-enable it). */
export function invulnerable(h: Harness, seconds = 1e6) {
  h.any.player.iframe = seconds;
}

/** Put an enemy right next to the player so spells have a target. */
export function enemyNear(h: Harness, dx = 160, dy = 0, type = "ghoul") {
  const p = h.any.player;
  const e = h.any.addEnemy(type, p.x + dx, p.y + dy);
  e.hp = e.maxHp = 1e9;
  e.speed = 0;
  return e;
}
