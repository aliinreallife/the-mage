import { RESEARCH, maxRank, nextCost, type ResearchId, type ResearchRanks } from "../game/progression";
import { fa } from "../game/fa";
import { UpgradeIcon } from "./Icons";
import type { UpgradeId } from "../game/data";

const ICON: Record<ResearchId, UpgradeId> = { attack: "might", hp: "vital", pickup: "magnet" };
const COLOR: Record<ResearchId, string> = { attack: "#ff9f6e", hp: "#ff7d8c", pickup: "#ffc857" };

interface Props {
  gold: number;
  ranks: ResearchRanks;
  /** returns false when the purchase was not possible */
  onBuy: (id: ResearchId) => boolean;
  onBack: () => void;
}

/** «پژوهش»: spend gold on permanent upgrades that apply to every later run. */
export function Research({ gold, ranks, onBuy, onBack }: Props) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="research-title"
      className="absolute inset-0 flex animate-fade flex-col items-center overflow-y-auto bg-night-950/85 px-3 py-5 backdrop-blur-[2px]"
      style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))", paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
    >
      <div className="frame my-auto w-full max-w-xl animate-rise rounded-sm px-4 py-6 sm:px-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-firoozeh">نیروهای ماندگار برای همه‌ی دست‌های آینده</p>
            <h2 id="research-title" className="font-display text-4xl leading-tight text-zar">
              پژوهش
            </h2>
          </div>
          <div className="rounded-sm border border-zar/40 bg-zar/10 px-3 py-1.5 text-right">
            <p className="text-[11px] text-kaghaz/60">طلای تو</p>
            <p className="font-display text-2xl leading-none text-zar tabular-nums">{fa(gold)}</p>
          </div>
        </div>

        <ul className="mt-5 grid gap-3">
          {RESEARCH.map((r) => {
            const rank = ranks[r.id] ?? 0;
            const max = maxRank(r.id);
            const cost = nextCost(r.id, rank);
            const affordable = cost !== null && gold >= cost;
            return (
              <li key={r.id} className="rounded-sm border border-kaghaz/12 bg-night-950/60 p-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-night-800" style={{ color: COLOR[r.id] }}>
                    <UpgradeIcon id={ICON[r.id]} size={22} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-xl leading-tight text-kaghaz">{r.name}</p>
                    <p className="text-xs text-kaghaz/65">
                      اکنون: {rank > 0 ? r.describe(rank) : "بی‌پژوهش"}
                      {cost !== null && <span className="text-firoozeh"> ← {r.describe(rank + 1)}</span>}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="flex gap-1.5" aria-label={`رتبهٔ ${fa(rank)} از ${fa(max)}`}>
                    {Array.from({ length: max }, (_, k) => (
                      <span key={k} className={`h-2.5 w-7 rounded-full ${k < rank ? "bg-zar" : "bg-kaghaz/15"}`} />
                    ))}
                  </span>
                  {cost === null ? (
                    <span className="rounded-sm bg-zar/15 px-3 py-2 text-sm font-bold text-zar">کامل شد</span>
                  ) : (
                    <button
                      type="button"
                      disabled={!affordable}
                      onClick={() => onBuy(r.id)}
                      className={`min-h-11 rounded-sm px-4 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zar ${
                        affordable ? "cursor-pointer bg-zar text-night-950 hover:bg-zar-soft" : "cursor-not-allowed bg-kaghaz/10 text-kaghaz/40"
                      }`}
                    >
                      پژوهش · {fa(cost)} طلا
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <p className="mt-4 text-center text-xs leading-6 text-kaghaz/50">
          طلا را با پایان هر دست به دست می‌آوری: هرچه بیشتر دوام بیاوری، دیو بیشتری بکشی و موج بیشتری پشت سر بگذاری، طلای بیشتری می‌گیری.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-5 inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-sm border border-kaghaz/25 text-base font-medium text-kaghaz/90 transition-colors hover:border-zar/70 hover:text-zar focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zar"
        >
          بازگشت به منو
        </button>
      </div>
    </div>
  );
}
