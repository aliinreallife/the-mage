/**
 * Read-only structural guard for the canonical four-document handoff.
 * Does not create, normalize, rewrite or delete documents.
 * Intentionally cannot judge whether product claims/decisions are true.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const folder = resolve(root, "the-mage-docs");
const expected = ["PRD.md", "decisions.md", "status.md", "how_to_update_docs.md"];
const errors = [];
function check(ok, message) { if (!ok) errors.push(message); }
check(existsSync(folder), "Missing the-mage-docs/ folder");
const found = existsSync(folder) ? readdirSync(folder).sort() : [];
check(JSON.stringify(found) === JSON.stringify([...expected].sort()),
  "Canonical documentation folder must contain exactly the four required files: " + found.join(", "));

const data = Object.fromEntries(expected.map(name => {
  const path = resolve(folder, name);
  const content = existsSync(path) ? readFileSync(path, "utf8") : "";
  check(content.trim().length > 100, name + ": missing or nearly empty");
  return [name, content];
}));

const prd = data["PRD.md"], decisions = data["decisions.md"],
  status = data["status.md"], guide = data["how_to_update_docs.md"];
for (const [label, ok] of [
  ["PRD reconstruction/approval state", /پیش‌نویس بازسازی‌شده/.test(prd)],
  ["PRD functional requirements", /نیازمندی‌های عملکردی/.test(prd)],
  ["PRD acceptance criteria", /معیار پذیرش/.test(prd)],
  ["PRD uncertainty", /محدودیت شناخت|نیازمند تأیید/.test(prd)],
  ["decisions current index", /## فهرست تصمیم‌های جاری/.test(decisions)],
  ["decisions historical provenance", /مبنا و منشأ/.test(decisions)],
  ["status current view", /## تصویر فعلی/.test(status)],
  ["status open work table", /## کارهای باز/.test(status)],
  ["status continuation", /## ادامه از اینجا/.test(status)],
  ["status history", /## تاریخچهٔ کارها/.test(status)],
  ["guide 10 sections", [...guide.matchAll(/^## ([۰-۹]+)\./gm)].length === 10],
  ["guide no-secret rule", /secret|رمز|محرمانه/.test(guide)],
  ["guide idempotency", /idempotent/.test(guide)],
]) check(ok, label + ": required section missing");

const DECISION_HEADING = /^## (D-\d{3,}) — /gm;
const DECISION_INDEX = /^\| (D-\d{3,}) \|/gm;
const taskHeader = /^#### (T-\d{3,}) — /gm;
const openTask = /^\| (T-\d{3,}) \|/gm;
function ids(regexp, markdown) { return [...markdown.matchAll(regexp)].map(match => match[1]); }
function unique(array, label) { check(new Set(array).size === array.length, label + " contains duplicate IDs"); }
const headingIds = ids(DECISION_HEADING, decisions);
const indexedIds = ids(DECISION_INDEX, decisions);
unique(headingIds, "Decision headings");
unique(indexedIds, "Decision index");
check(headingIds.length > 0, "No dated decisions found");
check(JSON.stringify([...headingIds].sort()) === JSON.stringify([...indexedIds].sort()),
  "Decision index and detailed records differ");
const openIds = ids(openTask, status);
unique(openIds, "Open tasks");
check(openIds.length > 0, "Status must include actionable open tasks");
check(ids(taskHeader, status).length > 0, "Status must include historical task entries");
check(/\b2026-\d{2}-\d{2}\b/.test(status), "Status has no ISO date");
for (const line of status.split("\n")) {
  if (!/^\| T-\d{3,} \|/.test(line)) continue;
  check(/\| (در صف|در حال انجام|منتظر بررسی|مسدود|متوقف) \|/.test(line),
    "Unknown open-task status: " + line);
}

// Only resolve actual relative Markdown links, not external URLs or code paths.
// Parent documentation documents are intentionally retained as legacy evidence.
for (const [filename, markdown] of Object.entries(data)) {
  for (const match of markdown.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const href = match[1].split("#")[0].trim();
    if (!href || /^(https?:|mailto:)/i.test(href)) continue;
    if (href.includes("?") || href.startsWith("/")) continue;
    const target = resolve(folder, href);
    check(existsSync(target), filename + ": broken relative link " + href);
  }
}

if (errors.length) {
  console.error("The Mage docs structural check FAILED:\n" + errors.map(x => "- " + x).join("\n"));
  process.exitCode = 1;
} else {
  console.log("PASS: canonical four-file project docs; 10-section guide; IDs, structure and relative links checked (read only).");
}
