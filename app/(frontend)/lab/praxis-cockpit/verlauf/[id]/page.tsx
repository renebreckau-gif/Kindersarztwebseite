import { HistoryDetail } from "@/lab/cockpit/screens/history";

export const metadata = { title: "Änderung" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ objekt?: string; ruecknahme?: string }> };

export default async function Page({ params, searchParams }: Props) {
  const [{ id }, q] = await Promise.all([params, searchParams]);
  return <HistoryDetail key={`${id}-${q.ruecknahme ?? ""}`} id={id} entity={q.objekt} startUndo={q.ruecknahme === "1"} />;
}
