/** Permanent progression: research tracks and gold rewards. Pure data + pure functions. */
import { fa } from "./fa";

export type ResearchId = "attack" | "hp" | "pickup";
export type ResearchRanks = Record<ResearchId, number>;

export interface ResearchDef {
  id: ResearchId;
  name: string;
  /** bonus per rank, as a fraction (0.05 = +5%) */
  perRank: number;
  /** gold cost of rank 1, 2, 3 … */
  costs: number[];
  describe: (rank: number) => string;
}

const pct = (v: number) => fa(Math.round(v * 100));

export const RESEARCH: ResearchDef[] = [
  {
    id: "attack",
    name: "پژوهشِ یورش",
    perRank: 0.05,
    costs: [100, 200, 350],
    describe: (r) => `آسیب همه‌ی افسون‌ها +${pct(0.05 * r)}٪`,
  },
  {
    id: "hp",
    name: "پژوهشِ تن‌آوری",
    perRank: 0.1,
    costs: [100, 200, 350],
    describe: (r) => `بیشینه‌ی جان +${pct(0.1 * r)}٪`,
  },
  {
    id: "pickup",
    name: "پژوهشِ کهربا",
    perRank: 0.1,
    costs: [100, 200, 350],
    describe: (r) => `شعاع برداشت گوهر +${pct(0.1 * r)}٪`,
  },
];

export const BY_RESEARCH: Record<ResearchId, ResearchDef> = Object.fromEntries(RESEARCH.map((r) => [r.id, r])) as Record<
  ResearchId,
  ResearchDef
>;

export const NO_RESEARCH: ResearchRanks = { attack: 0, hp: 0, pickup: 0 };

export function maxRank(id: ResearchId) {
  return BY_RESEARCH[id].costs.length;
}

/** Cost of the next rank, or null when the track is complete. */
export function nextCost(id: ResearchId, rank: number): number | null {
  return BY_RESEARCH[id].costs[rank] ?? null;
}

/** Multipliers a run receives from research. */
export function researchBonus(r: ResearchRanks) {
  return {
    dmg: BY_RESEARCH.attack.perRank * (r.attack ?? 0),
    maxHpPct: BY_RESEARCH.hp.perRank * (r.hp ?? 0),
    pickup: BY_RESEARCH.pickup.perRank * (r.pickup ?? 0),
  };
}

/** Try to buy a rank. Returns the new wallet and ranks, or null if not affordable / maxed. */
export function buyResearch(gold: number, ranks: ResearchRanks, id: ResearchId): { gold: number; ranks: ResearchRanks } | null {
  const cost = nextCost(id, ranks[id] ?? 0);
  if (cost === null || gold < cost) return null;
  return { gold: gold - cost, ranks: { ...ranks, [id]: (ranks[id] ?? 0) + 1 } };
}

export interface RunSummary {
  time: number;
  kills: number;
  wavesCleared: number;
  victory: boolean;
  difficulty: "normal" | "adaptive" | "brutal";
}

/** Gold earned at the end of a run. */
export function goldForRun(r: RunSummary): number {
  const mul = r.difficulty === "brutal" ? 1.4 : r.difficulty === "normal" ? 0.8 : 1;
  const base = r.time / 6 + r.kills / 25 + r.wavesCleared * 60 + (r.victory ? 400 : 0);
  return Math.max(0, Math.round(base * mul));
}
