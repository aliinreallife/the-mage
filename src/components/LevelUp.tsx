import { UPGRADES } from "../game/data";
import { CARD_RARITY, upgradeRarity } from "../game/rarity";
import { FUSIONS, MASTERIES, TALENTS, recipesForTalent } from "../game/talents";
import type { Choice } from "../game/engine";
import { fa } from "../game/fa";
import { StarBadge, UpgradeIcon } from "./Icons";

interface Props {
  level: number;
  choices: Choice[];
  /** changes whenever a fresh set of cards is dealt, to replay the entrance */
  dealKey: number;
  onChoose: (c: Choice) => void;
}

function tagFor(c: Choice) {
  const def = UPGRADES[c.id];
  if (def.kind === "boon") return "هدیه";
  if (c.next === 1) return def.kind === "spell" ? "افسون تازه" : "توانایی تازه";
  if (c.next >= def.max) return `سطح ${fa(c.next)} · واپسین سطح`;
  return `سطح ${fa(c.next)}`;
}

export function LevelUp({ level, choices, dealKey, onChoose }: Props) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="levelup-title"
      className="absolute inset-0 flex animate-fade flex-col items-center overflow-y-auto bg-night-950/75 px-4 py-6 backdrop-blur-[2px]"
    >
      <div className="my-auto w-full max-w-4xl">
        <div className="mb-5 text-center sm:mb-8">
          <p className="text-sm text-firoozeh">سطح {fa(level)}</p>
          <h2 id="levelup-title" className="title-glow font-display text-4xl leading-tight text-zar sm:text-5xl">
            نیرویی تازه برگزین
          </h2>
          <p className="mt-1 text-xs text-kaghaz/55">با کلیدهای ۱ تا ۳ هم می‌توانی برگزینی</p>
        </div>

        <div key={dealKey} className="grid gap-3 md:grid-cols-3 md:gap-5">
          {choices.map((c, i) => {
            const def = UPGRADES[c.id];
            const talent = c.talent ? TALENTS[c.talent] : c.mastery ? { ...MASTERIES[c.mastery], tier2: true as const } : null;
            const fusion = c.fusion ? FUSIONS[c.fusion] : null;
            const special = Boolean(talent || fusion);
            const maxed = !special && c.next >= def.max;
            const rarity = fusion ? "legendary" : talent ? "epic" : upgradeRarity(c.id, c.next);
            const rar = CARD_RARITY[rarity];
            return (
              <button
                key={`${c.id}-${c.talent ?? ""}-${c.mastery ?? ""}-${c.fusion ?? ""}`}
                type="button"
                onClick={() => onChoose(c)}
                style={{ animationDelay: `${i * 70}ms` }}
                data-rarity={rarity}
                className={`choice-card card card-${rarity} group relative flex animate-rise cursor-pointer items-center gap-4 rounded-sm bg-night-900/90 p-4 text-right transition-transform duration-150 hover:-translate-y-1 focus-visible:-translate-y-1 active:translate-y-0 md:min-h-72 md:flex-col md:justify-start md:gap-3 md:px-5 md:pb-6 md:pt-8 md:text-center`}
              >
                <span className="transition-transform duration-200 group-hover:scale-110">
                  <StarBadge color={def.color} size={rarity === "legendary" ? 78 : maxed ? 72 : 64}>
                    <UpgradeIcon id={c.id} size={rarity === "legendary" ? 34 : maxed ? 31 : 28} />
                  </StarBadge>
                </span>
                <span className="flex min-w-0 flex-1 flex-col md:items-center">
                  <span className="flex flex-wrap items-center justify-center gap-2">
                    <span className="rarity-chip" style={{ color: rar.color }}>{rar.name}</span>
                    <span className="text-xs font-medium" style={{ color: c.next === 1 ? "#3fd9c8" : "#f2b84b" }}>
                      {fusion
                        ? `ترکیب · ${UPGRADES[fusion.primary.spell].name} + ${UPGRADES[fusion.secondary.spell].name}`
                        : talent
                          ? "tier2" in talent
                            ? `چیرگیِ ${def.name} · استعدادِ ردهٔ دوم`
                            : `استعدادِ ${def.name}`
                          : tagFor(c)}
                    </span>
                  </span>
                  <span className="font-display text-2xl leading-snug text-kaghaz">{fusion?.name ?? talent?.name ?? def.name}</span>
                  <span className="mt-1 text-sm leading-6 text-kaghaz/75">{fusion?.text ?? talent?.text ?? def.levels[Math.min(c.next, def.levels.length) - 1]}</span>
                  {c.guidance && (
                    <span className="mt-2 inline-flex items-center rounded-sm border border-firoozeh/45 bg-firoozeh/10 px-2 py-0.5 text-[11px] text-firoozeh">
                      گامِ ترکیب «{FUSIONS[c.guidance].name}»
                    </span>
                  )}
                  {c.talent && recipesForTalent(c.talent).length > 0 && (
                    <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-full border border-zar/45 bg-zar/10 px-2 py-0.5 text-[11px] leading-4 text-zar-soft">
                      راهِ ترکیب: {recipesForTalent(c.talent).map((f) => `«${f.name}»`).join("، ")}
                    </span>
                  )}
                  {fusion && (
                    <span className="mt-2 text-[11px] text-zar/80">
                      «{UPGRADES[fusion.secondary.spell].name}» مصرف می‌شود و «{UPGRADES[fusion.primary.spell].name}» دگرگون می‌شود
                    </span>
                  )}
                  {!special && def.max > 1 && (
                    <span className="mt-3 flex gap-1.5 md:mt-auto md:pt-4" aria-hidden="true">
                      {Array.from({ length: def.max }, (_, k) => (
                        <span
                          key={k}
                          className={`h-1.5 w-4 rounded-full ${k < c.next ? "bg-zar" : "bg-kaghaz/15"} ${k === c.next - 1 && !maxed ? "animate-pulse-soft" : ""}`}
                        />
                      ))}
                    </span>
                  )}
                </span>
                <kbd className="absolute left-3 top-3 hidden h-6 w-6 place-items-center rounded border border-kaghaz/20 font-sans text-xs text-kaghaz/60 md:grid">
                  {fa(i + 1)}
                </kbd>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
