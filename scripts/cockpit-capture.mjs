// Phase 09.1 Praxis Cockpit prototype: click through the usability tasks in headless Chrome
// (CDP, no dependencies) and save review screenshots + a small audit per viewport.
// Usage: production server on :3100, then `node scripts/cockpit-capture.mjs`.
// Output: docs/reviews/praxis-cockpit-prototype/screenshots/*.png and audit.json

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const BASE = process.env.LAB_URL ?? "http://localhost:3100";
const OUT = resolve(process.env.LAB_OUT ?? "docs/reviews/praxis-cockpit-prototype");
const SHOTS = join(OUT, "screenshots");
const PORT = 9335;
const CHROME = process.env.CHROME ?? ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);

mkdirSync(SHOTS, { recursive: true });
const profile = resolve(".cockpit-capture-profile");
rmSync(profile, { recursive: true, force: true });
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "--no-first-run", "--hide-scrollbars", "about:blank"]);
chrome.stderr.on("data", () => {});

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
let seq = 0;
const pending = new Map();
const events = [];
ws.addEventListener("message", (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? rej(new Error(m.error.message)) : res(m.result);
  } else if (m.method) events.push(m);
});
const send = (method, params = {}) => {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((res, rej) => pending.set(id, { res, rej }));
};
await send("Page.enable");
await send("Runtime.enable");

const evalJs = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(`${expression.slice(0, 80)} → ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
  return r.result.value;
};

const VP = { "390x844": [390, 844, true], "768x1024": [768, 1024, true], "1440x900": [1440, 900, false] };
async function viewport(name) {
  const [width, height, mobile] = VP[name];
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
}
async function go(path) {
  events.length = 0;
  await send("Page.navigate", { url: BASE + path });
  for (let i = 0; i < 100 && !events.some((e) => e.method === "Page.loadEventFired"); i++) await sleep(100);
  await sleep(900);
}
/** Click a link/button whose visible text contains `text` (client-side navigation keeps prototype state). */
async function click(text, sel = "a, button, label") {
  const ok = await evalJs(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(sel)})].find(e => e.textContent.replace(/\\s+/g,' ').includes(${JSON.stringify(text)})); if (!el) return false; el.scrollIntoView({block:'center'}); el.click(); return true; })()`);
  if (!ok) throw new Error(`not found: ${text}`);
  await sleep(1100);
}
/** Set a controlled input by its label text. */
async function fill(label, value, nth = 0) {
  const ok = await evalJs(`(() => {
    const labels = [...document.querySelectorAll('label')].filter(l => l.textContent.trim().startsWith(${JSON.stringify(label)}));
    const l = labels[${nth}]; if (!l) return false;
    const el = document.getElementById(l.htmlFor); if (!el) return false;
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true; })()`);
  if (!ok) throw new Error(`no field: ${label}`);
  await sleep(150);
}
/** Choose an option of a <select> by its label (nth occurrence). */
async function choose(label, value, nth = 0) {
  const ok = await evalJs(`(() => {
    const l = [...document.querySelectorAll('label')].filter(l => l.textContent.trim().startsWith(${JSON.stringify(label)}))[${nth}];
    const el = l && document.getElementById(l.htmlFor); if (!el || el.tagName !== 'SELECT') return false;
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return true; })()`);
  if (!ok) throw new Error(`no select: ${label}`);
  await sleep(150);
}
async function login() {
  await go("/lab/praxis-cockpit/anmelden");
  await fill("E-Mail-Adresse", "team@beispiel.test");
  await fill("Passwort", "test1234");
  await click("Anmelden", "button[type=submit]");
  await sleep(700);
}

async function shot(file, full = true) {
  await evalJs("window.scrollTo(0,0)");
  await sleep(200);
  const params = { format: "png", captureBeyondViewport: full };
  if (full) {
    const { cssContentSize } = await send("Page.getLayoutMetrics");
    params.clip = { x: 0, y: 0, width: cssContentSize.width, height: Math.min(cssContentSize.height, 6000), scale: 1 };
  }
  const { data } = await send("Page.captureScreenshot", params);
  writeFileSync(join(SHOTS, file), Buffer.from(data, "base64"));
  console.log("shot", file);
}

const AUDIT = `(() => {
  const vw = document.documentElement.clientWidth;
  const out = { overflowX: document.documentElement.scrollWidth > vw + 1, h1: document.querySelectorAll('h1').length, smallTargets: [], unlabeled: [], unnamed: 0 };
  for (const el of document.querySelectorAll('a, button, summary, input, select, textarea')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const inline = el.matches('input[type=radio], input[type=checkbox]');
    if (!inline && (r.height < 44 || r.width < 44) && !el.classList.contains('skip-link')) out.smallTargets.push((el.textContent || el.type || '').trim().slice(0, 30) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    if (el.matches('input, select, textarea') && !(el.labels && el.labels.length) && !el.getAttribute('aria-label')) out.unlabeled.push(el.type);
    if (el.matches('a, button') && !(el.textContent || '').trim() && !el.getAttribute('aria-label')) out.unnamed++;
  }
  return out;
})()`;

const audit = {};
async function check(key) {
  audit[key] = await evalJs(AUDIT);
}

// ---------------------------------------------------------------- responsive audit of every screen
await viewport("390x844");
await login();
const ROUTES = ["/anmelden", "/elternansicht", "", "/frueher-schliessen", "/geschlossen", "/akutsprechstunde", "/urlaub", "/hinweis", "/website", "/verlauf", "/feiertag?datum=2026-12-25"];
for (const vp of Object.keys(VP)) {
  await viewport(vp);
  for (const r of ROUTES) {
    await go(`/lab/praxis-cockpit${r}`);
    await check(`${vp} ${r || "/"}`);
  }
}

// ---------------------------------------------------------------- Phase 09.1.3 review set
// Pattern: EDIT → LIVE WEBSITE PREVIEW → PUBLISH → AUTO-EXPIRE → NORMAL RULES RESUME.
const ALL = ["390x844", "768x1024", "1440x900"];

// HOME
for (const vp of ALL) {
  await viewport(vp);
  await go("/lab/praxis-cockpit");
  await shot(`01-start-${vp}.png`);
}

// A/B: Heute früher schließen — edit left, Website-Vorschau right (desktop) / stacked (mobile)
for (const vp of ALL) {
  await viewport(vp);
  await go("/lab/praxis-cockpit/frueher-schliessen");
  await sleep(1100); // settled live preview
  await shot(`02-frueher-schliessen-13-uhr-${vp}.png`);
  await fill("Bis wann ist heute geöffnet?", "15:00");
  await sleep(1100);
  await shot(`03-frueher-schliessen-15-uhr-${vp}.png`);
}

// Heute geschlossen (ab sofort, Krankheit, Praxis Beispiel A)
for (const vp of ALL) {
  await viewport(vp);
  await go("/lab/praxis-cockpit/geschlossen");
  await click("Ab sofort", "label");
  await click("Krankheit", "label");
  await click("Praxis Beispiel A", "label");
  await shot(`04-heute-geschlossen-${vp}.png`);
}

// C/E: Urlaub with one replacement
async function vacationForm() {
  await go("/lab/praxis-cockpit/urlaub");
  await fill("Von", "2026-10-19");
  await fill("Bis", "2026-10-23");
}
for (const vp of ALL) {
  await viewport(vp);
  await vacationForm();
  await click("Eine Vertretung für den ganzen Zeitraum", "label");
  await click("Praxis Beispiel A", "label");
  await sleep(600);
  await shot(`05-urlaub-eine-vertretung-${vp}.png`);
}

// D: split replacement plan
for (const vp of ["390x844", "1440x900"]) {
  await viewport(vp);
  await vacationForm();
  await click("Zeitraum aufteilen", "label");
  await choose("Vertretung", "vb-a", 0);
  await choose("Vertretung", "vb-b", 1);
  await sleep(600);
  await shot(`06-urlaub-aufgeteilt-${vp}.png`);
}

// Hinweis with automatic end
for (const vp of ALL) {
  await viewport(vp);
  await go("/lab/praxis-cockpit/hinweis");
  await fill("Titel", "Neue Telefonzeiten (Test)");
  await fill("Kurzer Hinweis", "Testtext für den Prototyp.");
  await sleep(600);
  await shot(`07-hinweis-${vp}.png`);
}

// Publish the vacation, then F–I: advance the lab test clock (Testmodus) — no manual cleanup
await viewport("1440x900");
await vacationForm();
await click("Eine Vertretung für den ganzen Zeitraum", "label");
await click("Praxis Beispiel A", "label");
await click("Urlaub vom 19.–23. Oktober veröffentlichen", "button");
await sleep(800);
await shot("08-urlaub-veroeffentlicht-1440x900.png");
await click("Zur Cockpit-Startseite", "a");
await click("Testmodus", "summary");
const STEPS = [
  ["18.10. vor dem Urlaub", "09-vor-dem-urlaub-18-10"],
  ["20.10. im Urlaub", "10-im-urlaub-20-10"],
  ["23.10. letzter Urlaubstag", "11-letzter-urlaubstag-23-10"],
  ["24.10. erster Tag danach", "12-erster-tag-danach-24-10"],
  ["26.10. Montag", "13-naechster-montag-26-10"],
];
for (const [chip, name] of STEPS) {
  await click(chip, "button");
  await click("Start", "nav a");
  await shot(`${name}-start-1440x900.png`);
  await click("Website-Vorschau", "nav a");
  await shot(`${name}-website-vorschau-1440x900.png`);
}
await click("Verlauf", "nav a");
await shot("14-verlauf-nach-ablauf-1440x900.png");

// Conflict shown live in the preview (390): publish an early close, then try another one
await viewport("390x844");
await go("/lab/praxis-cockpit/frueher-schliessen");
await fill("Bis wann ist heute geöffnet?", "11:00");
await sleep(400);
await click("Heute um 11:00 Uhr schließen", "button");
await sleep(700);
await shot("15-frueher-schliessen-veroeffentlicht-390x844.png");
await click("Startseite", "a");
await click("Heute früher schließen", "a");
await shot("16-bestehende-aenderung-erkannt-390x844.png");
// Undo from home
await click("Startseite", "a");
await click("Änderung zurücknehmen", "a");
await shot("17-ruecknahme-390x844.png");

// Login + website preview for 25 December (390)
await go("/lab/praxis-cockpit/website");
await click("25. Dezember, 10:00", "button");
await shot("18-website-vorschau-25-dezember-390x844.png");
await go("/lab/praxis-cockpit");
await click("Abmelden", "button");
await shot("19-anmelden-390x844.png");
await login();

// ---------------------------------------------------------------- Phase 09.1.4: existing-change editing
async function scenario(key) {
  await evalJs(`(() => { const d = document.querySelector('footer details'); if (d) d.open = true; })()`);
  await click(`Szenario ${key}`, "button");
}
for (const vp of ALL) {
  await viewport(vp);
  // A: existing special hours → notice → edit 15:00 → 13:00
  await go("/lab/praxis-cockpit");
  await scenario("A");
  await click("Heute früher schließen", "a");
  await shot(`20-bestehende-aenderung-hinweis-${vp}.png`);
  await click("Bestehende Änderung anpassen", "button");
  await fill("Bis wann ist heute geöffnet?", "13:00");
  await sleep(1100);
  await shot(`21-bestehende-aenderung-anpassen-${vp}.png`);
  // F: publish the edit, then undo the latest edit (restores version 1)
  await click("Nachmittagssprechzeit heute entfallen lassen", "button");
  await sleep(700);
  await click("Änderung zurücknehmen", "a");
  await shot(`22-ruecknahme-version-${vp}.png`);
  await click("Rücknahme bestätigen", "button");
  await sleep(700);
  await shot(`23-ruecknahme-erfolg-${vp}.png`);

  // B + C: existing vacation → edit → extend to 26.10. → replacement warning
  await go("/lab/praxis-cockpit");
  await scenario("B");
  await click("Urlaub eintragen", "a");
  await fill("Von", "2026-10-22");
  await fill("Bis", "2026-10-26");
  await sleep(500);
  await shot(`24-urlaub-ueberschneidung-hinweis-${vp}.png`);
  await click("Bestehenden Urlaub bearbeiten", "a");
  await fill("Bis", "2026-10-26");
  await sleep(1100);
  await shot(`25-urlaub-bearbeiten-verlaengert-${vp}.png`);
  await click("Neu im Urlaub", "button");
  await sleep(600);
  await shot(`26-urlaub-vertretungswarnung-${vp}.png`);

  // D: existing announcement → edit → extend to Monday
  await go("/lab/praxis-cockpit");
  await scenario("C");
  await click("Hinweis bearbeiten", "a[href*='szenario-c']");
  await fill("Gültig bis", "2026-10-19");
  await sleep(1100);
  await shot(`27-hinweis-bearbeiten-${vp}.png`);

  // E: true conflict — vacation over an independent special opening
  await go("/lab/praxis-cockpit");
  await scenario("D");
  await click("Urlaub eintragen", "a");
  await fill("Von", "2026-10-19");
  await fill("Bis", "2026-10-23");
  await click("Keine Vertretung eintragen", "label");
  await sleep(1100);
  await shot(`28-echter-widerspruch-${vp}.png`);
}

writeFileSync(join(OUT, "audit.json"), JSON.stringify(audit, null, 2));
const issues = Object.entries(audit).filter(([, a]) => a.overflowX || a.smallTargets.length || a.unlabeled.length || a.unnamed || a.h1 !== 1);
console.log(issues.length ? JSON.stringify(Object.fromEntries(issues), null, 1) : "audit: no overflow, no small targets, all fields labelled, one h1 per screen");
ws.close();
chrome.kill();
await sleep(800);
try {
  rmSync(profile, { recursive: true, force: true });
} catch {
  // Chrome may still hold the profile on Windows; it is git-ignored and removed on the next run.
}
