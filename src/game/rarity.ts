/** Artifact chest tiers only; normal level-up abilities have types, not rarity. */
export type CardRarity = "common" | "rare" | "epic" | "mythic" | "legendary";

export const CARD_RARITY: Record<CardRarity, { name: string; color: string; rank: number }> = {
  common: { name: "معمولی", color: "#c9d2e4", rank: 0 },
  rare: { name: "نادر", color: "#3fd9c8", rank: 1 },
  epic: { name: "نفیس", color: "#b48cff", rank: 2 },
  mythic: { name: "ممتاز", color: "#ff8a5c", rank: 3 },
  legendary: { name: "افسانه‌ای", color: "#f2b84b", rank: 4 },
};
