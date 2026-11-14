import type { SpellId } from "./data";

export type HeroId = "farzan" | "azar" | "bahman" | "tishtar";

export interface HeroPalette {
  /** robe gradient, light → dark */
  robe: [string, string, string];
  /** shadow tone painted over the trailing half of the robe */
  robeShade: string;
  cape: string;
  trim: string;
  /** hat gradient, dark → light */
  hat: [string, string, string];
  brim: string;
  beard: string;
  skin: string;
  /** crystal core colour */
  crystal: string;
  /** "r,g,b" used for glows, aura and runes */
  glow: string;
}

export interface Hero {
  id: HeroId;
  name: string;
  title: string;
  /** one-line flavour shown under the name */
  lore: string;
  /** what the passive does, shown in the menu */
  passive: string;
  start: SpellId;
  palette: HeroPalette;
  /** passive bonuses folded into Game.recalc() */
  dmg?: number;
  speed?: number;
  maxHp?: number;
  xp?: number;
  /** extra damage multiplier against slowed/frozen enemies */
  frozen?: number;
  /** apply the frozen bonus even to mild slows (the frost aura starts at 25%) */
  frozenAnySlow?: boolean;
  /** damage taken reduction, 0.05 = −5% */
  taken?: number;
  spellDmg?: Partial<Record<SpellId, number>>;
  spellCd?: Partial<Record<SpellId, number>>;
  spellRadius?: Partial<Record<SpellId, number>>;
}

export const HEROES: Hero[] = [
  {
    id: "farzan",
    name: "فرزان",
    title: "افسونگرِ فیروزه",
    lore: "پیرِ دانا که تیرهای افسون را بی‌وقفه می‌بارد.",
    passive: "آسیب تیر افسون ۲۰٪ بیشتر و تجربهٔ گوهرها ۵٪ بیشتر.",
    start: "bolt",
    xp: 0.05,
    spellDmg: { bolt: 0.2 },
    palette: {
      robe: ["#2ad3c2", "#17a99b", "#0d7d75"],
      robeShade: "rgba(4,44,44,0.35)",
      cape: "#0d5f66",
      trim: "#f2b84b",
      hat: ["#1b2f78", "#2f4aa8", "#4b68c8"],
      brim: "#16265e",
      beard: "#f4ecd8",
      skin: "#e9c9a0",
      crystal: "#eafffb",
      glow: "63,217,200",
    },
  },
  {
    id: "azar",
    name: "آذر",
    title: "آتش‌بانِ آذرگشسب",
    lore: "نگهبانِ آتشکدهٔ کهن؛ شعله از عصایش فرو نمی‌نشیند.",
    passive: "گوی آتش ۴۰٪ آسیب و ۲۵٪ شعاع بیشتر و ۱۵٪ زودتر پرتاب می‌شود.",
    start: "fire",
    spellDmg: { fire: 0.4 },
    spellCd: { fire: -0.15 },
    spellRadius: { fire: 0.25 },
    palette: {
      robe: ["#f0574a", "#c6303a", "#86182a"],
      robeShade: "rgba(60,6,14,0.38)",
      cape: "#5c1020",
      trim: "#ffc35c",
      hat: ["#2a0d14", "#4a1622", "#6e2333"],
      brim: "#1f0a10",
      beard: "#2c1a14",
      skin: "#d9a77d",
      crystal: "#fff1c9",
      glow: "255,138,60",
    },
  },
  {
    id: "bahman",
    name: "بهمن",
    title: "سرماافسونِ البرز",
    lore: "از قلّه‌های یخ‌زده آمده و نفسش دیوان را می‌خشکاند.",
    passive: "دشمنانِ سرد ۳۵٪ آسیب بیشتر می‌بینند، جان ۴۵ بیشتر و ۵٪ آسیب کمتر می‌گیری.",
    start: "frost",
    frozen: 1.35,
    frozenAnySlow: true,
    taken: 0.05,
    maxHp: 45,
    spellRadius: { frost: 0.2 },
    palette: {
      robe: ["#e6f4ff", "#a9d6f5", "#6aa6d6"],
      robeShade: "rgba(20,52,92,0.3)",
      cape: "#3a6e9e",
      trim: "#d8f0ff",
      hat: ["#26476e", "#3c6896", "#6c97c4"],
      brim: "#1d3756",
      beard: "#ffffff",
      skin: "#efd2b4",
      crystal: "#ffffff",
      glow: "160,222,255",
    },
  },
  {
    id: "tishtar",
    name: "تیشتر",
    title: "تندرخوانِ آسمان",
    lore: "ستارهٔ باران‌آور؛ آذرخش به فرمانِ اوست.",
    passive: "آسیب آذرخش ۲۰٪ و سرعت حرکت ۸٪ بیشتر.",
    start: "zap",
    speed: 0.08,
    spellDmg: { zap: 0.2 },
    palette: {
      robe: ["#9f7bff", "#6f4fd6", "#4630a0"],
      robeShade: "rgba(22,10,62,0.38)",
      cape: "#2d1d6e",
      trim: "#ffe36e",
      hat: ["#170f3d", "#2a1c66", "#43308f"],
      brim: "#120b30",
      beard: "#d9d2f5",
      skin: "#e2bf98",
      crystal: "#fffbe0",
      glow: "255,227,110",
    },
  },
];

export const HERO_IDS = HEROES.map((h) => h.id);

export const BY_HERO: Record<HeroId, Hero> = HEROES.reduce(
  (acc, h) => {
    acc[h.id] = h;
    return acc;
  },
  {} as Record<HeroId, Hero>,
);
