import type { ReactNode } from "react";
import type { ArtifactId } from "../game/artifacts";
import { BY_ID } from "../game/artifacts";
import { Codex } from "./Codex";
import { UPGRADES } from "../game/data";
import type { Snapshot } from "../game/engine";
import { BY_BOON } from "../game/boons";
import type { FusionId } from "../game/talents";
import { fa, faTime } from "../game/fa";
import { ArtifactIcon, UiIcon, UpgradeIcon } from "./Icons";
import { HeroPortrait } from "./HeroPortrait";
import { BY_HERO } from "../game/heroes";
export { Menu } from "./CinematicMenu";

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