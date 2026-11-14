/**
 * One-time power surges chosen at special levels (5th, 10th, 15th…).
 * Descriptions are generated from the same numbers the engine applies,
 * so the text can never drift from the real effect again.
 */
import { fa } from "./fa";

export type BoonId = "mind" | "flame" | "shadow" | "crystal" | "spirit" | "soul" | "star" | "world";

export interface BoonEffect {
  /** damage multiplier per stack, multiplicative: 0.18 → ×1.18 */
  dmg?: number;
  /** cooldown change per stack, multiplicative: -0.1 → ×0.9 */
  cd?: number;
  /** additive move-speed bonus per stack */
  speed?: number;
  /** flat max HP per stack */
  maxHp?: number;
  /** HP restored when chosen */
  healNow?: number;
  /** additive experience bonus per stack */
  xp?: number;
  /** additive pickup-radius bonus per stack */
  pickup?: number;
  /** extra revival charges per stack */
  revive?: number;
  /** additive ultimate-charge bonus per stack */
  ult?: number;
}

export interface Boon extends BoonEffect {
  id: BoonId;
  name: string;
  color: string;
  text: string;
}

const pct = (v: number) => fa(Math.round(Math.abs(v) * 100));

/** Human-readable description built only from the effect values. */
export function describeBoon(e: BoonEffect): string {
  const parts: string[] = [];
  if (e.dmg) parts.push(`آسیب همه‌ی افسون‌ها ${pct(e.dmg)}٪ بیشتر`);
  if (e.cd) parts.push(`زمان انتظار افسون‌ها ${pct(e.cd)}٪ کمتر`);
  if (e.speed) parts.push(`سرعت حرکت ${pct(e.speed)}٪ بیشتر`);
  if (e.maxHp) parts.push(`بیشینه‌ی جان ${fa(e.maxHp)} واحد بیشتر`);
  if (e.healNow) parts.push(`${fa(e.healNow)} جان بی‌درنگ بازمی‌گردد`);
  if (e.xp) parts.push(`تجربه‌ی گوهرها ${pct(e.xp)}٪ بیشتر`);
  if (e.pickup) parts.push(`شعاع برداشت ${pct(e.pickup)}٪ بیشتر`);
  if (e.revive) parts.push(`${fa(e.revive)} جانِ دوم بیشتر`);
  if (e.ult) parts.push(`شارژ فرّ ایزدی ${pct(e.ult)}٪ تندتر`);
  return parts.join("؛ ") + ".";
}

const DEFS: (Omit<Boon, "text">)[] = [
  { id: "mind", name: "ذهنِ تیز", color: "#ff9f6e", dmg: 0.18 },
  { id: "flame", name: "نفسِ آتش", color: "#ffb066", cd: -0.1 },
  { id: "shadow", name: "گامِ سایه", color: "#9be8ff", speed: 0.1 },
  { id: "crystal", name: "قلبِ بلورین", color: "#ff7d8c", maxHp: 30, healNow: 30 },
  { id: "spirit", name: "پیمانِ ارواح", color: "#8fd3ff", xp: 0.15 },
  { id: "soul", name: "جانِ دیگر", color: "#ffe9b0", revive: 1 },
  { id: "star", name: "ستارهٔ هدایت", color: "#f2b84b", pickup: 0.3, ult: 0.2 },
  { id: "world", name: "دستِ جهان", color: "#3fd9c8", dmg: 0.15, cd: -0.05 },
];

export const BOONS: Boon[] = DEFS.map((d) => ({ ...d, text: describeBoon(d) }));

export const BY_BOON: Record<BoonId, Boon> = Object.fromEntries(BOONS.map((b) => [b.id, b])) as Record<BoonId, Boon>;

export const BOON_IDS = BOONS.map((b) => b.id);

/** The level numbers that grant a boon. */
export function isSpecialLevel(level: number) {
  return level > 1 && level % 5 === 0;
}
