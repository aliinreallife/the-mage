import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { DevPanel } from "./components/DevPanel";
import { Research } from "./components/Research";
import { buyResearch, goldForRun } from "./game/progression";
import { loadSave, safeStorage, settle, writeSave, type SaveData } from "./game/save";
import { clearCheckpoint, loadCheckpoint, saveCheckpoint, type Checkpoint } from "./game/checkpoint";
import { recordTelemetry } from "./game/telemetry";
import { Codex } from "./components/Codex";
import { Hud } from "./components/Hud";
import { ResumeCountdown } from "./components/ResumeCountdown";
import { RESUME_COUNTDOWN_MS, resumeCountdownFrame, canArmMovement } from "./game/resumeCountdown";
import { LevelUp } from "./components/LevelUp";
import { BoonChoice } from "./components/BoonChoice";
import { RelicChoice } from "./components/RelicChoice";
import { GameOver, Menu, Pause } from "./components/Screens";
import { sfx } from "./game/audio";
import type { BoonId } from "./game/boons";
import type { FusionId } from "./game/talents";
import type { Difficulty } from "./game/engine";
import { BY_HERO, HERO_IDS, type HeroId } from "./game/heroes";
import { ARTIFACTS, BY_ID, RARITY, type ArtifactId } from "./game/artifacts";
import { Game, type Choice, type GameEvent, type Joystick, type Snapshot } from "./game/engine";
import { applyReferenceData, resolveConfigMode } from "./game/reference/config";
import { importJson, type ImportedDataset } from "./game/reference/importer";

type Phase = "menu" | "research" | "playing" | "paused" | "countdown" | "levelup" | "relic" | "boon" | "over";
type Tone = "info" | "danger" | "good";

/** Loaded once at start-up; migrates the original per-key storage on first launch. */
const BOOT: SaveData = loadSave();
const JOY_RADIUS = 52;

function loadHero(): HeroId {
  return HERO_IDS.includes(BOOT.hero as HeroId) ? (BOOT.hero as HeroId) : "farzan";
}

function loadDifficulty(): Difficulty {
  return BOOT.difficulty;
}

function loadBest() {
  return BOOT.best;
}

function loadFound(): ArtifactId[] {
  const valid = new Set(ARTIFACTS.map((x) => x.id));
  return BOOT.found.filter((x): x is ArtifactId => valid.has(x as ArtifactId));
}

const TONE_COLOR: Record<Tone, string> = {
  info: "#f4ecd8",
  danger: "#ff6b78",
  good: "#f2b84b",
};


/**
 * `vite` (development) and `vite build --mode staging` enable the developer panel;
 * `vite build` (production) does not. MODE is replaced by Vite with a string literal.
 */
export const DEV_TOOLS = import.meta.env.MODE !== "production";

/**
 * Development-only experimental configuration. `resolveConfigMode` requires a
 * non-production build AND `?ref` in the URL, so a public release can never
 * switch gameplay, and nothing here is written to the save.
 */
export const REFERENCE_MODE = resolveConfigMode(import.meta.env.MODE, typeof location !== "undefined" ? location.search : "");

/** Datasets a developer loads by hand: localStorage["afsungar.reference"] = JSON array of datasets. */
function loadReferenceDatasets(): ImportedDataset[] {
  if (!REFERENCE_MODE) return [];
  try {
    const raw = localStorage.getItem("afsungar.reference");
    const parsed = raw ? JSON.parse(raw) : [];
    const list: ImportedDataset[] = [];
    for (const item of Array.isArray(parsed) ? parsed : []) {
      const outcome = importJson(typeof item === "string" ? item : JSON.stringify(item));
      if (outcome.ok) list.push(outcome.dataset);
      else console.warn("[reference] dataset refused:", outcome.failure.reason);
    }
    return list;
  } catch {
    return [];
  }
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const phaseRef = useRef<Phase>("menu");
  const keys = useRef(new Set<string>());
  const joyRef = useRef<(Joystick & { id: number }) | null>(null);
  const choicesRef = useRef<Choice[]>([]);
  const guardRef = useRef(0);
  const bannerTimer = useRef(0);
  const bannerId = useRef(0);

  const [phase, setPhaseState] = useState<Phase>("menu");
  const [countdownLabel, setCountdownLabel] = useState("۳");
  const countdownDeadline = useRef(0);
  const countdownShown = useRef("۳");
  const [hud, setHud] = useState<Snapshot | null>(null);
  const [choices, setChoicesState] = useState<Choice[]>([]);
  const [dealKey, setDealKey] = useState(0);
  const [banner, setBanner] = useState<{ id: number; text: string; tone: Tone } | null>(null);
  const [muted, setMuted] = useState(sfx.muted);
  const [best, setBest] = useState(loadBest);
  const [record, setRecord] = useState(false);
  const [discovered, setDiscovered] = useState<ArtifactId[]>(loadFound);
  const [relicOffers, setRelicOffers] = useState<ArtifactId[]>([]);
  const [codexOpen, setCodexOpen] = useState(false);
  const [difficulty, setDifficultyState] = useState<Difficulty>(loadDifficulty);
  const [hero, setHeroState] = useState<HeroId>(loadHero);
  const heroRef = useRef<HeroId>(hero);
  const [boonOffers, setBoonOffers] = useState<BoonId[]>([]);
  const [boonLevel, setBoonLevel] = useState(1);
  const saveRef = useRef<SaveData>(BOOT);
  const [save, setSaveState] = useState<SaveData>(BOOT);
  const [runGold, setRunGold] = useState(0);
  const [victory, setVictory] = useState(false);
  /** the game whose result was already paid out — guarantees one settlement per run */
  const settledRef = useRef<Game | null>(null);
  /** an unfinished stage run that can be resumed (never one that was already paid out) */
  const [checkpoint, setCheckpoint] = useState<Checkpoint | null>(() => {
    const st = safeStorage();
    return st ? loadCheckpoint(st, BOOT.settledRuns) : null;
  });
  const checkpointT = useRef(0);
  // Developer tools exist only in development and staging builds. In a production build
  // DEV_TOOLS is the literal `false`, so the panel and its cheats are removed from the bundle
  // entirely — a public `?dev` query parameter cannot unlock anything.
  const devMode = useMemo(() => DEV_TOOLS && typeof location !== "undefined" && new URLSearchParams(location.search).has("dev"), []);

  const updateSave = useCallback((patch: Partial<SaveData> | ((cur: SaveData) => Partial<SaveData>)) => {
    const cur = saveRef.current;
    const next = { ...cur, ...(typeof patch === "function" ? patch(cur) : patch) };
    saveRef.current = next;
    writeSave(next);
    setSaveState(next);
  }, []);

  /** Pay out gold and records for a finished run, exactly once. */
  const settleRun = useCallback(
    (g: Game, won: boolean) => {
      if (settledRef.current === g) return;
      settledRef.current = g;
      const s = g.snapshot();
      const survived = s.mode === "stage" ? s.clock : s.time;
      const gold = goldForRun({ time: survived, kills: s.kills, wavesCleared: s.wavesCleared, victory: won, difficulty: s.difficulty });
      const cur = saveRef.current;
      const stageScore = won ? s.totalWaves * 300 + 1 : Math.floor(s.clock);
      const isRecord = s.mode === "stage" ? stageScore > cur.bestStage : Math.floor(s.time) > cur.best;
      // the run id makes payout idempotent across duplicate events and resumed checkpoints
      const paid = settle(cur, { runId: g.runId, mode: s.mode, gold, won, score: s.mode === "stage" ? stageScore : s.time });
      if (paid) updateSave(paid);
      const store = safeStorage();
      if (store) {
        clearCheckpoint(store);
        recordTelemetry(store, g.telemetry);
      }
      setCheckpoint(null);
      setBest(s.mode === "endless" ? Math.max(cur.best, Math.floor(s.time)) : cur.best);
      setRecord(isRecord);
      setRunGold(gold);
      setVictory(won);
      setHud(s);
      joyRef.current = null;
      setPhase("over");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [updateSave],
  );

  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  const dealChoices = useCallback((g: Game) => {
    const c = g.rollChoices();
    choicesRef.current = c;
    setChoicesState(c);
    setDealKey((k) => k + 1);
    // brief guard so a key or tap meant for the game can't pick a card by accident
    guardRef.current = performance.now() + 350;
  }, []);

  const showBanner = useCallback((text: string, tone: Tone) => {
    window.clearTimeout(bannerTimer.current);
    setBanner({ id: ++bannerId.current, text, tone });
    bannerTimer.current = window.setTimeout(() => setBanner(null), 2800);
  }, []);

  const onEvent = useCallback(
    (e: GameEvent) => {
      const g = gameRef.current;
      if (!g) return;
      switch (e.type) {
        case "sfx":
          sfx.play(e.name);
          break;
        case "banner":
          showBanner(e.text, e.tone);
          break;
        case "relic": {
          setRelicOffers(g.relicOffers());
          setHud(g.snapshot());
          guardRef.current = performance.now() + 300;
          setPhase("relic");
          break;
        }
        case "artifact": {
          const art = BY_ID[e.id];
          if (!saveRef.current.found.includes(e.id)) updateSave((cur) => ({ found: [...cur.found, e.id] }));
          setDiscovered((prev) => (prev.includes(e.id) ? prev : [...prev, e.id]));
          showBanner(`${RARITY[art.rarity].name}: ${art.name}`, art.rarity === "legendary" ? "good" : "info");
          break;
        }
        case "levelup":
          sfx.play("level");
          setHud(g.snapshot());
          if (g.pendingBoon > 0) {
            setBoonOffers(g.rollBoons());
            setBoonLevel(g.level);
            guardRef.current = performance.now() + 300;
            setPhase("boon");
          } else {
            dealChoices(g);
            setPhase("levelup");
          }
          break;
        case "gameover":
          settleRun(g, false);
          break;
        case "victory":
          settleRun(g, true);
          break;
      }
    },
    [dealChoices, setPhase, settleRun, showBanner, updateSave],
  );

  /** Save a resumable checkpoint when the run is between waves with nothing pending. */
  const writeCheckpoint = useCallback(() => {
    const g = gameRef.current;
    if (!g || settledRef.current === g) return;
    const cp = g.toCheckpoint();
    const store = safeStorage();
    if (cp && store && saveCheckpoint(store, cp)) setCheckpoint(cp);
  }, []);

  const newGame = useCallback(() => {
    const g = new Game(onEvent);
    g.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    g.setView(window.innerWidth, window.innerHeight);
    g.setHero(heroRef.current);
    g.setMode(saveRef.current.mode);
    g.setResearch(saveRef.current.research);
    g.reducedFx = saveRef.current.reducedFx;
    if (REFERENCE_MODE) {
      // Experimental: apply only complete, validated datasets; never partial data.
      const report = applyReferenceData(g, loadReferenceDatasets());
      console.info("[reference] mode", report.mode, report);
    }
    gameRef.current = g;
    return g;
  }, [onEvent]);

  const start = useCallback(() => {
    sfx.unlock();
    sfx.play("start");
    const g = newGame();
    g.setDifficulty(difficulty);
    const store = safeStorage();
    if (store) clearCheckpoint(store);
    setCheckpoint(null);
    joyRef.current = null;
    setHud(g.snapshot());
    setRecord(false);
    setPhase("playing");
    settledRef.current = null;
    setVictory(false);
    setRunGold(0);
    showBanner(
      saveRef.current.mode === "stage" ? "میدان آزمایش — چهار موج؛ آخرینش نگهبان است" : `${BY_HERO[heroRef.current].name} پا به میدان گذاشت…`,
      "info",
    );
  }, [difficulty, newGame, setPhase, showBanner]);

  /** Continue an unfinished stage run from its last checkpoint. */
  const resumeRun = useCallback(() => {
    const store = safeStorage();
    const cp = store ? loadCheckpoint(store, saveRef.current.settledRuns) : null;
    if (!cp) {
      setCheckpoint(null);
      return;
    }
    sfx.unlock();
    sfx.play("start");
    const g = newGame();
    if (cp.hero in BY_HERO) g.setHero(cp.hero as HeroId);
    g.setMode(cp.mode);
    g.setDifficulty(cp.difficulty as Difficulty);
    g.setResearch(saveRef.current.research);
    g.restoreCheckpoint(cp);
    joyRef.current = null;
    settledRef.current = null;
    setVictory(false);
    setRunGold(0);
    setHud(g.snapshot());
    setRecord(false);
    setPhase("playing");
    showBanner("دستِ نیمه‌تمام ادامه یافت", "info");
  }, [newGame, setPhase, showBanner]);

  const toMenu = useCallback(() => {
    newGame();
    setBanner(null);
    setPhase("menu");
  }, [newGame, setPhase]);

  const pause = useCallback(() => {
    if (phaseRef.current !== "playing" && phaseRef.current !== "countdown") return;
    const g = gameRef.current;
    if (g) setHud(g.snapshot());
    if (g?.canCheckpoint()) writeCheckpoint();
    joyRef.current = null;
    setPhase("paused");
  }, [setPhase, writeCheckpoint]);

  /** Resume freezes the entire simulation until three real seconds elapse. */
  const resume = useCallback(() => {
    if (phaseRef.current !== "paused") return;
    sfx.unlock();
    keys.current.clear();
    joyRef.current = null;
    if (gameRef.current) gameRef.current.input = { x: 0, y: 0 };
    countdownDeadline.current = performance.now() + RESUME_COUNTDOWN_MS;
    countdownShown.current = "۳";
    setCountdownLabel("۳");
    setPhase("countdown");
  }, [setPhase]);

  const choose = useCallback(
    (c: Choice) => {
      const g = gameRef.current;
      if (!g || phaseRef.current !== "levelup" || performance.now() < guardRef.current) return;
      g.applyChoice(c);
      sfx.play("select");
      setHud(g.snapshot());
      if (g.pending > 0) {
        dealChoices(g);
      } else if (g.pendingBoon > 0) {
        setBoonOffers(g.rollBoons());
        setBoonLevel(g.level);
        guardRef.current = performance.now() + 300;
        setPhase("boon");
      } else {
        // Persist completed choices immediately, not just on the 3 s timer.
        writeCheckpoint();
        setPhase("playing");
      }
    },
    [dealChoices, setPhase, writeCheckpoint],
  );

  const castUlt = useCallback(() => {
    const g = gameRef.current;
    if (!g || phaseRef.current !== "playing") return;
    if (g.useUlt()) {
      setHud(g.snapshot());
      showBanner("فرّ ایزدی رها شد!", "good");
    }
  }, [showBanner]);

  const chooseBoon = useCallback(
    (id: BoonId) => {
      const g = gameRef.current;
      if (!g || phaseRef.current !== "boon" || performance.now() < guardRef.current) return;
      if (!g.chooseBoon(id)) return;
      setHud(g.snapshot());
      if (g.pendingBoon > 0) {
        setBoonOffers(g.rollBoons());
        setBoonLevel(g.level);
        guardRef.current = performance.now() + 250;
      } else if (g.pending > 0) {
        dealChoices(g);
        setPhase("levelup");
      } else {
        writeCheckpoint();
        setPhase("playing");
      }
    },
    [dealChoices, setPhase, writeCheckpoint],
  );

  const chooseRelic = useCallback(
    (id: ArtifactId) => {
      const g = gameRef.current;
      if (!g || phaseRef.current !== "relic" || performance.now() < guardRef.current) return;
      if (!g.chooseRelic(id)) return;
      setRelicOffers(g.relicOffers());
      setHud(g.snapshot());
      const art = BY_ID[id];
      showBanner(`${RARITY[art.rarity].name}: ${art.name}`, art.rarity === "legendary" ? "good" : "info");
      if (g.relicOffers().length > 0) setPhase("relic");
      else if (g.pendingBoon > 0) {
        setBoonOffers(g.rollBoons());
        setBoonLevel(g.level);
        guardRef.current = performance.now() + 300;
        setPhase("boon");
      } else if (g.pending > 0) {
        dealChoices(g);
        setPhase("levelup");
      } else {
        // An opened chest has already been marked claimed. Save it now so a
        // restart cannot replay the same relic reward from the last timer save.
        writeCheckpoint();
        setPhase("playing");
      }
    },
    [dealChoices, setPhase, showBanner, writeCheckpoint],
  );

  const toggleMute = useCallback(() => {
    const m = !sfx.muted;
    sfx.setMuted(m);
    if (!m) sfx.unlock();
    setMuted(m);
  }, []);

  /* main loop */
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    if (!gameRef.current) newGame();

    let w = 0;
    let h = 0;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      gameRef.current?.setView(w, h);
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let last = performance.now();
    let hudAcc = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      const g = gameRef.current;
      if (!g) return;
      const ph = phaseRef.current;

      if (ph === "countdown") {
        const countdown = resumeCountdownFrame(countdownDeadline.current, now);
        if (countdown.done) {
          // Keep whichever direction is being held; the next playing frame
          // applies it before advancing enemies/projectiles/collisions.
          setPhase("playing");
        } else if (countdown.label !== countdownShown.current) {
          countdownShown.current = countdown.label;
          setCountdownLabel(countdown.label);
        }
        // No g.advance(), no frame timers, and no damage/collision during countdown.
      } else if (ph === "playing") {
        checkpointT.current -= dt;
        if (checkpointT.current <= 0) {
          checkpointT.current = 3;
          if (g.canCheckpoint()) writeCheckpoint();
        }
        const k = keys.current;
        let ix = 0;
        let iy = 0;
        if (k.has("ArrowLeft") || k.has("KeyA")) ix -= 1;
        if (k.has("ArrowRight") || k.has("KeyD")) ix += 1;
        if (k.has("ArrowUp") || k.has("KeyW")) iy -= 1;
        if (k.has("ArrowDown") || k.has("KeyS")) iy += 1;
        const j = joyRef.current;
        if (j) {
          const dx = j.x - j.ox;
          const dy = j.y - j.oy;
          const d = Math.hypot(dx, dy);
          if (d > 8) {
            const m = Math.min(1, d / JOY_RADIUS);
            ix = (dx / d) * m;
            iy = (dy / d) * m;
          }
        }
        g.input.x = ix;
        g.input.y = iy;
        g.advance(dt);
        // QA instrumentation: lets an automated browser test prove touch input moves the player.
        canvas.dataset.px = g.player.x.toFixed(1);
        canvas.dataset.py = g.player.y.toFixed(1);
        hudAcc += dt;
        if (hudAcc >= 0.1) {
          hudAcc = 0;
          setHud(g.snapshot());
        }
      } else if (ph === "menu" || ph === "research") {
        g.idle(Math.min(dt, 0.05));
      }
      g.render(ctx, w, h, dpr, canArmMovement(ph) ? joyRef.current : null);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [newGame, setPhase]);

  /* keyboard + focus loss */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const ph = phaseRef.current;
      // physical key codes, so movement works on a Persian keyboard layout too
      if (canArmMovement(ph) && (e.code.startsWith("Arrow") || e.code === "Space")) e.preventDefault();
      if (canArmMovement(ph)) keys.current.add(e.code);
      if (e.repeat) return;
      if (e.code === "Space" && ph === "playing") {
        castUlt();
      } else if (e.code === "Escape" || e.code === "KeyP") {
        if (ph === "playing" || ph === "countdown") pause();
        else if (ph === "paused") resume();
      } else if (ph === "levelup") {
        const m = /^(?:Digit|Numpad)([1-3])$/.exec(e.code);
        const c = m ? choicesRef.current[Number(m[1]) - 1] : undefined;
        if (c) choose(c);
      } else if (ph === "boon") {
        const m = /^(?:Digit|Numpad)([1-3])$/.exec(e.code);
        const id = m ? boonOffers[Number(m[1]) - 1] : undefined;
        if (id) chooseBoon(id);
      } else if (ph === "relic") {
        const m = /^(?:Digit|Numpad)([1-3])$/.exec(e.code);
        const id = m ? relicOffers[(Number(m[1]) - 1) % Math.max(1, relicOffers.length)] : undefined;
        if (id && m && Number(m[1]) <= relicOffers.length) chooseRelic(id);
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const lose = () => {
      keys.current.clear();
      if (gameRef.current?.canCheckpoint()) writeCheckpoint();
      pause();
    };
    const vis = () => {
      if (document.hidden) lose();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", lose);
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", lose);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [boonOffers, castUlt, choose, chooseBoon, chooseRelic, pause, relicOffers, resume]);

  useEffect(() => () => window.clearTimeout(bannerTimer.current), []);

  /* touch / mouse joystick */
  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!canArmMovement(phaseRef.current) || joyRef.current) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture is best-effort */
    }
    joyRef.current = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const j = joyRef.current;
    if (!j || j.id !== e.pointerId) return;
    j.x = e.clientX;
    j.y = e.clientY;
    // the base follows the finger once it is dragged far, so turning back is instant
    const dx = j.x - j.ox;
    const dy = j.y - j.oy;
    const d = Math.hypot(dx, dy);
    const limit = JOY_RADIUS * 1.3;
    if (d > limit) {
      j.ox += (dx / d) * (d - limit);
      j.oy += (dy / d) * (d - limit);
    }
  };
  const onPointerEnd = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (joyRef.current?.id === e.pointerId) joyRef.current = null;
  };

  const inRun = phase === "playing" || phase === "countdown" || phase === "paused" || phase === "levelup" || phase === "relic" || phase === "boon";

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-night-950">
      <canvas
        ref={canvasRef}
        className="block h-full w-full touch-none"
        aria-label="میدان بازی"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onLostPointerCapture={onPointerEnd}
        onContextMenu={(e) => e.preventDefault()}
      />

      {(phase === "playing" || phase === "countdown") && hud && <Hud s={hud} muted={muted} onPause={pause} onMute={toggleMute} onUlt={castUlt} />}
      {phase === "countdown" && <ResumeCountdown label={countdownLabel} />}

      {banner && phase === "playing" && (
        <div
          key={banner.id}
          role="status"
          className="banner-msg pointer-events-none absolute inset-x-4 top-[23%] animate-banner text-center font-display text-3xl leading-tight drop-shadow-[0_3px_10px_rgba(0,0,0,0.9)] sm:text-5xl"
          style={{ color: TONE_COLOR[banner.tone] }}
        >
          {banner.text}
        </div>
      )}

      {phase === "menu" && (
        <Menu
          best={best}
          discovered={discovered.length}
          total={ARTIFACTS.length}
          difficulty={difficulty}
          hero={hero}
          onHero={(h: HeroId) => {
            heroRef.current = h;
            setHeroState(h);
            updateSave({ hero: h });
            // the sorcerer wandering behind the menu changes robes at once
            gameRef.current?.setHero(h);
            sfx.unlock();
            sfx.play("select");
          }}
          onDifficulty={(d: Difficulty) => {
            setDifficultyState(d);
            updateSave({ difficulty: d });
            gameRef.current?.setDifficulty(d);
          }}
          onStart={start}
          resumable={checkpoint ? { level: checkpoint.level, wavesCleared: checkpoint.wavesCleared, clock: checkpoint.stageTime } : null}
          onResumeRun={resumeRun}
          onCodex={() => setCodexOpen(true)}
          mode={save.mode}
          onMode={(m) => updateSave({ mode: m })}
          gold={save.gold}
          bestStage={save.bestStage}
          reducedFx={save.reducedFx}
          onReducedFx={(v) => {
            updateSave({ reducedFx: v });
            if (gameRef.current) gameRef.current.reducedFx = v;
          }}
          onResearch={() => setPhase("research")}
        />
      )}
      {phase === "levelup" && hud && <LevelUp level={hud.level} choices={choices} dealKey={dealKey} onChoose={choose} />}
      {phase === "boon" && hud && boonOffers.length > 0 && (
        <BoonChoice level={boonLevel} offers={boonOffers} onChoose={chooseBoon} />
      )}

      {phase === "relic" && hud && relicOffers.length > 0 && (
        <RelicChoice offers={relicOffers} held={hud.artifacts.length} onChoose={chooseRelic} />
      )}

      {phase === "paused" && hud && (
        <Pause
          s={hud}
          discovered={discovered}
          onFusionFocus={(id: FusionId | null) => {
            const g = gameRef.current;
            if (g?.setFusionFocus(id)) {
              setHud(g.snapshot());
              writeCheckpoint();
            }
          }}
          onResume={resume}
          onRestart={start}
          onMenu={toMenu}
        />
      )}
      {phase === "over" && hud && (
        <GameOver s={hud} record={record} best={best} victory={victory} gold={runGold} wallet={save.gold} onRestart={start} onMenu={toMenu} />
      )}

      {phase === "research" && (
        <Research
          gold={save.gold}
          ranks={save.research}
          onBuy={(id) => {
            const r = buyResearch(saveRef.current.gold, saveRef.current.research, id);
            if (!r) return false;
            updateSave({ gold: r.gold, research: r.ranks });
            sfx.unlock();
            sfx.play("select");
            return true;
          }}
          onBack={() => setPhase("menu")}
        />
      )}

      {DEV_TOOLS && devMode && inRun && gameRef.current && (
        <DevPanel
          game={gameRef.current}
          onChange={() => gameRef.current && setHud(gameRef.current.snapshot())}
          onGold={() => updateSave((cur) => ({ gold: cur.gold + 1000 }))}
        />
      )}

      {phase === "menu" && codexOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="codex-title"
          className="app-safe-dialog absolute inset-0 flex animate-fade flex-col items-center overflow-y-auto bg-night-950/85 px-4 py-6 backdrop-blur-[2px]"
        >
          <div className="frame my-auto w-full max-w-3xl animate-rise rounded-sm px-5 py-7 sm:px-8">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-firoozeh">آنچه در صندوق‌ها یافته‌ای</p>
                <h2 id="codex-title" className="font-display text-4xl leading-tight text-zar">
                  گنجینهٔ یادگارها
                </h2>
              </div>
              <button
                type="button"
                autoFocus
                onClick={() => setCodexOpen(false)}
                className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-md border border-kaghaz/20 bg-night-950/70 text-kaghaz/85 transition-colors hover:border-zar/60 hover:text-zar focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zar"
                aria-label="بستن گنجینه"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <Codex discovered={discovered} buildTab={false} />
          </div>
        </div>
      )}
    </div>
  );
}