/**
 * Checks every committed diagram the way a reader will actually see it.
 *
 * An SVG loaded through an `<img>` tag renders in a restricted mode: no scripts, no external resources,
 * and - the reason this script exists - `foreignObject` content is dropped. A diagram can therefore look
 * perfect when opened directly and arrive as empty boxes in a markdown viewer. Rendering it is not the
 * test; rendering it *through an img tag* is.
 *
 * The check: rasterise each file into a canvas via <img>, and compare its ink - the share of non-white
 * pixels - against the same SVG inlined into the page, where foreignObject does render. If the two
 * differ materially, the file is losing content on the way through.
 *
 * Run: npm run docs:check-diagrams
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import puppeteer from 'puppeteer-core';

const BROWSERS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
];

/** Defaults to the committed diagrams; a directory can be passed to check any other set. */
const DIR = resolve(process.argv[2] ?? 'docs/diagrams');
const SCRATCH = resolve(DIR, '.check.html');

/** Below this share of dark pixels a diagram is effectively blank, whatever its dimensions. */
const MIN_INK = 0.004;
/** How far the img-rendered ink may fall short of the inlined ink before it counts as lost content. */
const MAX_LOSS = 0.25;

const found = BROWSERS.find((p) => existsSync(p));
if (!found) throw new Error(`no Chrome or Edge found. Looked in:\n  ${BROWSERS.join('\n  ')}`);

const files = readdirSync(DIR)
  .filter((f) => f.endsWith('.svg'))
  .sort();
if (files.length === 0) throw new Error('no diagrams to check - run npm run docs:diagrams first');

const svgs = Object.fromEntries(files.map((f) => [f, readFileSync(resolve(DIR, f), 'utf8')]));

const html = `<!doctype html><html><body style="margin:0;background:#fff">
<script>
  window.__svgs = ${JSON.stringify(svgs)};

  // Share of pixels that are not near-white. A blank diagram scores close to zero.
  function ink(canvas) {
    const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    let dark = 0;
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      const luma = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (alpha > 16 && luma < 235) dark += 1;
    }
    return dark / (canvas.width * canvas.height);
  }

  function draw(width, height, paint) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(Math.round(width), 1400);
    canvas.height = Math.min(Math.round(height), 1400);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    paint(ctx, canvas);
    return canvas;
  }

  window.__run = async () => {
    const out = [];
    for (const [name, source] of Object.entries(window.__svgs)) {
      const box = source.match(/viewBox="(-?[\\d.]+) (-?[\\d.]+) ([\\d.]+) ([\\d.]+)"/);
      const w = box ? Number(box[3]) : 800;
      const h = box ? Number(box[4]) : 600;
      const scale = Math.min(1400 / w, 1400 / h, 1);

      // 1. Through an img tag - what a markdown viewer does.
      const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
      const img = new Image();
      // An img tag parses SVG as strict XML. A foreignObject full of HTML often is not valid XML, and
      // then the whole image fails to load rather than losing only its text - which is exactly how this
      // showed up: sections whose labels contained a line break rendered as nothing at all.
      const loaded = await new Promise((done) => {
        img.onload = () => done(true);
        img.onerror = () => done(false);
        img.src = url;
      });
      const viaImg = loaded
        ? ink(draw(w * scale, h * scale, (ctx, c) => ctx.drawImage(img, 0, 0, c.width, c.height)))
        : 0;

      // 2. Inlined into the page, where foreignObject does render - the reference.
      const holder = document.createElement('div');
      holder.style.cssText = 'position:absolute;left:-99999px;top:0';
      holder.innerHTML = source;
      document.body.appendChild(holder);
      const serialised = new XMLSerializer().serializeToString(holder.querySelector('svg'));
      const inlineImg = new Image();
      await new Promise((done) => {
        inlineImg.onload = done;
        inlineImg.onerror = done;
        inlineImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(serialised);
      });
      holder.remove();
      const viaInline = ink(draw(w * scale, h * scale, (ctx, c) => ctx.drawImage(inlineImg, 0, 0, c.width, c.height)));

      out.push({ name, loaded, viaImg, viaInline, hasForeignObject: source.includes('foreignObject') });
    }
    return out;
  };
</script></body></html>`;

const { writeFileSync, rmSync } = await import('node:fs');
writeFileSync(SCRATCH, html);

const browser = await puppeteer.launch({
  executablePath: found,
  headless: true,
  args: ['--no-sandbox', '--allow-file-access-from-files'],
  defaultViewport: { width: 1500, height: 1000 },
});

const problems = [];
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
  await page.goto(pathToFileURL(SCRATCH).href, { waitUntil: 'load' });
  const results = await page.evaluate(() => window.__run());

  for (const r of results) {
    const loss = r.viaInline > 0 ? 1 - r.viaImg / r.viaInline : 0;
    const ok = r.loaded && r.viaImg >= MIN_INK && loss <= MAX_LOSS && !r.hasForeignObject;
    process.stdout.write(
      `  ${ok ? 'ok  ' : 'FAIL'}  ${r.name.padEnd(22)}` +
        `ink ${(r.viaImg * 100).toFixed(2)}%  inlined ${(r.viaInline * 100).toFixed(2)}%` +
        `${r.hasForeignObject ? '  foreignObject' : ''}\n`,
    );
    if (!r.loaded) problems.push(`${r.name}: an img tag refuses to load it, so it renders as nothing`);
    else if (r.hasForeignObject) problems.push(`${r.name}: contains a foreignObject, which an img tag drops`);
    else if (r.viaImg < MIN_INK) problems.push(`${r.name}: renders essentially blank through an img tag`);
    else if (loss > MAX_LOSS) problems.push(`${r.name}: loses ${Math.round(loss * 100)}% of its content through an img tag`);
  }
} finally {
  await browser.close();
  rmSync(SCRATCH, { force: true });
}

if (problems.length) {
  process.stderr.write(`\n  ${problems.length} diagram problem${problems.length === 1 ? '' : 's'}:\n`);
  for (const p of problems) process.stderr.write(`    ${p}\n`);
  process.stderr.write('\n  Re-run npm run docs:diagrams with htmlLabels false.\n\n');
  process.exitCode = 1;
} else {
  process.stdout.write(`\n  all ${files.length} diagrams render through an img tag\n\n`);
}
