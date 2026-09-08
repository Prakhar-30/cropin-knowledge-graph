import { useState } from 'react';
import {
  METRIC_LABELS,
  PERCENT_METRICS,
  SIGNED_METRICS,
  fmt,
  layerColour,
  sectionsFor,
  type Indexed,
} from '../lib/graph.js';

interface Props {
  g: Indexed;
  id: string;
  onFocus: (id: string) => void;
  onHover: (id: string | null) => void;
  onRouteFrom: (id: string) => void;
  onRouteTo: (id: string) => void;
}

const SHOWN = 8;

/**
 * Panel order is summary first, detail second, definition last, and it matters as much as the content.
 * A user arriving at a record wants the answer, then the evidence, then - only if still unsure - what
 * the thing is and how to choose it.
 */
export function Panel({ g, id, onFocus, onHover, onRouteFrom, onRouteTo }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const record = g.recordById.get(id);
  const concept = g.conceptOf(id);
  const isConcept = g.isConcept(id);

  if (!concept) {
    return <div className="empty">Nothing selected.</div>;
  }

  const sections = sectionsFor(g, id);
  const ownRecords = isConcept ? (g.recordsByConcept.get(id) ?? []) : [];
  const usage = Object.entries(record?.usage ?? {});
  const maxUsage = Math.max(1, ...usage.filter(([k]) => !PERCENT_METRICS.has(k)).map(([, v]) => Math.abs(v)));

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-kicker">
          <span className="dot" style={{ background: layerColour(concept.layer) }} />
          {isConcept ? 'Entity type' : concept.label}
          <span style={{ color: 'var(--ink-3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
            {g.doc.meta.layers[concept.layer]}
          </span>
        </div>
        <h1 className="panel-title">{record?.label ?? concept.label}</h1>
        {record?.summary && <p className="panel-summary">{record.summary}</p>}
        {isConcept && (
          <p className="panel-summary">
            {concept.records === 0
              ? 'Nothing configured against this entity type in this tenant yet.'
              : `${fmt(concept.records)} record${concept.records === 1 ? '' : 's'} configured in this tenant.`}
          </p>
        )}
        {record?.note && <p className="panel-note">{record.note}</p>}
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <button type="button" className="chip" onClick={() => onRouteFrom(id)}>
            Route from here
          </button>
          <button type="button" className="chip" onClick={() => onRouteTo(id)}>
            Route to here
          </button>
        </div>
      </div>

      <div className="panel-body">
        {usage.length > 0 && (
          <div className="section">
            <h4>
              What the history says <span className="n">entered or summed from the links</span>
            </h4>
            <div className="evidence">
              {usage
                .sort((a, b) => metricRank(a[0]) - metricRank(b[0]) || a[0].localeCompare(b[0]))
                .map(([key, value]) => {
                  const pct = PERCENT_METRICS.has(key);
                  const signed = SIGNED_METRICS.has(key);
                  return (
                    <div className="ev-row" key={key}>
                      <span className="k">{METRIC_LABELS[key] ?? key.replace(/_/g, ' ')}</span>
                      {pct ? (
                        <span />
                      ) : (
                        <span className="bar">
                          <i style={{ width: `${Math.max(2, (Math.abs(value) / maxUsage) * 100)}%` }} />
                        </span>
                      )}
                      <span className={`v${signed ? (value < 0 ? ' neg' : ' pos') : ''}`}>
                        {signed && value > 0 ? '+' : ''}
                        {fmt(value)}
                        {pct ? '%' : ''}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {record && Object.keys(record.attrs).length > 0 && (
          <div className="section">
            <h4>What is configured</h4>
            <dl className="kv">
              {Object.entries(record.attrs).map(([k, v]) => (
                <div key={k} style={{ display: 'contents' }}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {isConcept && ownRecords.length > 0 && (
          <div className="section">
            <h4>
              Records of this type <span className="n">{ownRecords.length}</span>
            </h4>
            {renderItems(
              ownRecords
                .map((r) => ({ id: r.id, label: r.label, layer: concept.layer, plots: r.usage.plots }))
                .sort((a, b) => (b.plots ?? -1) - (a.plots ?? -1) || a.label.localeCompare(b.label)),
              'records',
              expanded.has('records'),
              () => toggle('records'),
              onFocus,
              onHover,
            )}
          </div>
        )}

        {sections.map((s) => (
          <div className="section" key={s.key}>
            <h4>
              {s.heading} <span className="n">{s.items.length}</span>
            </h4>
            {renderItems(s.items, s.key, expanded.has(s.key), () => toggle(s.key), onFocus, onHover)}
          </div>
        ))}

        <div className="section">
          <h4>How to decide</h4>
          <p className="advice" style={{ margin: 0 }}>
            {concept.decide}
          </p>
        </div>

        <div className="section">
          <h4>What it is</h4>
          <p className="definition" style={{ margin: '0 0 8px' }}>
            {concept.definition}
          </p>
          <div className="source">source: {concept.source}</div>
        </div>
      </div>
    </div>
  );
}

function renderItems(
  items: Array<{ id: string; label: string; layer: string; plots?: number; note?: string }>,
  key: string,
  open: boolean,
  toggle: () => void,
  onFocus: (id: string) => void,
  onHover: (id: string | null) => void,
) {
  const shown = open ? items : items.slice(0, SHOWN);
  const max = Math.max(1, ...items.map((i) => i.plots ?? 0));
  return (
    <>
      {shown.map((item) => (
        <button
          type="button"
          className="link-row"
          key={`${key}-${item.id}`}
          onClick={() => onFocus(item.id)}
          onPointerEnter={() => onHover(item.id)}
          onPointerLeave={() => onHover(null)}
          title={item.note ?? item.label}
        >
          <span className="dot" style={{ background: layerColour(item.layer) }} />
          <span className="label">{item.label}</span>
          <span className="w">
            {item.plots === undefined ? (
              <span style={{ color: 'var(--ink-3)' }}>—</span>
            ) : (
              <>
                <span className="bar">
                  <i style={{ width: `${Math.max(3, (item.plots / max) * 100)}%` }} />
                </span>
                {fmt(item.plots)}
              </>
            )}
          </span>
        </button>
      ))}
      {items.length > SHOWN && (
        <button type="button" className="more" onClick={toggle}>
          {open ? 'Show fewer' : `Show all ${items.length}`}
        </button>
      )}
      {items.length === 0 && <span className="definition">none</span>}
    </>
  );
}

const METRIC_ORDER = ['plots', 'growers', 'projects', 'used_on', 'expected', 'achieved', 'gap_pct'];
const metricRank = (key: string) => {
  const i = METRIC_ORDER.indexOf(key);
  return i === -1 ? METRIC_ORDER.length : i;
};
