import { VacationDetail } from "@/lab/cockpit/screens/vacation-detail";

export const metadata = { title: "Urlaub" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VacationDetail id={decodeURIComponent(id)} />;
}
