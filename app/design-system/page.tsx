import Link from "next/link";
import s from "./page.module.css";
import { DEMO_PULS, PULS_ORDER, STATE_NAMES, parseDemoState } from "@/design-system/demo-fixtures";
import { Action, DemoTag, PulsChip, PulsHero, PulsInline, StatusMark, TextLink } from "@/design-system/components/primitives";
import { MenuSheetMock, MobileDock, SiteFooter, SiteHeader, SkipLink } from "@/design-system/components/navigation";
import { EmergencyBlock, HelpTopicList, InfoBlock, Measure, Notice, PersonCard, SectionIntro, SourceNote } from "@/design-system/components/content";
import { AgeScale, DayRuler } from "@/design-system/components/instruments";
import { MediaFrame } from "@/design-system/components/media";
import { MaterialStage } from "@/design-system/components/material-stage";
import { Icon } from "@/design-system/icons";

type Search = Promise<Record<string, string | string[] | undefined>>;

const CHAPTERS = [
  ["puls", "Praxis Puls"],
  ["farbe", "Farbe"],
  ["typografie", "Typografie"],
  ["raster", "Raster und Abstand"],
  ["aktionen", "Aktionen und Links"],
  ["navigation", "Navigation"],
  ["inhalte", "Inhalte"],
  ["mein-kind", "Alter und Zeit"],
  ["medien", "Medien und Platzhalter"],
  ["bewegung", "Bewegung"],
  ["fokus", "Fokus und Barrierefreiheit"],
  ["material", "3D-Material"],
  ["entdecken", "Entdecken-Modus"],
] as const;

const COLORS = [
  { token: "--color-canvas", name: "Papier", hex: "#F3EFE7", role: "Fläche, Ruhe", ratio: "", dark: false },
  { token: "--color-text", name: "Tinte", hex: "#171A1D", role: "Text, Struktur, Primäraktion", ratio: "15,2 : 1", dark: true },
  { token: "--color-brand", name: "Kobalt", hex: "#4A5CFF", role: "Marke, Auswahl, Fokus — nie Status", ratio: "4,3 : 1 (Grafik, große Schrift)", dark: true },
  { token: "--color-brand-text", name: "Kobalt Text", hex: "#3446E8", role: "Links, kleine Markenschrift", ratio: "5,8 : 1", dark: true },
  { token: "--color-accent-human", name: "Koralle", hex: "#F28B74", role: "Menschliche Wärme, „jetzt“-Markierung", ratio: "nie Text", dark: false },
  { token: "--color-accent-discovery", name: "Gelb", hex: "#F1CF68", role: "Entdecken, Wachstum", ratio: "nie Text", dark: false },
  { token: "--color-accent-explore", name: "Flieder", hex: "#D8CFF1", role: "Lernen, Neugier", ratio: "nie Text", dark: false },
  { token: "--color-status-open", name: "Status Grün", hex: "#3E9B72", role: "Nur: geöffnet (Punkt)", ratio: "Punkt + Wort", dark: true },
  { token: "--color-emergency-text", name: "Notfall Rot", hex: "#A82B25", role: "Nur: Notfall", ratio: "6,0 : 1", dark: true },
];

const TYPE = [
  { role: "Display XL", token: "--text-display-xl", sample: "Gesund groß werden.", cls: "tDisplayXl", spec: "Newsreader 400 · 44–128 px · 0,96 · −0,03 em" },
  { role: "Display L", token: "--text-display-l", sample: "Praxis geöffnet", cls: "tDisplayL", spec: "Newsreader 400 · 38–84 px · 0,96 · −0,03 em" },
  { role: "H1", token: "--text-h1", sample: "Wobei können wir helfen?", cls: "tH1", spec: "Newsreader 400 · 32–56 px · 1,1" },
  { role: "H2", token: "--text-h2", sample: "Aktuelle Sprechzeiten", cls: "tH2", spec: "Newsreader 400 · 26–40 px · 1,1" },
  { role: "H3", token: "--text-h3", sample: "Vorsorgeuntersuchung", cls: "tH3", spec: "Newsreader 400 · 19–22 px · 1,25" },
  { role: "Body Large", token: "--text-body-l", sample: "Wir begleiten Kinder und Jugendliche vom ersten Lebenstag bis zum Erwachsenwerden.", cls: "tBodyL", spec: "Newsreader 400 · 19–23 px · 1,45" },
  { role: "Body", token: "--text-body", sample: "Ob wir heute kranke Kinder ohne Termin sehen können, erfahren Sie telefonisch.", cls: "tBody", spec: "Instrument Sans 400 · 17 px · 1,55" },
  { role: "Small", token: "--text-small", sample: "Kinder- und Jugendmedizin, Naturheilverfahren", cls: "tSmall", spec: "Instrument Sans 400 · 15 px · 1,45" },
  { role: "Label", token: "--text-label", sample: "Gültig bis 18.10.2026", cls: "tLabel", spec: "Instrument Sans 600 · 13 px · +0,015 em" },
  { role: "Utility", token: "--text-small", sample: "Anrufen 0000 123456", cls: "tUtility", spec: "Instrument Sans 500 · 15 px · Ziffern tabellarisch" },
  { role: "Status", token: "--text-status", sample: "Geöffnet bis 12:00", cls: "tStatus", spec: "Instrument Sans 600 · 17–19 px · tabellarisch" },
  { role: "Caption", token: "--text-caption", sample: "Stand: 07.10.2026 · Quelle: Praxis", cls: "tCaption", spec: "Instrument Sans 400 · 13 px · 1,4" },
  { role: "Action", token: "--text-action", sample: "Nächste Sprechzeit ansehen", cls: "tAction", spec: "Instrument Sans 600 · 17 px · 1,2" },
];

const STRESS = [
  "Kinderarztpraxis Probst & Böhme",
  "Gesund groß werden.",
  "Praxis geöffnet",
  "Heute geschlossen",
  "Aktuelle Sprechzeiten",
  "Akutsprechstunde",
  "Vertretungspraxis",
  "Vorsorgeuntersuchung",
  "Kinder- und Jugendmedizin",
  "Wobei können wir helfen?",
  "Nächste Sprechzeit ansehen",
];

const SPACES = [
  ["--space-2", 4],
  ["--space-3", 8],
  ["--space-4", 12],
  ["--space-5", 16],
  ["--space-6", 24],
  ["--space-7", 32],
  ["--space-8", 48],
  ["--space-9", 64],
  ["--space-10", 96],
  ["--space-11", 128],
] as const;

const MOTION = [
  ["Drücken", "--duration-instant", "90 ms", "standard", "Taste sinkt 2–3 px ein"],
  ["Hover / Fokus", "--duration-quick", "160 ms", "standard", "Unterstreichung, Fläche"],
  ["Statuswechsel", "--duration-state", "260 ms", "out", "Überblenden + 6 px"],
  ["Navigation / Menü", "--duration-nav", "360 ms", "out", "Blatt gleitet ein"],
  ["Inhalt erscheint", "--duration-reveal", "520 ms", "out", "einmal pro Seite"],
  ["Objekt-Reaktion", "Feder", "0,6–1,2 s", "physical", "schwingt aus, kommt zur Ruhe"],
  ["Große Verwandlung", "--duration-transform", "720 ms", "physical", "Mobile → Messinstrument"],
];

export default async function DesignSystemPage({ searchParams }: { searchParams: Search }) {
  const q = await searchParams;
  const state = parseDemoState(q.puls);
  const puls = DEMO_PULS[state];
  const no3d = q["3d"] === "0";

  return (
    <>
      <SkipLink />
      <SiteHeader puls={puls} />
      {/* Phase 03: dock early in DOM order (visually fixed bottom) so screen readers reach it first */}
      <MobileDock puls={puls} />
      <main id="inhalt" className={s.page}>
        {/* ================= opening ================= */}
        <section className={s.opening} id="top" aria-labelledby="ds-title">
          <div className={s.openingText}>
            <p className={s.kicker}>Designsystem, interne Referenz</p>
            <h1 id="ds-title" className={s.openingTitle}>
              <span>Gesund</span> <span>groß</span> <span>werden.</span>
            </h1>
            <Measure marks={["0", "3", "7", "13", "17 Jahre"]} />
            <p className={s.openingLede}>
              Warm Editorial + Kobalt: eine Sprache für Orientierung, Vertrauen und Neugier. Ruhig genug für eine
              besorgte Mutter um sieben Uhr morgens, eigen genug, dass man sich an sie erinnert.
            </p>
            <p className={s.openingNote}>
              <DemoTag>Demo-Daten</DemoTag> Alle Namen, Zeiten und Nummern auf dieser Seite sind erfunden.
            </p>
          </div>
          <nav className={s.toc} aria-label="Kapitel">
            <ol>
              {CHAPTERS.map(([id, title], i) => (
                <li key={id}>
                  <a href={`#${id}`}>
                    <span className={s.tocNum}>{String(i + 1).padStart(2, "0")}</span>
                    {title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </section>

        {/* ================= 01 Praxis Puls ================= */}
        <section className={s.chapter} aria-labelledby="puls">
          <SectionIntro
            id="puls"
            index="01"
            title="Praxis Puls"
            lede="Der Status ist die klarste Aussage jeder Seite. Form, Wort und Position tragen die Bedeutung, Farbe verstärkt nur. Unbekannt hat keine Farbe."
          />
          <div className={s.pulsStage}>
            <div className={s.pulsHero}>
              <PulsHero puls={puls} />
              {state === "open" ? <DayRuler span={[8, 12]} now={9.66} caption="Tageslineal, nur bei bestätigten Zeiten (Demo)." /> : null}
            </div>
            <div className={s.pulsSwitch}>
              <p className={s.small}>Zustand ansehen</p>
              <ul>
                {PULS_ORDER.map((p) => (
                  <li key={p}>
                    <Link href={`/design-system?puls=${p}#puls`} aria-current={p === state ? "true" : undefined}>
                      <StatusMark indicator={DEMO_PULS[p].indicator} />
                      {STATE_NAMES[p]}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className={s.matrix} role="table" aria-label="Praxis Puls in allen Formen">
            <div className={s.matrixHead} role="row">
              <span role="columnheader">Zustand</span>
              <span role="columnheader">Kopfzeile</span>
              <span role="columnheader">Seite</span>
              <span role="columnheader">Dock</span>
            </div>
            {PULS_ORDER.map((p) => (
              <div className={s.matrixRow} role="row" key={p}>
                <span role="cell" className={s.matrixName}>
                  {STATE_NAMES[p]}
                </span>
                <span role="cell">
                  <PulsChip puls={DEMO_PULS[p]} demo={false} />
                </span>
                <span role="cell">
                  <PulsInline puls={DEMO_PULS[p]} />
                </span>
                <span role="cell" className={s.dockCell}>
                  <span className={s.dockMini}>
                    <Icon name="today" />
                    <span className={s.dockMiniMark}>
                      <StatusMark indicator={DEMO_PULS[p].indicator} inverse />
                    </span>
                    <span>Heute</span>
                  </span>
                </span>
              </div>
            ))}
          </div>
          <EmergencyBlock>
            Notfall ist nie ein Status der Praxis. Er hat eine eigene Farbe, eine eigene Form und ist auf jeder Seite
            einen Schritt entfernt.
          </EmergencyBlock>
        </section>

        {/* ================= 02 Farbe ================= */}
        <section className={s.chapter} aria-labelledby="farbe">
          <SectionIntro
            id="farbe"
            index="02"
            title="Farbe"
            lede="Papier und Tinte tragen fast alles. Kobalt bedeutet Handlung und Auswahl. Akzente erscheinen selten und nur mit Aufgabe — nie mehr als einer pro Ansicht."
          />
          <div className={s.proportion} aria-label="Verhältnis: 70 Prozent Papier und Tinte, 20 Prozent Kobalt, 10 Prozent Akzente" role="img">
            <span className={s.pPaper}>Papier + Tinte 70 %</span>
            <span className={s.pCobalt}>Kobalt 20 %</span>
            <span className={s.pAccent} />
          </div>
          <ul className={s.swatches}>
            {COLORS.map((c) => (
              <li key={c.token} className={s.swatch}>
                <span className={s.swatchChip} style={{ background: c.hex }} />
                <span className={s.swatchName}>{c.name}</span>
                <span className={s.swatchRole}>{c.role}</span>
                <span className={s.swatchMeta}>
                  <code>{c.token}</code> {c.hex} {c.ratio ? <span>· {c.ratio}</span> : null}
                </span>
              </li>
            ))}
          </ul>
          <div className={s.doDont}>
            <InfoBlock label="So">
              <p>
                Kobalt für Links, Auswahl, Fokus und die aktuelle Navigation. Grün nur als Punkt neben dem Wort
                „Geöffnet“. Rot nur für Notfall.
              </p>
            </InfoBlock>
            <InfoBlock label="Nicht so">
              <p>
                Keine Ampel aus Grün, Gelb und Rot. Kein Kobalt für „alles gut“. Koralle, Gelb und Flieder nie als
                Textfarbe und nie alle drei auf einer Ansicht.
              </p>
            </InfoBlock>
          </div>
        </section>

        {/* ================= 03 Typografie ================= */}
        <section className={s.chapter} aria-labelledby="typografie">
          <SectionIntro
            id="typografie"
            index="03"
            title="Typografie"
            lede="Newsreader für Aussagen, Instrument Sans für Werkzeuge. Die Serife spricht, die Grotesk misst. Zahlen für Zeiten sind immer tabellarisch."
          />
          <dl className={s.typeList}>
            {TYPE.map((t) => (
              <div key={t.role} className={s.typeRow}>
                <dt>
                  <span className={s.typeRole}>{t.role}</span>
                  <span className={s.typeSpec}>{t.spec}</span>
                </dt>
                <dd className={s[t.cls]}>{t.sample}</dd>
              </div>
            ))}
          </dl>
          <h3 className={s.subhead}>Belastungstest Deutsch</h3>
          <p className={s.small}>
            Dieselben Wörter in drei Spaltenbreiten (320, 220 und 160 px). Umbrechen ist erlaubt, Abschneiden nie.
          </p>
          <div className={s.stress}>
            {[320, 220, 160].map((w) => (
              <div key={w} className={s.stressCol} style={{ width: `min(${w}px, 100%)` }}>
                <p className={s.stressWidth}>{w} px</p>
                {STRESS.map((word) => (
                  <p key={word} className={s.stressWord}>
                    {word}
                  </p>
                ))}
              </div>
            ))}
          </div>
          <p className={s.glyphs} aria-label="Glyphenprobe">
            Ää Öö Üü ß ẞ 0123456789 08:00–12:00 „Anführung“ – § € &amp;
          </p>
        </section>

        {/* ================= 04 Raster ================= */}
        <section className={s.chapter} aria-labelledby="raster">
          <SectionIntro
            id="raster"
            index="04"
            title="Raster und Abstand"
            lede="Ein 4-px-System, ein 4/6/12-Spalten-Raster und drei Breiten: Lesen, Inhalt, weit. Asymmetrie entsteht durch Spaltenwahl, nicht durch Zufall."
          />
          <ul className={s.spaces}>
            {SPACES.map(([token, px]) => (
              <li key={token}>
                <span className={s.spaceBar} style={{ width: `${px}px` }} />
                <code>{token}</code>
                <span>{px} px</span>
              </li>
            ))}
          </ul>
          <div className={s.gridDemo} aria-hidden="true">
            {Array.from({ length: 12 }, (_, i) => (
              <span key={i} />
            ))}
            <div className={s.gridSpanA}>7 Spalten: Aussage</div>
            <div className={s.gridSpanB}>5 Spalten: Objekt</div>
          </div>
          <dl className={s.widths}>
            <div>
              <dt>Lesebreite</dt>
              <dd>38 rem, etwa 66 Zeichen</dd>
            </div>
            <div>
              <dt>Inhalt</dt>
              <dd>76 rem</dd>
            </div>
            <div>
              <dt>Weit</dt>
              <dd>90 rem, nur für Einstiege</dd>
            </div>
            <div>
              <dt>Rand</dt>
              <dd>16 px auf 360 px bis 56 px</dd>
            </div>
          </dl>
        </section>

        {/* ================= 05 Aktionen ================= */}
        <section className={s.chapter} aria-labelledby="aktionen">
          <SectionIntro
            id="aktionen"
            index="05"
            title="Aktionen und Links"
            lede="Keine Pillen. Die Primäraktion ist eine Taste aus Tinte auf einer Kobaltkante, die beim Drücken einsinkt. Nicht jede Aktion ist blau."
          />
          <div className={s.actionsGrid}>
            <InfoBlock label="Primär">
              <p className={s.row}>
                <Action href="#" icon="phone" meta="0000 123456">
                  Anrufen
                </Action>
              </p>
            </InfoBlock>
            <InfoBlock label="Sekundär">
              <p className={s.row}>
                <Action href="#" variant="secondary" icon="today">
                  Sprechzeiten ansehen
                </Action>
              </p>
            </InfoBlock>
            <InfoBlock label="Leise / Werkzeug">
              <p className={s.row}>
                <Action href="#" variant="quiet" icon="route">
                  Route planen
                </Action>
              </p>
            </InfoBlock>
            <InfoBlock label="Notfall">
              <p className={s.row}>
                <Action href="#" variant="emergency" icon="phone">
                  Notruf 112 anrufen
                </Action>
              </p>
            </InfoBlock>
          </div>
          <InfoBlock label="Zustände der Primäraktion">
            <p className={s.row}>
              <Action href="#">Ruhe</Action>
              <Action href="#" forceState="hover">
                Hover
              </Action>
              <Action href="#" forceState="press">
                Gedrückt
              </Action>
              <Action href="#" forceState="focus">
                Fokus
              </Action>
            </p>
          </InfoBlock>
          <InfoBlock label="Links im Text">
            <p className={s.prose}>
              Ob wir heute kranke Kinder ohne Termin sehen können, erfahren Sie telefonisch. Alle Zeiten finden Sie unter{" "}
              <TextLink href="#">Sprechzeiten ansehen</TextLink>. Offizielle Empfehlungen veröffentlicht die{" "}
              <TextLink href="#">Ständige Impfkommission beim RKI</TextLink>.
            </p>
          </InfoBlock>
        </section>

        {/* ================= 06 Navigation ================= */}
        <section className={s.chapter} aria-labelledby="navigation">
          <SectionIntro
            id="navigation"
            index="06"
            title="Navigation"
            lede="Oben am Desktop: vier Wege als Text, Status, Telefon, Notfall. Unten am Telefon: das Dock in Daumenreichweite. Das Menü ist eine ruhige Liste, kein Rätsel."
          />
          <div className={s.navDemo}>
            <figure className={s.navFigure}>
              <MobileDock puls={puls} fixed={false} />
              <figcaption className={s.caption}>Dock: Anrufen, Heute mit Statuspunkt, Notfall, Menü. 52 px hoch, immer sichtbar.</figcaption>
            </figure>
            <figure className={s.navFigure}>
              <MenuSheetMock />
              <figcaption className={s.caption}>Menü-Blatt: vier Wege, darunter alle Seiten, ohne Akkordeon.</figcaption>
            </figure>
          </div>
        </section>

        {/* ================= 07 Inhalte ================= */}
        <section className={s.chapter} aria-labelledby="inhalte">
          <SectionIntro
            id="inhalte"
            index="07"
            title="Inhalte"
            lede="Nicht alles braucht eine Box. Linien, Abstände und Typografie gliedern; Rahmen gibt es nur für Menschen und Medien."
          />
          <div className={s.contentGrid}>
            <InfoBlock label="Informationsblock">
              <p>Montag bis Freitag gelten die regulären Sprechzeiten. Geänderte Zeiten erscheinen automatisch, sobald sie bestätigt sind.</p>
              <SourceNote checked="07.10.2026" source="Praxis (Demo)" />
            </InfoBlock>
            <Notice title="Neue Telefonzeiten ab November" validity="Gültig bis 30.11.2026 (Demo)">
              Diese Meldung verschwindet am Enddatum von selbst.
            </Notice>
            <Notice kind="warning" title="Heute geänderte Sprechzeit" validity="Nur heute (Demo)">
              08:00–10:00 Uhr. Danach erreichen Sie uns telefonisch.
            </Notice>
          </div>
          <h3 className={s.subhead}>Wobei können wir helfen?</h3>
          <HelpTopicList
            items={[
              { label: "Mein Kind ist krank", text: "Sprechzeiten und wie Sie uns heute erreichen (Demo)" },
              { label: "Vorsorge", text: "U- und J-Untersuchungen nach Alter (Demo)" },
              { label: "Impfungen", text: "Orientierung mit offizieller Quelle (Demo)" },
              { label: "Bescheinigungen", text: "Nur wenn von der Praxis bestätigt (Demo)" },
            ]}
          />
          <h3 className={s.subhead}>Menschen</h3>
          <div className={s.people}>
            <PersonCard media={<MediaFrame kind="portrait" />} name="Dr. med. Beispiel" role="Ärztin (Demo)" titles={["Fachärztin für Kinder- und Jugendmedizin (Demo)"]} />
            <PersonCard media={<MediaFrame kind="portrait" />} name="Beispiel Name" role="Medizinische Fachangestellte (Demo)" titles={["Empfang und Organisation (Demo)"]} />
            <PersonCard media={<MediaFrame kind="portrait" />} name="Beispiel Name" role="Praxisassistenz (Demo)" titles={[]} />
          </div>
        </section>

        {/* ================= 08 Alter und Zeit ================= */}
        <section className={s.chapter} aria-labelledby="mein-kind">
          <SectionIntro
            id="mein-kind"
            index="08"
            title="Alter und Zeit"
            lede="Zwei Instrumente statt Kinderzimmer-Ästhetik: eine Altersskala, deren Felder mit den Jahren wachsen, und ein Tageslineal. Beide zeigen Orientierung, nie Messwerte."
          />
          <div className={s.instruments}>
            <AgeScale />
            <DayRuler span={[8, 12]} now={9.66} caption="Tageslineal mit Sprechzeit und jetzt-Markierung (Demo)." />
          </div>
        </section>

        {/* ================= 09 Medien ================= */}
        <section className={s.chapter} aria-labelledby="medien">
          <SectionIntro
            id="medien"
            index="09"
            title="Medien und Platzhalter"
            lede="Echte Fotos folgen. Bis dahin sind Platzhalter bewusste Zeichnungen mit Messmarken — nie Stockfotos, nie Gesichter, nie etwas, das man für die Praxis halten könnte."
          />
          <div className={s.mediaGrid}>
            <MediaFrame kind="portrait" caption="Porträt, 4:5 — Ärztinnen und Team" />
            <MediaFrame kind="team" caption="Teamfoto, 3:2" />
            <MediaFrame kind="room" caption="Praxisraum, 3:2" />
            <MediaFrame kind="child" mediaClass="AI_CONCEPTUAL" caption="KI-Konzept, nie als Patientin oder Praxis dargestellt" />
            <MediaFrame kind="video" caption="Video, 16:9 — nur mit Untertiteln" />
            <MediaFrame kind="model3d" caption="3D-Objekt, Standbild als Rückfall" />
          </div>
        </section>

        {/* ================= 10 Bewegung ================= */}
        <section className={s.chapter} aria-labelledby="bewegung">
          <SectionIntro
            id="bewegung"
            index="10"
            title="Bewegung"
            lede="Physisch, ruhig, präzise — mit einem Hauch Spiel. Bewegung antwortet auf Handlungen; von selbst bewegt sich fast nichts, und nichts Wichtiges hängt an ihr."
          />
          <table className={s.motionTable}>
            <thead>
              <tr>
                <th scope="col">Anlass</th>
                <th scope="col">Token</th>
                <th scope="col">Dauer</th>
                <th scope="col">Kurve</th>
                <th scope="col">Bild</th>
              </tr>
            </thead>
            <tbody>
              {MOTION.map((m) => (
                <tr key={m[0]}>
                  {m.map((c, i) => (i === 0 ? <th scope="row" key={i}>{c}</th> : <td key={i}>{i === 1 ? <code>{c}</code> : c}</td>))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className={s.stateDemo}>
            <fieldset className={s.stateDemoControls}>
              <legend>Statuswechsel ausprobieren</legend>
              {(["open", "closed", "unknown"] as const).map((p, i) => (
                <label key={p}>
                  <input type="radio" name="statedemo" value={p} defaultChecked={i === 0} />
                  <span>{STATE_NAMES[p]}</span>
                </label>
              ))}
            </fieldset>
            <div className={s.stateDemoStage}>
              {(["open", "closed", "unknown"] as const).map((p) => (
                <div key={p} className={`${s.stateDemoItem} ${s[`sd-${p}`]}`}>
                  <PulsInline puls={DEMO_PULS[p]} />
                </div>
              ))}
            </div>
          </div>
          <p className={s.small}>
            Mit „Bewegung reduzieren“ wird aus Gleiten ein Überblenden, aus dem Schwingen des Objekts ein Standbild. Die
            Information ist in jedem Fall sofort da.
          </p>
        </section>

        {/* ================= 11 Fokus ================= */}
        <section className={s.chapter} aria-labelledby="fokus">
          <SectionIntro
            id="fokus"
            index="11"
            title="Fokus und Barrierefreiheit"
            lede="Der Fokusrahmen ist gestaltet, nicht versteckt: 3 px Kobalt mit Abstand, auf Tinte in Gelb. Status nie nur über Farbe, Ziele mindestens 44 px."
          />
          <div className={s.focusGrid}>
            <Action href="#" forceState="focus">
              Primäraktion
            </Action>
            <span className={s.focusLink}>Textlink mit Fokus</span>
            <span className={s.focusDock}>
              <Icon name="alert" />
              Notfall
            </span>
            <span className={s.focusChip}>
              <StatusMark indicator="NEUTRAL" />
              Geschlossen
            </span>
          </div>
          <ul className={s.a11yList}>
            <li>Kontrast: Text mindestens 4,5 : 1; Kobalt-Text 5,8 : 1; Grün und Koralle nie als Text.</li>
            <li>Status: Wort + Form (+ Farbe). „Unbekannt“ hat weder Farbe noch Punkt.</li>
            <li>Große Schrift: Komponenten wachsen mit; Zeilen umbrechen, nichts wird abgeschnitten.</li>
            <li>Erzwungene Farben: Rahmen und Fokus bleiben sichtbar.</li>
          </ul>
        </section>

        {/* ================= 12 Material ================= */}
        <section className={s.chapter} aria-labelledby="material">
          <SectionIntro
            id="material"
            index="12"
            title="3D-Material"
            lede="Zwischen Messinstrument, Spielzeug und Skulptur: warme Keramik, eloxierte dunkle Struktur, Kobalt-Emaille, eine weiche Koralle, ein Gelb zum Entdecken. Die Geometrie ist noch nicht final."
          />
          <div className={s.materialWrap}>
            <ul className={s.materials}>
              {[
                ["Warme Keramik", "#EEE9DF", "matt-seidig, Rauheit 0,38", s.mCeramic],
                ["Eloxierte Struktur", "#202327", "satiniert, metallisch 0,7", s.mAnodized],
                ["Kobalt-Emaille", "#4A5CFF", "glänzend, Klarlack", s.mEnamel],
                ["Koralle, soft-touch", "#F28B74", "samtig, Rauheit 0,78", s.mCoral],
                ["Gelb", "#F1CF68", "seidig, Rauheit 0,5", s.mYellow],
              ].map(([name, hex, desc, cls]) => (
                <li key={name}>
                  <span className={`${s.sphere} ${cls}`} aria-hidden="true" />
                  <span className={s.materialName}>{name}</span>
                  <span className={s.materialDesc}>
                    {hex} — {desc}
                  </span>
                </li>
              ))}
            </ul>
            <div className={s.materialStage}>
              <MaterialStage disable3d={no3d} />
              <p className={s.caption}>Platzhalter-Geometrie aus Phase 02.5 mit Materialrichtung. Ohne WebGL: gezeichnetes Standbild.</p>
            </div>
          </div>
        </section>

        {/* ================= 13 Entdecken ================= */}
        <section className={`${s.chapter} ${s.entdecken} mode-entdecken`} aria-labelledby="entdecken">
          <SectionIntro
            id="entdecken"
            index="13"
            title="Entdecken-Modus"
            lede="Für die Welt der Kinder wird es Abend: ein tiefes Blauschwarz, leuchtendes Kobalt, Koralle und Flieder, sparsames Gelb. Dieselbe Typografie, dieselben Linien — kein Spiel-Look."
          />
          <div className={s.nightGrid}>
            <article className={s.chapterCard}>
              <span className={s.nightGlow} aria-hidden="true" />
              <p className={s.chapterKicker}>Kapitel 1</p>
              <h3 className={s.chapterTitle}>Mein Arztbesuch</h3>
              <p className={s.chapterText}>Schritt für Schritt: ankommen, warten, messen, abhören, verabschieden.</p>
              <p className={s.row}>
                <Action href="#" variant="primary">
                  Gemeinsam starten
                </Action>
                <Action href="#" variant="quiet">
                  Als Text lesen
                </Action>
              </p>
            </article>
            <ul className={s.upcoming} aria-label="Kapitel in Vorbereitung">
              {["Reise in deinen Körper", "Wachstum", "Ernährung"].map((t) => (
                <li key={t}>
                  <span>{t}</span>
                  <span className={s.upcomingTag}>In Vorbereitung</span>
                </li>
              ))}
            </ul>
            <div className={s.nightAges}>
              <AgeScale name="alter-nacht" defaultIndex={1} mode="dark" />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
