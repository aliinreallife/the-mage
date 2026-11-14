/**
 * Generates the launcher / PWA icons with **no dependencies** (node:zlib only), so a fresh
 * checkout can always recreate them:            node scripts/make-icons.mjs
 * Wired into `npm run icons`, and automatically before `test` and `build`.
 *
 * Design: the game emblem — gold eight-pointed star on midnight lapis with a turquoise core.
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const TAU = Math.PI * 2;

/* ------------------------------------------------------------- PNG writer */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
/** Encode RGBA pixels (0–255, straight alpha) as an 8-bit PNG. */
function encodePng(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ---------------------------------------------------------------- drawing */

const mix = (a, b, t) => a + (b - a) * t;
const over = (dst, src, a) => dst * (1 - a) + src * a;

/** 16-point star polygon (outer/inner radii), wound clockwise. */
function starPoints(cx, cy, ro, ri) {
  const pts = [];
  for (let k = 0; k < 16; k++) {
    const a = (k * Math.PI) / 8 - Math.PI / 2;
    const r = k % 2 === 0 ? ro : ri;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}
function inPolygon(pts, x, y) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
/** Signed distance from a rounded-rectangle edge (negative inside). */
const roundRectSdf = (x, y, w, h, r) => {
  const qx = Math.abs(x - w / 2) - (w / 2 - r);
  const qy = Math.abs(y - h / 2) - (h / 2 - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};

function icon(size, maskable) {
  const SS = 3; // 3×3 supersampling for smooth edges
  const rgba = Buffer.alloc(size * size * 4);
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const scale = maskable ? 0.62 : 0.8; // maskable art stays inside the 80% safe zone
  const R = (s / 2) * scale;
  const outer = starPoints(cx, cy, R, R * 0.7654);
  const inner = starPoints(cx, cy, R * 0.6, R * 0.6 * 0.7654);
  const core = R * 0.3;

  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;
          // background: radial lapis gradient, clipped to a rounded square (or full-bleed for maskable)
          const d = Math.hypot(px - cx, py - cy * 0.9) / (s * 0.75);
          let cr = px < cx ? mix(27, 11, d) : mix(27, 11, d);
          let cg = mix(42, 18, d);
          let cb = mix(99, 48, d);
          // subtle corner darkening
          const edge = Math.hypot(px - cx, py - cy) / (s * 0.72);
          cr *= 1 - edge * 0.28;
          cg *= 1 - edge * 0.28;
          cb *= 1 - edge * 0.2;
          let ca = 1;
          if (!maskable && roundRectSdf(px, py, s, s, s * 0.2) > 0) ca = 0;
          // turquoise glow behind the emblem
          const glow = Math.max(0, 1 - Math.hypot(px - cx, py - cy) / (R * 1.25));
          cr = over(cr, 63, glow * 0.3);
          cg = over(cg, 217, glow * 0.3);
          cb = over(cb, 200, glow * 0.3);
          if (inPolygon(outer, px, py)) {
            const t = (px - (cx - R) + (py - (cy - R))) / (4 * R);
            cr = mix(255, 201, Math.min(1, Math.max(0, t)));
            cg = mix(226, 138, Math.min(1, Math.max(0, t)));
            cb = mix(160, 36, Math.min(1, Math.max(0, t)));
          }
          if (inPolygon(inner, px, py)) {
            cr = 11;
            cg = 18;
            cb = 48;
          }
          const dc = Math.hypot(px - cx, py - cy);
          if (dc < core) {
            const t = dc / core;
            cr = over(255, 26, t);
            cg = over(255, 167, t);
            cb = over(255, 155, t);
            if (t < 0.35) {
              cr = over(255, 191, t / 0.35);
              cg = over(255, 251, t / 0.35);
              cb = over(255, 242, t / 0.35);
            }
          }
          r += cr * ca;
          g += cg * ca;
          b += cb * ca;
          a += ca;
        }
      }
      const n = SS * SS;
      const i = (y * s + x) * 4;
      const av = a / n;
      rgba[i] = Math.round(av > 0 ? r / a : 0);
      rgba[i + 1] = Math.round(av > 0 ? g / a : 0);
      rgba[i + 2] = Math.round(av > 0 ? b / a : 0);
      rgba[i + 3] = Math.round(av * 255);
    }
  }
  return encodePng(s, s, rgba);
}

mkdirSync("public/icons", { recursive: true });
for (const [file, size, mask] of [
  ["public/icons/icon-192.png", 192, false],
  ["public/icons/icon-512.png", 512, false],
  ["public/icons/icon-maskable-512.png", 512, true],
]) {
  const png = icon(size, mask);
  writeFileSync(file, png);
  console.log(`${file}  ${png.length} bytes  ${size}x${size}${mask ? " (maskable)" : ""}`);
}
void TAU;
