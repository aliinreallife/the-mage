import type { ArtifactId } from "../game/artifacts";
import { BY_ID, RARITY } from "../game/artifacts";
import { CARD_RARITY } from "../game/rarity";
import { fa } from "../game/fa";
import { ArtifactIcon, StarBadge } from "./Icons";

interface Props {
  offers: ArtifactId[];
  held: number;
  onChoose: (id: ArtifactId) => void;
}



// sort offers so the rarest appears first (leftmost in RTL = last child in row order)
function sortOffers(offers: ArtifactId[]) {
  return [...offers].sort((a, b) => RARITY[BY_ID[b].rarity].rank - RARITY[BY_ID[a].rarity].rank);
}

export function RelicChoice({ offers, held, onChoose }: Props) {
  const sorted = sortOffers(offers);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="relic-title"
      className="app-safe-dialog absolute inset-0 flex animate-fade flex-col items-center overflow-y-auto bg-night-950/78 px-4 py-6 backdrop-blur-[2px]"
    >
      <div className="my-auto w-full max-w-4xl">
        <div className="mb-5 text-center sm:mb-8">
          <p className="text-sm text-zar-soft">صندوق گنج گشوده شد</p>
          <h2 id="relic-title" className="title-glow font-display text-4xl leading-tight text-zar sm:text-5xl">
            یک یادگار برگزین
          </h2>
          <p className="mt-1 text-xs text-kaghaz/60">
            یادگارها تا پایان دست با تو می‌مانند · همراه داری: {fa(held)}
          </p>
        </div>

        <div className={`grid gap-3 ${sorted.length === 3 ? "md:grid-cols-3" : sorted.length === 2 ? "md:grid-cols-2" : ""} md:gap-5`}>
          {sorted.map((id, i) => {
            const a = BY_ID[id];
            const rar = RARITY[a.rarity];
            const isLegend = a.rarity === "legendary";
            const cardRarity = a.rarity;
            const cardRar = CARD_RARITY[cardRarity];
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChoose(id)}
                style={{ animationDelay: `${i * 70}ms` }}
                data-rarity={cardRarity}
                className={`choice-card card card-${cardRarity} group relative flex animate-rise cursor-pointer items-center gap-4 rounded-[18px] bg-night-900/90 p-4 text-right transition-transform duration-150 hover:-translate-y-1 focus-visible:-translate-y-1 active:translate-y-0 md:min-h-64 md:flex-col md:justify-start md:gap-3 md:px-5 md:pb-6 md:pt-8 md:text-center`}
              >
                <span aria-hidden="true" className="card-rarity-rail" />
                <span aria-hidden="true" className="card-tier-glyph">✦</span>
                <span className={`card-artwork transition-transform duration-200 group-hover:scale-105 ${isLegend ? "drop-shadow-[0_0_14px_rgba(255,242,194,0.3)]" : ""}`}>
                  <StarBadge color={a.color} size={isLegend ? 78 : 68}>
                    <ArtifactIcon id={a.id} size={isLegend ? 34 : 30} />
                  </StarBadge>
                </span>

                {/* restrained rarity emblem; actual tier is conveyed by frame and color */}
                {/* rarity ornament on legendary: faint right border accent */}
                {isLegend && (
                  <>
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-[5px] top-1/2 h-[55%] w-1 -translate-y-1/2 rounded-full"
                      style={{ background: `linear-gradient(to bottom, transparent, ${a.color}88, transparent)` }}
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3 top-3 rounded-full border border-zar/50 px-2 py-0.5 font-display text-[10px] text-zar"
                    >
                      افسانه‌ای
                    </span>
                  </>
                )}

                <span className="flex min-w-0 flex-1 flex-col md:items-center">
                  <span className="rarity-chip tabular-nums" style={{ color: cardRar.color }}>
                    {rar.name}
                  </span>
                  {isLegend && <span className="mt-1 font-display text-xs tracking-wide text-zar">یادگارِ افسانه‌ای</span>}
                  <span className={`card-name mt-1 font-display leading-snug text-kaghaz ${isLegend ? "text-3xl" : "text-2xl"}`}>{a.name}</span>
                  <span className={`mt-1 text-sm leading-6 text-kaghaz/75 ${isLegend ? "font-medium" : ""}`}>{a.text}</span>
                  <span className="mt-3 text-[10px] tracking-wide text-kaghaz/35 md:mt-auto md:pt-4">{a.source}</span>
                </span>
                <span aria-hidden="true" className="card-choice-hint card-select-foot">برداشتن یادگار <span>←</span></span>
                <kbd className={`desktop-keyboard-help absolute bottom-3 left-3 h-6 w-6 place-items-center rounded-lg border font-sans text-xs md:grid ${isLegend ? "border-zar/35 bg-night-800/95 text-zar" : "border-kaghaz/20 bg-night-950/70 text-kaghaz/60"}`}>
                  {fa(i + 1)}
                </kbd>
              </button>
            );
          })}
        </div>
        <p className="desktop-keyboard-help mt-4 text-center text-xs text-kaghaz/45">با کلیدهای ۱ تا ۳ هم می‌توانی برگزینی</p>
      </div>
    </div>
  );
}