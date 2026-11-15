import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./fonts.css";
import "./index.css";
import App from "./App";

// Capacitor Android serves the bundled app at https://localhost. Reserve a
// real top inset even on WebView versions that report CSS safe-area as zero.
// This does not affect normal web/PWA deployments.
if (window.location.protocol === "https:" && window.location.hostname === "localhost") {
  document.documentElement.classList.add("native-android-shell");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Offline support: cache the single-file build once it has loaded (production only).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      /* offline caching unavailable (e.g. file:// or private mode) */
    });
  });
}
