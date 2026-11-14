/**
 * In-memory registry of validated reference records.
 *
 * Datasets are merged by kind and indexed by refId. Duplicate refIds with the
 * same content are tolerated (re-import), conflicting content is rejected.
 * The store is read-only from the game's point of view: nothing here is applied
 * to a run unless `config.ts` explicitly enables the experimental mode with a
 * complete dataset.
 */
import type { ImportedDataset } from "./importer";
import type { ParityFixture, ReferenceDatasetKind } from "./types";

type AnyRecord = Record<string, unknown>;

export interface MergeConflict {
  refId: string;
  kind: ReferenceDatasetKind;
  reason: string;
}

export class ReferenceStore {
  private byKind = new Map<ReferenceDatasetKind, Map<string, AnyRecord>>();
  private conflicts: MergeConflict[] = [];
  private datasets: { kind: ReferenceDatasetKind; source: string; records: number }[] = [];

  /** Merge a validated dataset. Returns the number of records accepted. */
  merge(dataset: ImportedDataset): number {
    let bucket = this.byKind.get(dataset.kind);
    if (!bucket) {
      bucket = new Map();
      this.byKind.set(dataset.kind, bucket);
    }
    let accepted = 0;
    for (const rec of dataset.records as AnyRecord[]) {
      const id = String(rec.refId);
      const existing = bucket.get(id);
      if (existing && JSON.stringify(existing) !== JSON.stringify(rec)) {
        this.conflicts.push({ refId: id, kind: dataset.kind, reason: "conflicting re-import" });
        continue;
      }
      bucket.set(id, rec);
      accepted++;
    }
    this.datasets.push({ kind: dataset.kind, source: dataset.source, records: dataset.records.length });
    return accepted;
  }

  get<T = AnyRecord>(kind: ReferenceDatasetKind, refId: string): T | undefined {
    return this.byKind.get(kind)?.get(refId) as T | undefined;
  }

  all<T = AnyRecord>(kind: ReferenceDatasetKind): T[] {
    return [...(this.byKind.get(kind)?.values() ?? [])] as T[];
  }

  /** Parity fixtures are held beside the data they describe. */
  fixtures: ParityFixture[] = [];

  addFixtures(f: ParityFixture[]) {
    this.fixtures.push(...f);
  }

  get mergeConflicts(): MergeConflict[] {
    return [...this.conflicts];
  }

  inventory() {
    const out: Record<string, number> = {};
    for (const [kind, bucket] of this.byKind) out[kind] = bucket.size;
    return out;
  }

  datasetList() {
    return [...this.datasets];
  }
}

/** Process-wide store used by the reference layer. */
export const referenceStore = new ReferenceStore();
