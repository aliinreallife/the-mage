/**
 * Versioned local save with migration from the original per-key storage.
 * Everything a player earns lives here so it survives app restarts.
 */
import { NO_RESEARCH, type ResearchRanks } from "./progression";

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type GameMode = "stage" | "endless";
export type DifficultyId = "normal" | "adaptive" | "brutal";

export interface SaveData {
  version: 2;
  /** best endless survival time, seconds */
  best: number;
  /** best stage result: seconds survived (or 1200 + bonus for a victory) */
  bestStage: number;
  found: string[];
  difficulty: DifficultyId;
  hero: string;
  mode: GameMode;
  reducedFx: boolean;
  gold: number;
  research: ResearchRanks;
  stats: { runs: number; victories: number; goldEarned: number };
  /** ids of runs already paid out — a run (or its checkpoint) can never be rewarded twice */
  settledRuns: string[];
}

export const SAVE_KEY = "afsungar.save";
const LEGACY = {
  best: "afsungar.best",
  found: "afsungar.found",
  difficulty: "afsungar.difficulty",
  hero: "afsungar.hero",
};

export function defaultSave(): SaveData {
  return {
    version: 2,
    best: 0,
    bestStage: 0,
    found: [],
    difficulty: "adaptive",
    hero: "farzan",
    mode: "stage",
    reducedFx: false,
    gold: 0,
    research: { ...NO_RESEARCH },
    stats: { runs: 0, victories: 0, goldEarned: 0 },
    settledRuns: [],
  };
}

const num = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : fallback);
const rank = (v: unknown) => Math.min(3, Math.floor(num(v)));

/** Coerce anything (old versions, hand-edited, half-written) into a valid save. */
export function sanitize(raw: unknown): SaveData {
  const d = defaultSave();
  if (!raw || typeof raw !== "object") return d;
  const r = raw as Record<string, unknown>;
  const research = (r.research ?? {}) as Record<string, unknown>;
  const stats = (r.stats ?? {}) as Record<string, unknown>;
  return {
    version: 2,
    best: num(r.best),
    bestStage: num(r.bestStage),
    found: Array.isArray(r.found) ? [...new Set(r.found.filter((x): x is string => typeof x === "string"))] : [],
    difficulty: r.difficulty === "normal" || r.difficulty === "brutal" || r.difficulty === "adaptive" ? r.difficulty : d.difficulty,
    hero: typeof r.hero === "string" && r.hero ? r.hero : d.hero,
    mode: r.mode === "endless" ? "endless" : "stage",
    reducedFx: r.reducedFx === true,
    gold: Math.floor(num(r.gold)),
    research: { attack: rank(research.attack), hp: rank(research.hp), pickup: rank(research.pickup) },
    stats: { runs: num(stats.runs), victories: num(stats.victories), goldEarned: num(stats.goldEarned) },
    settledRuns: Array.isArray(r.settledRuns) ? [...new Set(r.settledRuns.filter((x): x is string => typeof x === "string"))].slice(-SETTLED_KEEP) : [],
  };
}

/** How many settled run ids to remember (far more than the single checkpoint slot needs). */
export const SETTLED_KEEP = 50;

export interface RunOutcome {
  runId: string;
  mode: GameMode;
  gold: number;
  won: boolean;
  /** endless: seconds survived · stage: score (seconds, or a victory score) */
  score: number;
}

/**
 * Pay out a finished run. Pure: returns the new save, or null if this run id was
 * already settled (a duplicate end event, a replayed checkpoint, a double tap).
 */
export function settle(save: SaveData, o: RunOutcome): SaveData | null {
  if (save.settledRuns.includes(o.runId)) return null;
  return {
    ...save,
    gold: save.gold + o.gold,
    best: o.mode === "endless" ? Math.max(save.best, Math.floor(o.score)) : save.best,
    bestStage: o.mode === "stage" ? Math.max(save.bestStage, o.score) : save.bestStage,
    stats: { runs: save.stats.runs + 1, victories: save.stats.victories + (o.won ? 1 : 0), goldEarned: save.stats.goldEarned + o.gold },
    settledRuns: [...save.settledRuns, o.runId].slice(-SETTLED_KEEP),
  };
}

function readLegacy(store: KeyValueStore): Partial<SaveData> {
  const out: Partial<SaveData> = {};
  const best = Number(store.getItem(LEGACY.best));
  if (Number.isFinite(best) && best > 0) out.best = best;
  try {
    const found = JSON.parse(store.getItem(LEGACY.found) ?? "null");
    if (Array.isArray(found)) out.found = found;
  } catch {
    /* corrupted legacy list: ignore */
  }
  const diff = store.getItem(LEGACY.difficulty);
  if (diff === "normal" || diff === "adaptive" || diff === "brutal") out.difficulty = diff;
  const hero = store.getItem(LEGACY.hero);
  if (hero) out.hero = hero;
  return out;
}

/** Load the save, migrating legacy keys and recovering from corrupted data. */
export function loadSave(store: KeyValueStore | null = safeStorage()): SaveData {
  if (!store) return defaultSave();
  let raw: unknown = null;
  try {
    const text = store.getItem(SAVE_KEY);
    raw = text ? JSON.parse(text) : null;
  } catch {
    raw = null; // corrupted JSON: fall back to legacy keys / defaults
  }
  if (raw && typeof raw === "object") return sanitize(raw);
  // first launch after the update (or a corrupted save): migrate the old keys
  const migrated = sanitize({ ...defaultSave(), ...readLegacy(store) });
  writeSave(migrated, store);
  return migrated;
}

export function writeSave(data: SaveData, store: KeyValueStore | null = safeStorage()) {
  if (!store) return;
  try {
    store.setItem(SAVE_KEY, JSON.stringify(sanitize(data)));
    // keep legacy keys in step so an older build still reads the essentials
    store.setItem(LEGACY.best, String(Math.floor(data.best)));
    store.setItem(LEGACY.found, JSON.stringify(data.found));
    store.setItem(LEGACY.difficulty, data.difficulty);
    store.setItem(LEGACY.hero, data.hero);
  } catch {
    /* storage full or unavailable */
  }
}

export function safeStorage(): KeyValueStore | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}
