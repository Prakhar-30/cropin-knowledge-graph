/**
 * Renders every mermaid block in the docs to a committed SVG and PNG.
 *
 * The diagrams are authored as mermaid because that is what stays reviewable in a diff, and github.com
 * renders it natively. Nothing else does - a markdown preview in an editor, or anything that turns the
 * docs into a PDF, shows the raw source. So the image is committed alongside it, the doc shows the
 * image, and the source stays in a collapsed block for editing.
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

/**
 * Files to scan, and the name each block gets in order. A block past the end of a list falls back to a
 * numbered name, so adding a diagram does not require touching this list first.
 */
const SOURCES = [
  { file: 'README.md', names: ['architecture', 'flow'] },
  {
    file: 'docs/HOW-IT-WORKS.md',
    names: [
      'masters',
      'connect',
      'missing-data',
      'one-row-mapped',
      'ontology-layers',
      'build',
      'derive',
      'publish',
      'panel-order',
      'route-how-to',
    ],
  },
];

const OUT_DIR = resolve('docs/diagrams');
const SCRATCH = resolve('docs/diagrams/.render.html');

function findBrowser() {
  const found = BROWSERS.find((p) => existsSync(p));
  if (!found) throw new Error(`no Chrome or Edge found. Looked in:\n  ${BROWSERS.join('\n  ')}`);
  return found;
}

/* ------------------------------------------------------------------ collect */

const blocks = [];
for (const { file, names } of SOURCES) {
  if (!existsSync(file)) continue;
  const found = [...readFileSync(file, 'utf8').matchAll(/```mermaid\n([\s\S]*?)```/g)].map((m) => m[1]);
  const stem = file.replace(/^.*\//, '').replace(/\.md$/, '').toLowerCase();
  found.forEach((source, i) => blocks.push({ source, name: names[i] ?? `${stem}-${i + 1}`, file }));
  console.log(`  ${file}: ${found.length} block${found.length === 1 ? '' : 's'}`);
}
if (blocks.length === 0) throw new Error('no mermaid blocks found');

mkdirSync(OUT_DIR, { recursive: true });

/* ------------------------------------------------------------------- render */

/*
 * A light background is painted explicitly. A transparent SVG with dark text disappears against a dark
 * page, and neither GitHub nor an editor inverts images.
 */
const html = `<!doctype html><html><body style="margin:0;background:#fff;font-family:system-ui">
${blocks.map((_, i) => `<div id="d${i}" style="padding:8px"></div>`).join('\n')}
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  const sources = ${JSON.stringify(blocks.map((b) => b.source))};
  window.__svgs = [];
  window.__errors = [];
  mermaid.initialize({
    startOnLoad: false,
    theme: 'neutral',
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
    sequence: { useMaxWidth: false, wrap: false, actorMargin: 60 },
    flowchart: { useMaxWidth: false, htmlLabels: true, curve: 'basis' },
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

writeFileSync(SCRATCH, html);

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
  await page.waitForFunction('window.__done === true', { timeout: 90000 });

  const { svgs, errors } = await page.evaluate(() => ({ svgs: window.__svgs, errors: window.__errors }));
  for (const e of errors) console.error(`  FAILED  ${blocks[e.i].name} (${blocks[e.i].file}): ${e.message}`);

  for (let i = 0; i < svgs.length; i += 1) {
    if (!svgs[i]) continue;
    const { name } = blocks[i];

    /*
     * Paint the background across the whole viewBox, not from the origin. Mermaid emits a negative
     * viewBox origin, so a rect at 0,0 leaves an unpainted strip on the left and top.
     */
    const vb = svgs[i].match(/viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/);
    if (!vb) throw new Error(`${name}: no viewBox to size the background from`);
    const [minX, minY, w, h] = vb.slice(1).map(Number);
    const svg = svgs[i].replace(
      /(<svg\b[^>]*>)/,
      `$1<rect x="${minX}" y="${minY}" width="${w}" height="${h}" fill="#ffffff"/>`,
    );

    writeFileSync(resolve(OUT_DIR, `${name}.svg`), `${svg}\n`);
    const el = await page.$(`#d${i} svg`);
    if (el) await el.screenshot({ path: resolve(OUT_DIR, `${name}.png`) });
    console.log(`  ${name.padEnd(18)} ${Math.round(w)} x ${Math.round(h)}`);
  }

  if (errors.length) process.exitCode = 1;
} finally {
  await browser.close();
}
