/**
 * A tiny arithmetic evaluator for `derivations.yaml` computed metrics.
 *
 * Deliberately not `eval`. The derivation rules are data, and data from a mapping file must never become
 * executable code. Supports numbers, identifiers, + - * / unary minus, parentheses, and round(x, n).
 */

type Tok = { t: 'num'; v: number } | { t: 'id'; v: string } | { t: 'op'; v: string };

export class ExprError extends Error {}

function lex(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i += 1;
    } else if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j += 1;
      const v = Number(src.slice(i, j));
      if (Number.isNaN(v)) throw new ExprError(`bad number in "${src}"`);
      out.push({ t: 'num', v });
      i = j;
    } else if (/[a-zA-Z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[a-zA-Z0-9_]/.test(src[j])) j += 1;
      out.push({ t: 'id', v: src.slice(i, j) });
      i = j;
    } else if ('+-*/(),'.includes(c)) {
      out.push({ t: 'op', v: c });
      i += 1;
    } else {
      throw new ExprError(`unexpected character "${c}" in "${src}"`);
    }
  }
  return out;
}

/** Evaluates `src` against `vars`. Returns null when a referenced variable is absent. */
export function evaluate(src: string, vars: Record<string, number>): number | null {
  const toks = lex(src);
  let pos = 0;
  let missing = false;

  const peek = () => toks[pos];
  const eat = (v: string) => {
    const t = peek();
    if (!t || t.t !== 'op' || t.v !== v) throw new ExprError(`expected "${v}" in "${src}"`);
    pos += 1;
  };

  const expr = (): number => {
    let left = term();
    for (;;) {
      const t = peek();
      if (t && t.t === 'op' && (t.v === '+' || t.v === '-')) {
        pos += 1;
        const right = term();
        left = t.v === '+' ? left + right : left - right;
      } else return left;
    }
  };

  const term = (): number => {
    let left = unary();
    for (;;) {
      const t = peek();
      if (t && t.t === 'op' && (t.v === '*' || t.v === '/')) {
        pos += 1;
        const right = unary();
        if (t.v === '/' && right === 0) {
          missing = true;
          left = 0;
        } else left = t.v === '*' ? left * right : left / right;
      } else return left;
    }
  };

  const unary = (): number => {
    const t = peek();
    if (t && t.t === 'op' && t.v === '-') {
      pos += 1;
      return -unary();
    }
    return primary();
  };

  const primary = (): number => {
    const t = peek();
    if (!t) throw new ExprError(`unexpected end of "${src}"`);
    if (t.t === 'num') {
      pos += 1;
      return t.v;
    }
    if (t.t === 'id') {
      pos += 1;
      if (peek()?.t === 'op' && (peek() as { v: string }).v === '(') {
        eat('(');
        const args: number[] = [expr()];
        while (peek()?.t === 'op' && (peek() as { v: string }).v === ',') {
          eat(',');
          args.push(expr());
        }
        eat(')');
        return call(t.v, args);
      }
      if (!(t.v in vars)) {
        missing = true;
        return 0;
      }
      return vars[t.v];
    }
    if (t.v === '(') {
      eat('(');
      const v = expr();
      eat(')');
      return v;
    }
    throw new ExprError(`unexpected "${t.v}" in "${src}"`);
  };

  const call = (name: string, args: number[]): number => {
    switch (name) {
      case 'round': {
        const [x, n = 0] = args;
        const f = 10 ** n;
        return Math.round(x * f) / f;
      }
      case 'abs':
        return Math.abs(args[0]);
      case 'min':
        return Math.min(...args);
      case 'max':
        return Math.max(...args);
      default:
        throw new ExprError(`unknown function "${name}" in "${src}"`);
    }
  };

  const value = expr();
  if (pos !== toks.length) throw new ExprError(`trailing tokens in "${src}"`);
  if (missing || !Number.isFinite(value)) return null;
  return value;
}
