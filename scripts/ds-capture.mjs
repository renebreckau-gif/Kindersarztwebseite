// Phase 05 design-system capture: screenshots + layout/accessibility checks via
// the Chrome DevTools Protocol. No dependencies (Node >= 22).
// Usage: start `next start -p 3100`, then: node scripts/ds-capture.mjs

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const BASE = process.env.LAB_URL ?? "http://localhost:3100";
const OUT = resolve("docs/reviews/phase-05");
const SHOTS = join(OUT, "screenshots");
const PORT = 9335;
const CHROME = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
mkdirSync(SHOTS, { recursive: true });
const profile = resolve(".lab-capture-profile");
rmSync(profile, { recursive: true, force: true });

const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "--no-first-run", "--hide-scrollbars", "about:blank"]);
for (let i = 0; i < 50; i++) {
  try {
    await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
    break;
  } catch {
    await sleep(200);
  }
}
const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0;
const pending = new Map();
const listeners = [];
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? rej(new Error(m.error.message)) : res(m.result);
  } else if (m.method) listeners.forEach((l) => l(m));
});
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const i = ++id;
    pending.set(i, { res, rej });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const waitFor = (method) => new Promise((res) => listeners.push((m) => m.method === method && res(m.params)));

await send("Page.enable");
await send("Network.enable");
await send("Network.setCacheDisabled", { cacheDisabled: true });

const VP = {
  "1920x1080": [1920, 1080, false],
  "1440x900": [1440, 900, false],
  "430x932": [430, 932, true],
  "390x844": [390, 844, true],
  "360x800": [360, 800, true],
};

const AUDIT = `(() => {
  const vw = document.documentElement.clientWidth, out = { overflowX: document.documentElement.scrollWidth > vw + 1 || innerWidth > vw + 1, offscreen: [], small: [], clipped: [], pageHeight: document.documentElement.scrollHeight, h1: document.querySelectorAll('h1').length };
  for (const el of document.querySelectorAll('a, button, label, input, h1, h2, h3, p, span')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    if (r.right > vw + 1 && !el.closest('[aria-hidden="true"]')) out.offscreen.push((el.textContent||'').trim().slice(0,40));
    if (el.matches('a, button, label') && !el.closest('p, li > span, td, dd') && (r.height < 44 || r.width < 44)) out.small.push((el.textContent||'').trim().slice(0,24) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    if (el.scrollWidth > el.clientWidth + 2 && ['hidden','clip'].includes(cs.overflowX)) out.clipped.push((el.textContent||'').trim().slice(0,30));
  }
  out.offscreen = [...new Set(out.offscreen)].slice(0, 8); out.small = [...new Set(out.small)].slice(0, 12); out.clipped = [...new Set(out.clipped)].slice(0, 8);
  return out;
})()`;

async function shot({ path, vp, file, reduced = false, textScale = 1, scrollTo, settle = 2500 }) {
  const [w, h, mobile] = VP[vp];
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile });
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: reduced ? "reduce" : "no-preference" }] });
  let js = 0;
  const l = (m) => {
    if (m.method === "Network.loadingFinished") js += m.params.encodedDataLength;
  };
  listeners.push(l);
  const load = waitFor("Page.loadEventFired");
  await send("Page.navigate", { url: BASE + path });
  await load;
  if (textScale !== 1) await send("Runtime.evaluate", { expression: `document.documentElement.style.fontSize='${textScale * 100}%'` });
  await sleep(settle);
  if (scrollTo) {
    await send("Runtime.evaluate", { expression: `document.documentElement.style.scrollBehavior='auto'; document.getElementById('${scrollTo}')?.scrollIntoView({block:'start', behavior:'instant'}); window.scrollBy({top: ${mobile ? -8 : -64}, behavior:'instant'});` });
    await sleep(900);
  }
  const audit = (await send("Runtime.evaluate", { expression: AUDIT, returnByValue: true })).result.value;
  const img = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(SHOTS, file), Buffer.from(img.data, "base64"));
  listeners.splice(listeners.indexOf(l), 1);
  return { file, transferKB: Math.round(js / 1024), ...audit };
}

const jobs = [];
for (const vp of Object.keys(VP)) jobs.push({ path: "/design-system", vp, file: `ds-top-${vp}.png` });
for (const st of ["open", "closed", "unknown", "special", "closure"]) {
  jobs.push({ path: `/design-system?puls=${st}`, vp: "390x844", file: `ds-puls-${st}-390x844.png`, scrollTo: "puls" });
}
for (const st of ["open", "closed", "unknown"]) jobs.push({ path: `/design-system?puls=${st}`, vp: "1440x900", file: `ds-puls-${st}-1440x900.png`, scrollTo: "puls" });
const sections = ["farbe", "typografie", "raster", "aktionen", "navigation", "inhalte", "mein-kind", "medien", "bewegung", "fokus", "material", "entdecken"];
for (const sec of sections) {
  jobs.push({ path: "/design-system", vp: "1440x900", file: `ds-${sec}-1440x900.png`, scrollTo: sec });
  jobs.push({ path: "/design-system", vp: "390x844", file: `ds-${sec}-390x844.png`, scrollTo: sec });
}
jobs.push({ path: "/design-system", vp: "390x844", file: "ds-text200-390x844.png", textScale: 2 });
jobs.push({ path: "/design-system", vp: "390x844", file: "ds-text200-puls-390x844.png", textScale: 2, scrollTo: "puls" });
jobs.push({ path: "/design-system", vp: "1440x900", file: "ds-text200-1440x900.png", textScale: 2 });
jobs.push({ path: "/design-system", vp: "360x800", file: "ds-typografie-360x800.png", scrollTo: "typografie" });
jobs.push({ path: "/design-system", vp: "390x844", file: "ds-reducedmotion-390x844.png", reduced: true });
jobs.push({ path: "/design-system", vp: "1440x900", file: "ds-reducedmotion-material-1440x900.png", reduced: true, scrollTo: "material" });
jobs.push({ path: "/design-system?3d=0", vp: "390x844", file: "ds-no3d-material-390x844.png", scrollTo: "material" });

const results = [];
for (const j of jobs) {
  const r = await shot(j);
  results.push(r);
  console.log(`${r.file.padEnd(40)} ${String(r.transferKB).padStart(5)}KB ovX=${r.overflowX} h=${r.pageHeight}${r.offscreen.length ? " OFF:" + r.offscreen.join("|") : ""}${r.small.length ? " SMALL:" + r.small.join("|") : ""}${r.clipped.length ? " CLIP:" + r.clipped.join("|") : ""}`);
}
writeFileSync(join(OUT, "metrics.json"), JSON.stringify({ capturedAt: new Date().toISOString(), results }, null, 2));
ws.close();
chrome.kill();
await sleep(400);
rmSync(profile, { recursive: true, force: true });
