/**
 * Stage 6: emission.
 *
 * The document is built in a fixed construction order rather than serialised with sorted keys: records
 * sorted by id, links sorted by relation order then endpoints, and attributes in the order declared by
 * `attr_order`. That gives byte-identical output between two runs (invariant 11) without destroying the
 * attribute display order, which globally sorted keys would.
 */
import { readFileSync } from 'node:fs';
import type { BuiltGraph } from './build.js';
import { EVIDENCE_RULE, SCHEMA_VERSION, type GraphDocument } from './model.js';
import { layerMap, ontology, sections } from './ontology.js';
import type { reachability } from './traverse.js';

export interface EmitOptions {
  builtAt: string;
  reach?: ReturnType<typeof reachability>;
}

export function toDocument(graph: BuiltGraph, { builtAt, reach }: EmitOptions): GraphDocument {
  const conceptsWithNoRecords = ontology.concepts
    .filter((c) => (graph.byConcept.get(c.key)?.length ?? 0) === 0)
    .map((c) => `c:${c.key}`);

  const recordsWithNoLinks = graph.records
    .filter((r) => (graph.adj.outgoing.get(r.id)?.length ?? 0) + (graph.adj.incoming.get(r.id)?.length ?? 0) === 0)
    .map((r) => r.id);

  const unweighted = graph.links.filter((l) => l.plots === undefined).length;

  return {
    meta: {
      schema_version: SCHEMA_VERSION,
      tenant_id: graph.tenantId,
      built_at: builtAt,
      source_snapshot: graph.snapshot,
      source: graph.sourceName,
      layers: layerMap(),
      layer_order: ontology.layers.map((l) => l.key),
      sections: sections(),
      counts: {
        concepts: ontology.concepts.length,
        records: graph.records.length,
        links: graph.links.length,
      },
      evidence_rule: EVIDENCE_RULE,
      coverage: {
        concepts_with_no_records: conceptsWithNoRecords,
        records_with_no_links: recordsWithNoLinks,
        unweighted_links: unweighted,
        metrics_not_computed: [...graph.metricsNotComputed].sort(),
      },
      ...(reach
        ? {
            graph: {
              components: reach.componentCount,
              longest_path: reach.longestPath,
              mean_path: reach.meanPath,
            },
          }
        : {}),
    },
    concepts: ontology.concepts.map((c) => ({
      id: `c:${c.key}`,
      key: c.key,
      label: c.label,
      layer: c.layer,
      definition: c.definition,
      decide: c.decide,
      source: c.source,
      ...(c.label_scope ? { label_scope: c.label_scope } : {}),
      records: graph.byConcept.get(c.key)?.length ?? 0,
    })),
    records: graph.records.map((r) => {
      const concept = ontology.conceptById.get(r.concept)!;
      const attrs: Record<string, string> = {};
      for (const key of concept.attr_order) {
        if (r.attrs[key] !== undefined) attrs[key] = r.attrs[key];
      }
      // Anything not declared in attr_order still ships, after the declared keys, so nothing is lost.
      for (const [k, v] of Object.entries(r.attrs)) {
        if (!(k in attrs)) attrs[k] = v;
      }
      const usage: Record<string, number> = {};
      for (const k of Object.keys(r.usage).sort()) usage[k] = r.usage[k];
      return {
        id: r.id,
        concept: r.concept,
        label: r.label,
        attrs,
        ...(r.note ? { note: r.note } : {}),
        ...(r.summary ? { summary: r.summary } : {}),
        usage,
      };
    }),
    links: graph.links.map((l) => ({
      from: l.from,
      to: l.to,
      rel: l.rel,
      ...(l.plots === undefined ? {} : { plots: l.plots }),
      ...(l.note ? { note: l.note } : {}),
    })),
  };
}

export function serialise(doc: GraphDocument, pretty = false): string {
  return pretty ? `${JSON.stringify(doc, null, 2)}\n` : JSON.stringify(doc);
}

/**
 * Single self-contained HTML: the built viewer with the document embedded. The viewer prefers an inline
 * payload when one is present and falls back to fetching graph.json.
 */
export function inlineHtml(viewerHtmlPath: string, json: string): string {
  const html = readFileSync(viewerHtmlPath, 'utf8');
  const payload = `<script id="graph-data" type="application/json">${json.replace(/<\//g, '<\\/')}</script>`;
  if (!html.includes('</body>')) throw new Error(`${viewerHtmlPath} has no </body> to inline into`);
  return html.replace('</body>', `${payload}\n</body>`);
}
