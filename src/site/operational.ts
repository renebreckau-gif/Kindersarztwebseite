// One operational snapshot per public page render (Phase 09.6B). Pages call this ONCE and pass the
// snapshot (or its parts) down; `resolvePuls` stays pure and receives the snapshot's PulsData. A future
// source change happens in `loadPublicOperationalData`, never in the pages.

import { resolvePuls, type PulsView } from "@/content/puls";
import { loadPublicOperationalData, type PublicOperationalSnapshot } from "@/data/public-operational";

type Params = { vorschau?: string | string[]; zeit?: string | string[] };

export async function loadPublicPage(params: Params = {}): Promise<{ snapshot: PublicOperationalSnapshot; puls: PulsView }> {
  const snapshot = await loadPublicOperationalData();
  return { snapshot, puls: resolvePuls(params, new Date(), snapshot.puls) };
}
