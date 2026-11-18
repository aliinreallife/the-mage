/**
 * Audited candidate crosswalk: Magic Survival 0.9941 reference IDs <-> The Mage IDs.
 *
 * Source identities are STORED and authoritative.
 * The correspondences are editorial review of BOTH the source catalog's
 * English name/description/effects and The Mage's spell/trait/passive data.
 * "supported_correspondence" means matching role/core effect, NOT full
 * numerical or runtime parity. "identity_only" means exact source name and
 * parent magic but a substantially different local gameplay effect.
 * "analogy_only" means role analogy with different ranks/numbers. Only the
 * four audited corresponding passive IDs drive the dev-only early gate.
 *
 * Source: 02-catalog-and-identities.json, catalog.json.reference_layer.
 * Local: src/game/data.ts, src/game/talents.ts.
 */
import { UPGRADES, type SpellId, type PassiveId } from "../data";
import { TALENTS, type TalentId } from "../talents";
import {
  getSourceAbilityIdentity, type SourceAbilityCategory,
} from "./source-ability-identities";
import { EARLY_PRIMARY_EXCLUDED_SOURCE_IDS } from "./source-offer-guards";

export type LocalAbilityKind = "spell" | "passive" | "talent";
export type CorrespondenceStatus = "supported_correspondence" | "identity_only" | "analogy_only";
export type LocalAbilityId = SpellId | PassiveId | TalentId;

export interface LocalSourceLink {
  readonly localKind: LocalAbilityKind;
  readonly localId: LocalAbilityId;
  readonly sourceId: number;
  readonly status: CorrespondenceStatus;
  /** Independent notes: no entry claims source parity or candidate weighting. */
  readonly note: string;
}

/**
 * Every mapping is explicit and reviewed. No automatic name-based matching.
 * Unlisted local IDs are unmapped; local fusions are also intentionally unmapped.
 */
export const LOCAL_SOURCE_LINKS: readonly LocalSourceLink[] = Object.freeze([
  { localKind: "spell", localId: "bolt", sourceId: 1, status: "supported_correspondence", note: "Magic Bolt projectile; 7 levels; full attack math still differs" },
  { localKind: "spell", localId: "fire", sourceId: 2, status: "supported_correspondence", note: "Fireball projectile; SOURCE max 7 versus local 6" },
  { localKind: "spell", localId: "spirit", sourceId: 3, status: "supported_correspondence", note: "Spirit companion projectile; 7 levels, detailed effects not matched" },
  { localKind: "spell", localId: "orbs", sourceId: 4, status: "supported_correspondence", note: "Satellite rotating projectiles; 7 levels" },
  { localKind: "spell", localId: "flash", sourceId: 7, status: "supported_correspondence", note: "Thunderstorm strikes nearby targets; name differs; mechanic details not certified" },
  { localKind: "spell", localId: "meteor", sourceId: 10, status: "supported_correspondence", note: "Meteor drops; SOURCE max 7 versus local 6" },
  { localKind: "spell", localId: "cyclone", sourceId: 12, status: "supported_correspondence", note: "Cyclone grows and deals damage; 7 levels" },
  { localKind: "spell", localId: "energy", sourceId: 18, status: "supported_correspondence", note: "Arcane Ray penetrating beam; 7 levels" },
  { localKind: "passive", localId: "might", sourceId: 31, status: "supported_correspondence", note: "Intelligence +10% ATK each rank; local damage abstraction, max 5" },
  { localKind: "passive", localId: "haste", sourceId: 32, status: "supported_correspondence", note: "Fast Casting -5% cooldown each rank; max 3" },
  { localKind: "passive", localId: "vital", sourceId: 33, status: "supported_correspondence", note: "Vitality +20% HP, +10% life-orb recovery; max 5" },
  { localKind: "passive", localId: "snipe", sourceId: 37, status: "supported_correspondence", note: "Snipe +5% critical chance; max 3" },
  { localKind: "passive", localId: "swift", sourceId: 34, status: "analogy_only", note: "Haste gives +10% movement for 2 source ranks; local +8% for 5" },
  { localKind: "passive", localId: "magnet", sourceId: 38, status: "analogy_only", note: "Explorer gives +33% pickup range for 3 source ranks; local +30% for 5" },
  { localKind: "talent", localId: "arrow", sourceId: 362, status: "identity_only", note: "Magic Arrow is source Magic Bolt trait; native pierces ALL and increases damage 1.5X/size 180%, local effect differs" },
  { localKind: "talent", localId: "doppel", sourceId: 367, status: "identity_only", note: "Native replaces Magic Bolts with THREE mirage casters and +50% cooldown; local grants an extra bolt instead" },
  { localKind: "talent", localId: "missile", sourceId: 380, status: "identity_only", note: "Native changes Spirit cooldown timing/scaling; local adds explosions and another spirit" },
  { localKind: "talent", localId: "antigrav", sourceId: 389, status: "identity_only", note: "Native oscillates Satellite rotation speed up to 3X; local applies knockback and enlarges orbit" },
  { localKind: "talent", localId: "void", sourceId: 463, status: "identity_only", note: "Native spawns nonmoving Cyclones at random locations; local draws enemies inward" },
]);

const byLocal = new Map<string, LocalSourceLink>();
for (const link of LOCAL_SOURCE_LINKS) {
  const key = link.localKind + ":" + link.localId;
  if (byLocal.has(key)) throw new Error("duplicate local source mapping: " + key);
  const source = getSourceAbilityIdentity(link.sourceId);
  const sourceKind: SourceAbilityCategory = link.localKind === "spell" ? "magic" : link.localKind === "talent" ? "trait" : "passive";
  if (source?.kind !== sourceKind) throw new Error("source category mismatch for " + key);
  if (link.localKind === "talent") {
    const localTalent = TALENTS[link.localId as TalentId];
    // A matching trait name with a DIFFERENT parent magic is not a valid link.
    if (localTalent.source !== source.nameEn) throw new Error("trait identity name mismatch for " + key);
    const parent = byLocal.get("spell:" + localTalent.spell);
    if (parent?.sourceId !== source.parentMagicId) throw new Error("trait parent magic mismatch for " + key);
  } else {
    const localDef = UPGRADES[link.localId as SpellId | PassiveId];
    if (localDef.kind !== link.localKind) throw new Error("local type mismatch for " + key);
  }
  byLocal.set(key, Object.freeze(link));
}

/** Unmapped is null, not a fabricated match. Never use this as a damage formula. */
export function getLocalSourceLink(kind: LocalAbilityKind, id: string): LocalSourceLink | null {
  return byLocal.get(kind + ":" + id) ?? null;
}

/**
 * Safe, deliberately LIMITED projection of the verified L1..3 *source-ID*
 * exclusion onto only the four audited local passive correspondences.
 *
 * Unknown, identity-only and analogy-only local cards keep local game behavior; this is NOT
 * a full native selection parity claim; only used in dev reference mode.
 */
export function isAuditedEarlyPrimaryPassiveBlocked(sourceLevel: number, localId: PassiveId): boolean {
  if (!Number.isSafeInteger(sourceLevel) || sourceLevel < 1) throw new RangeError("invalid source level");
  if (sourceLevel > 3) return false;
  const pair = getLocalSourceLink("passive", localId);
  return Boolean(pair && pair.status === "supported_correspondence" &&
    EARLY_PRIMARY_EXCLUDED_SOURCE_IDS.some(n => n === pair.sourceId));
}
