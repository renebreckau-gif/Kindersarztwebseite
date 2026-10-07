import type { Metadata } from "next";
import s from "@/lab/proto-final.module.css";
import { LabSections, LabToolbar, MobileDock, MobileTop, UtilityBar } from "@/lab/chrome";
import { PulsStatement } from "@/lab/puls";
import { FinalObject } from "@/lab/proto-final";
import { TimeRuler } from "@/lab/time-ruler";
import { PULS_FIXTURES, parsePath, parseStatus } from "@/lab/fixtures";

export const metadata: Metadata = { title: "Konvergenz — Signature Entry Referenz" };

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function FinalConvergence({ searchParams }: { searchParams: Search }) {
  const q = await searchParams;
  const status = parseStatus(q.status);
  const puls = PULS_FIXTURES[status];
  return (
    <div className={s.page}>
      <UtilityBar puls={puls} />
      <MobileTop />
      <main id="inhalt" className={s.main}>
        <div className={s.lead}>
          <PulsStatement puls={puls} variant="final" />
          <TimeRuler puls={puls} />
        </div>
        <FinalObject initial={parsePath(q.pfad)} disable3d={q["3d"] === "0"} />
        <p className={s.colophon}>Gesund groß werden.</p>
      </main>
      <LabSections base="/lab/final" />
      <LabToolbar base="/lab/final" label="Konvergenz" status={status} />
      <MobileDock puls={puls} />
    </div>
  );
}
