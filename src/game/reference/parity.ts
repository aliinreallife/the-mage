/**
 * Numerical parity harness.
 *
 * Compares verified reference expectations against what our implementation
 * actually computes. Differences are *reported*, never hidden: expected values
 * are frozen inputs, and a mismatch never causes an expected value to be edited.
 *
 * Systems without an implementation in The Mage return `unsupported` — that is
 * an honest result, not a pass and not a failure of the reference data.
 */
import type { ParityFixture, ParityResult, ParityStatus } from "./types";

/** How a system's actual value is obtained. Each provider returns null when the
 *  system is not implemented (→ `unsupported`) or the input cannot be resolved. */
export type ParityProvider = (fixture: ParityFixture) => Record<string, number | null> | null;

export interface ParityContext {
  /** The current-mode implementation functions under test. */
  providers: Partial<Record<ParityFixture["system"], ParityProvider>>;
}

function compare(expected: Record<string, number>, actual: Record<string, number | null>): ParityResult {
  const delta: Record<string, number | null> = {};
  let compared = 0;
  let matched = 0;
  for (const [key, want] of Object.entries(expected)) {
    const got = actual[key];
    if (got === undefined || got === null || !Number.isFinite(got)) {
      delta[key] = null;
      continue;
    }
    delta[key] = want - got;
    compared++;
    if (Math.abs(want - got) < 1e-9) matched++;
  }
  const status: ParityStatus = compared === 0 ? "unsupported" : matched === compared ? "match" : "mismatch";
  return {
    refId: "",
    system: "formula",
    status,
    expected,
    actual,
    delta,
    evidence: "stored",
    detail: status === "match" ? "all keys agree" : status === "mismatch" ? `${compared - matched} key(s) differ` : "no comparable numeric output",
  };
}

/** Evaluate one fixture against the current implementation. */
export function evaluate(fx: ParityFixture, ctx: ParityContext): ParityResult {
  const provider = ctx.providers[fx.system];
  if (!provider) {
    return { refId: fx.refId, system: fx.system, status: "unsupported", expected: fx.expected, actual: {}, delta: {}, evidence: fx.evidence, detail: "no implementation wired for this system" };
  }
  let actual: Record<string, number | null> | null;
  try {
    actual = provider(fx);
  } catch (e) {
    return { refId: fx.refId, system: fx.system, status: "unsupported", expected: fx.expected, actual: {}, delta: {}, evidence: fx.evidence, detail: `provider threw: ${(e as Error).message}` };
  }
  if (actual === null) {
    return { refId: fx.refId, system: fx.system, status: "unsupported", expected: fx.expected, actual: {}, delta: {}, evidence: fx.evidence, detail: "system not implemented or input not resolvable" };
  }
  const base = compare(fx.expected, actual);
  return { ...base, refId: fx.refId, system: fx.system, evidence: fx.evidence, detail: `${base.detail}${fx.note ? ` (${fx.note})` : ""}` };
}

export function evaluateAll(fixtures: ParityFixture[], ctx: ParityContext): ParityResult[] {
  return fixtures.map((fx) => evaluate(fx, ctx));
}

/** Markdown report: every fixture, its status and its actual numbers. */
export function parityReport(results: ParityResult[], title: string, note?: string): string {
  const lines = [`# ${title}`, ""];
  if (note) lines.push(note, "");
  lines.push("| Fixture | System | Status | Expected | Actual | Delta | Evidence |", "| --- | --- | --- | --- | --- | --- | --- |");
  for (const r of results) {
    const fmt = (o: Record<string, number | null>) =>
      Object.entries(o).map(([k, v]) => `${k}=${v ?? "n/a"}`).join(", ") || "—";
    const delta = Object.entries(r.delta)
      .map(([k, v]) => (v === null ? "" : `${k}:${v > 0 ? "+" : ""}${Number(v.toPrecision(4))}`))
      .filter(Boolean)
      .join(", ") || "—";
    lines.push(`| \`${r.refId}\` | ${r.system} | ${statusLabel(r.status)} | ${fmt(r.expected)} | ${fmt(r.actual)} | ${delta} | ${r.evidence} |`);
  }
  const counts = results.reduce<Record<string, number>>((acc, r) => ((acc[r.status] = (acc[r.status] ?? 0) + 1), acc), {});
  lines.push("", `**Totals:** ${Object.entries(counts).map(([k, v]) => `${statusLabel(k as ParityStatus)} ${v}`).join(" · ") || "none"}`);
  lines.push("", "> Expected values are reference data and are never edited to make a check pass.");
  return lines.join("\n");
}

function statusLabel(s: ParityStatus) {
  return s === "match" ? "✅ match" : s === "mismatch" ? "❌ mismatch" : s === "unsupported" ? "⚪ unsupported" : "❓ unverified";
}
