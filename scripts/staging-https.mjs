/**
 * Local HTTPS staging server for phone testing on the same Wi-Fi.
 *   npm run build && npm run staging:https
 *
 * A service worker (required to "Install app") only works on HTTPS or localhost.
 * A self-signed certificate is created automatically, but Android will not trust it
 * until the certificate is installed on the phone. For a URL that installs without
 * any certificate setup, deploy the production ZIP to any public HTTPS static host
 * (Cloudflare Pages / Netlify / Vercel); see docs/ANDROID-TESTING.md.
 */
import { createServer } from "node:https";
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { extname, join, resolve, sep } from "node:path";
import { execFileSync } from "node:child_process";

const root = resolve(process.argv[2] ?? "dist");
const certDir = resolve(".certs");
const keyFile = join(certDir, "dev-key.pem");
const certFile = join(certDir, "dev-cert.pem");
mkdirSync(certDir, { recursive: true });
if (!existsSync(keyFile) || !existsSync(certFile)) {
  try {
    execFileSync("openssl", [
      "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "30",
      "-keyout", keyFile, "-out", certFile,
      "-subj", "/CN=afsungar.local",
      "-addext", "subjectAltName=DNS:localhost,IP:127.0.0.1",
    ], { stdio: "ignore" });
    console.log("created self-signed certificate in .certs/");
  } catch {
    console.error("openssl is required to create the development certificate");
    process.exit(1);
  }
}
const mime = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".png": "image/png", ".webmanifest": "application/manifest+json", ".zip": "application/zip", ".txt": "text/plain; charset=utf-8",
};
const server = createServer({ key: readFileSync(keyFile), cert: readFileSync(certFile) }, (req, res) => {
  const url = new URL(req.url ?? "/", "https://localhost");
  let name = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
  let path = resolve(root, name);
  if (path !== root && !path.startsWith(root + sep)) return res.writeHead(403).end("forbidden");
  if (!existsSync(path) || statSync(path).isDirectory()) path = join(root, "index.html"); // SPA fallback
  res.writeHead(200, { "Content-Type": mime[extname(path)] ?? "application/octet-stream", "Cache-Control": "no-cache" });
  createReadStream(path).pipe(res);
});
const port = Number(process.env.PORT ?? 8443);
server.listen(port, "0.0.0.0", () => {
  const lan = Object.values(networkInterfaces()).flat().filter((n) => n && n.family === "IPv4" && !n.internal).map((n) => n.address);
  console.log(`serving ${root}`);
  console.log(`  local: https://localhost:${port}/`);
  for (const ip of lan) console.log(`  phone: https://${ip}:${port}/`);
  console.log("A self-signed certificate triggers a browser warning.");
  console.log("For install without warnings, deploy the production ZIP to a public HTTPS host.");
});
