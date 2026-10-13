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

// ---------------------------------------------------------------- HOME
for (const vp of ["390x844", "768x1024", "1440x900"]) {
  await viewport(vp);
  await go("/lab/praxis-cockpit");
  await shot(`01-home-${vp}.png`);
}

// ---------------------------------------------------------------- TASK A at 390: early close → preview → success
await viewport("390x844");
await go("/lab/praxis-cockpit");
await click("Heute früher schließen", "a");
await shot("02-frueher-schliessen-form-390x844.png");
await click("Vorschau ansehen", "button");
await sleep(600);
await shot("03-frueher-schliessen-vorschau-390x844.png");
await click("Nachmittagssprechzeit heute entfallen lassen", "button");
await sleep(600);
await shot("04-frueher-schliessen-erfolg-390x844.png");

// ---------------------------------------------------------------- ERROR 1: second special time today (390)
await click("Zur Startseite", "a");
await shot("05-home-nach-aenderung-390x844.png");
await click("Heute früher schließen", "a");
await fill("Bis wann ist heute geöffnet?", "11:00");
await click("Vorschau ansehen", "button");
await sleep(600);
await shot("06-fehler-widerspruechliche-sonderzeiten-390x844.png");

// ---------------------------------------------------------------- TASK D: undo from home (390)
await click("Zurück", "button");
await click("Startseite", "a");
await click("Änderung zurücknehmen", "a");
await shot("07-ruecknahme-vorschau-390x844.png");
await click("Rücknahme bestätigen", "button");
await sleep(600);
await shot("08-ruecknahme-erfolg-390x844.png");

// ---------------------------------------------------------------- TASK C + ERROR 2: 25 December (390)
await go("/lab/praxis-cockpit/website");
await click("25. Dezember, 10:00", "button");
await shot("09-website-vorschau-25-dezember-390x844.png");
await go("/lab/praxis-cockpit");
await click("Prüfen", "a[href*='feiertag?datum=2026-12-25']");
await shot("10-fehler-feiertag-nicht-geklaert-390x844.png");

// ---------------------------------------------------------------- ERROR 3: replacement must be confirmed (390)
await viewport("390x844");
await go("/lab/praxis-cockpit/geschlossen");
await click("Ab sofort", "label");
await shot("15-fehler-vertretung-bestaetigen-390x844.png");

// ---------------------------------------------------------------- notice without end date (390)
await go("/lab/praxis-cockpit/hinweis");
await fill("Titel", "Neue Telefonzeiten (Test)");
await fill("Kurzer Hinweis", "Testtext für den Prototyp.");
await fill("Gültig bis", "");
await click("Vorschau ansehen", "button");
await shot("16-hinweis-ohne-enddatum-390x844.png");

// ---------------------------------------------------------------- history (1440)
await viewport("1440x900");
await go("/lab/praxis-cockpit/verlauf");
await shot("17-verlauf-1440x900.png");

// ---------------------------------------------------------------- Phase 09.1.1 alignment QA (390 + 1440)
async function websiteAt(date, time) {
  await click("Website-Vorschau", "nav a");
  await fill("Tag", date);
  await fill("Uhrzeit", time);
  await sleep(400);
}
for (const vp of ["390x844", "1440x900"]) {
  await viewport(vp);
  // 1 + 2: weekend holiday vs. weekday holiday (fresh state)
  await go("/lab/praxis-cockpit");
  await websiteAt("2026-10-31", "10:00");
  await shot(`20-wochenend-feiertag-31-oktober-${vp}.png`);
  await fill("Tag", "2026-12-25");
  await sleep(400);
  await shot(`21-werktag-feiertag-25-dezember-${vp}.png`);
  // 5: lunch-gap case (13:00) — form explanation and preview with exact button
  await click("Start", "nav a");
  await click("Heute früher schließen", "a");
  await fill("Bis wann ist heute geöffnet?", "13:00");
  await shot(`22-frueher-schliessen-13-uhr-hinweis-${vp}.png`);
  await click("Vorschau ansehen", "button");
  await sleep(600);
  await shot(`23-frueher-schliessen-13-uhr-vorschau-${vp}.png`);
  // 3 + 4: special-hours day (close at 15:00) — preview while open and while closed
  await click("Zurück", "button");
  await fill("Bis wann ist heute geöffnet?", "15:00");
  await click("Vorschau ansehen", "button");
  await sleep(600);
  await click("Heute um 15:00 Uhr schließen", "button");
  await sleep(600);
  await websiteAt("2026-10-13", "09:20");
  await shot(`24-sonderzeit-geoeffnet-${vp}.png`);
  await fill("Uhrzeit", "13:00");
  await sleep(400);
  await shot(`25-sonderzeit-geschlossen-mittag-${vp}.png`);
  await fill("Uhrzeit", "15:30");
  await sleep(400);
  await shot(`26-sonderzeit-nach-letzter-sprechzeit-${vp}.png`);
}
// 10:30 inside the morning block (390)
await viewport("390x844");
await go("/lab/praxis-cockpit/frueher-schliessen");
await fill("Bis wann ist heute geöffnet?", "10:30");
await click("Vorschau ansehen", "button");
await sleep(600);
await shot("27-frueher-schliessen-10-30-vorschau-390x844.png");

// ---------------------------------------------------------------- Phase 09.1.2: full staff journey
async function vacationTo(step3) {
  await click("Urlaub eintragen", "a");
  await fill("Von", "2026-10-19");
  await fill("Bis", "2026-10-23");
  return step3;
}
for (const vp of ["390x844", "768x1024", "1440x900"]) {
  await viewport(vp);
  // LOGIN (signed out first)
  await go("/lab/praxis-cockpit");
  await click("Abmelden", "button");
  await shot(`30-anmelden-${vp}.png`);
  if (vp === "390x844") {
    await fill("E-Mail-Adresse", "team@beispiel.test");
    await fill("Passwort", "falsch");
    await click("Anmelden", "button[type=submit]");
    await shot(`31-anmelden-fehler-${vp}.png`);
  }
  await click("Testzugang einsetzen", "button");
  await click("Anmelden", "button[type=submit]");
  await sleep(600);
  await shot(`32-cockpit-start-${vp}.png`);
  // URLAUB 19.–23. Oktober → Praxis Beispiel A
  await vacationTo();
  await shot(`33-urlaub-zeitraum-${vp}.png`);
  await click("Weiter", "button");
  await shot(`34-urlaub-text-${vp}.png`);
  await click("Weiter", "button");
  await click("Eine Vertretung für den ganzen Zeitraum", "label");
  await click("Praxis Beispiel C", "button");
  await shot(`35-urlaub-vertretung-auswahl-${vp}.png`);
  await click("Praxis Beispiel A", "label");
  await click("Vorschau ansehen", "button");
  await sleep(700);
  await shot(`36-urlaub-vorschau-${vp}.png`);
  await click("Vertretung anzeigen", "button");
  await shot(`37-urlaub-vorschau-vertretung-${vp}.png`);
  await click("Urlaub vom 19.–23. Oktober veröffentlichen", "button");
  await sleep(700);
  await shot(`38-urlaub-eingetragen-${vp}.png`);
  // PARENT VIEW
  await click("Ansicht für Eltern öffnen", "a");
  await shot(`39-elternansicht-urlaub-${vp}.png`);
  await click("Vertretung anzeigen", "button");
  await shot(`40-elternansicht-vertretung-${vp}.png`);
  // COCKPIT HOME → URLAUB ANSEHEN → LOGOUT
  await click("Zurück zum Cockpit", "a");
  await shot(`41-start-nach-urlaub-${vp}.png`);
  await click("Ansehen", "a[href*='/urlaub/']");
  await shot(`42-urlaub-detail-${vp}.png`);
  await click("Abmelden", "button");
  await shot(`43-abgemeldet-${vp}.png`, false);
  await click("Testzugang einsetzen", "button");
  await click("Anmelden", "button[type=submit]");
  await sleep(600);
}

// SPLIT: 19.–21. Praxis Beispiel A, 22.–23. Praxis Beispiel B
for (const vp of ["390x844", "1440x900"]) {
  await viewport(vp);
  await go("/lab/praxis-cockpit");
  await vacationTo();
  await click("Weiter", "button");
  await click("Weiter", "button");
  await click("Zeitraum aufteilen", "label");
  await choose("Vertretung", "vb-a", 0);
  await choose("Vertretung", "vb-b", 1);
  await shot(`44-aufgeteilt-eingabe-${vp}.png`);
  await click("Vorschau ansehen", "button");
  await sleep(700);
  await click("Urlaub vom 19.–23. Oktober veröffentlichen", "button");
  await sleep(700);
  await click("Ansicht für Eltern öffnen", "a");
  await click("Vertretung anzeigen", "button");
  await shot(`45-aufgeteilt-elternansicht-${vp}.png`);
}

// NO REPLACEMENT (390)
await viewport("390x844");
await go("/lab/praxis-cockpit");
await vacationTo();
await click("Weiter", "button");
await click("Weiter", "button");
await click("Keine Vertretung eintragen", "label");
await shot("46-keine-vertretung-hinweis-390x844.png");
await click("Vorschau ansehen", "button");
await sleep(700);
await click("Notfall-Hinweise", "button");
await shot("47-keine-vertretung-vorschau-390x844.png");

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
