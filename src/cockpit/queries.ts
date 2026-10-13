// Server-side cockpit queries: database → PayloadPracticeRepository → domain → read model.
// Takes the Payload Local API as a minimal reader, so this module carries no Payload runtime code
// and React components never see raw Payload documents.

import type { Announcement } from "../domain/content-types.ts";
import type { PulsData } from "../domain/practice-status.ts";
import { PayloadPracticeRepository, type PayloadReader } from "../backend/payload-repository.ts";
import { cockpitHome, type CockpitHome } from "./read-model.ts";
import { comparePreview, type PreviewComparison } from "./preview.ts";

export async function loadPracticeData(payload: PayloadReader): Promise<{ data: PulsData; announcements: Announcement[] }> {
  const repo = new PayloadPracticeRepository(payload);
  const data = await repo.getPulsData();
  const announcements = await repo.getAnnouncements();
  return { data, announcements };
}

export async function loadCockpitHome(payload: PayloadReader, now: Date = new Date()): Promise<CockpitHome> {
  return cockpitHome({ ...(await loadPracticeData(payload)), now });
}

/** Database result vs. the current website (static snapshot), both through the engine. */
export async function loadPreview(payload: PayloadReader, websiteData: PulsData, at: Date): Promise<{ comparison: PreviewComparison; databaseData: PulsData }> {
  const { data } = await loadPracticeData(payload);
  return { comparison: comparePreview(websiteData, data, at), databaseData: data };
}
