// Controlled legal placeholders (LegalText architecture, content-model.md).
// No legal text is copied from the old site (F08/F09 are OUTDATED); nothing here claims compliance.

import { PageFrame, InternalNote } from "./chrome";
import { PageIntro, Section } from "./blocks";
import u from "./pages.module.css";
import type { PulsView } from "@/content/puls";

export function LegalPlaceholder({ title, puls, blockers }: { title: string; puls: PulsView; blockers: string }) {
  return (
    <PageFrame puls={puls}>
      <PageIntro variant="utility" title={title} />
      <Section id="text" tone="paper">
        <p className={u.lead}>Dieser Text wird derzeit fachlich geprüft und erscheint hier nach der Freigabe.</p>
        <InternalNote>
          <p>{blockers}</p>
        </InternalNote>
      </Section>
    </PageFrame>
  );
}
