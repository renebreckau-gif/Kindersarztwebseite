import type { Metadata } from "next";
import s from "@/lab/proto-c.module.css";
import { LabSections, LabToolbar, MobileDock, MobileTop, UtilityBar } from "@/lab/chrome";
import { PulsStatement } from "@/lab/puls";
import { ProtoCWall } from "@/lab/proto-c";
import { PULS_FIXTURES, parsePath, parseStatus } from "@/lab/fixtures";

export const metadata: Metadata = { title: "Prototyp C — Messlatte (2D/3D-Hybrid)" };

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function PrototypeC({ searchParams }: { searchParams: Search }) {
  const q = await searchParams;
  const status = parseStatus(q.status);
  const puls = PULS_FIXTURES[status];
  return (
    <div className={s.page}>
      <UtilityBar puls={puls} />
      <MobileTop />
      <main id="inhalt" className={s.main}>
        <div className={s.lead}>
          <PulsStatement puls={puls} variant="c" />
          <p className={s.claim}>Gesund groß werden.</p>
        </div>
        <ProtoCWall initial={parsePath(q.pfad)} />
      </main>
      <LabSections base="/lab/c" />
      <LabToolbar base="/lab/c" label="Prototyp C" status={status} />
      <MobileDock puls={puls} />
    </div>
  );
}
