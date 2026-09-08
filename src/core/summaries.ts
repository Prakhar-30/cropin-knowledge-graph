/**
 * Summary rendering.
 *
 * Summaries are always generated, never authored, so they cannot drift from the data. Every slot resolves
 * against the record's own metrics, attributes and links - nothing else is in scope, which is what keeps
 * a summary honest.
 */
import type { BuiltGraph } from './build.js';
import { labelOfNode } from './build.js';
import type { GraphRecord } from './model.js';
import { ontology } from './ontology.js';

export function formatMetric(n: number): string {
  if (Number.isInteger(n)) return n.toLocaleString('en-IN');
  return String(Math.round(n * 100) / 100);
}

function joinList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

interface Neighbour {
  id: string;
  label: string;
  plots: number;
}

function neighbours(graph: BuiltGraph, record: GraphRecord, rel: string, reverse: boolean): Neighbour[] {
  const links = reverse ? (graph.adj.incoming.get(record.id) ?? []) : (graph.adj.outgoing.get(record.id) ?? []);
  return links
    .filter((l) => l.rel === rel)
    .map((l) => {
      const other = reverse ? l.from : l.to;
      return { id: other, label: labelOfNode(graph, other), plots: l.plots ?? 0 };
    })
    .sort((a, b) => b.plots - a.plots || a.label.localeCompare(b.label));
}

/**
 * Resolves {if:rel}...{else}...{endif} blocks before any slot is touched. Modifiers: `reverse` reads the
 * relation backwards, `many` is true only when more than one link exists - which is what stops a
 * single-item list being followed by "most often" naming the same item again.
 */
function resolveConditionals(
  template: string,
  count: (rel: string, reverse: boolean) => number,
  hasMetric: (metric: string) => boolean,
): string {
  // {ifm:metric} first: a tenant with masters but no operational history should read as a shorter
  // sentence, not as one with "not available" in the middle of it.
  const metricRe = /\{ifm:([a-z_]+)\}([\s\S]*?)(?:\{else\}([\s\S]*?))?\{endif\}/g;
  const withMetrics = template.replace(metricRe, (_m, metric: string, yes: string, no: string | undefined) =>
    hasMetric(metric) ? yes : (no ?? ''),
  );
  const re = /\{if:([^}|]+)((?:\|[a-z]+)*)\}([\s\S]*?)(?:\{else\}([\s\S]*?))?\{endif\}/g;
  return withMetrics.replace(re, (_m, rel: string, mods: string, yes: string, no: string | undefined) => {
    const flags = new Set(mods.split('|').filter(Boolean));
    const n = count(rel.trim(), flags.has('reverse'));
    const truthy = flags.has('many') ? n > 1 : n > 0;
    return truthy ? yes : (no ?? '');
  });
}

export interface SummaryProblem {
  record: string;
  slot: string;
  reason: string;
}

export function renderSummary(
  graph: BuiltGraph,
  record: GraphRecord,
  template: string,
  problems: SummaryProblem[] = [],
): string {
  const count = (rel: string, reverse: boolean) => neighbours(graph, record, rel, reverse).length;
  const hasMetric = (metric: string) => record.usage[metric] !== undefined;

  let out = resolveConditionals(template, count, hasMetric);

  out = out.replace(/\{([a-z_]+):([^}|]+)(\|reverse)?\}/g, (m, fn: string, arg: string, rev: string | undefined) => {
    const reverse = Boolean(rev);
    const key = arg.trim();
    if (fn === 'attr') {
      const v = record.attrs[key];
      if (v === undefined) problems.push({ record: record.id, slot: m, reason: `no attribute "${key}"` });
      return v ?? 'not set';
    }
    if (!ontology.relationByKey.has(key)) {
      problems.push({ record: record.id, slot: m, reason: `unknown relation "${key}"` });
      return m;
    }
    const ns = neighbours(graph, record, key, reverse);
    switch (fn) {
      case 'top':
        return ns[0]?.label ?? 'none';
      case 'top_weight':
        return ns[0] ? formatMetric(ns[0].plots) : '0';
      case 'list':
        return joinList(ns.map((n) => n.label)) || 'none';
      case 'count':
        return formatMetric(ns.length);
      default:
        problems.push({ record: record.id, slot: m, reason: `unknown resolver "${fn}"` });
        return m;
    }
  });

  out = out.replace(/\{([a-z_]+)\}/g, (m, metric: string) => {
    const v = record.usage[metric];
    if (v === undefined) {
      problems.push({ record: record.id, slot: m, reason: `no metric "${metric}"` });
      return 'not available';
    }
    return formatMetric(v);
  });

  return singularise(out.replace(/\s+/g, ' ').replace(/\s+([.,])/g, '$1').trim());
}

/**
 * "1 crop plans attached" is the kind of detail that makes a generated sentence read as generated. Only
 * words a template actually pluralises are touched, so nothing else can be mangled.
 */
const PLURALS = new Set([
  'plots', 'growers', 'projects', 'varieties', 'plans', 'stages', 'grades', 'days', 'warnings',
  'records', 'activities', 'regions', 'seasons', 'attributes', 'resources', 'forms',
]);

export function singularise(text: string): string {
  return text.replace(/\b1 ([A-Za-z]+)\b/g, (whole, word: string) => {
    if (!PLURALS.has(word.toLowerCase())) return whole;
    if (word.toLowerCase().endsWith('ies')) return `1 ${word.slice(0, -3)}y`;
    return `1 ${word.slice(0, -1)}`;
  });
}
