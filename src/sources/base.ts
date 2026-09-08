/**
 * Source protocol.
 *
 * A source hands the builder rows that have already become records and links. It knows nothing about
 * derivation, validation or emission. Three implementations sit behind this: synthetic (the reference
 * dataset), csv (fixtures) and supabase (real work).
 *
 * Every source is read-only. Nothing downstream of here writes to a platform master.
 */
import type { SourceBundle } from '../core/model.js';

export interface SourceOptions {
  tenantId: string;
  /** As-of date of the underlying data, ISO date. Defaults to the source's own notion of today. */
  snapshot?: string;
}

export interface Source {
  readonly name: string;
  load(options: SourceOptions): Promise<SourceBundle>;
}

export class SourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SourceError';
  }
}
