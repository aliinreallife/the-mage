import { useId } from "react";
import { BY_HERO, type HeroId } from "../game/heroes";

interface Props {
  hero: HeroId;
  size?: number;
  /** gentle floating and crystal pulse */
  animate?: boolean;
  /** 0–3, mirrors the in-game level look (cape stars, halo, glowing eyes) */
  tier?: number;
  /** "full" shows the whole sorcerer, "face" zooms in on hat and face */
  crop?: "full" | "face";
  className?: string;
}

const diamond = (x: number, y: number, s: number) =>
  `M${x} ${y - s} L${x + s} ${y} L${x} ${y + s} L${x - s} ${y} Z`;

/**
 * The sorcerer drawn in SVG with the same geometry as the canvas sprite,
 * so the menu portrait and the hero on the battlefield always match.
 */
const VIEW = {
  full: { box: "-26 -44 52 65", ratio: 65 / 52 },
  face: { box: "-13 -36 27 30", ratio: 30 / 27 },
};

export function HeroPortrait({ hero, size = 160, animate = false, tier = 0, crop = "full", className = "" }: Props) {
  const raw = useId();
  const id = raw.replace(/[^a-zA-Z0-9_-]/g, "");
  const pal = BY_HERO[hero].palette;
  const glow = `rgb(${pal.glow})`;

  return (
    <svg
      width={size}
      height={size * VIEW[crop].ratio}
      viewBox={VIEW[crop].box}
      className={`${animate ? "animate-float" : ""} overflow-visible ${className}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${id}-aura`} cx="0" cy="-6" r="34" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={glow} stopOpacity="0.32" />
          <stop offset="0.55" stopColor={glow} stopOpacity="0.1" />
          <stop offset="1" stopColor={glow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-robe`} x1="-12" y1="-12" x2="12" y2="15" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={pal.robe[0]} />
          <stop offset="0.55" stopColor={pal.robe[1]} />
          <stop offset="1" stopColor={pal.robe[2]} />
        </linearGradient>
        <linearGradient id={`${id}-hat`} x1="-9" y1="-14" x2="8" y2="-32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={pal.hat[0]} />
          <stop offset="0.6" stopColor={pal.hat[1]} />
          <stop offset="1" stopColor={pal.hat[2]} />
        </linearGradient>
        <linearGradient id={`${id}-staff`} x1="0" y1="6" x2="1.4" y2="-23" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5a3d1c" />
          <stop offset="0.5" stopColor="#a5794a" />
          <stop offset="1" stopColor="#d8ae72" />
        </linearGradient>
        <radialGradient id={`${id}-crystal`} cx="1.5" cy="-26" r="11" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="0.25" stopColor={glow} stopOpacity="0.8" />
          <stop offset="0.6" stopColor={glow} stopOpacity="0.3" />
          <stop offset="1" stopColor={glow} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-face`}>
          <circle cx="0.4" cy="-11.8" r="5.2" />
        </clipPath>
      </defs>

      {/* aura, shadow and rune circle */}
      <circle cx="0" cy="-6" r="34" fill={`url(#${id}-aura)`} />
      <ellipse cx="0" cy="15" rx="17" ry="5.5" fill="rgba(0,0,0,0.45)" />
      <ellipse cx="0" cy="15" rx="20" ry="6.5" fill="none" stroke={glow} strokeOpacity="0.35" strokeWidth="0.8" />
      <ellipse cx="0" cy="15" rx="15" ry="4.8" fill="none" stroke={glow} strokeOpacity="0.3" strokeWidth="0.7" strokeDasharray="2 5" />

      {tier >= 2 && (
        <g>
          <ellipse cx="-2.5" cy="-37" rx="8.5" ry="2.6" fill="none" stroke={glow} strokeWidth="1.4" transform="rotate(-7 -2.5 -37)" />
          <circle cx="6" cy="-37" r="1" fill="#fffbe8" />
          <circle cx="-11" cy="-37" r="1" fill="#fffbe8" />
        </g>
      )}

      {/* cape */}
      <path d="M-2 -10 Q-16 -2 -15 16 Q-8 12 -5 14 Q-6 0 -2 -10 Z" fill={pal.cape} stroke={pal.trim} strokeOpacity="0.5" strokeWidth="0.8" />
      {tier >= 1 && (
        <g fill={pal.trim}>
          <path d={diamond(-10, 2, 0.9)} />
          <path d={diamond(-12, 9, 0.9)} />
          <path d={diamond(-8.5, 11, 0.9)} />
        </g>
      )}

      {/* robe */}
      <path d="M0 -11 Q-12 -2 -11.5 13.5 Q0 17.5 11.5 13.5 Q12 -2 0 -11 Z" fill={`url(#${id}-robe)`} />
      <path d="M0 -11 Q-12 -2 -11.5 13.5 Q-5 15.5 -3 13.5 Q-7 0 0 -11 Z" fill={pal.robeShade} />
      <path d="M1.5 -5 Q2.6 5 1.8 15" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="0.8" />
      <path d="M-11.4 12.6 Q0 16.6 11.4 12.6" fill="none" stroke={pal.trim} strokeWidth="1.7" />
      <path d="M-10.6 10.8 Q0 14.6 10.6 10.8" fill="none" stroke="rgba(255,240,200,0.45)" strokeWidth="0.6" />
      <polygon points="-8.2,1.5 8.4,3.6 8.2,6.1 -8.4,4" fill={pal.trim} />
      <path d={diamond(1.8, 3.8, 2.1)} fill={glow} />
      <g fill={glow} className={animate ? "animate-pulse-soft" : ""}>
        <path d={diamond(-3.2, -6, 1.35)} />
        <path d={diamond(-2.75, -2.4, 1.35)} />
        <path d={diamond(-2.3, 1.2, 1.35)} />
      </g>

      {/* staff */}
      <g transform="translate(11.5 8) rotate(5.7)">
        <line x1="0" y1="6" x2="1.4" y2="-23" stroke={`url(#${id}-staff)`} strokeWidth="2.4" strokeLinecap="round" />
        <line x1="0.1" y1="5" x2="0.35" y2="1.5" stroke={pal.trim} strokeWidth="2.7" strokeLinecap="round" />
        <line x1="0.95" y1="-8" x2="1.05" y2="-10" stroke={pal.trim} strokeWidth="2.7" strokeLinecap="round" />
        <circle cx="0.5" cy="-1" r="1.9" fill={pal.skin} />
        <path d="M5.03 -24.1 A3.8 3.8 0 0 1 -2.03 -24.1" fill="none" stroke={pal.trim} strokeWidth="1.4" />
        <circle cx="1.5" cy="-26" r="11" fill={`url(#${id}-crystal)`} className={animate ? "animate-pulse-soft" : ""} />
        <path d={diamond(1.5, -26, 3.3)} fill={pal.crystal} />
      </g>

      {/* head */}
      <circle cx="0.4" cy="-11.8" r="5.2" fill={pal.skin} />
      <circle cx="-1.6" cy="-11.4" r="4.4" fill="rgba(120,70,40,0.22)" clipPath={`url(#${id}-face)`} />
      <path d="M-4.2 -10.6 Q0.6 5.5 5.2 -10.6 Q0.6 -6.6 -4.2 -10.6 Z" fill={pal.beard} />
      <path d="M-1.4 -7.4 Q0.6 1.6 2.6 -7.4" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="0.5" />
      <path d="M-3.1 -9.9 Q0.6 -8.2 4.3 -9.9 Q0.6 -7.7 -3.1 -9.9 Z" fill={pal.beard} />
      {tier >= 3 && (
        <g fill={glow} opacity="0.55">
          <circle cx="1.5" cy="-12.6" r="2.4" />
          <circle cx="4.1" cy="-12.6" r="2.4" />
        </g>
      )}
      <circle cx="1.5" cy="-12.6" r="0.95" fill={tier >= 3 ? "#fff" : "#1a1230"} />
      <circle cx="4.1" cy="-12.6" r="0.95" fill={tier >= 3 ? "#fff" : "#1a1230"} />
      <circle cx="1.8" cy="-12.9" r="0.32" fill="rgba(255,255,255,0.8)" />
      <circle cx="4.4" cy="-12.9" r="0.32" fill="rgba(255,255,255,0.8)" />
      <path d="M0.4 -14.2 L2.4 -14 M3.2 -14 L5.1 -14.3" stroke={pal.beard} strokeWidth="0.8" strokeLinecap="round" />
      <polygon points="3.1,-12.2 4.5,-10.4 2.4,-10.6" fill="rgba(170,110,70,0.65)" />

      {/* hat */}
      <path d="M-10 -14.2 Q1.5 -16.5 10.6 -14.2 Q6 -23 -3.2 -33.5 Q-6.5 -32 -7.5 -29.2 Q-4.4 -22 -10 -14.2 Z" fill={`url(#${id}-hat)`} />
      <ellipse cx="0.3" cy="-14.4" rx="10.8" ry="2.6" fill={pal.brim} />
      <rect x="-9.4" y="-17.3" width="19.4" height="2.5" fill={pal.trim} />
      <path d={diamond(2.4, -16.05, 1.8)} fill={glow} />
      <g fill={pal.trim}>
        <path d={diamond(-2.5, -21.5, 1)} />
        <path d={diamond(1.6, -25, 1)} />
        <path d={diamond(-4.4, -27.2, 1)} />
      </g>
      <path d="M-2.2 -19 Q-4.6 -25 -3.6 -31 Q-2.4 -25 -0.6 -19 Z" fill="rgba(255,255,255,0.12)" />
    </svg>
  );
}
