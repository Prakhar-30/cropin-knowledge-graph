/**
 * The five-stage pipeline, wired together.
 *
 *   source adapters  ->  build  ->  derive  ->  validate  ->  emit
 *     (records+links)   (graph)    (metrics)  (invariants)   (json)
 *
 * Each stage is independently testable and knows nothing about the stages after it. This module is the
 * only place that knows the order.
 */
import { build, type BuiltGraph } from './build.js';
import { derive, type DeriveReport } from './derive.js';
import { toDocument } from './emit.js';
import type { GraphDocument } from './model.js';
import type { Source } from '../sources/base.js';
import { validate, type ValidationResult } from './validate.js';

export interface RunOptions {
  tenantId: string;
  snapshot?: string;
  /** Frozen build timestamp. Pass a fixed value to compare two documents byte for byte. */
  builtAt?: string;
  parity?: boolean;
}

export interface RunResult {
  graph: BuiltGraph;
  derived: DeriveReport;
  validation: ValidationResult;
  doc: GraphDocument;
}

export async function run(source: Source, opts: RunOptions): Promise<RunResult> {
  const bundle = await source.load({ tenantId: opts.tenantId, snapshot: opts.snapshot });
  const graph = build(bundle);
  const derived = derive(graph);
  const validation = validate(graph, { parity: opts.parity });
  const doc = toDocument(graph, { builtAt: opts.builtAt ?? new Date().toISOString(), reach: validation.reach });
  return { graph, derived, validation, doc };
}
