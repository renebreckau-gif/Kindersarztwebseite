import type { Metadata } from "next";
import s from "@/lab/proto-a.module.css";
import { LabSections, LabToolbar, MobileDock, MobileTop, UtilityBar } from "@/lab/chrome";
import { PulsStatement } from "@/lab/puls";
import { ProtoAStage } from "@/lab/proto-a";
import { PULS_FIXTURES, parsePath, parseStatus } from "@/lab/fixtures";

export const metadata: Metadata = { title: "Prototyp A — Funktionales Growing Mobile" };

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function PrototypeA({ searchParams }: { searchParams: Search }) {
  const q = await searchParams;
  const status = parseStatus(q.status);
  const puls = PULS_FIXTURES[status];
  return (
    <div className={s.page}>
      <UtilityBar puls={puls} />
      <MobileTop />
      <main id="inhalt" className={s.main}>
        <div className={s.info}>
          <PulsStatement puls={puls} variant="a" />
          <p className={s.claim}>Gesund groß werden.</p>
        </div>
        <ProtoAStage initial={parsePath(q.pfad)} disable3d={q["3d"] === "0"} />
      </main>
      <LabSections base="/lab/a" />
      <LabToolbar base="/lab/a" label="Prototyp A" status={status} />
      <MobileDock puls={puls} />
    </div>
  );
}
