import { Notice } from "@/lab/cockpit/screens/notice";

export const metadata = { title: "Hinweis veröffentlichen" };

export default async function Page({ searchParams }: { searchParams: Promise<{ bearbeiten?: string }> }) {
  const q = await searchParams;
  return <Notice key={q.bearbeiten ?? "neu"} editId={q.bearbeiten} />;
}
