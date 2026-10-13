import { EarlyClose } from "@/lab/cockpit/screens/early-close";

export const metadata = { title: "Heute früher schließen" };

export default async function Page({ searchParams }: { searchParams: Promise<{ anpassen?: string }> }) {
  const q = await searchParams;
  return <EarlyClose key={q.anpassen ?? "neu"} startEdit={q.anpassen === "1"} />;
}
