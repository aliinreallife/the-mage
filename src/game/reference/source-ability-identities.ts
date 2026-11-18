/**
 * STORED ability identities from Magic Survival v0.9941.
 * Source: 02-catalog-and-identities.json, catalog.json reference_layer.
 * Scope: 21 magic + 10 passive + 24 special_passive + 66 trait rows.
 *
 * Names, IDs, parent magic IDs, stored max_level/required_level are
 * source-catalog data. Not live runtime offer odds/eligibility.
 * Trait parentMagicId copies source derived_ability_id (NOT trait_id).
 * Local game IDs and gameplay effects are deliberately kept separate.
 */
export type SourceAbilityCategory = "magic" | "passive" | "special_passive" | "trait";
export interface SourceAbilityIdentity {
  readonly sourceId: number;
  readonly kind: SourceAbilityCategory;
  readonly nameEn: string;
  readonly maxLevel: number;
  readonly requiredLevel: number;
  readonly parentMagicId?: number;
  readonly evidence: "stored";
}

/** Stored rows: ID | English source name | max_level | optional required_level. */
const magicRows = `1|Magic Bolt|7
2|Fireball|7
3|Spirit|7
4|Satellite|7
5|Frost Nova|7
6|Shield|5
7|Thunderstorm|7
8|Electric Zone|7
9|Tsunami|7
10|Meteor|7
11|Cloaking|5
12|Cyclone|7
13|Electric Shock|7
14|Armageddon|5|6
15|Incineration|7
16|Energy Bolt|7
17|Blizzard|7
18|Arcane Ray|7
19|Magic Circle|5
20|Lava Zone|7
21|Flash Shock|7`;
const passiveRows = `30|Advanced Magic|3|1
31|Intelligence|5
32|Fast Casting|3
33|Vitality|5
34|Haste|2
35|Arcane Effuse|3
36|Concentration|3
37|Snipe|3
38|Explorer|3
39|Rupture|3`;
const specialRows = `301|Lord of Fire|1|1
302|Stormy Clouds|1|1
303|Nature’s Wrath|1|1
304|Energy Engineering|1|1
305|Arcana|1|1
306|Guardian Angel|1|1
307|Silent Casting|1|1
308|War Magic|1|1
309|Timekeeper|1|1
310|Pioneer|1|1
311|Smite|1|1
312|Seal|1|1
313|Curse|1|1
314|Chakra|1|1
315|Mana Factory|1|1
316|Doctor|1|1
317|Blood Magic|1|1
318|Adrenaline|1|1
319|Juggernaut|1|1
320|Priest|1|1
321|Eldritch|1|1
322|Noblesse|1|1
323|Taoist|1|1
324|Florist|1|1`;
/** Stored rows: trait ability ID | English source name | derived_ability_id. */
const traitRows = `362|Magic Arrow|1
363|Fireworks|1
364|Fission|1
365|Chain Casting|1
366|Fire at Will|1
367|Doppelganger|1
371|Big Bang|2
372|Toxic Gas|2
373|Constellation|2
380|Magic Missile|3
381|Magic Blade|3
382|Familiar|3
389|Anti-Gravity|4
390|Will o’ the Wisp|4
391|Nuclear Fusion|4
398|Absolute Zero|5
399|Ice Age|5
400|Earthquake|5
407|Barrier|6
408|Reconstruct|6
409|Destruction Field|6
416|Thunderclap|7
417|Lightning Explosion|7
418|Judgment|7
425|Electricity Blast|8
426|EMP|8
427|Fire Aura|8
434|Pole|9
435|Siren’s Song|9
436|Great Eruption|9
443|Volcanic Eruption|10
444|Meteor Shower|10
445|Asteroid|10
452|Mirage|11
453|Space Warp|11
454|Soul Harvest|11
461|Extreme Weather|12
462|Electric Orb|12
463|Void|12
470|Chain Lightning|13
471|High Output|13
472|Superconductivity|13
479|Apocalypse|14
480|Rapture|14
481|Doom Prophet|14
488|Flamestrike|15
489|Pyromaniac|15
490|Cerberus Flame|15
497|Charged Particle|16
498|Spark|16
499|Flare|16
506|Sub-Zero|17
507|Shooting Star|17
508|Conflagration|17
515|Reflect|18
516|Disintegration Ray|18
517|Electromagnetic Burst|18
524|Unleash Mana|19
525|Material Synthesis|19
526|Great Magic Circle|19
533|Melt|20
534|Crater|20
535|Magma Eruption|20
542|Wipeout|21
543|Ragnarok|21
544|Satan's Nails|21`;

function parseRows(kind: SourceAbilityCategory, input: string): SourceAbilityIdentity[] {
  return input.split("\n").map(line => {
    const [idRaw, nameEn, xRaw, requiredRaw] = line.trim().split("|");
    const sourceId = Number(idRaw);
    const x = Number(xRaw);
    const requiredLevel = kind === "trait" ? 0 : Number(requiredRaw ?? 0);
    if (!nameEn || !Number.isSafeInteger(sourceId) || sourceId <= 0 ||
        !Number.isSafeInteger(x) || x < 0 || !Number.isSafeInteger(requiredLevel) ||
        requiredLevel < 0) throw new Error("malformed stored source identity: " + line);
    return Object.freeze(kind === "trait"
      ? { sourceId, kind, nameEn, maxLevel: 0, requiredLevel: 0, parentMagicId: x, evidence: "stored" as const }
      : { sourceId, kind, nameEn, maxLevel: x, requiredLevel, evidence: "stored" as const });
  });
}

export const SOURCE_ABILITY_IDENTITIES: readonly SourceAbilityIdentity[] = Object.freeze([
  ...parseRows("magic", magicRows),
  ...parseRows("passive", passiveRows),
  ...parseRows("special_passive", specialRows),
  ...parseRows("trait", traitRows),
]);

const lookup = new Map(SOURCE_ABILITY_IDENTITIES.map(entity => [entity.sourceId, entity]));
if (lookup.size !== SOURCE_ABILITY_IDENTITIES.length) {
  throw new Error("duplicate source ability ID in stored identity catalog");
}

/** Read only: source IDs; no conversion into local playable card IDs. */
export function getSourceAbilityIdentity(sourceId: number): SourceAbilityIdentity | null {
  if (!Number.isSafeInteger(sourceId)) return null;
  return lookup.get(sourceId) ?? null;
}

export function sourceAbilityCount(kind: SourceAbilityCategory): number {
  return SOURCE_ABILITY_IDENTITIES.filter(a => a.kind === kind).length;
}
