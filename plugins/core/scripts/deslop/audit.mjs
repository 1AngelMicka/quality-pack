#!/usr/bin/env node
// Audit of a rendered page, with no dependency: drives headless Chrome or Edge through CDP,
// injects measure.js at several widths, saves screenshots and summarises the findings.
// Ported from the deslop-ui skill (same author as the pack).
//
//   node audit.mjs <url|file.html> [--widths 375,768,1440,1920] [--out folder] [--wait 800]
//                  [--click "selector"]... [--before "code or file.js"] [--tauri] [--dark] [--json]
//   node audit.mjs --attach 9222 [--widths 1280]   measures the current state of an already open window
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  // 1920: some layouts only break on wide screens (gutters in vw, padding inside a max-width box)
  const opts = { widths: [375, 768, 1440, 1920], wait: 800, click: [], before: [], dark: false, json: false };
  const rest = [...argv];
  while (rest.length) {
    const arg = rest.shift();
    if (arg === '--widths') opts.widths = rest.shift().split(',').map(Number);
    else if (arg === '--out') opts.out = rest.shift();
    else if (arg === '--wait') opts.wait = Number(rest.shift());
    else if (arg === '--click') opts.click.push(rest.shift());
    else if (arg === '--before') opts.before.push(rest.shift());
    else if (arg === '--tauri') opts.before.push(join(HERE, 'tauri-stub.js'));
    else if (arg === '--attach') opts.attach = Number(rest.shift());
    else if (arg === '--dark') opts.dark = true;
    else if (arg === '--json') opts.json = true;
    else if (!opts.target) opts.target = arg;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!opts.target && !opts.attach) throw new Error('Usage: node audit.mjs <url|file.html> [--widths 375,768,1440,1920] [--out folder]');
  return opts;
}

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  const found = candidates.find((path) => path && existsSync(path));
  if (!found) throw new Error('Chrome or Edge not found: set CHROME_PATH.');
  return found;
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.listeners = new Set();
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { ok, fail } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) fail(new Error(`${msg.error.message} (${msg.error.code})`));
        else ok(msg.result);
      } else if (msg.method) {
        for (const listener of this.listeners) listener(msg);
      }
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((ok, fail) => {
      this.pending.set(id, { ok, fail });
      this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }
  once(method, timeout) {
    return new Promise((done) => {
      const timer = setTimeout(() => {
        this.listeners.delete(listener);
        done(false);
      }, timeout);
      const listener = (msg) => {
        if (msg.method !== method) return;
        clearTimeout(timer);
        this.listeners.delete(listener);
        done(true);
      };
      this.listeners.add(listener);
    });
  }
}

function launch(browser, profile) {
  const proc = spawn(browser, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
    '--disable-extensions', '--disable-background-networking', `--user-data-dir=${profile}`,
    '--remote-debugging-port=0', 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  const endpoint = new Promise((ok, fail) => {
    let log = '';
    const timer = setTimeout(() => fail(new Error(`The browser did not start.\n${log}`)), 20000);
    proc.stderr.on('data', (chunk) => {
      log += chunk;
      const match = log.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) {
        clearTimeout(timer);
        ok(match[1]);
      }
    });
    proc.on('exit', () => {
      clearTimeout(timer);
      fail(new Error(`The browser stopped.\n${log}`));
    });
  });
  return { proc, endpoint };
}

async function auditWidth(cdp, session, opts, url, width, measure, outDir) {
  const height = width < 768 ? 812 : width < 1100 ? 1024 : 900;
  await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768 }, session);

  const errors = [];
  let inflight = 0;
  let lastActivity = Date.now();
  const listener = (msg) => {
    if (msg.sessionId !== session) return;
    if (msg.method === 'Network.requestWillBeSent') { inflight++; lastActivity = Date.now(); }
    if (msg.method === 'Network.loadingFinished' || msg.method === 'Network.loadingFailed') { inflight = Math.max(0, inflight - 1); lastActivity = Date.now(); }
    if (msg.method === 'Runtime.exceptionThrown') {
      const details = msg.params.exceptionDetails;
      errors.push(details.exception?.description?.split('\n')[0] || details.text);
    }
  };
  cdp.listeners.add(listener);

  if (url) {
    const loaded = cdp.once('Page.loadEventFired', 20000);
    const nav = await cdp.send('Page.navigate', { url }, session);
    if (nav.errorText) {
      cdp.listeners.delete(listener);
      throw new Error(`Page not reachable: ${url} (${nav.errorText})`);
    }
    await loaded;
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline && (inflight > 0 || Date.now() - lastActivity < 500)) await sleep(100);
  }
  await cdp.send('Runtime.evaluate', { expression: 'document.fonts ? document.fonts.ready.then(() => true) : true', awaitPromise: true }, session);
  await sleep(opts.wait);

  for (const selector of opts.click) {
    const clicked = await cdp.send('Runtime.evaluate', {
      expression: `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true; })()`,
      returnByValue: true,
    }, session);
    if (!clicked.result.value) errors.push(`--click: no element for ${selector}`);
    await sleep(Math.max(300, opts.wait / 2));
  }

  const result = await cdp.send('Runtime.evaluate', { expression: measure, returnByValue: true, awaitPromise: true }, session);
  cdp.listeners.delete(listener);
  if (result.exceptionDetails) {
    throw new Error(`measure.js failed: ${result.exceptionDetails.exception?.description || result.exceptionDetails.text}`);
  }

  const fold = await cdp.send('Page.captureScreenshot', { format: 'png' }, session);
  const full = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }, session);
  const foldPath = join(outDir, `w${width}.png`);
  const fullPath = join(outDir, `w${width}-full.png`);
  writeFileSync(foldPath, Buffer.from(fold.data, 'base64'));
  writeFileSync(fullPath, Buffer.from(full.data, 'base64'));
  return { ...result.result.value, errors, screenshots: { fold: foldPath, full: fullPath } };
}

function formatReport(reports, outDir) {
  const lines = [];
  const shown = new Set();
  const explained = new Set();
  for (const r of reports) {
    lines.push(`\n## ${r.viewport.width}px: ${r.counts.high} high, ${r.counts.med} med, ${r.counts.low} low (${r.scanned} elements)`);
    lines.push(`Screenshots: ${r.screenshots.fold} | ${r.screenshots.full}`);
    if (r.textLength < 40) lines.push(`WARNING: page almost empty (${r.textLength} characters). This result is worthless: the intended state was not reached. See --click and --before.`);
    if (r.errors.length) lines.push(`WARNING: ${r.errors.length} JS error(s), the rendering may be incomplete: ${[...new Set(r.errors)].slice(0, 3).join(' | ')}`);
    if (r.truncated) lines.push('WARNING: analysis limited to the first 6000 elements.');
    // A finding repeated across widths is written once, to stay readable
    let repeated = 0;
    for (const f of r.findings) {
      const fresh = f.examples.filter((ex) => !shown.has(`${f.rule}|${ex.where}|${ex.detail}`));
      repeated += f.examples.length - fresh.length;
      if (!fresh.length) continue;
      lines.push(`[${f.severity}] ${f.rule} x${f.count}${explained.has(f.rule) ? '' : `: ${f.fix}`}`);
      explained.add(f.rule);
      for (const ex of fresh) {
        shown.add(`${f.rule}|${ex.where}|${ex.detail}`);
        lines.push(`    - ${ex.where}: ${ex.detail}`);
      }
    }
    if (repeated) lines.push(`(+ ${repeated} findings already listed at another width)`);
    if (!r.findings.length) lines.push('No measurable finding. Look at the screenshots anyway: hierarchy cannot be measured.');
    const s = r.stats;
    lines.push(`System: ${s.spacing.distinct} spacing values (${s.spacing.offScaleShare}% off scale), top ${s.spacing.top.slice(0, 6).map(([v, n]) => `${v}px x${n}`).join(', ')}`);
    lines.push(`Declared type (not necessarily loaded): ${s.fontFamilies.map(([v]) => v).join(', ')} | sizes ${s.fontSizes.map(([v]) => v).sort((a, b) => a - b).join(', ')} | radii ${s.radii.map(([v]) => v).sort((a, b) => a - b).join(', ') || 'none'}`);
  }
  lines.push(`\nFull report: ${join(outDir, 'report.json')}`);
  return lines.join('\n');
}

async function attachedTarget(port) {
  const base = `http://127.0.0.1:${port}`;
  let targets;
  let version;
  try {
    version = await (await fetch(`${base}/json/version`)).json();
    targets = await (await fetch(`${base}/json/list`)).json();
  } catch {
    throw new Error(`Nothing listens on port ${port}. For Tauri on Windows, start the app with WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=${port}.`);
  }
  const page = targets.find((t) => t.type === 'page' && !t.url.startsWith('devtools:'));
  if (!page) throw new Error(`No open page on port ${port}.`);
  return { wsUrl: version.webSocketDebuggerUrl, targetId: page.id };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const url = opts.attach ? null : /^[a-z]+:\/\//i.test(opts.target) ? opts.target : pathToFileURL(resolve(opts.target)).href;
  const outDir = resolve(opts.out || mkdtempSync(join(tmpdir(), 'deslop-')));
  mkdirSync(outDir, { recursive: true });
  const measure = readFileSync(join(HERE, 'measure.js'), 'utf8');

  if (typeof WebSocket === 'undefined') throw new Error('sw deslop needs Node 22 or later (built-in WebSocket).');
  const attached = opts.attach ? await attachedTarget(opts.attach) : null;
  const profile = attached ? null : mkdtempSync(join(tmpdir(), 'deslop-profile-'));
  const { proc, endpoint } = attached ? {} : launch(findBrowser(), profile);
  try {
    const ws = new WebSocket(attached ? attached.wsUrl : await endpoint);
    await new Promise((ok, fail) => {
      ws.addEventListener('open', ok, { once: true });
      ws.addEventListener('error', () => fail(new Error('Could not connect over CDP.')), { once: true });
    });
    const cdp = new Cdp(ws);
    const targetId = attached ? attached.targetId : (await cdp.send('Target.createTarget', { url: 'about:blank' })).targetId;
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    for (const domain of ['Page', 'Runtime', 'Network']) await cdp.send(`${domain}.enable`, {}, sessionId);
    if (opts.dark) await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] }, sessionId);
    for (const before of opts.before) {
      const source = existsSync(before) ? readFileSync(before, 'utf8') : before;
      await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source }, sessionId);
    }

    const reports = [];
    for (const width of opts.widths) reports.push(await auditWidth(cdp, sessionId, opts, url, width, measure, outDir));
    if (attached) await cdp.send('Emulation.clearDeviceMetricsOverride', {}, sessionId);
    writeFileSync(join(outDir, 'report.json'), JSON.stringify(reports, null, 2));
    process.stdout.write(opts.json ? JSON.stringify(reports, null, 2) : `${formatReport(reports, outDir)}\n`);
    ws.close();
  } finally {
    if (proc) {
      proc.removeAllListeners('exit');
      proc.kill();
      await sleep(300);
      // The browser may still be writing its profile while it stops: a temporary folder left behind is harmless,
      // failing the whole audit after its report was written is not (seen in CI: ENOTEMPTY on Linux).
      try { rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 }); } catch { /* left in the temp folder */ }
    }
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
