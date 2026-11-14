import { PASSIVE_TUNING, PASSIVE_IDS, SPELL_IDS, SPELLS, UPGRADES, type PassiveId, type SpellId, type UpgradeId } from "./data";
import { ARTIFACTS, BY_ID, RARITY, SETS, activeSets, tierTilt, type ArtifactId, type ActiveId, type Mods } from "./artifacts";
import { BOON_IDS, BY_BOON, isSpecialLevel, type BoonId } from "./boons";
import { makeRng, randomSeed, SIM_STEP, MAX_FRAME, type Rng } from "./rng";
import { NO_RESEARCH, researchBonus, type ResearchRanks } from "./progression";
import { BY_HERO, type HeroId } from "./heroes";
import { PROVING_GROUNDS, type StageDef, type WaveKind, waveGoal } from "./stage";
import { FUSIONS, TALENTS, FUSION_IDS, recipesForTalent, recipePath, MASTERIES, canFuse, canTakeMastery, canTakeTalent, fusionSlots, masteriesFor, talentsFor, type FusionId, type MagicView, type MasteryId, type TalentId } from "./talents";
import { fa } from "./fa";
import { CHECKPOINT_VERSION, newRunId, type Checkpoint } from "./checkpoint";
import { newTelemetry, type RunTelemetry } from "./telemetry";
import { makeRng as reseed } from "./rng";
import type { SfxName } from "./audio";

/* ------------------------------------------------------------------ types */

export type EnemyType = "shade" | "bat" | "ghoul" | "div" | "boss";
export type Difficulty = "normal" | "adaptive" | "brutal";

export type GameEvent =
  | { type: "levelup" }
  | { type: "gameover" }
  | { type: "banner"; text: string; tone: "info" | "danger" | "good" }
  | { type: "artifact"; id: ArtifactId }
  | { type: "relic" }
  | { type: "boon" }
  | { type: "set"; id: string }
  | { type: "victory" }
  | { type: "sfx"; name: SfxName };

export interface Choice {
  id: UpgradeId;
  next: number;
  /** This card is a valid next step on a fusion recipe path. */
  guidance?: FusionId;
  /** a talent for spell `id` */
  talent?: TalentId;
  /** a fusion whose primary spell is `id` */
  fusion?: FusionId;
  /** a second-tier talent (mastery) for spell `id` */
  mastery?: MasteryId;
}

export interface Snapshot {
  time: number;
  kills: number;
  level: number;
  xp: number;
  xpNeed: number;
  hp: number;
  maxHp: number;
  spells: { id: SpellId; lvl: number }[];
  passives: { id: PassiveId; lvl: number }[];
  boss: number | null;
  combo: number;
  /** 0..100 — «فرّ ایزدی» charge */
  ult: number;
  /** 0..3 night phase, see PHASES */
  phase: number;
  /** how many «جانِ دوم» charges are left */
  wind: number;
  /** gems collected during the previous second — a peak into the mana flow */
  gemsPerSec: number;
  /** artifacts found this run, oldest first */
  artifacts: ArtifactId[];
  /** treasure chests waiting on the field */
  chests: number;
  /** active artifacts and how close they are to firing again (0..1) */
  actives: { id: ActiveId; label: string; ready: number }[];
  /** special-level boons collected, with counts */
  boons: { id: BoonId; count: number }[];
  /** how many boons are waiting to be chosen */
  pendingBoon: number;
  difficulty: Difficulty;
  /** current adaptive pressure, 0..100 (how hard the night is leaning in) */
  pressure: number;
  hero: HeroId;
  mode: "stage" | "endless";
  /** the clock shown to the player: stage survival time (paused in waves) or total time */
  clock: number;
  wave: WaveView | null;
  wavesCleared: number;
  totalWaves: number;
  /** survival second the next wave starts at, or null */
  nextWaveAt: number | null;
  outcome: "victory" | "defeat" | null;
  shieldReady: boolean;
  talents: { spell: SpellId; talent: TalentId }[];
  masteries: { spell: SpellId; mastery: MasteryId }[];
  fusions: { spell: SpellId; fusion: FusionId }[];
  fusionSlots: number;
  fusionFocus: FusionId | null;
}

export interface Joystick {
  ox: number;
  oy: number;
  x: number;
  y: number;
}

interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  r: number;
  speed: number;
  dmg: number;
  xp: number;
  flash: number;
  touchCd: number;
  orbCd: number;
  slowT: number;
  slowAmt: number;
  seed: number;
  dead: boolean;
  d2: number;
  born: number;
  /** freeze from the ultimate, in seconds */
  stun: number;
  /** countdown until the next ranged attack */
  shootCd: number;
  /** a gilded chieftain: tougher, richer, glowing */
  elite: boolean;
  /** counts toward the current wave's objective */
  objective?: boolean;
  /** burning: seconds left, time to the next tick, damage per tick */
  burnT: number;
  burnTick: number;
  burnDmg: number;
}

/** A telegraphed boss attack: drawn as a warning, resolved when the timer ends. */
interface Telegraph {
  kind: "circle" | "line" | "ring";
  x: number;
  y: number;
  r: number;
  angle: number;
  t: number;
  delay: number;
  dmg: number;
  count: number;
  spread: number;
  speed: number;
  /** follows the boss while charging */
  follow: boolean;
}

export interface WaveView {
  index: number;
  kind: WaveKind;
  name: string;
  goal: string;
  current: number;
  target: number;
  progress: number;
  outside: boolean;
  bossPhase: number;
  /** Earliest currently telegraphed attack, if the warden is charging one. */
  warning: { kind: Telegraph["kind"]; remaining: number; delay: number } | null;
}

/** A dodgeable projectile spat out by a div or the white div. */
interface Hazard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  dmg: number;
  life: number;
  seed: number;
  dead: boolean;
}

interface Shot {
  kind: "bolt" | "fire" | "blade" | "missile" | "cyclone" | "phantom" | "firework" | "heavy";
  /** talent behaviour flag: "firecracker", "missile", "void" */
  fx?: string;
  /** cyclone damage tick / firework fuse / heavy shock cooldown */
  tick?: number;
  /** phantom ricochets left */
  bounce?: number;
  /** the enemy a fireball was launched at; it keeps homing there while that enemy lives */
  target?: Enemy | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  dmg: number;
  life: number;
  pierce: number;
  radius: number;
  hit: Set<number> | null;
  dead: boolean;
  /** recent positions, flat [x, y, x, y, ...] for the motion trail */
  trail: number[];
  seed: number;
}

interface Gem {
  x: number;
  y: number;
  value: number;
  pull: boolean;
  sp: number;
  seed: number;
  dead: boolean;
  glow: number;
}

/** A treasure chest: touch it and an artifact is yours. */
interface Chest {
  /** stable id for checkpoints: a claimed chest is remembered by id and never restored */
  id: number;
  x: number;
  y: number;
  seed: number;
  dead: boolean;
}

interface Pickup {
  /** stable id for checkpoints */
  id: number;
  kind: "anar" | "kahroba";
  x: number;
  y: number;
  seed: number;
  dead: boolean;
}

interface Meteor {
  x: number;
  y: number;
  t: number;
  delay: number;
  r: number;
  dmg: number;
}

interface Nova {
  x: number;
  y: number;
  r: number;
  maxR: number;
  dmg: number;
  hit: Set<number>;
}

interface Lightning {
  pts: number[];
  life: number;
}

interface Blast {
  x: number;
  y: number;
  r: number;
  life: number;
  max: number;
  color: string;
}

interface FlashRing {
  x: number;
  y: number;
  r: number;
  maxR: number;
  life: number;
  max: number;
  color: string;
  width: number;
}

interface FloatText {
  x: number;
  y: number;
  s: string;
  life: number;
  color: string;
  size: number;
  vy: number;
  scale: number;
}

/** Cosmetic fire particles: embers rise and fade, smoke drifts and grows. Never part of the simulation. */
interface FireParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  smoke: boolean;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface Dust {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  seed: number;
}

/* -------------------------------------------------------------- constants */

const TAU = Math.PI * 2;
const CELL = 80;
const MAX_ER = 44;
const TILE = 320;
const TILE_RES = 2;

/* Fireball tuning: every number that shapes how the flame behaves. */
const FIRE_HOME_RANGE = 240; // how far a fireball can sense an enemy
const FIRE_TURN = 4.0; // steering limit, radians per second (2.6 orbited targets; 4.0 reaches them)
const BURN_TICK = 0.5; // seconds between burn damage ticks
const BURN_FRACTION = 0.12; // one burn tick, as a share of the blast damage

const ENEMY: Record<EnemyType, { hp: number; speed: number; dmg: number; r: number; xp: number }> = {
  shade: { hp: 8, speed: 52, dmg: 8, r: 11, xp: 1 },
  bat: { hp: 5, speed: 108, dmg: 5, r: 8, xp: 1 },
  ghoul: { hp: 42, speed: 40, dmg: 14, r: 17, xp: 3 },
  div: { hp: 150, speed: 50, dmg: 22, r: 24, xp: 10 },
  boss: { hp: 1100, speed: 64, dmg: 34, r: 40, xp: 80 },
};

const ECOL: Record<EnemyType, { body: string; edge: string; eye: string }> = {
  shade: { body: "#7442a0", edge: "#2c1440", eye: "#ffd166" },
  bat: { body: "#a57bea", edge: "#3d2470", eye: "#fff0b8" },
  ghoul: { body: "#5f9270", edge: "#213a2b", eye: "#ff6a6a" },
  div: { body: "#c93a45", edge: "#5a1019", eye: "#ffd166" },
  boss: { body: "#f1e8d2", edge: "#7d7460", eye: "#ff3b4e" },
};

const C = UPGRADES;

/** Night phases: the world subtly changes hue and the horde grows bolder. */
export const PHASES = [
  { name: "پگاهِ لاجوردی", text: "هوای شب آرام است…", tint: "rgba(32, 74, 150, 0.10)", banner: "#bfe9ff" },
  { name: "نیمه‌شب", text: "دیوان بی‌قرار می‌شوند.", tint: "rgba(94, 52, 150, 0.13)", banner: "#d8c2ff" },
  { name: "سرخ‌ماه", text: "سرخ‌ماه برخاست؛ گوهرها فراوان‌ترند!", tint: "rgba(170, 28, 44, 0.15)", banner: "#ff9aa5" },
  { name: "سپیدهٔ سرد", text: "سپیده دمیده و هوا سردتر است.", tint: "rgba(30, 120, 120, 0.11)", banner: "#b8fff2" },
] as const;

function needFor(level: number) {
  return Math.floor(4 + level * 3.2 + level * level * 0.22);
}

function clamp(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v;
}

/** Add one modifier block to the running table (artifacts, sets and heroes share this). */
function addMods(a: ReturnType<typeof emptyMods>, m: Mods) {
  a.dmg += m.dmg ?? 0;
  a.cd += m.cd ?? 0;
  a.speed += m.speed ?? 0;
  a.pickup += m.pickup ?? 0;
  a.xp += m.xp ?? 0;
  a.maxHp += m.maxHp ?? 0;
  a.maxHpPct += m.maxHpPct ?? 0;
  a.regen += m.regen ?? 0;
  a.taken = Math.min(0.75, a.taken + (m.taken ?? 0));
  a.heal += m.heal ?? 0;
  a.size *= m.size ?? 1;
  a.frozen *= m.frozen ?? 1;
  a.aged += m.aged ?? 0;
  a.slay += m.slay ?? 0;
  a.enemyHp += m.enemyHp ?? 0;
  a.enemySpeed += m.enemySpeed ?? 0;
  a.ult += m.ult ?? 0;
  a.revive += m.revive ?? 0;
  for (const k of ["spellDmg", "spellCount", "spellCd", "spellRadius"] as const) {
    const part = m[k];
    if (!part) continue;
    for (const [sid, v] of Object.entries(part)) a[k][sid] = (a[k][sid] ?? 0) + (v ?? 0);
  }
}

function emptyMods() {
  return {
    dmg: 0,
    cd: 0,
    speed: 0,
    pickup: 0,
    xp: 0,
    maxHp: 0,
    maxHpPct: 0,
    regen: 0,
    taken: 0,
    heal: 0,
    size: 1,
    frozen: 1,
    aged: 0,
    slay: 0,
    enemyHp: 0,
    enemySpeed: 0,
    ult: 0,
    revive: 0,
    spellDmg: {} as Record<string, number>,
    spellCount: {} as Record<string, number>,
    spellCd: {} as Record<string, number>,
    spellRadius: {} as Record<string, number>,
  };
}

function gridKey(cx: number, cy: number) {
  return (cx + 32768) * 65536 + (cy + 32768);
}

/* ------------------------------------------------------------------- game */

export class Game {
  time = 0;
  kills = 0;
  level = 1;
  xp = 0;
  xpNeed = needFor(1);
  pending = 0;
  over = false;

  player = { x: 0, y: 0, hp: 100, maxHp: 100, r: 12, face: 1, dirX: 1, dirY: 0, moving: false, hurt: 0, iframe: 0, walk: 0 };
  input = { x: 0, y: 0 };
  reducedMotion = false;

  private speed = 150;
  private dmgMul = 1;
  private cdMul = 1;
  private magnet = 75;
  private xpMul = 1;
  private regen = 0;
  private armor = 0;

  private spells = new Map<SpellId, { lvl: number; timer: number }>();
  private passives = new Map<PassiveId, number>();

  private enemies: Enemy[] = [];
  private shots: Shot[] = [];
  private gems: Gem[] = [];

  private pickups: Pickup[] = [];
  private meteors: Meteor[] = [];
  private novas: Nova[] = [];
  private bolts: Lightning[] = [];
  private blasts: Blast[] = [];
  private rings: FlashRing[] = [];
  private texts: FloatText[] = [];
  private sparks: Spark[] = [];
  private dust: Dust[] = [];
  private hazards: Hazard[] = [];
  private boss: Enemy | null = null;

  /** «فرّ ایزدی»: fills as you slay divs, spent for a screen-clearing burst. */
  ult = 0;
  /** real-time seconds of slow motion left (boss kills, the ultimate) */
  private slowmo = 0;
  /** second chances left this run (one by default, «قلب دوم» adds another) */
  /** total revival charges this run (base + relics + boons) — recomputed by recalc() */
  private revivesGranted = 1;
  /** revival charges already spent — never restored by recalc() */
  private revivesUsed = 0;
  /** revival charges still available */
  get winds() {
    return Math.max(0, this.revivesGranted - this.revivesUsed);
  }

  /* ------------------------------------------------------- artifacts */
  private artifacts: ArtifactId[] = [];
  private chests: Chest[] = [];
  private nextChest = 70;
  private nextChestId = 1;
  private nextPickupId = 1;
  /** every chest that has been opened this run: restoring a checkpoint never brings one back */
  private claimedChests = new Set<number>();
  /** summed effect of every artifact carried */
  private a: Required<Pick<Mods, "dmg" | "cd" | "speed" | "pickup" | "xp" | "maxHp" | "maxHpPct" | "regen" | "taken" | "heal" | "size" | "frozen" | "aged" | "slay" | "enemyHp" | "enemySpeed" | "ult" | "revive">> & {
    spellDmg: Record<string, number>;
    spellCount: Record<string, number>;
    spellCd: Record<string, number>;
    spellRadius: Record<string, number>;
  } = emptyMods();
  /** remaining cooldown of each active artifact */
  private activeCd = new Map<ActiveId, number>();
  private activeTotal = new Map<ActiveId, number>();
  /** experience handed to the HUD this frame — gems collected per second drift out */
  gemsPerSec = 0;
  private gemsTick = 0;
  private gemsTickCount = 0;
  /* -------------------------------------------------- difficulty & boons */
  difficulty: Difficulty = "adaptive";
  /** 0..1 — how strongly the world is leaning on the player */
  private director = 0;
  private diffT = 0;
  private boons = new Map<BoonId, number>();
  pendingBoon = 0;
  private boonOffer: BoonId[] = [];
  /** three relics offered by the chest that is currently open */
  private offers: ArtifactId[] = [];
  private offerAt: { x: number; y: number } | null = null;
  /** level-up light pillar, 1 → 0 */
  private pillar = 0;
  private souls: { x: number; y: number; vx: number; life: number; color: string }[] = [];
  private ghosts: { x: number; y: number; life: number; face: number }[] = [];
  private ghostTimer = 0;
  private flash = 0;
  phase = 0;
  private nextPhase = 95;

  private grid = new Map<number, Enemy[]>();
  private tmpA: Enemy[] = [];
  private tmpB: Enemy[] = [];
  private cand: Enemy[] = [];

  private spawnAcc = 0;
  /** level-based world pressure: the higher you stand, the sharper the night */
  private levelFloor(): number {
    return Math.floor(this.level / 5);
  }

  private nextId = 1;
  private nextEvent = 60;
  private orbAngle = 0;
  private frostTimer = 0;
  private shake = 0;
  private anyDead = false;

  private combo = 0;
  private comboTimer = 0;

  private scale = 1;
  private viewW = 1280;
  private viewH = 720;
  private pattern: CanvasPattern | null = null;
  private groundSize = TILE;

  private emit: (e: GameEvent) => void;

  /** the chosen sorcerer: colours, starting spell and passive */
  hero: HeroId = "farzan";
  /** 1 → 0 flare on the staff whenever a spell is cast */
  private castFx = 0;

  /** run seed: identical seed + identical inputs → identical run */
  readonly seed: number;
  private rand: Rng;
  /** unsimulated real time carried between frames (fixed-step accumulator) */
  private acc = 0;
  /** fewer particles, no screen shake — for weak phones */
  reducedFx = false;
  /** Totem-style regeneration, only while standing still (applied per frame) */
  private standingRegen = 0;
  private ultBonus = 0;
  /** chance for any hit to be critical (base + Snipe) */
  private critChance: number = PASSIVE_TUNING.baseCritChance;
  /** extra life-orb healing from Vitality */
  private orbHealBonus = 0;
  /** «سپر جادویی» passive */
  private shieldRank = 0;
  private shieldT = 0;
  shieldReady = false;
  private research: ResearchRanks = { ...NO_RESEARCH };
  /** artifact sets already announced — prevents duplicate activation */
  private setsActive = new Set<string>();
  /* -------------------------------------------- run identity & telemetry */
  /** unique per run; used to make payouts and checkpoints idempotent */
  runId: string;
  telemetry: RunTelemetry;
  private healthSampleT = 0;

  /* --------------------------------------------------------------- stage */
  mode: "stage" | "endless" = "endless";
  private stage: StageDef = PROVING_GROUNDS;
  /** survival timer — frozen while a wave is active */
  stageTime = 0;
  /** index of the active wave, or -1 between waves */
  waveIdx = -1;
  wavesCleared = 0;
  /** set exactly once; victory and defeat can never both happen */
  outcome: "victory" | "defeat" | null = null;
  private waveCenter = { x: 0, y: 0 };
  private waveKills = 0;
  private waveObjKills = 0;
  private waveHold = 0;
  private boundaryT = 0;
  private rewardsGiven = new Set<number>();
  private stageBoss: Enemy | null = null;
  bossPhase = 0;
  private bossAtkT = 0;
  private bossAtkN = 0;
  private telegraphs: Telegraph[] = [];

  /* --------------------------------------------------- talents & fusions */
  private talents = new Map<SpellId, TalentId>();
  private fusionFocus: FusionId | null = null;
  /** second-tier talents: one per spell family */
  private masteries = new Map<SpellId, MasteryId>();
  /** primary spell → fusion it was transformed by */
  private fused = new Map<SpellId, FusionId>();
  /** secondary spells used up by fusions — never offered again */
  private consumed = new Set<SpellId>();
  private spiritAngle = 0;
  private spiritCount = 0;
  private maelstromAngle = 0;
  private maelstromT = 0;
  /* -------------------------------------------------------- fireball FX */
  private fireFx: FireParticle[] = [];
  private blooms: { x: number; y: number; r: number; life: number; max: number }[] = [];
  private scorches: { x: number; y: number; r: number; life: number; max: number }[] = [];
  private maelstrom: { x: number; y: number; r: number } | null = null;
  private beams: { x1: number; y1: number; x2: number; y2: number; life: number; max: number; color: string; w: number }[] = [];

  constructor(emit: (e: GameEvent) => void, seed?: number) {
    this.emit = emit;
    this.seed = seed ?? randomSeed();
    this.rand = makeRng(this.seed);
    this.spells.set("bolt", { lvl: 1, timer: 0.5 });
    this.runId = newRunId(this.seed);
    this.telemetry = newTelemetry({ runId: this.runId, mode: this.mode, hero: this.hero, difficulty: this.difficulty, seed: this.seed });
  }

  /**
   * Advance by real elapsed time in fixed SIM_STEP slices, so simulation
   * results do not depend on the display frame rate. Returns steps run.
   */
  advance(realDt: number): number {
    this.acc += Math.min(MAX_FRAME, Math.max(0, realDt));
    let steps = 0;
    while (this.acc >= SIM_STEP - 1e-9 && !this.over) {
      this.acc -= SIM_STEP;
      this.update(SIM_STEP);
      steps++;
      // a choice screen is open: stop simulating until the player answers
      if (this.pending > 0 || this.pendingBoon > 0 || this.offers.length > 0) {
        this.acc = 0;
        break;
      }
    }
    return steps;
  }

  /** Choose stage or endless before the run starts. */
  setMode(mode: "stage" | "endless") {
    this.telemetry.mode = mode;
    this.mode = mode;
  }

  /** Minutes on the difficulty clock (stage survival time in stage mode). */
  /** Enemy strength multiplier that follows the player's own growth during a stage. */
  private stagePower() {
    if (this.mode !== "stage") return 1;
    const pp = this.stage.playerPower;
    const lv = Math.max(0, this.level - pp.fromLevel);
    const waveBoost = this.waveIdx >= 0 ? (this.stage.wavePower[this.waveIdx] ?? 1) : 1;
    return Math.min(pp.max, 1 + lv * pp.perLevel) * waveBoost;
  }

  private clockMin() {
    return this.mode === "stage" ? (this.stageTime / 60) * this.stage.difficultyScale : this.time / 60;
  }

  private waveView(): WaveView | null {
    if (this.mode !== "stage" || this.waveIdx < 0) return null;
    const w = this.stage.waves[this.waveIdx];
    const b = this.stageBoss;
    const current =
      w.kind === "slay" || w.kind === "elites" ? this.waveObjKills : w.kind === "hold" ? Math.floor(this.waveHold) : b ? 1 - b.hp / b.maxHp : 1;
    const target = w.kind === "boss" ? 1 : w.target;
    const p = this.player;
    return {
      index: this.waveIdx,
      kind: w.kind,
      name: w.name,
      goal: waveGoal(w, this.stage),
      current,
      target,
      progress: clamp(this.waveProgress(), 0, 1),
      outside: Math.hypot(p.x - this.waveCenter.x, p.y - this.waveCenter.y) > w.radius,
      bossPhase: this.bossPhase,
      warning: w.kind === "boss" && this.telegraphs.length
        ? (() => {
            const first = this.telegraphs.reduce((soonest, t) => t.t < soonest.t ? t : soonest);
            return { kind: first.kind, remaining: Math.max(0, first.t), delay: first.delay };
          })()
        : null,
    };
  }

  private waveProgress() {
    const w = this.stage.waves[this.waveIdx];
    if (!w) return 0;
    if (w.kind === "slay") return this.waveObjKills / w.target;
    if (w.kind === "elites") return this.waveObjKills / w.target;
    if (w.kind === "hold") return this.waveHold / w.target;
    const b = this.stageBoss;
    return b ? 1 - b.hp / b.maxHp : 0;
  }

  private updateStage(dt: number) {
    if (this.over) return;
    const st = this.stage;
    if (this.waveIdx < 0) {
      this.stageTime += dt;
      const next = st.waves[this.wavesCleared];
      if (next && this.stageTime >= next.at) {
        this.stageTime = next.at;
        this.startWave(this.wavesCleared);
      }
      return;
    }
    const w = st.waves[this.waveIdx];
    const p = this.player;
    const outside = Math.hypot(p.x - this.waveCenter.x, p.y - this.waveCenter.y) > w.radius;
    if (outside) {
      this.boundaryT -= dt;
      if (this.boundaryT <= 0) {
        this.boundaryT = st.boundaryTick;
        this.hurtPlayer(st.boundaryDamage);
        if (this.over) return;
      }
    } else {
      this.boundaryT = 0.25; // a short grace period when stepping out
      if (w.kind === "hold") this.waveHold += dt;
    }
    if (w.kind === "boss") this.updateBoss(dt);
    else if (this.waveProgress() >= 1) this.completeWave();
  }

  private makeElite(e: Enemy) {
    e.elite = true;
    e.hp = e.maxHp = Math.round(e.maxHp * 4);
    e.r *= 1.3;
    e.xp *= 6;
    e.speed *= 1.08;
  }

  private startWave(i: number) {
    const st = this.stage;
    const w = st.waves[i];
    const p = this.player;
    this.telemetry.waves.push({
      wave: i,
      kind: w.kind,
      clock: this.stageTime,
      startedAt: this.time,
      endedAt: null,
      duration: null,
      levelStart: this.level,
      levelEnd: null,
      hpStart: Math.round(p.hp),
      hpEnd: null,
      maxHp: p.maxHp,
      maxHpEnd: null,
      killsDuring: 0,
    });
    this.waveIdx = i;
    this.waveCenter = { x: p.x, y: p.y };
    this.waveKills = 0;
    this.waveObjKills = 0;
    this.waveHold = 0;
    this.boundaryT = 0.25;
    this.spawnAcc = 0;
    this.flash = Math.max(this.flash, 0.4);
    this.shake = Math.min(1, this.shake + 0.5);
    this.rings.push({ x: p.x, y: p.y, r: 20, maxR: w.radius, life: 0.9, max: 0.9, color: "#ff5060", width: 5 });
    // the wave opens with a ring of enemies stepping inside the boundary
    for (let k = 0; k < 18 + i * 6; k++) {
      const a = (k / (18 + i * 6)) * TAU + this.rand() * 0.2;
      this.addEnemy(this.pickType(this.clockMin()), p.x + Math.cos(a) * w.radius * 0.72, p.y + Math.sin(a) * w.radius * 0.72);
    }
    this.emit({ type: "banner", text: w.name, tone: "danger" });
    this.sfx("boss");
    if (w.kind === "elites") {
      for (let k = 0; k < w.target; k++) {
        const a = (k / w.target) * TAU + this.rand();
        const e = this.addEnemy(this.rand() < 0.5 ? "div" : "ghoul", p.x + Math.cos(a) * w.radius * 0.8, p.y + Math.sin(a) * w.radius * 0.8);
        if (!e.elite) this.makeElite(e);
        e.hp = e.maxHp = Math.round(e.maxHp * (w.eliteHpMul ?? 1));
        e.objective = true;
      }
    } else if (w.kind === "boss") {
      const e = this.addEnemy("boss", p.x, p.y - w.radius * 0.7);
      e.elite = false;
      e.hp = e.maxHp = Math.round(st.boss.hp * this.diffHp() * Math.min(this.stage.playerPower.max, 1 + Math.max(0, this.level - 20) * this.stage.playerPower.perLevel));
      e.objective = true;
      e.shootCd = 1e9; // the warden only uses telegraphed attacks
      this.stageBoss = e;
      this.boss = e;
      this.bossPhase = 1;
      this.bossAtkT = 2.5;
      this.bossAtkN = 0;
    }
  }

  private completeWave() {
    const i = this.waveIdx;
    const w = this.stage.waves[i];
    const p = this.player;
    this.closeWaveRecord();
    this.waveIdx = -1;
    this.wavesCleared = i + 1;
    for (const e of this.enemies) e.objective = false;
    this.flash = Math.max(this.flash, 0.5);
    this.rings.push({ x: p.x, y: p.y, r: 20, maxR: 260, life: 0.8, max: 0.8, color: "#ffd98a", width: 5 });
    this.burst(p.x, p.y, "#ffd98a", 24, 260);
    this.emit({ type: "banner", text: `${w.name.split(" — ")[0]} پشت سر گذاشته شد!`, tone: "good" });
    this.sfx("level");
    // each reward is granted at most once per wave
    if (w.reward && !this.rewardsGiven.has(i)) {
      this.rewardsGiven.add(i);
      this.openChest(p.x, p.y);
    }
  }

  private updateBoss(dt: number) {
    const b = this.stageBoss;
    if (!b || b.dead) return;
    const bd = this.stage.boss;
    const p = this.player;
    if (this.bossPhase === 1 && b.hp <= b.maxHp * bd.phase2At) {
      this.bossPhase = 2;
      if (this.telemetry.bossPhase2At === null) this.telemetry.bossPhase2At = this.time;
      b.speed *= bd.speedPhase2;
      this.telegraphs = [];
      this.flash = Math.max(this.flash, 0.7);
      this.shake = 1;
      this.slowmo = Math.max(this.slowmo, 0.6);
      this.emit({ type: "banner", text: "نگهبان خشمگین شد — فاز دوم!", tone: "danger" });
      this.sfx("boss");
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * TAU;
        this.addEnemy("shade", b.x + Math.cos(a) * 90, b.y + Math.sin(a) * 90);
      }
      this.bossAtkT = 1.2;
    }
    this.bossAtkT -= dt;
    if (this.bossAtkT > 0) return;
    this.bossAtkT = bd.attackGap[this.bossPhase - 1];
    const n = this.bossAtkN++;
    const base = { angle: 0, count: 0, spread: 0, speed: 0, follow: false };
    if (this.bossPhase === 1) {
      if (n % 2 === 0) {
        this.telegraphs.push({ ...base, kind: "circle", x: p.x, y: p.y, r: bd.slam.radius, t: bd.slam.delay, delay: bd.slam.delay, dmg: bd.slam.dmg });
      } else {
        const ang = Math.atan2(p.y - b.y, p.x - b.x);
        const v = bd.volley;
        this.telegraphs.push({ kind: "line", x: b.x, y: b.y, r: 520, angle: ang, t: v.delay, delay: v.delay, dmg: v.dmg, count: v.count, spread: v.spread, speed: v.speed, follow: true });
      }
    } else if (n % 2 === 0) {
      const a0 = this.rand() * TAU;
      for (let k = 0; k < 3; k++) {
        const off = k === 0 ? 0 : 85;
        const a = a0 + k * 2.1;
        this.telegraphs.push({ ...base, kind: "circle", x: p.x + Math.cos(a) * off, y: p.y + Math.sin(a) * off, r: bd.slam.radius, t: bd.slam.delay * 0.85, delay: bd.slam.delay * 0.85, dmg: bd.slam.dmg });
      }
    } else {
      const v = bd.nova;
      this.telegraphs.push({ kind: "ring", x: b.x, y: b.y, r: 70, angle: this.rand() * TAU, t: v.delay, delay: v.delay, dmg: v.dmg, count: v.count, spread: 0, speed: v.speed, follow: true });
    }
  }

  private updateTelegraphs(dt: number) {
    if (!this.telegraphs.length) return;
    const b = this.stageBoss;
    const p = this.player;
    for (const tg of this.telegraphs) {
      if (tg.follow && b && !b.dead) {
        tg.x = b.x;
        tg.y = b.y;
      }
      tg.t -= dt;
      if (tg.t > 0) continue;
      if (tg.kind === "circle") {
        if (Math.hypot(p.x - tg.x, p.y - tg.y) <= tg.r + p.r) this.hurtPlayer(tg.dmg);
        this.blasts.push({ x: tg.x, y: tg.y, r: tg.r, life: 0.35, max: 0.35, color: "#ff5060" });
        this.rings.push({ x: tg.x, y: tg.y, r: tg.r * 0.4, maxR: tg.r * 1.4, life: 0.4, max: 0.4, color: "#ff8a94", width: 4 });
        this.shake = Math.min(1, this.shake + 0.3);
        this.sfx("boom");
      } else {
        const ring = tg.kind === "ring";
        for (let k = 0; k < tg.count; k++) {
          const a = ring ? tg.angle + (k / tg.count) * TAU : tg.angle + (tg.count > 1 ? (k / (tg.count - 1) - 0.5) * tg.spread : 0);
          this.hazards.push({ x: tg.x, y: tg.y, vx: Math.cos(a) * tg.speed, vy: Math.sin(a) * tg.speed, r: 9, dmg: tg.dmg, life: 4.5, seed: this.rand() * 10, dead: false });
        }
        this.sfx("zap");
      }
      if (this.over) break;
    }
    this.telegraphs = this.telegraphs.filter((tg) => tg.t > 0);
  }

  /** Resolve the run exactly once. Returns false if it was already resolved. */
  private finish(outcome: "victory" | "defeat"): boolean {
    if (this.outcome) return false;
    this.outcome = outcome;
    this.over = true;
    if (outcome === "victory") this.closeWaveRecord();
    const tm = this.telemetry;
    tm.outcome = outcome;
    tm.endedAt = this.time;
    tm.kills = this.kills;
    tm.level = this.level;
    if (outcome === "victory") {
      this.wavesCleared = Math.max(this.wavesCleared, this.stage.waves.length);
      this.waveIdx = -1;
      this.telegraphs = [];
      this.hazards = [];
      this.sfx("level");
      this.emit({ type: "victory" });
    } else {
      this.emit({ type: "gameover" });
    }
    return true;
  }

  private closeWaveRecord() {
    const rec = this.telemetry.waves[this.telemetry.waves.length - 1];
    if (!rec || rec.endedAt !== null) return;
    rec.endedAt = this.time;
    rec.duration = this.time - rec.startedAt;
    rec.levelEnd = this.level;
    rec.hpEnd = Math.round(this.player.hp);
    rec.maxHpEnd = this.player.maxHp;
    rec.killsDuring = this.waveKills;
  }

  /* --------------------------------------------------------- checkpoints */

  /**
   * True only at calm moments: a stage run between waves, alive, with no level-up,
   * boon, relic or chest choice waiting — so nothing transient needs saving.
   */
  canCheckpoint(): boolean {
    return (
      this.mode === "stage" &&
      !this.over &&
      this.waveIdx < 0 &&
      this.pending === 0 &&
      this.pendingBoon === 0 &&
      this.offers.length === 0 &&
      this.boonOffer.length === 0 &&
      this.player.hp > 0
    );
  }

  toCheckpoint(): Checkpoint | null {
    if (!this.canCheckpoint()) return null;
    return {
      version: CHECKPOINT_VERSION,
      runId: this.runId,
      savedAt: Date.now(),
      mode: this.mode,
      hero: this.hero,
      difficulty: this.difficulty,
      seed: this.seed,
      time: this.time,
      stageTime: this.stageTime,
      wavesCleared: this.wavesCleared,
      rewardsGiven: [...this.rewardsGiven],
      kills: this.kills,
      level: this.level,
      xp: this.xp,
      hp: this.player.hp,
      player: {
        x: this.player.x,
        y: this.player.y,
        dirX: this.player.dirX,
        dirY: this.player.dirY,
        face: this.player.face,
      },
      ult: this.ult,
      revivesUsed: this.revivesUsed,
      spells: [...this.spells.entries()].map(([k, v]) => [k, v.lvl]),
      passives: [...this.passives.entries()],
      talents: [...this.talents.entries()],
      masteries: [...this.masteries.entries()],
      fused: [...this.fused.entries()],
      consumed: [...this.consumed],
      artifacts: [...this.artifacts],
      boons: [...this.boons.entries()],
      phase: this.phase,
      fusionFocus: this.fusionFocus,
      nextPhase: this.nextPhase,
      nextChest: this.nextChest,
      chests: this.chests.filter((c) => !c.dead).map((c) => ({ id: c.id, x: c.x, y: c.y, seed: c.seed })),
      pickups: this.pickups.filter((k) => !k.dead).map((k) => ({ id: k.id, kind: k.kind, x: k.x, y: k.y, seed: k.seed })),
      gems: this.gems.filter((g) => !g.dead).map((g) => ({ x: g.x, y: g.y, value: g.value, seed: g.seed, pull: g.pull, sp: g.sp })),
      claimedChests: [...this.claimedChests],
      nextChestId: this.nextChestId,
      nextPickupId: this.nextPickupId,
      telemetry: JSON.parse(JSON.stringify(this.telemetry)),
    };
  }

  /**
   * Resume a run from a checkpoint (call after setHero / setDifficulty / setMode / setResearch).
   * The enemy field is empty on resume. The player, unclaimed chests, pickups and gems
   * retain their shared world coordinates; the run's reward history is preserved.
   */
  restoreCheckpoint(cp: Checkpoint) {
    this.runId = cp.runId;
    this.time = cp.time;
    this.stageTime = cp.stageTime;
    this.wavesCleared = cp.wavesCleared;
    this.waveIdx = -1;
    this.rewardsGiven = new Set(cp.rewardsGiven);
    this.kills = cp.kills;
    this.level = cp.level;
    this.xpNeed = needFor(cp.level);
    this.xp = Math.min(cp.xp, this.xpNeed - 1e-6);
    this.ult = cp.ult;
    this.revivesUsed = cp.revivesUsed;
    this.spells.clear();
    for (const [id, lvl] of cp.spells) if (id in C) this.spells.set(id as SpellId, { lvl, timer: 0.5 });
    this.passives = new Map(cp.passives.filter(([id]) => id in C) as [PassiveId, number][]);
    this.talents = new Map(cp.talents.filter(([, t]) => t in TALENTS) as [SpellId, TalentId][]);
    this.masteries = new Map(cp.masteries.filter(([, m]) => m in MASTERIES) as [SpellId, MasteryId][]);
    this.fused = new Map(cp.fused.filter(([, f]) => f in FUSIONS) as [SpellId, FusionId][]);
    this.consumed = new Set(cp.consumed as SpellId[]);
    this.artifacts = cp.artifacts.filter((a) => a in BY_ID) as ArtifactId[];
    this.boons = new Map(cp.boons as [BoonId, number][]);
    // sets that were already complete must not announce themselves again
    this.setsActive = new Set(activeSets(this.artifacts));
    this.phase = cp.phase;
    this.fusionFocus = cp.fusionFocus && cp.fusionFocus in FUSIONS ? cp.fusionFocus as FusionId : null;
    this.nextPhase = cp.nextPhase;
    this.nextChest = cp.nextChest;
    this.player.x = cp.player.x;
    this.player.y = cp.player.y;
    this.player.dirX = cp.player.dirX;
    this.player.dirY = cp.player.dirY;
    this.player.face = cp.player.face;
    this.player.moving = false;
    this.input.x = 0;
    this.input.y = 0;
    this.pending = 0;
    this.pendingBoon = 0;
    this.enemies = [];
    this.shots = [];
    this.hazards = [];
    this.gems = cp.gems.map((g) => ({ ...g, dead: false, glow: 0 }));
    this.chests = [];
    this.pickups = [];
    // restore the chests that were still waiting, but never one that was opened before saving
    this.claimedChests = new Set(cp.claimedChests ?? []);
    for (const c of cp.chests ?? []) if (!this.claimedChests.has(c.id)) this.chests.push({ ...c, dead: false });
    this.pickups = (cp.pickups ?? []).map((p) => ({ ...p, dead: false }));
    this.nextChestId = Math.max(1, cp.nextChestId, ...this.chests.map((c) => c.id + 1), ...[...this.claimedChests].map((id) => id + 1));
    this.nextPickupId = Math.max(1, cp.nextPickupId ?? 1, ...this.pickups.map((p) => p.id + 1));
    this.recalc();
    this.player.hp = Math.min(cp.hp, this.player.maxHp);
    this.rand = reseed((cp.seed ^ Math.floor(cp.time * 1000)) >>> 0);
    if (cp.telemetry && cp.telemetry.runId === cp.runId) this.telemetry = cp.telemetry;
    this.telemetry.resumedFromCheckpoint++;
  }

  /* ----------------------------------------------- developer-only controls */

  /** Jump the stage clock to just before wave `i` (0-based). */
  devJumpToWave(i: number) {
    if (this.mode !== "stage" || this.over) return;
    const w = this.stage.waves[i];
    if (!w) return;
    for (const e of this.enemies) e.objective = false;
    if (this.stageBoss) {
      this.stageBoss.dead = true;
      this.anyDead = true;
      this.stageBoss = null;
      this.boss = null;
    }
    this.telegraphs = [];
    this.waveIdx = -1;
    this.wavesCleared = i;
    this.stageTime = w.at - 3;
  }

  /** Set the player level directly (no pending choices). */
  devSetLevel(level: number) {
    this.level = Math.max(1, Math.floor(level));
    this.xpNeed = needFor(this.level);
    this.xp = 0;
  }

  devHeal() {
    this.player.hp = this.player.maxHp;
  }

  /** Apply permanent research ranks (call before the run starts). */
  setResearch(r: ResearchRanks) {
    this.research = { ...NO_RESEARCH, ...r };
    this.recalc();
    this.player.hp = this.player.maxHp;
  }

  /** Pick a hero before the run starts: resets the starting spell and applies the passive. */
  setHero(id: HeroId) {
    this.telemetry.hero = id;
    this.hero = id;
    this.spells.clear();
    this.spells.set(BY_HERO[id].start, { lvl: 1, timer: 0.5 });
    this.recalc();
    this.player.hp = this.player.maxHp;
  }

  /* --------------------------------------------------------------- public */

  setView(w: number, h: number) {
    this.scale = clamp(Math.sqrt(w * h) / 880, 0.72, 1.45);
    this.viewW = w / this.scale;
    this.viewH = h / this.scale;
  }

  snapshot(): Snapshot {
    const spells: Snapshot["spells"] = [];
    for (const id of SPELL_IDS) {
      const s = this.spells.get(id);
      if (s) spells.push({ id, lvl: s.lvl });
    }
    const passives: Snapshot["passives"] = [];
    for (const id of PASSIVE_IDS) {
      const l = this.passives.get(id);
      if (l) passives.push({ id, lvl: l });
    }
    const b = this.boss && !this.boss.dead ? this.boss : null;
    return {
      time: this.time,
      kills: this.kills,
      level: this.level,
      xp: this.xp,
      xpNeed: this.xpNeed,
      hp: Math.max(0, Math.ceil(this.player.hp)),
      maxHp: this.player.maxHp,
      spells,
      passives,
      boss: b ? clamp(b.hp / b.maxHp, 0, 1) : null,
      combo: this.combo,
      gemsPerSec: this.gemsPerSec,
      ult: Math.round(this.ult),
      phase: this.phase,
      wind: this.winds,
      artifacts: [...this.artifacts],
      chests: this.chests.length,
      boons: [...this.boons.entries()].map(([id, count]) => ({ id, count })),
      pendingBoon: this.pendingBoon,
      difficulty: this.difficulty,
      pressure: Math.round(this.director * 100),
      hero: this.hero,
      mode: this.mode,
      clock: this.mode === "stage" ? this.stageTime : this.time,
      wave: this.waveView(),
      wavesCleared: this.wavesCleared,
      totalWaves: this.stage.waves.length,
      nextWaveAt: this.mode === "stage" && this.waveIdx < 0 ? (this.stage.waves[this.wavesCleared]?.at ?? null) : null,
      outcome: this.outcome,
      shieldReady: this.shieldReady,
      talents: [...this.talents.entries()].map(([spell, talent]) => ({ spell, talent })),
      masteries: [...this.masteries.entries()].map(([spell, mastery]) => ({ spell, mastery })),
      fusions: [...this.fused.entries()].map(([spell, fusion]) => ({ spell, fusion })),
      fusionSlots: fusionSlots(this.level),
      fusionFocus: this.fusionFocus,
      actives: [...this.activeCd.entries()].map(([id, cd]) => ({
        id,
        label: this.activeLabel(id),
        ready: 1 - clamp(cd / (this.activeTotal.get(id) ?? 1), 0, 1),
      })),
    };
  }

  /** Choose a difficulty; adaptive leans harder as the player performs. */
  setDifficulty(mode: Difficulty) {
    this.telemetry.difficulty = mode;
    this.difficulty = mode;
  }

  /** Three power surges to choose from at a special level. */
  rollBoons(): BoonId[] {
    const bag: BoonId[] = [...BOON_IDS];
    const picks: BoonId[] = [];
    while (picks.length < 3 && bag.length) {
      picks.push(bag.splice(Math.floor(this.rand() * bag.length), 1)[0]);
    }
    this.boonOffer = picks;
    return [...picks];
  }

  boonOffers(): BoonId[] {
    return [...this.boonOffer];
  }

  chooseBoon(id: BoonId) {
    if (this.pendingBoon <= 0 || !this.boonOffer.includes(id)) return false;
    this.boonOffer = [];
    this.pendingBoon--;
    this.boons.set(id, (this.boons.get(id) ?? 0) + 1);
    this.recalc();
    const b = BY_BOON[id];
    if (b.healNow) {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + b.healNow);
      this.addText(this.player.x, this.player.y - 40, `+${fa(Math.round(b.healNow))}`, "#8ff0a4", 18);
    }
    this.pillar = 1;
    this.flash = Math.max(this.flash, 0.5);
    this.rings.push({ x: this.player.x, y: this.player.y, r: 10, maxR: 240, life: 0.8, max: 0.8, color: b.color, width: 5 });
    this.burst(this.player.x, this.player.y, b.color, 26, 300);
    this.sfx("level");
    this.emit({ type: "banner", text: `${b.name}!`, tone: "good" });
    return true;
  }

  /* ------------------------------------------------------ difficulty knobs */

  /** The night leans in when the sorcerer is healthy, far ahead and killing fast. */
  private updateDirector(dt: number) {
    this.diffT -= dt;
    if (this.diffT > 0) return;
    this.diffT = 0.5;
    const min = Math.max(0.6, this.time / 60);
    const hpRatio = this.player.hp / this.player.maxHp;
    const pace = this.level / (min * 3.6 + 1); // 1 means "on schedule"
    const killRate = this.kills / Math.max(this.time, 12);
    const target = clamp((pace - 0.9) * 0.85 + Math.max(0, hpRatio - 0.75) * 0.8 + clamp((killRate - 2) / 10, 0, 0.3), 0, 1);
    this.director += (target - this.director) * 0.22;
  }

  /** Multipliers applied to the horde, by selected difficulty and live pressure. */
  private diffHp() {
    if (this.difficulty === "normal") return 0.92;
    if (this.difficulty === "brutal") return 1.3 * (1 + this.director * 0.5);
    return 0.95 + this.director * 0.85;
  }
  private diffDmg() {
    if (this.difficulty === "normal") return 0.9;
    if (this.difficulty === "brutal") return 1.45 * (1 + this.director * 0.55);
    return 0.95 + this.director * 1.05;
  }
  private diffFlow() {
    if (this.difficulty === "normal") return 0.9;
    if (this.difficulty === "brutal") return 1.3 * (1 + this.director * 0.6);
    return 0.95 + this.director * 1.15;
  }
  private diffSpeed() {
    if (this.difficulty === "normal") return 0.95;
    if (this.difficulty === "brutal") return 1.12 + this.director * 0.14;
    return 1 + this.director * 0.16;
  }

  /**
   * Spend the fully-charged «فرّ ایزدی»: a golden shockwave that damages and
   * freezes everything nearby, plus a screen flash. Returns false if not ready.
   */
  useUlt(): boolean {
    if (this.over || this.ult < 100) return false;
    this.ult = 0;
    this.flash = 1;
    this.slowmo = 0.7;
    this.shake = 1.1;
    this.emit({ type: "sfx", name: "ult" });

    const range = 430;
    const list = this.inRange(range);
    const dmg = 105 + this.level * 5;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      e.stun = e.type === "boss" ? 1.2 : 2.2;
      const dx = e.x - this.player.x;
      const dy = e.y - this.player.y;
      const d = Math.hypot(dx, dy) || 1;
      this.hit(e, dmg, (dx / d) * 420, (dy / d) * 420, "#ffe9b0");
    }

    // scouring the field also clears enemy fire
    for (const h of this.hazards) h.dead = true;

    const p = this.player;
    for (let i = 0; i < 3; i++) {
      this.rings.push({ x: p.x, y: p.y, r: 20, maxR: 230 + i * 90, life: 0.6 + i * 0.12, max: 0.6 + i * 0.12, color: "#ffe9b0", width: 6 - i });
    }
    this.novas.push({ x: p.x, y: p.y, r: 12, maxR: 300, dmg: dmg * 0.5, hit: new Set() });
    this.burst(p.x, p.y, "#ffe9b0", 30, 330);
    this.burst(p.x, p.y, "#3fd9c8", 20, 210);
    this.addText(p.x, p.y - 46, "فرّ ایزدی!", "#ffe9b0", 22);
    return true;
  }

  /** Read-only view used by the pure validators in talents.ts. */
  magicView(): MagicView {
    return {
      level: this.level,
      spellLevel: (sp) => this.spells.get(sp)?.lvl ?? 0,
      talentOf: (sp) => this.talents.get(sp),
      fused: this.fused,
      consumed: this.consumed,
    };
  }

  /** Choose a recipe to pursue without granting a spell, talent or extra slot. */
  setFusionFocus(id: FusionId | null): boolean {
    if (id !== null && recipePath(id, this.magicView()).status === "blocked") return false;
    this.fusionFocus = id;
    return true;
  }

  rollChoices(): Choice[] {
    const view = this.magicView();
    const pool: (Choice & { w: number })[] = [];
    // Once the player holds a talent that a fusion recipe needs, the cards lean toward
    // that recipe's two spells. Prerequisites, consumption and conflicts are untouched;
    // this only makes an intentional fusion build reachable in normal play.
    const aided = new Set<SpellId>();
    for (const t of this.talents.values()) for (const f of recipesForTalent(t)) {
      aided.add(f.primary.spell);
      aided.add(f.secondary.spell);
    }
    for (const id of SPELL_IDS) {
      if (this.consumed.has(id)) continue;
      const l = this.spells.get(id)?.lvl ?? 0;
      const aid = aided.has(id) ? 2.6 : 1;
      if (l < C[id].max) pool.push({ id, next: l + 1, w: (l > 0 ? 1.5 : 1) * aid });
      // talents become available once the spell reaches TALENT_LEVEL
      for (const t of talentsFor(id)) if (canTakeTalent(t.id, view)) pool.push({ id, next: l, talent: t.id, w: (aided.has(id) ? 1.8 : 0.9) });
      // masteries (tier 2) once the spell reaches MASTERY_LEVEL and has its first talent
      for (const m of masteriesFor(id)) if (canTakeMastery(m.id, this.masteryView())) pool.push({ id, next: l, mastery: m.id, w: 0.9 });
    }
    for (const id of PASSIVE_IDS) {
      const l = this.passives.get(id) ?? 0;
      if (l < C[id].max) pool.push({ id, next: l + 1, w: l > 0 ? 1.3 : 1 });
    }
    const out: Choice[] = [];
    // a valid fusion is always offered first
    for (const f of FUSION_IDS) {
      if (out.length >= 2) break;
      if (canFuse(f, view).ok) out.push({ id: FUSIONS[f].primary.spell, next: this.spells.get(FUSIONS[f].primary.spell)?.lvl ?? 0, fusion: f });
    }
    if (!out.length) {
      // Reserve one of three cards for a valid recipe step. The other cards stay
      // random, and every pinned talent still passes canTakeTalent.
      const started = FUSION_IDS.map((id) => ({ id, path: recipePath(id, view) }))
        .filter(({ path }) => path.started && path.status === "available")
        .sort((a, b) => b.path.matched - a.path.matched);
      const focused = this.fusionFocus ? recipePath(this.fusionFocus, view) : null;
      const recipe = focused?.status === "available" ? this.fusionFocus : started[0]?.id;
      const step = recipe ? recipePath(recipe, view).next : null;
      if (recipe && step) {
        const i = pool.findIndex((c) => c.id === step.spell && c.next === step.next && c.talent === step.talent && !c.mastery);
        if (i >= 0) {
          const [c] = pool.splice(i, 1);
          out.push({ id: c.id, next: c.next, talent: c.talent, guidance: recipe });
        }
      }
      if (!out.length && !this.fusionFocus && !started.length) {
        // Seed a route after an available primary spell reaches talent level.
        const discoveries = FUSION_IDS.map((id) => ({ id, part: FUSIONS[id].primary }))
          .filter(({ id, part }) => recipePath(id, view).status === "available" && canTakeTalent(part.talent, view))
          .sort((a, b) => view.spellLevel(b.part.spell) - view.spellLevel(a.part.spell));
        const bestLevel = discoveries.length ? view.spellLevel(discoveries[0].part.spell) : -1;
        const tied = discoveries.filter((candidate) => view.spellLevel(candidate.part.spell) === bestLevel);
        // Seeded tie-break: do not steer every run toward the first (Polymorph) recipe.
        const discovery = tied.length ? tied[Math.floor(this.rand() * tied.length)] : undefined;
        if (discovery) {
          const i = pool.findIndex((c) => c.talent === discovery.part.talent);
          if (i >= 0) {
            const [c] = pool.splice(i, 1);
            out.push({ id: c.id, next: c.next, talent: c.talent, guidance: discovery.id });
          }
        }
      }
    }
    while (out.length < 3 && pool.length) {
      let total = 0;
      for (const p of pool) total += p.w;
      let roll = this.rand() * total;
      let idx = 0;
      for (let i = 0; i < pool.length; i++) {
        roll -= pool[i].w;
        if (roll <= 0) {
          idx = i;
          break;
        }
      }
      const [picked] = pool.splice(idx, 1);
      // never offer two talents (or two masteries) for the same spell in one hand
      if (picked.talent && out.some((o) => o.talent && o.id === picked.id)) continue;
      if (picked.mastery && out.some((o) => o.mastery && o.id === picked.id)) continue;
      out.push({ id: picked.id, next: picked.next, talent: picked.talent, mastery: picked.mastery });
    }
    if (out.length < 3) out.push({ id: "heal", next: 1 });
    return out;
  }

  /** Apply any level-up card: an upgrade, a talent or a fusion. */
  applyChoice(c: Choice): boolean {
    if (c.fusion) return this.fuse(c.fusion);
    if (c.talent) return this.takeTalent(c.talent);
    if (c.mastery) return this.takeMastery(c.mastery);
    this.applyUpgrade(c.id);
    return true;
  }

  takeTalent(t: TalentId): boolean {
    if (!canTakeTalent(t, this.magicView())) return false;
    const def = TALENTS[t];
    this.talents.set(def.spell, t);
    if (!this.fusionFocus || recipePath(this.fusionFocus, this.magicView()).status === "blocked") {
      const route = recipesForTalent(t).find((r) => recipePath(r.id, this.magicView()).status !== "blocked");
      if (route) this.fusionFocus = route.id;
    }
    this.pending = Math.max(0, this.pending - 1);
    const p = this.player;
    this.rings.push({ x: p.x, y: p.y, r: 10, maxR: 150, life: 0.6, max: 0.6, color: "#b48cff", width: 4 });
    this.burst(p.x, p.y, "#b48cff", 18, 220);
    this.emit({ type: "banner", text: `استعداد «${def.name}» آموخته شد`, tone: "good" });
    return true;
  }

  private masteryView() {
    return { ...this.magicView(), masteryOf: (sp: SpellId) => this.masteries.get(sp) };
  }

  takeMastery(id: MasteryId): boolean {
    if (!canTakeMastery(id, this.masteryView())) return false;
    const def = MASTERIES[id];
    this.masteries.set(def.spell, id);
    this.recalc();
    this.pending = Math.max(0, this.pending - 1);
    const p = this.player;
    this.rings.push({ x: p.x, y: p.y, r: 10, maxR: 170, life: 0.65, max: 0.65, color: "#ffd98a", width: 4 });
    this.burst(p.x, p.y, "#ffd98a", 20, 230);
    this.emit({ type: "banner", text: `چیرگی «${def.name}» آموخته شد`, tone: "good" });
    return true;
  }

  /** Fuse two spells: consumes the secondary, transforms the primary. */
  fuse(id: FusionId): boolean {
    if (!canFuse(id, this.magicView()).ok) return false;
    const f = FUSIONS[id];
    this.consumed.add(f.secondary.spell);
    this.spells.delete(f.secondary.spell);
    this.fused.set(f.primary.spell, id);
    if (this.fusionFocus === id) this.fusionFocus = null;
    const prim = this.spells.get(f.primary.spell);
    if (prim) prim.timer = 0.3;
    this.pending = Math.max(0, this.pending - 1);
    const p = this.player;
    this.flash = Math.max(this.flash, 0.8);
    this.slowmo = Math.max(this.slowmo, 0.7);
    this.pillar = 1;
    for (let i = 0; i < 3; i++) this.rings.push({ x: p.x, y: p.y, r: 10, maxR: 180 + i * 80, life: 0.7 + i * 0.12, max: 0.7 + i * 0.12, color: "#f2b84b", width: 5 - i });
    this.burst(p.x, p.y, "#f2b84b", 30, 300);
    this.sfx("ult");
    this.telemetry.fusions.push({ id, at: +this.time.toFixed(1), level: this.level });
    this.emit({ type: "banner", text: `ترکیب «${f.name}» پدید آمد!`, tone: "good" });
    return true;
  }

  /** Developer kit: grant the exact spells and talents a recipe needs. */
  devFusionKit(id: FusionId) {
    const f = FUSIONS[id];
    if (this.level < 25) this.devSetLevel(25);
    for (const part of [f.primary, f.secondary]) {
      if (this.consumed.has(part.spell)) continue;
      const cur = this.spells.get(part.spell);
      if (cur) cur.lvl = Math.max(cur.lvl, 5);
      else this.spells.set(part.spell, { lvl: 5, timer: 0.3 });
      if (!this.talents.has(part.spell)) this.talents.set(part.spell, part.talent);
    }
  }


  applyUpgrade(id: UpgradeId) {
    const p = this.player;
    if (id === "heal") {
      p.hp = Math.min(p.maxHp, p.hp + 30);
    } else if (C[id].kind === "spell") {
      const sid = id as SpellId;
      const s = this.spells.get(sid);
      if (s) s.lvl = Math.min(C[sid].max, s.lvl + 1);
      else this.spells.set(sid, { lvl: 1, timer: 0.3 });
    } else {
      const pid = id as PassiveId;
      const maxBefore = p.maxHp;
      this.passives.set(pid, Math.min(C[pid].max, (this.passives.get(pid) ?? 0) + 1));
      this.recalc();
      // Vitality: the new maximum comes with the matching health
      if (pid === "vital") p.hp = Math.min(p.maxHp, p.hp + (p.maxHp - maxBefore));
      if (pid === "shield" && this.passives.get("shield") === 1) this.shieldReady = true;
    }
    this.pending = Math.max(0, this.pending - 1);
  }

  idle(dt: number) {
    this.time += dt;
    const p = this.player;
    const a = this.time * 0.12;
    const dx = Math.cos(a);
    const dy = Math.sin(a) * 0.6;
    p.x += dx * 36 * dt;
    p.y += dy * 36 * dt;
    p.moving = true;
    p.walk += dt * 0.5;
    if (Math.abs(dx) > 0.2) p.face = dx > 0 ? 1 : -1;
  }

  update(rawDt: number) {
    if (this.over) return;
    // slow motion runs on real time, then scales everything else
    this.slowmo = Math.max(0, this.slowmo - rawDt);
    this.pillar = Math.max(0, this.pillar - rawDt * 1.4);
    const dt = rawDt * (this.slowmo > 0 && !this.reducedMotion ? 0.35 : 1);
    this.time += dt;
    const p = this.player;

    // combo decay
    this.comboTimer -= dt;
    this.castFx = Math.max(0, this.castFx - dt * 4);
    if (this.comboTimer <= 0) this.combo = 0;
    this.flash = Math.max(0, this.flash - dt * 1.8);
    this.updateDirector(dt);
    this.ult = Math.min(100, this.ult + dt * 0.32 * (1 + this.ultBonus));

    // the night turns: a new colour, a new mood, slightly richer gems in a blood moon
    if (this.time >= this.nextPhase) {
      this.nextPhase += 95;
      this.phase = (this.phase + 1) % PHASES.length;
      const ph = PHASES[this.phase];
      this.emit({ type: "banner", text: `${ph.name} — ${ph.text}`, tone: "info" });
      this.sfx("phase");
      this.flash = 0.35;
    }

    // movement
    let ix = this.input.x;
    let iy = this.input.y;
    const il = Math.hypot(ix, iy);
    if (il > 0.05) {
      const m = Math.min(1, il);
      ix /= il;
      iy /= il;
      p.x += ix * this.speed * m * dt;
      p.y += iy * this.speed * m * dt;
      p.dirX = ix;
      p.dirY = iy;
      if (Math.abs(ix) > 0.2) p.face = ix > 0 ? 1 : -1;
      p.moving = true;
      p.walk += dt * m;
      this.ghostTimer -= dt;
      if (this.ghostTimer <= 0 && this.ghosts.length < 14 && !this.reducedFx) {
        this.ghostTimer = 0.045;
        this.ghosts.push({ x: p.x, y: p.y, life: 0.32, face: p.face });
      }
    } else {
      p.moving = false;
    }
    p.hurt = Math.max(0, p.hurt - dt);
    p.iframe = Math.max(0, p.iframe - dt);
    this.shake = Math.max(0, this.shake - dt * 2.6);
    // Totem-style regen applies only on frames where the sorcerer is standing still
    const regen = this.regen + (p.moving ? 0 : this.standingRegen);
    if (regen > 0 && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + regen * dt);
    // «سپر جادویی» recharges
    if (this.shieldRank > 0 && !this.shieldReady) {
      this.shieldT -= dt;
      if (this.shieldT <= 0) this.shieldReady = true;
    }

    if (this.mode === "stage") this.updateStage(dt);
    this.healthSampleT -= dt;
    if (this.healthSampleT <= 0) {
      this.healthSampleT = 10;
      this.telemetry.health.push([+this.time.toFixed(0), +(this.player.hp / this.player.maxHp).toFixed(3)]);
    }
    if (this.over) return;
    this.spawn(dt);
    this.buildGrid();
    this.updateEnemies(dt);
    this.updateBurns(dt);
    this.updateSpells(dt);
    this.updateShots(dt);
    this.updateDelayed(dt);
    this.updateHazards(dt);
    this.updateTelegraphs(dt);
    this.updateChests(dt);
    this.updateActives(dt);
    this.updateGems(dt);
    this.updateFireFx(dt);
    this.updateFx(dt);

    if (this.anyDead) {
      this.enemies = this.enemies.filter((e) => !e.dead);
      this.anyDead = false;
    }
    if (!this.over && (this.pending > 0 || this.pendingBoon > 0)) this.emit({ type: "levelup" });
  }

  /* -------------------------------------------------------------- helpers */

  private sfx(name: SfxName) {
    this.emit({ type: "sfx", name });
  }

  private recalc() {
    const l = (id: PassiveId) => this.passives.get(id) ?? 0;

    // fold every carried artifact into one table (data-driven: see artifacts.ts)
    const a = emptyMods();
    for (const id of this.artifacts) {
      const m = BY_ID[id].mods;
      addMods(a, m);
      if (m.active && !this.activeCd.has(m.active.id)) {
        this.activeCd.set(m.active.id, m.active.cd * 0.5);
        this.activeTotal.set(m.active.id, m.active.cd);
      }
    }
    // artifact sets: a bonus while complete; the pieces are never consumed
    const complete = activeSets(this.artifacts);
    for (const set of SETS) if (complete.includes(set.id)) addMods(a, set.bonus);
    for (const id of complete) {
      if (this.setsActive.has(id)) continue;
      this.setsActive.add(id);
      const set = SETS.find((x) => x.id === id);
      this.emit({ type: "set", id });
      if (set) this.emit({ type: "banner", text: `دستِ «${set.name}» کامل شد!`, tone: "good" });
    }
    // the hero's passive behaves like a permanent, built-in relic
    const hero = BY_HERO[this.hero];
    addMods(a, { dmg: hero.dmg, speed: hero.speed, maxHp: hero.maxHp, xp: hero.xp, frozen: hero.frozen, spellDmg: hero.spellDmg, spellRadius: hero.spellRadius });
    const rb = researchBonus(this.research);
    a.pickup += rb.pickup;
    // tier-2 masteries fold into the same per-spell tables the spells already read
    for (const id of this.masteries.values()) {
      const md = MASTERIES[id];
      const m = md.mods;
      if (m.dmg) a.spellDmg[md.spell] = (a.spellDmg[md.spell] ?? 0) + m.dmg;
      if (m.cd) a.spellCd[md.spell] = (a.spellCd[md.spell] ?? 0) + m.cd;
      if (m.count) a.spellCount[md.spell] = (a.spellCount[md.spell] ?? 0) + m.count;
      if (m.radius) a.spellRadius[md.spell] = (a.spellRadius[md.spell] ?? 0) + m.radius;
    }
    this.a = a;

    // level boons, straight from boons.ts so text and effect always agree
    let bDmg = 1;
    let bCd = 1;
    let bSpeed = 0;
    let bPickup = 0;
    let bXp = 0;
    let bHp = 0;
    let bRevive = 0;
    let bUlt = 0;
    for (const [id, count] of this.boons) {
      const d = BY_BOON[id];
      if (d.dmg) bDmg *= Math.pow(1 + d.dmg, count);
      if (d.cd) bCd *= Math.pow(1 + d.cd, count);
      bSpeed += (d.speed ?? 0) * count;
      bPickup += (d.pickup ?? 0) * count;
      bXp += (d.xp ?? 0) * count;
      bHp += (d.maxHp ?? 0) * count;
      bRevive += (d.revive ?? 0) * count;
      bUlt += (d.ult ?? 0) * count;
    }
    this.ultBonus = bUlt;

    const T = PASSIVE_TUNING;
    const hpBase = 100 + a.maxHp + bHp;
    // «هوش» Intelligence +10%/rank · «افسون‌خوانی سریع» Fast Casting −5%/rank (additive, as in the source game)
    this.dmgMul = (1 + T.intelligencePerRank * l("might")) * (1 + a.dmg) * bDmg * (1 + rb.dmg);
    this.cdMul = (1 - T.fastCastingPerRank * l("haste")) * (1 + a.cd) * bCd;
    this.speed = 150 * (1 + 0.08 * l("swift") + a.speed + bSpeed);
    this.magnet = 75 * (1 + 0.3 * l("magnet") + a.pickup + bPickup);
    this.xpMul = (1 + 0.12 * l("wisdom")) * (1 + a.xp) * (1 + bXp);
    this.regen = 0.5 * l("regen");
    this.standingRegen = a.regen;
    this.armor = 2 * l("armor");
    // «نشانه‌روی» Snipe: +5% critical-strike chance per rank
    this.critChance = T.baseCritChance + T.snipeCritPerRank * l("snipe");
    // «سرزندگی» Vitality: +10% life-orb healing per rank
    this.orbHealBonus = T.vitalityOrbPerRank * l("vital");
    this.shieldRank = l("shield");
    this.player.r = 12 * a.size;
    // «سرزندگی» Vitality: +20% max HP per rank, stacking additively with relic percentages
    this.player.maxHp = Math.round(hpBase * (1 + a.maxHpPct + T.vitalityHpPerRank * l("vital")) * (1 + rb.maxHpPct));
    this.player.hp = Math.min(this.player.hp, this.player.maxHp);
    // only the total is recomputed — spent charges stay spent
    this.revivesGranted = 1 + a.revive + bRevive;
  }


  /** Spell damage bonus from artifacts, e.g. «تیر جادو». */
  private sd(id: SpellId, base: number) {
    return base * (1 + (this.a.spellDmg[id] ?? 0));
  }

  private sc(id: SpellId, base: number) {
    return base + (this.a.spellCount[id] ?? 0);
  }

  private scd(id: SpellId, base: number) {
    return base * (1 + (this.a.spellCd[id] ?? 0));
  }

  private sr(id: SpellId, base: number) {
    return base * (1 + (this.a.spellRadius[id] ?? 0));
  }

  private buildGrid() {
    this.grid.clear();
    const es = this.enemies;
    for (let i = 0; i < es.length; i++) {
      const e = es[i];
      if (e.dead) continue;
      const k = gridKey(Math.floor(e.x / CELL), Math.floor(e.y / CELL));
      const a = this.grid.get(k);
      if (a) a.push(e);
      else this.grid.set(k, [e]);
    }
  }

  private collect(out: Enemy[], x: number, y: number, r: number) {
    out.length = 0;
    const R = r + MAX_ER;
    const x0 = Math.floor((x - R) / CELL);
    const x1 = Math.floor((x + R) / CELL);
    const y0 = Math.floor((y - R) / CELL);
    const y1 = Math.floor((y + R) / CELL);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const a = this.grid.get(gridKey(cx, cy));
        if (!a) continue;
        for (let i = 0; i < a.length; i++) {
          const e = a[i];
          if (e.dead) continue;
          const dx = e.x - x;
          const dy = e.y - y;
          const rr = r + e.r;
          if (dx * dx + dy * dy <= rr * rr) out.push(e);
        }
      }
    }
    return out;
  }

  private inRange(range: number) {
    const out = this.cand;
    out.length = 0;
    const p = this.player;
    const r2 = range * range;
    const es = this.enemies;
    for (let i = 0; i < es.length; i++) {
      const e = es[i];
      if (e.dead) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      e.d2 = dx * dx + dy * dy;
      if (e.d2 <= r2) out.push(e);
    }
    return out;
  }

  private pickRandom(list: Enemy[], n: number) {
    const count = Math.min(n, list.length);
    for (let i = 0; i < count; i++) {
      const j = i + Math.floor(this.rand() * (list.length - i));
      const t = list[i];
      list[i] = list[j];
      list[j] = t;
    }
    return count;
  }

  private ringRadius() {
    return Math.hypot(this.viewW, this.viewH) / 2 + 50;
  }

  private addText(x: number, y: number, s: string, color: string, size = 13) {
    if (this.texts.length > (this.reducedFx ? 30 : 70)) return;
    this.texts.push({ x: x + (Math.random() - 0.5) * 10, y, s, life: 0.7, color, size, vy: -34, scale: 1 });
  }

  private burst(x: number, y: number, color: string, n: number, speed = 120) {
    if (this.sparks.length > (this.reducedFx ? 110 : 260)) return;
    if (this.reducedFx) n = Math.ceil(n * 0.4);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const v = speed * (0.4 + Math.random() * 0.8);
      this.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.25 + Math.random() * 0.3, color });
    }
  }

  /* -------------------------------------------------------------- enemies */

  private addEnemy(type: EnemyType, x: number, y: number) {
    const d = ENEMY[type];
    const min = this.clockMin();
    const late = Math.max(0, min - 10);
    const hpMul = 1 + min * 0.25 + min * min * 0.015 + late * late * 0.2 + late * late * late * 0.09;
    const power = this.stagePower();
    const hp = Math.max(1, Math.round(d.hp * hpMul * (1 + this.a.enemyHp) * this.diffHp() * power));
    const e: Enemy = {
      id: this.nextId++,
      type,
      x,
      y,
      vx: 0,
      vy: 0,
      hp,
      maxHp: hp,
      r: d.r,
      speed: d.speed * (1 + Math.min(0.62, min * 0.04)) * (1 + Math.min(0.5, Math.max(0, min - 3) * 0.055)) * (1 + this.a.enemySpeed) * this.diffSpeed(),
      dmg: d.dmg * (1 + min * 0.095 + late * late * 0.09 + late * late * late * 0.04) * (0.94 + this.levelFloor() * 0.06) * this.diffDmg() * Math.min(3, Math.sqrt(power)),
      xp: d.xp,
      flash: 0,
      touchCd: 0,
      orbCd: 0,
      slowT: 0,
      slowAmt: 0,
      seed: this.rand() * 100,
      dead: false,
      d2: 0,
      born: this.time,
      stun: 0,
      shootCd: type === "boss" ? 1.6 : 2.2 + this.rand() * 2,
      burnT: 0,
      burnTick: 0,
      burnDmg: 0,
      elite: false,
    };
    // after the first minute and a half, a few creatures arrive as gilded chieftains
    if (type !== "boss" && type !== "bat" && this.time > 90 && this.rand() < 0.045) {
      e.elite = true;
      e.hp = e.maxHp = Math.round(hp * 4);
      e.r *= 1.3;
      e.xp *= 6;
      e.speed *= 1.08;
    }
    this.enemies.push(e);
    this.rings.push({ x: e.x, y: e.y, r: 2, maxR: e.r * 2.2, life: 0.35, max: 0.35, color: ECOL[type].body, width: 1.5 });
    return e;
  }

  private pickType(min: number): EnemyType {
    const t = this.time;
    const wShade = 10;
    const wBat = t > 40 ? 3.5 : 0;
    const wGhoul = t > 110 ? 2.5 + min * 0.35 : 0;
    const wDiv = t > 230 ? 0.5 + (min - 4) * 0.25 : 0;
    let roll = this.rand() * (wShade + wBat + wGhoul + wDiv);
    if ((roll -= wShade) < 0) return "shade";
    if ((roll -= wBat) < 0) return "bat";
    if ((roll -= wGhoul) < 0) return "ghoul";
    return "div";
  }

  private spawn(dt: number) {
    const p = this.player;
    if (this.mode === "stage" && this.waveIdx >= 0) {
      this.spawnWave(dt);
      return;
    }
    const min = this.clockMin();
    // adaptive pressure: standing taller than the minute hand provokes the night
    const beyond = clamp((this.level - min) / 5, 0, 3);
    const flow = this.diffFlow();
    const rate = (1.0 + min * 1.15 + beyond * 0.45) * flow;
    const cap = Math.min(470, (46 + min * 40 + beyond * 28) * flow) + beyond * 45;
    this.spawnAcc += rate * dt;
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (this.enemies.length >= cap) continue;
      const a = this.rand() * TAU;
      const R = this.ringRadius();
      // ambushers spawn at half the ring, so a perfect kiter still meets the horde
      const ambush = this.time > 70 && this.rand() < 0.22;
      const dist = ambush ? R * (0.45 + this.rand() * 0.2) : R;
      const x = p.x + Math.cos(a) * dist;
      const y = p.y + Math.sin(a) * dist;
      const type = this.pickType(min);
      this.addEnemy(type, x, y);
      if (type === "bat" && this.rand() < 0.35) {
        this.addEnemy("bat", x + 22, y + 10);
        this.addEnemy("bat", x - 14, y + 24);
      }
    }

    if (this.mode === "endless" && this.time >= this.nextEvent) {
      const idx = Math.round(this.nextEvent / 60);
      const ahead = Math.max(0, this.level - idx - 1);
      this.nextEvent += 60;
      const R = this.ringRadius();
      if (idx % 3 === 0) {
        const a = this.rand() * TAU;
        this.boss = this.addEnemy("boss", p.x + Math.cos(a) * R, p.y + Math.sin(a) * R);
        this.emit({ type: "banner", text: "دیو سپید از راه رسید!", tone: "danger" });
        this.sfx("boss");
        this.rings.push({ x: p.x, y: p.y, r: 10, maxR: R * 0.6, life: 1, max: 1, color: "#ff3b4e", width: 4 });
        this.shake = 0.7;
      } else {
        const n = Math.min(44 + Math.min(24, ahead * 3), 14 + idx * 3 + Math.min(12, ahead));
        const type: EnemyType = idx % 2 === 0 ? "bat" : "shade";
        const off = this.rand() * TAU;
        for (let i = 0; i < n; i++) {
          const a = off + (i / n) * TAU;
          this.addEnemy(type, p.x + Math.cos(a) * R * 0.92, p.y + Math.sin(a) * R * 0.92);
        }
        this.emit({ type: "banner", text: "دیوان از هر سو می‌آیند!", tone: "danger" });
      }
    }
  }

  /** During a wave the horde comes from outside the boundary at the wave's own rate. */
  private spawnWave(dt: number) {
    const w = this.stage.waves[this.waveIdx];
    const p = this.player;
    this.spawnAcc += w.spawnRate * this.diffFlow() * dt;
    const min = this.clockMin();
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (this.enemies.length >= 300) continue;
      const a = this.rand() * TAU;
      const R = this.ringRadius();
      // a third of a wave's horde arrives halfway, so a perfect kiter still meets the wave
      const dist = this.rand() < 0.34 ? R * (0.45 + this.rand() * 0.2) : R;
      const e = this.addEnemy(this.pickType(min), p.x + Math.cos(a) * dist, p.y + Math.sin(a) * dist);
      // in a slay wave only the wave's own spawns count toward the objective
      if (w.kind === "slay") e.objective = true;
    }
  }

  private updateEnemies(dt: number) {
    const p = this.player;
    const es = this.enemies;
    const far = this.ringRadius() * 1.6;
    const damp = Math.exp(-7 * dt);
    const near = this.tmpA;
    for (let i = 0; i < es.length; i++) {
      const e = es[i];
      if (e.dead) continue;
      let dx = p.x - e.x;
      let dy = p.y - e.y;
      let d = Math.hypot(dx, dy) || 1;

      if (d > far) {
        const a = this.rand() * TAU;
        const R = this.ringRadius();
        e.x = p.x + Math.cos(a) * R;
        e.y = p.y + Math.sin(a) * R;
        continue;
      }

      // frozen by «فرّ ایزدی»: hangs in place, harmless and defenceless
      if (e.stun > 0) {
        e.stun -= dt;
        e.flash -= dt;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.vx *= damp;
        e.vy *= damp;
        if (Math.random() < dt * 4) this.burst(e.x, e.y, "#ffe9b0", 1, 30);
        continue;
      }

      const nx = dx / d;
      const ny = dy / d;
      let sp = e.speed;
      if (e.slowT > 0) {
        sp *= 1 - e.slowAmt;
        e.slowT -= dt;
      }
      let mx = nx * sp;
      let my = ny * sp;
      if (e.type === "bat") {
        const w = Math.sin(this.time * 5 + e.seed) * 0.7;
        mx += -ny * sp * w;
        my += nx * sp * w;
      }
      e.x += (mx + e.vx) * dt;
      e.y += (my + e.vy) * dt;
      e.vx *= damp;
      e.vy *= damp;
      e.flash -= dt;
      e.touchCd -= dt;
      e.orbCd -= dt;

      // big divs hurl slow, dodgeable bolts of black fire
      if (e.type === "boss" || e.type === "div") {
        e.shootCd -= dt;
        if (e.shootCd <= 0 && d < 520 && this.hazards.length < 60) {
          e.shootCd = e.type === "boss" ? 2.5 : 3.6;
          const spread = e.type === "boss" ? [-0.15, 0.15] : [0];
          for (const off of spread) {
            const a = Math.atan2(dy, dx) + off + (this.rand() - 0.5) * 0.06;
            this.hazards.push({
              x: e.x,
              y: e.y,
              vx: Math.cos(a) * (e.type === "boss" ? 150 : 140) * (1 + this.phase * 0.06),
              vy: Math.sin(a) * (e.type === "boss" ? 150 : 140) * (1 + this.phase * 0.06),
              r: e.type === "boss" ? 11 : 7,
              dmg: e.type === "boss" ? 15 : 12,
              life: 4.5,
              seed: this.rand() * 10,
              dead: false,
            });
          }
        }
      }

      this.collect(near, e.x, e.y, e.r);
      for (let j = 0; j < near.length; j++) {
        const o = near[j];
        if (o === e) continue;
        const ox = e.x - o.x;
        const oy = e.y - o.y;
        const od2 = ox * ox + oy * oy;
        const min = e.r + o.r;
        if (od2 < min * min && od2 > 0.01) {
          const od = Math.sqrt(od2);
          const k = ((min - od) / od) * 0.3 * (o.r / (e.r + o.r)) * 2;
          e.x += ox * k * 0.5;
          e.y += oy * k * 0.5;
        }
      }

      dx = p.x - e.x;
      dy = p.y - e.y;
      d = Math.hypot(dx, dy);
      const touch = e.r + p.r - 3;
      if (d < touch) {
        if (e.touchCd <= 0) {
          e.touchCd = 0.7;
          this.hurtPlayer(e.dmg);
        }
        if (d > 0.01) {
          const k = (touch - d) / d;
          e.x -= dx * k;
          e.y -= dy * k;
        }
      }
    }
  }

  private updateHazards(dt: number) {
    if (!this.hazards.length) return;
    const p = this.player;
    let dead = false;
    for (const h of this.hazards) {
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      h.life -= dt;
      if (h.dead || h.life <= 0) {
        h.dead = true;
        dead = true;
        continue;
      }
      if (Math.random() < dt * 12) this.burst(h.x, h.y, "#ff6b78", 1, 22);
      const dx = p.x - h.x;
      const dy = p.y - h.y;
      if (dx * dx + dy * dy < (h.r + p.r) * (h.r + p.r)) {
        h.dead = true;
        dead = true;
        this.hurtPlayer(h.dmg);
        this.burst(h.x, h.y, "#ff6b78", 8, 150);
      }
    }
    if (dead) this.hazards = this.hazards.filter((h) => !h.dead);
  }

  private hurtPlayer(raw: number) {
    const p = this.player;
    if (p.iframe > 0 || this.over) return;
    if (this.shieldReady) {
      this.shieldReady = false;
      this.shieldT = SPELLS.shield[Math.max(0, Math.min(SPELLS.shield.length, this.shieldRank) - 1)];
      p.iframe = Math.max(p.iframe, 0.6);
      this.rings.push({ x: p.x, y: p.y, r: 14, maxR: 70, life: 0.4, max: 0.4, color: "#9be8ff", width: 4 });
      this.burst(p.x, p.y, "#9be8ff", 12, 160);
      this.addText(p.x, p.y - 40, "سپر!", "#9be8ff", 16);
      this.sfx("heal");
      return;
    }
    // «سپر نیرو» swallows the blow outright
    const shield = this.activeCd.get("shield");
    if (shield !== undefined && shield <= 0) {
      this.activeCd.set("shield", this.activeTotal.get("shield") ?? 60);
      p.iframe = Math.max(p.iframe, 3);
      this.flash = 0.5;
      this.rings.push({ x: p.x, y: p.y, r: 12, maxR: 90, life: 0.5, max: 0.5, color: "#9be8ff", width: 4 });
      this.burst(p.x, p.y, "#9be8ff", 14, 170);
      this.addText(p.x, p.y - 40, "سپر!", "#9be8ff", 17);
      this.sfx("heal");
      return;
    }
    const d = Math.max(1, Math.round(raw * (1 - this.a.taken) - this.armor));
    p.hp -= d;
    p.iframe = 0.35;
    p.hurt = 0.3;
    this.shake = Math.min(1, this.shake + 0.55);
    this.addText(p.x, p.y - 34, fa(d), "#ff6b78", 16);
    this.burst(p.x, p.y - 20, "#ff6b78", 10, 160);
    this.rings.push({ x: p.x, y: p.y, r: 6, maxR: 70, life: 0.5, max: 0.5, color: "#ff6b78", width: 3 });
    this.sfx("hurt");
    if (p.hp <= 0) {
      // «جانِ دوم»: near-death lights the lamp instead
      if (this.winds > 0) {
        this.revivesUsed++;
        p.hp = Math.round(p.maxHp * 0.45);
        p.iframe = 1.6;
        this.flash = 0.8;
        this.slowmo = 0.9;
        this.shake = 1;
        const list = this.inRange(340);
        for (const e of list) {
          const dx = e.x - p.x;
          const dy = e.y - p.y;
          const d2 = Math.hypot(dx, dy) || 1;
          e.stun = Math.max(e.stun, e.type === "boss" ? 1 : 2.4);
          this.hit(e, 40, (dx / d2) * 520, (dy / d2) * 520, "#ffe9b0", true);
        }
        for (const h of this.hazards) {
          if (Math.hypot(h.x - p.x, h.y - p.y) < 380) h.dead = true;
        }
        for (let i = 0; i < 2; i++) {
          this.rings.push({ x: p.x, y: p.y, r: 14, maxR: 250 + i * 90, life: 0.65 + i * 0.15, max: 0.65 + i * 0.15, color: "#ffd98a", width: 6 - i * 2 });
        }
        this.burst(p.x, p.y, "#ffd98a", 30, 350);
        this.addText(p.x, p.y - 50, "جانِ دوم!", "#ffd98a", 24);
        this.sfx("ult");
        this.emit({
          type: "banner",
          text: this.winds > 0 ? `جانِ دوم روشن شد! (${fa(this.winds)} فرصت دیگر)` : "جانِ دوم روشن شد؛ فرصت دیگری نمانده!",
          tone: "good",
        });
        return;
      }
      p.hp = 0;
      if (this.outcome) return;
      this.burst(p.x, p.y, "#3fd9c8", 26, 220);
      this.rings.push({ x: p.x, y: p.y, r: 6, maxR: 300, life: 1, max: 1, color: "#3fd9c8", width: 6 });
      this.shake = 1.2;
      this.sfx("over");
      this.finish("defeat");
    }
  }

  private hit(e: Enemy, dmg: number, kx: number, ky: number, color: string, quiet = false) {
    if (e.dead) return;
    const crit = this.rand() < this.critChance;
    let mul = this.dmgMul * (0.9 + this.rand() * 0.2) * (crit ? PASSIVE_TUNING.critMultiplier : 1);
    if (e.slowAmt >= 0.35 && e.slowT > 0) mul *= this.a.frozen; // «بلور ماه»
    if (this.a.aged > 0 && this.time - e.born > 5) mul *= 1 + this.a.aged; // «نشان کهنه»
    const d = Math.max(1, Math.round(dmg * mul));
    // «داس دروگر» و هم‌مانندها: شانس کشتار فوری
    if (this.a.slay > 0 && e.type !== "boss" && this.rand() < this.a.slay) {
      e.hp = 0;
      this.addText(e.x, e.y - e.r - 6, "درو!", "#d8d2e8", 15);
    } else {
      e.hp -= d;
    }
    e.flash = 0.12;
    const kb = e.type === "boss" ? 0.12 : e.type === "div" ? 0.45 : e.type === "ghoul" ? 0.7 : 1;
    e.vx += kx * kb;
    e.vy += ky * kb;
    const sparkColor = crit ? "#fff3a0" : color;
    this.burst(e.x, e.y - e.r * 0.5, sparkColor, crit ? 9 : 4, crit ? 150 : 90);
    if (!quiet) this.addText(e.x, e.y - e.r - 4, fa(d), crit ? "#fff3a0" : color, d >= 40 || crit ? 17 : 13);
    if (crit) this.impact(e.x, e.y - e.r * 0.4, "#fff3a0", 1.5);
    if (e.hp <= 0) this.kill(e);
    else if (!quiet) this.sfx("hit");
  }

  private kill(e: Enemy) {
    e.dead = true;
    this.anyDead = true;
    this.kills++;
    this.burst(e.x, e.y, ECOL[e.type].body, e.type === "boss" ? 40 : 5, e.type === "boss" ? 260 : 120);
    this.rings.push({ x: e.x, y: e.y, r: 4, maxR: 40 + e.r * 20, life: 0.45, max: 0.45, color: ECOL[e.type].body, width: 2.5 });
    this.combo++;
    this.comboTimer = 0.8;
    this.ult = Math.min(100, this.ult + (e.type === "boss" ? 15 : e.type === "div" ? 2.5 : 0.28) * (1 + this.phase * 0.1) * (1 + this.a.ult) * (1 + this.ultBonus));
    // every kill leaves a gem, whatever the creature was
    this.dropGem(e.x, e.y, e.xp);
    // a wisp of the creature's soul drifts upward
    if (this.souls.length < 90) {
      this.souls.push({ x: e.x, y: e.y - e.r * 0.3, vx: (Math.random() - 0.5) * 24, life: 0.9, color: ECOL[e.type].eye });
    }
    if (e.elite) {
      this.ult = Math.min(100, this.ult + 8);
      this.burst(e.x, e.y, "#f2b84b", 18, 230);
      this.rings.push({ x: e.x, y: e.y, r: 8, maxR: 170, life: 0.6, max: 0.6, color: "#f2b84b", width: 4 });
      this.addText(e.x, e.y - e.r - 16, "سرکرده!", "#ffd98a", 16);
      if (this.rand() < 0.08) this.pickups.push({ id: this.nextPickupId++, kind: "anar", x: e.x + 14, y: e.y, seed: this.rand() * 10, dead: false });
      // chieftains only rarely carry a vault, and never early on
      if (this.time > 240 && this.rand() < 0.07) this.chests.push({ id: this.nextChestId++, x: e.x, y: e.y, seed: this.rand() * 10, dead: false });
      this.shake = Math.min(1, this.shake + 0.3);
    }
    if (this.kills % 250 === 0) {
      this.emit({ type: "banner", text: `${fa(this.kills)} دیو از پای درآمد!`, tone: "good" });
    }
    if (this.mode === "stage" && this.waveIdx >= 0) {
      this.waveKills++;
      if (e.objective) this.waveObjKills++;
    }
    if (e === this.stageBoss) {
      this.stageBoss = null;
      this.boss = null;
      this.slowmo = 1;
      this.flash = 1;
      this.shake = 1;
      this.burst(e.x, e.y, "#ffd98a", 40, 320);
      for (let i = 0; i < 3; i++) this.rings.push({ x: e.x, y: e.y, r: 20, maxR: 200 + i * 90, life: 0.8 + i * 0.15, max: 0.8 + i * 0.15, color: "#ffd98a", width: 6 - i });
      this.finish("victory");
      return;
    }
    if (e.type === "boss") {
      this.boss = null;
      this.slowmo = 0.9;
      this.chests.push({ id: this.nextChestId++, x: e.x, y: e.y, seed: this.rand() * 10, dead: false });
      this.pickups.push({ id: this.nextPickupId++, kind: "anar", x: e.x - 26, y: e.y + 10, seed: this.rand() * 10, dead: false });
      this.pickups.push({ id: this.nextPickupId++, kind: "kahroba", x: e.x + 26, y: e.y + 10, seed: this.rand() * 10, dead: false });
      this.shake = 1;
      this.emit({ type: "banner", text: "دیو سپید از پای درآمد!", tone: "good" });
      this.sfx("boom");
    } else {
      const roll = this.rand();
      const anarChance = e.type === "div" ? 0.02 : 0.0015;
      if (roll < anarChance) this.pickups.push({ id: this.nextPickupId++, kind: "anar", x: e.x, y: e.y, seed: this.rand() * 10, dead: false });
      else if (roll < anarChance + 0.004) this.pickups.push({ id: this.nextPickupId++, kind: "kahroba", x: e.x, y: e.y, seed: this.rand() * 10, dead: false });
      this.sfx("kill");
    }
  }

  private dropGem(x: number, y: number, value: number) {
    if (this.gems.length >= 340) {
      const g = this.gems[Math.floor(this.rand() * this.gems.length)];
      g.value += value;
      return;
    }
    this.gems.push({ x, y, value, pull: false, sp: 120, seed: this.rand() * 10, dead: false, glow: 0 });
  }

  /* --------------------------------------------------------------- spells */

  /** A ring and a spray of embers at the point of impact. */
  private impact(x: number, y: number, color: string, strength = 1) {
    this.rings.push({ x, y, r: 3, maxR: 16 + 20 * strength, life: 0.22 + 0.08 * strength, max: 0.22 + 0.08 * strength, color, width: 2.4 * strength });
    this.burst(x, y, color, Math.round(3 + 3 * strength), 120 + 60 * strength);
  }

  private explode(x: number, y: number, radius: number, dmg: number, color: string) {
    const list = this.collect(this.tmpB, x, y, radius);
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      const dx = e.x - x;
      const dy = e.y - y;
      const d = Math.hypot(dx, dy) || 1;
      this.hit(e, dmg, (dx / d) * 150, (dy / d) * 150, color);
    }
    this.blasts.push({ x, y, r: radius, life: 0.32, max: 0.32, color });
    this.burst(x, y, color, 10, 220);
    this.rings.push({ x, y, r: radius * 0.4, maxR: radius * 1.6, life: 0.4, max: 0.4, color, width: 3 });
    this.sfx("boom");
  }

  private lightning(x0: number, y0: number, x1: number, y1: number) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    const n = Math.max(2, Math.ceil(len / 26));
    const px = -dy / len;
    const py = dx / len;
    const pts: number[] = [x0, y0];
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const off = (this.rand() - 0.5) * 26;
      pts.push(x0 + dx * t + px * off, y0 + dy * t + py * off);
    }
    pts.push(x1, y1);
    this.bolts.push({ pts, life: 0.18 });
  }

  private updateSpells(dt: number) {
    const p = this.player;

    const bolt = this.spells.get("bolt");
    const boltFusion = this.fused.get("bolt");
    if (bolt && boltFusion) {
      bolt.timer -= dt;
      if (bolt.timer <= 0) this.castBoltFusion(boltFusion, bolt);
    } else if (bolt && (bolt.timer -= dt) <= 0) {
      const b0 = SPELLS.bolt[bolt.lvl - 1];
      const s = { dmg: this.sd("bolt", b0.dmg), count: this.sc("bolt", b0.count), cd: this.scd("bolt", b0.cd), pierce: b0.pierce };
      const bt = this.talents.get("bolt");
      if (bt === "doppel") {
        s.count += 1;
        s.cd *= 0.9;
      }
      if (bt === "arrow") {
        s.pierce += 2;
        s.dmg *= 1.4;
      }
      const boltSpeed = bt === "arrow" ? 610 : 470;
      const list = this.inRange(540);
      if (!list.length) bolt.timer = 0.12;
      else {
        list.sort((a, b) => a.d2 - b.d2);
        for (let i = 0; i < s.count; i++) {
          const t = list[Math.min(i, list.length - 1)];
          let a = Math.atan2(t.y - p.y, t.x - p.x);
          if (i >= list.length) a += (i - list.length + 1) * 0.16;
          this.shots.push({
            kind: "bolt",
            x: p.x,
            y: p.y - 6,
            vx: Math.cos(a) * boltSpeed,
            vy: Math.sin(a) * boltSpeed,
            r: 5,
            dmg: s.dmg,
            life: 1.3,
            pierce: s.pierce,
            radius: 0,
            hit: s.pierce > 0 ? new Set() : null,
            fx: bt === "firecracker" ? "firecracker" : undefined,
            dead: false,
            trail: [],
            seed: this.rand() * 10,
          });
        }
        this.castFx = 1;
        bolt.timer = s.cd * this.cdMul;
      }
    }

    const fire = this.spells.get("fire");
    if (fire && (fire.timer -= dt) <= 0) {
      const f0 = SPELLS.fire[fire.lvl - 1];
      const s = { dmg: this.sd("fire", f0.dmg), radius: this.sr("fire", f0.radius), cd: this.scd("fire", f0.cd), count: this.sc("fire", f0.count) };
      const list = this.inRange(430);
      if (!list.length) fire.timer = 0.2;
      else {
        const n = this.pickRandom(list, s.count);
        for (let i = 0; i < s.count; i++) {
          const t = list[i % n];
          const a = Math.atan2(t.y - p.y, t.x - p.x) + (i >= n ? 0.3 : 0);
          this.fireMuzzle(p.x, p.y - 6, a);
          this.shots.push({
            kind: "fire",
            x: p.x,
            y: p.y - 6,
            vx: Math.cos(a) * 310,
            vy: Math.sin(a) * 310,
            r: 8,
            dmg: s.dmg,
            life: 1.5,
            pierce: 0,
            radius: s.radius,
            hit: null,
            dead: false,
            trail: [],
            target: t,
            seed: this.rand() * 10,
          });
        }
        this.sfx("burn");
        this.castFx = 1;
        fire.timer = s.cd * this.cdMul;
      }
    }

    const zap = this.spells.get("zap");
    if (zap && (zap.timer -= dt) <= 0) {
      const z0 = SPELLS.zap[zap.lvl - 1];
      const s = { dmg: this.sd("zap", z0.dmg), strikes: this.sc("zap", z0.strikes), chain: z0.chain, cd: this.scd("zap", z0.cd) };
      const zt = this.talents.get("zap");
      if (zt === "chain") s.chain += 2;
      if (zt === "storm") {
        s.strikes += 1;
        s.dmg *= 1.25;
      }
      const list = this.inRange(390);
      if (!list.length) zap.timer = 0.2;
      else {
        const n = this.pickRandom(list, s.strikes);
        const struck = new Set<number>();
        for (let i = 0; i < n; i++) {
          let cur = list[i];
          if (cur.dead || struck.has(cur.id)) continue;
          this.lightning(cur.x + (this.rand() - 0.5) * 90, cur.y - 460, cur.x, cur.y);
          struck.add(cur.id);
          this.hit(cur, s.dmg, 0, 0, C.zap.color);
          for (let c = 0; c < s.chain; c++) {
            const around = this.collect(this.tmpB, cur.x, cur.y, 135);
            let best: Enemy | null = null;
            let bd = Infinity;
            for (let k = 0; k < around.length; k++) {
              const o = around[k];
              if (struck.has(o.id)) continue;
              const d2 = (o.x - cur.x) ** 2 + (o.y - cur.y) ** 2;
              if (d2 < bd) {
                bd = d2;
                best = o;
              }
            }
            if (!best) break;
            this.lightning(cur.x, cur.y, best.x, best.y);
            struck.add(best.id);
            this.hit(best, s.dmg * 0.8, 0, 0, C.zap.color);
            cur = best;
          }
        }
        this.sfx("zap");
        this.castFx = 1;
        zap.timer = s.cd * this.cdMul;
      }
    }

    const frost = this.spells.get("frost");
    if (frost) {
      const r0 = SPELLS.frost[frost.lvl - 1];
      const s = { dmg: this.sd("frost", r0.dmg), radius: this.sr("frost", r0.radius), slow: Math.min(0.7, r0.slow) };
      this.frostTimer -= dt;
      if (this.frostTimer <= 0) {
        this.frostTimer = 0.5 * this.cdMul;
        const list = this.collect(this.tmpA, p.x, p.y, s.radius);
        for (let i = 0; i < list.length; i++) {
          const e = list[i];
          e.slowT = 0.8;
          e.slowAmt = e.type === "boss" ? s.slow * 0.5 : s.slow;
          this.hit(e, s.dmg, 0, 0, C.frost.color, true);
        }
      }
    }

    const orbs = this.spells.get("orbs");
    if (orbs) {
      const o0 = SPELLS.orbs[orbs.lvl - 1];
      const s = { dmg: this.sd("orbs", o0.dmg), count: this.sc("orbs", o0.count), radius: this.sr("orbs", o0.radius), spin: o0.spin * (1 - (this.a.spellCd["orbs"] ?? 0)) };
      const ot = this.talents.get("orbs");
      if (ot === "swiftorbit") {
        s.count += 1;
        s.spin *= 1.35;
      }
      if (ot === "antigrav") s.radius += 22;
      this.orbAngle += s.spin * dt;
      for (let i = 0; i < s.count; i++) {
        const a = this.orbAngle + (i / s.count) * TAU;
        const ox = p.x + Math.cos(a) * s.radius;
        const oy = p.y + Math.sin(a) * s.radius;
        const list = this.collect(this.tmpA, ox, oy, 11);
        for (let j = 0; j < list.length; j++) {
          const e = list[j];
          if (e.orbCd > 0) continue;
          e.orbCd = 0.45;
          const dx = e.x - p.x;
          const dy = e.y - p.y;
          const d = Math.hypot(dx, dy) || 1;
          this.hit(e, s.dmg, (dx / d) * (ot === "antigrav" ? 380 : 110), (dy / d) * (ot === "antigrav" ? 380 : 110), C.orbs.color);
        }
      }
    }

    const meteor = this.spells.get("meteor");
    if (meteor && (meteor.timer -= dt) <= 0) {
      const m0 = SPELLS.meteor[meteor.lvl - 1];
      const s = { dmg: this.sd("meteor", m0.dmg), count: this.sc("meteor", m0.count), radius: this.sr("meteor", m0.radius), cd: this.scd("meteor", m0.cd) };
      const list = this.inRange(460);
      if (!list.length) meteor.timer = 0.25;
      else {
        const n = this.pickRandom(list, s.count);
        for (let i = 0; i < n; i++) {
          const t = list[i];
          const delay = 0.7 + i * 0.12;
          this.meteors.push({ x: t.x, y: t.y, t: delay, delay, r: s.radius, dmg: s.dmg });
        }
        this.castFx = 1;
        meteor.timer = s.cd * this.cdMul;
      }
    }

    const blade = this.spells.get("blade");
    if (blade && (blade.timer -= dt) <= 0) {
      const w0 = SPELLS.blade[blade.lvl - 1];
      const s = { dmg: this.sd("blade", w0.dmg), count: this.sc("blade", w0.count), size: this.sr("blade", w0.size), cd: this.scd("blade", w0.cd) };
      const base = Math.atan2(p.dirY, p.dirX);
      for (let i = 0; i < s.count; i++) {
        const a = base + (s.count === 2 ? i * Math.PI : (i * TAU) / s.count);
        this.shots.push({
          kind: "blade",
          x: p.x,
          y: p.y,
          vx: Math.cos(a) * 400,
          vy: Math.sin(a) * 400,
          r: s.size,
          dmg: s.dmg,
          life: 0.85,
          pierce: 9999,
          radius: 0,
          hit: new Set(),
          dead: false,
          trail: [],
          seed: this.rand() * 10,
        });
      }
      this.sfx("slash");
      this.castFx = 1;
      blade.timer = s.cd * this.cdMul;
    }

    const nova = this.spells.get("nova");
    if (nova && (nova.timer -= dt) <= 0) {
      const n0 = SPELLS.nova[nova.lvl - 1];
      const s = { dmg: this.sd("nova", n0.dmg), radius: this.sr("nova", n0.radius), cd: this.scd("nova", n0.cd) };
      this.novas.push({ x: p.x, y: p.y, r: 10, maxR: s.radius, dmg: s.dmg, hit: new Set() });
      this.castFx = 1;
      nova.timer = s.cd * this.cdMul;
    }
    this.updateNewSpells(dt);
  }

  /** Spirit, Cyclone, Energy Bolt and Flash Shock, plus the Maelstrom fusion. */
  private updateNewSpells(dt: number) {
    const p = this.player;

    // ارواح یاری‌گر — homing magic missiles from orbiting spirits
    const sp = this.spells.get("spirit");
    this.spiritCount = 0;
    if (sp) {
      const d0 = SPELLS.spirit[sp.lvl - 1];
      const tal = this.talents.get("spirit");
      const count = this.sc("spirit", d0.count) + (tal === "missile" ? 1 : 0) + (tal === "legion" ? 2 : 0);
      const dmg = this.sd("spirit", d0.dmg) * (tal === "legion" ? 0.8 : 1);
      this.spiritCount = count;
      this.spiritAngle += dt * 1.8;
      if ((sp.timer -= dt) <= 0) {
        const list = this.inRange(480);
        if (!list.length) sp.timer = 0.2;
        else {
          for (let i = 0; i < count; i++) {
            const a = this.spiritAngle + (i / count) * TAU;
            const sx = p.x + Math.cos(a) * 30;
            const sy = p.y - 14 + Math.sin(a) * 14;
            const tgt = list[Math.floor(this.rand() * list.length)];
            const ang = Math.atan2(tgt.y - sy, tgt.x - sx);
            this.shots.push({ kind: "missile", x: sx, y: sy, vx: Math.cos(ang) * 300, vy: Math.sin(ang) * 300, r: 6, dmg, life: 2.2, pierce: 0, radius: 0, hit: null, dead: false, trail: [], seed: this.rand() * 10, fx: tal === "missile" ? "missile" : undefined });
          }
          sp.timer = this.scd("spirit", d0.cd) * this.cdMul;
          this.castFx = 1;
          this.sfx("cast");
        }
      }
    }

    // گردباد — wandering cyclones; fused with Satellite into Maelstrom
    const cy = this.spells.get("cyclone");
    this.maelstrom = null;
    if (cy) {
      const c0 = SPELLS.cyclone[cy.lvl - 1];
      const tal = this.talents.get("cyclone");
      if (this.fused.get("cyclone") === "maelstrom") {
        this.updateMaelstrom(dt, this.sr("cyclone", c0.radius), this.sd("cyclone", c0.dmg));
      } else if ((cy.timer -= dt) <= 0) {
        const count = this.sc("cyclone", c0.count) + (tal === "tempest" ? 1 : 0);
        const dur = c0.dur * (tal === "tempest" ? 1.4 : 1);
        const radius = this.sr("cyclone", c0.radius);
        for (let i = 0; i < count; i++) {
          const a = this.rand() * TAU;
          this.shots.push({ kind: "cyclone", x: p.x + Math.cos(a) * 40, y: p.y + Math.sin(a) * 40, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70, r: radius, dmg: this.sd("cyclone", c0.dmg), life: dur, pierce: 9999, radius, hit: null, dead: false, trail: [], seed: this.rand() * 10, tick: 0, fx: tal === "void" ? "void" : undefined });
        }
        cy.timer = this.scd("cyclone", c0.cd) * this.cdMul;
        this.castFx = 1;
        this.sfx("blade");
      }
    }

    // پرتو انرژی — piercing beam
    const en = this.spells.get("energy");
    if (en && (en.timer -= dt) <= 0) {
      const e0 = SPELLS.energy[en.lvl - 1];
      const tal = this.talents.get("energy");
      const list = this.inRange(e0.len);
      if (!list.length) en.timer = 0.2;
      else {
        list.sort((a, b) => a.d2 - b.d2);
        const base = Math.atan2(list[0].y - p.y, list[0].x - p.x);
        const angles = tal === "prism" ? [base - 0.35, base, base + 0.35] : [base];
        const dmg = this.sd("energy", e0.dmg) * (tal === "prism" ? 0.7 : 1);
        for (const a of angles) this.fireBeam(p.x, p.y - 6, a, e0.len, e0.width, dmg, "#ffe36e", tal === "flare");
        en.timer = this.scd("energy", e0.cd) * this.cdMul;
        this.castFx = 1;
        this.sfx("zap");
      }
    }

    // ضربهٔ صاعقه — crushing strikes that stun
    const fs = this.spells.get("flash");
    if (fs && (fs.timer -= dt) <= 0) {
      const f0 = SPELLS.flash[fs.lvl - 1];
      const tal = this.talents.get("flash");
      const list = this.inRange(360);
      if (!list.length) fs.timer = 0.2;
      else {
        const count = this.sc("flash", f0.count) + (tal === "static" ? 1 : 0);
        let radius = this.sr("flash", f0.radius);
        let dmg = this.sd("flash", f0.dmg);
        let cd = this.scd("flash", f0.cd);
        if (tal === "wipeout") {
          radius *= 1.8;
          dmg *= 1.8;
          cd *= 1.4;
        }
        const stun = tal === "static" ? 1.2 : 0.4;
        const n = this.pickRandom(list, count);
        const targets = list.slice(0, n).map((e) => ({ x: e.x, y: e.y }));
        for (const t0 of targets) this.flashStrike(t0.x, t0.y, radius, dmg, stun);
        fs.timer = cd * this.cdMul;
        this.castFx = 1;
      }
    }
  }

  /** Beam along a line: hits everything within `w` of the segment. */
  private fireBeam(x: number, y: number, a: number, len: number, w: number, dmg: number, color: string, flare: boolean) {
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const es = this.enemies;
    for (let i = 0; i < es.length; i++) {
      const e = es[i];
      if (e.dead) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      const along = dx * ux + dy * uy;
      if (along < 0 || along > len) continue;
      if (Math.abs(dx * uy - dy * ux) <= w + e.r) this.hit(e, dmg, ux * 90, uy * 90, color);
    }
    this.beams.push({ x1: x, y1: y, x2: x + ux * len, y2: y + uy * len, life: 0.25, max: 0.25, color, w });
    if (flare) this.explode(x + ux * len, y + uy * len, 80, dmg * 0.9, "#ffb066");
  }

  private flashStrike(x: number, y: number, radius: number, dmg: number, stun: number) {
    const list = this.collect(this.tmpB, x, y, radius);
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      const dx = e.x - x;
      const dy = e.y - y;
      const d = Math.hypot(dx, dy) || 1;
      this.hit(e, dmg, (dx / d) * 120, (dy / d) * 120, "#a8d8ff");
      if (!e.dead) e.stun = Math.max(e.stun, e.type === "boss" ? stun * 0.4 : stun);
    }
    this.lightning(x + (this.rand() - 0.5) * 40, y - 300, x, y);
    this.blasts.push({ x, y, r: radius, life: 0.3, max: 0.3, color: "#a8d8ff" });
    this.rings.push({ x, y, r: radius * 0.3, maxR: radius * 1.3, life: 0.35, max: 0.35, color: "#d8f0ff", width: 3 });
    this.sfx("zap");
  }

  /** گرداب: a huge vortex orbiting the sorcerer, pulling and grinding. */
  private updateMaelstrom(dt: number, baseR: number, baseDmg: number) {
    const p = this.player;
    this.maelstromAngle += dt * 1.3;
    const r = baseR * 1.7;
    const mx = p.x + Math.cos(this.maelstromAngle) * 150;
    const my = p.y + Math.sin(this.maelstromAngle) * 150;
    this.maelstrom = { x: mx, y: my, r };
    const pull = this.collect(this.tmpA, mx, my, r * 2.2);
    for (let i = 0; i < pull.length; i++) {
      const e = pull[i];
      if (e.type === "boss") continue;
      const dx = mx - e.x;
      const dy = my - e.y;
      const d = Math.hypot(dx, dy) || 1;
      e.x += (dx / d) * 110 * dt;
      e.y += (dy / d) * 110 * dt;
    }
    this.maelstromT -= dt;
    if (this.maelstromT <= 0) {
      this.maelstromT = 0.25;
      const list = this.collect(this.tmpA, mx, my, r);
      for (let i = 0; i < list.length; i++) this.hit(list[i], baseDmg * 2.4, 0, 0, "#9be8d0", true);
    }
  }

  /** Magic Bolt transformed by a fusion. */
  private castBoltFusion(f: FusionId, bolt: { lvl: number; timer: number }) {
    const b0 = SPELLS.bolt[bolt.lvl - 1];
    const dmg = this.sd("bolt", b0.dmg);
    const p = this.player;
    const list = this.inRange(560);
    if (!list.length) {
      bolt.timer = 0.15;
      return;
    }
    list.sort((a, b) => a.d2 - b.d2);
    const base = Math.atan2(list[0].y - p.y, list[0].x - p.x);
    const shot = (kind: Shot["kind"], a: number, speed: number, r: number, d: number, life: number, extra: Partial<Shot> = {}) =>
      this.shots.push({ kind, x: p.x, y: p.y - 6, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r, dmg: d, life, pierce: 0, radius: 0, hit: new Set(), dead: false, trail: [], seed: this.rand() * 10, ...extra });
    if (f === "polymorph") {
      for (let k = 0; k < 3; k++) shot("phantom", base + (k - 1) * 0.5, 330, 7, dmg * 1.7, 3, { bounce: 3 });
      bolt.timer = this.scd("bolt", b0.cd) * 1.25 * this.cdMul;
    } else if (f === "fireworks") {
      for (let k = 0; k < 2; k++) shot("firework", base + (k - 0.5) * 0.4, 360, 7, dmg * 1.4, 1.4, { tick: 0.45 });
      bolt.timer = this.scd("bolt", b0.cd) * 1.6 * this.cdMul;
    } else {
      shot("heavy", base, 520, 16, dmg * 5, 1.6, { pierce: 9999, tick: 0 });
      bolt.timer = this.scd("bolt", b0.cd) * 2.6 * this.cdMul;
      this.shake = Math.min(1, this.shake + 0.25);
    }
    this.castFx = 1;
    this.sfx("cast");
  }

  private fireworkBurst(s: Shot) {
    this.explode(s.x, s.y, 70, s.dmg * 1.2, "#ffb066");
    // a festival of colours: three expanding star rings and a shower of coloured sparks
    const cols = ["#8fe3ff", "#ff7ac8", "#fff0a0"];
    cols.forEach((c, i) => this.rings.push({ x: s.x, y: s.y, r: 8, maxR: 60 + i * 26, life: 0.45 + i * 0.1, max: 0.45 + i * 0.1, color: c, width: 3 - i * 0.6 }));
    const n = this.reducedFx ? 8 : 20;
    for (let k = 0; k < n && this.sparks.length < 300; k++) {
      const a = (k / n) * TAU + Math.random() * 0.2;
      const v = 160 + Math.random() * 140;
      this.sparks.push({ x: s.x, y: s.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5 + Math.random() * 0.4, color: cols[k % 3] });
    }
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * TAU + this.rand() * 0.3;
      this.shots.push({ kind: "bolt", x: s.x, y: s.y, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, r: 4, dmg: s.dmg * 0.6, life: 0.5, pierce: 0, radius: 0, hit: null, dead: false, trail: [], seed: this.rand() * 10 });
    }
  }

  /** Movement and collisions for the talent / fusion projectiles. */
  private updateSpecialShot(s: Shot, dt: number) {
    s.trail.push(s.x, s.y);
    if (s.trail.length > 14) s.trail.splice(0, 2);
    s.life -= dt;
    if (s.kind === "missile" || s.kind === "phantom") {
      const near = this.collect(this.tmpB, s.x, s.y, 380);
      let best: Enemy | null = null;
      let bd = Infinity;
      for (const e of near) {
        if (s.hit && s.hit.has(e.id)) continue;
        const d2 = (e.x - s.x) ** 2 + (e.y - s.y) ** 2;
        if (d2 < bd) {
          bd = d2;
          best = e;
        }
      }
      if (best) {
        const sp = Math.hypot(s.vx, s.vy) || 1;
        const cur = Math.atan2(s.vy, s.vx);
        let diff = Math.atan2(best.y - s.y, best.x - s.x) - cur;
        while (diff > Math.PI) diff -= TAU;
        while (diff < -Math.PI) diff += TAU;
        const turn = clamp(diff, -7 * dt, 7 * dt);
        s.vx = Math.cos(cur + turn) * sp;
        s.vy = Math.sin(cur + turn) * sp;
      }
    }
    if (s.kind === "cyclone") {
      const a = Math.atan2(s.vy, s.vx) + Math.sin(this.time * 2 + s.seed) * dt * 1.5;
      const sp = Math.hypot(s.vx, s.vy);
      s.vx = Math.cos(a) * sp;
      s.vy = Math.sin(a) * sp;
    }
    s.x += s.vx * dt;
    s.y += s.vy * dt;

    if (s.kind === "cyclone") {
      if (s.fx === "void") {
        const pull = this.collect(this.tmpB, s.x, s.y, s.radius * 1.8);
        for (const e of pull) {
          if (e.type === "boss") continue;
          const dx = s.x - e.x;
          const dy = s.y - e.y;
          const d = Math.hypot(dx, dy) || 1;
          e.x += (dx / d) * 80 * dt;
          e.y += (dy / d) * 80 * dt;
        }
      }
      s.tick = (s.tick ?? 0) - dt;
      if (s.tick <= 0) {
        s.tick = 0.3;
        const list = this.collect(this.tmpA, s.x, s.y, s.radius);
        for (let i = 0; i < list.length; i++) this.hit(list[i], s.dmg, 0, 0, "#9be8d0", true);
      }
      if (s.life <= 0) s.dead = true;
      return;
    }
    if (s.kind === "firework") {
      s.tick = (s.tick ?? 0) - dt;
      if (s.tick <= 0 || s.life <= 0) {
        this.fireworkBurst(s);
        s.dead = true;
        return;
      }
    }
    if (s.kind === "heavy") s.tick = (s.tick ?? 0) - dt;
    const list = this.collect(this.tmpA, s.x, s.y, s.r);
    for (let j = 0; j < list.length; j++) {
      const e = list[j];
      if (e.dead || (s.hit && s.hit.has(e.id))) continue;
      const v = Math.hypot(s.vx, s.vy) || 1;
      if (s.kind === "missile") {
        this.hit(e, s.dmg, (s.vx / v) * 60, (s.vy / v) * 60, "#c9a8ff");
        if (s.fx === "missile") this.explode(s.x, s.y, 40, s.dmg * 0.6, "#c9a8ff");
        s.dead = true;
        break;
      }
      if (s.kind === "firework") {
        this.fireworkBurst(s);
        s.dead = true;
        break;
      }
      if (s.kind === "phantom") {
        this.hit(e, s.dmg, (s.vx / v) * 80, (s.vy / v) * 80, "#d6b8ff");
        s.hit?.add(e.id);
        s.bounce = (s.bounce ?? 0) - 1;
        if (s.bounce < 0) {
          s.dead = true;
          break;
        }
        // ricochet toward another nearby enemy
        const near = this.collect(this.tmpB, s.x, s.y, 260);
        let best: Enemy | null = null;
        let bd = Infinity;
        for (const o of near) {
          if (s.hit?.has(o.id)) continue;
          const d2 = (o.x - s.x) ** 2 + (o.y - s.y) ** 2;
          if (d2 < bd) {
            bd = d2;
            best = o;
          }
        }
        if (best) {
          const ang = Math.atan2(best.y - s.y, best.x - s.x);
          s.vx = Math.cos(ang) * v;
          s.vy = Math.sin(ang) * v;
        }
        break;
      }
      // heavy shot: pierces everything, shock wave on contact
      this.hit(e, s.dmg, (s.vx / v) * 260, (s.vy / v) * 260, "#ffe9b0");
      s.hit?.add(e.id);
      if ((s.tick ?? 0) <= 0) {
        s.tick = 0.12;
        this.explode(e.x, e.y, 60, s.dmg * 0.4, "#ffe9b0");
      }
    }
    if (!s.dead && s.life <= 0) s.dead = true;
  }

  /* ------------------------------------------------------------ fireball */

  /** How long a blast keeps enemies burning. Level 6 and up lasts longer. */
  private burnSeconds() {
    return (this.spells.get("fire")?.lvl ?? 1) >= 6 ? 5 : 3;
  }

  /**
   * Gentle homing: the fireball bends toward the enemy it was launched at, at a limited
   * rate. Only if that enemy has died does it sense the nearest enemy in range instead.
   */
  private steerFireball(s: Shot, dt: number) {
    let target: Enemy | null = s.target && !s.target.dead ? s.target : null;
    if (!target) {
      const list = this.collect(this.tmpB, s.x, s.y, FIRE_HOME_RANGE);
      let bestD2 = Infinity;
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (e.dead) continue;
        const d2 = (e.x - s.x) ** 2 + (e.y - s.y) ** 2;
        if (d2 < bestD2) {
          bestD2 = d2;
          target = e;
        }
      }
      s.target = target;
    }
    if (!target) return;
    const speed = Math.hypot(s.vx, s.vy) || 1;
    const heading = Math.atan2(s.vy, s.vx);
    let diff = Math.atan2(target.y - s.y, target.x - s.x) - heading;
    while (diff > Math.PI) diff -= TAU;
    while (diff < -Math.PI) diff += TAU;
    const turn = clamp(diff, -FIRE_TURN * dt, FIRE_TURN * dt);
    s.vx = Math.cos(heading + turn) * speed;
    s.vy = Math.sin(heading + turn) * speed;
  }

  private addFireParticle(x: number, y: number, vx: number, vy: number, life: number, smoke: boolean, size: number) {
    if (this.fireFx.length >= (this.reducedFx ? 60 : 180)) return;
    this.fireFx.push({ x, y, vx, vy, life, max: life, size, smoke });
  }

  /** A puff of sparks at the staff tip when the fireball leaves it. */
  private fireMuzzle(x: number, y: number, a: number) {
    const n = this.reducedFx ? 3 : 7;
    for (let i = 0; i < n; i++) {
      const sp = 60 + Math.random() * 120;
      const aa = a + (Math.random() - 0.5) * 0.9;
      this.addFireParticle(x, y, Math.cos(aa) * sp, Math.sin(aa) * sp, 0.3 + Math.random() * 0.25, false, 2 + Math.random() * 1.5);
    }
  }

  /** Embers and smoke left behind a flying fireball. Cosmetic only. */
  private emitFireTrail(s: Shot, dt: number) {
    s.tick = (s.tick ?? 0) - dt;
    if (s.tick > 0) return;
    s.tick += this.reducedFx ? 0.06 : 0.024;
    const speed = Math.hypot(s.vx, s.vy) || 1;
    const ux = s.vx / speed;
    const uy = s.vy / speed;
    const bx = s.x - ux * 8;
    const by = s.y - uy * 8;
    this.addFireParticle(
      bx + (Math.random() - 0.5) * 6,
      by,
      -ux * 14 + (Math.random() - 0.5) * 18,
      -uy * 14 - 26 - Math.random() * 18,
      0.42 + Math.random() * 0.25,
      false,
      2.2 + Math.random() * 1.6,
    );
    if (Math.random() < 0.45) {
      this.addFireParticle(bx, by, -ux * 6 + (Math.random() - 0.5) * 10, -18 - Math.random() * 10, 0.85 + Math.random() * 0.5, true, 4 + Math.random() * 3);
    }
  }

  /** Set an enemy alight. Re-igniting refreshes the burn; burns never stack. */
  private ignite(e: Enemy, dmg: number, seconds: number) {
    if (e.burnT <= 0) e.burnTick = BURN_TICK;
    e.burnT = Math.max(e.burnT, seconds);
    e.burnDmg = Math.max(e.burnDmg, dmg * BURN_FRACTION);
  }

  private updateBurns(dt: number) {
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e.dead || e.burnT <= 0) continue;
      e.burnT -= dt;
      e.burnTick -= dt;
      if (e.burnTick <= 0) {
        e.burnTick += BURN_TICK;
        this.hit(e, e.burnDmg, 0, 0, "#ff8a3c", true);
        if (!e.dead && Math.random() < 0.6) {
          this.addFireParticle(e.x + (Math.random() - 0.5) * e.r, e.y - e.r * 0.6, (Math.random() - 0.5) * 16, -30 - Math.random() * 20, 0.4 + Math.random() * 0.3, false, 2 + Math.random() * 1.5);
        }
      }
      if (e.burnT <= 0) e.burnT = 0;
    }
  }

  /** The impact: knockback, enemies set alight, a bloom of flame, smoke, embers and a lasting scorch. */
  private fireBlast(x: number, y: number, radius: number, dmg: number) {
    const burn = this.burnSeconds();
    const list = this.collect(this.tmpB, x, y, radius);
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      const dx = e.x - x;
      const dy = e.y - y;
      const d = Math.hypot(dx, dy) || 1;
      this.hit(e, dmg, (dx / d) * 170, (dy / d) * 170, "#ff8a3c");
      if (!e.dead) this.ignite(e, dmg, burn);
    }
    if (this.blooms.length >= 10) this.blooms.shift();
    this.blooms.push({ x, y, r: radius * 1.15, life: 0.42, max: 0.42 });
    if (this.scorches.length >= 14) this.scorches.shift();
    this.scorches.push({ x, y, r: radius * 0.95, life: 3.2, max: 3.2 });
    this.rings.push({ x, y, r: radius * 0.2, maxR: radius * 1.4, life: 0.26, max: 0.26, color: "#fff3d0", width: 4 });
    this.rings.push({ x, y, r: radius * 0.5, maxR: radius * 1.9, life: 0.5, max: 0.5, color: "#ff8a3c", width: 2.5 });
    const sparkCount = this.reducedFx ? 8 : 22;
    for (let i = 0; i < sparkCount && this.sparks.length < 300; i++) {
      const a = Math.random() * TAU;
      const v = 150 + Math.random() * 230;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 60,
        life: 0.4 + Math.random() * 0.5,
        color: Math.random() < 0.5 ? "#ffb066" : "#ff6b3c",
      });
    }
    const puffs = this.reducedFx ? 3 : 7;
    for (let i = 0; i < puffs; i++) {
      const a = Math.random() * TAU;
      const rr = Math.random() * radius * 0.6;
      this.addFireParticle(x + Math.cos(a) * rr, y + Math.sin(a) * rr, (Math.random() - 0.5) * 30, -20 - Math.random() * 30, 0.9 + Math.random() * 0.6, true, 7 + Math.random() * 5);
    }
    if (!this.reducedFx) this.shake = Math.min(1, this.shake + 0.18 + radius / 500);
    this.sfx("ignite");
  }

  private updateFireFx(dt: number) {
    for (const p of this.fireFx) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.smoke) {
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.size += dt * 9;
      } else {
        p.vx *= 0.92;
        p.vy = p.vy * 0.92 - 40 * dt; // embers keep rising
      }
    }
    if (this.fireFx.length) this.fireFx = this.fireFx.filter((p) => p.life > 0);
    for (const b of this.blooms) b.life -= dt;
    if (this.blooms.length) this.blooms = this.blooms.filter((b) => b.life > 0);
    for (const sc of this.scorches) sc.life -= dt;
    if (this.scorches.length) this.scorches = this.scorches.filter((sc) => sc.life > 0);
  }

  private updateShots(dt: number) {
    const shots = this.shots;
    let dead = false;
    for (let i = 0; i < shots.length; i++) {
      const s = shots[i];
      if (s.kind !== "bolt" && s.kind !== "fire" && s.kind !== "blade") {
        this.updateSpecialShot(s, dt);
        if (s.dead) dead = true;
        continue;
      }
      if (s.kind === "fire") {
        this.steerFireball(s, dt);
        this.emitFireTrail(s, dt);
      }
      s.trail.push(s.x, s.y);
      if (s.trail.length > 14) s.trail.splice(0, 2);
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      const list = this.collect(this.tmpA, s.x, s.y, s.r);
      for (let j = 0; j < list.length; j++) {
        const e = list[j];
        if (e.dead || (s.hit && s.hit.has(e.id))) continue;
        if (s.kind === "fire") {
          this.fireBlast(s.x, s.y, s.radius, s.dmg);
          s.dead = true;
          break;
        }
        const v = Math.hypot(s.vx, s.vy) || 1;
        if (s.kind === "bolt") {
          this.hit(e, s.dmg, (s.vx / v) * 70, (s.vy / v) * 70, C.bolt.color);
          this.impact(e.x, e.y, "#bffbf2", 0.6);
          if (s.fx === "firecracker") this.explode(s.x, s.y, 46, s.dmg * 0.6, "#ffb066");
          s.hit?.add(e.id);
          if (--s.pierce < 0) {
            s.dead = true;
            break;
          }
        } else {
          this.hit(e, s.dmg, (s.vx / v) * 60, (s.vy / v) * 60, C.blade.color);
          this.impact(e.x, e.y, "#d8fff6", 0.7);
          s.hit?.add(e.id);
        }
      }
      if (!s.dead && s.life <= 0) {
        if (s.kind === "fire") this.fireBlast(s.x, s.y, s.radius, s.dmg);
        s.dead = true;
      }
      if (s.dead) dead = true;
    }
    if (dead) this.shots = shots.filter((s) => !s.dead);
  }

  private updateDelayed(dt: number) {
    if (this.meteors.length) {
      let done = false;
      for (const m of this.meteors) {
        m.t -= dt;
        if (m.t <= 0) {
          this.explode(m.x, m.y, m.r, m.dmg, C.meteor.color);
          this.shake = Math.min(1, this.shake + 0.25);
          done = true;
        }
      }
      if (done) this.meteors = this.meteors.filter((m) => m.t > 0);
    }
    if (this.novas.length) {
      let done = false;
      for (const n of this.novas) {
        n.r += 460 * dt;
        const list = this.collect(this.tmpA, n.x, n.y, Math.min(n.r, n.maxR));
        for (let i = 0; i < list.length; i++) {
          const e = list[i];
          if (n.hit.has(e.id)) continue;
          n.hit.add(e.id);
          const dx = e.x - n.x;
          const dy = e.y - n.y;
          const d = Math.hypot(dx, dy) || 1;
          this.hit(e, n.dmg, (dx / d) * 300, (dy / d) * 300, C.nova.color);
        }
        if (n.r >= n.maxR) done = true;
      }
      if (done) this.novas = this.novas.filter((n) => n.r < n.maxR);
    }
  }

  private updateGems(dt: number) {
    const p = this.player;
    // rate of collection, smoothing over one second
    this.gemsTick += dt;
    if (this.gemsTick >= 1) {
      this.gemsTick -= 1;
      this.gemsPerSec = this.gemsTickCount;
      this.gemsTickCount = 0;
    }
    const m2 = this.magnet * this.magnet;
    let dead = false;
    let got = 0;
    for (let i = 0; i < this.gems.length; i++) {
      const g = this.gems[i];
      const dx = p.x - g.x;
      const dy = p.y - g.y;
      const d2 = dx * dx + dy * dy;
      if (!g.pull && d2 < m2) g.pull = true;
      if (g.pull) {
        g.sp = Math.min(760, g.sp + 1500 * dt);
        const d = Math.sqrt(d2) || 1;
        const step = g.sp * dt;
        if (d <= step + 14) {
          g.dead = true;
          dead = true;
          got += g.value;
          this.gemsTickCount++;
        } else {
          g.x += (dx / d) * step;
          g.y += (dy / d) * step;
        }
      }
    }
    if (dead) this.gems = this.gems.filter((g) => !g.dead);
    if (got > 0) {
      this.xp += got * this.xpMul * (this.phase === 2 ? 1.35 : 1);
      this.sfx("gem");
      while (this.xp >= this.xpNeed) {
        this.xp -= this.xpNeed;
        this.level++;
        this.telemetry.levels.push([+this.time.toFixed(1), this.level]);
        this.xpNeed = needFor(this.level);
        this.pending++;
        if (isSpecialLevel(this.level) && this.level <= 30) this.pendingBoon++;
        this.pillar = 1;
        this.rings.push({ x: p.x, y: p.y, r: 10, maxR: 160, life: 0.7, max: 0.7, color: "#3fd9c8", width: 4 });
        this.burst(p.x, p.y, "#3fd9c8", 16, 200);
      }
    }

    if (this.pickups.length) {
      let pdead = false;
      const reach = Math.max(30, this.magnet * 0.5);
      for (const k of this.pickups) {
        const dx = p.x - k.x;
        const dy = p.y - k.y;
        if (dx * dx + dy * dy < reach * reach) {
          k.dead = true;
          pdead = true;
          if (k.kind === "anar") {
            const amount = Math.round(15 * (1 + this.a.heal + this.orbHealBonus));
            const heal = Math.round(Math.min(amount, p.maxHp - p.hp));
            p.hp = Math.min(p.maxHp, p.hp + amount);
            this.addText(p.x, p.y - 34, "+" + fa(heal), "#8ff0a4", 16);
            this.burst(p.x, p.y, "#8ff0a4", 10, 140);
          } else {
            for (const g of this.gems) g.pull = true;
            this.burst(p.x, p.y, "#ffc857", 14, 200);
          }
          this.sfx("heal");
        }
      }
      if (pdead) this.pickups = this.pickups.filter((k) => !k.dead);
    }
  }

  /* ------------------------------------------------------- artifacts */

  private activeLabel(id: ActiveId) {
    for (const a of ARTIFACTS) if (a.mods.active?.id === id) return a.mods.active.label;
    return "";
  }

  /** A chest appears on its own timer, and from chieftains and the white div. */
  private spawnChests(dt: number) {
    this.nextChest -= dt;
    if (this.nextChest > 0 || this.chests.length >= 2) return;
    const min = this.clockMin();
    this.nextChest = this.mode === "stage" ? this.stage.chestEvery : Math.max(58, 86 - min * 3);
    const a = this.rand() * TAU;
    const r = 150 + this.rand() * 190;
    this.chests.push({ id: this.nextChestId++, x: this.player.x + Math.cos(a) * r, y: this.player.y + Math.sin(a) * r, seed: this.rand() * 10, dead: false });
    this.emit({ type: "banner", text: "صندوق گنجی پدیدار شد!", tone: "good" });
    this.sfx("chest");
  }

  private updateChests(dt: number) {
    this.spawnChests(dt);
    if (!this.chests.length) return;
    const p = this.player;
    let opened = false;
    for (const c of this.chests) {
      if (Math.random() < dt * 6) this.burst(c.x + (Math.random() - 0.5) * 22, c.y - 10, "#ffd98a", 1, 40);
      const dx = p.x - c.x;
      const dy = p.y - c.y;
      if (dx * dx + dy * dy < 32 * 32) {
        c.dead = true;
        opened = true;
        this.claimedChests.add(c.id);
        this.openChest(c.x, c.y);
      }
    }
    if (opened) this.chests = this.chests.filter((c) => !c.dead);
  }

  /** How many relics are held, and how many have never been found. */
  get relicCount() {
    return this.artifacts.length;
  }

  /** The three relics awaiting a choice, if a chest is open.
      The rarest offer is always last so the player reads left-to-right rarity. */
  relicOffers(): ArtifactId[] {
    return [...this.offers];
  }

  /** Open a chest: the player is offered three relics and keeps one. */
  private openChest(x: number, y: number) {
    const pool = ARTIFACTS.filter((a) => !this.artifacts.includes(a.id));
    this.flash = Math.max(this.flash, 0.45);
    this.shake = Math.min(1, this.shake + 0.35);
    this.rings.push({ x, y, r: 12, maxR: 150, life: 0.55, max: 0.55, color: "#ffd98a", width: 4 });
    this.burst(x, y, "#ffd98a", 18, 200);
    this.pillar = Math.max(this.pillar, 0.7);

    if (!pool.length) {
      // the vault is full: turn the chest into supplies instead
      for (let i = 0; i < 3; i++) {
        this.pickups.push({ id: this.nextPickupId++, kind: "anar", x: x + (i - 1) * 26, y: y + 12, seed: this.rand() * 10, dead: false });
      }
      this.ult = Math.min(100, this.ult + 40);
      this.emit({ type: "banner", text: "همه‌ی یادگارها را داری؛ انار و فرّ گرفتی!", tone: "good" });
      this.sfx("heal");
      return;
    }

    // later in the run the odds tilt toward the legendary pieces
    const tilt = Math.min(2.6, 0.5 + this.time / 260);
    const weight = (a: (typeof ARTIFACTS)[number]) =>
      RARITY[a.rarity].weight * tierTilt(a.rarity, tilt);
    const bag = [...pool];
    const picks: ArtifactId[] = [];
    while (picks.length < Math.min(3, pool.length) && bag.length) {
      let total = 0;
      for (const a of bag) total += weight(a);
      let roll = this.rand() * total;
      let idx = 0;
      for (let i = 0; i < bag.length; i++) {
        roll -= weight(bag[i]);
        if (roll <= 0) {
          idx = i;
          break;
        }
      }
      picks.push(bag.splice(idx, 1)[0].id);
    }

    this.offers = picks;
    this.offerAt = { x, y };
    this.sfx("chest");
    this.emit({ type: "relic" });
  }

  /** Claim one of the three offered relics; returns false if it is not on offer. */
  chooseRelic(id: ArtifactId): boolean {
    if (!this.offers.includes(id)) return false;
    this.offers = [];
    const at = this.offerAt ?? { x: this.player.x, y: this.player.y };
    this.offerAt = null;

    this.artifacts.push(id);
    this.recalc();
    this.slowmo = Math.max(this.slowmo, 0.8);
    this.flash = Math.max(this.flash, 0.6);
    this.shake = Math.min(1, this.shake + 0.5);
    this.pillar = 1;
    const art = BY_ID[id];
    const col = RARITY[art.rarity].color;
    for (let i = 0; i < 3; i++) {
      this.rings.push({ x: at.x, y: at.y, r: 10, maxR: 150 + i * 70, life: 0.6 + i * 0.14, max: 0.6 + i * 0.14, color: col, width: 5 - i });
    }
    this.burst(at.x, at.y, col, 26, 260);
    this.burst(this.player.x, this.player.y, "#ffd98a", 18, 210);
    this.addText(at.x, at.y - 34, art.name, col, 18);
    this.sfx("chest");
    this.emit({ type: "artifact", id });
    return true;
  }

  /** Timed artifacts fire on their own: scythe, clockwork and Pandora's box. */
  private updateActives(dt: number) {
    if (!this.activeCd.size) return;
    for (const [id, cd] of this.activeCd) {
      if (cd > 0) this.activeCd.set(id, Math.max(0, cd - dt));
      // «سپر نیرو» waits for a blow instead of firing
      else if (id !== "shield") {
        this.activeCd.set(id, this.activeTotal.get(id) ?? 5);
        this.fireActive(id);
      }
    }
  }

  private fireActive(id: ActiveId) {
    const p = this.player;
    if (id === "scythe") {
      const list = this.inRange(230);
      list.sort((a, b) => a.d2 - b.d2);
      let n = 0;
      for (const e of list) {
        if (e.dead || e.type === "boss" || e.elite) continue;
        if (++n > 3) break;
        e.hp = 0;
        this.burst(e.x, e.y, "#d8d2e8", 8, 150);
        this.kill(e);
      }
      if (n) {
        this.rings.push({ x: p.x, y: p.y, r: 20, maxR: 230, life: 0.4, max: 0.4, color: "#d8d2e8", width: 3 });
        this.sfx("kill");
      }
    } else if (id === "clockwork") {
      const list = this.collect(this.tmpA, p.x, p.y, 300);
      for (const e of list) {
        e.stun = Math.max(e.stun, e.type === "boss" ? 0.8 : 2);
        this.burst(e.x, e.y, "#f2c98a", 3, 60);
      }
      if (list.length) {
        this.rings.push({ x: p.x, y: p.y, r: 16, maxR: 300, life: 0.55, max: 0.55, color: "#f2c98a", width: 4 });
        this.addText(p.x, p.y - 46, "ایست!", "#f2c98a", 17);
        this.sfx("zap");
      }
    } else if (id === "pandora") {
      const list = this.inRange(430);
      if (!list.length) return;
      const pick = Math.floor(this.rand() * 3);
      if (pick === 0) {
        const n = this.pickRandom(list, 3);
        for (let i = 0; i < n; i++) this.meteors.push({ x: list[i].x, y: list[i].y, t: 0.5 + i * 0.1, delay: 0.5 + i * 0.1, r: 88, dmg: 55 });
      } else if (pick === 1) {
        this.novas.push({ x: p.x, y: p.y, r: 12, maxR: 260, dmg: 38, hit: new Set() });
      } else {
        const n = this.pickRandom(list, 3);
        for (let i = 0; i < n; i++) {
          const e = list[i];
          this.lightning(e.x + (this.rand() - 0.5) * 90, e.y - 440, e.x, e.y);
          this.hit(e, 46, 0, 0, "#fff3a0");
        }
      }
      this.sfx("boom");
    }
  }

  private updateFx(dt: number) {
    if (this.texts.length) {
      let dead = false;
      for (const t of this.texts) {
        t.life -= dt;
        t.y += t.vy * dt;
        t.scale = 1 + (1 - clamp(t.life / 0.7, 0, 1)) * 0.35;
        t.vy *= 0.92;
        if (t.life <= 0) dead = true;
      }
      if (dead) this.texts = this.texts.filter((t) => t.life > 0);
    }
    if (this.sparks.length) {
      let dead = false;
      for (const s of this.sparks) {
        s.life -= dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vx *= 0.92;
        s.vy *= 0.92;
        if (s.life <= 0) dead = true;
      }
      if (dead) this.sparks = this.sparks.filter((s) => s.life > 0);
    }
    if (this.beams.length) {
      for (const b of this.beams) b.life -= dt;
      this.beams = this.beams.filter((b) => b.life > 0);
    }
    // particle budget: drop the oldest rings first
    const ringCap = this.reducedFx ? 50 : 140;
    if (this.rings.length > ringCap) this.rings.splice(0, this.rings.length - ringCap);
    if (this.rings.length) {
      let dead = false;
      for (const b of this.rings) {
        b.life -= dt;
        if (b.life <= 0) dead = true;
      }
      if (dead) this.rings = this.rings.filter((b) => b.life > 0);
    }
    if (this.blasts.length) {
      for (const b of this.blasts) b.life -= dt;
      if (this.blasts[0].life <= 0) this.blasts = this.blasts.filter((b) => b.life > 0);
    }
    if (this.bolts.length) {
      for (const b of this.bolts) b.life -= dt;
      if (this.bolts[0].life <= 0) this.bolts = this.bolts.filter((b) => b.life > 0);
    }

    if (this.souls.length) {
      for (const s of this.souls) {
        s.life -= dt;
        s.y -= 46 * dt;
        s.x += s.vx * dt;
      }
      this.souls = this.souls.filter((s) => s.life > 0);
    }
    if (this.ghosts.length) {
      for (const g of this.ghosts) g.life -= dt;
      this.ghosts = this.ghosts.filter((g) => g.life > 0);
    }

    // ambient dust
    if (this.dust.length < 40) {
      for (let i = this.dust.length; i < 40; i++) {
        this.dust.push({
          x: Math.random() * this.viewW,
          y: Math.random() * this.viewH,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 4,
          life: 3 + Math.random() * 4,
          size: 0.5 + Math.random() * 1.2,
          seed: Math.random() * 100,
        });
      }
    }
    let ddead = false;
    for (const d of this.dust) {
      d.life -= dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      if (d.life <= 0) ddead = true;
    }
    if (ddead) this.dust = this.dust.filter((d) => d.life > 0);
  }

  /* ------------------------------------------------------------ rendering */

  private makePattern(ctx: CanvasRenderingContext2D) {
    const size = TILE * TILE_RES;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const g = c.getContext("2d");
    if (!g) return null;
    this.groundSize = TILE;
    g.scale(TILE_RES, TILE_RES);

    // Deterministic texture: the arena never flickers or changes between frames.
    let seed = 0x6d2b79f5;
    const rnd = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    // Midnight lapis stone.
    g.fillStyle = "#080f28";
    g.fillRect(0, 0, TILE, TILE);
    const slab = TILE / 4;
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const v = rnd();
        g.fillStyle = v > 0.5 ? "rgba(27,44,91,0.2)" : "rgba(6,14,39,0.2)";
        g.fillRect(x * slab + 1, y * slab + 1, slab - 2, slab - 2);
        // Bevelled stone edges: light from above, cool shadow below.
        g.strokeStyle = "rgba(100,137,193,0.055)";
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(x * slab + 2, y * slab + slab - 2);
        g.lineTo(x * slab + 2, y * slab + 2);
        g.lineTo(x * slab + slab - 2, y * slab + 2);
        g.stroke();
        g.strokeStyle = "rgba(0,0,0,0.16)";
        g.beginPath();
        g.moveTo(x * slab + slab - 2, y * slab + 2);
        g.lineTo(x * slab + slab - 2, y * slab + slab - 2);
        g.lineTo(x * slab + 2, y * slab + slab - 2);
        g.stroke();
      }
    }
    g.strokeStyle = "rgba(2,6,20,0.34)";
    g.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const q = i * slab + 0.5;
      g.beginPath();
      g.moveTo(q, 0);
      g.lineTo(q, TILE);
      g.moveTo(0, q);
      g.lineTo(TILE, q);
      g.stroke();
    }

    const h = TILE / 2;
    // A quiet pool of light in the centre of every tile.
    const glow = g.createRadialGradient(h, h, 0, h, h, h * 0.95);
    glow.addColorStop(0, "rgba(47,78,142,0.25)");
    glow.addColorStop(0.55, "rgba(24,46,99,0.13)");
    glow.addColorStop(1, "rgba(24,46,99,0)");
    g.fillStyle = glow;
    g.fillRect(0, 0, TILE, TILE);

    const star = (cx: number, cy: number, ro: number, ratio = 0.7654) => {
      const ri = ro * ratio;
      g.beginPath();
      for (let k = 0; k < 16; k++) {
        const a = (k * Math.PI) / 8;
        const r = k % 2 === 0 ? ro : ri;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (k === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.closePath();
    };

    // Eight-pointed Persian star, engraved rather than neon.
    star(h, h, h);
    g.fillStyle = "rgba(18,32,74,0.88)";
    g.fill();
    g.strokeStyle = "rgba(3,8,25,0.7)";
    g.lineWidth = 3;
    g.stroke();
    g.strokeStyle = "rgba(86,205,194,0.14)";
    g.lineWidth = 1.1;
    g.stroke();
    star(h, h, h * 0.74);
    g.strokeStyle = "rgba(63,217,200,0.065)";
    g.lineWidth = 1;
    g.stroke();
    star(h, h, h * 0.43);
    g.fillStyle = "rgba(8,16,43,0.5)";
    g.fill();
    g.strokeStyle = "rgba(242,184,75,0.12)";
    g.lineWidth = 1;
    g.stroke();
    star(h, h, h * 0.2, 0.52);
    g.strokeStyle = "rgba(242,184,75,0.1)";
    g.stroke();

    // Gold pins and tiny turquoise inlay marks around the star.
    for (let k = 0; k < 8; k++) {
      const a = (k * TAU) / 8;
      const x = h + Math.cos(a) * h * 0.58;
      const y = h + Math.sin(a) * h * 0.58;
      g.save();
      g.translate(x, y);
      g.rotate(a + Math.PI / 4);
      g.fillStyle = k % 2 ? "rgba(63,217,200,0.13)" : "rgba(242,184,75,0.15)";
      g.fillRect(-2.4, -2.4, 4.8, 4.8);
      g.restore();
    }
    g.fillStyle = "rgba(255,222,145,0.28)";
    g.beginPath();
    g.arc(h, h, 2, 0, TAU);
    g.fill();

    // Pointed crosses in the gaps, shared by adjacent tiles.
    for (const [cx, cy] of [
      [0, 0],
      [TILE, 0],
      [0, TILE],
      [TILE, TILE],
    ]) {
      g.save();
      g.translate(cx, cy);
      g.rotate(Math.PI / 4);
      g.fillStyle = "rgba(63,217,200,0.075)";
      g.fillRect(-10, -10, 20, 20);
      g.strokeStyle = "rgba(63,217,200,0.11)";
      g.lineWidth = 1;
      g.strokeRect(-10, -10, 20, 20);
      g.fillStyle = "rgba(242,184,75,0.1)";
      g.fillRect(-3, -3, 6, 6);
      g.restore();
    }

    // Hairline cracks and mineral speckles keep the floor from looking flat.
    g.lineWidth = 0.7;
    for (let i = 0; i < 14; i++) {
      let x = rnd() * TILE;
      let y = rnd() * TILE;
      g.strokeStyle = `rgba(1,5,18,${0.1 + rnd() * 0.08})`;
      g.beginPath();
      g.moveTo(x, y);
      for (let j = 0; j < 3; j++) {
        x += (rnd() - 0.5) * 20;
        y += rnd() * 13;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    for (let i = 0; i < 1300; i++) {
      const x = rnd() * TILE;
      const y = rnd() * TILE;
      const bright = rnd() > 0.46;
      g.fillStyle = bright ? "rgba(137,175,218,0.035)" : "rgba(0,0,0,0.075)";
      const s = 0.35 + rnd() * 0.75;
      g.fillRect(x, y, s, s);
    }
    for (let i = 0; i < 18; i++) {
      g.fillStyle = `rgba(63,217,200,${0.035 + rnd() * 0.05})`;
      g.beginPath();
      g.arc(rnd() * TILE, rnd() * TILE, 0.6 + rnd() * 0.8, 0, TAU);
      g.fill();
    }

    const pat = ctx.createPattern(c, "repeat");
    if (pat && typeof DOMMatrix !== "undefined") pat.setTransform(new DOMMatrix().scale(1 / TILE_RES));
    return pat;
  }

  render(ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number, joy: Joystick | null) {
    const p = this.player;
    const sc = this.scale;
    const vw = this.viewW;
    const vh = this.viewH;
    ctx.direction = "ltr";

    let sx = 0;
    let sy = 0;
    if (this.shake > 0 && !this.reducedMotion && !this.reducedFx) {
      sx = (Math.random() - 0.5) * this.shake * 10;
      sy = (Math.random() - 0.5) * this.shake * 10;
    }
    const camX = p.x - vw / 2 + sx;
    const camY = p.y - vh / 2 + sy;

    // ground
    ctx.setTransform(dpr * sc, 0, 0, dpr * sc, 0, 0);
    if (!this.pattern) this.pattern = this.makePattern(ctx);
    if (this.pattern) {
      const size = this.groundSize;
      const ox = ((camX % size) + size) % size;
      const oy = ((camY % size) + size) % size;
      ctx.save();
      ctx.translate(-ox, -oy);
      ctx.fillStyle = this.pattern;
      ctx.fillRect(0, 0, vw + size, vh + size);
      ctx.restore();
    } else {
      ctx.fillStyle = "#0b1332";
      ctx.fillRect(0, 0, vw, vh);
    }

    ctx.translate(-camX, -camY);
    const L = camX - 60;
    const R = camX + vw + 60;
    const T = camY - 60;
    const B = camY + vh + 60;
    const vis = (x: number, y: number) => x > L && x < R && y > T && y < B;
    const t = this.time;

    // ambient dust
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    for (const d of this.dust) {
      ctx.globalAlpha = (1 + Math.sin(d.life * 3 + t) * 0.5) * 0.4 * 0.5;
      ctx.fillRect(d.x + Math.cos(d.life + t) * 2, d.y, d.size, d.size);
    }
    ctx.globalAlpha = 1;

    // frost aura
    const frost = this.spells.get("frost");
    if (frost) {
      const fr = this.sr("frost", SPELLS.frost[frost.lvl - 1].radius);
      const grad = ctx.createRadialGradient(p.x, p.y, fr * 0.3, p.x, p.y, fr);
      grad.addColorStop(0, "rgba(160,225,255,0.02)");
      grad.addColorStop(1, "rgba(160,225,255,0.13)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, fr, 0, TAU);
      ctx.fill();
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(t * 0.4);
      ctx.setLineDash([10, 14]);
      ctx.strokeStyle = "rgba(190,235,255,0.45)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, fr, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    // flash rings (spawns, explosions, hits)
    for (const b of this.rings) {
      const k = 1 - b.life / b.max;
      ctx.globalAlpha = (1 - k) * 0.5;
      ctx.strokeStyle = b.color;
      ctx.lineWidth = b.width * (1 - k * 0.6);
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r + (b.maxR - b.r) * k, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // meteor markers
    for (const m of this.meteors) {
      const k = 1 - m.t / m.delay;
      ctx.strokeStyle = "rgba(255,138,92,0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,138,92,0.16)";
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r * k, 0, TAU);
      ctx.fill();
    }

    // scorch marks left by fireball impacts: on the ground, fading over three seconds
    for (const sc of this.scorches) {
      if (!vis(sc.x, sc.y)) continue;
      const fade = Math.min(1, sc.life / 1.2);
      const g = ctx.createRadialGradient(sc.x, sc.y, 0, sc.x, sc.y, sc.r);
      g.addColorStop(0, `rgba(12,4,4,${0.62 * fade})`);
      g.addColorStop(0.6, `rgba(30,10,6,${0.42 * fade})`);
      g.addColorStop(1, "rgba(30,10,6,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sc.x, sc.y, sc.r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = `rgba(255,120,50,${0.5 * fade})`;
      for (let k = 0; k < 4; k++) {
        const a = sc.x * 0.01 + k * 1.57;
        ctx.beginPath();
        ctx.arc(sc.x + Math.cos(a) * sc.r * 0.45, sc.y + Math.sin(a) * sc.r * 0.45, 1.3, 0, TAU);
        ctx.fill();
      }
    }

    // gems
    for (const g of this.gems) {
      if (!vis(g.x, g.y)) continue;
      const big = g.value >= 10;
      const mid = g.value >= 3;
      const s = big ? 7.5 : mid ? 5.5 : 4;
      const col = big ? "#ff6b78" : mid ? "#f2b84b" : "#3fd9c8";
      if (g.pull) {
        // a short streak behind gems rushing to the sorcerer
        const dx = g.x - p.x;
        const dy = g.y - p.y;
        const dl = Math.hypot(dx, dy) || 1;
        ctx.strokeStyle = col;
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = s * 0.8;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(g.x, g.y);
        ctx.lineTo(g.x + (dx / dl) * 16, g.y + (dy / dl) * 16);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      const bob = Math.sin(t * 4 + g.seed) * 1.2;
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.arc(g.x, g.y + bob, s * 1.9, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y - s + bob);
      ctx.lineTo(g.x + s * 0.72, g.y + bob);
      ctx.lineTo(g.x, g.y + s + bob);
      ctx.lineTo(g.x - s * 0.72, g.y + bob);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.moveTo(g.x, g.y - s + bob);
      ctx.lineTo(g.x + s * 0.72, g.y + bob);
      ctx.lineTo(g.x, g.y + bob);
      ctx.closePath();
      ctx.fill();
    }

    // pickups
    for (const k of this.pickups) {
      if (!vis(k.x, k.y)) continue;
      const bob = Math.sin(t * 3 + k.seed) * 2.5;
      const y = k.y + bob;
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(k.x, k.y + 12, 9, 3.2, 0, 0, TAU);
      ctx.fill();
      if (k.kind === "anar") {
        ctx.fillStyle = "rgba(226,61,79,0.25)";
        ctx.beginPath();
        ctx.arc(k.x, y, 17, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#e23d4f";
        ctx.beginPath();
        ctx.arc(k.x, y, 9, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(k.x - 4, y - 7);
        ctx.lineTo(k.x - 5, y - 13);
        ctx.lineTo(k.x - 1.5, y - 10.5);
        ctx.lineTo(k.x, y - 14);
        ctx.lineTo(k.x + 1.5, y - 10.5);
        ctx.lineTo(k.x + 5, y - 13);
        ctx.lineTo(k.x + 4, y - 7);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.beginPath();
        ctx.arc(k.x - 3, y - 3, 2.6, 0, TAU);
        ctx.fill();
      } else {
        ctx.fillStyle = "rgba(255,200,87,0.25)";
        ctx.beginPath();
        ctx.arc(k.x, y, 17, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#ffc857";
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU + Math.PI / 6;
          const px = k.x + Math.cos(a) * 9;
          const py = y + Math.sin(a) * 9;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.beginPath();
        ctx.arc(k.x - 2.5, y - 3, 2.4, 0, TAU);
        ctx.fill();
      }
    }

    // treasure chests
    for (const c of this.chests) {
      if (!vis(c.x, c.y)) continue;
      const bob = Math.sin(t * 2.4 + c.seed) * 2.5;
      const y = c.y + bob;
      const pulse = 0.55 + Math.sin(t * 3.4 + c.seed) * 0.45;
      // a column of light so it can be spotted across the field
      const beam = ctx.createLinearGradient(0, y - 210, 0, y + 8);
      beam.addColorStop(0, "rgba(255,217,138,0)");
      beam.addColorStop(1, `rgba(255,217,138,${0.16 + pulse * 0.12})`);
      ctx.fillStyle = beam;
      ctx.fillRect(c.x - 11, y - 210, 22, 218);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.ellipse(c.x, c.y + 15, 15, 5, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = `rgba(242,184,75,${0.18 + pulse * 0.14})`;
      ctx.beginPath();
      ctx.arc(c.x, y, 30 + pulse * 5, 0, TAU);
      ctx.fill();
      // body
      ctx.fillStyle = "#6b4423";
      ctx.strokeStyle = "#2a1a0d";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(c.x - 14, y - 6, 28, 18, 3);
      ctx.fill();
      ctx.stroke();
      // lid
      ctx.fillStyle = "#8a5a2b";
      ctx.beginPath();
      ctx.moveTo(c.x - 15, y - 6);
      ctx.quadraticCurveTo(c.x, y - 22, c.x + 15, y - 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // gilded bands and the star medallion
      ctx.fillStyle = "#f2b84b";
      ctx.fillRect(c.x - 15, y - 8, 30, 3);
      ctx.fillRect(c.x - 2.5, y - 16, 5, 28);
      ctx.beginPath();
      ctx.arc(c.x, y - 7.5, 3.4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#fff8e2";
      ctx.beginPath();
      ctx.arc(c.x, y - 7.5, 1.5, 0, TAU);
      ctx.fill();
    }

    // stage wave: a pulsing danger boundary and the boss's telegraphed attacks
    if (this.mode === "stage" && this.waveIdx >= 0) {
      const w = this.stage.waves[this.waveIdx];
      const c = this.waveCenter;
      const pulse = 0.5 + Math.sin(t * 4) * 0.5;
      ctx.save();
      ctx.beginPath();
      ctx.rect(L - 400, T - 400, R - L + 800, B - T + 800);
      ctx.arc(c.x, c.y, w.radius, 0, TAU, true);
      ctx.fillStyle = `rgba(110,8,22,${0.18 + pulse * 0.07})`;
      ctx.fill();
      ctx.setLineDash([16, 10]);
      ctx.lineDashOffset = -t * 30;
      ctx.strokeStyle = `rgba(255,80,96,${0.6 + pulse * 0.3})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(c.x, c.y, w.radius, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = "rgba(255,170,170,0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(c.x, c.y, w.radius - 8, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    for (const tg of this.telegraphs) {
      const k = clamp(1 - tg.t / tg.delay, 0, 1);
      ctx.save();
      if (tg.kind === "circle") {
        ctx.fillStyle = `rgba(255,59,78,${0.1 + k * 0.16})`;
        ctx.beginPath();
        ctx.arc(tg.x, tg.y, tg.r, 0, TAU);
        ctx.fill();
        ctx.fillStyle = `rgba(255,90,100,${0.25 + k * 0.25})`;
        ctx.beginPath();
        ctx.arc(tg.x, tg.y, tg.r * k, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,180,180,0.85)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(tg.x, tg.y, tg.r, 0, TAU);
        ctx.stroke();
      } else if (tg.kind === "line") {
        for (let i = 0; i < tg.count; i++) {
          const a = tg.angle + (tg.count > 1 ? (i / (tg.count - 1) - 0.5) * tg.spread : 0);
          ctx.strokeStyle = `rgba(255,70,90,${0.18 + k * 0.4})`;
          ctx.lineWidth = 6 + k * 6;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(tg.x, tg.y);
          ctx.lineTo(tg.x + Math.cos(a) * tg.r * k, tg.y + Math.sin(a) * tg.r * k);
          ctx.stroke();
        }
      } else {
        ctx.strokeStyle = `rgba(255,70,90,${0.3 + k * 0.5})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(tg.x, tg.y, tg.r + k * 50, 0, TAU);
        ctx.stroke();
        for (let i = 0; i < tg.count; i++) {
          const a = tg.angle + (i / tg.count) * TAU;
          ctx.beginPath();
          ctx.moveTo(tg.x + Math.cos(a) * tg.r, tg.y + Math.sin(a) * tg.r);
          ctx.lineTo(tg.x + Math.cos(a) * (tg.r + 40 * k), tg.y + Math.sin(a) * (tg.r + 40 * k));
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // enemies
    for (const e of this.enemies) {
      if (e.dead || !vis(e.x, e.y)) continue;
      this.drawEnemy(ctx, e);
    }

    // enemy fire: glowing black-red orbs with a comet tail
    for (const h of this.hazards) {
      if (!vis(h.x, h.y)) continue;
      const v = Math.hypot(h.vx, h.vy) || 1;
      const ux = h.vx / v;
      const uy = h.vy / v;
      const glow = ctx.createRadialGradient(h.x, h.y, 1, h.x, h.y, h.r * 3);
      glow.addColorStop(0, "rgba(255,107,120,0.55)");
      glow.addColorStop(1, "rgba(255,59,78,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r * 3, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,59,78,0.4)";
      ctx.lineWidth = h.r * 0.9;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(h.x - ux * h.r * 3.4, h.y - uy * h.r * 3.4);
      ctx.lineTo(h.x, h.y);
      ctx.stroke();
      ctx.fillStyle = "#2a0a16";
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "#ff8a94";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(h.x + Math.cos(t * 7 + h.seed) * h.r * 0.3, h.y + Math.sin(t * 7 + h.seed) * h.r * 0.3, h.r * 0.32, 0, TAU);
      ctx.fill();
    }

    // afterimages and the level-up pillar glow additively
    ctx.globalCompositeOperation = "lighter";
    for (const gh of this.ghosts) {
      const a = clamp(gh.life / 0.32, 0, 1);
      ctx.fillStyle = `rgba(63,217,200,${a * 0.22})`;
      ctx.beginPath();
      ctx.ellipse(gh.x, gh.y + 1, 10 * (0.7 + a * 0.3), 14 * (0.7 + a * 0.3), 0, 0, TAU);
      ctx.fill();
    }
    if (this.pillar > 0 && !this.over) {
      const pg = ctx.createLinearGradient(0, p.y - 300, 0, p.y + 14);
      pg.addColorStop(0, "rgba(63,217,200,0)");
      pg.addColorStop(0.7, `rgba(63,217,200,${this.pillar * 0.35})`);
      pg.addColorStop(1, `rgba(255,233,176,${this.pillar * 0.55})`);
      ctx.fillStyle = pg;
      const pw = 26 + (1 - this.pillar) * 30;
      ctx.fillRect(p.x - pw / 2, p.y - 300, pw, 314);
    }
    ctx.globalCompositeOperation = "source-over";

    // player, framed by the ultimate's aura when charged
    if (!this.over) {
      if (this.ult >= 100) {
        const pulse = 0.5 + Math.sin(t * 4) * 0.5;
        ctx.strokeStyle = `rgba(255,233,176,${0.35 + pulse * 0.35})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 10]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 30 + pulse * 4, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = `rgba(255,233,176,${0.05 + pulse * 0.05})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 34 + pulse * 5, 0, TAU);
        ctx.fill();
        // little motes circling
        for (let i = 0; i < 3; i++) {
          const a = t * 1.6 + (i / 3) * TAU;
          ctx.fillStyle = "#ffe9b0";
          ctx.beginPath();
          ctx.arc(p.x + Math.cos(a) * 36, p.y + Math.sin(a) * 36, 2, 0, TAU);
          ctx.fill();
        }
      }
      this.drawPlayer(ctx);
    }

    // everything luminous below is blended additively so overlaps bloom
    ctx.globalCompositeOperation = "lighter";

    this.drawMagicExtras(ctx, t);

    // orbs
    const orbs = this.spells.get("orbs");
    if (orbs && !this.over) {
      const o1 = SPELLS.orbs[orbs.lvl - 1];
      const s = { count: this.sc("orbs", o1.count), radius: this.sr("orbs", o1.radius) };
      if (this.talents.get("orbs") === "swiftorbit") s.count += 1;
      if (this.talents.get("orbs") === "antigrav") s.radius += 22;
      for (let i = 0; i < s.count; i++) {
        const a = this.orbAngle + (i / s.count) * TAU;
        const ox = p.x + Math.cos(a) * s.radius;
        const oy = p.y + Math.sin(a) * s.radius;
        // connecting chain between player and orb
        ctx.strokeStyle = "rgba(255,217,138,0.25)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(ox, oy);
        ctx.stroke();
        ctx.fillStyle = "rgba(255,217,138,0.22)";
        ctx.beginPath();
        ctx.arc(ox, oy, 15, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,217,138,0.35)";
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(p.x, p.y, s.radius, a - 0.42, a);
        ctx.stroke();
        ctx.fillStyle = "#ffd98a";
        ctx.beginPath();
        ctx.arc(ox, oy, 8, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#fff8e2";
        ctx.beginPath();
        ctx.arc(ox, oy, 4, 0, TAU);
        ctx.fill();
      }
    }

    // projectiles: layered cores, tapered trails and a little glow
    ctx.lineCap = "round";
    for (const s of this.shots) {
      if (!vis(s.x, s.y)) continue;
      if (s.kind !== "bolt" && s.kind !== "fire" && s.kind !== "blade") {
        this.drawSpecialShot(ctx, s, t);
        continue;
      }
      const v = Math.hypot(s.vx, s.vy) || 1;
      const ux = s.vx / v;
      const uy = s.vy / v;
      const trail = s.trail;
      const hot = s.kind === "fire" ? "255,138,92" : s.kind === "blade" ? "216,255,246" : "63,217,200";
      const fade = clamp(s.life / 0.3, 0, 1);

      // motion trail sampled from real positions
      if (trail.length >= 4) {
        const pts = trail.length;
        for (let i = 0; i < pts - 2; i += 2) {
          const k = i / (pts - 2);
          const a = (s.kind === "fire" ? 0.4 : 0.46) * k * fade;
          ctx.strokeStyle = `rgba(${hot},${a})`;
          ctx.lineWidth = (s.kind === "fire" ? 15 : s.kind === "blade" ? 9 : 7) * (0.18 + k * 0.82);
          ctx.beginPath();
          ctx.moveTo(trail[i], trail[i + 1]);
          ctx.lineTo(trail[i + 2], trail[i + 3]);
          ctx.stroke();
        }
      }

      if (s.kind === "bolt") {
        const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 18);
        g.addColorStop(0, `rgba(217,255,250,${0.5 * fade})`);
        g.addColorStop(0.45, `rgba(63,217,200,${0.3 * fade})`);
        g.addColorStop(1, "rgba(63,217,200,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 18, 0, TAU);
        ctx.fill();
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(Math.atan2(uy, ux));
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = "#d9fffa";
        ctx.beginPath();
        ctx.moveTo(11, 0);
        ctx.quadraticCurveTo(1, 4.4, -9, 0);
        ctx.quadraticCurveTo(1, -4.4, 11, 0);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(2, 0, 2.6, 0, TAU);
        ctx.fill();
        ctx.restore();
      } else if (s.kind === "fire") {
        this.drawFireball(ctx, s, t);
      } else {
        // wind blade: two nested crescents with a bright leading edge
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(Math.atan2(s.vy, s.vx));
        ctx.globalAlpha = clamp(s.life / 0.25, 0, 1) * 0.95;
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, s.r * 2);
        glow.addColorStop(0, "rgba(216,255,246,0.28)");
        glow.addColorStop(1, "rgba(216,255,246,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, s.r * 2, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#d8fff6";
        ctx.beginPath();
        ctx.arc(-s.r * 0.5, 0, s.r, -1.15, 1.15);
        ctx.arc(-s.r * 1.05, 0, s.r * 1.2, 0.86, -0.86, true);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(-s.r * 0.55, 0, s.r * 0.92, -0.95, 0.95);
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;

    // fire: embers, smoke and the blooms of past blasts (additive where they glow)
    ctx.save();
    for (const p of this.fireFx) {
      if (!vis(p.x, p.y)) continue;
      const k = clamp(p.life / p.max, 0, 1);
      if (p.smoke) {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = `rgba(40,26,28,${0.3 * k})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.15 - k * 0.35), 0, TAU);
      } else {
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = k > 0.55 ? `rgba(255,222,150,${k})` : `rgba(255,${80 + k * 180},50,${k})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.5 + k * 0.6), 0, TAU);
      }
      ctx.fill();
    }
    for (const b of this.blooms) {
      if (!vis(b.x, b.y)) continue;
      const k = 1 - b.life / b.max;
      const rr = b.r * (0.35 + 0.75 * k);
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, rr);
      g.addColorStop(0, `rgba(255,255,240,${0.95 * (1 - k)})`);
      g.addColorStop(0.3, `rgba(255,205,110,${0.85 * (1 - k)})`);
      g.addColorStop(0.65, `rgba(255,110,40,${0.5 * (1 - k)})`);
      g.addColorStop(1, "rgba(255,60,20,0)");
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(b.x, b.y, rr, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // falling meteors
    for (const m of this.meteors) {
      const k = clamp(m.t / m.delay, 0, 1);
      const mx = m.x + k * 240;
      const my = m.y - k * 560;
      ctx.strokeStyle = "rgba(255,138,92,0.5)";
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(mx + 34, my - 80);
      ctx.lineTo(mx, my);
      ctx.stroke();
      ctx.fillStyle = "#ff8a5c";
      ctx.beginPath();
      ctx.arc(mx, my, 10, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#ffe2a8";
      ctx.beginPath();
      ctx.arc(mx, my, 5, 0, TAU);
      ctx.fill();
    }

    // novas
    for (const n of this.novas) {
      const k = clamp(n.r / n.maxR, 0, 1);
      ctx.strokeStyle = `rgba(255,233,176,${0.85 * (1 - k * 0.7)})`;
      ctx.lineWidth = 7 * (1 - k * 0.5);
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = `rgba(255,233,176,${0.08 * (1 - k)})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, TAU);
      ctx.fill();
    }

    // blasts
    for (const b of this.blasts) {
      const k = 1 - b.life / b.max;
      ctx.globalAlpha = (1 - k) * 0.5;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * (0.5 + k * 0.5), 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * (0.55 + k * 0.45), 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // lightning
    ctx.lineJoin = "round";
    for (const b of this.bolts) {
      const a = clamp(b.life / 0.18, 0, 1);
      for (let pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = pass === 0 ? `rgba(255,243,160,${0.4 * a})` : `rgba(255,255,255,${a})`;
        ctx.lineWidth = pass === 0 ? 7 : 2;
        ctx.beginPath();
        ctx.moveTo(b.pts[0], b.pts[1]);
        for (let i = 2; i < b.pts.length; i += 2) ctx.lineTo(b.pts[i], b.pts[i + 1]);
        ctx.stroke();
      }
    }

    // soul wisps
    for (const s of this.souls) {
      const a = clamp(s.life / 0.9, 0, 1);
      ctx.globalAlpha = a * 0.8;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x + Math.sin(s.life * 9) * 2, s.y, 1.5 + a * 2.2, 0, TAU);
      ctx.fill();
    }
    // sparks
    for (const s of this.sparks) {
      const a = clamp(s.life / 0.3, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 1.2 + a * 1.6, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;

    // damage numbers
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(7,11,29,0.85)";
    for (const tx of this.texts) {
      if (!vis(tx.x, tx.y)) continue;
      ctx.globalAlpha = clamp(tx.life / 0.3, 0, 1);
      ctx.font = `800 ${tx.size * tx.scale}px Vazirmatn, Tahoma, sans-serif`;
      ctx.strokeText(tx.s, tx.x, tx.y);
      ctx.fillStyle = tx.color;
      ctx.fillText(tx.s, tx.x, tx.y);
    }
    ctx.globalAlpha = 1;

    // boss off-screen guide: a pulsing red arrow at the screen edge
    const boss = this.boss;
    if (boss && !boss.dead) {
      const bpx = boss.x - camX;
      const bpy = boss.y - camY;
      if (bpx < 0 || bpx > vw || bpy < 0 || bpy > vh) {
        const cx0 = vw / 2;
        const cy0 = vh / 2;
        const dx = bpx - cx0;
        const dy = bpy - cy0;
        const a = Math.atan2(dy, dx);
        const m = 46;
        const ix = clamp(cx0 + Math.cos(a) * Math.hypot(vw, vh), m, vw - m);
        const iy = clamp(cy0 + Math.sin(a) * Math.hypot(vw, vh), m, vh - m);
        const wx = camX + ix;
        const wy = camY + iy;
        const pulse = 0.6 + Math.sin(t * 5) * 0.4;
        ctx.save();
        ctx.translate(wx, wy);
        ctx.rotate(a);
        ctx.globalAlpha = 0.5 + pulse * 0.4;
        ctx.fillStyle = "rgba(226,61,79,0.28)";
        ctx.beginPath();
        ctx.arc(0, 0, 16 + pulse * 3, 0, TAU);
        ctx.fill();
        ctx.translate(6 + pulse * 2, 0);
        ctx.fillStyle = "#e23d4f";
        ctx.strokeStyle = "#ffd0d4";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(13, 0);
        ctx.lineTo(-9, -9);
        ctx.lineTo(-5, 0);
        ctx.lineTo(-9, 9);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.globalAlpha = 1;
      }
    }

    // treasure chests outside the view: a golden arrow points the way
    if (this.chests.length) {
      const cx0 = vw / 2;
      const cy0 = vh / 2;
      const m = 52;
      for (let ci = 0; ci < this.chests.length; ci++) {
        const c = this.chests[ci];
        const sx = c.x - camX;
        const sy = c.y - camY;
        if (sx >= 8 && sx <= vw - 8 && sy >= 8 && sy <= vh - 8) continue;
        const a = Math.atan2(sy - cy0, sx - cx0);
        // offset a little per chest so two arrows never sit on top of each other
        const aa = a + (ci % 2 === 0 ? 1 : -1) * 0.14 * Math.floor(ci / 2);
        const ix = clamp(cx0 + Math.cos(aa) * Math.hypot(vw, vh), m, vw - m);
        const iy = clamp(cy0 + Math.sin(aa) * Math.hypot(vw, vh), m, vh - m);
        const wx = camX + ix;
        const wy = camY + iy;
        const pulse = 0.5 + Math.sin(t * 4.2 + ci) * 0.5;
        ctx.save();
        ctx.translate(wx, wy);
        ctx.globalAlpha = 0.62 + pulse * 0.38;
        // halo
        ctx.fillStyle = "rgba(242,184,75,0.22)";
        ctx.beginPath();
        ctx.arc(0, 0, 20 + pulse * 4, 0, TAU);
        ctx.fill();
        ctx.rotate(aa + Math.PI);
        // arrow body pointing outward
        ctx.fillStyle = "#f2b84b";
        ctx.strokeStyle = "#fff4d6";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-6, -10);
        ctx.lineTo(-2, 0);
        ctx.lineTo(-6, 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.rotate(-(aa + Math.PI));
        // a tiny chest glyph in the centre of the halo
        ctx.fillStyle = "#6b4423";
        ctx.strokeStyle = "#ffd98a";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(-7, -4, 14, 10, 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#ffd98a";
        ctx.fillRect(-7, -1.2, 14, 2);
        ctx.beginPath();
        ctx.moveTo(-6, -4);
        ctx.quadraticCurveTo(0, -11, 6, -4);
        ctx.closePath();
        ctx.fill();
        if (this.chests.length > 1) {
          ctx.fillStyle = "#0b1230";
          ctx.beginPath();
          ctx.arc(12, -10, 6.5, 0, TAU);
          ctx.fill();
          ctx.fillStyle = "#f2b84b";
          ctx.font = "700 9px Vazirmatn, Tahoma, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(fa(ci + 1), 12, -9.5);
        }
        ctx.restore();
        ctx.globalAlpha = 1;
      }
    }

    // screen-space overlays
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cx = w / 2;
    const cy = h / 2;

    // slow motion: a cool, dreamlike wash
    if (this.slowmo > 0) {
      ctx.fillStyle = `rgba(150,190,255,${Math.min(0.14, this.slowmo * 0.18)})`;
      ctx.fillRect(0, 0, w, h);
    }

    // night-phase wash: the whole world takes on the current mood
    if (this.phase !== 0) {
      ctx.fillStyle = PHASES[this.phase].tint;
      ctx.fillRect(0, 0, w, h);
    }

    // ultimate flash
    if (this.flash > 0.01) {
      const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.75);
      fg.addColorStop(0, `rgba(255,244,214,${this.flash * 0.42})`);
      fg.addColorStop(0.55, `rgba(255,233,176,${this.flash * 0.2})`);
      fg.addColorStop(1, `rgba(255,217,138,${this.flash * 0.06})`);
      ctx.fillStyle = fg;
      ctx.fillRect(0, 0, w, h);
    }

    const vg = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.22, cx, cy, Math.max(w, h) * 0.72);
    vg.addColorStop(0, "rgba(4,6,18,0)");
    vg.addColorStop(1, "rgba(4,6,18,0.72)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);

    const low = p.hp / p.maxHp < 0.3 && !this.over ? 0.16 + Math.sin(t * 6) * 0.06 : 0;
    const red = Math.max(low, (p.hurt / 0.3) * 0.34);
    if (red > 0.01) {
      const rg = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.3, cx, cy, Math.max(w, h) * 0.7);
      rg.addColorStop(0, "rgba(226,61,79,0)");
      rg.addColorStop(1, `rgba(226,61,79,${red})`);
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
    }

    if (joy) {
      let dx = joy.x - joy.ox;
      let dy = joy.y - joy.oy;
      const d = Math.hypot(dx, dy);
      if (d > 52) {
        dx = (dx / d) * 52;
        dy = (dy / d) * 52;
      }
      ctx.strokeStyle = "rgba(244,236,216,0.28)";
      ctx.lineWidth = 2;
      ctx.fillStyle = "rgba(244,236,216,0.06)";
      ctx.beginPath();
      ctx.arc(joy.ox, joy.oy, 52, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(242,184,75,0.75)";
      ctx.beginPath();
      ctx.arc(joy.ox + dx, joy.oy + dy, 20, 0, TAU);
      ctx.fill();
    }
  }

  private drawSpecialShot(ctx: CanvasRenderingContext2D, s: Shot, t: number) {
    const col =
      s.kind === "missile" ? "201,168,255" : s.kind === "phantom" ? "214,184,255" : s.kind === "firework" ? "255,176,102" : s.kind === "heavy" ? "255,233,176" : "155,232,208";
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    if (s.kind === "cyclone") {
      const fade = clamp(s.life / 0.5, 0, 1);
      for (let k = 0; k < 4; k++) {
        const rr = s.radius * (0.35 + k * 0.22);
        const a0 = t * (6 - k) + s.seed + k;
        ctx.strokeStyle = `rgba(${col},${(0.5 - k * 0.09) * fade})`;
        ctx.lineWidth = 3 - k * 0.5;
        ctx.beginPath();
        ctx.arc(s.x, s.y - k * 4, rr, a0, a0 + 4.2);
        ctx.stroke();
      }
      if (s.fx === "void") {
        ctx.fillStyle = `rgba(40,10,70,${0.45 * fade})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius * 0.3, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      return;
    }
    const tr = s.trail;
    const speed = Math.hypot(s.vx, s.vy) || 1;
    const ux = s.vx / speed;
    const uy = s.vy / speed;
    const ang = Math.atan2(s.vy, s.vx);
    const lite = this.reducedFx;

    if (s.kind === "phantom") {
      // «چندپیکر»: a spectral figure with fading afterimages along its path
      const echoes = lite ? 2 : 4;
      for (let k = echoes; k >= 1; k--) {
        const i = tr.length - 2 - k * 3;
        if (i < 0) continue;
        this.drawPhantomBody(ctx, tr[i], tr[i + 1], ang, s.r, 0.16 * (1 - k / (echoes + 1)), t, s.seed + k);
      }
      this.drawPhantomBody(ctx, s.x, s.y, ang, s.r, 0.95, t, s.seed);
      ctx.restore();
      return;
    }

    if (s.kind === "firework") {
      // «آتش‌بازی»: a crackling rocket — bright head, sparkling tail
      for (let i = 0; i + 3 < tr.length; i += 2) {
        const k = i / tr.length;
        ctx.strokeStyle = `rgba(255,${150 + k * 80},${80 + k * 60},${0.55 * k})`;
        ctx.lineWidth = 1.5 + 4 * k;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(tr[i], tr[i + 1]);
        ctx.lineTo(tr[i + 2], tr[i + 3]);
        ctx.stroke();
      }
      const sparks = lite ? 3 : 7;
      for (let k = 0; k < sparks; k++) {
        const back = 6 + ((t * 90 + k * 17 + s.seed * 13) % 34);
        const side = Math.sin(t * 40 + k * 2.3 + s.seed) * 5;
        const fx = s.x - ux * back - uy * side;
        const fy = s.y - uy * back + ux * side;
        ctx.fillStyle = k % 3 === 0 ? "rgba(140,220,255,0.9)" : k % 3 === 1 ? "rgba(255,120,200,0.9)" : "rgba(255,240,160,0.95)";
        ctx.beginPath();
        ctx.arc(fx, fy, 1.4, 0, TAU);
        ctx.fill();
      }
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 16);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.35, "rgba(255,210,120,0.85)");
      g.addColorStop(1, "rgba(255,120,60,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 16, 0, TAU);
      ctx.fill();
      // little four-point twinkle on the head
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 1.2;
      const L = 7 + Math.sin(t * 30 + s.seed) * 2;
      ctx.beginPath();
      ctx.moveTo(s.x - L, s.y);
      ctx.lineTo(s.x + L, s.y);
      ctx.moveTo(s.x, s.y - L);
      ctx.lineTo(s.x, s.y + L);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (s.kind === "heavy") {
      // «شلیک سنگین»: a giant fletched arrow trailing shock ripples
      for (let i = 0; i + 3 < tr.length; i += 2) {
        const k = i / tr.length;
        ctx.strokeStyle = `rgba(255,220,140,${0.35 * k})`;
        ctx.lineWidth = 22 * k;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(tr[i], tr[i + 1]);
        ctx.lineTo(tr[i + 2], tr[i + 3]);
        ctx.stroke();
      }
      const ripples = lite ? 1 : 3;
      for (let k = 0; k < ripples; k++) {
        const ph = (t * 3 + k / ripples) % 1;
        const back = 18 + ph * 70;
        ctx.strokeStyle = `rgba(255,236,190,${0.45 * (1 - ph)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(s.x - ux * back, s.y - uy * back, 6 + ph * 10, 14 + ph * 26, ang, 0, TAU);
        ctx.stroke();
      }
      const halo = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 40);
      halo.addColorStop(0, "rgba(255,240,200,0.55)");
      halo.addColorStop(1, "rgba(255,190,90,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 40, 0, TAU);
      ctx.fill();
      ctx.translate(s.x, s.y);
      ctx.rotate(ang);
      ctx.globalCompositeOperation = "source-over";
      // shaft
      const shaft = ctx.createLinearGradient(-34, 0, 18, 0);
      shaft.addColorStop(0, "#9c6a24");
      shaft.addColorStop(1, "#ffe2a0");
      ctx.fillStyle = shaft;
      ctx.fillRect(-34, -2.6, 46, 5.2);
      // fletching
      ctx.fillStyle = "#3fd9c8";
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(-34, 0);
        ctx.lineTo(-24, side * 2.6);
        ctx.lineTo(-30, side * 10);
        ctx.lineTo(-40, side * 9);
        ctx.closePath();
        ctx.fill();
      }
      // head
      ctx.fillStyle = "#fff4d6";
      ctx.strokeStyle = "#c98a24";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(28, 0);
      ctx.lineTo(10, -10);
      ctx.lineTo(14, 0);
      ctx.lineTo(10, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      return;
    }

    // other special shots (spirit missiles): soft glowing orb with a trail
    for (let i = 0; i + 3 < tr.length; i += 2) {
      const k = i / tr.length;
      ctx.strokeStyle = `rgba(${col},${0.5 * k})`;
      ctx.lineWidth = 6 * k;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(tr[i], tr[i + 1]);
      ctx.lineTo(tr[i + 2], tr[i + 3]);
      ctx.stroke();
    }
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 2.6);
    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(0.35, `rgba(${col},0.75)`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r * 2.6, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  /** One spectral figure for «چندپیکر»: a hooded teardrop body with glowing eyes and a wisp tail. */
  private drawPhantomBody(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, r: number, alpha: number, t: number, seed: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    const R = r * 1.9;
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 2.4);
    glow.addColorStop(0, `rgba(214,184,255,${0.55 * alpha})`);
    glow.addColorStop(1, "rgba(214,184,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, R * 2.4, 0, TAU);
    ctx.fill();
    const wave = Math.sin(t * 16 + seed) * R * 0.25;
    ctx.fillStyle = `rgba(232,216,255,${0.8 * alpha})`;
    ctx.beginPath();
    ctx.moveTo(R, 0);
    ctx.quadraticCurveTo(R * 0.6, -R, -R * 0.4, -R * 0.75);
    ctx.quadraticCurveTo(-R * 1.6, -R * 0.4 + wave, -R * 2.5, wave);
    ctx.quadraticCurveTo(-R * 1.6, R * 0.4 + wave, -R * 0.4, R * 0.75);
    ctx.quadraticCurveTo(R * 0.6, R, R, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = `rgba(90,40,160,${0.9 * alpha})`;
    ctx.beginPath();
    ctx.arc(R * 0.35, -R * 0.28, R * 0.16, 0, TAU);
    ctx.arc(R * 0.35, R * 0.28, R * 0.16, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  private drawMagicExtras(ctx: CanvasRenderingContext2D, t: number) {
    const p = this.player;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const b of this.beams) {
      const k = b.life / b.max;
      ctx.strokeStyle = `rgba(255,227,110,${0.35 * k})`;
      ctx.lineWidth = b.w * 2.4 * k;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,240,${0.9 * k})`;
      ctx.lineWidth = Math.max(1.5, b.w * 0.5 * k);
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
    }
    for (let i = 0; i < this.spiritCount; i++) {
      const a = this.spiritAngle + (i / this.spiritCount) * TAU;
      const sx = p.x + Math.cos(a) * 30;
      const sy = p.y - 14 + Math.sin(a) * 14 + Math.sin(t * 4 + i) * 2;
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 11);
      g.addColorStop(0, "rgba(255,255,255,0.9)");
      g.addColorStop(0.4, "rgba(201,168,255,0.6)");
      g.addColorStop(1, "rgba(201,168,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sx, sy, 11, 0, TAU);
      ctx.fill();
    }
    const m = this.maelstrom;
    if (m) {
      // «گرداب»: a dark eye ringed by a violet horizon, with spiral arms and debris drawn inward
      const arms = this.reducedFx ? 3 : 5;
      for (let k = 0; k < arms; k++) {
        const base = -t * 2.4 + (k / arms) * TAU;
        ctx.strokeStyle = `rgba(155,232,208,${0.5 - k * 0.05})`;
        ctx.lineWidth = 3.2;
        ctx.lineCap = "round";
        ctx.beginPath();
        for (let j = 0; j <= 18; j++) {
          const f = j / 18;
          const rr = m.r * (1 - f * 0.78);
          const aa = base + f * 3.2;
          const x = m.x + Math.cos(aa) * rr;
          const y = m.y + Math.sin(aa) * rr * 0.85;
          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      const debris = this.reducedFx ? 6 : 14;
      for (let k = 0; k < debris; k++) {
        const f = ((t * 0.5 + k / debris) % 1);
        const rr = m.r * (1 - f) + 6;
        const aa = -t * (2 + f * 4) + k * 2.4;
        ctx.fillStyle = `rgba(200,255,240,${0.75 * (1 - f)})`;
        ctx.beginPath();
        ctx.arc(m.x + Math.cos(aa) * rr, m.y + Math.sin(aa) * rr * 0.85, 1.6 + (1 - f) * 1.6, 0, TAU);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      const eye = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 0.34);
      eye.addColorStop(0, "rgba(6,2,16,0.85)");
      eye.addColorStop(0.7, "rgba(40,12,80,0.6)");
      eye.addColorStop(1, "rgba(120,60,200,0)");
      ctx.fillStyle = eye;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r * 0.34, 0, TAU);
      ctx.fill();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(190,140,255,${0.55 + Math.sin(t * 6) * 0.15})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r * 0.24, 0, TAU);
      ctx.stroke();
    }
    if (this.shieldReady) {
      ctx.strokeStyle = `rgba(155,232,255,${0.35 + Math.sin(t * 3) * 0.12})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y - 6, 26, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** The fireball: heat haze, three flickering flame tongues, a white-hot core and orbiting sparks. */
  private drawFireball(ctx: CanvasRenderingContext2D, s: Shot, t: number) {
    const speed = Math.hypot(s.vx, s.vy) || 1;
    const ux = s.vx / speed;
    const uy = s.vy / speed;
    const px = -uy;
    const py = ux;
    const flicker = Math.sin(t * 34 + s.seed) * 0.5 + Math.sin(t * 23 + s.seed * 1.7) * 0.5;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    // the heat the fireball leaves behind
    const tr = s.trail;
    for (let i = 0; i + 3 < tr.length; i += 2) {
      const k = (i + 2) / tr.length;
      ctx.strokeStyle = `rgba(255,120,40,${0.3 * k})`;
      ctx.lineWidth = 3 + 11 * k;
      ctx.beginPath();
      ctx.moveTo(tr[i], tr[i + 1]);
      ctx.lineTo(tr[i + 2], tr[i + 3]);
      ctx.stroke();
    }
    // heat haze
    const haloR = 30 + flicker * 2;
    const halo = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, haloR);
    halo.addColorStop(0, "rgba(255,190,90,0.7)");
    halo.addColorStop(0.4, "rgba(255,110,40,0.35)");
    halo.addColorStop(1, "rgba(255,70,20,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(s.x, s.y, haloR, 0, TAU);
    ctx.fill();
    // three flame tongues streaming behind, the centre one longest
    for (let k = -1; k <= 1; k++) {
      const len = 22 + flicker * 4 + (k === 0 ? 6 : 0);
      const bend = k * 6 + Math.sin(t * 19 + s.seed + k) * 2.5;
      const w = 5 - Math.abs(k) * 1.5;
      const tipX = s.x - ux * len + px * bend;
      const tipY = s.y - uy * len + py * bend;
      const cx = s.x - ux * len * 0.55 + px * bend;
      const cy = s.y - uy * len * 0.55 + py * bend;
      ctx.fillStyle = k === 0 ? "rgba(255,205,120,0.8)" : "rgba(255,120,50,0.6)";
      ctx.beginPath();
      ctx.moveTo(s.x + px * w, s.y + py * w);
      ctx.quadraticCurveTo(cx + px * w * 0.6, cy + py * w * 0.6, tipX, tipY);
      ctx.quadraticCurveTo(cx - px * w * 0.6, cy - py * w * 0.6, s.x - px * w, s.y - py * w);
      ctx.closePath();
      ctx.fill();
    }
    // white-hot core
    const core = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 11);
    core.addColorStop(0, "rgba(255,255,255,1)");
    core.addColorStop(0.3, "rgba(255,236,170,0.95)");
    core.addColorStop(0.7, "rgba(255,130,40,0.6)");
    core.addColorStop(1, "rgba(255,80,20,0)");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 11, 0, TAU);
    ctx.fill();
    // hot specks circling the core
    ctx.fillStyle = "rgba(255,240,200,0.9)";
    for (let i = 0; i < 3; i++) {
      const a = t * 14 + s.seed + (i * TAU) / 3;
      ctx.beginPath();
      ctx.arc(s.x + Math.cos(a) * 7, s.y + Math.sin(a) * 4.2, 1.4, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    const p = this.player;
    const t = this.time;
    const pal = BY_HERO[this.hero].palette;
    const glow = pal.glow;
    // the sorcerer visibly grows with the run
    const tier = this.level >= 30 ? 3 : this.level >= 20 ? 2 : this.level >= 10 ? 1 : 0;
    const cast = this.castFx;
    const pulse = 0.5 + Math.sin(t * 3.2) * 0.5;

    // --- ground: shadow and a faint rune circle ------------------------
    ctx.save();
    ctx.translate(p.x, p.y);
    const sh = ctx.createRadialGradient(0, 15, 1, 0, 15, 20);
    sh.addColorStop(0, "rgba(0,0,0,0.5)");
    sh.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.ellipse(0, 15, 19, 7, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = `rgba(${glow},${0.16 + pulse * 0.1 + cast * 0.25})`;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.ellipse(0, 15, 20 + cast * 4, 6.5 + cast * 1.4, 0, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([2, 5]);
    ctx.beginPath();
    ctx.ellipse(0, 15, 15, 4.8, 0, t * 0.6, t * 0.6 + TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // --- aura and orbiting motes (additive) ---------------------------
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const ar = 46 + tier * 6 + cast * 8;
    const aura = ctx.createRadialGradient(p.x, p.y - 6, 2, p.x, p.y - 6, ar);
    aura.addColorStop(0, `rgba(${glow},${0.11 + pulse * 0.06 + tier * 0.02})`);
    aura.addColorStop(0.5, `rgba(${glow},${0.05 + pulse * 0.03})`);
    aura.addColorStop(1, `rgba(${glow},0)`);
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(p.x, p.y - 6, ar, 0, TAU);
    ctx.fill();
    const motes = 3 + tier;
    for (let i = 0; i < motes; i++) {
      const a = t * 1.5 + (i / motes) * TAU;
      const rr = 26 + Math.sin(t * 2 + i) * 3 + tier * 2;
      ctx.fillStyle = `rgba(${glow},${0.4 + pulse * 0.35})`;
      ctx.beginPath();
      ctx.arc(p.x + Math.cos(a) * rr, p.y - 8 + Math.sin(a) * rr * 0.55, 1.5 + (i % 2) * 0.5, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    const bob = p.moving ? Math.sin(p.walk * 14) * 1.8 : Math.sin(t * 2.4) * 0.9;
    const breathe = p.moving ? 1 : 1 + Math.sin(t * 2.4) * 0.018;

    ctx.save();
    ctx.translate(p.x, p.y + bob);
    ctx.scale(p.face, 1);
    if (p.moving) ctx.rotate(0.06);
    ctx.scale(1, breathe);
    if (p.hurt > 0 && Math.floor(t * 28) % 2 === 0) ctx.globalAlpha = 0.55;

    const fl = Math.sin(t * 3.1) * 1.3 + (p.moving ? Math.sin(p.walk * 14) * 1.2 : 0);
    const fl2 = Math.sin(t * 3.1 + 0.9) * 1.1;
    const capeLen = 16 + tier * 2.5 + (p.moving ? 2 : 0);

    // --- halo (level 20+) ----------------------------------------------
    if (tier >= 2) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = `rgba(${glow},${0.55 + pulse * 0.3})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(-2.5, -37, 8.5, 2.6, -0.12, 0, TAU);
      ctx.stroke();
      const pts = tier >= 3 ? 5 : 3;
      for (let i = 0; i < pts; i++) {
        const a = t * 2 + (i / pts) * TAU;
        ctx.fillStyle = "#fffbe8";
        ctx.beginPath();
        ctx.arc(-2.5 + Math.cos(a) * 8.5, -37 + Math.sin(a) * 2.6, 1.05, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    // --- cape behind the body ------------------------------------------
    ctx.fillStyle = pal.cape;
    ctx.beginPath();
    ctx.moveTo(-2, -10);
    ctx.quadraticCurveTo(-16 - fl2 * 1.6 - (p.moving ? 3 : 0), -2, -15 + fl * 1.1 - (p.moving ? 4 : 0), capeLen);
    ctx.quadraticCurveTo(-8, capeLen - 4, -5 + fl * 0.5, capeLen - 2);
    ctx.quadraticCurveTo(-6, 0, -2, -10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = pal.trim;
    ctx.globalAlpha *= 0.5;
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.globalAlpha /= 0.5;
    if (tier >= 1) {
      // embroidered stars on the cape (level 10+)
      ctx.fillStyle = pal.trim;
      for (const [sx, sy] of [
        [-10, 2],
        [-12, 9],
        [-8.5, 11],
      ]) {
        ctx.save();
        ctx.translate(sx + fl * 0.3, sy);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-0.9, -0.9, 1.8, 1.8);
        ctx.restore();
      }
    }

    // --- robe ----------------------------------------------------------
    const rg = ctx.createLinearGradient(-12, -12, 12, 15);
    rg.addColorStop(0, pal.robe[0]);
    rg.addColorStop(0.55, pal.robe[1]);
    rg.addColorStop(1, pal.robe[2]);
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.quadraticCurveTo(-12 - fl, -2, -11.5 + fl * 0.6, 13.5);
    ctx.quadraticCurveTo(0, 17.5, 11.5 - fl * 0.6, 13.5);
    ctx.quadraticCurveTo(12 + fl, -2, 0, -11);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = pal.robeShade;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.quadraticCurveTo(-12 - fl, -2, -11.5 + fl * 0.6, 13.5);
    ctx.quadraticCurveTo(-5, 15.5, -3, 13.5);
    ctx.quadraticCurveTo(-7, 0, 0, -11);
    ctx.closePath();
    ctx.fill();
    // front opening of the robe
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(1.5, -5);
    ctx.quadraticCurveTo(2.6, 5, 1.8, 15);
    ctx.stroke();
    // feet peeking out while walking
    if (p.moving) {
      const step = Math.sin(p.walk * 14);
      ctx.fillStyle = "#2a1c14";
      ctx.beginPath();
      ctx.ellipse(-3 + step * 2.4, 16, 2.6, 1.4, 0, 0, TAU);
      ctx.ellipse(4 - step * 2.4, 16, 2.6, 1.4, 0, 0, TAU);
      ctx.fill();
    }
    // hem
    ctx.strokeStyle = pal.trim;
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(-11.4, 12.6);
    ctx.quadraticCurveTo(0, 16.6, 11.4, 12.6);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,240,200,0.45)";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(-10.6, 10.8);
    ctx.quadraticCurveTo(0, 14.6, 10.6, 10.8);
    ctx.stroke();
    // sash with a gem buckle
    ctx.fillStyle = pal.trim;
    ctx.beginPath();
    ctx.moveTo(-8.2, 1.5);
    ctx.lineTo(8.4, 3.6);
    ctx.lineTo(8.2, 6.1);
    ctx.lineTo(-8.4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = `rgb(${glow})`;
    ctx.save();
    ctx.translate(1.8, 3.8);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-1.5, -1.5, 3, 3);
    ctx.restore();
    // glowing runes
    ctx.fillStyle = `rgba(${glow},${0.5 + pulse * 0.4 + cast * 0.3})`;
    for (let i = 0; i < 3 + tier; i++) {
      ctx.save();
      ctx.translate(-3.2 + i * 0.45, -6 + i * 3.6);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-0.95, -0.95, 1.9, 1.9);
      ctx.restore();
    }

    // --- staff: tilts up and flares when a spell is cast ---------------
    // held out to the side so the crystal never hides behind the hat; it swings forward on cast
    const staffAngle = 0.1 + Math.sin(t * 2.2) * 0.04 + cast * 0.25;
    ctx.save();
    ctx.translate(11.5, 8 - cast * 3);
    ctx.rotate(staffAngle);
    const stg = ctx.createLinearGradient(-1, 0, 2, -26);
    stg.addColorStop(0, "#5a3d1c");
    stg.addColorStop(0.5, "#a5794a");
    stg.addColorStop(1, "#d8ae72");
    ctx.strokeStyle = stg;
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(1.4, -23);
    ctx.stroke();
    ctx.strokeStyle = pal.trim;
    ctx.lineWidth = 2.7;
    ctx.beginPath();
    ctx.moveTo(0.1, 5);
    ctx.lineTo(0.35, 1.5);
    ctx.moveTo(0.95, -8);
    ctx.lineTo(1.05, -10);
    ctx.stroke();
    // the hand gripping the staff
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.arc(0.5, -1, 1.9, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath();
    ctx.arc(0.1, -0.6, 1.2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = pal.trim;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(1.5, -25.5, 3.8, Math.PI * 0.12, Math.PI * 0.88, false);
    ctx.stroke();
    const cr = 11 + pulse * 3 + cast * 9;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const cg = ctx.createRadialGradient(1.5, -26, 0, 1.5, -26, cr);
    cg.addColorStop(0, "rgba(255,255,255,0.95)");
    cg.addColorStop(0.25, `rgba(${glow},0.8)`);
    cg.addColorStop(0.6, `rgba(${glow},0.32)`);
    cg.addColorStop(1, `rgba(${glow},0)`);
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(1.5, -26, cr, 0, TAU);
    ctx.fill();
    if (cast > 0.4) {
      // four-pointed cast spark
      ctx.strokeStyle = `rgba(255,255,255,${cast * 0.8})`;
      ctx.lineWidth = 1.1;
      const L = 6 + cast * 7;
      ctx.beginPath();
      ctx.moveTo(1.5 - L, -26);
      ctx.lineTo(1.5 + L, -26);
      ctx.moveTo(1.5, -26 - L);
      ctx.lineTo(1.5, -26 + L);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = pal.crystal;
    ctx.save();
    ctx.translate(1.5, -26);
    ctx.rotate(Math.PI / 4 + t * 0.8);
    ctx.fillRect(-2.4, -2.4, 4.8, 4.8);
    ctx.restore();
    ctx.restore();

    // --- head ----------------------------------------------------------
    ctx.fillStyle = pal.skin;
    ctx.beginPath();
    ctx.arc(0.4, -11.8, 5.2, 0, TAU);
    ctx.fill();
    // soft shading on the far side of the face, kept inside the head
    ctx.save();
    ctx.beginPath();
    ctx.arc(0.4, -11.8, 5.2, 0, TAU);
    ctx.clip();
    ctx.fillStyle = "rgba(120,70,40,0.22)";
    ctx.beginPath();
    ctx.arc(-1.6, -11.4, 4.4, 0, TAU);
    ctx.fill();
    ctx.restore();
    // beard and moustache
    ctx.fillStyle = pal.beard;
    ctx.beginPath();
    ctx.moveTo(-4.2, -10.6);
    ctx.quadraticCurveTo(0.6, 5.5 + (p.moving ? Math.sin(p.walk * 14) * 0.6 : 0), 5.2, -10.6);
    ctx.quadraticCurveTo(0.6, -6.6, -4.2, -10.6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-1.4, -7.4);
    ctx.quadraticCurveTo(0.6, 1.6, 2.6, -7.4);
    ctx.stroke();
    ctx.fillStyle = pal.beard;
    ctx.beginPath();
    ctx.moveTo(-3.1, -9.9);
    ctx.quadraticCurveTo(0.6, -8.2, 4.3, -9.9);
    ctx.quadraticCurveTo(0.6, -7.7, -3.1, -9.9);
    ctx.closePath();
    ctx.fill();
    // eyes: blink every few seconds, glow at level 30
    const blink = Math.sin(t * 1.3) > 0.985;
    if (tier >= 3) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(${glow},0.55)`;
      ctx.beginPath();
      ctx.arc(1.5, -12.6, 2.4, 0, TAU);
      ctx.arc(4.1, -12.6, 2.4, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = tier >= 3 ? "#ffffff" : "#1a1230";
    if (blink) {
      ctx.fillRect(0.6, -12.8, 1.8, 0.5);
      ctx.fillRect(3.2, -12.8, 1.8, 0.5);
    } else {
      ctx.beginPath();
      ctx.arc(1.5, -12.6, 0.95, 0, TAU);
      ctx.arc(4.1, -12.6, 0.95, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.beginPath();
      ctx.arc(1.8, -12.9, 0.32, 0, TAU);
      ctx.arc(4.4, -12.9, 0.32, 0, TAU);
      ctx.fill();
    }
    // brows
    ctx.strokeStyle = pal.beard;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0.4, -14.2);
    ctx.lineTo(2.4, -14);
    ctx.moveTo(3.2, -14);
    ctx.lineTo(5.1, -14.3);
    ctx.stroke();
    ctx.fillStyle = "rgba(170,110,70,0.65)";
    ctx.beginPath();
    ctx.moveTo(3.1, -12.2);
    ctx.lineTo(4.5, -10.4);
    ctx.lineTo(2.4, -10.6);
    ctx.closePath();
    ctx.fill();

    // --- pointed hat with a drooping, swaying tip ----------------------
    const tip = Math.sin(t * 2.6) * 1.2 + (p.moving ? -2.2 : 0);
    const hg = ctx.createLinearGradient(-9, -14, 8, -32);
    hg.addColorStop(0, pal.hat[0]);
    hg.addColorStop(0.6, pal.hat[1]);
    hg.addColorStop(1, pal.hat[2]);
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.moveTo(-10, -14.2);
    ctx.quadraticCurveTo(1.5, -16.5, 10.6, -14.2);
    ctx.quadraticCurveTo(6, -23, -3.2 + tip, -33.5);
    ctx.quadraticCurveTo(-6.5 + tip, -32, -7.5 + tip * 0.6, -29.2);
    ctx.quadraticCurveTo(-4.4, -22, -10, -14.2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = pal.brim;
    ctx.beginPath();
    ctx.ellipse(0.3, -14.4, 10.8, 2.6, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = pal.trim;
    ctx.fillRect(-9.4, -17.3, 19.4, 2.5);
    ctx.fillStyle = `rgb(${glow})`;
    ctx.save();
    ctx.translate(2.4, -16.05);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-1.3, -1.3, 2.6, 2.6);
    ctx.restore();
    // stars stitched on the cone
    ctx.fillStyle = pal.trim;
    for (const [hx, hy] of [
      [-2.5, -21.5],
      [1.6, -25],
      [-4.4, -27.2],
    ]) {
      ctx.save();
      ctx.translate(hx + tip * 0.3, hy);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-0.7, -0.7, 1.4, 1.4);
      ctx.restore();
    }
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.moveTo(-2.2, -19);
    ctx.quadraticCurveTo(-4.6, -25, -3.6 + tip * 0.5, -31);
    ctx.quadraticCurveTo(-2.4, -25, -0.6, -19);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // --- health bar ----------------------------------------------------
    const ratio = clamp(p.hp / p.maxHp, 0, 1);
    const bw = 34;
    ctx.fillStyle = "rgba(7,11,29,0.82)";
    ctx.fillRect(p.x - bw / 2 - 1, p.y + 21, bw + 2, 5.5);
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(p.x - bw / 2, p.y + 22, bw, 3.5);
    ctx.fillStyle = ratio < 0.3 ? "#e23d4f" : ratio < 0.6 ? "#ffb054" : "#5ef0a0";
    ctx.fillRect(p.x - bw / 2, p.y + 22, bw * ratio, 3.5);
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(p.x - bw / 2, p.y + 22, bw * ratio, 1.1);
  }

  private drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy) {
    const t = this.time;
    const r = e.r;
    const col = ECOL[e.type];
    const body = e.flash > 0 ? "#ffffff" : col.body;
    const age = t - e.born;
    const spawnAlpha = Math.min(1, age * 4);
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.globalAlpha = spawnAlpha;
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(0, r * 0.95, r * 0.85, r * 0.32, 0, 0, TAU);
    ctx.fill();

    if (e.elite) {
      // gilded chieftain: pulsing golden halo and a small crown
      const pulse = 0.5 + Math.sin(t * 5 + e.seed) * 0.5;
      ctx.fillStyle = `rgba(242,184,75,${0.14 + pulse * 0.12})`;
      ctx.beginPath();
      ctx.arc(0, 0, r * (1.45 + pulse * 0.15), 0, TAU);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,217,138,${0.5 + pulse * 0.4})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.25, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = "#f2b84b";
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, -r * 1.25);
      ctx.lineTo(-r * 0.45, -r * 1.65);
      ctx.lineTo(-r * 0.15, -r * 1.42);
      ctx.lineTo(0, -r * 1.75);
      ctx.lineTo(r * 0.15, -r * 1.42);
      ctx.lineTo(r * 0.45, -r * 1.65);
      ctx.lineTo(r * 0.4, -r * 1.25);
      ctx.closePath();
      ctx.fill();
    }

    if (e.type === "boss") {
      ctx.fillStyle = `rgba(255,59,78,${0.12 + Math.sin(t * 4) * 0.05})`;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.5, 0, TAU);
      ctx.fill();
    }

    ctx.translate(0, Math.sin(t * 6 + e.seed) * r * 0.07);
    if (this.player.x < e.x) ctx.scale(-1, 1);
    ctx.fillStyle = body;
    ctx.strokeStyle = col.edge;
    ctx.lineWidth = 1.5;

    switch (e.type) {
      case "shade": {
        ctx.beginPath();
        ctx.arc(0, -r * 0.1, r, Math.PI, 0);
        ctx.lineTo(r, r * 0.7);
        ctx.quadraticCurveTo(r * 0.66, r * 1.1, r * 0.33, r * 0.7);
        ctx.quadraticCurveTo(0, r * 1.1, -r * 0.33, r * 0.7);
        ctx.quadraticCurveTo(-r * 0.66, r * 1.1, -r, r * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = col.eye;
        ctx.beginPath();
        ctx.arc(r * 0.1, -r * 0.2, r * 0.17, 0, TAU);
        ctx.arc(r * 0.58, -r * 0.2, r * 0.17, 0, TAU);
        ctx.fill();
        break;
      }
      case "bat": {
        const flap = Math.sin(t * 20 + e.seed);
        for (const side of [1, -1]) {
          ctx.beginPath();
          ctx.moveTo(side * r * 0.3, -r * 0.1);
          ctx.lineTo(side * r * 1.9, -r * 0.3 - flap * r * 0.8);
          ctx.lineTo(side * r * 1.35, r * 0.25);
          ctx.lineTo(side * r * 0.85, r * 0.1 - flap * r * 0.15);
          ctx.lineTo(side * r * 0.4, r * 0.5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.72, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-r * 0.5, -r * 0.5);
        ctx.lineTo(-r * 0.35, -r * 1.15);
        ctx.lineTo(-r * 0.05, -r * 0.65);
        ctx.moveTo(r * 0.5, -r * 0.5);
        ctx.lineTo(r * 0.35, -r * 1.15);
        ctx.lineTo(r * 0.05, -r * 0.65);
        ctx.fill();
        ctx.fillStyle = col.eye;
        ctx.beginPath();
        ctx.arc(r * 0.05, -r * 0.05, r * 0.16, 0, TAU);
        ctx.arc(r * 0.42, -r * 0.05, r * 0.16, 0, TAU);
        ctx.fill();
        break;
      }
      case "ghoul": {
        ctx.beginPath();
        ctx.moveTo(-r * 0.55, -r * 0.75);
        ctx.lineTo(-r * 0.75, -r * 1.25);
        ctx.lineTo(-r * 0.2, -r * 0.9);
        ctx.moveTo(r * 0.55, -r * 0.75);
        ctx.lineTo(r * 0.75, -r * 1.25);
        ctx.lineTo(r * 0.2, -r * 0.9);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.95, 0, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = col.eye;
        ctx.fillRect(r * 0.0, -r * 0.32, r * 0.3, r * 0.14);
        ctx.fillRect(r * 0.5, -r * 0.32, r * 0.3, r * 0.14);
        ctx.strokeStyle = col.edge;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-r * 0.05, r * 0.28);
        ctx.lineTo(r * 0.75, r * 0.28);
        ctx.stroke();
        break;
      }
      default: {
        const horn = e.flash > 0 ? "#ffffff" : e.type === "boss" ? "#c9973a" : "#f1e2c2";
        ctx.fillStyle = horn;
        for (const side of [1, -1]) {
          ctx.beginPath();
          ctx.moveTo(side * r * 0.35, -r * 0.8);
          ctx.quadraticCurveTo(side * r * 1.25, -r * 1.0, side * r * 0.95, -r * 1.7);
          ctx.quadraticCurveTo(side * r * 0.8, -r * 1.1, side * r * 0.7, -r * 0.6);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.ellipse(0, 0, r, r * 0.98, 0, 0, TAU);
        ctx.fill();
        ctx.stroke();
        if (e.type === "boss" && e.flash <= 0) {
          ctx.fillStyle = "rgba(125,116,96,0.35)";
          ctx.beginPath();
          ctx.arc(-r * 0.45, r * 0.3, r * 0.16, 0, TAU);
          ctx.arc(-r * 0.2, -r * 0.5, r * 0.1, 0, TAU);
          ctx.arc(r * 0.3, r * 0.6, r * 0.12, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = col.eye;
        ctx.beginPath();
        ctx.ellipse(r * 0.08, -r * 0.22, r * 0.17, r * 0.11, 0.3, 0, TAU);
        ctx.ellipse(r * 0.62, -r * 0.22, r * 0.17, r * 0.11, -0.3, 0, TAU);
        ctx.fill();
        ctx.fillStyle = e.type === "boss" ? "#3a2f2a" : "#fff5e0";
        ctx.beginPath();
        ctx.moveTo(r * 0.05, r * 0.25);
        ctx.lineTo(r * 0.15, r * 0.55);
        ctx.lineTo(r * 0.27, r * 0.25);
        ctx.moveTo(r * 0.5, r * 0.25);
        ctx.lineTo(r * 0.6, r * 0.55);
        ctx.lineTo(r * 0.72, r * 0.25);
        ctx.fill();
        break;
      }
    }
    ctx.restore();

    if (e.slowT > 0) {
      ctx.strokeStyle = "rgba(190,235,255,0.75)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(e.x, e.y, r + 2.5, 0, TAU);
      ctx.stroke();
    }

    // burning: little flames licking over the body
    if (e.burnT > 0) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const k = clamp(e.burnT / 3, 0.25, 1);
      for (let i = 0; i < 3; i++) {
        const ph = t * (8 + i * 1.9) + e.seed + i * 2.1;
        const fx = e.x + (i - 1) * e.r * 0.55 + Math.sin(ph) * e.r * 0.2;
        const fy = e.y - e.r * 0.9 - (Math.sin(ph * 1.3) + 1) * e.r * 0.22;
        ctx.fillStyle = `rgba(255,${130 + i * 35},50,${0.6 * k})`;
        ctx.beginPath();
        ctx.ellipse(fx, fy, e.r * 0.2, e.r * 0.36, 0, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
    if ((e.type === "div" || e.type === "ghoul" || e.elite) && e.hp < e.maxHp) {
      const wBar = r * 1.6;
      ctx.fillStyle = "rgba(7,11,29,0.8)";
      ctx.fillRect(e.x - wBar / 2 - 1, e.y - r * 1.9 - 1, wBar + 2, 4);
      ctx.fillStyle = "#e23d4f";
      ctx.fillRect(e.x - wBar / 2, e.y - r * 1.9, wBar * clamp(e.hp / e.maxHp, 0, 1), 2);
    }
  }
}
