import { useState } from "react";
import { ARTIFACTS, BY_ID, RARITY, RARITY_ORDER, setProgress, type ArtifactId } from "../game/artifacts";
import { FUSIONS, FUSION_IDS, MASTERIES, MASTERY_LEVEL, TALENT_LEVEL, TALENTS, recipePath, type FusionId, type MagicView } from "../game/talents";
import { BY_BOON } from "../game/boons";
import { UPGRADES, type SpellId } from "../game/data";
import type { Snapshot } from "../game/engine";
import { fa } from "../game/fa";
import { ArtifactIcon, StarBadge, UiIcon, UpgradeIcon } from "./Icons";

const ORDER = RARITY_ORDER;

interface Props {
  /** the live run, when there is one */
  s?: Snapshot;
  /** every artifact the player has ever found, across runs */
  discovered: ArtifactId[];
  initialTab?: "build" | "arts";
  /** hide the build tab when there is no run to inspect */
  buildTab?: boolean;
  /** Pause-menu action: choose which recipe's next upgrade should be offered. */
  onFusionFocus?: (id: FusionId | null) => void;
}

export function Codex({ s, discovered, initialTab = "build", buildTab = true, onFusionFocus }: Props) {
  const [tab, setTab] = useState<"build" | "arts">(buildTab ? initialTab : "arts");
  const found = new Set(discovered);
  const owned = new Set(s?.artifacts ?? []);
  const foundCount = ARTIFACTS.filter((a) => found.has(a.id)).length;

  return (
    <div className="flex w-full flex-col">
      {buildTab && (
        <div role="tablist" aria-label="بخش‌های کتابچه" className="mx-auto mb-4 flex gap-1 rounded-sm border border-kaghaz/15 bg-night-950/70 p-1">
          <TabButton active={tab === "build"} onClick={() => setTab("build")} label="ساختار افسونگر" icon="book" />
          <TabButton active={tab === "arts"} onClick={() => setTab("arts")} label="یادگارها" icon="chest" />
        </div>
      )}

      {tab === "build" && s ? <BuildPanel s={s} onFusionFocus={onFusionFocus} /> : null}
      {tab === "build" && !s ? <p className="text-center text-sm text-kaghaz/60">هنوز بازی‌ای در جریان نیست.</p> : null}

      {tab === "arts" && (
        <div className="animate-fade">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <p className="text-sm text-kaghaz/70">
              یافته‌ها: <span className="font-display text-xl text-zar">{fa(foundCount)}</span> از {fa(ARTIFACTS.length)}
            </p>
            {s && s.artifacts.length > 0 && (
              <p className="text-xs text-kaghaz/55">
                در این دست: <span className="font-bold text-firoozeh">{fa(s.artifacts.length)}</span>
              </p>
            )}
          </div>
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-night-950/85 ring-1 ring-kaghaz/10">
            <div className="h-full rounded-full bg-zar transition-[width] duration-500" style={{ width: `${(foundCount / ARTIFACTS.length) * 100}%` }} />
          </div>

          <section className="mb-5">
            <h3 className="mb-2 font-display text-xl leading-none text-firoozeh">دست‌های یادگار</h3>
            <ul className="grid gap-2">
              {setProgress(s?.artifacts ?? []).map((prog) => (
                <li key={prog.set.id} className={`rounded-sm border p-2.5 ${prog.complete ? "border-firoozeh/60 bg-firoozeh/10" : "border-kaghaz/12 bg-night-950/60"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-lg text-kaghaz">{prog.set.name}</span>
                    <span className={`text-xs font-bold tabular-nums ${prog.complete ? "text-firoozeh" : "text-kaghaz/55"}`}>
                      {prog.complete ? "فعال ✓" : `${fa(prog.have.length)} / ${fa(prog.set.pieces.length)}`}
                    </span>
                  </div>
                  <p className="text-xs leading-5 text-kaghaz/65">{prog.set.text}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {prog.set.pieces.map((id) => {
                      const has = prog.have.includes(id);
                      const known = found.has(id);
                      return (
                        <span key={id} className={`rounded-full border px-2 py-px text-[11px] ${has ? "border-firoozeh/50 text-firoozeh" : "border-kaghaz/15 text-kaghaz/45"}`}>
                          {has ? "✓ " : ""}
                          {known || has ? BY_ID[id].name : "ناشناخته"}
                        </span>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-[11px] text-kaghaz/45">با کامل شدن یک دست، پاداشش افزوده می‌شود و یادگارها از دست نمی‌روند.</p>
          </section>

          {ORDER.map((rarity) => {
            const list = ARTIFACTS.filter((a) => a.rarity === rarity);
            const known = list.filter((a) => found.has(a.id)).length;
            return (
              <section key={rarity} className="mb-5 last:mb-0">
                <header className="mb-2 flex items-center gap-2">
                  <h3 className="font-display text-xl leading-none" style={{ color: RARITY[rarity].color }}>
                    {RARITY[rarity].name}
                  </h3>
                  <span className="text-xs tabular-nums text-kaghaz/45">
                    {fa(known)} / {fa(list.length)}
                  </span>
                  <span className="h-px flex-1" style={{ background: `linear-gradient(to left, ${RARITY[rarity].color}44, transparent)` }} />
                </header>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {list.map((a) => {
                    const isOwned = owned.has(a.id);
                    const isFound = found.has(a.id);
                    return (
                      <li
                        key={a.id}
                        className={`relative flex items-start gap-3 rounded-sm border p-2.5 transition-colors ${
                          isOwned
                            ? "border-zar/60 bg-zar/10"
                            : isFound
                              ? "border-kaghaz/12 bg-night-950/60"
                              : "border-kaghaz/8 bg-night-950/40"
                        }`}
                      >
                        <span className={isFound ? "" : "opacity-30 grayscale"} style={{ color: a.color }}>
                          <StarBadge color={isFound ? a.color : "#5b6480"} size={40}>
                            <ArtifactIcon id={isFound ? a.id : "ruby"} size={19} />
                          </StarBadge>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-baseline gap-x-2">
                            <span className={`font-display text-lg leading-tight ${isFound ? "text-kaghaz" : "text-kaghaz/35"}`}>
                              {isFound ? a.name : "ناشناخته"}
                            </span>
                            {isOwned && (
                              <span className="rounded-full bg-zar px-2 py-px text-[10px] font-bold text-night-950">در دست تو</span>
                            )}
                          </span>
                          <span className="mt-0.5 block text-xs leading-5 text-kaghaz/65">
                            {isFound ? a.text : "این یادگار را هنوز در صندوقی نیافته‌ای."}
                          </span>
                          {isFound && <span className="mt-1 block text-[10px] text-kaghaz/35">{a.source}</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: "book" | "chest" }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-2 rounded-sm px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zar ${
        active ? "bg-zar text-night-950" : "text-kaghaz/70 hover:bg-night-800 hover:text-kaghaz"
      }`}
    >
      <UiIcon name={icon} size={17} />
      {label}
    </button>
  );
}

/** Every spell and ability the sorcerer carries, with the level it is at. */
function BuildPanel({ s, onFusionFocus }: { s: Snapshot; onFusionFocus?: (id: FusionId | null) => void }) {
  const fused = new Map<SpellId, FusionId>(s.fusions.map((f) => [f.spell, f.fusion]));
  const view: MagicView = {
    level: s.level,
    spellLevel: (sp) => s.spells.find((x) => x.id === sp)?.lvl ?? 0,
    talentOf: (sp) => s.talents.find((x) => x.spell === sp)?.talent,
    fused,
    consumed: new Set(s.fusions.map((f) => FUSIONS[f.fusion].secondary.spell)),
  };
  return (
    <div className="animate-fade space-y-5">
      <section>
        <h3 className="mb-2 font-display text-xl leading-none text-firoozeh">افسون‌ها</h3>
        {s.spells.length === 0 && <p className="text-sm text-kaghaz/55">هنوز افسونی نیاموخته‌ای.</p>}
        <ul className="grid gap-2 sm:grid-cols-2">
          {s.spells.map((sp) => (
            <OwnedRow key={sp.id} id={sp.id} lvl={sp.lvl} />
          ))}
        </ul>
      </section>

      <section aria-label="راهنمای ترکیب">
        <h3 className="mb-1 font-display text-xl leading-none text-firoozeh">مسیر ترکیب</h3>
        <p className="mb-2 text-xs leading-5 text-kaghaz/55">
          برای ترکیب، هر دو افسون باید به سطح {fa(5)} برسند و استعدادِ درست را داشته باشند؛ افسونِ دوم مصرف می‌شود.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {FUSION_IDS.map((id) => {
            const f = FUSIONS[id];
            const path = recipePath(id, view);
            const selected = s.fusionFocus === id;
            const next = path.next;
            return (
              <li key={id} className={`rounded-sm border p-2.5 ${selected ? "border-firoozeh/60 bg-firoozeh/10" : "border-kaghaz/12 bg-night-950/60"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-lg text-kaghaz">{f.name}</span>
                  <span className="text-xs tabular-nums text-firoozeh">{fa(path.matched)} / {fa(4)}</span>
                </div>
                <p className="text-[11px] leading-5 text-kaghaz/65">
                  {[f.primary, f.secondary].map((part, i) => (
                    <span key={part.spell} className="block">
                      {i ? "دوم" : "اصلی"}: {UPGRADES[part.spell].name} {fa(view.spellLevel(part.spell))}/{fa(5)} · {TALENTS[part.talent].name}{view.talentOf(part.spell) === part.talent ? " ✓" : ""}
                    </span>
                  ))}
                </p>
                <p className="mt-1 text-[11px] leading-5 text-zar-soft">
                  {path.status === "complete" ? "این ترکیب ساخته شده است." :
                    path.status === "blocked" ? "این مسیر با استعدادها یا ترکیب‌های فعلی سازگار نیست." :
                    path.status === "slot" ? "مواد آماده‌اند؛ جایگاه ترکیب در سطح ۲۵، ۵۰ یا ۷۵ باز می‌شود." :
                    path.status === "ready" ? "آمادهٔ ترکیب؛ در انتخاب سطح بعد برگزین." :
                    next?.talent ? `گام بعد: استعدادِ ${TALENTS[next.talent].name} را برگزین.` :
                    next ? `گام بعد: ${UPGRADES[next.spell].name} را به سطح ${fa(next.next)} برسان.` : ""}
                </p>
                {onFusionFocus && (selected || path.status === "available" || path.status === "slot" || path.status === "ready") && (
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onFusionFocus(selected ? null : id)}
                    className="mt-2 min-h-11 w-full cursor-pointer rounded-sm border border-firoozeh/40 px-2 text-xs text-firoozeh transition-colors hover:bg-firoozeh/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-firoozeh"
                  >
                    {selected ? "رها کردن مسیر" : `دنبال کردن مسیر «${f.name}»`}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 font-display text-xl leading-none text-zar-soft">توانایی‌ها</h3>
        {s.passives.length === 0 && <p className="text-sm text-kaghaz/55">هنوز توانایی‌ای نگرفته‌ای.</p>}
        <ul className="grid gap-2 sm:grid-cols-2">
          {s.passives.map((ps) => (
            <OwnedRow key={ps.id} id={ps.id} lvl={ps.lvl} />
          ))}
        </ul>
      </section>

      {(s.talents.length > 0 || s.fusions.length > 0 || s.masteries.length > 0) && (
        <section>
          <h3 className="mb-2 font-display text-xl leading-none text-[#b48cff]">استعدادها و ترکیب‌ها</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {s.fusions.map((f) => (
              <li key={f.fusion} className="rounded-sm border border-zar/50 bg-zar/10 p-2.5">
                <span className="block font-display text-base text-zar">{FUSIONS[f.fusion].name}</span>
                <span className="block text-xs leading-5 text-kaghaz/70">{FUSIONS[f.fusion].text}</span>
              </li>
            ))}
            {s.talents.map((t) => (
              <li key={t.talent} className="rounded-sm border border-[#b48cff]/40 bg-[#b48cff]/10 p-2.5">
                <span className="block font-display text-base text-kaghaz">
                  {TALENTS[t.talent].name} <span className="text-xs text-kaghaz/50">· {UPGRADES[t.spell].name}</span>
                </span>
                <span className="block text-xs leading-5 text-kaghaz/70">{TALENTS[t.talent].text}</span>
              </li>
            ))}
            {s.masteries.map((m) => (
              <li key={m.mastery} className="rounded-sm border border-zar/40 bg-zar/5 p-2.5">
                <span className="block font-display text-base text-zar-soft">
                  {MASTERIES[m.mastery].name} <span className="text-xs text-kaghaz/50">· چیرگیِ {UPGRADES[m.spell].name}</span>
                </span>
                <span className="block text-xs leading-5 text-kaghaz/70">{MASTERIES[m.mastery].text}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[11px] text-kaghaz/45">
            استعداد ردهٔ یک در سطح {fa(TALENT_LEVEL)} افسون، و چیرگی (ردهٔ دو) در سطح {fa(MASTERY_LEVEL)} افسون گشوده می‌شود.
          </p>
          <p className="mt-1.5 text-[11px] text-kaghaz/45">
            جایگاه‌های ترکیب: {fa(s.fusions.length)} از {fa(s.fusionSlots)} (در سطح ۲۵، ۵۰ و ۷۵ گشوده می‌شوند)
          </p>
        </section>
      )}

      {s.boons.length > 0 && (
        <section>
          <h3 className="mb-2 font-display text-xl leading-none text-zar">جایزه‌های سطح</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {s.boons.map((b) => {
              const def = BY_BOON[b.id];
              return (
                <li key={b.id} className="flex items-start gap-2.5 rounded-sm border border-zar/30 bg-zar/5 p-2.5">
                  <span className="mt-1 h-2 w-2 shrink-0 rotate-45" style={{ background: def.color }} aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-display text-base leading-tight text-kaghaz">{def.name}</span>
                      <span className="text-xs font-bold tabular-nums text-zar">×{fa(b.count)}</span>
                    </span>
                    <span className="block text-xs leading-5 text-kaghaz/65">{def.text}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {s.artifacts.length > 0 && (
        <section>
          <h3 className="mb-2 font-display text-xl leading-none text-zar">یادگارهای این دست</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {s.artifacts.map((id) => {
              const a = BY_ID[id];
              return (
                <li key={id} className="flex items-start gap-2.5 rounded-sm border border-zar/35 bg-zar/5 p-2.5">
                  <span style={{ color: a.color }}>
                    <ArtifactIcon id={a.id} size={20} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-base leading-tight text-kaghaz">{a.name}</span>
                    <span className="block text-xs leading-5 text-kaghaz/65">{a.text}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function OwnedRow({ id, lvl }: { id: keyof typeof UPGRADES; lvl: number }) {
  const def = UPGRADES[id];
  const maxed = lvl >= def.max;
  return (
    <li className="flex items-start gap-2.5 rounded-sm border border-kaghaz/12 bg-night-950/60 p-2.5">
      <span style={{ color: def.color }}>
        <UpgradeIcon id={id} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-display text-base leading-tight text-kaghaz">{def.name}</span>
          <span className={`text-xs font-bold tabular-nums ${maxed ? "text-zar" : "text-kaghaz/55"}`}>
            {fa(lvl)} / {fa(def.max)}
          </span>
        </span>
        <span className="mt-1 flex gap-1" aria-hidden="true">
          {Array.from({ length: def.max }, (_, k) => (
            <span key={k} className={`h-1 flex-1 rounded-full ${k < lvl ? "bg-zar" : "bg-kaghaz/15"}`} />
          ))}
        </span>
        <span className="mt-1.5 block text-xs leading-5 text-kaghaz/70">{def.levels[Math.min(lvl, def.levels.length) - 1]}</span>
        {!maxed && <span className="mt-1 block text-[11px] leading-4 text-firoozeh/70">سطح بعد: {def.levels[lvl]}</span>}
      </span>
    </li>
  );
}
