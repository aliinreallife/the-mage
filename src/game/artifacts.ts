import type { SpellId } from "./data";

/** Five tiers: معمولی، نادر، نفیس، ممتاز، افسانه‌ای */
export type Rarity = "common" | "rare" | "epic" | "mythic" | "legendary";
export type ActiveId = "shield" | "scythe" | "clockwork" | "pandora";

export type ArtifactId =
  | "ruby"
  | "mithril"
  | "broom"
  | "backpack"
  | "scroll"
  | "mandrake"
  | "totem"
  | "magicbullet"
  | "torch"
  | "mooncrystal"
  | "thunderspear"
  | "galaxycore"
  | "dimgate"
  | "forcefield"
  | "spiderweb"
  | "scythe"
  | "clockwork"
  | "blackcat"
  | "hourglass"
  | "pandora"
  | "uranium"
  | "secondheart"
  | "exorcism"
  | "brand"
  | "crystalseed"
  | "manawheel"
  | "twincore";

/** Everything an artifact may change; all fields are optional. */
export interface Mods {
  /** +15% = 0.15, multiplied into all spell damage */
  dmg?: number;
  /** -6% cooldown = -0.06, multiplied into all cooldowns */
  cd?: number;
  speed?: number;
  /** pickup radius bonus, 0.5 = +50% */
  pickup?: number;
  xp?: number;
  maxHp?: number;
  /** max-HP multiplier bonus, 0.5 = +50% */
  maxHpPct?: number;
  /** HP per second */
  regen?: number;
  /** fraction of incoming damage removed, 0.12 = -12% */
  taken?: number;
  /** pomegranate heal multiplier bonus */
  heal?: number;
  /** player hitbox multiplier; below 1 makes you harder to touch */
  size?: number;
  /** extra damage multiplier against frozen enemies */
  frozen?: number;
  /** extra damage multiplier against enemies older than five seconds */
  aged?: number;
  /** instant-kill chance per hit */
  slay?: number;
  /** enemy max-HP multiplier change, -0.13 = -13% */
  enemyHp?: number;
  /** enemy speed multiplier change */
  enemySpeed?: number;
  /** ultimate charge gain multiplier bonus */
  ult?: number;
  /** extra جانِ دوم */
  revive?: number;
  spellDmg?: Partial<Record<SpellId, number>>;
  spellCount?: Partial<Record<SpellId, number>>;
  spellCd?: Partial<Record<SpellId, number>>;
  spellRadius?: Partial<Record<SpellId, number>>;
  /** a timed power that fires on its own */
  active?: { id: ActiveId; cd: number; label: string };
}

export interface Artifact {
  id: ArtifactId;
  name: string;
  /** original Magic Survival name, shown in the codex */
  source: string;
  rarity: Rarity;
  color: string;
  text: string;
  mods: Mods;
}

export const RARITY: Record<Rarity, { name: string; color: string; weight: number; rank: number }> = {
  common: { name: "معمولی", color: "#cfd6e6", weight: 46, rank: 0 },
  rare: { name: "نادر", color: "#3fd9c8", weight: 28, rank: 1 },
  epic: { name: "نفیس", color: "#b48cff", weight: 15, rank: 2 },
  mythic: { name: "ممتاز", color: "#ff8a5c", weight: 7, rank: 3 },
  legendary: { name: "افسانه‌ای", color: "#f2b84b", weight: 4, rank: 4 },
};

export const RARITY_ORDER: Rarity[] = ["legendary", "mythic", "epic", "rare", "common"];

/** Later in a run the odds lean toward rarer tiers. `tilt` grows with time. */
export function tierTilt(r: Rarity, tilt: number): number {
  switch (r) {
    case "common":
      return 1;
    case "rare":
      return 1 + tilt * 0.25;
    case "epic":
      return 1 + tilt * 0.5;
    case "mythic":
      return 0.4 + tilt * 0.8;
    default:
      return tilt;
  }
}

export const ARTIFACTS: Artifact[] = [
  /* ------------------------------------------------------- عادی */
  {
    id: "ruby",
    name: "یاقوت سرخ",
    source: "Ruby",
    rarity: "common",
    color: "#ff6b78",
    text: "آسیب همه‌ی افسون‌ها ۱۵٪ بیشتر می‌شود.",
    mods: { dmg: 0.15 },
  },
  {
    id: "mithril",
    name: "زره میثریل",
    source: "Mithril Armor",
    rarity: "common",
    color: "#cfd6e6",
    text: "آسیبی که می‌گیری ۱۲٪ کمتر می‌شود.",
    mods: { taken: 0.12 },
  },
  {
    id: "broom",
    name: "جاروی جادو",
    source: "Magic Broom",
    rarity: "common",
    color: "#d8b47a",
    text: "سرعت حرکتت ۱۲٪ بیشتر می‌شود.",
    mods: { speed: 0.12 },
  },
  {
    id: "backpack",
    name: "کوله‌پشتی افسون‌شده",
    source: "Enchanted Backpack",
    rarity: "common",
    color: "#a98bd6",
    text: "گوهرها را از فاصله‌ای ۵۰٪ دورتر به سوی خود می‌کشی.",
    mods: { pickup: 0.5 },
  },
  {
    id: "scroll",
    name: "طومار افسون",
    source: "Spell Scroll",
    rarity: "common",
    color: "#f4ecd8",
    text: "زمان انتظار همه‌ی افسون‌ها ۶٪ کمتر می‌شود.",
    mods: { cd: -0.06 },
  },
  {
    id: "mandrake",
    name: "مندریک",
    source: "Mandrake",
    rarity: "common",
    color: "#8ff0a4",
    text: "انار ۵۰٪ بیشتر جان می‌دهد و بیشینه‌ی جان ۲۰ واحد بیشتر می‌شود.",
    mods: { heal: 0.5, maxHp: 20 },
  },
  {
    id: "totem",
    name: "توتم",
    source: "Totem",
    rarity: "common",
    color: "#c9973a",
    text: "هرگاه بایستی، در هر ثانیه ۱٫۲ جان بازمی‌یابی.",
    mods: { regen: 1.2 },
  },

  /* ------------------------------------------------------- نادر */
  {
    id: "magicbullet",
    name: "تیر جادو",
    source: "Magic Bullet",
    rarity: "rare",
    color: "#7ff5e6",
    text: "آسیب تیر افسون ۳۵٪ بیشتر و یک تیر دیگر پرتاب می‌شود.",
    mods: { spellDmg: { bolt: 0.35 }, spellCount: { bolt: 1 } },
  },
  {
    id: "torch",
    name: "مشعل",
    source: "Torch",
    rarity: "rare",
    color: "#ff8a3c",
    text: "آسیب گوی آتش ۴۰٪ و شعاع انفجارش ۲۵٪ بیشتر می‌شود.",
    mods: { spellDmg: { fire: 0.4 }, spellRadius: { fire: 0.25 } },
  },
  {
    id: "mooncrystal",
    name: "بلور ماه",
    source: "Moon Crystal",
    rarity: "rare",
    color: "#bfe9ff",
    text: "آسیب سرما ۵۰٪ بیشتر؛ دشمن یخ‌زده دو برابر آسیب می‌بیند.",
    mods: { spellDmg: { frost: 0.5 }, frozen: 2 },
  },
  {
    id: "thunderspear",
    name: "نیزهٔ آذرخش",
    source: "Thunder Spear",
    rarity: "epic",
    color: "#fff3a0",
    text: "آسیب آذرخش ۵۰٪ بیشتر و یک آذرخش دیگر فرود می‌آید.",
    mods: { spellDmg: { zap: 0.5 }, spellCount: { zap: 1 } },
  },
  {
    id: "galaxycore",
    name: "هستهٔ کهکشان",
    source: "Core of Galaxy",
    rarity: "epic",
    color: "#c9a8ff",
    text: "یک گوی نگهبان بیشتر و چرخششان ۲۵٪ تندتر.",
    mods: { spellCount: { orbs: 1 }, spellCd: { orbs: -0.25 } },
  },
  {
    id: "dimgate",
    name: "دروازهٔ بُعد",
    source: "Dimension Gate",
    rarity: "epic",
    color: "#ff8a5c",
    text: "یک شهاب بیشتر می‌بارد و شهاب‌ها ۲۵٪ زودتر بازمی‌گردند.",
    mods: { spellCount: { meteor: 1 }, spellCd: { meteor: -0.25 } },
  },
  {
    id: "forcefield",
    name: "سپر نیرو",
    source: "Force Field",
    rarity: "epic",
    color: "#9be8ff",
    text: "هر ۶۰ ثانیه یک ضربه را کامل می‌گیری و ۳ ثانیه رویین‌تن می‌شوی.",
    mods: { active: { id: "shield", cd: 60, label: "سپر" } },
  },
  {
    id: "spiderweb",
    name: "تار عنکبوت",
    source: "Spiderweb",
    rarity: "rare",
    color: "#e6ecf7",
    text: "سرعت حرکت همه‌ی دشمنان ۱۲٪ کمتر می‌شود.",
    mods: { enemySpeed: -0.12 },
  },
  {
    id: "scythe",
    name: "داس دروگر",
    source: "Reaper's Scythe",
    rarity: "epic",
    color: "#d8d2e8",
    text: "هر ۴ ثانیه چهار دشمن نزدیک بی‌درنگ درو می‌شوند.",
    mods: { active: { id: "scythe", cd: 4, label: "درو" } },
  },
  {
    id: "clockwork",
    name: "ساعت‌ساز",
    source: "Clockwork",
    rarity: "epic",
    color: "#f2c98a",
    text: "هر ۱۸ ثانیه دشمنان پیرامونت ۲ ثانیه از حرکت می‌ایستند.",
    mods: { active: { id: "clockwork", cd: 18, label: "ایست" } },
  },

  /* --------------------------------------------------- افسانه‌ای */
  {
    id: "blackcat",
    name: "گربهٔ سیاه",
    source: "Black Cat",
    rarity: "mythic",
    color: "#2b2440",
    text: "آسیب ۶٪ بیشتر، انتظار افسون‌ها ۹٪ کمتر، تجربه ۶٪ بیشتر و آسیب وارده ۶٪ کمتر.",
    mods: { dmg: 0.06, cd: -0.09, xp: 0.06, taken: 0.06 },
  },
  {
    id: "hourglass",
    name: "ساعت شنی",
    source: "Hourglass",
    rarity: "mythic",
    color: "#ffd98a",
    text: "زمان انتظار همه‌ی افسون‌ها ۱۲٪ کمتر می‌شود.",
    mods: { cd: -0.12 },
  },
  {
    id: "pandora",
    name: "جعبهٔ پاندورا",
    source: "Pandora's Box",
    rarity: "legendary",
    color: "#e23d4f",
    text: "هر ۵ ثانیه یکی از این افسون‌ها خودبه‌خود رها می‌شود: شهاب، فرّ یا آذرخش.",
    mods: { active: { id: "pandora", cd: 5, label: "پاندورا" } },
  },
  {
    id: "uranium",
    name: "اورانیوم",
    source: "Uranium",
    rarity: "legendary",
    color: "#b6ff5c",
    text: "آسیب ۱۰۰٪ و شعاع انفجارها ۲۰٪ بیشتر، اما انتظار افسون‌ها ۲۰٪ بیشتر می‌شود.",
    mods: { dmg: 1, cd: 0.2, spellRadius: { fire: 0.2, meteor: 0.2, nova: 0.2 } },
  },
  {
    id: "secondheart",
    name: "قلب دوم",
    source: "Second Heart",
    rarity: "legendary",
    color: "#ff5c7a",
    text: "یک جانِ دوم دیگر داری و بیشینه‌ی جانت ۵۰٪ بیشتر می‌شود.",
    mods: { revive: 1, maxHpPct: 0.5 },
  },
  {
    id: "exorcism",
    name: "جن‌گیری",
    source: "Exorcism",
    rarity: "legendary",
    color: "#f4ecd8",
    text: "جان همه‌ی دشمنان ۱۳٪ کمتر و تجربه‌ی کشتار ۲۰٪ بیشتر می‌شود.",
    mods: { enemyHp: -0.13, xp: 0.2 },
  },
  {
    id: "brand",
    name: "نشان کهنه",
    source: "Brand",
    rarity: "mythic",
    color: "#ff9f6e",
    text: "به دشمنی که بیش از ۵ ثانیه زنده مانده ۲۵٪ آسیب بیشتر می‌زنی.",
    mods: { aged: 0.25 },
  },
  /* ------------------------------------------- set: هم‌آوایی مانا */
  {
    id: "crystalseed",
    name: "بلور آغازین",
    source: "Primal Crystal",
    rarity: "rare",
    color: "#7ff5e6",
    text: "آسیب همه‌ی افسون‌ها ۶٪ بیشتر. (بخشی از دستِ «هم‌آوایی مانا»)",
    mods: { dmg: 0.06 },
  },
  {
    id: "manawheel",
    name: "گردونهٔ مانا",
    source: "Mana Wheel",
    rarity: "rare",
    color: "#8fd3ff",
    text: "شعاع برداشت گوهر ۱۵٪ بیشتر. (بخشی از دستِ «هم‌آوایی مانا»)",
    mods: { pickup: 0.15 },
  },
  {
    id: "twincore",
    name: "هستهٔ دوگانه",
    source: "Twin Core",
    rarity: "epic",
    color: "#c9a8ff",
    text: "زمان انتظار ۵٪ کمتر و تجربه ۵٪ بیشتر. (بخشی از دستِ «هم‌آوایی مانا»)",
    mods: { cd: -0.05, xp: 0.05 },
  },
];

/* ------------------------------------------------------------ artifact sets */

export interface ArtifactSet {
  id: string;
  name: string;
  pieces: ArtifactId[];
  /** extra effect while every piece is held; pieces are never consumed */
  bonus: Mods;
  text: string;
}

export const SETS: ArtifactSet[] = [
  {
    id: "manaHarmony",
    name: "هم‌آوایی مانا",
    pieces: ["crystalseed", "manawheel", "twincore"],
    bonus: { dmg: 0.1, pickup: 0.1 },
    text: "+۱۰٪ آسیب همه‌ی افسون‌ها و +۱۰٪ شعاع برداشت.",
  },
  {
    id: "bastion",
    name: "دژِ پایداری",
    pieces: ["mithril", "mandrake", "totem"],
    bonus: { taken: 0.08, maxHpPct: 0.15 },
    text: "آسیبی که می‌گیری ۸٪ کمتر و بیشینه‌ی جان ۱۵٪ بیشتر.",
  },
  {
    id: "timekeeper",
    name: "فرمانروای زمان",
    pieces: ["scroll", "clockwork", "hourglass"],
    bonus: { cd: -0.08, speed: 0.06 },
    text: "زمان انتظار همه‌ی افسون‌ها ۸٪ کمتر و سرعت حرکت ۶٪ بیشتر.",
  },
];

export interface SetProgress {
  set: ArtifactSet;
  have: ArtifactId[];
  complete: boolean;
}

/** Progress for every set, independent of the order pieces were found. */
export function setProgress(owned: readonly ArtifactId[]): SetProgress[] {
  const held = new Set(owned);
  return SETS.map((set) => {
    const have = set.pieces.filter((p) => held.has(p));
    return { set, have, complete: have.length === set.pieces.length };
  });
}

/** Ids of sets that are complete for this collection. */
export function activeSets(owned: readonly ArtifactId[]): string[] {
  return setProgress(owned)
    .filter((p) => p.complete)
    .map((p) => p.set.id);
}
export const ARTIFACT_IDS: ArtifactId[] = ARTIFACTS.map((a) => a.id);

export const BY_ID: Record<ArtifactId, Artifact> = ARTIFACTS.reduce(
  (acc, a) => {
    acc[a.id] = a;
    return acc;
  },
  {} as Record<ArtifactId, Artifact>,
);
