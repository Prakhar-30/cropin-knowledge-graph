/** Resolves a source name from the CLI into a Source, plus the tenant the build runs for. */
import type { Source } from './base.js';
import { loadMapping, MappedSource, readerFor } from './mapped.js';
import { SyntheticSource } from './synthetic/index.js';

export interface ResolveOptions {
  mapping?: string;
  tenant?: string;
}

export async function resolveSource(
  name: string,
  { mapping, tenant }: ResolveOptions,
): Promise<{ source: Source; tenantId: string }> {
  if (name === 'synthetic') {
    return { source: new SyntheticSource(), tenantId: tenant ?? 'demo' };
  }
  if (name === 'csv' || name === 'supabase') {
    if (!mapping) throw new Error(`--source ${name} needs --mapping <file>`);
    const { mapping: spec, dir } = loadMapping(mapping);
    if (spec.source !== name) {
      throw new Error(`mapping "${mapping}" declares source "${spec.source}" but --source said "${name}"`);
    }
    const source = new MappedSource(spec, readerFor(spec, dir));
    return { source, tenantId: tenant ?? spec.tenant_id };
  }
  throw new Error(`unknown source "${name}". Use synthetic, csv or supabase.`);
}
