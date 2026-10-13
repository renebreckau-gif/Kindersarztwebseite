// Repository contracts between storage and the domain layer (docs/architecture/backend-foundation.md §4).
// Dependency direction: storage (static content | Payload) → adapter → these contracts → domain types.
// No Payload types here: the domain stays framework-independent.

import type { Announcement } from "../domain/content-types.ts";
import type { PulsData } from "../domain/practice-status.ts";
import type { AuditEventRecord, StaffRole } from "../domain/governance.ts";

/** Implementation migration control (NOT a deployment stage — see SITE_STAGE). */
export type DataSource = "STATIC" | "PAYLOAD";

/**
 * Everything PRAXIS PULS needs: weekly schedule, consultation types, exceptions, closures,
 * replacement practices, holiday calendar + policy — exactly the engine's PulsData.
 */
export interface PracticeRepository {
  readonly source: DataSource;
  getPulsData(): Promise<PulsData>;
  getAnnouncements(): Promise<Announcement[]>;
}

/** Append-only audit history. There is deliberately no update or delete. */
export interface AuditRepository {
  append(event: AuditEventRecord): Promise<void>;
  listForEntity(entityType: string, entityId: string): Promise<AuditEventRecord[]>;
}

/** Staff account as the cockpit sees it — never contains credentials. */
export interface StaffAccount {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  active: boolean;
}

export interface StaffDirectory {
  findById(id: string): Promise<StaffAccount | null>;
}
