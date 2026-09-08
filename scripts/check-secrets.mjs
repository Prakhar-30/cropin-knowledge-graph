/**
 * Fails if anything that looks like a real credential is tracked by git.
 *
 * This exists because it already happened: a service role key was filled into `.env.example` - which is
 * committed, unlike `.env` - and a `git add -A` swept it into a commit. GitHub's push protection caught
 * it, which is luck rather than a process. This is the process.
 *
 * Run: npm run check:secrets
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

/** Key shapes worth refusing. Prefix-based, so a placeholder ending in `...` never matches. */
const PATTERNS = [
  { name: 'Supabase secret key', re: /\bsb_secret_[A-Za-z0-9_-]{12,}/g },
  { name: 'Supabase service_role JWT', re: /\bey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  { name: 'Postgres connection string with a password', re: /postgres(?:ql)?:\/\/[^\s:@/]+:[^\s@/]{6,}@/g },
  { name: 'AWS access key id', re: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{20,}/g },
  { name: 'private key block', re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
];

/** Binary and generated files carry no hand-typed credentials and are large. */
const SKIP = /\.(png|jpg|jpeg|gif|svg|ico|woff2?|ttf|pdf|lock)$|^package-lock\.json$|^dist\//;

const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .map((f) => f.trim())
  .filter((f) => f !== '' && !SKIP.test(f));

const findings = [];
for (const file of tracked) {
  try {
    if (statSync(file).size > 2_000_000) continue;
  } catch {
    continue;
  }
  const text = readFileSync(file, 'utf8');
  for (const { name, re } of PATTERNS) {
    for (const match of text.matchAll(re)) {
      const line = text.slice(0, match.index).split('\n').length;
      // Show only enough to identify it, never the whole value.
      const shown = `${match[0].slice(0, 12)}...`;
      findings.push(`${file}:${line}  ${name}  ${shown}`);
    }
  }
}

if (findings.length) {
  process.stderr.write(`\n  ${findings.length} possible credential${findings.length === 1 ? '' : 's'} in tracked files:\n\n`);
  for (const f of findings) process.stderr.write(`    ${f}\n`);
  process.stderr.write(
    [
      '',
      '  A committed secret is a leaked secret. Rotate it, then move the value into .env,',
      '  which is gitignored, and leave a placeholder in .env.example.',
      '',
    ].join('\n'),
  );
  process.exitCode = 1;
} else {
  process.stdout.write(`  no credentials in ${tracked.length} tracked files\n`);
}
