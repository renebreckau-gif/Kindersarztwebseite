import type { Metadata } from "next";
import s from "@/lab/final/signature.module.css";
import { LabSections, LabToolbar } from "@/lab/chrome";
import { EntryDock, EntryHeader, PulsStatement } from "@/lab/final/entry-chrome";
import { SignatureEntry } from "@/lab/final/signature-object";
import { parsePath } from "@/lab/fixtures";
import { DEMO_PULS, parseDemoState } from "@/design-system/demo-fixtures";

export const metadata: Metadata = {
  title: "Signature Entry — Konvergenz",
  robots: { index: false, follow: false },
};

type Search = Promise<Record<string, string | string[] | undefined>>;

const STATES = [
  { id: "open", label: "Geöffnet" },
  { id: "closed", label: "Geschlossen" },
  { id: "special", label: "Geänderte Zeit" },
  { id: "closure", label: "Praxisurlaub" },
  { id: "unknown", label: "Unbekannt" },
];

export default async function SignatureEntryPage({ searchParams }: { searchParams: Search }) {
  const q = await searchParams;
  const state = parseDemoState(q.status);
  const puls = DEMO_PULS[state];
  return (
    <div className={s.page}>
      <a className={s.skip} href="#inhalt">
        Zum Inhalt springen
      </a>
      <EntryHeader />
      <EntryDock puls={puls} />
      <main id="inhalt" className={s.room}>
        <div className={s.light} aria-hidden="true">
          <span className={s.arch} />
          <span className={s.shafts} />
          <span className={s.floor} />
        </div>
        <div className={s.headline}>
          <h1>Gesund groß werden.</h1>
          <p>Alles für heute auf einen Blick. Und Begleitung, die mit Ihrem Kind mitwächst.</p>
        </div>
        <PulsStatement puls={puls} />
        <SignatureEntry initial={parsePath(q.pfad)} disable3d={q["3d"] === "0"} />
      </main>
      <LabSections base="/lab/final" />
      <LabToolbar base="/lab/final" label="Signature Entry" status={state} states={STATES} />
    </div>
  );
}
