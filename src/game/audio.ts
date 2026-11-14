export type SfxName =
  | "hit"
  | "kill"
  | "gem"
  | "hurt"
  | "level"
  | "select"
  | "boom"
  | "zap"
  | "over"
  | "boss"
  | "heal"
  | "ult"
  | "chest"
  | "burn"
  | "ignite"
  | "slash"
  | "cast"
  | "blade"
  | "phase"
  | "start";

const MUTE_KEY = "afsungar.muted";

/** Minimum gap (ms) between two plays of the same sound, so swarms don't turn into noise. */
const THROTTLE: Partial<Record<SfxName, number>> = {
  hit: 70,
  kill: 60,
  gem: 45,
  boom: 90,
  zap: 120,
  burn: 110,
  ignite: 140,
  slash: 80,
  cast: 90,
  blade: 160,
};

type AudioCtor = typeof AudioContext;

class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private last: Partial<Record<SfxName, number>> = {};
  muted = false;

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      /* storage unavailable */
    }
  }

  /** Must be called from a user gesture before any sound can play. */
  unlock() {
    try {
      if (!this.ctx) {
        const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
        const AC = w.AudioContext ?? w.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.55;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    try {
      localStorage.setItem(MUTE_KEY, m ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  private tone(f0: number, f1: number, dur: number, type: OscillatorType, vol: number, delay = 0) {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  /** A very short pitched click: the transient that makes an impact feel physical. */
  private click(freq: number, vol: number, delay = 0) {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * 0.25), t + 0.03);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  private noise(dur: number, vol: number, cutoff: number, delay = 0, type: BiquadFilterType = "lowpass", q = 1) {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    if (!this.noiseBuf) {
      const len = Math.floor(ctx.sampleRate * 0.5);
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(cutoff, t);
    f.frequency.exponentialRampToValueAtTime(type === "lowpass" ? 80 : cutoff * 0.5, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  play(name: SfxName) {
    if (this.muted || !this.ctx) return;
    const now = performance.now();
    const gap = THROTTLE[name];
    if (gap) {
      const prev = this.last[name] ?? 0;
      if (now - prev < gap) return;
      this.last[name] = now;
    }
    switch (name) {
      case "hit":
        this.tone(240, 130, 0.05, "square", 0.03);
        break;
      case "kill":
        this.tone(360, 150, 0.09, "triangle", 0.07);
        break;
      case "gem":
        this.tone(880 + Math.random() * 120, 1320, 0.07, "sine", 0.05);
        break;
      case "hurt":
        this.tone(170, 55, 0.22, "sawtooth", 0.14);
        break;
      case "heal":
        this.tone(392, 587, 0.18, "sine", 0.1);
        this.tone(587, 784, 0.2, "sine", 0.08, 0.1);
        break;
      case "select":
        this.tone(587, 880, 0.12, "triangle", 0.1);
        break;
      case "zap":
        this.tone(1400, 180, 0.11, "sawtooth", 0.04);
        break;
      case "boom":
        this.noise(0.28, 0.16, 900);
        break;
      case "ignite":
        // fireball impact: a deep thump, a crackle and a short hiss of steam
        this.click(260, 0.07);
        this.tone(150, 42, 0.42, "sine", 0.14);
        this.noise(0.3, 0.12, 1100);
        this.noise(0.1, 0.06, 4200, 0.04, "highpass");
        this.noise(0.12, 0.05, 3000, 0.12, "bandpass", 1.4);
        break;
      case "burn":
        // a short crackle with a falling hiss
        this.noise(0.2, 0.13, 1800);
        this.tone(260, 120, 0.12, "sawtooth", 0.035);
        break;
      case "cast":
        // a soft rising ping as a spell leaves the staff
        this.tone(740, 1180, 0.06, "sine", 0.03);
        break;
      case "blade":
        // airy whoosh for wind magic
        this.noise(0.16, 0.07, 3000);
        this.tone(900, 420, 0.12, "triangle", 0.025);
        break;
      case "slash":
        // airy swoosh: filtered noise sweeping down
        this.noise(0.12, 0.09, 3200);
        this.tone(1200, 500, 0.08, "triangle", 0.03);
        break;
      case "ult": {
        // rising shimmer, a bass hit, then a long fading tail
        [293.66, 440, 587.33, 880].forEach((f, i) => this.tone(f, f * 1.01, 0.3, "triangle", 0.1, i * 0.055));
        this.tone(98, 49, 0.7, "sawtooth", 0.14, 0.22);
        this.noise(0.5, 0.12, 1600);
        this.tone(1174.66, 146.83, 0.8, "sine", 0.05, 0.3);
        break;
      }
      case "chest": {
        // a bright opening fanfare: two rising intervals and a shimmer
        [392, 493.88, 587.33, 783.99, 987.77].forEach((f, i) => this.tone(f, f, 0.26, "triangle", 0.09, i * 0.07));
        this.tone(1567.98, 1174.66, 0.5, "sine", 0.05, 0.32);
        break;
      }
      case "phase": {
        [196, 220, 261.63, 293.66].forEach((f, i) => this.tone(f, f, 0.45, "sine", 0.07, i * 0.12));
        break;
      }
      case "boss":
        this.tone(82, 62, 0.9, "sawtooth", 0.16);
        this.tone(123, 92, 0.9, "sawtooth", 0.1, 0.05);
        break;
      case "start":
      case "level": {
        // a short rising phrase on a Hijaz-like tetrachord (re, mi♭, fa♯, sol)
        const notes = name === "level" ? [293.66, 311.13, 369.99, 392, 587.33] : [293.66, 369.99, 392, 440];
        notes.forEach((f, i) => this.tone(f, f, 0.2, "triangle", 0.1, i * 0.075));
        break;
      }
      case "over": {
        [392, 369.99, 311.13, 293.66, 146.83].forEach((f, i) => this.tone(f, f * 0.98, 0.34, "triangle", 0.12, i * 0.16));
        break;
      }
    }
  }
}

export const sfx = new Sfx();
