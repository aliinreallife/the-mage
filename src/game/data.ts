export type SpellId = "bolt" | "spirit" | "orbs" | "cyclone" | "zap" | "energy" | "flash" | "fire" | "frost" | "meteor" | "blade" | "nova";
export type PassiveId = "might" | "haste" | "swift" | "vital" | "regen" | "magnet" | "wisdom" | "armor" | "snipe" | "shield";
export type UpgradeId = SpellId | PassiveId | "heal";

export interface UpgradeDef {
  id: UpgradeId;
  kind: "spell" | "passive" | "boon";
  name: string;
  /** accent colour used for the icon, damage numbers and effects */
  color: string;
  max: number;
  /** description of what each level gives (index 0 = level 1) */
  levels: string[];
}

const rep = (text: string, n: number) => Array.from({ length: n }, () => text);

/** The seven primary families (levels 1–7, talents, fusions) first, then the extra spells. */
/**
 * Core passive numbers, matching the source game (Magic Survival):
 *   Intelligence +10% attack (5 ranks) · Fast Casting −5% all cooldowns (3 ranks)
 *   Vitality +20% max HP and +10% life-orb healing (5 ranks) · Snipe +5% critical chance (3 ranks)
 * Kept as plain data so a native port reads the same values.
 */
export const PASSIVE_TUNING = {
  intelligencePerRank: 0.1,
  fastCastingPerRank: 0.05,
  vitalityHpPerRank: 0.2,
  vitalityOrbPerRank: 0.1,
  snipeCritPerRank: 0.05,
  baseCritChance: 0.07,
  critMultiplier: 1.7,
} as const;

export const SPELL_IDS: SpellId[] = ["bolt", "spirit", "orbs", "cyclone", "zap", "energy", "flash", "fire", "frost", "meteor", "blade", "nova"];
export const PRIMARY_SPELLS: SpellId[] = ["bolt", "spirit", "orbs", "cyclone", "zap", "energy", "flash"];
export const PASSIVE_IDS: PassiveId[] = ["might", "haste", "swift", "vital", "regen", "magnet", "wisdom", "armor", "snipe", "shield"];

/**
 * Patch one existing numeric field of an existing per-level spell row.
 * Unknown spells, levels or fields return false — fields are never invented.
 */
export function patchSpellLevel(spell: string, level: number, patch: Record<string, number>): boolean {
  const table = SPELLS as unknown as Record<string, Record<string, unknown>[]>;
  const row = table[spell]?.[level - 1];
  if (!row) return false;
  let touched = false;
  for (const [key, value] of Object.entries(patch)) {
    if (typeof row[key] !== "number" || !Number.isFinite(value)) continue;
    row[key] = value;
    touched = true;
  }
  return touched;
}

export const UPGRADES: Record<UpgradeId, UpgradeDef> = {
  bolt: {
    id: "bolt",
    kind: "spell",
    name: "تیر جادویی",
    color: "#7ff5e6",
    max: 7,
    levels: [
      "تیری جادویی به‌سوی نزدیک‌ترین دشمن پرتاب می‌کند.",
      "یک تیر بیشتر پرتاب می‌شود.",
      "آسیب تیرها ۵۰٪ بیشتر می‌شود.",
      "تیرها تندتر پرتاب می‌شوند.",
      "یک تیر بیشتر پرتاب می‌شود.",
      "تیرها از دو دشمن می‌گذرند و آسیب بیشتری می‌زنند.",
      "واپسین سطح: چهار تیر سهمگین که از دو دشمن می‌گذرند.",
    ],
  },
  fire: {
    id: "fire",
    kind: "spell",
    name: "گوی آتش",
    color: "#ffb066",
    max: 6,
    levels: [
      "گوی آتشینی که دنبال نزدیک‌ترین دشمن می‌رود، با برخورد منفجر می‌شود و دشمنان را سه ثانیه می‌سوزاند.",
      "شعاع انفجار بزرگ‌تر می‌شود.",
      "آسیب انفجار بیشتر می‌شود.",
      "یک گوی آتش بیشتر پرتاب می‌شود.",
      "زمان انتظار گوی‌های آتش کمتر می‌شود.",
      "انفجاری ویرانگر با شعاع و آسیب بیشتر؛ سوختگی دشمنان به پنج ثانیه می‌رسد.",
    ],
  },
  spirit: {
    id: "spirit",
    kind: "spell",
    name: "ارواح یاری‌گر",
    color: "#c9a8ff",
    max: 7,
    levels: [
      "روحی یاری‌گر کنارت پدیدار می‌شود و موشک‌های جادویی دنبال‌کننده شلیک می‌کند.",
      "موشک‌ها آسیب بیشتری می‌زنند.",
      "یک روح بیشتر.",
      "آسیب بیشتر و شلیک تندتر.",
      "یک روح بیشتر.",
      "آسیب موشک‌ها بیشتر می‌شود.",
      "واپسین سطح: چهار روح با شلیک پیاپی.",
    ],
  },
  cyclone: {
    id: "cyclone",
    kind: "spell",
    name: "گردباد",
    color: "#9be8d0",
    max: 7,
    levels: [
      "گردبادی سرگردان در میدان رها می‌شود و هر دشمنِ درونش را زخمی می‌کند.",
      "گردباد بزرگ‌تر و ماندگارتر می‌شود.",
      "یک گردباد بیشتر.",
      "آسیب و اندازه بیشتر.",
      "گردبادها زودتر بازمی‌گردند.",
      "یک گردباد بیشتر.",
      "واپسین سطح: گردبادهای عظیم و پرآسیب.",
    ],
  },
  energy: {
    id: "energy",
    kind: "spell",
    name: "پرتو انرژی",
    color: "#ffe36e",
    max: 7,
    levels: [
      "پرتویی از انرژی ناب که از همه‌ی دشمنانِ سر راهش می‌گذرد.",
      "آسیب پرتو بیشتر می‌شود.",
      "پرتو پهن‌تر، بلندتر و تندتر می‌شود.",
      "آسیب پرتو بیشتر می‌شود.",
      "پرتو پهن‌تر و تندتر می‌شود.",
      "آسیب پرتو بیشتر می‌شود.",
      "واپسین سطح: پرتویی پهن و ویرانگر.",
    ],
  },
  flash: {
    id: "flash",
    kind: "spell",
    name: "ضربهٔ صاعقه",
    color: "#a8d8ff",
    max: 7,
    levels: [
      "صاعقه‌ای کوبنده بر دشمنی نزدیک فرود می‌آید و پیرامونش را می‌لرزاند.",
      "یک ضربهٔ بیشتر.",
      "آسیب و شعاع بیشتر.",
      "شعاع بیشتر و انتظار کمتر.",
      "یک ضربهٔ بیشتر.",
      "آسیب و شعاع بیشتر.",
      "واپسین سطح: چهار ضربهٔ سهمگین.",
    ],
  },
  zap: {
    id: "zap",
    kind: "spell",
    name: "آذرخش",
    color: "#fff3a0",
    max: 7,
    levels: [
      "آذرخشی بر دشمنی فرود می‌آید و به دو دشمن دیگر می‌جهد.",
      "یک آذرخش بیشتر فرود می‌آید.",
      "هر آذرخش دو جهش بیشتر دارد.",
      "آسیب آذرخش بیشتر می‌شود.",
      "آذرخش‌ها تندتر فرود می‌آیند.",
      "سه آذرخش هم‌زمان با آسیب بیشتر.",
      "واپسین سطح: چهار آذرخش با پنج جهش و آسیب بیشتر.",
    ],
  },
  frost: {
    id: "frost",
    kind: "spell",
    name: "دمِ زمستان",
    color: "#bfe9ff",
    max: 6,
    levels: [
      "هاله‌ای یخی که دشمنان پیرامونت را کُند و زخمی می‌کند.",
      "هاله بزرگ‌تر می‌شود.",
      "آسیب سرما بیشتر می‌شود.",
      "دشمنان بیشتر کُند می‌شوند.",
      "هاله بزرگ‌تر می‌شود.",
      "سرمایی استخوان‌سوز: آسیب و کُندی بیشتر.",
    ],
  },
  orbs: {
    id: "orbs",
    kind: "spell",
    name: "مدارگرد",
    color: "#ffd98a",
    max: 7,
    levels: [
      "دو گوی فروزان گرد تو می‌چرخند و هر دشمنی را که لمس کنند می‌سوزانند.",
      "یک گوی بیشتر.",
      "آسیب گوی‌ها بیشتر می‌شود.",
      "یک گوی بیشتر و مدار بزرگ‌تر.",
      "گوی‌ها تندتر می‌چرخند.",
      "پنج گوی با آسیب بیشتر.",
      "واپسین سطح: شش مدارگرد با آسیب و چرخش بیشتر.",
    ],
  },
  meteor: {
    id: "meteor",
    kind: "spell",
    name: "شهاب‌باران",
    color: "#ff8a5c",
    max: 6,
    levels: [
      "شهابی از آسمان بر سر دشمنان فرود می‌آید و زمین را می‌لرزاند.",
      "یک شهاب بیشتر.",
      "شعاع برخورد بزرگ‌تر می‌شود.",
      "آسیب شهاب‌ها بیشتر می‌شود.",
      "یک شهاب بیشتر.",
      "شهاب‌ها تندتر و سهمگین‌تر می‌بارند.",
    ],
  },
  blade: {
    id: "blade",
    kind: "spell",
    name: "تیغ باد",
    color: "#d8fff6",
    max: 6,
    levels: [
      "تیغه‌ای از باد در جهت حرکتت که از همه‌ی دشمنان می‌گذرد.",
      "آسیب تیغه بیشتر می‌شود.",
      "تیغه‌ای دیگر به پشت سرت پرتاب می‌شود.",
      "تیغه‌ها بزرگ‌تر می‌شوند.",
      "تیغه‌ها تندتر پرتاب می‌شوند.",
      "چهار تیغه به چهار سو با آسیب بیشتر.",
    ],
  },
  nova: {
    id: "nova",
    kind: "spell",
    name: "فرّ ایزدی",
    color: "#ffe9b0",
    max: 6,
    levels: [
      "موجی از نور از تو برمی‌خیزد و دشمنان را پس می‌زند.",
      "آسیب موج بیشتر می‌شود.",
      "موج تا دورتر می‌رسد.",
      "موج زودتر بازمی‌گردد.",
      "آسیب موج بیشتر می‌شود.",
      "موجی پهناور که پیاپی برمی‌خیزد.",
    ],
  },

  might: {
    id: "might",
    kind: "passive",
    name: "هوش",
    color: "#ff9f6e",
    max: 5,
    levels: rep("آسیب همه‌ی افسون‌ها ۱۰٪ بیشتر می‌شود.", 5),
  },
  haste: {
    id: "haste",
    kind: "passive",
    name: "افسون‌خوانی سریع",
    color: "#c9a8ff",
    max: 3,
    levels: rep("زمان انتظار همه‌ی افسون‌ها ۵٪ کمتر می‌شود.", 3),
  },
  swift: {
    id: "swift",
    kind: "passive",
    name: "گام باد",
    color: "#9be8ff",
    max: 5,
    levels: rep("سرعت حرکتت ۸٪ بیشتر می‌شود.", 5),
  },
  vital: {
    id: "vital",
    kind: "passive",
    name: "سرزندگی",
    color: "#ff7d8c",
    max: 5,
    levels: rep("بیشینه‌ی جان ۲۰٪ بیشتر و درمانِ انار ۱۰٪ بیشتر می‌شود.", 5),
  },
  regen: {
    id: "regen",
    kind: "passive",
    name: "نوشدارو",
    color: "#8ff0a4",
    max: 5,
    levels: rep("در هر ثانیه ۰٫۵ جان بیشتر بازمی‌یابی.", 5),
  },
  magnet: {
    id: "magnet",
    kind: "passive",
    name: "کهربا",
    color: "#ffc857",
    max: 5,
    levels: rep("گوهرها را از فاصله‌ای ۳۰٪ دورتر به سوی خود می‌کشی.", 5),
  },
  wisdom: {
    id: "wisdom",
    kind: "passive",
    name: "خرد",
    color: "#8fd3ff",
    max: 5,
    levels: rep("از هر گوهر ۱۲٪ تجربه‌ی بیشتر می‌گیری.", 5),
  },
  armor: {
    id: "armor",
    kind: "passive",
    name: "زره",
    color: "#cfd6e6",
    max: 5,
    levels: rep("هر ضربه‌ی دشمن ۲ واحد کمتر آسیب می‌زند.", 5),
  },

  snipe: {
    id: "snipe",
    kind: "passive",
    name: "نشانه‌روی",
    color: "#ffd1a6",
    max: 3,
    levels: rep("شانس ضربهٔ بحرانی ۵٪ بیشتر می‌شود.", 3),
  },
  shield: {
    id: "shield",
    kind: "passive",
    name: "سپر جادویی",
    color: "#9be8ff",
    max: 5,
    levels: [
      "سپری که یک ضربه را کامل می‌گیرد؛ هر ۱۸ ثانیه بازمی‌گردد.",
      "سپر هر ۱۵ ثانیه بازمی‌گردد.",
      "سپر هر ۱۲٫۵ ثانیه بازمی‌گردد.",
      "سپر هر ۱۰٫۵ ثانیه بازمی‌گردد.",
      "سپر هر ۹ ثانیه بازمی‌گردد.",
    ],
  },
  heal: {
    id: "heal",
    kind: "boon",
    name: "انار",
    color: "#ff6b78",
    max: 1,
    levels: ["اناری تازه: ۳۰ جان بازمی‌گردد."],
  },
};

/** Per-level numbers for every spell (index 0 = level 1). */
export const SPELLS = {
  /** shield passive: seconds until the barrier returns, per rank */
  shield: [18, 15, 12.5, 10.5, 9],
  spirit: [
    { dmg: 7, count: 1, cd: 1.6 },
    { dmg: 9, count: 1, cd: 1.5 },
    { dmg: 9, count: 2, cd: 1.5 },
    { dmg: 12, count: 2, cd: 1.35 },
    { dmg: 12, count: 3, cd: 1.3 },
    { dmg: 16, count: 3, cd: 1.2 },
    { dmg: 20, count: 4, cd: 1.1 },
  ],
  cyclone: [
    { dmg: 5, count: 1, cd: 4.5, radius: 42, dur: 3 },
    { dmg: 6, count: 1, cd: 4.2, radius: 46, dur: 3.3 },
    { dmg: 6, count: 2, cd: 4.2, radius: 46, dur: 3.3 },
    { dmg: 8, count: 2, cd: 3.9, radius: 52, dur: 3.5 },
    { dmg: 8, count: 2, cd: 3.4, radius: 56, dur: 3.8 },
    { dmg: 11, count: 3, cd: 3.4, radius: 58, dur: 4 },
    { dmg: 14, count: 3, cd: 3, radius: 66, dur: 4.4 },
  ],
  energy: [
    { dmg: 18, cd: 2.6, width: 9, len: 520 },
    { dmg: 24, cd: 2.6, width: 9, len: 520 },
    { dmg: 24, cd: 2.2, width: 11, len: 560 },
    { dmg: 32, cd: 2.2, width: 11, len: 560 },
    { dmg: 32, cd: 1.9, width: 13, len: 600 },
    { dmg: 42, cd: 1.7, width: 13, len: 620 },
    { dmg: 54, cd: 1.5, width: 16, len: 660 },
  ],
  flash: [
    { dmg: 26, count: 1, radius: 60, cd: 3.4 },
    { dmg: 26, count: 2, radius: 60, cd: 3.4 },
    { dmg: 34, count: 2, radius: 66, cd: 3.2 },
    { dmg: 34, count: 2, radius: 76, cd: 2.9 },
    { dmg: 44, count: 3, radius: 76, cd: 2.9 },
    { dmg: 56, count: 3, radius: 84, cd: 2.6 },
    { dmg: 70, count: 4, radius: 90, cd: 2.4 },
  ],
  bolt: [
    { dmg: 10, count: 1, cd: 0.75, pierce: 0 },
    { dmg: 10, count: 2, cd: 0.75, pierce: 0 },
    { dmg: 15, count: 2, cd: 0.75, pierce: 0 },
    { dmg: 15, count: 2, cd: 0.55, pierce: 0 },
    { dmg: 15, count: 3, cd: 0.55, pierce: 0 },
    { dmg: 21, count: 3, cd: 0.55, pierce: 2 },
    { dmg: 28, count: 4, cd: 0.5, pierce: 2 },
  ],
  fire: [
    { dmg: 20, radius: 58, cd: 2.4, count: 1 },
    { dmg: 20, radius: 74, cd: 2.4, count: 1 },
    { dmg: 32, radius: 74, cd: 2.4, count: 1 },
    { dmg: 32, radius: 74, cd: 2.4, count: 2 },
    { dmg: 32, radius: 74, cd: 1.8, count: 2 },
    { dmg: 48, radius: 90, cd: 1.8, count: 2 },
  ],
  zap: [
    { dmg: 22, strikes: 1, chain: 2, cd: 1.9 },
    { dmg: 22, strikes: 2, chain: 2, cd: 1.9 },
    { dmg: 22, strikes: 2, chain: 4, cd: 1.9 },
    { dmg: 34, strikes: 2, chain: 4, cd: 1.9 },
    { dmg: 34, strikes: 2, chain: 4, cd: 1.4 },
    { dmg: 44, strikes: 3, chain: 4, cd: 1.4 },
    { dmg: 56, strikes: 4, chain: 5, cd: 1.3 },
  ],
  frost: [
    { dmg: 4, radius: 85, slow: 0.25 },
    { dmg: 4, radius: 105, slow: 0.25 },
    { dmg: 7, radius: 105, slow: 0.25 },
    { dmg: 7, radius: 105, slow: 0.4 },
    { dmg: 7, radius: 128, slow: 0.4 },
    { dmg: 11, radius: 128, slow: 0.5 },
  ],
  orbs: [
    { dmg: 9, count: 2, radius: 68, spin: 2.6 },
    { dmg: 9, count: 3, radius: 68, spin: 2.6 },
    { dmg: 14, count: 3, radius: 68, spin: 2.6 },
    { dmg: 14, count: 4, radius: 80, spin: 2.6 },
    { dmg: 14, count: 4, radius: 80, spin: 3.7 },
    { dmg: 20, count: 5, radius: 80, spin: 3.7 },
    { dmg: 26, count: 6, radius: 88, spin: 4.0 },
  ],
  meteor: [
    { dmg: 40, count: 1, radius: 70, cd: 3.6 },
    { dmg: 40, count: 2, radius: 70, cd: 3.6 },
    { dmg: 40, count: 2, radius: 90, cd: 3.6 },
    { dmg: 60, count: 2, radius: 90, cd: 3.6 },
    { dmg: 60, count: 3, radius: 90, cd: 3.6 },
    { dmg: 80, count: 3, radius: 90, cd: 2.6 },
  ],
  blade: [
    { dmg: 13, count: 1, size: 22, cd: 1.7 },
    { dmg: 19, count: 1, size: 22, cd: 1.7 },
    { dmg: 19, count: 2, size: 22, cd: 1.7 },
    { dmg: 19, count: 2, size: 32, cd: 1.7 },
    { dmg: 19, count: 2, size: 32, cd: 1.2 },
    { dmg: 26, count: 4, size: 32, cd: 1.2 },
  ],
  nova: [
    { dmg: 16, radius: 150, cd: 5 },
    { dmg: 26, radius: 150, cd: 5 },
    { dmg: 26, radius: 190, cd: 5 },
    { dmg: 26, radius: 190, cd: 3.8 },
    { dmg: 38, radius: 190, cd: 3.8 },
    { dmg: 38, radius: 235, cd: 3 },
  ],
} as const;
