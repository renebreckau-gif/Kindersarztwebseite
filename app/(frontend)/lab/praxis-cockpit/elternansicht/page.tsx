import { ParentView } from "@/lab/cockpit/screens/parent";

export const metadata = { title: "Elternansicht" };

type Search = Promise<{ datum?: string; zeit?: string; bereich?: string }>;

export default async function Page({ searchParams }: { searchParams: Search }) {
  const q = await searchParams;
  return <ParentView key={`${q.datum}-${q.zeit}-${q.bereich}`} initialDate={q.datum} initialTime={q.zeit} initialPanel={q.bereich} />;
}
