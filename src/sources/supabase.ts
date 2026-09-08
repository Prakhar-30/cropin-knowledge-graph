/**
 * Supabase table reader.
 *
 * Reads platform master tables and aggregate views through PostgREST. Aggregation stays in the database
 * as views - the graph is small, the operational tables are not, and a relational engine does that work
 * far better than anything in this process would.
 *
 * Read-only by construction: this reader only ever issues selects, and the publishable key it uses is
 * expected to carry select-only policies.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Row, TableReader } from './table.js';

const PAGE = 1000;

/** PostgREST codes for "that relation does not exist here". */
const MISSING = new Set(['PGRST205', 'PGRST106', '42P01']);

export interface SupabaseReaderOptions {
  url: string;
  key: string;
  schema?: string;
}

export function createSupabase({ url, key, schema }: SupabaseReaderOptions): SupabaseClient<any, any, any> {
  if (!url || !key) throw new Error('Supabase url and key are both required');
  return createClient(url, key, {
    auth: { persistSession: false },
    ...(schema ? { db: { schema } } : {}),
  });
}

export class SupabaseTableReader implements TableReader {
  readonly name = 'supabase';

  constructor(private readonly client: SupabaseClient) {}

  async read(table: string, where: Record<string, unknown>, tenantId?: string): Promise<Row[] | null> {
    const out: Row[] = [];
    for (let offset = 0; ; offset += PAGE) {
      let query = this.client.from(table).select('*').range(offset, offset + PAGE - 1);
      if (tenantId !== undefined) query = query.eq('tenant_id', tenantId);
      for (const [column, value] of Object.entries(where)) {
        query = value === null ? query.is(column, null) : query.eq(column, value as never);
      }
      const { data, error } = await query;
      if (error) {
        if (MISSING.has(error.code ?? '')) return null;
        // A tenant-scoped read against a table with no tenant_id column: retry unscoped once.
        if (error.code === '42703' && tenantId !== undefined) return this.read(table, where, undefined);
        throw new Error(`supabase read of "${table}" failed: ${error.message} (${error.code ?? 'no code'})`);
      }
      out.push(...((data ?? []) as Row[]));
      if (!data || data.length < PAGE) return out;
    }
  }
}
