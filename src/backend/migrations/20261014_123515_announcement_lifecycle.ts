// Adjusted after generation: type-only imports, so the file also runs under Node type stripping
// (integration tests). The generated SQL is unchanged.
import { sql, type MigrateUpArgs, type MigrateDownArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_announcements_record_state" AS ENUM('ACTIVE', 'RETIRED');
  CREATE TYPE "public"."enum_announcements_retired_reason" AS ENUM('SUPERSEDED', 'REVERTED');
  ALTER TABLE "announcements" ADD COLUMN "record_state" "enum_announcements_record_state" DEFAULT 'ACTIVE' NOT NULL;
  ALTER TABLE "announcements" ADD COLUMN "retired_reason" "enum_announcements_retired_reason";
  ALTER TABLE "announcements" ADD COLUMN "retired_at" varchar;
  ALTER TABLE "announcements" ADD COLUMN "retired_by_change_set_id" varchar;
  ALTER TABLE "announcements" ADD COLUMN "superseded_by_record_id" varchar;
  CREATE INDEX "announcements_record_state_idx" ON "announcements" USING btree ("record_state");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "announcements_record_state_idx";
  ALTER TABLE "announcements" DROP COLUMN "record_state";
  ALTER TABLE "announcements" DROP COLUMN "retired_reason";
  ALTER TABLE "announcements" DROP COLUMN "retired_at";
  ALTER TABLE "announcements" DROP COLUMN "retired_by_change_set_id";
  ALTER TABLE "announcements" DROP COLUMN "superseded_by_record_id";
  DROP TYPE "public"."enum_announcements_record_state";
  DROP TYPE "public"."enum_announcements_retired_reason";`)
}
