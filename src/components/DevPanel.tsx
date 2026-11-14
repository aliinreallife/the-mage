import { useState } from "react";
import type { Game } from "../game/engine";
import { FUSIONS, FUSION_IDS } from "../game/talents";
import { summarize } from "../game/telemetry";

interface Props {
  game: Game;
  onChange: () => void;
  onGold: () => void;
}

/** Developer-only controls: development and staging builds only (plus `?dev`). Never shipped in production. */
export function DevPanel({ game, onChange, onGold }: Props) {
  const [open, setOpen] = useState(false);
  const act = (fn: () => void) => () => {
    fn();
    onChange();
  };
  const btn = "min-h-9 rounded-sm border border-kaghaz/20 bg-night-900/90 px-2 text-[11px] text-kaghaz/85 hover:border-zar/60";
  return (
    <div className="pointer-events-auto absolute bottom-24 left-2 z-20 text-right" dir="rtl" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="rounded-sm bg-anar px-2 py-1 text-[11px] font-bold text-white">
        DEV {open ? "×" : ""}
      </button>
      {open && (
        <div className="mt-1 grid w-64 grid-cols-2 gap-1 rounded-sm border border-anar/50 bg-night-950/95 p-2">
          {game.mode === "stage" &&
            [0, 1, 2, 3].map((i) => (
              <button key={i} type="button" className={btn} onClick={act(() => game.devJumpToWave(i))}>
                پرش به موج {i + 1}
              </button>
            ))}
          {[25, 50, 75].map((l) => (
            <button key={l} type="button" className={btn} onClick={act(() => game.devSetLevel(l))}>
              سطح {l}
            </button>
          ))}
          <button type="button" className={btn} onClick={act(() => game.devHeal())}>
            درمان کامل
          </button>
          {FUSION_IDS.map((f) => (
            <button
              key={f}
              type="button"
              className={btn}
              onClick={act(() => {
                game.devFusionKit(f);
                game.pending += 1; // the next level-up hand offers the fusion first
              })}
            >
              کیت {FUSIONS[f].name}
            </button>
          ))}
          <button
            type="button"
            className={btn}
            onClick={() => {
              const data = JSON.stringify({ summary: summarize(game.telemetry), raw: game.telemetry }, null, 2);
              navigator.clipboard?.writeText(data).catch(() => console.log(data));
              console.log("[balance telemetry]", data);
            }}
          >
            کپی داده‌های تعادل
          </button>
          <button type="button" className={btn} onClick={onGold}>
            +۱۰۰۰ طلا
          </button>
        </div>
      )}
    </div>
  );
}
