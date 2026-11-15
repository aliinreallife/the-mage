import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./fonts.css";
import "./index.css";
import App from "./App";
import { installRuntimeErrorListeners } from "./game/diagnostics";

// Capacitor Android serves the bundled app at https://localhost. Reserve a
// real top inset even on WebView versions that report CSS safe-area as zero.
// This does not affect normal web/PWA deployments.
if (window.location.protocol === "https:" && window.location.hostname === "localhost") {
  document.documentElement.classList.add("native-android-shell");
}

installRuntimeErrorListeners();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Capacitor already bundles the full offline game. A browser service worker in
// the Android WebView can retain obsolete JS between APK updates. Remove older
// registrations in the native shell, but keep PWA caching on hosted web builds.
const isAndroidNativeShell = window.location.protocol === "https:"
  && window.location.hostname === "localhost" && /Android/i.test(navigator.userAgent);
if ("serviceWorker" in navigator) {
  if (isAndroidNativeShell) {
    void navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch(() => { /* native assets remain available without service workers */ });
  } else if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      void navigator.serviceWorker.register("./sw.js").catch(() => {
        /* offline caching unavailable (e.g. file:// or private mode) */
      });
    });
  }
}
