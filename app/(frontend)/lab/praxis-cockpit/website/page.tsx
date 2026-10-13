import { Website } from "@/lab/cockpit/screens/website";

export const metadata = { title: "Website-Vorschau" };

type Search = Promise<{ datum?: string; zeit?: string }>;

export default async function Page({ searchParams }: { searchParams: Search }) {
  const q = await searchParams;
  return <Website initialDate={q.datum} initialTime={q.zeit} />;
}
