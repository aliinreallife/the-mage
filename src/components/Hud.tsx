import type { Snapshot } from "../game/engine";
import { fa, faTime } from "../game/fa";
import { UiIcon } from "./Icons";

interface Props {
  s: Snapshot;
  muted: boolean;
  onPause: () => void;
  onMute: () => void;
  onUlt: () => void;
}

const iconBtn =
  "pointer-events-auto grid h-11 w-11 place-items-center rounded-xl border border-kaghaz/15 bg-[#080d22]/85 text-kaghaz/85 shadow-[0_6px_22px_rgba(0,0,0,0.25)] backdrop-blur-md transition-colors hover:border-zar/50 hover:text-zar focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zar";

/** Combat-only status: spells, artifacts, levels and all build details live in Pause. */
export function Hud({ s, muted, onPause, onMute, onUlt }: Props) {
  const xpPct = Math.max(0, Math.min(100, (s.xp / Math.max(1, s.xpNeed)) * 100));
  const hpPct = Math.max(0, Math.min(100, (s.hp / Math.max(1, s.maxHp)) * 100));
  const ultPct = Math.max(0, Math.min(100, s.ult));
  const ultReady = ultPct >= 100;
  const danger = hpPct < 30;
  const wave = s.wave;

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      {/* A fine progress line provides feedback without another number or card. */}
      <div className="h-[3px] w-full bg-night-950/70" role="progressbar" aria-label="پیشرفت تجربه" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(xpPct)}>
        <div className="h-full bg-firoozeh/75 transition-[width] duration-200" style={{ width: `${xpPct}%` }} />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2 px-3 pt-3 sm:px-5" style={{ paddingInline: "max(0.75rem, env(safe-area-inset-left))" }}>
        {/* Right: just life, deliberately no permanent hero/level inventory. */}
        <div className="min-w-0 max-w-36 rounded-xl border border-kaghaz/10 bg-[#080d22]/65 px-2.5 py-2 shadow-[0_7px_20px_rgba(0,0,0,0.16)] backdrop-blur-md sm:max-w-44">
          <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] text-kaghaz/65">
            <span>جان</span>
            <span dir="ltr" className="font-bold tabular-nums text-kaghaz/90">{fa(s.hp)} / {fa(s.maxHp)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-kaghaz/10" role="progressbar" aria-label="جان" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(hpPct)}>
            <div className={`h-full rounded-full transition-[width] duration-150 ${danger ? "bg-anar" : "bg-[#ff7888]"}`} style={{ width: `${hpPct}%` }} />
          </div>
          {s.wind > 0 && <span className="mt-1.5 block text-[10px] text-zar-soft">✦ جان دوم {s.wind > 1 ? `×${fa(s.wind)}` : "آماده"}</span>}
        </div>

        {/* Center: clock and one concise situational line. */}
        <div className="flex max-w-[36vw] min-w-0 flex-col items-center rounded-xl bg-[#080d22]/30 px-2 py-1.5 text-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.75)]">
          <span dir="ltr" className="font-display text-[clamp(1.25rem,5vw,2rem)] leading-none tabular-nums text-kaghaz">{faTime(s.clock)}</span>
          <span className="mt-1 truncate text-[10px] text-kaghaz/65 sm:text-xs">
            {wave ? wave.name : s.nextWaveAt !== null ? `موج بعد در ${faTime(Math.max(0, s.nextWaveAt - s.clock))}` : s.mode === "endless" ? "شب بی‌پایان" : "میان موج‌ها"}
          </span>
        </div>

        {/* Left: smaller touch-safe controls. */}
        <div className="flex justify-end gap-1.5">
          <button type="button" className={iconBtn} onClick={onMute} aria-label={muted ? "روشن کردن صدا" : "خاموش کردن صدا"}>
            <UiIcon name={muted ? "mute" : "sound"} size={18} />
          </button>
          <button type="button" className={iconBtn} onClick={onPause} aria-label="مکث">
            <UiIcon name="pause" size={19} />
          </button>
        </div>
      </div>

      {/* Objective only while a wave is active; dangerous telegraphs remain prominent. */}
      {wave && s.mode === "stage" && (
        <div role="status" className="mx-auto mt-2 w-fit max-w-[min(90vw,23rem)] rounded-full border border-kaghaz/12 bg-[#080d22]/75 px-3 py-1.5 text-center text-[11px] leading-5 text-kaghaz/80 backdrop-blur-md">
          <span className="font-bold text-kaghaz">{wave.kind === "boss" ? "جانِ نگهبان" : wave.goal}</span>
          <span className="mx-1.5 text-kaghaz/30">·</span>
          <span className="tabular-nums text-zar-soft">{wave.kind === "boss" ? `${fa(Math.round((1 - wave.progress) * 100))}٪` : `${fa(Math.min(wave.current, wave.target))} / ${fa(wave.target)}`}</span>
        </div>
      )}
      {s.mode === "stage" && wave?.warning && (
        <div role="alert" className="mx-auto mt-2 max-w-[92vw] rounded-xl border border-anar/45 bg-[#311320]/90 px-3 py-2 text-center text-xs font-bold text-[#ffe4df] shadow-lg">
          {wave.warning.kind === "circle" ? "زمینِ نشان‌دار در آستانهٔ انفجار است" : wave.warning.kind === "line" ? "از مسیر تیرهای نگهبان کنار برو" : "از موجِ حلقه‌ای نگهبان فاصله بگیر"}
          <span dir="ltr" className="mr-2 inline-block tabular-nums">{fa((Math.ceil(wave.warning.remaining * 10) / 10).toFixed(1))} ث</span>
        </div>
      )}
      {s.mode === "stage" && wave?.outside && <p role="alert" className="mx-auto mt-1 rounded-lg bg-anar/80 px-3 py-1 text-xs font-bold text-white">بیرون از حلقه‌ای! به درون بازگرد</p>}
      {s.boss !== null && s.mode === "endless" && (
        <div className="mx-auto mt-2 w-44 rounded-xl border border-anar/30 bg-night-950/70 px-2.5 py-2 text-center sm:w-56">
          <p className="text-xs text-[#ff9fac]">دیو سپید</p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-kaghaz/10"><div className="h-full rounded-full bg-anar" style={{ width: `${s.boss * 100}%` }} /></div>
        </div>
      )}

      {/* The only persistent bottom action is the actual gameplay ability. */}
      <div className="mt-auto flex items-end justify-between gap-3 px-3 sm:px-5" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <div aria-live="off" className="mb-2 min-w-0 text-[11px] text-kaghaz/55">
          {s.combo > 1 && <span className="rounded-full border border-zar/35 bg-night-950/75 px-2.5 py-1 font-display text-lg text-zar-soft">کمبو ×{fa(s.combo)}</span>}
        </div>
        <button
          type="button"
          onClick={onUlt}
          disabled={!ultReady}
          aria-label={ultReady ? "رها کردن فرّ ایزدی" : `شارژ فرّ ایزدی: ${fa(ultPct)} درصد`}
          className={`pointer-events-auto relative grid h-16 w-16 shrink-0 place-items-center rounded-full border-2 shadow-[0_10px_28px_rgba(0,0,0,0.35)] transition-all ${ultReady ? "animate-pulse-soft cursor-pointer border-zar bg-[#362719]/95 text-zar-soft active:scale-95" : "border-kaghaz/20 bg-[#080d22]/85 text-kaghaz/70"}`}
        >
          <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(244,236,216,0.10)" strokeWidth="3" />
            <circle cx="32" cy="32" r="28" fill="none" stroke={ultReady ? "#ffe9b0" : "#f2b84b"} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(ultPct / 100) * 175.9} 175.9`} />
          </svg>
          <span className="relative flex flex-col items-center leading-none"><span className="font-display text-xl">فرّ</span><span className="mt-0.5 text-[10px] tabular-nums">{ultReady ? "آماده" : `${fa(ultPct)}٪`}</span></span>
        </button>
      </div>
    </div>
  );
}