/**
 * A table reader is the only thing that touches a data store.
 *
 * `read` returns null - not an empty array - when the table does not exist for this tenant. That
 * distinction is what lets the pipeline degrade gracefully: an empty table means no rows, a missing table
 * means a gap to report.
 */
export type Row = Record<string, string | number | boolean | null>;

export interface TableReader {
  readonly name: string;
  /**
   * @param table  table or view name
   * @param where  equality filters
   * @param tenantId  when given, the read is scoped with `tenant_id = tenantId`
   */
  read(table: string, where: Record<string, unknown>, tenantId?: string): Promise<Row[] | null>;
  close?(): Promise<void>;
}
