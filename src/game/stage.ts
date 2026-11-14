/** Stage definitions. Plain data so a native port can read the same numbers. */
import { fa } from "./fa";

export type WaveKind = "slay" | "elites" | "hold" | "boss";

export interface WaveDef {
  /** survival seconds when the wave begins */
  at: number;
  kind: WaveKind;
  name: string;
  /** kills (slay), elites (elites) or seconds (hold); ignored for boss */
  target: number;
  /** radius of the danger boundary around the wave centre */
  radius: number;
  /** enemies per second during the wave */
  spawnRate: number;
  /** grants an artifact choice when completed */
  reward: boolean;
  /** extra HP multiplier for the wave's objective chieftains */
  eliteHpMul?: number;
}

export interface BossDef {
  name: string;
  hp: number;
  /** fraction of HP at which phase two begins */
  phase2At: number;
  /** seconds between attacks */
  attackGap: [number, number];
  slam: { radius: number; delay: number; dmg: number };
  volley: { delay: number; count: number; spread: number; speed: number; dmg: number };
  nova: { delay: number; count: number; speed: number; dmg: number };
  speedPhase2: number;
}

export interface StageDef {
  id: string;
  name: string;
  /** survival seconds required (the final wave starts here) */
  duration: number;
  /** damage per tick while outside the boundary, and the tick length */
  boundaryDamage: number;
  boundaryTick: number;
  /**
   * The stage clock runs the shared difficulty curve at this speed, so the
   * 20-minute stage peaks where an endless run would be at ~10 minutes.
   */
  difficultyScale: number;
  /** seconds between field treasure chests (wave rewards come on top) */
  chestEvery: number;
  /**
   * Stage enemies scale with the player's own power, not only with the clock.
   * Without this a stage player reaches level 130+ while enemies scale to minute 10.
   */
  playerPower: { fromLevel: number; perLevel: number; max: number };
  /** extra HP/damage per wave index (index 3 = boss wave: no extra adds) */
  wavePower: number[];
  waves: WaveDef[];
  boss: BossDef;
}

export const PROVING_GROUNDS: StageDef = {
  id: "proving",
  name: "میدان آزمایش",
  duration: 1200,
  boundaryDamage: 9,
  boundaryTick: 0.5,
  difficultyScale: 0.75,
  chestEvery: 115,
  playerPower: { fromLevel: 20, perLevel: 0.025, max: 5 },
  wavePower: [1.3, 1.5, 1.6, 1],
  waves: [
    {
      at: 300,
      kind: "slay",
      name: "موج نخست — هجوم سایه‌ها",
      target: 120,
      radius: 430,
      spawnRate: 7,
      reward: true,
    },
    {
      at: 600,
      kind: "elites",
      name: "موج دوم — سرکردگان",
      target: 4,
      radius: 420,
      spawnRate: 4,
      reward: true,
      eliteHpMul: 1.6,
    },
    {
      at: 900,
      kind: "hold",
      name: "موج سوم — پایداری",
      target: 40,
      radius: 300,
      spawnRate: 8,
      reward: true,
    },
    {
      at: 1200,
      kind: "boss",
      name: "موج پایانی — نگهبانِ میدان",
      target: 1,
      radius: 470,
      spawnRate: 2.5,
      reward: false,
    },
  ],
  boss: {
    name: "نگهبانِ میدان",
    hp: 45000,
    phase2At: 0.55,
    attackGap: [2.2, 1.4],
    slam: { radius: 96, delay: 1.0, dmg: 26 },
    volley: { delay: 0.7, count: 6, spread: 0.6, speed: 215, dmg: 16 },
    nova: { delay: 0.85, count: 20, speed: 195, dmg: 16 },
    speedPhase2: 1.45,
  },
};

/**
 * The objective sentence shown to the player, generated from the same numbers the
 * engine checks — so the text can never disagree with the real requirement.
 */
export function waveGoal(w: WaveDef, stage: StageDef = PROVING_GROUNDS): string {
  switch (w.kind) {
    case "slay":
      return `${fa(w.target)} دیوِ تازه‌رسیدهٔ این موج را بکُش`;
    case "elites":
      return `هر ${fa(w.target)} سرکردهٔ این موج را از پای درآور`;
    case "hold":
      return `در مجموع ${fa(w.target)} ثانیه درون حلقه بمان`;
    case "boss":
      return `${stage.boss.name} را در دو مرحله شکست بده`;
  }
}

/** One-line summary of the whole stage for menus. */
export function stageSummary(stage: StageDef = PROVING_GROUNDS): string {
  const fights = stage.waves.length;
  return `${fa(stage.duration / 60)} دقیقه بقا و ${fa(fights)} موج؛ موج آخر نبرد با ${stage.boss.name} است`;
}
