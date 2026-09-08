import { useMemo, useState } from 'react';
import { fmt, layerColour, search, type Indexed } from '../lib/graph.js';
import type { Mode } from '../lib/layout.js';

interface Props {
  g: Indexed;
  focusId: string;
  mode: Mode;
  routeFrom: string | null;
  routeTo: string | null;
  onFocus: (id: string) => void;
  onClearRoute: (which: 'from' | 'to') => void;
}

export function Rail({ g, focusId, mode, routeFrom, routeTo, onFocus, onClearRoute }: Props) {
  const [q, setQ] = useState('');
  const hits = useMemo(() => search(g, q), [g, q]);
  const meta = g.doc.meta;

  const layerCounts = useMemo(() => {
    const counts = new Map<string, { concepts: number; records: number }>();
    for (const layer of meta.layer_order) counts.set(layer, { concepts: 0, records: 0 });
    for (const c of g.doc.concepts) {
      const entry = counts.get(c.layer);
      if (!entry) continue;
      entry.concepts += 1;
      entry.records += c.records;
    }
    return counts;
  }, [g, meta.layer_order]);

  const totalPlots = useMemo(
    () => g.doc.records.filter((r) => r.concept === 'c:variety').reduce((a, r) => a + (r.usage.plots ?? 0), 0),
    [g],
  );

  return (
    <aside className="rail">
      <div className="search">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search crops, varieties, plans…"
          aria-label="Search the graph"
        />
        {hits.length > 0 && (
          <div className="results">
            {hits.map((h) => (
              <button
                type="button"
                className="result"
                key={h.id}
                onClick={() => {
                  onFocus(h.id);
                  setQ('');
                }}
              >
                <span className="dot" style={{ background: layerColour(h.layer) }} />
                <span className="label">
                  {h.label}
                  {h.scope ? <span style={{ color: 'var(--ink-3)' }}> · {h.scope}</span> : null}
                  <br />
                  <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>{h.conceptLabel}</span>
                </span>
                {h.plots > 0 && <span className="plots">{fmt(h.plots)}</span>}
              </button>
            ))}
          </div>
        )}
        {q.trim() !== '' && hits.length === 0 && (
          <div className="results">
            <div className="result" style={{ color: 'var(--ink-3)' }}>
              nothing matches “{q}”
            </div>
          </div>
        )}
      </div>

      {mode === 'route' && (
        <>
          <h3>Route</h3>
          <div className="route-picker">
            {(['from', 'to'] as const).map((which) => {
              const id = which === 'from' ? routeFrom : routeTo;
              return (
                <div className={`slot${id ? ' set' : ''}`} key={which}>
                  <span style={{ color: 'var(--ink-3)', minWidth: 30 }}>{which}</span>
                  <span className="label">{id ? g.labelOf(id) : 'pick a node'}</span>
                  {id && (
                    <button type="button" className="clear" onClick={() => onClearRoute(which)} title="clear">
                      ×
                    </button>
                  )}
                </div>
              );
            })}
            <span>Use “Route from here” and “Route to here” in the panel, or click a node on the canvas.</span>
          </div>
        </>
      )}

      <h3>This tenant</h3>
      <div className="tiles">
        <div className="tile">
          <div className="n">{fmt(meta.counts.records)}</div>
          <div className="k">records</div>
        </div>
        <div className="tile">
          <div className="n">{fmt(meta.counts.links)}</div>
          <div className="k">links</div>
        </div>
        <div className="tile">
          <div className="n">{fmt(meta.counts.concepts)}</div>
          <div className="k">entity types</div>
        </div>
        <div className="tile">
          <div className="n">{fmt(totalPlots)}</div>
          <div className="k">plots behind it</div>
        </div>
      </div>

      <h3>Layers</h3>
      {meta.layer_order.map((layer) => {
        const counts = layerCounts.get(layer)!;
        const focusLayer = g.layerOf(focusId) === layer;
        return (
          <button
            type="button"
            className="legend-row"
            key={layer}
            onClick={() => {
              const first = g.doc.concepts.filter((c) => c.layer === layer).sort((a, b) => b.records - a.records)[0];
              if (first) onFocus(first.id);
            }}
            style={focusLayer ? { background: 'var(--brand-tint)' } : undefined}
          >
            <span className="dot" style={{ background: layerColour(layer) }} />
            <span>{meta.layers[layer]}</span>
            <span className="count">{fmt(counts.records)}</span>
          </button>
        );
      })}

      <h3>How to read the weights</h3>
      <div className="note-card">{meta.evidence_rule}</div>

      {(meta.coverage.unweighted_links > 0 || meta.coverage.concepts_with_no_records.length > 0) && (
        <>
          <h3>Coverage</h3>
          <div className="note-card" style={{ background: 'var(--surface-sunk)', borderColor: 'var(--line)' }}>
            {meta.coverage.unweighted_links > 0 && (
              <div>
                {fmt(meta.coverage.unweighted_links)} links carry no historical count. They state a
                relationship, not a proven one.
              </div>
            )}
            {meta.coverage.concepts_with_no_records.length > 0 && (
              <div style={{ marginTop: 6 }}>
                {meta.coverage.concepts_with_no_records.length} entity types have nothing configured against
                them yet.
              </div>
            )}
            {meta.coverage.metrics_not_computed.length > 0 && (
              <div style={{ marginTop: 6 }}>
                Not computed for this tenant: {meta.coverage.metrics_not_computed.join(', ')}.
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
