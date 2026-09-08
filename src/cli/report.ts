/** Terminal reporting for the CLI. Kept apart from the pipeline so the pipeline stays quiet. */
import type { DeriveReport } from '../core/derive.js';
import { ontology } from '../core/ontology.js';
import type { ValidationResult } from '../core/validate.js';

const GREEN = '\u001b[32m';
const RED = '\u001b[31m';
const DIM = '\u001b[2m';
const YELLOW = '\u001b[33m';
const RESET = '\u001b[0m';

const colour = process.stdout.isTTY && !process.env.NO_COLOR;
const c = (code: string, s: string) => (colour ? `${code}${s}${RESET}` : s);

export const ok = (s: string) => c(GREEN, s);
export const bad = (s: string) => c(RED, s);
export const warn = (s: string) => c(YELLOW, s);
export const dim = (s: string) => c(DIM, s);

export function line(stage: string, body: string, status = ''): void {
  process.stdout.write(`  ${stage.padEnd(13)}${body.padEnd(46)}${status}\n`);
}

export function reportOntology(): void {
  line(
    'ontology',
    `${ontology.concepts.length} concepts, ${ontology.relations.length} relations, ${ontology.layers.length} layers`,
    ok('ok'),
  );
}

export function reportSource(name: string, records: number, links: number): void {
  line('source', name, `${records.toLocaleString('en-IN')} records, ${links.toLocaleString('en-IN')} links`);
}

export function reportDerive(d: DeriveReport): void {
  const status = d.skipped.length === 0 && d.summaryProblems.length === 0 ? ok('ok') : warn(`${d.skipped.length + d.summaryProblems.length} gaps`);
  line('derive', `${d.rollups} rollups, ${d.computed} computed, ${d.summaries} summaries`, status);
  for (const s of d.skipped.slice(0, 5)) process.stdout.write(`                ${dim(`skipped ${s}, an input was missing`)}\n`);
  for (const p of d.summaryProblems.slice(0, 5)) {
    process.stdout.write(`                ${dim(`${p.record}: ${p.slot} ${p.reason}`)}\n`);
  }
}

export function reportValidation(v: ValidationResult): void {
  const failed = v.checks.filter((x) => !x.ok);
  line('validate', `${v.checks.length} invariants`, failed.length === 0 ? ok('ok') : bad(`${failed.length} failed`));
  for (const check of failed) {
    process.stdout.write(`                ${bad(`${check.n}. ${check.name}`)}\n`);
    for (const o of check.offenders) process.stdout.write(`                  ${dim(o)}\n`);
  }
}

export function reportGraph(v: ValidationResult): void {
  const r = v.reach;
  line(
    'graph',
    `${r.componentCount} component${r.componentCount === 1 ? '' : 's'}, longest path ${r.longestPath}, mean ${r.meanPath}`,
    '',
  );
}
