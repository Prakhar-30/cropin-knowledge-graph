/**
 * Stage 4: derivation.
 *
 * Everything here is driven by ontology/derivations.yaml. Nothing in this file knows what a crop or a
 * region is, which is the point: the consistency property comes from the rules being declarative rather
 * than scattered through code.
 *
 * Rollups are recomputed in one pass in a defined order after every link is loaded. They are never
 * incrementally updated, because an incremental update is how a total quietly stops matching its parts.
 */
import type { BuiltGraph } from './build.js';
import { evaluate } from './expr.js';
import { ontology } from './ontology.js';
import { renderSummary, type SummaryProblem } from './summaries.js';

export interface DeriveReport {
  rollups: number;
  computed: number;
  summaries: number;
  /** Computed metrics that could not be produced because an input was missing. */
  skipped: string[];
  summaryProblems: SummaryProblem[];
}

export function derive(graph: BuiltGraph): DeriveReport {
  const skipped: string[] = [];

  // Stage 1: rollups. Sum the weighted incoming links for each target concept.
  const rules = [...ontology.derivations.rollups].sort(
    (a, b) => a.target_concept.localeCompare(b.target_concept) || a.metric.localeCompare(b.metric),
  );
  for (const rule of rules) {
    const rels = new Set(rule.via_relation);
    for (const record of graph.byConcept.get(rule.target_concept) ?? []) {
      let total = 0;
      for (const l of graph.adj.incoming.get(record.id) ?? []) {
        if (rels.has(l.rel) && typeof l.plots === 'number') total += l.plots;
      }
      record.usage[rule.metric] = total;
    }
  }

  // Stage 2: computed metrics, which may read the rollups above.
  for (const rule of ontology.derivations.computed) {
    for (const record of graph.byConcept.get(rule.concept) ?? []) {
      const value = evaluate(rule.expr, record.usage);
      if (value === null) {
        skipped.push(`${record.id}.${rule.metric}`);
        continue;
      }
      record.usage[rule.metric] = value;
    }
  }

  // Stage 3: summaries, which may read both.
  const summaryProblems: SummaryProblem[] = [];
  let summaries = 0;
  for (const tpl of ontology.summaries.templates) {
    for (const record of graph.byConcept.get(tpl.concept) ?? []) {
      record.summary = renderSummary(graph, record, tpl.template, summaryProblems);
      summaries += 1;
    }
  }

  return {
    rollups: rules.length,
    computed: ontology.derivations.computed.length,
    summaries,
    skipped: skipped.sort(),
    summaryProblems,
  };
}
