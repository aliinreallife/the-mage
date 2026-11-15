import type { ReactNode } from "react";
import type { ArtifactId } from "../game/artifacts";
import { BY_ID } from "../game/artifacts";
import { Codex } from "./Codex";
import { UPGRADES } from "../game/data";
import type { Difficulty, Snapshot } from "../game/engine";
import type { GameMode } from "../game/save";
import { PROVING_GROUNDS, stageSummary } from "../game/stage";
import { BY_BOON } from "../game/boons";
import type { FusionId } from "../game/talents";
import { fa, faTime } from "../game/fa";
import { ArtifactIcon, UiIcon, UpgradeIcon } from "./Icons";
import { HeroPortrait } from "./HeroPortrait";
import { BY_HERO, HEROES, type HeroId } from "../game/heroes";

const primaryBtn =
  "menu-start inline-flex min-h-13 cursor-pointer items-center justify-center gap-2 px-8 py-3 font-display text-2xl text-night-950 transition-colors hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zar active:translate-y-px";
const ghostBtn =
  "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-kaghaz/20 bg-night-950/40 px-4 py-2.5 text-sm font-medium text-kaghaz/90 transition-colors hover:border-zar/60 hover:text-zar focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zar active:translate-y-px";

function Ornament({ width = "w-56" }: { width?: string }) {
  return (
    <div className={`mx-auto my-4 flex ${width} items-center gap-3`} aria-hidden="true">
      <span className="h-px flex-1 bg-gradient-to-l from-zar/70 to-transparent" />
      <span className="h-2.5 w-2.5 rotate-45 bg-zar" />
      <span className="h-px flex-1 bg-gradient-to-r from-zar/70 to-transparent" />
    </div>
  );
}

function Keycap({ children }: { children: ReactNode }) {
  return (
    <kbd className="grid h-7 min-w-7 place-items-center rounded border border-kaghaz/25 bg-night-900/80 px-1.5 font-sans text-xs text-kaghaz/85">
      {children}
    </kbd>
  );
}

/** A small label row with an icon, used across the menus. */
function Row({ icon, label, value, color }: { icon: ReactNode; label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-sm border border-kaghaz/10 bg-night-950/50 px-2.5 py-1.5">
      <span className="flex items-center gap-2 text-xs text-kaghaz/65">
        {icon}
        {label}
      </span>
      <span className="text-sm font-bold tabular-nums" style={{ color: color ?? "#f4ecd8" }}>
        {value}
      </span>
    </div>
  );
}

/** Mirrors the in-game look: cape stars at 10, halo at 20, glowing eyes at 30. */
const tierOf = (level: number) => (level >= 30 ? 3 : level >= 20 ? 2 : level >= 10 ? 1 : 0);

/* ------------------------------------------------------------------ menu */

const DIFFICULTY: { id: Difficulty; name: string; text: string; color: string; hint: string }[] = [
  { id: "normal", name: "عادی", text: "شب آرام‌تر؛ برای آشنایی با مکانیزم‌ها.", color: "#9be8ff", hint: "آسان" },
  { id: "adaptive", name: "لبهٔ تیغ", text: "هرقدر قوی‌تر شوی، شب هم سنگین‌تر می‌شود.", color: "#f2b84b", hint: "پیشنهادی" },
  { id: "brutal", name: "بی‌رحم", text: "دشمنان سخت‌تر، جان‌افزاها کم‌تر.", color: "#e23d4f", hint: "سخت" },
];

export function Menu({
  best,
  discovered,
  total,
  difficulty,
  hero,
  onHero,
  onDifficulty,
  onStart,
  resumable = null,
  onResumeRun,
  onCodex,
  mode,
  onMode,
  gold,
  bestStage,
  reducedFx,
  onReducedFx,
  onResearch,
}: {
  best: number;
  discovered: number;
  total: number;
  difficulty: Difficulty;
  hero: HeroId;
  onHero: (h: HeroId) => void;
  onDifficulty: (d: Difficulty) => void;
  onStart: () => void;
  /** an unfinished stage run that can be continued */
  resumable?: { level: number; wavesCleared: number; clock: number } | null;
  onResumeRun?: () => void;
  onCodex: () => void;
  mode: GameMode;
  onMode: (m: GameMode) => void;
  gold: number;
  bestStage: number;
  reducedFx: boolean;
  onReducedFx: (v: boolean) => void;
  onResearch: () => void;
}) {
  const h = BY_HERO[hero];
  const glow = `rgb(${h.palette.glow})`;
  const startSpell = UPGRADES[h.start];
  const index = HEROES.findIndex((x) => x.id === hero);

  return (
    <div className="menu-shell absolute inset-0 flex flex-col items-center overflow-y-auto px-3 py-5 sm:px-6 sm:py-8" style={{ paddingTop: "calc(var(--ui-safe-top) + 18px)", paddingBottom: "calc(var(--ui-safe-bottom) + 22px)" }}>
      <main className="my-auto w-full max-w-5xl animate-rise menu-content">
        {/* title */}
        <header className="menu-masthead text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-firoozeh/20 bg-firoozeh/5 px-4 py-1.5 text-[11px] font-medium tracking-wide text-firoozeh">✦ یک شب، هزار افسون ✦</p>
          <h1 className="title-glow mt-1 font-display text-[length:clamp(2.5rem,9vw,5.3rem)] leading-[1.15] text-zar">آخرین افسونگر</h1>
          <p className="mt-1 text-xs text-kaghaz/75 sm:text-sm">قهرمانت را برگزین. افسون‌ها را بساز. از شب جان سالم ببر.</p>
          <Ornament width="w-48" />
        </header>

        <div className="mt-3 grid items-start gap-3 lg:grid-cols-[minmax(0,1.06fr)_minmax(0,1fr)] lg:gap-5">
          {/* ------------------------------------------------ hero showcase */}
          <section aria-labelledby="hero-title" className="menu-hero-frame relative overflow-hidden p-3.5 sm:p-5">
            {/* coloured wash that follows the selected hero */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 transition-[background] duration-500"
              style={{ background: `radial-gradient(60% 70% at 78% 40%, rgba(${h.palette.glow},0.16), transparent 70%)` }}
            />
            <div className="relative grid grid-cols-[112px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:gap-5">
              {/* pedestal */}
              <div className="menu-hero-pedestal relative mx-auto grid h-32 w-28 place-items-center sm:h-52 sm:w-48">
                <svg viewBox="0 0 200 200" className="absolute inset-x-0 bottom-2 mx-auto h-auto w-full animate-spin-slow opacity-70" aria-hidden="true">
                  <ellipse cx="100" cy="100" rx="92" ry="92" fill="none" stroke={glow} strokeOpacity="0.25" strokeWidth="1" strokeDasharray="3 9" />
                  <ellipse cx="100" cy="100" rx="74" ry="74" fill="none" stroke={glow} strokeOpacity="0.15" strokeWidth="1" />
                </svg>
                <div
                  aria-hidden="true"
                  className="absolute bottom-3 h-8 w-28 rounded-[50%] blur-md transition-colors duration-500 sm:w-40"
                  style={{ background: `rgba(${h.palette.glow},0.28)` }}
                />
                <HeroPortrait key={hero} hero={hero} size={145} animate className="menu-hero-portrait relative max-w-full animate-fade drop-shadow-[0_18px_18px_rgba(0,0,0,0.3)]" />
              </div>

              {/* info */}
              <div className="min-w-0 text-right">
                <p className="text-xs text-kaghaz/50">
                  قهرمان {fa(index + 1)} از {fa(HEROES.length)}
                </p>
                <h2 id="hero-title" className="font-display text-3xl leading-tight sm:text-5xl" style={{ color: glow }}>
                  {h.name}
                </h2>
                <p className="font-display text-base leading-tight text-kaghaz/85 sm:text-lg">{h.title}</p>
                <p className="mt-1 text-[11px] leading-[1.6] text-kaghaz/70 sm:text-xs">{h.lore}</p>

                <dl className="mt-2 grid gap-1.5 text-right sm:mt-2.5 sm:gap-2">
                  <div className="rounded-xl border px-2.5 py-1.5 sm:px-3 sm:py-2" style={{ borderColor: `rgba(${h.palette.glow},0.35)`, background: `rgba(${h.palette.glow},0.07)` }}>
                    <dt className="text-[11px] font-bold" style={{ color: glow }}>
                      توان ویژه
                    </dt>
                    <dd className="text-xs leading-5 text-kaghaz/85 sm:text-sm sm:leading-6">{h.passive}</dd>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-kaghaz/12 bg-night-950/55 px-2.5 py-1.5 sm:gap-2.5 sm:px-3 sm:py-2">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-night-800" style={{ color: startSpell.color }}>
                      <UpgradeIcon id={h.start} size={18} />
                    </span>
                    <span>
                      <dt className="text-[11px] text-kaghaz/50">افسون آغازین</dt>
                      <dd className="font-display text-base leading-tight text-kaghaz">{startSpell.name}</dd>
                    </span>
                  </div>
                </dl>
              </div>
            </div>

            {/* picker */}
            <div role="radiogroup" aria-label="انتخاب قهرمان" className="relative mt-3 grid grid-cols-4 gap-2">
              {HEROES.map((x) => {
                const active = x.id === hero;
                const c = `rgb(${x.palette.glow})`;
                return (
                  <button
                    key={x.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={`${x.name} — ${x.title}`}
                    onClick={() => onHero(x.id)}
                    className={`menu-hero-choice choice-card group relative flex min-h-18 cursor-pointer flex-col items-center justify-center border px-1 pb-1.5 pt-1 transition-all sm:min-h-20 ${
                      active ? "bg-night-800/90" : "border-kaghaz/10 bg-night-950/55 hover:border-kaghaz/25 hover:bg-night-900/70"
                    }`}
                    style={active ? { borderColor: c, boxShadow: `inset 0 0 22px -12px ${c}, 0 0 20px -10px ${c}` } : undefined}
                  >
                    <HeroPortrait
                      hero={x.id}
                      size={44}
                      className={`transition-transform duration-200 ${active ? "scale-105" : "opacity-75 grayscale-[35%] group-hover:opacity-100 group-hover:grayscale-0"}`}
                    />
                    <span className="mt-0.5 font-display text-sm leading-none" style={{ color: active ? c : "#f4ecd8" }}>
                      {x.name}
                    </span>
                    {active && <span aria-hidden="true" className="menu-hero-selected absolute left-2 top-2 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c }} />}
                  </button>
                );
              })}
            </div>

            {resumable && onResumeRun && (
              <button
                type="button"
                onClick={onResumeRun}
                className="relative mt-4 flex min-h-12 w-full cursor-pointer flex-wrap items-center justify-between gap-2 rounded-xl border border-firoozeh/60 bg-firoozeh/10 px-4 py-2 text-right transition-colors hover:bg-firoozeh/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-firoozeh"
              >
                <span className="font-display text-xl text-firoozeh">ادامهٔ دستِ نیمه‌تمام</span>
                <span className="text-xs leading-5 text-kaghaz/70">
                  سطح {fa(resumable.level)} · {fa(resumable.wavesCleared)} موج · <span dir="ltr">{faTime(resumable.clock)}</span>
                </span>
              </button>
            )}
            <button type="button" onClick={onStart} className={`${primaryBtn} menu-start relative ${resumable ? "mt-2" : "mt-4"} flex min-h-14 w-full items-center justify-center gap-3 font-display text-xl`}>
              <UiIcon name="play" size={20} />
              <span>{resumable ? "دستِ تازه" : "آغاز بازی"} با {h.name}</span>
              <span aria-hidden="true" className="mr-auto text-xl">↖</span>
            </button>
          </section>

          {/* ------------------------------------------------ settings */}
          <div className="flex flex-col gap-3">
            <section className="menu-panel p-3.5 text-right backdrop-blur-sm">
              <h2 className="mb-2.5 flex items-center gap-2 font-display text-xl text-kaghaz/90">
                حالت بازی
                <span className="h-px flex-1 bg-kaghaz/10" />
              </h2>
              <div role="radiogroup" aria-label="حالت بازی" className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: "stage", name: PROVING_GROUNDS.name, text: stageSummary() },
                    { id: "endless", name: "بی‌پایان", text: "شب بی‌پایان؛ تا کجا دوام می‌آوری؟" },
                  ] as const
                ).map((m) => {
                  const active = mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => onMode(m.id)}
                      className={`choice-card min-h-20 cursor-pointer rounded-xl border px-3 py-2 text-right transition-all ${
                        active ? "border-zar bg-night-800/95 shadow-[inset_0_0_22px_-12px_#f2b84b]" : "border-kaghaz/10 bg-night-950/50 hover:border-kaghaz/25"
                      }`}
                    >
                      <span className={`block font-display text-lg leading-tight ${active ? "text-zar" : "text-kaghaz"}`}>{m.name}</span>
                      <span className="mt-0.5 block text-[11px] leading-5 text-kaghaz/60">{m.text}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="menu-panel p-3.5 text-right backdrop-blur-sm">
              <h2 className="mb-2.5 flex items-center gap-2 font-display text-xl text-kaghaz/90">
                سختی بازی
                <span className="h-px flex-1 bg-kaghaz/10" />
              </h2>
              <div role="radiogroup" aria-label="سختی بازی" className="grid gap-2">
                {DIFFICULTY.map((d) => {
                  const active = difficulty === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => onDifficulty(d.id)}
                      className={`choice-card flex min-h-15 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-right transition-all ${
                        active ? "bg-night-800/95" : "border-kaghaz/10 bg-night-950/50 hover:border-kaghaz/25"
                      }`}
                      style={active ? { borderColor: d.color, boxShadow: `inset 0 0 24px -14px ${d.color}` } : undefined}
                    >
                      <span
                        aria-hidden="true"
                        className="grid h-4 w-4 shrink-0 place-items-center rounded-full border-2"
                        style={{ borderColor: active ? d.color : "rgba(244,236,216,0.25)" }}
                      >
                        {active && <span className="h-1.5 w-1.5 rounded-full" style={{ background: d.color }} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="font-display text-lg leading-none" style={{ color: active ? d.color : "#f4ecd8" }}>
                            {d.name}
                          </span>
                          <span className="rounded-full bg-kaghaz/8 px-1.5 text-[10px] text-kaghaz/55">{d.hint}</span>
                        </span>
                        <span className="mt-1 block text-[11px] leading-5 text-kaghaz/60">{d.text}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onCodex}
                className="group flex cursor-pointer flex-col items-start gap-1 rounded-xl border border-kaghaz/10 bg-night-950/60 p-3 text-right transition-colors hover:border-zar/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zar"
              >
                <span className="flex items-center gap-1.5 text-xs text-kaghaz/55 group-hover:text-zar">
                  <UiIcon name="chest" size={15} />
                  گنجینهٔ یادگارها
                </span>
                <span className="font-display text-2xl leading-none text-zar">
                  {fa(discovered)}
                  <span className="text-base text-kaghaz/40"> / {fa(total)}</span>
                </span>
                <span className="mt-1 h-1 w-full overflow-hidden rounded-full bg-kaghaz/10">
                  <span className="block h-full rounded-full bg-zar" style={{ width: `${(discovered / Math.max(1, total)) * 100}%` }} />
                </span>
              </button>
              <div className="flex flex-col items-start gap-1 rounded-xl border border-kaghaz/10 bg-night-950/60 p-3 text-right">
                <span className="flex items-center gap-1.5 text-xs text-kaghaz/55">
                  <UiIcon name="skull" size={15} />
                  بهترین رکورد
                </span>
                <span dir="ltr" className="font-display text-2xl leading-none text-zar-soft">
                  {mode === "stage" ? (bestStage > PROVING_GROUNDS.duration ? "پیروز" : bestStage > 0 ? faTime(bestStage) : "—") : best > 0 ? faTime(best) : "—"}
                </span>
                <span className="mt-1 text-[10px] text-kaghaz/40">{mode === "stage" ? "میدان آزمایش" : best > 0 ? "زمان بقا در بی‌پایان" : "هنوز دستی بازی نشده"}</span>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onResearch}
                className="group flex min-h-16 cursor-pointer flex-col items-start gap-1 rounded-xl border border-zar/30 bg-zar/5 p-3 text-right transition-colors hover:border-zar/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zar"
              >
                <span className="text-xs text-kaghaz/60 group-hover:text-zar">پژوهش · طلا</span>
                <span className="font-display text-2xl leading-none text-zar tabular-nums">{fa(gold)}</span>
              </button>
              <button
                type="button"
                role="switch"
                aria-checked={reducedFx}
                onClick={() => onReducedFx(!reducedFx)}
                className="flex min-h-16 cursor-pointer flex-col items-start gap-1 rounded-xl border border-kaghaz/10 bg-night-950/60 p-3 text-right focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zar"
              >
                <span className="text-xs text-kaghaz/60">جلوه‌های کمتر</span>
                <span className="flex items-center gap-2 text-sm text-kaghaz">
                  <span className={`relative h-5 w-9 rounded-full transition-colors ${reducedFx ? "bg-firoozeh" : "bg-kaghaz/20"}`}>
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${reducedFx ? "right-0.5" : "right-4.5"}`} />
                  </span>
                  {reducedFx ? "روشن — برای گوشی‌های ضعیف" : "خاموش"}
                </span>
              </button>
            </section>

            <section className="rounded-sm border border-kaghaz/10 bg-night-950/60 p-4 text-right">
              <h2 className="mb-2.5 flex items-center gap-2 font-display text-xl text-kaghaz/90">
                راهنما
                <span className="h-px flex-1 bg-kaghaz/10" />
              </h2>
              <ul className="grid gap-2 text-xs leading-5 text-kaghaz/70">
                <li className="flex items-center gap-3">
                  <span dir="ltr" className="flex shrink-0 gap-1">
                    <Keycap>W</Keycap>
                    <Keycap>A</Keycap>
                    <Keycap>S</Keycap>
                    <Keycap>D</Keycap>
                  </span>
                  حرکت؛ در گوشی انگشتت را روی صفحه بکش
                </li>
                <li className="flex items-center gap-3">
                  <Keycap>Space</Keycap>
                  <span>
                    <span className="font-bold text-zar">فرّ ایزدی</span> — همه‌ی دشمنان پیرامون را یخ می‌زند
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <Keycap>Esc</Keycap>
                  مکث، و دیدن افسون‌ها و یادگارها
                </li>
                <li className="flex items-start gap-3 border-t border-kaghaz/8 pt-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rotate-45 bg-anar" aria-hidden="true" />
                  افسون‌ها خودشان شلیک می‌شوند؛ تو جاخالی بده، گوهر جمع کن و صندوق‌ها را دنبال کن.
                </li>
              </ul>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

/* --------------------------------------------------------- shared pieces */

function Build({ s }: { s: Snapshot }) {
  const items = [...s.spells, ...s.passives];
  if (!items.length) return null;
  return (
    <ul className="mt-5 flex flex-wrap justify-center gap-2">
      {items.map((it) => {
        const def = UPGRADES[it.id];
        return (
          <li
            key={it.id}
            className="flex items-center gap-1.5 rounded-sm border border-kaghaz/12 bg-night-950/60 py-1 pl-2.5 pr-2 text-xs text-kaghaz/85"
          >
            <span style={{ color: def.color }}>
              <UpgradeIcon id={it.id} size={15} />
            </span>
            <span>{def.name}</span>
            <span className={`font-bold tabular-nums ${it.lvl >= def.max ? "text-zar" : "text-kaghaz/55"}`}>{fa(it.lvl)}</span>
          </li>
        );
      })}
    </ul>
  );
}

function Stat({ label, value, ltr, color }: { label: string; value: string; ltr?: boolean; color?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-2 py-1">
      <dd dir={ltr ? "ltr" : undefined} className="text-2xl font-black leading-none tabular-nums sm:text-3xl" style={{ color: color ?? "#f4ecd8" }}>
        {value}
      </dd>
      <dt className="text-xs text-kaghaz/55">{label}</dt>
    </div>
  );
}

/* ----------------------------------------------------------------- pause */

export function Pause({
  s,
  discovered,
  onFusionFocus,
  onResume,
  onRestart,
  onMenu,
}: {
  s: Snapshot;
  discovered: ArtifactId[];
  onFusionFocus?: (id: FusionId | null) => void;
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
}) {
  const hpPct = Math.round((s.hp / s.maxHp) * 100);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
      className="app-safe-dialog absolute inset-0 flex animate-fade flex-col items-center overflow-y-auto bg-night-950/78 px-3 py-5 backdrop-blur-[3px] sm:px-4 sm:py-6"
    >
      <div className="pause-shell my-auto w-full max-w-3xl animate-rise px-4 py-5 text-center sm:px-7 sm:py-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-3 text-right">
            <span
              className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full border-2 bg-night-950/80"
              style={{ borderColor: `rgb(${BY_HERO[s.hero].palette.glow})`, boxShadow: `0 0 22px -8px rgb(${BY_HERO[s.hero].palette.glow})` }}
            >
              <HeroPortrait hero={s.hero} crop="face" size={56} tier={tierOf(s.level)} />
            </span>
            <div>
              <h2 id="pause-title" className="font-display text-4xl leading-tight text-zar sm:text-5xl">
                مکث
              </h2>
              <p className="text-xs text-kaghaz/55">
                <span className="font-bold" style={{ color: `rgb(${BY_HERO[s.hero].palette.glow})` }}>
                  {BY_HERO[s.hero].name}
                </span>{" "}
                · {BY_HERO[s.hero].title} · دیوان هم نفسی تازه می‌کنند.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-sm border border-kaghaz/12 bg-night-950/60 px-3 py-1.5 text-right">
            <span className="text-[11px] text-kaghaz/50">سختی</span>
            <span className="font-display text-base" style={{ color: DIFFICULTY.find((d) => d.id === s.difficulty)?.color }}>
              {DIFFICULTY.find((d) => d.id === s.difficulty)?.name}
            </span>
            {s.difficulty === "adaptive" && (
              <span className="border-r border-kaghaz/15 pr-2 text-[11px] text-kaghaz/50">
                فشار <span className="font-bold tabular-nums text-zar-soft">{fa(s.pressure)}٪</span>
              </span>
            )}
          </div>
        </div>

        {/* Keep the primary pause actions above the long spell book on phones. */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-[2fr_1fr_1fr]">
          <button type="button" onClick={onResume} className={`${primaryBtn} col-span-2 sm:col-span-1`}>
            <UiIcon name="play" size={20} />
            ادامه · آماده‌باش ۳ ثانیه‌ای
          </button>
          <button type="button" onClick={onRestart} className={ghostBtn}>
            <UiIcon name="restart" size={18} />
            از نو
          </button>
          <button type="button" onClick={onMenu} className={ghostBtn}>
            <UiIcon name="home" size={18} />
            منوی اصلی
          </button>
        </div>

        {/* Combat stats and complete build are accessible here, never on the arena. */}
        <section className="mt-4 grid grid-cols-4 gap-1.5 rounded-xl border border-kaghaz/10 bg-night-950/45 p-2 text-center" aria-label="خلاصهٔ دست">
          <div><span className="block font-display text-xl text-firoozeh">{fa(s.level)}</span><span className="text-[10px] text-kaghaz/55">سطح</span></div>
          <div><span className="block font-display text-xl text-kaghaz">{fa(s.spells.length)}</span><span className="text-[10px] text-kaghaz/55">افسون</span></div>
          <div><span className="block font-display text-xl text-zar-soft">{fa(s.artifacts.length)}</span><span className="text-[10px] text-kaghaz/55">یادگار</span></div>
          <div><span className="block font-display text-xl text-[#c4a3ff]">{fa(s.fusions.length)}</span><span className="text-[10px] text-kaghaz/55">ترکیب</span></div>
        </section>

        <details className="menu-panel mt-3 px-3 py-2 text-right">
          <summary className="flex min-h-9 cursor-pointer items-center justify-between font-display text-base text-kaghaz/75 focus-visible:outline-2 focus-visible:outline-zar">
            <span>آمار نبرد و توانایی‌ها</span>
            <span className="text-xs text-firoozeh">نمایش جزئیات ⌄</span>
          </summary>
        <section className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-kaghaz/10 bg-night-950/35 p-3 text-right sm:grid-cols-4" aria-label="آمار کنونی">
          <Row icon={<UiIcon name="skull" size={14} />} label="دیوِ کشته" value={fa(s.kills)} />
          <Row icon={<span className="text-anar">♥</span>} label="جان" value={`${fa(s.hp)}/${fa(s.maxHp)}`} color={hpPct < 30 ? "#ff7488" : "#83eab3"} />
          <Row icon={<span className="text-zar">✦</span>} label="فرّ" value={`${fa(Math.round(s.ult))}٪`} color="#f2b84b" />
          <Row icon={<span className="text-firoozeh">◇</span>} label="جان دوم" value={fa(s.wind)} color="#3fd9c8" />
          <Row icon={<span className="text-zar">◆</span>} label="قدرت افسون" value={`×${fa(s.combatStats.damage.toFixed(2))}`} />
          <Row icon={<span className="text-firoozeh">◷</span>} label="زمان بازیابی" value={`×${fa(s.combatStats.cooldown.toFixed(2))}`} />
          <Row icon={<span className="text-firoozeh">↗</span>} label="سرعت حرکت" value={fa(Math.round(s.combatStats.moveSpeed))} />
          <Row icon={<span className="text-zar">✧</span>} label="ضریب تجربه" value={`×${fa(s.combatStats.mana.toFixed(2))}`} />
        </section>
        </details>

        {/* build */}
        <div className="mt-4 text-right">
          <Codex s={s} discovered={discovered} onFusionFocus={onFusionFocus} />
        </div>

      </div>
    </div>
  );
}

/* ------------------------------------------------------------- game over */

export function GameOver({
  s,
  record,
  best,
  victory,
  gold,
  wallet,
  onRestart,
  onMenu,
}: {
  s: Snapshot;
  record: boolean;
  best: number;
  victory: boolean;
  gold: number;
  wallet: number;
  onRestart: () => void;
  onMenu: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="over-title"
      className="app-safe-dialog absolute inset-0 flex animate-fade flex-col items-center overflow-y-auto bg-night-950/80 px-4 py-6 backdrop-blur-[2px]"
    >
      <div className="frame my-auto w-full max-w-lg animate-rise rounded-sm px-6 py-8 text-center sm:px-10">
        <div className={`mx-auto -mt-2 mb-1 w-fit ${victory ? "animate-float" : "opacity-80 grayscale-[55%]"}`}>
          <HeroPortrait hero={s.hero} size={88} tier={victory ? 3 : tierOf(s.level)} />
        </div>
        {victory ? (
          <>
            <p className="text-sm text-firoozeh">نگهبانِ میدان از پای درآمد</p>
            <h2 id="over-title" className="title-glow font-display text-5xl leading-tight text-zar">
              پیروزی!
            </h2>
            <p className="mt-1 text-sm text-kaghaz/75">{BY_HERO[s.hero].name} «میدان آزمایش» را با سربلندی پشت سر گذاشت.</p>
          </>
        ) : (
          <>
            <p className="text-sm text-anar">شب پیروز شد</p>
            <h2 id="over-title" className="font-display text-4xl leading-tight text-kaghaz sm:text-5xl">
              {BY_HERO[s.hero].name} از پای افتاد
            </h2>
            {s.mode === "stage" && (
              <p className="mt-1 text-sm text-kaghaz/60">
                {fa(s.wavesCleared)} موج از {fa(s.totalWaves)} پشت سر گذاشته شد.
              </p>
            )}
          </>
        )}
        <Ornament />

        <dl className="grid grid-cols-3 divide-x divide-kaghaz/10">
          <Stat label="زمان بقا" value={faTime(s.mode === "stage" ? s.clock : s.time)} ltr />
          <Stat label="دیوِ کشته" value={fa(s.kills)} />
          <Stat label="سطح" value={fa(s.level)} />
        </dl>

        <div className="mx-auto mt-5 flex w-fit items-center gap-3 rounded-sm border border-zar/40 bg-zar/10 px-4 py-2">
          <span className="text-sm text-kaghaz/75">طلای این دست</span>
          <span className="font-display text-2xl leading-none text-zar tabular-nums">+{fa(gold)}</span>
          <span className="border-r border-kaghaz/15 pr-3 text-xs text-kaghaz/55">کیسه: {fa(wallet)}</span>
        </div>

        {record ? (
          <p className="mx-auto mt-5 inline-block rounded-sm bg-zar/15 px-4 py-1.5 font-display text-xl text-zar">رکورد تازه!</p>
        ) : (
          <p className="mt-5 text-sm text-kaghaz/60">
            بهترین رکورد:{" "}
            <span dir="ltr" className="font-bold tabular-nums text-zar-soft">
              {faTime(best)}
            </span>
          </p>
        )}

        {s.boons.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-1.5 text-xs text-kaghaz/55">جایزه‌های سطح</h3>
            <ul className="flex flex-wrap justify-center gap-1.5">
              {s.boons.map((b) => {
                const def = BY_BOON[b.id];
                return (
                  <li key={b.id} className="rounded-full border border-zar/30 bg-zar/10 px-2.5 py-0.5 text-xs" style={{ color: def.color }}>
                    {def.name} {b.count > 1 && <span className="tabular-nums">×{fa(b.count)}</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <Build s={s} />

        {s.artifacts.length > 0 && (
          <div className="mt-5 text-right">
            <h3 className="mb-2 text-center font-display text-xl text-zar">گنجینهٔ این دست</h3>
            <ul className="flex flex-wrap justify-center gap-2">
              {s.artifacts.map((id) => {
                const a = BY_ID[id];
                return (
                  <li
                    key={id}
                    title={a.text}
                    className="flex items-center gap-1.5 rounded-sm border border-zar/30 bg-night-950/60 px-2.5 py-1 text-xs text-kaghaz/85"
                  >
                    <span style={{ color: a.color }}>
                      <ArtifactIcon id={a.id} size={15} />
                    </span>
                    {a.name}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="mt-7 flex flex-col gap-3 sm:flex-row-reverse sm:justify-center">
          <button type="button" onClick={onRestart} className={`${primaryBtn} sm:flex-1`}>
            دوباره
          </button>
          <button type="button" onClick={onMenu} className={ghostBtn}>
            <UiIcon name="home" size={18} />
            منوی اصلی
          </button>
        </div>
      </div>
    </div>
  );
}