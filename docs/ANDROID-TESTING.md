# Android / phone testing — staging and install

## Installable Android debug APK (Capacitor evaluation)

A GitHub Actions workflow at `.github/workflows/android-debug.yml` packages the **current playable web game** into an Android **debug-signed APK**. It includes the built game assets locally, so it does not require a hosted TWA origin. This is a **WebView wrapper**, NOT a port of the game engine to native Android code.

### Download the current APK from GitHub

Once the Android workflow completes on `main`, it automatically publishes an **Android prerelease with `the-mage.apk` attached directly**:

1. Open [GitHub Releases](https://github.com/aliinreallife/the-mage/releases).
2. Choose the newest **The Mage Android** prerelease.
3. Under **Assets**, download `the-mage.apk` directly (no ZIP extraction needed).
4. Transfer to your Android phone and open the APK to install.

Each successful main-branch Android build creates a unique `android-test-<run-number>` prerelease. A failed build will not publish an APK. The build itself is also available under [Android workflow runs](https://github.com/aliinreallife/the-mage/actions/workflows/android-debug.yml) as the `the-mage-android-apk` artifact, but Actions artifacts are ZIP files and may require GitHub sign-in.

**Package/signing warning:** Without all three permanent signing secrets, the APK is a temporary-debug-signed `ir.themage.preview` app, installable beside the older `ir.themage.debug` app. It **cannot be relied on to update another preview**. With permanent signing configured, builds use `ir.themage.debug` and are intended for subsequent in-place upgrades (once migrated from any old, differently signed installation). Avoid uninstalling the old app if you need its locally stored saves.


The APK is meant for device testing, not marketplace release: it is debug signed, unoptimized for store distribution, and has not been physically performance-tested. A final release requires an owned package ID, signing credentials, device QA, and proper Android lifecycle/storage testing.

For gameplay benchmarking, record a 15–20-minute run at normal and heavy enemy density on real Android hardware. Measure sustained FPS, slow frames, memory, battery/heat, touch responsiveness, and resume/offline behavior. **60 FPS must be measured, not assumed.**


## Temporary public HTTPS staging URL

A Cloudflare quick tunnel was started from this sandbox and verified externally:

**https://completion-teach-easily-cells.trycloudflare.com**

It serves the game, manifest, service worker, launcher icons and both ZIPs
(`/downloads/the-mage-source.zip`, `/downloads/the-mage-production.zip`). It has **no uptime
guarantee** and stops when the sandbox stops; if it is no longer reachable, deploy the
production ZIP to a static HTTPS host as described below. Because it uses a valid Cloudflare
certificate, Chrome on Android should offer **Install app** without certificate warnings.

Downloads page: `…/downloads/` — direct files are also in `public/downloads/` and
`release/`.

## Permanent hosting and alternatives

This sandbox has no hosting credentials; a permanent URL requires you to deploy. Use whichever
is convenient:

1. `npm run build && npm run staging:https` — a real HTTPS server for your **own Wi-Fi**.
   It prints `https://<your-lan-ip>:8443/`. Android shows a certificate warning because the
   certificate is self-signed; **installing the PWA requires trusting that certificate**
   (or use a tunnel/host below). This is suitable for a quick phone check of touch/layout.
2. **Permanent option:** `release/the-mage-production.zip` → extract and upload the
   **contents**:
   - Cloudflare Pages: project → Direct Upload → upload the folder;
   - Netlify Drop (`app.netlify.com/drop`): drag the extracted folder;
   - Vercel: `npx vercel deploy dist --prod`;
   - GitHub Pages: commit contents to a Pages branch.
   All serve HTTPS, required for service workers and installation.

## Packaging is reproducible from this source

Generated binaries (launcher PNGs, QA screenshots) can be stripped by some export/snapshot
pipelines, so the source carries base64 mirrors of every one of them under
`assets/embedded/`. `npm run package` restores them automatically, and if the QA screenshots
are still missing it regenerates them with the Chromium smoke test before archiving:

```bash
npm run binaries:restore   # restore PNGs from the mirrors
npm run qa:screenshots    # re-run the browser QA and copy the screenshots into docs/qa
npm run package           # icons → screenshots → build → verify → archives
npm run verify:delivery   # download the archives from a public URL and verify them
```

## Installing on Android

1. Open the HTTPS URL in Chrome.
2. Menu → **Install app** / **Add to Home screen**.
3. Launch once online so the service worker caches the game.
4. Enable airplane mode and relaunch from the home-screen icon to confirm offline play.

## Known limitations of the local self-signed server

- Chrome may block service-worker registration on an untrusted certificate.
- To avoid this, use a public HTTPS host or a tunnel with a valid certificate
  (`cloudflared tunnel --url http://localhost:4173` after `npm run preview`).
- No physical Android device was available in this environment; nothing below has been
  executed on hardware.

**Important preview safety (November 2026):** Unless all three signing secrets are configured, the workflow now uses package ID `ir.themage.preview` and label «آخرین افسونگر آزمایشی». This temporary test app **installs alongside** an existing `ir.themage.debug` installation instead of requiring the user to erase existing saves to try a crash fix. This is *not* an upgrade of the original app, and repeated preview APKs can still have incompatible ephemeral debug keys. Once stable signing is set up, the workflow switches back to the intended `ir.themage.debug` ID with a reusable signing certificate. An old differently signed installation of that ID still needs a one-time migration; no workaround can preserve the same Android identity without the original private key.\n\n## 2026-11-15: Crash investigation, mobile graphics guard, and stable APK updates

**Crash reports:** A force-close during play is not yet diagnosed. The updated build
reduces Android Canvas backing pixels, throttles visual rendering if measured frames
are consistently expensive, and enables locally stored JavaScript error reports. It
never uploads data. A native WebView renderer being killed by Android may bypass
JavaScript handlers entirely, so **an Android crash log is still necessary** to
identify the root cause. To capture the native crash on a Windows PC with Android
platform-tools installed (with USB debugging enabled):

```powershell
adb devices
adb logcat -c
# launch the game and reproduce the force-close, then:
adb logcat -d -b crash -v time > mage-crash.txt
adb logcat -d -v time -s AndroidRuntime:E chromium:E cr_AwContents:E ActivityManager:W > mage-webview.txt
```

Send both logs after checking them for anything sensitive; they may include device
metadata. For a caught JavaScript exception, relaunch and use the small
**«کپی گزارش خطای قبلی»** control on the main menu. A blank log or missing control
does not rule out an Android native renderer crash.

**Why previous APKs wouldn't upgrade:** Each GitHub debug build used a runner-created
signing certificate. Android requires **the same package ID and the same certificate
for every update**, and the first debug cert has not been retained. Merely increasing
`versionCode` cannot fix that; there is no safe way to recover the private signing
key from the installed APK. A one-time migration to a *persistently signed* build is
necessary. **Uninstalling the prior app can erase local game saves**; back up data
before doing so.

**Stable signing, without committing secrets:** Generate one Java keystore **on your
own computer**, retain a private backup permanently, and add these three encrypted
GitHub Actions repository secrets (Settings → Secrets and variables → Actions):

- `MAGE_ANDROID_KEYSTORE_BASE64`: Base64 of the complete keystore binary
- `MAGE_ANDROID_KEYSTORE_PASSWORD`: keystore password
- `MAGE_ANDROID_KEY_PASSWORD`: private-key password

Create the keystore with the JDK `keytool -genkeypair -keystore mage-signing.jks
-alias mage -keyalg RSA -keysize 3072 -validity 10000` (enter passwords locally,
never send them in a chat or commit them). For PowerShell, the Base64 value can be
produced with `[Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path
'mage-signing.jks')))`. Never post that value publicly.

Once all three secrets exist, the same GitHub Android workflow builds a release APK
signed with your **stable key**, verifies its signature, and increments its version
code. After installing the first persistently signed APK, later builds can update it
in place without removing the app. If secrets are absent, the workflow deliberately
falls back to temporary debug signing and prints a prominent warning—**those APKs
still cannot upgrade each other**.

The launcher now uses the same gold/turquoise Mage artwork for the web manifest,
legacy Android launcher icons, and Android 8+ adaptive foreground resources. Native
appearance, stability and actual gameplay FPS still require testing on hardware.
