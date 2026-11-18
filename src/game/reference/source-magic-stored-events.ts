/**
 * Magic Survival 0.9941 — reconstructed STORED per_level_effects event order.
 *
 * Source: 04-magic-and-combinations.json:
 *   research/analysis/mechanics/magic-stats.json -> magics[].per_level_effects
 * and the identical 21 cases in 13-research-test-fixtures.json:
 *   research/parity-tests/magic_levels.json
 *
 * WARNING: per_level_effects[].level is the event's ORDINAL in the extracted
 * non-placeholder table. It is NOT necessarily the playable spell rank:
 *   e.g. Fireball max_level=7, but EIGHT stored non-placeholder events.
 * Never infer the native choice scheduler, traits, reapplication, or damage
 * output from this sequence. A raw effect slot is not a rank number.
 */
import { getSourceAbilityIdentity } from "./source-ability-identities";
import {
  getSourceMagicEffectSlot, evaluateSourceMagicEffectSlot,
  type SourceMagicEffectSlot,
} from "./source-magic-effects";

export interface StoredSourceMagicEvent {
  readonly magicId: number;
  /** 1-based index in the source's per_level_effects list, NOT a game rank. */
  readonly ordinal: number;
  /** 1-based position in the nine source raw table cells (including gaps). */
  readonly rawSlot: number;
  readonly effectId: number;
  readonly value: number;
  readonly operation: SourceMagicEffectSlot["operation"];
  readonly statVariable: string | null;
  readonly evidence: "confirmed_stored";
}

/**
 * Expected extracted effective-event IDs/values for all 21 abilities.
 * Includes unlock opcodes, excludes no-op 1,0 cells; the data below is
 * separately validated against the raw nine-slot catalog.
 */
const RAW_EVENT_ROWS = `1|-1,1;153,1;151,50;153,1;151,50;151,50;158,5
2|-2,1;184,1;181,50;187,20;184,1;181,50;181,50;187,10
3|-3,1;271,20;273,1;271,50;281,5
4|-4,1;306,20;308,1;306,50;311,25
5|-5,1;375,15;371,50;378,15;375,20;371,50;371,50;375,10
6|-6,1;233,10
7|-7,1;211,20;213,1;211,50;219,5
8|-8,1;293,15;291,50;293,15;293,20;291,50;291,50;293,10
9|-9,1;253,3;251,50;259,15;253,3;251,50;251,50;259,5
10|-10,1;323,1;321,50;324,20;323,1;321,50;321,50;327,5
11|-11,1;352,30
12|-12,1;393,1;391,50;395,30;393,1;391,50;391,50;395,15
13|-13,1;421,20;424,1;421,50;431,5
14|-14,1;443,10
15|-15,1;463,6;461,50;468,20;463,6;461,50;461,50;472,5
16|-16,1;481,20;485,2;481,50;483,10
17|-17,1;513,8;511,50;519,15;513,8;511,50;511,50;519,5
18|-18,1;531,20;533,1;531,50;542,5
19|-19,1;561,5;563,20
20|-20,1;583,1;581,50;587,20;583,1;581,50;581,50;590,5
21|-21,1;606,15;601,50;606,15;609,20;601,50;601,50;609,5`;

const rows = new Map<number, readonly StoredSourceMagicEvent[]>();

for (const line of RAW_EVENT_ROWS.split("\n")) {
  const [idRaw, serialized] = line.split("|");
  const magicId = Number(idRaw);
  if (getSourceAbilityIdentity(magicId)?.kind !== "magic" || rows.has(magicId))
    throw new Error("Invalid or duplicate source magic in stored event list: " + idRaw);
  const expected = serialized.split(";").map(pair => pair.split(",").map(Number));
  if (expected.some(pair => pair.length !== 2 || pair.some(n => !Number.isFinite(n))))
    throw new Error("Invalid source event row " + idRaw);
  const effective = Array.from({ length: 9 }, (_, i) => getSourceMagicEffectSlot(magicId, i + 1)!)
    .filter(cell => cell.operation !== "no_effect");
  if (expected.length !== effective.length)
    throw new Error("Stored event count differs from raw slots for " + magicId);
  const eventList: StoredSourceMagicEvent[] = expected.map(([effectId, value], i) => {
    const cell = effective[i];
    if (cell.effectId !== effectId || cell.value !== value)
      throw new Error("Stored event differs from raw slot " + magicId + ":" + cell.slot);
    return Object.freeze({
      magicId, ordinal: i + 1, rawSlot: cell.slot, effectId, value,
      operation: cell.operation, statVariable: cell.statVariable,
      evidence: "confirmed_stored" as const,
    });
  });
  rows.set(magicId, Object.freeze(eventList));
}

if (rows.size !== 21) throw new Error("Incomplete source magic event list");

export const SOURCE_MAGIC_STORED_EVENTS: readonly StoredSourceMagicEvent[] =
  Object.freeze([...rows.values()].flat());

export function getSourceMagicStoredEvents(magicId: number): readonly StoredSourceMagicEvent[] | null {
  if (!Number.isSafeInteger(magicId)) return null;
  return rows.get(magicId) ?? null;
}

/**
 * Non-mutating replay of a prefix of STORED operations against EXPLICIT caller
 * AllyUnitVar inputs. No missing field ever defaults to zero or one.
 *
 * An increase_magic_level event acts on the caller-supplied magicLevel value,
 * but its presence does NOT imply subsequent events increment the level.
 * A replay prefix is an evidence test, never a playable rank progression.
 */
export interface SourceReplayStartingState {
  readonly magicLevel: number;
  readonly statValues: Readonly<Record<string, number>>;
}
export interface SourceReplayStep {
  readonly ordinal: number;
  readonly rawSlot: number;
  readonly effectId: number;
  readonly target: string;
  readonly before: number;
  readonly after: number;
}

export interface SourceReplayResult {
  readonly magicId: number;
  readonly appliedEventCount: number;
  readonly magicLevel: number;
  readonly statValues: Readonly<Record<string, number>>;
  readonly steps: readonly SourceReplayStep[];
  readonly provenance: "stored_order_explicit_inputs_not_runtime";
}

export function replaySourceMagicStoredEvents(
  magicId: number, throughOrdinal: number, starting: SourceReplayStartingState,
): SourceReplayResult {
  const events = getSourceMagicStoredEvents(magicId);
  if (!events) throw new RangeError("Unknown source magic ID");
  if (!Number.isSafeInteger(throughOrdinal) || throughOrdinal < 0 || throughOrdinal > events.length)
    throw new RangeError("Stored event ordinal outside source range");
  if (!starting || !Number.isSafeInteger(starting.magicLevel) || starting.magicLevel < 0)
    throw new RangeError("Explicit nonnegative integer magicLevel is required");
  if (!starting.statValues || Array.isArray(starting.statValues) || typeof starting.statValues !== "object")
    throw new TypeError("Explicit source statValues object is required");

  let level = starting.magicLevel;
  const vars: Record<string, number> = Object.create(null);
  for (const [k, v] of Object.entries(starting.statValues)) {
    if (!k.startsWith("AllyUnitVar_") || !Number.isFinite(v))
      throw new TypeError("Source stat key/value is invalid: " + k);
    vars[k] = Math.fround(v);
  }
  const steps: SourceReplayStep[] = [];
  for (const event of events.slice(0, throughOrdinal)) {
    const target = event.operation === "increase_magic_level" ? "magicLevel" : event.statVariable;
    if (!target) throw new Error("Unexpected no-op source stored event");
    if (target !== "magicLevel" && !Object.prototype.hasOwnProperty.call(vars, target))
      throw new Error("Source stat not explicitly supplied: " + target);
    const before = target === "magicLevel" ? level : vars[target];
    const { after } = evaluateSourceMagicEffectSlot(magicId, event.rawSlot, before);
    if (target === "magicLevel") level = after;
    else vars[target] = after;
    steps.push(Object.freeze({ ordinal: event.ordinal, rawSlot: event.rawSlot, effectId: event.effectId, target, before, after }));
  }
  return Object.freeze({
    magicId,
    appliedEventCount: throughOrdinal,
    magicLevel: level,
    statValues: Object.freeze({ ...vars }),
    steps: Object.freeze(steps),
    provenance: "stored_order_explicit_inputs_not_runtime" as const,
  });
}
