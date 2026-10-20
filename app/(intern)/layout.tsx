// Root layout of the internal staff area (/intern). Separate from the public site and from the
// Payload admin (each route group has its own root layout). Reachable only on STAGING with a
// configured database (proxy.ts); never in the patient navigation; never indexed.

import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Newsreader } from "next/font/google";
import "@/design-system/tokens.css";
import "./intern.css";

const serif = Newsreader({ subsets: ["latin"], variable: "--font-serif", display: "swap" });
const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Praxis Cockpit · Kinderarztpraxis Probst & Böhme",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#F3EFE7" };

// Always rendered per request. Without this, a build without database access prerendered the
// "nicht erreichbar" page as static HTML (internSession returned before any dynamic API), and the
// staff area stayed unavailable until the next build (found in Phase 10.0A).
export const dynamic = "force-dynamic";

export default function InternLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${serif.variable} ${sans.variable}`}>
      <body className="intern">{children}</body>
    </html>
  );
}
