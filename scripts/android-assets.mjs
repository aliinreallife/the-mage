/** Install real Android launcher icons into the freshly generated Capacitor shell.
 * Capacitor's default Android icon is otherwise NOT replaced by PWA icons.
 * Runs after `npx cap sync android` and before Gradle.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const root = 'android/app/src/main/res';
if (!existsSync(root)) throw new Error('Run npx cap add android and npx cap sync android first');
const standard = 'public/icons/icon-512.png';
const foreground = Buffer.from(readFileSync('assets/embedded/icons/android-foreground-512.png.b64', 'utf8').trim(), 'base64');
if (foreground.toString('hex',0,8) !== '89504e470d0a1a0a') throw new Error('Missing valid PNG for Android adaptive foreground');
for (const density of ['mdpi','hdpi','xhdpi','xxhdpi','xxxhdpi']) {
  const dir = `${root}/mipmap-${density}`;
  mkdirSync(dir,{ recursive:true });
  for (const kind of ['ic_launcher','ic_launcher_round']) copyFileSync(standard, `${dir}/${kind}.png`);
  writeFileSync(`${dir}/ic_launcher_foreground.png`, foreground);
}
const adaptive = `${root}/mipmap-anydpi-v26`;
mkdirSync(adaptive,{ recursive:true });
const xml = `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n  <background android:drawable="@color/mage_launcher_background" />\n  <foreground android:drawable="@mipmap/ic_launcher_foreground" />\n</adaptive-icon>\n`;
for(const kind of ['ic_launcher','ic_launcher_round']) writeFileSync(`${adaptive}/${kind}.xml`,xml);
const colors = `${root}/values`;
mkdirSync(colors,{ recursive:true });
writeFileSync(`${colors}/mage_icon_background.xml`, `<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="mage_launcher_background">#070F25</color></resources>\n`);
console.log('Applied The Mage launcher icons to Android mipmaps and adaptive icon resources');
