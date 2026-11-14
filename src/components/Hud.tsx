import { BY_ID } from "../game/artifacts";
import { BY_HERO } from "../game/heroes";
import { HeroPortrait } from "./HeroPortrait";
import { UPGRADES } from "../game/data";
import type { Snapshot } from "../game/engine";
import { fa, faTime } from "../game/fa";
import { ArtifactIcon, UiIcon, UpgradeIcon } from "./Icons";

interface Props {
  s: Snapshot;
  muted: boolean;
  onPause: () => void;
  onMute: () => void;
  onUlt: () => void;
}

const iconBtn =
  "pointer-events-auto grid h-11 w-11 place-items-center rounded-md border border-kaghaz/15 bg-night-950/70 text-kaghaz/85 backdrop-blur-sm transition-colors hover:border-zar/60 hover:text-zar focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zar active:bg-night-800";

export function Hud({ s, muted, onPause, onMute, onUlt }: Props) {
  const xpPct = Math.min(100, (s.xp / s.xpNeed) * 100);
  const hpPct = Math.max(0, Math.min(100, (s.hp / s.maxHp) * 100));
  const lowHp = hpPct < 30;
  const ultPct = Math.max(0, Math.min(100, s.ult));
  const ultReady = ultPct >= 100;

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      {/* experience */}
      <div className="relative" role="progressbar" aria-label="تجربه" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(xpPct)}>
        <div className="relative h-4 w-full bg-night-950/85">
          <div className="h-full bg-firoozeh/85 transition-[width] duration-150 ease-out" style={{ width: `${xpPct}%` }} />
          {/* experience number, right in the top bar */}
          <span className="absolute inset-0 flex items-center justify-center gap-1 text-[10px] font-bold leading-none text-kaghaz drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            <span>تجربه</span>
            <span dir="ltr" className="tabular-nums">
              {fa(Math.floor(s.xp))} / {fa(s.xpNeed)}
            </span>
          </span>
        </div>
      </div>

      <div
        className="grid grid-cols-[1fr_auto_1fr] items-start gap-2 px-3 pt-2.5 sm:px-5"
        style={{ paddingInline: "max(0.75rem, env(safe-area-inset-left))" }}
      >
        {/* level + health */}
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <span
              className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border-2 bg-night-950/80 sm:h-10 sm:w-10"
              style={{ borderColor: `rgb(${BY_HERO[s.hero].palette.glow})` }}
              title={`${BY_HERO[s.hero].name} — ${BY_HERO[s.hero].title}`}
            >
              <HeroPortrait hero={s.hero} crop="face" size={36} tier={s.level >= 30 ? 3 : s.level >= 20 ? 2 : s.level >= 10 ? 1 : 0} />
            </span>
            <span className="text-xs text-kaghaz/60">سطح</span>
            <span className="font-display text-2xl leading-none text-firoozeh">{fa(s.level)}</span>
          </div>
          <div className="w-24 sm:w-44">
            <div className="h-2.5 overflow-hidden rounded-full bg-night-950/85 ring-1 ring-kaghaz/10">
              <div
                className={`h-full rounded-full transition-[width] duration-150 ${lowHp ? "animate-pulse-soft bg-anar" : "bg-[#ff6b78]"}`}
                style={{ width: `${hpPct}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-kaghaz/60">
              <span>جان</span>
              <span dir="ltr" className="tabular-nums">
                {fa(s.hp)} / {fa(s.maxHp)}
              </span>
            </div>
            {s.gemsPerSec > 0 && (
              <span className="w-fit rounded-full bg-firoozeh/10 px-2 py-px text-[10px] leading-4 text-firoozeh/90" title="گوهرهای جمع‌آوری‌شده در ثانیهٔ گذشته">
                +{fa(s.gemsPerSec)} گوهر/ث
              </span>
            )}
            {s.wind > 0 && (
              <div className="mt-1 flex w-fit items-center gap-1 rounded-full border border-zar/50 bg-zar/10 px-2 py-0.5 text-[11px] text-zar-soft">
                <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-zar" aria-hidden="true" />
                جانِ دوم{s.wind > 1 ? ` ×${fa(s.wind)}` : " آماده است"}
              </div>
            )}
          </div>
        </div>

        {/* timer + boss */}
        <div className="flex flex-col items-center">
          <div dir="ltr" className="text-2xl font-black leading-none tabular-nums text-kaghaz drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] sm:text-4xl">
            {faTime(s.clock)}
          </div>
          <div className="mt-1.5 flex items-center gap-1 text-xs text-kaghaz/65">
            <UiIcon name="skull" size={14} />
            <span className="sr-only">دیوان کشته‌شده</span>
            <span className="tabular-nums">{fa(s.kills)}</span>
          </div>
          {s.boss !== null && s.mode === "endless" && (
            <div className="mt-2 w-36 animate-fade sm:w-64">
              <div className="mb-1 text-center font-display text-base leading-none text-anar">دیو سپید</div>
              <div className="h-2 overflow-hidden rounded-full bg-night-950/85 ring-1 ring-anar/40">
                <div className="h-full bg-anar transition-[width] duration-150" style={{ width: `${s.boss * 100}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* controls */}
        <div className="flex justify-end gap-2">
          <button type="button" className={iconBtn} onClick={onMute} aria-label={muted ? "روشن کردن صدا" : "خاموش کردن صدا"}>
            <UiIcon name={muted ? "mute" : "sound"} />
          </button>
          <button type="button" className={iconBtn} onClick={onPause} aria-label="مکث">
            <UiIcon name="pause" />
          </button>
        </div>
      </div>

      {/* stage: wave objective, danger boundary, boss health */}
      {s.mode === "stage" && (
        <div className="mx-auto mt-2 w-[min(92vw,22rem)] text-center">
          {s.wave ? (
            <div
              className={`animate-fade rounded-sm border px-3 py-2 backdrop-blur-sm ${
                s.wave.outside ? "animate-pulse-soft border-anar bg-anar/20" : "border-anar/40 bg-night-950/75"
              }`}
              role="status"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-display text-base leading-tight text-anar">{s.wave.name}</span>
                {s.wave.kind === "boss" && <span className="shrink-0 text-[11px] text-kaghaz/70">فاز {fa(s.wave.bossPhase)}</span>}
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-kaghaz/75">
                <span>{s.wave.kind === "boss" ? "جانِ نگهبان" : s.wave.goal}</span>
                {s.wave.kind !== "boss" && (
                  <span dir="ltr" className="font-bold tabular-nums">
                    {fa(Math.min(s.wave.current, s.wave.target))} / {fa(s.wave.target)}
                  </span>
                )}
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-night-950/90 ring-1 ring-anar/30">
                <div
                  className={`h-full rounded-full transition-[width] duration-150 ${s.wave.kind === "boss" ? "bg-anar" : "bg-zar"}`}
                  style={{ width: `${(s.wave.kind === "boss" ? 1 - s.wave.progress : s.wave.progress) * 100}%` }}
                />
              </div>
              {s.wave.warning && (
                <p role="alert" className="mt-1.5 rounded-sm bg-anar/25 px-2 py-1 text-[11px] font-bold leading-4 text-[#ffe4df]">
                  {s.wave.warning.kind === "circle" ? "زمینِ نشان‌دار در آستانهٔ انفجار است" :
                    s.wave.warning.kind === "line" ? "از مسیر تیرهای نگهبان کنار برو" : "از موجِ حلقه‌ای نگهبان فاصله بگیر"}
                  <span dir="ltr" className="mr-1 inline-block tabular-nums text-white">
                    {fa((Math.ceil(s.wave.warning.remaining * 10) / 10).toFixed(1))} ث
                  </span>
                </p>
              )}
              {s.wave.outside && <p className="mt-1 text-xs font-bold text-anar">بیرون از حلقه‌ای! به درون بازگرد</p>}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-[11px] text-kaghaz/70">
              <span className="flex gap-1" aria-label={`${fa(s.wavesCleared)} موج از ${fa(s.totalWaves)}`}>
                {Array.from({ length: s.totalWaves }, (_, i) => (
                  <span key={i} className={`h-2 w-2 rotate-45 ${i < s.wavesCleared ? "bg-zar" : "bg-kaghaz/25"}`} />
                ))}
              </span>
              {s.nextWaveAt !== null && (
                <span>
                  موج بعد در <span dir="ltr" className="font-bold tabular-nums text-zar-soft">{faTime(Math.max(0, s.nextWaveAt - s.clock))}</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ultimate — the signature move */}
      <div className="mt-auto flex items-end justify-between gap-3 px-3 sm:px-5">
        {s.combo > 1 ? (
          <div className="animate-fade rounded-full border border-zar/70 bg-zar/15 px-3 py-0.5 font-display text-xl leading-none text-zar-soft drop-shadow-[0_0_14px_rgba(242,184,75,0.45)]">
            <span className="font-bold">کمبو</span>
            <span className="ml-1 font-black tabular-nums">{fa(s.combo)}×</span>
          </div>
        ) : (
          <span className="text-[11px] leading-4 text-kaghaz/50">
            {ultReady ? "برای رها کردن فرّ، Space یا دکمه را بزن" : "با کشتن دیوان، فرّ را پر کن"}
          </span>
        )}

        <div className="flex items-end gap-2">
          {s.actives.length > 0 && (
            <div className="mb-1 flex gap-1.5">
              {s.actives.map((a) => (
                <span
                  key={a.id}
                  title={`${a.label}${a.ready >= 1 ? " — آماده" : ""}`}
                  className="relative grid h-10 w-10 place-items-center rounded-md border border-kaghaz/15 bg-night-950/70 text-kaghaz/80 backdrop-blur-sm"
                >
                  <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
                    <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(244,236,216,0.12)" strokeWidth="2.5" />
                    <circle
                      cx="20"
                      cy="20"
                      r="17"
                      fill="none"
                      stroke={a.ready >= 1 ? "#f2b84b" : "#3fd9c8"}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray={`${a.ready * 106.8} 106.8`}
                      className="transition-[stroke-dasharray] duration-150"
                    />
                  </svg>
                  <span className="relative text-[10px] font-bold leading-none">{a.label}</span>
                </span>
              ))}
            </div>
          )}

          {s.artifacts.length > 0 && (
            <div className="mb-1 flex max-w-[38vw] flex-wrap justify-end gap-1.5 sm:max-w-none">
              {s.artifacts.map((id) => {
                const a = BY_ID[id];
                return (
                  <span
                    key={id}
                    title={`${a.name} — ${a.text}`}
                    className={`grid h-10 w-10 place-items-center rounded-md border bg-night-950/70 backdrop-blur-sm ${
                      a.rarity === "legendary" ? "border-zar/70" : a.rarity === "rare" ? "border-firoozeh/60" : "border-kaghaz/20"
                    }`}
                    style={{ color: a.color }}
                  >
                    <ArtifactIcon id={a.id} size={20} />
                  </span>
                );
              })}
            </div>
          )}

        <button
          type="button"
          onClick={onUlt}
          disabled={!ultReady}
          aria-label={ultReady ? "رها کردن فرّ ایزدی" : `شارژ فرّ ایزدی: ${fa(ultPct)} درصد`}
          className={`pointer-events-auto relative grid h-16 w-16 shrink-0 place-items-center rounded-full border-2 transition-all duration-200 ${
            ultReady
              ? "animate-pulse-soft cursor-pointer border-zar bg-zar/25 text-zar-soft shadow-[0_0_28px_rgba(242,184,75,0.5)] hover:scale-105 active:scale-95"
              : "border-kaghaz/20 bg-night-950/70 text-kaghaz/70"
          }`}
        >
          {/* charge ring */}
          <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
            <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(244,236,216,0.12)" strokeWidth="3" />
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke={ultReady ? "#ffe9b0" : "#f2b84b"}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${(ultPct / 100) * 175.9} 175.9`}
              className="transition-[stroke-dasharray] duration-150"
            />
          </svg>
          <span className="relative flex flex-col items-center leading-none">
            <span className="font-display text-xl">فرّ</span>
            <span className="mt-0.5 text-[10px] tabular-nums">{ultReady ? "آماده" : `${fa(ultPct)}٪`}</span>
          </span>
        </button>
        </div>
      </div>

      {/* owned spells and abilities */}
      <div
        className="mt-2 flex flex-wrap items-end gap-1.5 px-3 pb-3 sm:px-5"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        {s.spells.map((sp) => (
          <Chip key={sp.id} id={sp.id} lvl={sp.lvl} />
        ))}
        {s.passives.length > 0 && <span className="mx-1 h-6 w-px self-center bg-kaghaz/15" />}
        {s.passives.map((ps) => (
          <Chip key={ps.id} id={ps.id} lvl={ps.lvl} small />
        ))}
      </div>
    </div>
  );
}

function Chip({ id, lvl, small }: { id: keyof typeof UPGRADES; lvl: number; small?: boolean }) {
  const def = UPGRADES[id];
  const maxed = lvl >= def.max;
  return (
    <span
      className={`relative grid place-items-center rounded-md border bg-night-950/70 backdrop-blur-sm ${
        small ? "h-8 w-8" : "h-10 w-10"
      } ${maxed ? "border-zar/70" : "border-kaghaz/15"}`}
      style={{ color: def.color }}
      title={`${def.name} — سطح ${fa(lvl)}`}
    >
      <UpgradeIcon id={id} size={small ? 16 : 20} />
      <span className="absolute -bottom-1.5 -left-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-night-800 px-0.5 text-[10px] font-bold leading-none text-kaghaz ring-1 ring-kaghaz/20">
        {fa(lvl)}
      </span>
      {maxed && (
        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-anar text-[10px] font-bold text-night-950 flex place-items-center" aria-label="حداکثر سطح">
          ★
        </span>
      )}
    </span>
  );
}
