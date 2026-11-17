import { useEffect, useState, type CSSProperties } from "react";
import heroArt from "../assets/menu-hero-reference.webp";
import heroPortraits from "../assets/menu-heroes-reference.webp";
import type { Difficulty } from "../game/engine";
import type { GameMode } from "../game/save";
import { fa, faTime } from "../game/fa";
import { PROVING_GROUNDS, stageSummary } from "../game/stage";
import { BY_HERO, HEROES, type HeroId } from "../game/heroes";
import { UiIcon } from "./Icons";

export interface CinematicMenuProps {
  best: number;
  discovered: number;
  total: number;
  difficulty: Difficulty;
  hero: HeroId;
  onHero: (hero: HeroId) => void;
  onDifficulty: (difficulty: Difficulty) => void;
  onStart: () => void;
  resumable?: { level: number; wavesCleared: number; clock: number } | null;
  onResumeRun?: () => void;
  onCodex: () => void;
  mode: GameMode;
  onMode: (mode: GameMode) => void;
  gold: number;
  bestStage: number;
  reducedFx: boolean;
  onReducedFx: (value: boolean) => void;
  onResearch: () => void;
}

const MODES = [
  { id: "stage", title: PROVING_GROUNDS.name, icon: "mountain" },
  { id: "endless", title: "بی‌پایان", icon: "infinity" },
] as const;

const DIFFICULTIES: { id: Difficulty; title: string; details: string }[] = [
  { id: "normal", title: "عادی", details: "شب آرام‌تر؛ برای یادگرفتن افسون‌ها" },
  { id: "adaptive", title: "لبهٔ تیغ", details: "دشواری با قدرت تو بیشتر می‌شود" },
  { id: "brutal", title: "بی‌رحم", details: "دشمنان سرسخت‌تر و جان‌افزاهای کمتر" },
];

/** The screenshot is an art direction, not a bitmap of buttons.
 * All text, currency, characters, mode and navigation remain real controls.
 */
export function Menu({
  best, discovered, total, difficulty, hero, onHero, onDifficulty, onStart,
  resumable = null, onResumeRun, onCodex, mode, onMode,
  gold, bestStage, reducedFx, onReducedFx, onResearch,
}: CinematicMenuProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const selectedHero = BY_HERO[hero];
  const canResume = Boolean(resumable && onResumeRun);
  const formattedGold = new Intl.NumberFormat("fa-IR").format(gold);

  useEffect(() => {
    if (!settingsOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSettingsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [settingsOpen]);

  return (
    <div className="cinematic-menu-shell absolute inset-0" dir="rtl" style={{ "--hero-accent": `rgb(${selectedHero.palette.glow})` } as CSSProperties}>
      <main className="cinematic-menu" aria-label="منوی اصلی آخرین افسونگر">
        <section className="cinematic-menu-top">
          <button
            type="button"
            className="cinematic-menu-gold"
            onClick={onResearch}
            aria-label={`طلای شما ${formattedGold}؛ بازکردن پژوهش`}
          >
            <span aria-hidden="true" className="cinematic-menu-coins">◉</span>
            <span dir="ltr" className="tabular-nums">{formattedGold}</span>
          </button>
          <span className="cinematic-menu-standard" aria-hidden="true">✵</span>
          <h1 className="cinematic-menu-title">آخرین افسونگر</h1>

          <div className="cinematic-menu-art" aria-hidden="true">
            <img src={heroArt} alt="" draggable={false} />
          </div>
          <div className="cinematic-menu-selected-name">
            <span aria-hidden="true">✦</span>
            <strong>{selectedHero.name}</strong>
            <span aria-hidden="true">✦</span>
          </div>
        </section>

        <section className="cinematic-menu-heroes" aria-labelledby="cinematic-heroes-label">
          <h2 id="cinematic-heroes-label" className="cinematic-menu-section-title">انتخاب قهرمان</h2>
          <div className="cinematic-menu-hero-options" role="radiogroup" aria-label="انتخاب قهرمان">
            {HEROES.map((item, index) => {
              const active = hero === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`cinematic-menu-hero-choice ${active ? "is-active" : ""}`}
                  role="radio"
                  aria-checked={active}
                  aria-label={`${item.name}، ${item.title}`}
                  title={`${item.name} — ${item.passive}`}
                  onClick={() => onHero(item.id)}
                >
                  <span
                    className="cinematic-menu-hero-face"
                    aria-hidden="true"
                    style={{
                      backgroundImage: `url("${heroPortraits}")`,
                      backgroundPosition: `${(index / (HEROES.length - 1)) * 100}% center`,
                    }}
                  />
                  <span className="sr-only">{item.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="cinematic-menu-modes" aria-label="حالت بازی">
          <div role="radiogroup" aria-label="حالت بازی" className="cinematic-menu-mode-switch">
            {MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={mode === item.id}
                className={`cinematic-menu-mode ${mode === item.id ? "is-active" : ""}`}
                onClick={() => onMode(item.id)}
              >
                {item.icon === "infinity" ? <span aria-hidden="true" className="cinematic-menu-infinity">∞</span> : <span aria-hidden="true" className="cinematic-menu-mountain">◆</span>}
                <span>{item.title}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="cinematic-menu-actions">
          <button
            type="button"
            className="cinematic-menu-play"
            onClick={canResume ? onResumeRun : onStart}
          >
            <span aria-hidden="true" className="cinematic-menu-play-spark">✧</span>
            <span>{canResume ? "ادامه بازی" : "آغاز بازی"}</span>
            <span aria-hidden="true" className="cinematic-menu-play-spark">✧</span>
          </button>
          {canResume && (
            <button type="button" className="cinematic-menu-new-run" onClick={onStart}>
              شروع دست تازه
              <span className="cinematic-menu-checkpoint">
                سطح {fa(resumable!.level)} · {fa(resumable!.wavesCleared)} موج · {faTime(resumable!.clock)}
              </span>
            </button>
          )}
        </div>

        <nav className="cinematic-menu-bottom" aria-label="بخش‌های بازی">
          <button type="button" className="cinematic-menu-bottom-link" onClick={onResearch}>
            <span aria-hidden="true" className="cinematic-menu-bottom-icon"><UiIcon name="book" size={30} /></span>
            <span>پژوهش</span>
          </button>
          <button type="button" className="cinematic-menu-bottom-link" onClick={onCodex}>
            <span aria-hidden="true" className="cinematic-menu-bottom-icon"><UiIcon name="chest" size={30} /></span>
            <span>گنجینه</span>
          </button>
          <button type="button" className="cinematic-menu-bottom-link" onClick={() => setSettingsOpen(true)}>
            <span aria-hidden="true" className="cinematic-menu-bottom-icon cinematic-menu-gear">⚙</span>
            <span>تنظیمات</span>
          </button>
        </nav>
      </main>

      <div className="cinematic-menu-settings-overlay" hidden={!settingsOpen}>
          <button type="button" className="cinematic-menu-settings-backdrop" onClick={() => setSettingsOpen(false)} aria-label="بستن تنظیمات" />
          <section className="cinematic-menu-settings" role="dialog" aria-modal="true" aria-labelledby="cinematic-menu-settings-heading">
            <header className="cinematic-menu-settings-header">
              <h2 id="cinematic-menu-settings-heading">تنظیمات بازی</h2>
              <button type="button" className="cinematic-menu-close" onClick={() => setSettingsOpen(false)} aria-label="بستن">×</button>
            </header>
            <h3>سختی بازی</h3>
            <div role="radiogroup" aria-label="سختی بازی" className="cinematic-menu-difficulty-options">
              {DIFFICULTIES.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  role="radio"
                  aria-checked={difficulty === item.id}
                  className={`cinematic-menu-difficulty ${difficulty === item.id ? "is-active" : ""}`}
                  onClick={() => onDifficulty(item.id)}
                >
                  <span className="cinematic-menu-difficulty-dot" aria-hidden="true" />
                  <span><strong>{item.title}</strong><small>{item.details}</small></span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="cinematic-menu-effects-switch"
              role="switch"
              aria-checked={reducedFx}
              onClick={() => onReducedFx(!reducedFx)}
            >
              <span>جلوه‌های کمتر <small>مناسب گوشی‌های ضعیف‌تر</small></span>
              <span aria-hidden="true" className={`cinematic-menu-toggle ${reducedFx ? "is-on" : ""}`} />
            </button>
            <div className="cinematic-menu-settings-stats">
              <span>گنجینه: {fa(discovered)} از {fa(total)}</span>
              <span>{mode === "stage" ? stageSummary() : `بیشترین بقا: ${best ? faTime(best) : "—"}`}</span>
              {mode === "stage" && <span>رکورد میدان: {bestStage ? faTime(bestStage) : "—"}</span>}
            </div>
            <p className="cinematic-menu-settings-tip">برای حرکت، انگشتت را روی میدان بکش؛ افسون‌ها خودکار شلیک می‌شوند.</p>
          </section>
        </div>
    </div>
  );
}
