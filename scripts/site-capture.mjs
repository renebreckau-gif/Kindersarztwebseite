// Phase 07 site capture (derived from lab-capture.mjs): screenshots + lightweight measurements via the Chrome
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
const OUT = resolve(process.env.LAB_OUT ?? "docs/reviews/phase-07");
const SHOTS = join(OUT, "screenshots");
const PORT = 9334;
const CHROME =
  process.env.CHROME ??
  ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);

mkdirSync(SHOTS, { recursive: true });
const profile = resolve(".site-capture-profile");
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
    status: inView('#puls-title') ?? inView('#heute p') ?? inView('[data-indicator]') ?? inView('main a[href^="tel:"]'),
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
  const assets = new Map();
  let loaded = false;
  const listener = (m) => {
    if (m.method === "Network.responseReceived" && m.params.type === "Script") scripts.set(m.params.requestId, { url: m.params.response.url, bytes: 0, afterLoad: loaded });
    if (m.method === "Network.responseReceived" && ["Image", "Font", "Stylesheet"].includes(m.params.type)) assets.set(m.params.requestId, { type: m.params.type, url: m.params.response.url, bytes: 0 });
    if (m.method === "Network.loadingFinished" && assets.has(m.params.requestId)) assets.get(m.params.requestId).bytes = m.params.encodedDataLength;
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
  if (opts.scrollY) {
    await s.send("Runtime.evaluate", { expression: `window.scrollTo({ top: ${opts.scrollY}, behavior: "instant" })` });
    await sleep(400);
  }
  if (opts.openMenu) {
    await s.send("Runtime.evaluate", { expression: `document.querySelector('nav[aria-label="Schnellzugriff"] button').click()` });
    await sleep(600);
  }

  const audit = (await s.send("Runtime.evaluate", { expression: AUDIT, returnByValue: true })).result.value;
  const lab = (await s.send("Runtime.evaluate", { expression: "window.__lab", returnByValue: true })).result.value;
  let clip;
  if (opts.clipSelector) {
    const r = (await s.send("Runtime.evaluate", { expression: `(() => { const r = document.querySelector('${opts.clipSelector}').getBoundingClientRect(); return { x: r.x, y: r.y + scrollY, width: r.width, height: r.height, scale: 2 }; })()`, returnByValue: true })).result.value;
    clip = r;
  }
  if (opts.fullPage) {
    const h = (await s.send("Runtime.evaluate", { expression: "document.documentElement.scrollHeight", returnByValue: true })).result.value;
    clip = { x: 0, y: 0, width: vp.width, height: Math.min(h, 16000), scale: opts.scale ?? 1 };
  }
  const shot = await s.send("Page.captureScreenshot", clip ? { format: opts.fullPage ? "jpeg" : "png", quality: 80, clip, captureBeyondViewport: true } : { format: "png" });
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
    assetKB: Object.fromEntries(["Image", "Font", "Stylesheet"].map((ty) => [ty, kb([...assets.values()].filter((x) => x.type === ty))])),
    images: [...assets.values()].filter((x) => x.type === "Image").map((x) => `${x.url.split("/").pop()} ${Math.round(x.bytes / 1024)}KB`),
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


// ---------------------------------------------------------------- Phase 07 runs
// Usage: node scripts/site-capture.mjs  (env SITE_QUICK="path@vp,path@vp" for a quick subset)
const P = process.env.SITE_PREVIEW ?? "vorschau=freigabe";
const OPEN = `?${P}&zeit=2026-10-06T09:30`;
const CLOSED = `?${P}&zeit=2026-10-06T19:30`;
const PAGES = ["/heute", "/heute/sprechzeiten", "/notfall", "/mein-kind", "/mein-kind/3-6-jahre", "/mein-kind/vorsorge", "/mein-kind/impfungen", "/praxis", "/praxis/aerztinnen", "/praxis/neu-bei-uns", "/praxis/kontakt", "/praxis/leistungen", "/entdecken", "/heute/aktuelles"];
const name = (p, q = "") => (p === "/" ? "home" : p.slice(1).replace(/\//g, "_")) + (q ? "-" + q : "");
const results = [];
if (process.env.SITE_QUICK) {
  for (const item of process.env.SITE_QUICK.split(",")) {
    const [path, vp, flag = ""] = item.split("@");
    const full = flag === "full";
    const menu = flag === "menu";
    const reducedMotion = flag === "reduced";
    const scrollY = flag.startsWith("scroll") ? Number(flag.slice(6)) : 0;
    const q = path.includes("vorschau=") ? "vorschau" : "";
    const suffix = full ? "-full" : menu ? "-menu" : reducedMotion ? "-reducedmotion" : scrollY ? `-y${scrollY}` : "";
    results.push(await capture(s, path, vp, `quick-${name(path.split("?")[0], q)}-${vp}${suffix}.${full ? "jpg" : "png"}`, { fullPage: full, openMenu: menu, scrollY, reducedMotion }));
  }
} else {
  // home: full-page scroll + states
  for (const vp of ["1440x900", "390x844"]) results.push(await capture(s, "/", vp, `home-full-${vp}.jpg`, { fullPage: true }));
  for (const vp of ["1440x900", "1920x1080", "390x844", "360x800", "430x932"]) results.push(await capture(s, "/", vp, `home-${vp}.png`));
  results.push(await capture(s, "/" + OPEN, "1440x900", `home-open-1440x900.png`));
  results.push(await capture(s, "/" + CLOSED, "390x844", `home-closed-390x844.png`));
  results.push(await capture(s, "/", "390x844", `home-reducedmotion-390x844.png`, { reducedMotion: true }));
  results.push(await capture(s, "/", "390x844", `home-text200-390x844.png`, { textScale: 2 }));
  // pages
  for (const p of PAGES) {
    results.push(await capture(s, p, "1440x900", `${name(p)}-1440x900.jpg`, { fullPage: true, scale: 0.5 }));
    results.push(await capture(s, p, "390x844", `${name(p)}-390x844.png`));
  }
  for (const p of ["/heute", "/notfall", "/praxis/kontakt", "/mein-kind"]) {
    results.push(await capture(s, p, "360x800", `${name(p)}-360x800.png`));
    results.push(await capture(s, p, "430x932", `${name(p)}-430x932.png`));
    results.push(await capture(s, p, "390x844", `${name(p)}-text200-390x844.png`, { textScale: 2 }));
  }
  results.push(await capture(s, "/heute" + OPEN, "1440x900", `heute-open-1440x900.png`));
  results.push(await capture(s, "/heute" + CLOSED, "390x844", `heute-closed-390x844.png`));
  results.push(await capture(s, "/heute", "390x844", `heute-unknown-390x844.png`));
  results.push(await capture(s, "/praxis/aerztinnen?" + P, "1440x900", `praxis_aerztinnen-vorschau-1440x900.png`));
  results.push(await capture(s, "/mein-kind/0-2-jahre", "390x844", `mein-kind_0-2-jahre-390x844.png`));
  results.push(await capture(s, "/mein-kind/13-17-jahre", "1440x900", `mein-kind_13-17-jahre-1440x900.png`));
  results.push(await capture(s, "/impressum", "390x844", `impressum-390x844.png`));
}
const smoothness = process.env.SITE_QUICK ? [] : [await interaction(s, "/", "1440x900", 1), await interaction(s, "/heute", "390x844", 4)];
if (!process.env.SITE_QUICK) writeFileSync(join(OUT, "metrics-site.json"), JSON.stringify({ capturedAt: new Date().toISOString(), browser: version.Browser, results, smoothness }, null, 2));
for (const r of results)
  console.log(`${r.file.padEnd(44)} js=${String(r.jsInitialKB).padStart(6)}KB img=${String(r.assetKB.Image).padStart(6)}KB ovX=${r.overflowX} fv=${JSON.stringify(r.firstViewport)} small=${r.smallTargets.length}${r.smallTargets.length ? " " + r.smallTargets.join("|") : ""}${r.clipped.length ? " CLIP:" + r.clipped.join("|") : ""}`);
for (const m of smoothness) console.log(JSON.stringify(m));
ws.close();
chrome.kill();
await sleep(500);
rmSync(profile, { recursive: true, force: true });
