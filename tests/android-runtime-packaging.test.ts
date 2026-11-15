import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
const read = (s: string) => readFileSync(s, 'utf8');
describe('Android graphics and update packaging', () => {
  it('uses the approved icon instead of generated Capacitor template branding', () => {
    for (const f of ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'android-foreground-512.png']) {
      expect(existsSync(`assets/embedded/icons/${f}.b64`)).toBe(true);
    }
    const script = read('scripts/android-assets.mjs');
    expect(script).toContain('ic_launcher_foreground');
    expect(script).toContain('mage_launcher_background');
    expect(script).toContain('ic_launcher_round');
  });
  it('configures stable secret-based signing with a monotone versionCode', () => {
    const flow = read('.github/workflows/android-debug.yml');
    expect(flow).toContain('MAGE_ANDROID_KEYSTORE_BASE64');
    expect(flow).toContain('apksigner');
    expect(flow).toContain('versionCode');
    expect(flow).toContain('This temporary DEBUG-signed APK cannot upgrade'); // warning when secrets unavailable
    expect(flow).not.toContain('BEGIN PRIVATE KEY');
  });
});
