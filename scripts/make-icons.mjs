/** Restore the approved Mage icon from source-controlled PNG mirrors.
 * All outputs are deterministic and require only built-in Node modules.
 * Artwork: gold Persian star and turquoise magical flame on midnight lapis.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const icons = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-maskable-512.png', 512],
];
mkdirSync('public/icons', { recursive: true });
for (const [name, size] of icons) {
  const buf = Buffer.from(readFileSync(`assets/embedded/icons/${name}.b64`, 'utf8').trim(), 'base64');
  if (buf.toString('hex', 0, 8) !== '89504e470d0a1a0a' || buf.readUInt32BE(16) !== size || buf.readUInt32BE(20) !== size) {
    throw new Error(`Invalid ${name}: expected ${size}x${size} PNG`);
  }
  writeFileSync(`public/icons/${name}`, buf);
  console.log(`public/icons/${name} ${buf.length} bytes`);
}
