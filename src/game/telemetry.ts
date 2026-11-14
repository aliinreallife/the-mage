/**
 * Balance instrumentation: what happened in a run, when. Plain data, stored locally
 * (never sent anywhere) so the stage can be tuned from real play sessions.
 */
import type { KeyValueStore } from "./save";

export interface WaveRecord {
  wave: number;
  kind: string;
  /** stage clock when the wave began (frozen during the wave) */
  clock: number;
  /** real run seconds at start and end */
  startedAt: number;
  endedAt: number | null;
  /** seconds the wave took to complete, or null if it was not completed */
  duration: number | null;
  levelStart: number;
  levelEnd: number | null;
  hpStart: number;
  hpEnd: number | null;
  maxHp: number;
  /** max HP when the wave ended (it can grow during a wave) */
  maxHpEnd: number | null;
  killsDuring: number;
}

export interface RunTelemetry {
  version: 1;
  runId: string;
  mode: "stage" | "endless";
  hero: string;
  difficulty: string;
  seed: number;
  startedAt: number;
  /** [run seconds, level] each time a level is reached */
  levels: [number, number][];
  /** fusions in the order they were created */
  fusions: { id: string; at: number; level: number }[];
  waves: WaveRecord[];
  /** health ratio sampled every 10 s of play */
  health: [number, number][];
  bossPhase2At: number | null;
  outcome: "victory" | "defeat" | "quit" | null;
  endedAt: number | null;
  kills: number;
  level: number;
  resumedFromCheckpoint: number;
}

export function newTelemetry(p: { runId: string; mode: "stage" | "endless"; hero: string; difficulty: string; seed: number }): RunTelemetry {
  return {
    version: 1,
    ...p,
    startedAt: 0,
    levels: [[0, 1]],
    fusions: [],
    waves: [],
    health: [],
    bossPhase2At: null,
    outcome: null,
    endedAt: null,
    kills: 0,
    level: 1,
    resumedFromCheckpoint: 0,
  };
}

/* ------------------------------------------------------------- storage */

export const TELEMETRY_KEY = "afsungar.telemetry";
export const TELEMETRY_KEEP = 20;

export function loadTelemetry(store: KeyValueStore): RunTelemetry[] {
  try {
    const raw = JSON.parse(store.getItem(TELEMETRY_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((r) => r && r.version === 1 && typeof r.runId === "string") : [];
  } catch {
    return [];
  }
}

/** Store a finished run; one record per runId (a resumed run replaces its earlier record). */
export function recordTelemetry(store: KeyValueStore, run: RunTelemetry) {
  const list = loadTelemetry(store).filter((r) => r.runId !== run.runId);
  list.push(run);
  try {
    store.setItem(TELEMETRY_KEY, JSON.stringify(list.slice(-TELEMETRY_KEEP)));
  } catch {
    /* storage full or unavailable: telemetry is optional */
  }
}

/** A compact summary for the balance table. */
export function summarize(run: RunTelemetry) {
  return {
    runId: run.runId,
    outcome: run.outcome,
    minutes: run.endedAt !== null ? +(run.endedAt / 60).toFixed(2) : null,
    level: run.level,
    kills: run.kills,
    fusions: run.fusions.map((f) => `${f.id}@L${f.level}`),
    waves: run.waves.map((w) => ({ wave: w.wave + 1, seconds: w.duration !== null ? +w.duration.toFixed(1) : null, level: `${w.levelStart}→${w.levelEnd ?? "?"}`, hpEnd: w.hpEnd !== null ? Math.round((100 * w.hpEnd) / (w.maxHpEnd ?? w.maxHp)) + "%" : null })),
  };
}
