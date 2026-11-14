/**
 * Public surface of the Magic Survival reference-data layer.
 *
 * Consumers:
 *  - tests / scripts: fixtures, validator, importer, parity harness
 *  - development builds only: config.resolveConfigMode + applyReferenceData
 * Nothing here runs in a production build unless explicitly imported.
 */
export * from "./types";
export { validateRecord, validateDataset, formatReport, type ValidationIssue, type ValidationReport } from "./validator";
export { importDataset, importJson, importCsv, asRows, type ImportedDataset, type ImportFailure, type ImportOutcome } from "./importer";
export { ReferenceStore, referenceStore, type MergeConflict } from "./store";
export { evaluate, evaluateAll, parityReport, type ParityProvider, type ParityContext } from "./parity";
export { COMBAT_CATEGORIES, DATASET_INTEGRATION, PIPELINE_ORDER, runPipeline, type CombatCategory, type Configurability, type ModifierOp, type PipelineStage } from "./formulas";
export { resolveConfigMode, applyReferenceData, type ApplyReport, type GameConfigMode } from "./config";
export {
  ALL_FIXTURES,
  PROGRESSION_FIXTURES,
  ENEMY_FIXTURES,
  COMBINATION_FIXTURES,
  PROGRESSION_ROWS,
  ENEMY_ROWS,
  COMBINATION_ROWS,
} from "./fixtures";
