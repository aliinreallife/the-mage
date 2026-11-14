/**
 * Combat/stat formula audit for «آخرین افسونگر», plus extension points for
 * reference-game modifier ordering and stacking.
 *
 * Nothing in this file changes runtime behaviour: the categories below document
 * where each calculation lives today and whether it is data-driven. The pipeline
 * helpers are pure and only used once a reference formula is verified.
 */

export type Configurability = "data" | "hybrid" | "hardcoded";

export interface CombatCategory {
  id: string;
  labelFa: string;
  /** Where the calculation happens today. */
  handledAt: string;
  /** data = lives in a data table; hybrid = data feeds a fixed formula; hardcoded = formula only. */
  configurable: Configurability;
  /** Where a verified reference formula would plug in. */
  extensionPoint: string;
  notes: string;
}

export const COMBAT_CATEGORIES: CombatCategory[] = [
  {
    id: "baseAttack",
    labelFa: "آسیب پایه",
    handledAt: "data.ts → SPELLS[spell][level].dmg",
    configurable: "data",
    extensionPoint: "patchSpellLevel(spell, level, { dmg })",
    notes: "per-level damage coefficient; no separate player attack stat exists",
  },
  {
    id: "attackAmplification",
    labelFa: "تقویت کلی حمله",
    handledAt: "engine.ts → Game.recalc() this.dmgMul",
    configurable: "hybrid",
    extensionPoint: "reference/formulas.ts → runPipeline(stage='amplify')",
    notes: "passives, artifacts, sets, hero and research feed a fixed multiplicative chain",
  },
  {
    id: "magicDamage",
    labelFa: "آسیب فردی افسون",
    handledAt: "engine.ts → Game.sd(spell, base)",
    configurable: "data",
    extensionPoint: "a.spellDmg table (artifacts/sets/talents/hero)",
    notes: "per-spell bonus added to that spell's row damage",
  },
  {
    id: "allMagicDamage",
    labelFa: "آسیب همهٔ افسون‌ها",
    handledAt: "engine.ts → Game.recalc() this.dmgMul",
    configurable: "hybrid",
    extensionPoint: "reference/formulas.ts → runPipeline(stage='allMagic')",
    notes: "multiplies every spell after per-spell bonuses",
  },
  {
    id: "critical",
    labelFa: "ضربهٔ بحرانی",
    handledAt: "engine.ts → Game.hit() with PASSIVE_TUNING",
    configurable: "hybrid",
    extensionPoint: "PASSIVE_TUNING.baseCritChance / critMultiplier",
    notes: "chance = base + Snipe ranks; multiplier is a flat constant today",
  },
  {
    id: "cooldown",
    labelFa: "زمان انتظار",
    handledAt: "engine.ts → Game.recalc() this.cdMul and Game.scd()",
    configurable: "data",
    extensionPoint: "SPELLS[spell][level].cd + spellCd table",
    notes: "Fast Casting is additive with artifact cooldown bonuses",
  },
  {
    id: "projectileCount",
    labelFa: "تعداد پرتابه",
    handledAt: "engine.ts → Game.sc(spell, base)",
    configurable: "data",
    extensionPoint: "SPELLS[spell][level].count + spellCount table",
    notes: "talents add whole projectiles in engine branches",
  },
  {
    id: "sizeAndDuration",
    labelFa: "اندازه و ماندگاری",
    handledAt: "engine.ts → Game.scr/sr + per-shot `life` constants",
    configurable: "hybrid",
    extensionPoint: "SPELLS radius/size fields; shot lifetimes are hardcoded per kind",
    notes: "durations (shot life, burn length, nova lifetime) are engine constants, not tables",
  },
  {
    id: "hitFrequency",
    labelFa: "بسامد برخورد",
    handledAt: "engine.ts → spell timers + BURN_TICK",
    configurable: "hybrid",
    extensionPoint: "row `cd` (data); burn tick constant BURN_FRACTION/BURN_TICK (hardcoded)",
    notes: "contact damage frequency for burn is a constant share of blast damage",
  },
  {
    id: "enemyResistance",
    labelFa: "مقاومت و کاهش آسیب دشمن",
    handledAt: "engine.ts → Game.hurtPlayer() armor; artifact `taken`",
    configurable: "hybrid",
    extensionPoint: "armor flat reduction formula (hardcoded); sources are data",
    notes: "enemies have no separate resistance stat yet; player-side reduction only",
  },
  {
    id: "enemyMaxHp",
    labelFa: "تغییر جان پایهٔ دشمن",
    handledAt: "engine.ts → Game.addEnemy() hpMul chain",
    configurable: "hybrid",
    extensionPoint: "patchEnemyBase(type, patch) for base; hpMul formula remains hardcoded until verified",
    notes: "base × time curve × artifact enemyHp × difficulty × stage power",
  },
  {
    id: "conditionalEffects",
    labelFa: "اثرات شرطی",
    handledAt: "engine.ts → addMods(), updateSpells() talent branches, fusion fx flags",
    configurable: "hybrid",
    extensionPoint: "artifact/hero/set Mods (data); talent and fusion behaviour branches (hardcoded)",
    notes: "talent/fusion *effects* are code, their *prerequisites* are data",
  },
];

/** Where each reference dataset would attach. */
export const DATASET_INTEGRATION: Record<string, { target: string; status: "ready" | "partial" | "blocked" }> = {
  progression: { target: "setProgressionTable(rows)", status: "ready" },
  magic: { target: "patchSpellLevel(spell, level, patch)", status: "ready" },
  enemies: { target: "patchEnemyBase(type, patch) + hpMul formula", status: "partial" },
  combinations: { target: "FUSIONS catalog (prerequisites) + effect code branches", status: "partial" },
  artifacts: { target: "ARTIFACTS catalog + addMods()", status: "partial" },
  synergies: { target: "SETS catalog", status: "partial" },
  formulas: { target: "runPipeline() below", status: "blocked" },
  stats: { target: "PASSIVE_TUNING / ENEMY constants", status: "partial" },
  stages: { target: "PROVING_GROUNDS + PHASES", status: "partial" },
};

/* -------------------------------------------------- modifier pipeline */

export type PipelineStage = "base" | "attackAmplify" | "magicDamage" | "allMagicDamage" | "crit" | "conditional";

export interface ModifierOp {
  /** Stage this op belongs to; stages run in the fixed order below. */
  stage: PipelineStage;
  /** Multiplicative factor (e.g. 1.1 = +10%). */
  mul?: number;
  /** Flat addition to the running multiplier (e.g. 0.1 = +10%). */
  add?: number;
  /** True only when its condition holds. */
  active?: boolean;
  /** Provenance for reporting. */
  source: string;
  evidence: string;
}

/** The reference-game ordering we expect once formulas are verified. */
export const PIPELINE_ORDER: PipelineStage[] = ["base", "attackAmplify", "magicDamage", "allMagicDamage", "crit", "conditional"];

/**
 * Apply modifiers in canonical stage order. Within a stage, multiplicative
 * factors combine first and the flat addition is applied to the product —
 * this is the stacking semantic to confirm against native code before use.
 * Pure: used by tests and, later, by reference mode; the current game keeps
 * its own chain in Game.recalc()/Game.hit().
 */
export function runPipeline(ops: readonly ModifierOp[]): { value: number; applied: ModifierOp[]; skipped: ModifierOp[] } {
  let value = 1;
  const applied: ModifierOp[] = [];
  const skipped: ModifierOp[] = [];
  for (const stage of PIPELINE_ORDER) {
    let mul = 1;
    let add = 0;
    for (const op of ops) {
      if (op.stage !== stage) continue;
      if (op.active === false) {
        skipped.push(op);
        continue;
      }
      if (op.mul !== undefined) mul *= op.mul;
      if (op.add !== undefined) add += op.add;
      applied.push(op);
    }
    value = value * mul + add;
  }
  return { value, applied, skipped };
}
