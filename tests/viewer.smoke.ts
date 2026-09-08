/**
 * Invariant 12: the viewer smoke test.
 *
 * Loads the emitted document in a headless browser against the built viewer, asserts that the expected
 * number of nodes actually rendered in every mode, that no label boxes overlap after the de-collision
 * pass, and that the console stayed clean. Also writes a screenshot per mode, because the validator
 * checks colour and arithmetic - only looking at the thing catches a layout that has gone wrong.
 *
 * Run: npx tsx tests/viewer.smoke.ts [--keep-open]
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import puppeteer, { type Browser } from 'puppeteer-core';

const BROWSERS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/chromium',
  '/usr/bin/google-chrome',
];

const MODES = ['Attached', 'Drill down', 'Where used', 'All entity types'] as const;
const SHOT_DIR = resolve('dist/screenshots');
const PORT = 8791;

function findBrowser(): string {
  const found = BROWSERS.find((p) => existsSync(p));
  if (!found) throw new Error(`no Chrome or Edge found. Looked in:\n  ${BROWSERS.join('\n  ')}`);
  return found;
}

async function waitForServer(url: string, tries = 40): Promise<void> {
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server at ${url} never came up`);
}

async function main() {
  const doc = JSON.parse(readFileSync(resolve('dist/demo/graph.json'), 'utf8'));
  if (!existsSync(resolve('dist/viewer/index.html'))) {
    throw new Error('build the viewer first: npm run build:viewer');
  }
  mkdirSync(SHOT_DIR, { recursive: true });

  const api = spawn(process.execPath, [resolve('node_modules/tsx/dist/cli.mjs'), 'src/server/index.ts'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
  });

  let browser: Browser | undefined;
  const problems: string[] = [];
  try {
    await waitForServer(`http://localhost:${PORT}/api/health`);
    browser = await puppeteer.launch({
      executablePath: findBrowser(),
      headless: true,
      args: ['--no-sandbox', '--window-size=1680,1000'],
      defaultViewport: { width: 1680, height: 1000 },
    });
    const page = await browser.newPage();
    const consoleErrors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text());
    });
    page.on('pageerror', (e) => consoleErrors.push(e.message));

    await page.goto(`http://localhost:${PORT}/?tenant=demo`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('.canvas [data-node]', { timeout: 15000 });

    const title = await page.$eval('.panel-title', (el) => el.textContent);
    process.stdout.write(`  panel opened on          ${title}\n`);

    for (const mode of MODES) {
      const clicked = await page.evaluate((label) => {
        const button = [...document.querySelectorAll('.modes button')].find((b) => b.textContent?.trim() === label);
        if (!button) return false;
        (button as HTMLButtonElement).click();
        return true;
      }, mode);
      if (!clicked) {
        problems.push(`mode "${mode}" has no button`);
        continue;
      }
      await new Promise((r) => setTimeout(r, 500));

      const stats = await page.evaluate(() => {
        const nodes = [...document.querySelectorAll('.canvas [data-node]')];
        const boxes = nodes
          .map((n) => n.querySelector('text')?.getBoundingClientRect())
          .filter((b): b is DOMRect => Boolean(b) && b!.width > 0);
        let overlaps = 0;
        for (let i = 0; i < boxes.length; i += 1) {
          for (let j = i + 1; j < boxes.length; j += 1) {
            const a = boxes[i];
            const b = boxes[j];
            if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) overlaps += 1;
          }
        }
        return {
          nodes: nodes.length,
          overlaps,
          caption: document.querySelector('.stage-hint span')?.textContent ?? '',
        };
      });

      const slug = mode.toLowerCase().replace(/[^a-z]+/g, '-');
      await page.screenshot({ path: resolve(SHOT_DIR, `${slug}.png`) });
      process.stdout.write(
        `  ${mode.padEnd(24)}${String(stats.nodes).padStart(3)} nodes, ${stats.overlaps} label overlaps  ${stats.caption}\n`,
      );
      if (stats.nodes === 0) problems.push(`mode "${mode}" rendered no nodes`);
      if (stats.overlaps > 0) problems.push(`mode "${mode}" has ${stats.overlaps} overlapping labels`);
    }

    // Route mode, driven the way a user would: pick one end from the panel, the other from search.
    await page.evaluate(() => {
      const chip = [...document.querySelectorAll('.chip')].find((c) => c.textContent?.includes('Route from here'));
      (chip as HTMLButtonElement | undefined)?.click();
    });
    await page.type('.search input', 'Cold Store');
    await new Promise((r) => setTimeout(r, 350));
    const picked = await page.evaluate(() => {
      const first = document.querySelector('.results .result') as HTMLButtonElement | null;
      if (!first) return null;
      const text = first.textContent ?? '';
      first.click();
      return text;
    });
    await new Promise((r) => setTimeout(r, 250));
    await page.evaluate(() => {
      const chip = [...document.querySelectorAll('.chip')].find((c) => c.textContent?.includes('Route to here'));
      (chip as HTMLButtonElement | undefined)?.click();
    });
    await new Promise((r) => setTimeout(r, 450));
    const route = await page.evaluate(() => ({
      nodes: document.querySelectorAll('.canvas [data-node]').length,
      caption: document.querySelector('.stage-hint span')?.textContent ?? '',
    }));
    await page.screenshot({ path: resolve(SHOT_DIR, 'route.png') });
    process.stdout.write(`  Route                   ${String(route.nodes).padStart(3)} nodes                     ${route.caption}\n`);
    if (!picked) problems.push('search returned nothing for "Cold Store"');
    if (!/hop/.test(route.caption)) problems.push(`route mode did not resolve a path: "${route.caption}"`);

    // The document the viewer received must be the document on disk.
    const counts = await page.evaluate(async () => {
      const res = await fetch('/api/meta?tenant=demo');
      return (await res.json()).counts as { records: number; links: number };
    });
    if (counts.records !== doc.meta.counts.records || counts.links !== doc.meta.counts.links) {
      problems.push(`served counts ${JSON.stringify(counts)} do not match the file`);
    }
    process.stdout.write(`  document served          ${counts.records} records, ${counts.links} links\n`);

    if (consoleErrors.length) problems.push(`console errors: ${consoleErrors.slice(0, 3).join(' | ')}`);
  } finally {
    await browser?.close();
    api.kill();
  }

  if (problems.length) {
    process.stderr.write(`\n  FAILED\n${problems.map((p) => `    - ${p}`).join('\n')}\n\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(`\n  viewer smoke test passed. Screenshots in ${SHOT_DIR}\n\n`);
  }
}

await main();
