/**
 * Magic talents and fusion recipes — data plus pure validation.
 * Kept engine-independent so it can be unit-tested and ported.
 */
import type { SpellId } from "./data";

export type TalentId =
  | "doppel"
  | "firecracker"
  | "arrow"
  | "missile"
  | "legion"
  | "antigrav"
  | "swiftorbit"
  | "void"
  | "tempest"
  | "chain"
  | "storm"
  | "flare"
  | "prism"
  | "wipeout"
  | "static";

export interface TalentDef {
  id: TalentId;
  spell: SpellId;
  name: string;
  /** English name from the source game, for reference */
  source: string;
  text: string;
}

/** A spell must reach this level before its talent can be chosen. */
export const TALENT_LEVEL = 3;
/** Both spells of a recipe must reach this level. */
export const FUSION_LEVEL = 5;
/** Player levels that unlock fusion slots. */
export const FUSION_SLOT_LEVELS = [25, 50, 75];

export const TALENTS: Record<TalentId, TalentDef> = {
  doppel: { id: "doppel", spell: "bolt", name: "دوپیکر", source: "Doppelganger", text: "یک تیر بیشتر و ۱۰٪ شلیک سریع‌تر." },
  firecracker: { id: "firecracker", spell: "bolt", name: "ترقه", source: "Firecracker", text: "تیرها در برخورد منفجر می‌شوند." },
  arrow: { id: "arrow", spell: "bolt", name: "پیکان جادو", source: "Magic Arrow", text: "تیرها از ۲ دشمن بیشتر می‌گذرند و ۴۰٪ آسیب بیشتر دارند." },
  missile: { id: "missile", spell: "spirit", name: "موشک جادویی", source: "Magic Missile", text: "موشک ارواح در برخورد منفجر می‌شود و یک روح بیشتر." },
  legion: { id: "legion", spell: "spirit", name: "سپاه ارواح", source: "Legion", text: "دو روح بیشتر، با ۲۰٪ آسیب کمتر هر کدام." },
  antigrav: { id: "antigrav", spell: "orbs", name: "ضدجاذبه", source: "Anti-Gravity", text: "مدارگردها دشمنان را به‌شدت پس می‌زنند و مدار بزرگ‌تر می‌شود." },
  swiftorbit: { id: "swiftorbit", spell: "orbs", name: "مدار تند", source: "Swift Orbit", text: "یک مدارگرد بیشتر و ۳۵٪ چرخش تندتر." },
  void: { id: "void", spell: "cyclone", name: "تهی", source: "Void", text: "گردبادها دشمنان پیرامون را به درون می‌کشند." },
  tempest: { id: "tempest", spell: "cyclone", name: "توفان", source: "Tempest", text: "یک گردباد بیشتر و ۴۰٪ ماندگاری بیشتر." },
  chain: { id: "chain", spell: "zap", name: "زنجیره", source: "Chain", text: "هر آذرخش ۲ جهش بیشتر دارد." },
  storm: { id: "storm", spell: "zap", name: "تندرباران", source: "Storm", text: "یک آذرخش بیشتر و ۲۵٪ آسیب بیشتر." },
  flare: { id: "flare", spell: "energy", name: "شراره", source: "Flare", text: "پرتو در انتهای مسیرش منفجر می‌شود." },
  prism: { id: "prism", spell: "energy", name: "منشور", source: "Prism", text: "پرتو به سه شاخه تقسیم می‌شود (هر شاخه ۷۰٪ آسیب)." },
  wipeout: { id: "wipeout", spell: "flash", name: "نابودی", source: "Wipeout", text: "شعاع و آسیب ضربه ۸۰٪ بیشتر، با ۴۰٪ انتظار بیشتر." },
  static: { id: "static", spell: "flash", name: "بار ایستا", source: "Static", text: "یک ضربهٔ بیشتر و دشمنان ۱٫۲ ثانیه بی‌حرکت می‌مانند." },
};

export const TALENT_IDS = Object.keys(TALENTS) as TalentId[];

export function talentsFor(spell: SpellId): TalentDef[] {
  return TALENT_IDS.map((id) => TALENTS[id]).filter((t) => t.spell === spell);
}

export type FusionId = "polymorph" | "fireworks" | "heavyshot" | "maelstrom";

export interface FusionDef {
  id: FusionId;
  name: string;
  source: string;
  text: string;
  primary: { spell: SpellId; talent: TalentId };
  secondary: { spell: SpellId; talent: TalentId };
}

export const FUSIONS: Record<FusionId, FusionDef> = {
  polymorph: {
    id: "polymorph",
    name: "چندپیکر",
    source: "Polymorph",
    text: "تیر جادویی به سه پیکرِ شبح‌وار بدل می‌شود که دشمنان را دنبال می‌کنند و میانشان می‌جهند.",
    primary: { spell: "bolt", talent: "doppel" },
    secondary: { spell: "spirit", talent: "missile" },
  },
  fireworks: {
    id: "fireworks",
    name: "آتش‌بازی",
    source: "Fireworks",
    text: "تیرها به آسمان می‌روند و چون آتش‌بازی به ده‌ها اخگر سوزان می‌ترکند.",
    primary: { spell: "bolt", talent: "firecracker" },
    secondary: { spell: "energy", talent: "flare" },
  },
  heavyshot: {
    id: "heavyshot",
    name: "شلیک سنگین",
    source: "Heavy Shot",
    text: "یک پیکانِ غول‌پیکر و کُند که از همه می‌گذرد و در هر برخورد موج ضربه می‌سازد.",
    primary: { spell: "bolt", talent: "arrow" },
    secondary: { spell: "flash", talent: "wipeout" },
  },
  maelstrom: {
    id: "maelstrom",
    name: "گرداب",
    source: "Maelstrom",
    text: "گردابی عظیم گرد تو می‌چرخد، دشمنان را می‌بلعد و پیوسته می‌کوبد.",
    primary: { spell: "cyclone", talent: "void" },
    secondary: { spell: "orbs", talent: "antigrav" },
  },
};

export const FUSION_IDS = Object.keys(FUSIONS) as FusionId[];

export function fusionSlots(playerLevel: number) {
  return FUSION_SLOT_LEVELS.filter((l) => playerLevel >= l).length;
}

/** The parts of the magic state needed to validate choices. */
export interface MagicView {
  level: number;
  spellLevel: (s: SpellId) => number;
  talentOf: (s: SpellId) => TalentId | undefined;
  /** primary spell → fusion applied to it */
  fused: ReadonlyMap<SpellId, FusionId>;
  /** secondary spells used up by fusions */
  consumed: ReadonlySet<SpellId>;
}

export function canTakeTalent(t: TalentId, m: MagicView): boolean {
  const def = TALENTS[t];
  if (m.consumed.has(def.spell)) return false;
  if (m.talentOf(def.spell)) return false; // one talent per spell family
  return m.spellLevel(def.spell) >= TALENT_LEVEL;
}

export type FusionCheck = { ok: true } | { ok: false; reason: string };

export function canFuse(id: FusionId, m: MagicView): FusionCheck {
  const f = FUSIONS[id];
  const used = m.fused.size;
  if (used >= fusionSlots(m.level)) return { ok: false, reason: "slot" };
  for (const [primary, other] of m.fused) {
    if (other === id) return { ok: false, reason: "done" };
    // a spell can only be the base of one fusion; consumed spells are gone
    if (primary === f.primary.spell || primary === f.secondary.spell) return { ok: false, reason: "conflict" };
  }
  if (m.consumed.has(f.primary.spell) || m.consumed.has(f.secondary.spell)) return { ok: false, reason: "conflict" };
  if (m.talentOf(f.primary.spell) !== f.primary.talent) return { ok: false, reason: "talent" };
  if (m.talentOf(f.secondary.spell) !== f.secondary.talent) return { ok: false, reason: "talent" };
  if (m.spellLevel(f.primary.spell) < FUSION_LEVEL || m.spellLevel(f.secondary.spell) < FUSION_LEVEL)
    return { ok: false, reason: "level" };
  return { ok: true };
}

/* ---------------------------------------------------- tier 2: masteries */

/**
 * The second talent tier. A spell family that already has its first talent can take
 * one mastery once the spell reaches MASTERY_LEVEL. Masteries are plain stat modifiers,
 * so they work for every spell (and its fusion) and never interfere with fusion recipes,
 * which only look at the first-tier talent.
 */
export const MASTERY_LEVEL = 6;

export type MasteryId =
  | "boltFocus"
  | "boltVolley"
  | "spiritWrath"
  | "spiritHost"
  | "orbsHeavy"
  | "orbsWide"
  | "cycloneFury"
  | "cycloneReach"
  | "zapOvercharge"
  | "zapRapid"
  | "energyLance"
  | "energyFlux"
  | "flashCrater"
  | "flashEcho";

export interface MasteryMods {
  /** spell damage bonus, 0.3 = +30% */
  dmg?: number;
  /** cooldown change, −0.2 = 20% faster */
  cd?: number;
  /** extra projectiles / instances */
  count?: number;
  /** area / size bonus, 0.25 = +25% */
  radius?: number;
}

export interface MasteryDef {
  id: MasteryId;
  spell: SpellId;
  name: string;
  text: string;
  mods: MasteryMods;
}

export const MASTERIES: Record<MasteryId, MasteryDef> = {
  boltFocus: { id: "boltFocus", spell: "bolt", name: "تمرکزِ تیر", text: "آسیب تیر جادویی ۳۵٪ بیشتر.", mods: { dmg: 0.35 } },
  boltVolley: { id: "boltVolley", spell: "bolt", name: "رگبار", text: "یک تیر بیشتر و ۱۵٪ شلیک سریع‌تر.", mods: { count: 1, cd: -0.15 } },
  spiritWrath: { id: "spiritWrath", spell: "spirit", name: "خشمِ ارواح", text: "آسیب ارواح ۴۰٪ بیشتر.", mods: { dmg: 0.4 } },
  spiritHost: { id: "spiritHost", spell: "spirit", name: "انبوهِ ارواح", text: "یک روح بیشتر و ۱۵٪ شلیک سریع‌تر.", mods: { count: 1, cd: -0.15 } },
  orbsHeavy: { id: "orbsHeavy", spell: "orbs", name: "مدارِ سنگین", text: "آسیب مدارگردها ۴۰٪ بیشتر.", mods: { dmg: 0.4 } },
  orbsWide: { id: "orbsWide", spell: "orbs", name: "مدارِ گسترده", text: "یک مدارگرد بیشتر و مدار ۲۰٪ بزرگ‌تر.", mods: { count: 1, radius: 0.2 } },
  cycloneFury: { id: "cycloneFury", spell: "cyclone", name: "خشمِ باد", text: "آسیب گردباد ۴۰٪ بیشتر.", mods: { dmg: 0.4 } },
  cycloneReach: { id: "cycloneReach", spell: "cyclone", name: "گردبادِ پهن", text: "گردباد ۳۰٪ پهن‌تر و ۱۰٪ زودتر.", mods: { radius: 0.3, cd: -0.1 } },
  zapOvercharge: { id: "zapOvercharge", spell: "zap", name: "ابَربار", text: "آسیب آذرخش ۴۰٪ بیشتر.", mods: { dmg: 0.4 } },
  zapRapid: { id: "zapRapid", spell: "zap", name: "آذرخشِ پیاپی", text: "یک آذرخش بیشتر و ۲۰٪ زودتر.", mods: { count: 1, cd: -0.2 } },
  energyLance: { id: "energyLance", spell: "energy", name: "نیزهٔ انرژی", text: "آسیب پرتو ۴۵٪ بیشتر.", mods: { dmg: 0.45 } },
  energyFlux: { id: "energyFlux", spell: "energy", name: "جریانِ پیوسته", text: "پرتو ۲۵٪ زودتر شلیک می‌شود.", mods: { cd: -0.25 } },
  flashCrater: { id: "flashCrater", spell: "flash", name: "گودالِ صاعقه", text: "ضربه ۳۰٪ پهن‌تر و ۲۵٪ پرآسیب‌تر.", mods: { radius: 0.3, dmg: 0.25 } },
  flashEcho: { id: "flashEcho", spell: "flash", name: "پژواکِ صاعقه", text: "یک ضربهٔ بیشتر و ۱۵٪ زودتر.", mods: { count: 1, cd: -0.15 } },
};

export const MASTERY_IDS = Object.keys(MASTERIES) as MasteryId[];

export function masteriesFor(spell: SpellId): MasteryDef[] {
  return MASTERY_IDS.map((id) => MASTERIES[id]).filter((m) => m.spell === spell);
}

/** A mastery needs the family's first talent, spell level 6, and no other mastery for that family. */
export function canTakeMastery(id: MasteryId, m: MagicView & { masteryOf: (s: SpellId) => MasteryId | undefined }): boolean {
  const def = MASTERIES[id];
  if (m.consumed.has(def.spell)) return false;
  if (!m.talentOf(def.spell)) return false;
  if (m.masteryOf(def.spell)) return false;
  return m.spellLevel(def.spell) >= MASTERY_LEVEL;
}

/** Fusion recipes a first-tier talent leads to — shown on talent cards so players can plan. */
export function recipesForTalent(t: TalentId): FusionDef[] {
  return FUSION_IDS.map((id) => FUSIONS[id]).filter((f) => f.primary.talent === t || f.secondary.talent === t);
}

export interface RecipePath {
  /** An incompatible talent, consumed ingredient or conflicting fusion blocks the recipe. */
  status: "blocked" | "available" | "slot" | "ready" | "complete";
  /** How many of the four ingredient requirements are met (two spell levels, two talents). */
  matched: number;
  /** The next valid card that advances the recipe, without bypassing prerequisites. */
  next: { spell: SpellId; next: number; talent?: TalentId } | null;
  /** An ingredient already has the exact talent this recipe needs. */
  started: boolean;
}

/** A recipe's current progress, for the upgrade picker and the Persian pause book. */
export function recipePath(id: FusionId, m: MagicView): RecipePath {
  const f = FUSIONS[id];
  if (m.fused.get(f.primary.spell) === id) return { status: "complete", matched: 4, next: null, started: true };
  const parts = [f.primary, f.secondary];
  const started = parts.some((p) => m.talentOf(p.spell) === p.talent);
  const matched = parts.reduce((total, p) => total + Number(m.spellLevel(p.spell) >= FUSION_LEVEL) + Number(m.talentOf(p.spell) === p.talent), 0);
  if (
    parts.some((p) => m.consumed.has(p.spell) || (m.talentOf(p.spell) !== undefined && m.talentOf(p.spell) !== p.talent)) ||
    [...m.fused.keys()].some((spell) => parts.some((p) => p.spell === spell))
  ) return { status: "blocked", matched, next: null, started };
  if (matched === 4) return { status: canFuse(id, m).ok ? "ready" : "slot", matched, next: null, started };

  // Finish a talent that is already in progress first, then acquire its partner.
  const ordered = [...parts].sort((a, b) => Number(m.talentOf(b.spell) === b.talent) - Number(m.talentOf(a.spell) === a.talent));
  for (const part of ordered) {
    const level = m.spellLevel(part.spell);
    if (level < TALENT_LEVEL) return { status: "available", matched, next: { spell: part.spell, next: level + 1 }, started };
    if (m.talentOf(part.spell) === undefined) return { status: "available", matched, next: { spell: part.spell, next: level, talent: part.talent }, started };
    if (level < FUSION_LEVEL) return { status: "available", matched, next: { spell: part.spell, next: level + 1 }, started };
  }
  return { status: "blocked", matched, next: null, started };
}
