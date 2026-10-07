import Link from "next/link";

// The public homepage does not exist yet. This route only points to the internal lab.
export default function Home() {
  return (
    <main style={{ padding: "48px var(--gutter)", maxWidth: 640 }}>
      <h1 style={{ fontFamily: "var(--serif)", fontWeight: 400, fontSize: "2rem", lineHeight: 1.15 }}>
        Interne Entwicklungsumgebung
      </h1>
      <p style={{ marginTop: 16, color: "var(--ink-soft)" }}>
        Die öffentliche Website existiert noch nicht. Hier liegen nur Prototypen zur Eingangserfahrung.
      </p>
      <p style={{ marginTop: 24 }}>
        <Link href="/lab">Zum Experience Lab</Link>
      </p>
    </main>
  );
}
