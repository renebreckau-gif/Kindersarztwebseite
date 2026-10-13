import { Area } from "@/lab/cockpit/screens/checks";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <Area slug={slug} />;
}
