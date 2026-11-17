import { BY_BOON, type BoonId } from "../game/boons";
import { fa } from "../game/fa";
import type { UpgradeId } from "../game/data";
import { StarBadge, UpgradeIcon } from "./Icons";

const ICONS: Record<BoonId, UpgradeId> = {
  mind: "might",
  flame: "haste",
  shadow: "swift",
  crystal: "vital",
  spirit: "wisdom",
  soul: "regen",
  star: "magnet",
  world: "nova",
};

interface Props {
  level: number;
  offers: BoonId[];
  onChoose: (id: BoonId) => void;
}

export function BoonChoice({ level, offers, onChoose }: Props) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="boon-title"
      className="app-safe-dialog absolute inset-0 flex animate-fade flex-col items-center overflow-y-auto bg-night-950/80 px-4 py-6 backdrop-blur-[2px]"
    >
      <div className="my-auto w-full max-w-4xl">
        <div className="mb-5 text-center sm:mb-8">
          <p className="font-display text-lg text-zar-soft">سطح {fa(level)} — سطح ویژه</p>
          <h2 id="boon-title" className="title-glow font-display text-4xl leading-tight text-zar sm:text-5xl">
            جهشِ قدرت برگزین
          </h2>
          <p className="mt-1 text-xs text-kaghaz/60">در سطح‌های ۵، ۱۰، ۱۵… یکی از این نیروها برای همیشه با تو می‌ماند</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3 md:gap-5">
          {offers.map((id, i) => {
            const b = BY_BOON[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChoose(id)}
                style={{ animationDelay: `${i * 70}ms` }}
                data-choice-type="boon"
                className="choice-card card level-boon-card group relative flex animate-rise cursor-pointer items-center gap-4 rounded-[18px] bg-night-900/90 p-4 text-right transition-transform duration-150 hover:-translate-y-1 focus-visible:-translate-y-1 active:translate-y-0 md:min-h-64 md:flex-col md:justify-start md:gap-3 md:px-5 md:pb-6 md:pt-8 md:text-center"
              >
                <span aria-hidden="true" className="card-type-rail" />
                <span className="card-artwork transition-transform duration-200 group-hover:scale-105">
                  <StarBadge color={b.color} size={74}>
                    <UpgradeIcon id={ICONS[id]} size={32} />
                  </StarBadge>
                </span>
                <span className="flex min-w-0 flex-1 flex-col md:items-center">
                  <span className="type-chip">پاداش ویژه</span>
                  <span className="card-name mt-1 font-display text-2xl leading-snug text-kaghaz">{b.name}</span>
                  <span className="mt-1 text-sm leading-6 text-kaghaz/80">{b.text}</span>
                  <span className="mt-3 text-[11px] text-zar/70 md:mt-auto md:pt-4">تا پایانِ این دست</span>
                </span>
                <span aria-hidden="true" className="card-choice-hint card-select-foot">دریافت نیرو <span>←</span></span>
                <kbd className="desktop-keyboard-help absolute left-3 top-3 hidden h-6 w-6 place-items-center rounded-lg border border-zar/35 bg-night-800/95 font-sans text-xs text-zar md:grid">
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