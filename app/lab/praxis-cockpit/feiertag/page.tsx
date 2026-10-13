import { Holiday } from "@/lab/cockpit/screens/checks";

export const metadata = { title: "Feiertag prüfen" };

export default async function Page({ searchParams }: { searchParams: Promise<{ datum?: string }> }) {
  const q = await searchParams;
  return <Holiday date={q.datum ?? ""} />;
}
