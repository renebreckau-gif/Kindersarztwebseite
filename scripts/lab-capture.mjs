// Phase 02.5 lab capture: screenshots + lightweight measurements via the Chrome
// DevTools Protocol. No dependencies (Node >= 22 provides fetch and WebSocket).
//
// Usage: start the production server on :3100 (next start -p 3100), then
//   node scripts/lab-capture.mjs
// Output: docs/reviews/phase-02-5/screenshots/*.png and metrics.json

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const BASE = process.env.LAB_URL ?? "http://localhost:3100";
const OUT = resolve(process.env.LAB_OUT ?? "docs/reviews/phase-02-5");
const SHOTS = join(OUT, "screenshots");
const PORT = 9333;
const CHROME =
  process.env.CHROME ??
  ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);

mkdirSync(SHOTS, { recursive: true });
const profile = resolve(".lab-capture-profile");
rmSync(profile, { recursive: true, force: true });

const chrome = spawn(CHROME, [
  "--headless=new",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  "--no-first-run",
  "--hide-scrollbars",
  "--enable-unsafe-swiftshader",
  "--ignore-gpu-blocklist",
  "about:blank",
]);
chrome.stderr.on("data", () => {});

async function waitForChrome() {
  for (let i = 0; i < 50; i++) {
    try {
      return await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
    } catch {
      await sleep(200);
    }
  }
  throw new Error("Chrome did not start");
}

class Session {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.listeners = [];
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { res, rej } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
      } else if (msg.method) {
        for (const l of this.listeners) l(msg);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((res, rej) => this.pending.set(id, { res, rej }));
  }
  on(fn) {
    this.listeners.push(fn);
  }
  waitFor(method, timeout = 20000) {
    return new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error(`timeout ${method}`)), timeout);
      this.on((m) => {
        if (m.method === method) {
          clearTimeout(t);
          res(m.params);
        }
      });
    });
  }
}

async function openTab() {
  const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  return { s: new Session(ws), id: t.id, ws };
}

const VIEWPORTS = {
  "1920x1080": { width: 1920, height: 1080, mobile: false },
  "1440x900": { width: 1440, height: 900, mobile: false },
  "430x932": { width: 430, height: 932, mobile: true },
  "390x844": { width: 390, height: 844, mobile: true },
  "360x800": { width: 360, height: 800, mobile: true },
};

// Injected before page scripts: long tasks + frame timing.
const PROBE = `
  window.__lab = { long: 0, longCount: 0, frames: [] };
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) { __lab.long += e.duration; __lab.longCount++; } }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
`;

const AUDIT = `(() => {
  const vw = document.documentElement.clientWidth;
  const out = { overflowX: document.documentElement.scrollWidth > vw + 1 || innerWidth > vw + 1, clipped: [], smallTargets: [], h1: document.querySelectorAll('h1').length,
    lang: document.documentElement.lang, landmarks: { main: !!document.querySelector('main'), nav: document.querySelectorAll('nav').length },
    enhancement: [...document.querySelectorAll('[data-enhancement]')].map(e => e.dataset.enhancement),
    canvases: document.querySelectorAll('canvas').length, unnamed: 0, firstViewport: {} };
  for (const el of document.querySelectorAll('h1, a, button, label')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== 'visible') out.clipped.push((el.textContent||'').trim().slice(0,40));
    if (r.right > vw + 1) out.clipped.push('offscreen:' + (el.textContent||'').trim().slice(0,40));
    if ((el.matches('a, button, label')) && r.top < innerHeight && r.bottom > 0 && (r.height < 44 || r.width < 44)) {
      if (!el.closest('p, li > span')) out.smallTargets.push((el.textContent||'').trim().slice(0,30) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    }
    if (el.matches('a, button') && !(el.textContent||'').trim() && !el.getAttribute('aria-label')) out.unnamed++;
  }
  const inView = (sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; };
  out.firstViewport = {
    status: inView('#puls-title') ?? inView('#heute p'),
    action: inView('#heute a[href^="tel:"], #heute a[href="#notfall"]'),
    dockOrUtil: inView('nav[aria-label="Schnellzugriff"]'),
  };
  const h = document.querySelector('#puls-title'); if (h) { const cs = getComputedStyle(h); out.titleFont = cs.fontFamily.split(',')[0] + ' ' + cs.fontSize; }
  return out;
})()`;

async function capture(tabSession, url, vpName, file, opts = {}) {
  const s = tabSession;
  const vp = VIEWPORTS[vpName];
  await s.send("Emulation.setDeviceMetricsOverride", { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.mobile });
  await s.send("Emulation.setTouchEmulationEnabled", vp.mobile ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
  await s.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: opts.reducedMotion ? "reduce" : "no-preference" }] });
  await s.send("Emulation.setCPUThrottlingRate", { rate: opts.cpu ?? 1 });

  const scripts = new Map();
  let loaded = false;
  const listener = (m) => {
    if (m.method === "Network.responseReceived" && m.params.type === "Script") scripts.set(m.params.requestId, { url: m.params.response.url, bytes: 0, afterLoad: loaded });
    if (m.method === "Network.loadingFinished" && scripts.has(m.params.requestId)) scripts.get(m.params.requestId).bytes = m.params.encodedDataLength;
  };
  s.on(listener);
  const loadEv = s.waitFor("Page.loadEventFired", 30000);
  await s.send("Page.navigate", { url: BASE + url });
  await loadEv;
  loaded = true;
  if (opts.textScale) {
    // Approximates enlarged browser text: every rem-based size scales.
    await s.send("Runtime.evaluate", { expression: `document.documentElement.style.fontSize='${opts.textScale * 100}%'` });
  }
  await sleep(opts.settle ?? Number(process.env.LAB_SETTLE ?? 3500));

  const audit = (await s.send("Runtime.evaluate", { expression: AUDIT, returnByValue: true })).result.value;
  const lab = (await s.send("Runtime.evaluate", { expression: "window.__lab", returnByValue: true })).result.value;
  const shot = await s.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(SHOTS, file), Buffer.from(shot.data, "base64"));
  s.listeners = s.listeners.filter((l) => l !== listener);

  const all = [...scripts.values()];
  const kb = (arr) => Math.round(arr.reduce((a, b) => a + b.bytes, 0) / 102.4) / 10;
  return {
    url,
    viewport: vpName,
    file,
    jsInitialKB: kb(all.filter((x) => !x.afterLoad)),
    jsLazyKB: kb(all.filter((x) => x.afterLoad)),
    lazyChunks: all.filter((x) => x.afterLoad).map((x) => `${x.url.split("/").pop()} ${Math.round(x.bytes / 1024)}KB`),
    longTasksMs: Math.round(lab?.long ?? 0),
    longTaskCount: lab?.longCount ?? 0,
    ...audit,
  };
}

// Frame smoothness while the pointer sweeps across the page (desktop) or a touch drag (mobile).
async function interaction(s, url, vpName, cpu) {
  const vp = VIEWPORTS[vpName];
  await s.send("Emulation.setDeviceMetricsOverride", { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.mobile });
  await s.send("Emulation.setCPUThrottlingRate", { rate: cpu });
  const loadEv = s.waitFor("Page.loadEventFired", 30000);
  await s.send("Page.navigate", { url: BASE + url });
  await loadEv;
  await sleep(4000);
  await s.send("Runtime.evaluate", {
    expression: `window.__fr=[];(function f(t){__fr.push(t); if(__fr.length<2000) requestAnimationFrame(f);})(performance.now());`,
  });
  const y = Math.round(vp.height * 0.55);
  for (let i = 0; i <= 60; i++) {
    const x = Math.round(vp.width * (0.15 + (0.7 * i) / 60));
    await s.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, pointerType: "mouse" });
    await sleep(16);
  }
  await sleep(1500);
  const fr = (await s.send("Runtime.evaluate", { expression: "__fr", returnByValue: true })).result.value;
  const gaps = fr.slice(1).map((t, i) => t - fr[i]).sort((a, b) => a - b);
  const p = (q) => Math.round(gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * q))] * 10) / 10;
  const lab = (await s.send("Runtime.evaluate", { expression: "window.__lab", returnByValue: true })).result.value;
  return { url, viewport: vpName, cpuThrottle: cpu, frames: gaps.length, medianFrameMs: p(0.5), p95FrameMs: p(0.95), maxFrameMs: Math.round(gaps.at(-1) ?? 0), longTasksMs: Math.round(lab?.long ?? 0) };
}

const version = await waitForChrome();
const { s, ws } = await openTab();
await s.send("Page.enable");
await s.send("Network.enable");
await s.send("Network.setCacheDisabled", { cacheDisabled: true }); // measure real transfer per page
await s.send("Runtime.enable");
await s.send("Page.addScriptToEvaluateOnNewDocument", { source: PROBE });

const gl = await (async () => {
  await s.send("Page.navigate", { url: "about:blank" });
  await sleep(300);
  const r = await s.send("Runtime.evaluate", {
    expression: `(() => { const g = document.createElement('canvas').getContext('webgl'); if (!g) return 'none'; const e = g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; })()`,
    returnByValue: true,
  });
  return r.result.value;
})();

// Usage: node scripts/lab-capture.mjs [a b c final] — default: a b c
const only = process.argv.slice(2);
const PROTOS = only.length ? only : ["a", "b", "c"];
const results = [];
const QUICK = process.env.LAB_QUICK; // e.g. "1440x900,390x844": open state only, no metrics file
if (QUICK) {
  for (const p of PROTOS) for (const vp of QUICK.split(",")) results.push(await capture(s, `/lab/${p}${process.env.LAB_QUERY ?? ""}`, vp, `quick-${p}-${vp}.png`, { textScale: Number(process.env.LAB_TEXT) || undefined }));
  for (const r of results) console.log(r.file, JSON.stringify({ ovX: r.overflowX, fv: r.firstViewport, enh: r.enhancement, small: r.smallTargets, clip: r.clipped }));
  ws.close();
  chrome.kill();
  await sleep(500);
  rmSync(profile, { recursive: true, force: true });
  process.exit(0);
}
for (const p of PROTOS) {
  for (const vp of Object.keys(VIEWPORTS)) {
    results.push(await capture(s, `/lab/${p}`, vp, `${p}-open-${vp}.png`));
  }
  results.push(await capture(s, `/lab/${p}?status=unknown`, "390x844", `${p}-unknown-390x844.png`));
  results.push(await capture(s, `/lab/${p}?status=closed`, "390x844", `${p}-closed-390x844.png`));
  results.push(await capture(s, `/lab/${p}?pfad=mein-kind`, "1440x900", `${p}-meinkind-1440x900.png`));
  results.push(await capture(s, `/lab/${p}?pfad=mein-kind`, "390x844", `${p}-meinkind-390x844.png`));
  results.push(await capture(s, `/lab/${p}`, "390x844", `${p}-reducedmotion-390x844.png`, { reducedMotion: true }));
  results.push(await capture(s, `/lab/${p}`, "390x844", `${p}-cpu4x-390x844.png`, { cpu: 4, settle: 5000 }));
  results.push(await capture(s, `/lab/${p}`, "390x844", `${p}-text200-390x844.png`, { textScale: 2 }));
  results.push(await capture(s, `/lab/${p}`, "1440x900", `${p}-text200-1440x900.png`, { textScale: 2 }));
  if (p === "final") {
    results.push(await capture(s, `/lab/${p}?status=unknown`, "1440x900", `${p}-unknown-1440x900.png`));
    results.push(await capture(s, `/lab/${p}?status=special`, "390x844", `${p}-special-390x844.png`));
    results.push(await capture(s, `/lab/${p}?status=closure`, "390x844", `${p}-closure-390x844.png`));
    results.push(await capture(s, `/lab/${p}?pfad=praxis`, "1440x900", `${p}-praxis-1440x900.png`));
    results.push(await capture(s, `/lab/${p}?3d=0`, "1440x900", `${p}-no3d-1440x900.png`));
    results.push(await capture(s, `/lab/${p}?3d=0`, "390x844", `${p}-no3d-390x844.png`));
    results.push(await capture(s, `/lab/${p}`, "1440x900", `${p}-reducedmotion-1440x900.png`, { reducedMotion: true }));
  }
}
if (!only.length) results.push(await capture(s, `/lab`, "1440x900", `lab-index-1440x900.png`));

const smoothness = [];
for (const p of PROTOS) {
  smoothness.push(await interaction(s, `/lab/${p}`, "1440x900", 1));
  smoothness.push(await interaction(s, `/lab/${p}`, "390x844", 4));
}

writeFileSync(
  join(OUT, only.length ? `metrics-${only.join("-")}.json` : "metrics.json"),
  JSON.stringify({ capturedAt: new Date().toISOString(), browser: version.Browser, webglRenderer: gl, results, smoothness }, null, 2),
);
console.log(JSON.stringify({ browser: version.Browser, webglRenderer: gl }, null, 2));
for (const r of results)
  console.log(
    `${r.file.padEnd(32)} js0=${String(r.jsInitialKB).padStart(6)}KB lazy=${String(r.jsLazyKB).padStart(6)}KB long=${String(r.longTasksMs).padStart(4)}ms enh=${r.enhancement.join(",") || "-"} canv=${r.canvases} ovX=${r.overflowX} fv=${JSON.stringify(r.firstViewport)} small=${r.smallTargets.length}${r.clipped.length ? " CLIP:" + r.clipped.join("|") : ""}`,
  );
for (const m of smoothness) console.log(JSON.stringify(m));

ws.close();
chrome.kill();
await sleep(500);
rmSync(profile, { recursive: true, force: true });
