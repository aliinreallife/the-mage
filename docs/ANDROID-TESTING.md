# Android / phone testing — staging and install

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
