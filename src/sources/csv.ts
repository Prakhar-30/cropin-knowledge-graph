/**
 * CSV table reader, for fixtures and tests.
 *
 * A directory of `<table>.csv` files stands in for a tenant database. The fixtures deliberately include
 * edge cases: a missing operational table, a record with no history, and a variety whose splits do not
 * cover every context.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Row, TableReader } from './table.js';

/** Minimal RFC 4180: quoted fields, doubled quotes inside them, CRLF or LF line endings. */
export function parseCsv(text: string): Row[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let i = 0;
  const push = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    push();
    if (row.length > 1 || row[0] !== '') rows.push(row);
    row = [];
  };
  while (i < text.length) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      quoted = true;
      i += 1;
    } else if (c === ',') {
      push();
      i += 1;
    } else if (c === '\r') {
      i += 1;
    } else if (c === '\n') {
      endRow();
      i += 1;
    } else {
      field += c;
      i += 1;
    }
  }
  if (field !== '' || row.length) endRow();

  const [header, ...body] = rows;
  if (!header) return [];
  return body.map((cells) => {
    const out: Row = {};
    header.forEach((key, idx) => {
      const raw = cells[idx] ?? '';
      if (raw === '') out[key] = null;
      else if (raw === 'true' || raw === 'false') out[key] = raw === 'true';
      else if (/^-?\d+(\.\d+)?$/.test(raw)) out[key] = Number(raw);
      else out[key] = raw;
    });
    return out;
  });
}

export class CsvTableReader implements TableReader {
  readonly name = 'csv';

  constructor(private readonly directory: string) {}

  async read(table: string, where: Record<string, unknown>, tenantId?: string): Promise<Row[] | null> {
    const path = resolve(this.directory, `${table}.csv`);
    if (!existsSync(path)) return null;
    let rows = parseCsv(readFileSync(path, 'utf8'));
    if (tenantId !== undefined) {
      const hasColumn = rows.length === 0 || 'tenant_id' in rows[0];
      if (hasColumn) rows = rows.filter((r) => r.tenant_id === tenantId);
    }
    for (const [column, value] of Object.entries(where)) {
      rows = rows.filter((r) => r[column] === value);
    }
    return rows;
  }
}
