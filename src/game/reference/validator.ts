/**
 * Validation for imported reference records.
 *
 * Rules:
 *  - every record needs a unique refId, the reference game version, a raw numeric
 *    value, a source, an evidence category and a verification state;
 *  - evidence may never be upgraded by the importer (stored stays stored);
 *  - unknown fields are *reported*, never guessed into known fields;
 *  - player-facing content requires a Persian name;
 *  - unresolved semantics must stay listed as unresolved.
 */
import {
  EVIDENCE_CATEGORIES,
  REFERENCE_GAME_VERSION,
  VERIFICATION_STATES,
  type EvidenceCategory,
  type ReferenceDatasetKind,
  type VerificationState,
} from "./types";

export interface ValidationIssue {
  level: "error" | "warning";
  refId: string;
  field: string;
  message: string;
}

export interface ValidationReport {
  kind: ReferenceDatasetKind;
  checked: number;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  /** Fields present in the data that this schema does not model yet. */
  unsupportedFields: string[];
  ok: boolean;
}

/** Per-kind field contracts. Anything not listed is reported as unsupported. */
const SCHEMAS: Record<ReferenceDatasetKind, { required: string[]; optional: string[]; faRequired: boolean }> = {
  progression: { required: ["level", "manaRequired"], optional: [], faRequired: false },
  enemies: { required: ["baseHp"], optional: ["baseDamage", "baseSpeed", "runtimeModifiers"], faRequired: true },
  magic: { required: ["magicId", "levels"], optional: ["unknownFields"], faRequired: true },
  combinations: {
    required: ["primaryMagicId", "storedModifiers", "modifiersApplied"],
    optional: ["consumedMagicId"],
    faRequired: true,
  },
  artifacts: { required: [], optional: ["artifactId", "effectIds", "triggers", "stacking"], faRequired: true },
  synergies: { required: ["members"], optional: ["bonus"], faRequired: true },
  formulas: { required: ["system", "formula"], optional: ["inputs"], faRequired: false },
  stats: { required: [], optional: [], faRequired: false },
  stages: { required: [], optional: [], faRequired: false },
};

const BASE_FIELDS = new Set([
  "refId",
  "name",
  "nameFa",
  "gameVersion",
  "evidence",
  "source",
  "verification",
  "unresolved",
  "description",
]);

const PERSIAN = /[\u0600-\u06FF\u0750-\u077F]/;

export function validateRecord(kind: ReferenceDatasetKind, raw: unknown, seen: Set<string>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const schema = SCHEMAS[kind];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return [{ level: "error", refId: "-", field: "record", message: "record is not an object" }];
  }
  const r = raw as Record<string, unknown>;
  const refId = typeof r.refId === "string" ? r.refId : "-";

  if (typeof r.refId !== "string" || !r.refId) issues.push({ level: "error", refId, field: "refId", message: "missing refId" });
  else if (seen.has(r.refId)) issues.push({ level: "error", refId, field: "refId", message: "duplicate refId" });
  else seen.add(r.refId);

  if (r.gameVersion !== REFERENCE_GAME_VERSION)
    issues.push({ level: "error", refId, field: "gameVersion", message: `expected ${REFERENCE_GAME_VERSION}` });

  if (typeof r.evidence !== "string" || !EVIDENCE_CATEGORIES.includes(r.evidence as EvidenceCategory))
    issues.push({ level: "error", refId, field: "evidence", message: `must be one of ${EVIDENCE_CATEGORIES.join(", ")}` });

  if (typeof r.verification !== "string" || !VERIFICATION_STATES.includes(r.verification as VerificationState))
    issues.push({ level: "error", refId, field: "verification", message: `must be one of ${VERIFICATION_STATES.join(", ")}` });

  if (typeof r.name !== "string" || !r.name) issues.push({ level: "error", refId, field: "name", message: "missing original name" });
  if (typeof r.source !== "string" || !r.source) issues.push({ level: "error", refId, field: "source", message: "missing source dataset" });

  // player-facing content must be Persian; identifiers stay original for traceability
  if (schema.faRequired && (typeof r.nameFa !== "string" || !PERSIAN.test(r.nameFa)))
    issues.push({ level: "error", refId, field: "nameFa", message: "Persian name required for player-facing content" });

  for (const f of schema.required) {
    const v = r[f];
    if (v === undefined || v === null) {
      issues.push({ level: "error", refId, field: f, message: "required field missing" });
      continue;
    }
    // numeric fields must be finite; unknown numeric semantics are not guessed
    if (typeof v === "number" && !Number.isFinite(v))
      issues.push({ level: "error", refId, field: f, message: "number is not finite" });
  }

  // stored values with unresolved runtime semantics must say so
  // `unresolved` may be a JSON array or a single CSV cell
  const hasRuntimeNote = (Array.isArray(r.unresolved) && r.unresolved.length > 0) || (typeof r.unresolved === "string" && r.unresolved.trim().length > 0);
  if (r.evidence === "stored" && kind === "enemies" && !hasRuntimeNote)
    issues.push({ level: "warning", refId, field: "unresolved", message: "stored enemy values usually have runtime modifiers; list them or mark unresolved" });

  // unknown fields are reported, never mapped onto known ones
  for (const key of Object.keys(r)) {
    if (BASE_FIELDS.has(key) || schema.required.includes(key) || schema.optional.includes(key)) continue;
    issues.push({ level: "warning", refId, field: key, message: "unsupported field (not mapped, not guessed)" });
  }

  return issues;
}

export function validateDataset<T>(kind: ReferenceDatasetKind, records: readonly T[]): ValidationReport {
  const seen = new Set<string>();
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const unsupported = new Set<string>();
  for (const rec of records) {
    for (const issue of validateRecord(kind, rec, seen)) {
      if (issue.level === "error") errors.push(issue);
      else {
        warnings.push(issue);
        if (issue.message.startsWith("unsupported")) unsupported.add(issue.field);
      }
    }
  }
  return {
    kind,
    checked: records.length,
    errors,
    warnings,
    unsupportedFields: [...unsupported].sort(),
    ok: errors.length === 0,
  };
}

/** Format a report for a human reviewer / terminal output. */
export function formatReport(r: ValidationReport, source: string): string {
  const lines = [
    `dataset ${r.kind} ← ${source}`,
    `  records: ${r.checked}   errors: ${r.errors.length}   warnings: ${r.warnings.length}`,
  ];
  for (const e of r.errors.slice(0, 20)) lines.push(`  ERROR ${e.refId} ${e.field}: ${e.message}`);
  for (const w of r.warnings.slice(0, 20)) lines.push(`  warn  ${w.refId} ${w.field}: ${w.message}`);
  if (r.unsupportedFields.length) lines.push(`  unsupported fields: ${r.unsupportedFields.join(", ")}`);
  return lines.join("\n");
}
