/**
 * Import interface for datasets supplied by the reverse-engineering project.
 *
 * Contract (see docs/reference/HANDOFF.md):
 *   - JSON files named reference-<gameVersion>-<kind>.json
 *   - shape: { gameVersion, kind, source, records: [...] }
 *   - CSV files use the same columns as the record fields, with a header row
 *
 * The importer is deliberately conservative: it validates, reports, and refuses
 * to invent anything. Unsupported fields are listed, not dropped silently, and
 * evidence categories are copied through untouched.
 */
import { validateDataset, type ValidationReport } from "./validator";
import {
  REFERENCE_GAME_VERSION,
  type GameVersion,
  type ReferenceDatasetKind,
} from "./types";

export interface ImportedDataset<T = Record<string, unknown>> {
  gameVersion: GameVersion;
  kind: ReferenceDatasetKind;
  source: string;
  records: T[];
  report: ValidationReport;
}

export interface ImportFailure {
  kind: ReferenceDatasetKind;
  source: string;
  reason: string;
  report?: ValidationReport;
}

export type ImportOutcome<T = Record<string, unknown>> =
  | { ok: true; dataset: ImportedDataset<T>; report: ValidationReport }
  | { ok: false; failure: ImportFailure };

/** Parse a dataset object (from JSON.parse or a JS literal) and validate it. */
export function importDataset(raw: unknown): ImportOutcome {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, failure: { kind: "stats", source: "-", reason: "dataset is not an object" } };
  }
  const d = raw as Record<string, unknown>;
  const kind = d.kind as ReferenceDatasetKind;
  if (typeof kind !== "string") return { ok: false, failure: { kind: "stats", source: "-", reason: "missing kind" } };
  const allowed: ReferenceDatasetKind[] = ["progression", "enemies", "magic", "combinations", "artifacts", "synergies", "formulas", "stats", "stages"];
  if (!allowed.includes(kind)) return { ok: false, failure: { kind: "stats", source: "-", reason: `unknown kind "${kind}"` } };
  if (d.gameVersion !== REFERENCE_GAME_VERSION)
    return { ok: false, failure: { kind, source: String(d.source ?? "-"), reason: `gameVersion ${String(d.gameVersion)} ≠ ${REFERENCE_GAME_VERSION}` } };
  if (!Array.isArray(d.records))
    return { ok: false, failure: { kind, source: String(d.source ?? "-"), reason: "records must be an array" } };
  const source = typeof d.source === "string" && d.source ? d.source : "unknown-source";
  const report = validateDataset(kind, d.records);
  if (!report.ok) return { ok: false, failure: { kind, source, reason: `${report.errors.length} validation error(s)`, report } };
  return { ok: true, dataset: { gameVersion: REFERENCE_GAME_VERSION, kind, source, records: d.records, report }, report };
}

/** Parse a JSON string; returns a typed failure instead of throwing. */
export function importJson(text: string): ImportOutcome {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { ok: false, failure: { kind: "stats", source: "-", reason: `invalid JSON: ${(e as Error).message}` } };
  }
  return importDataset(raw);
}

/** Parse a CSV document (header row + comma-separated values, quoted fields supported). */
export function importCsv(text: string, meta: { kind: ReferenceDatasetKind; source: string; gameVersion?: GameVersion }): ImportOutcome {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { ok: false, failure: { kind: meta.kind, source: meta.source, reason: "CSV needs a header and at least one row" } };
  const parse = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = !quoted;
      } else if (ch === "," && !quoted) {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out.map((v) => v.trim());
  };
  const header = parse(lines[0]);
  const records = lines.slice(1).map((line) => {
    const cells = parse(line);
    const rec: Record<string, unknown> = {};
    header.forEach((h, i) => {
      const cell = cells[i] ?? "";
      if (cell === "") return;
      // numeric coercion for data fields; identifiers such as gameVersion stay strings
      rec[h] = h !== "gameVersion" && /^-?\d+(\.\d+)?$/.test(cell) ? Number(cell) : cell;
    });
    return rec;
  });
  return importDataset({ gameVersion: meta.gameVersion ?? REFERENCE_GAME_VERSION, kind: meta.kind, source: meta.source, records });
}

/** Convert a dataset into the concrete row shape used by fixtures/parity. */
export function asRows<T>(outcome: ImportOutcome): T[] {
  return outcome.ok ? (outcome.dataset.records as T[]) : [];
}
