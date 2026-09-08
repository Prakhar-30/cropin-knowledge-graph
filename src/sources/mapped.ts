/**
 * A source assembled from a mapping file and a table reader. The mapping decides what is read; the
 * reader decides where from. Neither knows anything about derivation or the emitted document.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import YAML from 'yaml';
import type { SourceBundle } from '../core/model.js';
import { applyMapping } from '../mapping/apply.js';
import { assertReadOnly, MappingSchema, type Mapping } from '../mapping/spec.js';
import type { Source, SourceOptions } from './base.js';
import { CsvTableReader } from './csv.js';
import { createSupabase, SupabaseTableReader } from './supabase.js';
import type { TableReader } from './table.js';

export function loadMapping(path: string): { mapping: Mapping; dir: string } {
  const abs = resolve(path);
  const mapping = MappingSchema.parse(YAML.parse(readFileSync(abs, 'utf8')));
  assertReadOnly(mapping);
  return { mapping, dir: dirname(abs) };
}

export function readerFor(mapping: Mapping, mappingDir: string): TableReader {
  if (mapping.source === 'csv') {
    if (!mapping.directory) throw new Error('a csv mapping needs a `directory`');
    return new CsvTableReader(resolve(mappingDir, mapping.directory));
  }
  const url = process.env[mapping.url_env];
  const key = process.env[mapping.key_env];
  if (!url || !key) {
    throw new Error(
      `set ${mapping.url_env} and ${mapping.key_env} in the environment (see .env.example); credentials never live in the mapping file`,
    );
  }
  return new SupabaseTableReader(createSupabase({ url, key }));
}

export class MappedSource implements Source {
  readonly name: string;
  /** Problems the mapping hit, surfaced by the CLI after the build. */
  problems: string[] = [];

  constructor(
    private readonly mapping: Mapping,
    private readonly reader: TableReader,
  ) {
    this.name = `${mapping.source}:${mapping.tenant_id}`;
  }

  async load({ tenantId, snapshot }: SourceOptions): Promise<SourceBundle> {
    const result = await applyMapping(this.mapping, this.reader, tenantId);
    this.problems = result.problems;
    return {
      tenant_id: tenantId,
      source_snapshot: snapshot ?? this.mapping.snapshot ?? new Date().toISOString().slice(0, 10),
      source_name: this.name,
      records: result.records,
      links: result.links,
      metrics_not_computed: result.metricsNotComputed,
    };
  }
}
