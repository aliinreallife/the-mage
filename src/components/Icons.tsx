import type { ReactNode } from "react";
import type { UpgradeId } from "../game/data";

const GLYPHS: Record<UpgradeId, ReactNode> = {
  bolt: <path d="M12 2.5l1.9 7.6 7.6 1.9-7.6 1.9L12 21.5l-1.9-7.6L2.5 12l7.6-1.9z" />,
  fire: (
    <path d="M12 3c1 3.2 5 5.4 5 10a5 5 0 0 1-10 0c0-2 .9-3.3 2-4.3 0 1.7.8 2.7 1.8 2.7C12.6 9 11 6.4 12 3z" />
  ),
  zap: <path d="M13.5 2.5L5 13.5h6l-1.2 8L19 10.5h-6.2z" />,
  frost: (
    <>
      <path d="M12 2.5v19M3.8 7.2l16.4 9.6M20.2 7.2L3.8 16.8" />
      <path d="M9.6 4.6L12 7l2.4-2.4M9.6 19.4L12 17l2.4 2.4" />
    </>
  ),
  orbs: (
    <>
      <circle cx="12" cy="12" r="2.4" />
      <circle cx="12" cy="12" r="8.2" strokeDasharray="2.5 3.5" />
      <circle cx="12" cy="3.8" r="1.9" fill="currentColor" />
      <circle cx="19.1" cy="16.1" r="1.9" fill="currentColor" />
      <circle cx="4.9" cy="16.1" r="1.9" fill="currentColor" />
    </>
  ),
  meteor: (
    <>
      <circle cx="8.5" cy="15.5" r="4.6" />
      <path d="M13 11l8-8M15.6 15l5.4-5.4M9.4 8.8L15 3.2" />
    </>
  ),
  blade: <path d="M17.5 3.2a9.3 9.3 0 1 0 0 17.6 7.6 7.6 0 0 1 0-17.6z" />,
  nova: (
    <>
      <circle cx="12" cy="12" r="3.8" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1" />
    </>
  ),
  might: (
    <>
      <path d="M4 20l9.5-9.5" />
      <path d="M17 3v8M13 7h8" />
      <path d="M6.5 13.5l4 4" />
    </>
  ),
  haste: (
    <>
      <path d="M7 3h10M7 21h10" />
      <path d="M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9" />
    </>
  ),
  swift: <path d="M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7" />,
  vital: <path d="M12 20.5s-7.5-4.8-7.5-10.6A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 2.7c0 5.800-7.5 10.6-7.5 10.6z" />,
  regen: (
    <>
      <path d="M9.5 3h5M10.5 3v5.5L6 17.2A2.5 2.5 0 0 0 8.200 21h7.600A2.5 2.5 0 0 0 18 17.2l-4.500-8.700V3" />
      <path d="M8 15h8" />
    </>
  ),
  magnet: (
    <>
      <path d="M6 4v8a6 6 0 0 0 12 0V4h-4v8a2 2 0 0 1-4 0V4z" />
      <path d="M6 8h4M14 8h4" />
    </>
  ),
  wisdom: (
    <>
      <path d="M12 6.500c-2-1.500-5-2-8-2v13.500c3 0 6 .500 8 2 2-1.500 5-2 8-2V4.500c-3 0-6 .500-8 2z" />
      <path d="M12 6.500V20" />
    </>
  ),
  armor: <path d="M12 3l7 3v5.200c0 5-3.500 8.300-7 9.800-3.500-1.500-7-4.800-7-9.800V6z" />,
  spirit: (
    <>
      <path d="M12 3c-3.6 0-6 2.7-6 6.2V20l2-1.6 2 1.6 2-1.6 2 1.6 2-1.6 2 1.6V9.2C18 5.7 15.6 3 12 3z" />
      <circle cx="9.6" cy="10" r="1" fill="currentColor" />
      <circle cx="14.4" cy="10" r="1" fill="currentColor" />
    </>
  ),
  cyclone: <path d="M4 6h14M6 10h11M8 14h8M10 18h5M12 21h2" />,
  energy: (
    <>
      <path d="M3 12h18" />
      <path d="M3 9.5h18M3 14.5h18" strokeOpacity="0.45" />
      <circle cx="4" cy="12" r="2.2" fill="currentColor" />
    </>
  ),
  flash: (
    <>
      <path d="M13 2.5L7 13h5l-1 8.5L17 11h-5z" />
      <path d="M4 20.5h16" strokeOpacity="0.5" />
    </>
  ),
  snipe: (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v5.2c0 5-3.5 8.3-7 9.8-3.5-1.5-7-4.8-7-9.8V6z" />
      <path d="M12 7v10M8 11h8" strokeOpacity="0.55" />
    </>
  ),
  heal: (
    <>
      <circle cx="12" cy="14" r="6.800" />
      <path d="M9.500 7.800L9 4l3 2 3-2-.500 3.800" />
    </>
  ),
};

export function UpgradeIcon({ id, size = 24 }: { id: UpgradeId; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {GLYPHS[id]}
    </svg>
  );
}

const STAR_POINTS = Array.from({ length: 16 }, (_, k) => {
  const a = (k * Math.PI) / 8;
  const r = k % 2 === 0 ? 47 : 47 * 0.7654;
  return `${(50 + Math.cos(a) * r).toFixed(2)},${(50 + Math.sin(a) * r).toFixed(2)}`;
}).join(" ");

/** Eight-pointed star medallion — the same motif as the ground tiles. */
export function StarBadge({ color, size = 56, children }: { color: string; size?: number; children: ReactNode }) {
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size, color }}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <polygon points={STAR_POINTS} fill="#121b44" stroke="currentColor" strokeOpacity="0.55" strokeWidth="2.5" />
      </svg>
      <span className="relative grid place-items-center">{children}</span>
    </span>
  );
}

type UiIconName = "pause" | "play" | "sound" | "mute" | "skull" | "restart" | "home" | "chest" | "book";

const UI: Record<UiIconName, ReactNode> = {
  pause: <path d="M8 5v14M16 5v14" />,
  play: <path d="M8 5l11 7-11 7z" />,
  sound: (
    <>
      <path d="M4 9.500v5h3.500L12 18.500v-13L7.500 9.500z" />
      <path d="M15.500 9a4 4 0 0 1 0 6M18 6.500a7.500 7.500 0 0 1 0 11" />
    </>
  ),
  mute: (
    <>
      <path d="M4 9.500v5h3.500L12 18.500v-13L7.500 9.500z" />
      <path d="M16 9.500l5 5M21 9.500l-5 5" />
    </>
  ),
  skull: (
    <>
      <path d="M12 3a8 8 0 0 0-5 14.200V20.500h10v-3.300A8 8 0 0 0 12 3z" />
      <circle cx="9" cy="12" r="1.400" fill="currentColor" />
      <circle cx="15" cy="12" r="1.400" fill="currentColor" />
      <path d="M10.500 20.500v-2.500M13.500 20.500v-2.500" />
    </>
  ),
  restart: (
    <>
      <path d="M4.500 12a7.500 7.500 0 1 0 2.400-5.500" />
      <path d="M4 4.500v4.500h4.500" />
    </>
  ),
  chest: (
    <>
      <path d="M4 10.5L6 6h12l2 4.5M4 10.5h16V19H4zM12 10.5V19M10.5 14h3" />
    </>
  ),
  book: (
    <>
      <path d="M5 4h6a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2.5H5zM19 4h-2.5A2.5 2.5 0 0 0 14 6.5V20a2.5 2.5 0 0 1 2.5-2.5H19z" />
    </>
  ),
  home: <path d="M4 11l8-7 8 7M6.500 9.500V20h11V9.500" />,
};

/* ------------------------------------------------------------ artifacts */

const ART: Record<string, ReactNode> = {
  ruby: <path d="M12 3l6 5-6 13L6 8z" />,
  mithril: <path d="M12 3l7 3v5.2c0 5-3.5 8.3-7 9.8-3.5-1.5-7-4.8-7-9.8V6zM9 11l2.2 2.4L15.5 9" />,
  broom: <path d="M14 3l7 7M17.5 6.5l-8 8M4 20l3.5-1 6-6-2.5-2.5-6 6z" />,
  backpack: <path d="M6 9.5A3.5 3.5 0 0 1 9.5 6h5A3.5 3.5 0 0 1 18 9.5V20H6zM9.5 6V4.8A1.8 1.8 0 0 1 11.3 3h1.4a1.8 1.8 0 0 1 1.8 1.8V6M9 13h6" />,
  scroll: <path d="M7 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7M7 4a2 2 0 0 0-2 2v1M8.5 9h7M8.5 13h7M8.5 17h4" />,
  mandrake: <path d="M12 21c-3 0-4.5-3-4.5-6.5S9 8 12 8s4.5 3 4.5 6.5S15 21 12 21zM12 8V4M12 6l-3-2M12 6l3-2" />,
  totem: <path d="M8 3h8v5H8zM9 8h6v5H9zM10 13h4v8h-4zM11 5.5h2M11 10.5h2" />,
  magicbullet: <path d="M3 12h11M10 8l4 4-4 4M17 6.5l4 5.5-4 5.5" />,
  torch: <path d="M12 21v-6M9.5 15h5M12 15c3 0 4.5-2 4.5-4.5S14 3 12 3 7.5 8 7.5 10.5 9 15 12 15z" />,
  mooncrystal: <path d="M15.5 3.5a8.5 8.5 0 1 0 0 17 7 7 0 0 1 0-17zM9 8l1.5 3L9 14l-1.5-3z" />,
  thunderspear: <path d="M4 20l9-9M15.5 3.5l5 5-4 1-1-1-3.5 3.5-1.5-1.5L14 6l-1-1z" />,
  galaxycore: <path d="M12 12c0-3 2.5-5 5.5-5S22 9.5 22 12M12 12c0 3-2.5 5-5.5 5S2 14.5 2 12M12 12c-3 0-5-2.5-5-5.5S9.5 2 12 2M12 12c3 0 5 2.5 5 5.5S14.5 22 12 22" />,
  dimgate: <path d="M12 3a6 6 0 0 1 6 6v12H6V9a6 6 0 0 1 6-6zM12 8a3 3 0 0 0-3 3v10h6V11a3 3 0 0 0-3-3z" />,
  forcefield: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7a5 5 0 0 0-5 5" />,
  spiderweb: <path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19M12 7.5L16.5 12 12 16.5 7.5 12z" />,
  scythe: <path d="M20 4c-6 0-11 3.5-13 9M20 4c0 6-3 10-8 11M7 13l-3 7" />,
  clockwork: <path d="M12 5.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM12 9v3.2l2.4 1.6M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />,
  blackcat: <path d="M5 9l1-5 4 2.5h4L18 4l1 5v5a7 7 0 0 1-14 0zM9 12.5h.01M15 12.5h.01M12 15.5l-1.2 1.2M12 15.5l1.2 1.2" />,
  hourglass: <path d="M7 3h10M7 21h10M8 3v3.5l4 5 4-5V3M8 21v-3.5l4-5 4 5V21" />,
  pandora: <path d="M3.5 8h17v12h-17zM3.5 8l2-4h13l2 4M12 8v12M9.5 12.5h5" />,
  uranium: <path d="M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19zM12 8.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4zM12 8.8V3M9.2 13.6L4.5 16.4M14.8 13.6l4.7 2.8" />,
  secondheart: <path d="M12 20.5s-7.5-4.8-7.5-10.6A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 2.7c0 5.8-7.5 10.6-7.5 10.6zM12 10.5v5M9.5 13h5" />,
  exorcism: <path d="M12 2.5l2.4 6.1 6.6.4-5.1 4.2 1.7 6.3L12 16l-5.6 3.5 1.7-6.3L3 9l6.6-.4z" />,
  crystalseed: <path d="M12 2.5l5 6-5 13-5-13zM7 8.5h10" />,
  manawheel: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" />,
  twincore: <path d="M8.5 12a4 4 0 1 0 0-.01M15.5 12a4 4 0 1 0 0-.01M12 4v16" />,
  brand: <path d="M6 3l4 8-4 10M18 3l-4 8 4 10M9 11h6" />,
};

export function ArtifactIcon({ id, size = 24 }: { id: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ART[id] ?? ART.ruby}
    </svg>
  );
}

export function UiIcon({ name, size = 20 }: { name: UiIconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {UI[name]}
    </svg>
  );
}
