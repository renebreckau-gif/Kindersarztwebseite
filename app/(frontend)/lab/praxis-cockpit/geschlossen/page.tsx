import { ClosedToday } from "@/lab/cockpit/screens/closed-today";

export const metadata = { title: "Heute geschlossen" };

export default async function Page({ searchParams }: { searchParams: Promise<{ bearbeiten?: string }> }) {
  const q = await searchParams;
  return <ClosedToday key={q.bearbeiten ?? "neu"} startEdit={q.bearbeiten === "1"} />;
}
