import type { Metadata } from "next";
import "@/design-system/tokens.css";
import "@/design-system/base.css";

export const metadata: Metadata = {
  title: "Designsystem — Warm Editorial + Cobalt",
  description: "Interne Referenz. Nicht öffentlich.",
  robots: { index: false, follow: false },
};

export default function DesignSystemLayout({ children }: { children: React.ReactNode }) {
  return <div className="ds-root">{children}</div>;
}
