import { DirectoryCheck } from "@/lab/cockpit/screens/checks";

export const metadata = { title: "Vertretung prüfen" };

export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const q = await searchParams;
  return <DirectoryCheck id={q.id ?? ""} />;
}
