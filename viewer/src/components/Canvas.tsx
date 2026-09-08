import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Indexed } from '../lib/graph.js';
import { layerColour } from '../lib/graph.js';
import type { LaidEdge, LaidNode, Layout } from '../lib/layout.js';

interface Props {
  g: Indexed;
  layout: Layout;
  focusId: string;
  onFocus: (id: string) => void;
  hovered: string | null;
  onHover: (id: string | null) => void;
}

/** Pan and zoom, as a plain transform: no animation, so the picture never moves under the reader. */
interface View {
  k: number;
  tx: number;
  ty: number;
}

interface Tip {
  x: number;
  y: number;
  title: string;
  rel?: string;
  detail?: string;
}

/**
 * Deterministic SVG canvas. Pan with a drag, zoom with the wheel around the cursor, fit to the layout
 * whenever the layout changes. Nothing animates position, so the picture never moves under the reader.
 */
export function Canvas({ g, layout, focusId, onFocus, hovered, onHover }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 900, h: 640 });
  const [view, setView] = useState<View>({ k: 1, tx: 0, ty: 0 });
  const [dragging, setDragging] = useState(false);
  const [tip, setTip] = useState<Tip | null>(null);
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const fit = useCallback(() => {
    const { minX, minY, maxX, maxY } = layout.bounds;
    const w = Math.max(maxX - minX, 60);
    const h = Math.max(maxY - minY, 60);
    const pad = 56;
    const k = Math.min((size.w - pad * 2) / w, (size.h - pad * 2) / h, 1.6);
    setView({
      k,
      tx: size.w / 2 - ((minX + maxX) / 2) * k,
      ty: size.h / 2 - ((minY + maxY) / 2) * k,
    });
  }, [layout, size.w, size.h]);

  useEffect(fit, [fit]);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = wrap.current!.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const factor = Math.exp(-e.deltaY * 0.0016);
    const k = Math.min(Math.max(view.k * factor, 0.14), 4.5);
    setView({
      k,
      tx: px - ((px - view.tx) * k) / view.k,
      ty: py - ((py - view.ty) * k) / view.k,
    });
  };

  const startDrag = (e: React.PointerEvent) => {
    if ((e.target as Element).closest('[data-node]')) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty };
    setDragging(true);
  };

  const moveDrag = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setView((v) => ({ ...v, tx: drag.current!.tx + (e.clientX - drag.current!.x), ty: drag.current!.ty + (e.clientY - drag.current!.y) }));
  };

  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };

  /** Edges touching the hovered node are drawn strong; everything else recedes. */
  const activeEdges = useMemo(() => {
    if (!hovered) return null;
    return new Set(layout.edges.filter((e) => e.from === hovered || e.to === hovered).map(edgeKey));
  }, [hovered, layout.edges]);

  const showNodeTip = (n: LaidNode, e: React.PointerEvent) => {
    const rect = wrap.current!.getBoundingClientRect();
    const concept = g.conceptOf(n.id);
    const rec = g.recordById.get(n.id);
    const bits: string[] = [];
    if (rec?.usage.plots !== undefined) bits.push(`${rec.usage.plots.toLocaleString('en-IN')} plots`);
    if (rec?.usage.growers !== undefined) bits.push(`${rec.usage.growers.toLocaleString('en-IN')} growers`);
    if (g.isConcept(n.id)) bits.push(`${concept?.records ?? 0} records`);
    setTip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      title: n.label,
      rel: concept?.label,
      detail: bits.join(' · ') || undefined,
    });
    onHover(n.id);
  };

  const showEdgeTip = (edge: LaidEdge, e: React.PointerEvent) => {
    const rect = wrap.current!.getBoundingClientRect();
    const meta = g.doc.meta.sections[edge.rel];
    setTip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      title: `${g.labelOf(edge.from)} -> ${g.labelOf(edge.to)}`,
      rel: meta ? meta.forward : edge.rel,
      detail: edge.plots === undefined ? 'no historical count' : `${edge.plots.toLocaleString('en-IN')} plots behind it`,
    });
  };

  return (
    <div className="stage" ref={wrap}>
      <svg
        className={`canvas${dragging ? ' dragging' : ''}`}
        width={size.w}
        height={size.h}
        onWheel={onWheel}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerLeave={() => {
          endDrag();
          setTip(null);
          onHover(null);
        }}
      >
        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.k})`}>
          <g>
            {layout.edges.map((e) => {
              const key = edgeKey(e);
              const active = activeEdges?.has(key);
              return (
                <line
                  key={key}
                  x1={e.x1}
                  y1={e.y1}
                  x2={e.x2}
                  y2={e.y2}
                  stroke={active ? 'var(--edge-strong)' : 'var(--edge)'}
                  strokeWidth={e.width}
                  strokeOpacity={activeEdges && !active ? 0.35 : 0.9}
                  strokeDasharray={e.dashed ? '3 4' : undefined}
                  strokeLinecap="round"
                  onPointerEnter={(ev) => showEdgeTip(e, ev)}
                  onPointerLeave={() => setTip(null)}
                  style={{ cursor: 'default' }}
                />
              );
            })}
          </g>

          {layout.edges
            .filter((e) => e.label)
            .map((e) => {
              const lift = e.labelLift ?? 12;
              return (
                <g key={`l-${edgeKey(e)}`}>
                  <text
                    className="sector-label"
                    x={e.x1 + (e.x2 - e.x1) * 0.62}
                    y={e.y1 + (e.y2 - e.y1) * 0.62 - lift}
                    textAnchor="end"
                  >
                    {e.label}
                  </text>
                  {e.sublabel && (
                    <text
                      className="node-sub"
                      x={e.x1 + (e.x2 - e.x1) * 0.62}
                      y={e.y1 + (e.y2 - e.y1) * 0.62 - lift + 14}
                      textAnchor="end"
                    >
                      {e.sublabel}
                    </text>
                  )}
                </g>
              );
            })}

          {layout.labels.map((l, i) => (
            <text
              key={`s-${i}-${l.text}`}
              className={l.kind === 'sector' ? 'sector-label' : 'column-label'}
              x={l.x}
              y={l.y}
              textAnchor={l.anchor}
            >
              {l.text}
            </text>
          ))}

          {layout.nodes.map((n) => {
            const colour = layerColour(n.layer);
            const isFocus = n.id === focusId || n.kind === 'focus';
            return (
              <g
                key={n.id}
                data-node={n.id}
                transform={`translate(${n.x} ${n.y})`}
                onPointerEnter={(e) => showNodeTip(n, e)}
                onPointerLeave={() => {
                  setTip(null);
                  onHover(null);
                }}
                onClick={() => onFocus(n.id)}
                style={{ cursor: 'pointer' }}
              >
                {n.kind === 'concept' ? (
                  <rect
                    x={-n.r}
                    y={-n.r}
                    width={n.r * 2}
                    height={n.r * 2}
                    rx={3}
                    fill={colour}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                ) : (
                  <circle r={n.r} fill={colour} stroke="#fff" strokeWidth={isFocus ? 3 : 2} />
                )}
                {isFocus && <circle r={n.r + 6} fill="none" stroke={colour} strokeWidth={1.5} strokeOpacity={0.45} />}
                <text
                  className="node-label"
                  x={n.anchor === 'start' ? n.r + 7 : n.anchor === 'end' ? -n.r - 7 : 0}
                  y={n.anchor === 'middle' ? n.r + 16 : n.sub ? -1 : 4}
                  textAnchor={n.anchor}
                  fontWeight={isFocus ? 650 : 400}
                >
                  {n.label}
                </text>
                {n.sub && (
                  <text
                    className="node-sub"
                    x={n.anchor === 'start' ? n.r + 7 : n.anchor === 'end' ? -n.r - 7 : 0}
                    y={n.anchor === 'middle' ? n.r + 29 : 12}
                    textAnchor={n.anchor}
                  >
                    {n.sub}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {tip && (
        <div className="tooltip" style={{ left: Math.min(tip.x + 14, size.w - 240), top: tip.y + 14 }}>
          {tip.rel && <div className="t-rel">{tip.rel}</div>}
          <div>{tip.title}</div>
          {tip.detail && <div className="t-rel">{tip.detail}</div>}
        </div>
      )}

      <div className="stage-hint">
        <span>{layout.caption}</span>
        {layout.omitted > 0 && <span className="warn">{layout.omitted} not drawn</span>}
      </div>

      <div className="stage-controls">
        <button type="button" title="Zoom in" onClick={() => setView((v) => ({ ...v, k: Math.min(v.k * 1.25, 4.5) }))}>
          +
        </button>
        <button type="button" title="Zoom out" onClick={() => setView((v) => ({ ...v, k: Math.max(v.k / 1.25, 0.14) }))}>
          −
        </button>
        <button type="button" title="Fit to view" onClick={fit}>
          ⤢
        </button>
      </div>
    </div>
  );
}

const edgeKey = (e: LaidEdge) => `${e.rel}|${e.from}|${e.to}`;
