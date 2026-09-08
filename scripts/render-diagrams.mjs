/**
 * Renders every mermaid block in README.md to a committed SVG.
 *
 * The diagrams are authored as mermaid because that is what stays reviewable in a diff, and github.com
 * renders it natively. Nothing else does - VS Code's markdown preview, most editors, and anything that
 * turns the README into a PDF all show the raw source. So the SVG is committed alongside it and the
 * README shows that, with the mermaid kept in a collapsed block for editing.
 *
 * Run: npm run docs:diagrams
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

const BROWSERS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
];

/** Output name per block, in the order the blocks appear in the README. */
const NAMES = ['architecture', 'flow'];

const OUT_DIR = resolve('docs/diagrams');
const SCRATCH = resolve('docs/diagrams/.render.html');

function findBrowser() {
  const found = BROWSERS.find((p) => existsSync(p));
  if (!found) throw new Error(`no Chrome or Edge found. Looked in:\n  ${BROWSERS.join('\n  ')}`);
  return found;
}

const readme = readFileSync('README.md', 'utf8');
const blocks = [...readme.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((m) => m[1]);
if (blocks.length === 0) throw new Error('no mermaid blocks in README.md');
console.log(`${blocks.length} mermaid block${blocks.length === 1 ? '' : 's'} found`);

mkdirSync(OUT_DIR, { recursive: true });

/*
 * A light background is painted explicitly. A transparent SVG with dark text disappears against a dark
 * README background, and GitHub does not invert images.
 */
const page_html = `<!doctype html><html><body style="margin:0;background:#fff">
${blocks.map((_, i) => `<div id="d${i}"></div>`).join('\n')}
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  const sources = ${JSON.stringify(blocks)};
  window.__svgs = [];
  window.__errors = [];
  mermaid.initialize({
    startOnLoad: false,
    theme: 'neutral',
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
    sequence: { useMaxWidth: false, wrap: false, actorMargin: 60, noteFontWeight: '400' },
  });
  for (let i = 0; i < sources.length; i++) {
    try {
      await mermaid.parse(sources[i]);
      const { svg } = await mermaid.render('gen' + i, sources[i]);
      document.getElementById('d' + i).innerHTML = svg;
      window.__svgs.push(document.querySelector('#d' + i + ' svg').outerHTML);
    } catch (e) {
      window.__errors.push({ i, message: String((e && e.message) || e) });
      window.__svgs.push(null);
    }
  }
  window.__done = true;
</script></body></html>`;

writeFileSync(SCRATCH, page_html);

const browser = await puppeteer.launch({
  executablePath: findBrowser(),
  headless: true,
  args: ['--no-sandbox'],
  defaultViewport: { width: 2000, height: 1600, deviceScaleFactor: 1 },
});

try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('  page error:', e.message));
  await page.goto(pathToFileURL(SCRATCH).href, { waitUntil: 'networkidle2' });
  await page.waitForFunction('window.__done === true', { timeout: 60000 });

  const { svgs, errors } = await page.evaluate(() => ({ svgs: window.__svgs, errors: window.__errors }));
  for (const e of errors) console.error(`  block ${e.i + 1} failed to parse: ${e.message}`);

  for (let i = 0; i < svgs.length; i += 1) {
    if (!svgs[i]) continue;
    const name = NAMES[i] ?? `diagram-${i + 1}`;

    /*
     * Paint the background across the whole viewBox, not from the origin. Mermaid emits a negative
     * viewBox origin, so a rect at 0,0 leaves an unpainted strip on the left and top - invisible on a
     * white page and a dark edge on a dark one.
     */
    const vb = svgs[i].match(/viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/);
    if (!vb) throw new Error(`block ${i + 1}: no viewBox to size the background from`);
    const [minX, minY, w, h] = vb.slice(1).map(Number);
    const svg = svgs[i].replace(
      /(<svg\b[^>]*>)/,
      `$1<rect x="${minX}" y="${minY}" width="${w}" height="${h}" fill="#ffffff"/>`,
    );

    const path = resolve(OUT_DIR, `${name}.svg`);
    writeFileSync(path, `${svg}\n`);
    console.log(`  ${name}.svg  ${Math.round(w)} x ${Math.round(h)}  ${Math.round(svg.length / 1024)} KB`);

    // A PNG as well, for anything that will not display an SVG at all.
    const el = await page.$(`#d${i} svg`);
    if (el) {
      await el.screenshot({ path: resolve(OUT_DIR, `${name}.png`) });
      console.log(`  ${name}.png  written`);
    }
  }

  if (errors.length) process.exitCode = 1;
} finally {
  await browser.close();
}
