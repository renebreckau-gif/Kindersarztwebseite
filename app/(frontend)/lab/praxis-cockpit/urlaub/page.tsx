import { Vacation } from "@/lab/cockpit/screens/vacation";

export const metadata = { title: "Urlaub eintragen" };

export default async function Page({ searchParams }: { searchParams: Promise<{ bearbeiten?: string }> }) {
  const q = await searchParams;
  return <Vacation key={q.bearbeiten ?? "neu"} editId={q.bearbeiten} />;
}
