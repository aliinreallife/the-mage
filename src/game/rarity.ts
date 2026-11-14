import { UPGRADES, type UpgradeId } from "./data";

/** Same five tiers as artifacts: معمولی، نادر، نفیس، ممتاز، افسانه‌ای */
export type CardRarity = "common" | "rare" | "epic" | "mythic" | "legendary";

export const CARD_RARITY: Record<CardRarity, { name: string; color: string; rank: number }> = {
  common: { name: "معمولی", color: "#c9d2e4", rank: 0 },
  rare: { name: "نادر", color: "#3fd9c8", rank: 1 },
  epic: { name: "نفیس", color: "#b48cff", rank: 2 },
  mythic: { name: "ممتاز", color: "#ff8a5c", rank: 3 },
  legendary: { name: "افسانه‌ای", color: "#f2b84b", rank: 4 },
};

/**
 * How special a level-up card is.
 * Talents are نفیس, fusions are افسانه‌ای (assigned by the caller),
 * a spell's final rank is ممتاز, new spells and odd ranks are نادر.
 */
export function upgradeRarity(id: UpgradeId, next: number): CardRarity {
  const def = UPGRADES[id];
  if (def.kind === "boon") return "common";
  if (def.kind === "passive") return next >= def.max ? "epic" : next >= 4 ? "rare" : "common";
  if (next >= def.max) return "mythic";
  if (next === 1 || next === 3 || next === 5) return "rare";
  return "common";
}
