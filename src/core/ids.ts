/**
 * Identity rules for the graph.
 *
 * IDs are stable across rebuilds. They are derived from source primary keys or source labels through the
 * slug function below, never from row order. A record id is always `<concept_key>:<snake_key>` and the
 * prefix must equal the concept key it belongs to (invariant 6).
 */

export const CONCEPT_ID_RE = /^c:[a-z0-9_]+$/;
export const RECORD_ID_RE = /^[a-z0-9_]+:[a-z0-9_]+$/;

/** Deterministic slug: lowercase, ASCII, underscores, collapsed, trimmed. */
export function slug(input: string | number): string {
  return String(input)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export function conceptId(conceptKey: string): string {
  return `c:${slug(conceptKey)}`;
}

export function recordId(conceptKey: string, key: string | number): string {
  return `${slug(conceptKey)}:${slug(key)}`;
}

/** The concept key implied by a record id, or null for a concept id or a malformed one. */
export function conceptKeyOf(id: string): string | null {
  if (CONCEPT_ID_RE.test(id)) return null;
  const i = id.indexOf(':');
  if (i <= 0) return null;
  return id.slice(0, i);
}

export function isConceptId(id: string): boolean {
  return CONCEPT_ID_RE.test(id);
}
