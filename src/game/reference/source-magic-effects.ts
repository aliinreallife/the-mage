/**
 * Magic Survival 0.9941 — 21 × 9 STORED magic effect cells + recovered
 * C_Battle_AllyUnit.ApplyEffect_A dispatch bindings for each used positive ID.
 *
 * Source files in handoff (not user-agent guesses):
 * 04-magic-and-combinations.json -> datasets["research/analysis/mechanics/magic-stats.json"].data.magics[].effect_cells
 * 06-effect-bindings-and-dispatch.json -> datasets["research/analysis/mechanics/effect-id-native-map.json"].data.bindings
 *
 * DOES NOT infer when individual slots are consumed during UI/rank evolution,
 * initial AllyUnitVar values, projectile collision/animation, refresh/reset
 * scheduling, or trait interaction. Never use this as a full damage formula.
 */
import { getSourceAbilityIdentity } from "./source-ability-identities";

export type StoredMagicOperation = "increase_magic_level" | "no_effect" | "add" | "ratio_up" | "ratio_down";

export interface SourceMagicEffectSlot {
  readonly magicId: number;
  /** Raw slot 1..9, NOT a confirmed chronological runtime level-up call. */
  readonly slot: number;
  readonly effectId: number;
  readonly value: number;
  readonly operation: StoredMagicOperation;
  readonly statVariable: string | null;
  readonly evidence: "confirmed_stored" | "confirmed_static_code";
}

/** Source 04, exact source order, 9 slots per magic. Format id|effectId,value;... */
const RAW_MAGIC_ROWS = `1|-1,1;153,1;151,50;1,0;153,1;151,50;1,0;151,50;158,5
2|-2,1;184,1;181,50;187,20;184,1;181,50;1,0;181,50;187,10
3|-3,1;271,20;273,1;1,0;1,0;1,0;1,0;271,50;281,5
4|-4,1;306,20;308,1;1,0;1,0;1,0;1,0;306,50;311,25
5|-5,1;375,15;371,50;378,15;375,20;371,50;1,0;371,50;375,10
6|-6,1;233,10;1,0;1,0;1,0;1,0;1,0;1,0;1,0
7|-7,1;211,20;213,1;1,0;1,0;1,0;1,0;211,50;219,5
8|-8,1;293,15;291,50;293,15;293,20;291,50;1,0;291,50;293,10
9|-9,1;253,3;251,50;259,15;253,3;251,50;1,0;251,50;259,5
10|-10,1;323,1;321,50;324,20;323,1;321,50;1,0;321,50;327,5
11|-11,1;352,30;1,0;1,0;1,0;1,0;1,0;1,0;1,0
12|-12,1;393,1;391,50;395,30;393,1;391,50;1,0;391,50;395,15
13|-13,1;421,20;424,1;1,0;1,0;1,0;1,0;421,50;431,5
14|-14,1;443,10;1,0;1,0;1,0;1,0;1,0;1,0;1,0
15|-15,1;463,6;461,50;468,20;463,6;461,50;1,0;461,50;472,5
16|-16,1;481,20;485,2;1,0;1,0;1,0;1,0;481,50;483,10
17|-17,1;513,8;511,50;519,15;513,8;511,50;1,0;511,50;519,5
18|-18,1;531,20;533,1;1,0;1,0;1,0;1,0;531,50;542,5
19|-19,1;561,5;563,20;1,0;1,0;1,0;1,0;1,0;1,0
20|-20,1;583,1;581,50;587,20;583,1;581,50;1,0;581,50;590,5
21|-21,1;606,15;601,50;606,15;609,20;601,50;1,0;601,50;609,5`;

/** Source 06, positive effects referenced by the 189 slots only; each has static-code binding. */
const RAW_DISPATCH_BINDINGS = `151|add|AllyUnitVar_MagicBulletDamageRatioU
153|add|AllyUnitVar_MagicBulletNum
158|ratio_down|AllyUnitVar_MagicBulletPSpeedRatioU
181|add|AllyUnitVar_FireballDamageRatioU
184|add|AllyUnitVar_FireballNum
187|add|AllyUnitVar_FireballAreaU
211|add|AllyUnitVar_ThunderDamageRatioU
213|add|AllyUnitVar_ThunderNum
219|ratio_down|AllyUnitVar_ThunderPSpeedRatioU
233|ratio_down|AllyUnitVar_ShieldPSpeedRatioU
251|add|AllyUnitVar_TsunamiDamageRatioU
253|add|AllyUnitVar_TsunamiNum
259|ratio_down|AllyUnitVar_TsunamiPSpeedRatioU
271|add|AllyUnitVar_SpiritDamageRatioU
273|add|AllyUnitVar_SpiritNum
281|ratio_down|AllyUnitVar_SpiritPSpeedRatioU
291|add|AllyUnitVar_ElectricZoneDamageRatioU
293|add|AllyUnitVar_ElectricZoneAreaU
306|add|AllyUnitVar_SatelliteDamageRatioU
308|add|AllyUnitVar_SatelliteNum
311|add|AllyUnitVar_SatelliteSpeedRatioU
321|add|AllyUnitVar_MeteorDamageRatioU
323|add|AllyUnitVar_MeteorNum
324|add|AllyUnitVar_MeteorAreaU
327|ratio_down|AllyUnitVar_MeteorPSpeedRatioU
352|add|AllyUnitVar_GhostTimeRatioU
371|add|AllyUnitVar_IceNovaDamageRatioU
375|add|AllyUnitVar_IceNovaAreaU
378|ratio_down|AllyUnitVar_IceNovaPSpeedRatioU
391|add|AllyUnitVar_TornadoDamageRatioU
393|add|AllyUnitVar_TornadoNum
395|add|AllyUnitVar_TornadoTimeRatioU
421|add|AllyUnitVar_ElectricDamageRatioU
424|add|AllyUnitVar_ElectricNum
431|ratio_down|AllyUnitVar_ElectricPSpeedRatioU
443|ratio_down|AllyUnitVar_ArmageddonPSpeedRatioU
461|add|AllyUnitVar_IncinerateDamageRatioU
463|add|AllyUnitVar_IncinerateFireNum
468|add|AllyUnitVar_IncinerateSizeU
472|ratio_down|AllyUnitVar_IncineratePSpeedRatioU
481|add|AllyUnitVar_EnergyBulletDamageRatioU
483|add|AllyUnitVar_EnergyBulletSizeRatioU
485|add|AllyUnitVar_EnergyBulletFireNum
511|add|AllyUnitVar_BlizzardDamageRatioU
513|add|AllyUnitVar_BlizzardNum
519|ratio_down|AllyUnitVar_BlizzardPSpeedRatioU
531|add|AllyUnitVar_ArcaneRayDamageRatioU
533|add|AllyUnitVar_ArcaneRayNum
542|ratio_down|AllyUnitVar_ArcaneRayPSpeedRatioU
561|add|AllyUnitVar_MagicCircleEffectNum
563|add|AllyUnitVar_MagicCircleTimeRatioU
581|add|AllyUnitVar_LavaFieldDamageRatioU
583|add|AllyUnitVar_LavaFieldNum
587|add|AllyUnitVar_LavaFieldSizeU
590|ratio_down|AllyUnitVar_LavaFieldPSpeedRatioU
601|add|AllyUnitVar_FlashShockDamageRatioU
606|add|AllyUnitVar_FlashShockSizeU
609|ratio_down|AllyUnitVar_FlashShockPSpeedRatioU`;

interface DispatchBinding {
  readonly operation: "add" | "ratio_up" | "ratio_down";
  readonly statVariable: string;
}

const bindings = new Map<number, DispatchBinding>();
for (const line of RAW_DISPATCH_BINDINGS.split("\n")) {
  const [id, operation, statVariable] = line.split("|");
  if (!/^(add|ratio_up|ratio_down)$/.test(operation) || !statVariable.startsWith("AllyUnitVar_"))
    throw new Error("Invalid source native dispatch row: " + line);
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId) || bindings.has(numericId)) throw new Error("Duplicate native effect");
  bindings.set(numericId, Object.freeze({ operation: operation as DispatchBinding["operation"], statVariable }));
}
if (bindings.size !== 58) throw new Error("Missing sourced magic-effect bindings");

export const SOURCE_MAGIC_EFFECT_SLOTS: readonly SourceMagicEffectSlot[] = Object.freeze(
  RAW_MAGIC_ROWS.split("\n").flatMap(line => {
    const [id, serialized] = line.split("|");
    const magicId = Number(id);
    if (getSourceAbilityIdentity(magicId)?.kind !== "magic") throw new Error("Unknown source magic " + id);
    const values = serialized.split(";");
    if (values.length !== 9) throw new Error("Missing stored effect slots for source magic " + id);
    return values.map((cell, index) => {
      const [effectString, valueString] = cell.split(",");
      const effectId = Number(effectString);
      const value = Number(valueString);
      if (!Number.isSafeInteger(effectId) || !Number.isFinite(value)) throw new Error("Invalid stored effect " + cell);
      const binding = bindings.get(effectId);
      const operation: StoredMagicOperation =
        effectId === 1 && value === 0 ? "no_effect" :
        effectId < 0 && effectId === -magicId ? "increase_magic_level" :
        binding?.operation ?? (() => { throw new Error("Unsupported source magic effect " + cell); })();
      return Object.freeze({
        magicId, slot: index + 1, effectId, value, operation,
        statVariable: binding?.statVariable ?? null,
        evidence: binding ? "confirmed_static_code" as const : "confirmed_stored" as const,
      });
    });
  }),
);
if (SOURCE_MAGIC_EFFECT_SLOTS.length !== 189) throw new Error("Incomplete stored magic effect slots");

export function getSourceMagicEffectSlot(magicId: number, slot: number): SourceMagicEffectSlot | null {
  if (!Number.isSafeInteger(magicId) || !Number.isSafeInteger(slot) || magicId < 1 || magicId > 21 || slot < 1 || slot > 9) return null;
  return SOURCE_MAGIC_EFFECT_SLOTS[(magicId - 1) * 9 + slot - 1];
}

/**
 * Apply ONE recovered native effect operation to a caller-SUPPLIED stat value.
 * Stat initial values, rank->slot timing, global modifiers and reapplication
 * are explicitly not inferred. Values are float32 as in native IL2CPP.
 */
export function evaluateSourceMagicEffectSlot(magicId: number, slot: number, current: number): {
  readonly effect: SourceMagicEffectSlot;
  readonly before: number;
  readonly after: number;
} {
  const effect = getSourceMagicEffectSlot(magicId, slot);
  if (!effect) throw new RangeError("Unknown source magic effect slot");
  if (!Number.isFinite(current)) throw new RangeError("Explicit finite current source stat required");
  const before = Math.fround(current);
  const value = Math.fround(effect.value);
  let after = before;
  switch (effect.operation) {
    case "add": after = Math.fround(before + value); break;
    case "ratio_up": after = Math.fround(Math.fround(before * Math.fround(100 + value)) * Math.fround(0.01)); break;
    case "ratio_down": after = Math.fround(Math.fround(before * Math.fround(100 - value)) * Math.fround(0.01)); break;
    case "increase_magic_level": after = Math.floor(Math.fround(before + value)); break;
    case "no_effect": break;
  }
  return { effect, before, after };
}
