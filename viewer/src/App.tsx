import { useCallback, useEffect, useMemo, useState } from 'react';
import { Canvas } from './components/Canvas.js';
import { Panel } from './components/Panel.js';
import { Rail } from './components/Rail.js';
import { index, loadDocument, type GraphDoc, type Indexed } from './lib/graph.js';
import { attachedLayout, layerBoardLayout, lineageLayout, routeLayout, type Mode } from './lib/layout.js';

const MODES: Array<{ key: Mode; label: string; title: string }> = [
  { key: 'attached', label: 'Attached', title: 'Everything joined directly to this node' },
  { key: 'downstream', label: 'Drill down', title: 'What this leads to, by hop distance' },
  { key: 'upstream', label: 'Where used', title: 'What leads here, by hop distance' },
  { key: 'layers', label: 'All entity types', title: 'The layer board' },
  { key: 'route', label: 'Route', title: 'Shortest path between two nodes' },
];

const DEFAULT_FOCUS = 'crop:potato';

export function App() {
  const [doc, setDoc] = useState<GraphDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('attached');
  const [focusId, setFocusId] = useState<string>(DEFAULT_FOCUS);
  const [hovered, setHovered] = useState<string | null>(null);
  const [routeFrom, setRouteFrom] = useState<string | null>(null);
  const [routeTo, setRouteTo] = useState<string | null>(null);

  useEffect(() => {
    const tenant = new URLSearchParams(window.location.search).get('tenant') ?? 'demo';
    loadDocument(tenant)
      .then(setDoc)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  const g: Indexed | null = useMemo(() => (doc ? index(doc) : null), [doc]);

  // Land on something worth looking at: the biggest crop, or whatever the URL asked for.
  useEffect(() => {
    if (!g) return;
    const wanted = new URLSearchParams(window.location.search).get('node');
    if (wanted && (g.recordById.has(wanted) || g.conceptById.has(wanted))) {
      setFocusId(wanted);
      return;
    }
    if (g.recordById.has(DEFAULT_FOCUS) || g.conceptById.has(DEFAULT_FOCUS)) return;
    const biggest = [...g.doc.records].sort((a, b) => (b.usage.plots ?? 0) - (a.usage.plots ?? 0))[0];
    setFocusId(biggest?.id ?? g.doc.concepts[0].id);
  }, [g]);

  const focus = useCallback(
    (id: string) => {
      setFocusId(id);
      if (mode === 'route') {
        if (!routeFrom || (routeFrom && routeTo)) {
          setRouteFrom(id);
          setRouteTo(null);
        } else {
          setRouteTo(id);
        }
      }
      const url = new URL(window.location.href);
      url.searchParams.set('node', id);
      window.history.replaceState(null, '', url);
    },
    [mode, routeFrom, routeTo],
  );

  const layout = useMemo(() => {
    if (!g) return null;
    switch (mode) {
      case 'attached':
        return attachedLayout(g, focusId);
      case 'downstream':
        return lineageLayout(g, focusId, 'downstream');
      case 'upstream':
        return lineageLayout(g, focusId, 'upstream');
      case 'layers':
        return layerBoardLayout(g, focusId);
      case 'route':
        return routeFrom && routeTo
          ? routeLayout(g, routeFrom, routeTo)
          : attachedLayout(g, routeFrom ?? focusId);
      default:
        return attachedLayout(g, focusId);
    }
  }, [g, mode, focusId, routeFrom, routeTo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const i = MODES.findIndex((m) => m.key === mode);
      if (e.key === '[') setMode(MODES[(i + MODES.length - 1) % MODES.length].key);
      if (e.key === ']') setMode(MODES[(i + 1) % MODES.length].key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode]);

  if (error) {
    return (
      <div className="error">
        <h2>No graph document to show</h2>
        <p>{error}</p>
        <p style={{ color: 'var(--ink-2)' }}>Build one, then start the API:</p>
        <p>
          <code>npm run build:demo</code>
          <br />
          <code>npm run api</code>
        </p>
      </div>
    );
  }

  if (!g || !layout) return <div className="loading">Loading the graph…</div>;

  const meta = g.doc.meta;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brandmark">
          <span className="leaf" />
          Cropin configuration graph
          <span className="sub">what to configure, and what our own history says about it</span>
        </div>
        <div className="topbar-spacer" />
        <div className="modes" role="group" aria-label="View">
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              title={m.title}
              aria-pressed={mode === m.key}
              onClick={() => setMode(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="metastrip">
          <span>
            tenant <b>{meta.tenant_id}</b>
          </span>
          <span>
            as of <b>{meta.source_snapshot}</b>
          </span>
          <span>
            via <b>{meta.source}</b>
          </span>
          {meta.graph && (
            <span>
              <b>{meta.graph.components}</b> component, longest <b>{meta.graph.longest_path}</b>, mean{' '}
              <b>{meta.graph.mean_path}</b>
            </span>
          )}
        </div>
      </header>

      <div className="body">
        <Rail
          g={g}
          focusId={focusId}
          mode={mode}
          routeFrom={routeFrom}
          routeTo={routeTo}
          onFocus={focus}
          onClearRoute={(which) => (which === 'from' ? setRouteFrom(null) : setRouteTo(null))}
        />
        <Canvas g={g} layout={layout} focusId={focusId} onFocus={focus} hovered={hovered} onHover={setHovered} />
        <Panel
          g={g}
          id={focusId}
          onFocus={focus}
          onHover={setHovered}
          onRouteFrom={(id) => {
            setRouteFrom(id);
            setMode('route');
          }}
          onRouteTo={(id) => {
            setRouteTo(id);
            setMode('route');
          }}
        />
      </div>
    </div>
  );
}
