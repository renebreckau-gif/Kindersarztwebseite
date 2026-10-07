import type { Metadata } from "next";
import "@/design-system/tokens.css";
import "@/design-system/base.css";
import "@/site/site-tokens.css";
import { RELEASE } from "@/content/release";

export const metadata: Metadata = {
  title: { default: "Kinderarztpraxis Probst & Böhme – Kinderarzt in Hettstedt", template: "%s – Kinderarztpraxis Probst & Böhme, Hettstedt" },
  description: "Kinder- und Jugendarztpraxis in Hettstedt: Sprechzeiten heute, Telefon, Notfall-Hinweise und Orientierung für Familien.",
  robots: RELEASE.indexable ? { index: true, follow: true } : { index: false, follow: false },
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <div className="ds-root">{children}</div>;
}
