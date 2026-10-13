import type { Metadata } from "next";
import "@/design-system/tokens.css";
import "@/design-system/base.css";
import "@/site/site-tokens.css";
import { CockpitProvider } from "@/lab/cockpit/store";
import { Shell } from "@/lab/cockpit/ui";

// Phase 09.1 lab prototype — mock data only, not linked from any navigation.
export const metadata: Metadata = {
  title: { default: "Praxis Cockpit · Prototyp", template: "%s · Praxis Cockpit · Prototyp" },
  description: "Klickbarer Prototyp für Usability-Tests. Keine echten Daten.",
  robots: { index: false, follow: false },
};

export default function CockpitLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ds-root">
      <CockpitProvider>
        <Shell>{children}</Shell>
      </CockpitProvider>
    </div>
  );
}
