/**
 * Recoverable checkpoints for unfinished stage runs.
 *
 * A checkpoint is written only at calm moments (between waves, with no choice pending),
 * so it never has to capture enemies or projectiles. Reward safety:
 *   • `rewardsGiven` travels with the checkpoint, so a wave's reward cannot be granted twice;
 *   • every run has a `runId`; once a run is paid out its id is recorded in the save's
 *     `settledRuns`, and a checkpoint whose run was already settled is refused.
 */
import type { KeyValueStore } from "./save";
import type { RunTelemetry } from "./telemetry";

export const CHECKPOINT_KEY = "afsungar.checkpoint";
export const CHECKPOINT_VERSION = 2;

export interface PlayerPosition {
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  face: number;
}

export interface SavedGem {
  x: number;
  y: number;
  value: number;
  seed: number;
  pull: boolean;
  sp: number;
}

export interface Checkpoint {
  version: 2;
  runId: string;
  savedAt: number;
  mode: "stage" | "endless";
  hero: string;
  difficulty: string;
  seed: number;
  time: number;
  stageTime: number;
  wavesCleared: number;
  rewardsGiven: number[];
  kills: number;
  level: number;
  xp: number;
  hp: number;
  /** Position and facing in the same world coordinate system as the field rewards. */
  player: PlayerPosition;
  ult: number;
  revivesUsed: number;
  spells: [string, number][];
  passives: [string, number][];
  talents: [string, string][];
  masteries: [string, string][];
  fused: [string, string][];
  consumed: string[];
  artifacts: string[];
  boons: [string, number][];
  phase: number;
  /** Optional for existing v2 saves created before recipe tracking was added. */
  fusionFocus?: string | null;
  nextPhase: number;
  nextChest: number;
  /** chests still lying unclaimed on the field */
  chests: { id: number; x: number; y: number; seed: number }[];
  /** a checkpoint resumes a cleared field: chests are authored here, never taken from enemies */
  pickups: { id: number; kind: "anar" | "kahroba"; x: number; y: number; seed: number }[];
  /** Experience orbs lying on the field at the time of the checkpoint. */
  gems: SavedGem[];
  /** already claimed, so a stale copy can never be restored */
  claimedChests: number[];
  nextChestId: number;
  nextPickupId: number;
  telemetry: RunTelemetry | null;
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
const pairs = (v: unknown, second: (x: unknown) => boolean) =>
  Array.isArray(v) && v.every((p) => Array.isArray(p) && p.length === 2 && isStr(p[0]) && second(p[1]));

const validChest = (v: unknown) =>
  object(v) && isNum(v.id) && isNum(v.x) && isNum(v.y) && isNum(v.seed) && v.id > 0;
const validPickup = (v: unknown) =>
  validChest(v) && object(v) && (v.kind === "anar" || v.kind === "kahroba");
const validGem = (v: unknown) =>
  object(v) && isNum(v.x) && isNum(v.y) && isNum(v.value) && v.value > 0 &&
  isNum(v.seed) && typeof v.pull === "boolean" && isNum(v.sp);
const validPlayer = (v: unknown) =>
  object(v) && ["x", "y", "dirX", "dirY", "face"].every((k) => isNum(v[k])) &&
  (v.face === 1 || v.face === -1);

/** Validate the fields that existed in the first checkpoint format. */
function validBase(raw: unknown): raw is Record<string, unknown> {
  if (!object(raw)) return false;
  const c = raw;
  return (
    isStr(c.runId) &&
    c.runId.length > 0 &&
    (c.mode === "stage" || c.mode === "endless") &&
    isStr(c.hero) &&
    isStr(c.difficulty) &&
    ["time", "stageTime", "wavesCleared", "kills", "level", "xp", "hp", "ult", "revivesUsed", "seed", "phase", "nextPhase", "nextChest", "savedAt"].every((k) => isNum(c[k])) &&
    (c.hp as number) > 0 &&
    Array.isArray(c.rewardsGiven) && c.rewardsGiven.every(isNum) &&
    pairs(c.spells, isNum) && pairs(c.passives, isNum) &&
    pairs(c.talents, isStr) && pairs(c.masteries, isStr) &&
    pairs(c.fused, isStr) && pairs(c.boons, isNum) &&
    Array.isArray(c.consumed) && c.consumed.every(isStr) &&
    Array.isArray(c.artifacts) && c.artifacts.every(isStr) &&
    (c.chests === undefined || (Array.isArray(c.chests) && c.chests.every(validChest))) &&
    (c.pickups === undefined || (Array.isArray(c.pickups) && c.pickups.every(validPickup))) &&
    (c.claimedChests === undefined || (Array.isArray(c.claimedChests) && c.claimedChests.every(isNum)))
  );
}

/** Strict validation: a damaged or foreign checkpoint is rejected rather than half-loaded. */
export function validCheckpoint(raw: unknown): raw is Checkpoint {
  if (!validBase(raw)) return false;
  const c = raw;
  return (
    c.version === CHECKPOINT_VERSION &&
    validPlayer(c.player) &&
    Array.isArray(c.chests) && c.chests.every(validChest) &&
    Array.isArray(c.pickups) && c.pickups.every(validPickup) &&
    Array.isArray(c.gems) && c.gems.every(validGem) &&
    Array.isArray(c.claimedChests) && c.claimedChests.every(isNum) &&
    isNum(c.nextChestId) && isNum(c.nextPickupId)
    && (c.fusionFocus === undefined || c.fusionFocus === null || isStr(c.fusionFocus))
  );
}

/**
 * v1 did not record the player's position. Recover near the first unclaimed chest
 * (or pickup), not at world origin. The original position cannot be reconstructed.
 */
export function migrateCheckpoint(raw: unknown): Checkpoint | null {
  if (validCheckpoint(raw)) return raw;
  if (!validBase(raw) || raw.version !== 1) return null;
  const old = raw;
  const claimed = old.claimedChests as number[] | undefined;
  const chests = (old.chests as Checkpoint["chests"] | undefined) ?? [];
  const pickups = (old.pickups as Checkpoint["pickups"] | undefined) ?? [];
  const available = chests.find((c) => !(claimed ?? []).includes(c.id));
  const anchor = available ?? pickups[0];
  const player: PlayerPosition = {
    x: anchor ? anchor.x - 64 : 0,
    y: anchor?.y ?? 0,
    dirX: 1,
    dirY: 0,
    face: 1,
  };
  const migrated = {
    ...old,
    version: CHECKPOINT_VERSION,
    player,
    chests,
    pickups,
    gems: [], // v1 could not save gems; only existing rewards can be recovered
    claimedChests: claimed ?? [],
    nextChestId: isNum(old.nextChestId) ? old.nextChestId : Math.max(1, ...chests.map((c) => c.id + 1)),
    nextPickupId: isNum(old.nextPickupId) ? old.nextPickupId : Math.max(1, ...pickups.map((p) => p.id + 1)),
  };
  return validCheckpoint(migrated) ? migrated : null;
}

export function loadCheckpoint(store: KeyValueStore, settledRuns: readonly string[] = []): Checkpoint | null {
  try {
    const raw = JSON.parse(store.getItem(CHECKPOINT_KEY) ?? "null");
    const checkpoint = migrateCheckpoint(raw);
    if (!checkpoint || settledRuns.includes(checkpoint.runId)) return null;
    if (raw.version !== CHECKPOINT_VERSION) saveCheckpoint(store, checkpoint);
    return checkpoint;
  } catch {
    return null;
  }
}

export function saveCheckpoint(store: KeyValueStore, cp: Checkpoint) {
  try {
    store.setItem(CHECKPOINT_KEY, JSON.stringify(cp));
    return true;
  } catch {
    return false;
  }
}

export function clearCheckpoint(store: KeyValueStore) {
  try {
    store.setItem(CHECKPOINT_KEY, "null");
  } catch {
    /* ignore */
  }
}

/** A unique id for a new run. */
export function newRunId(seed: number) {
  return `${Date.now().toString(36)}-${(seed >>> 0).toString(36)}`;
}
