// Adjusted after generation: type-only imports, so the file also runs under Node type stripping
// (integration tests). The generated SQL is unchanged.
import { sql, type MigrateUpArgs, type MigrateDownArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_opening_hour_exceptions_record_state" AS ENUM('ACTIVE', 'RETIRED');
  CREATE TYPE "public"."enum_opening_hour_exceptions_retired_reason" AS ENUM('SUPERSEDED', 'REVERTED');
  CREATE TYPE "public"."enum_closures_record_state" AS ENUM('ACTIVE', 'RETIRED');
  CREATE TYPE "public"."enum_closures_retired_reason" AS ENUM('SUPERSEDED', 'REVERTED');
  ALTER TABLE "opening_hour_exceptions" ADD COLUMN "record_state" "enum_opening_hour_exceptions_record_state" DEFAULT 'ACTIVE' NOT NULL;
  ALTER TABLE "opening_hour_exceptions" ADD COLUMN "retired_reason" "enum_opening_hour_exceptions_retired_reason";
  ALTER TABLE "opening_hour_exceptions" ADD COLUMN "retired_at" varchar;
  ALTER TABLE "opening_hour_exceptions" ADD COLUMN "retired_by_change_set_id" varchar;
  ALTER TABLE "opening_hour_exceptions" ADD COLUMN "superseded_by_record_id" varchar;
  ALTER TABLE "closures" ADD COLUMN "record_state" "enum_closures_record_state" DEFAULT 'ACTIVE' NOT NULL;
  ALTER TABLE "closures" ADD COLUMN "retired_reason" "enum_closures_retired_reason";
  ALTER TABLE "closures" ADD COLUMN "retired_at" varchar;
  ALTER TABLE "closures" ADD COLUMN "retired_by_change_set_id" varchar;
  ALTER TABLE "closures" ADD COLUMN "superseded_by_record_id" varchar;
  CREATE INDEX "opening_hour_exceptions_record_state_idx" ON "opening_hour_exceptions" USING btree ("record_state");
  CREATE INDEX "closures_record_state_idx" ON "closures" USING btree ("record_state");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "opening_hour_exceptions_record_state_idx";
  DROP INDEX "closures_record_state_idx";
  ALTER TABLE "opening_hour_exceptions" DROP COLUMN "record_state";
  ALTER TABLE "opening_hour_exceptions" DROP COLUMN "retired_reason";
  ALTER TABLE "opening_hour_exceptions" DROP COLUMN "retired_at";
  ALTER TABLE "opening_hour_exceptions" DROP COLUMN "retired_by_change_set_id";
  ALTER TABLE "opening_hour_exceptions" DROP COLUMN "superseded_by_record_id";
  ALTER TABLE "closures" DROP COLUMN "record_state";
  ALTER TABLE "closures" DROP COLUMN "retired_reason";
  ALTER TABLE "closures" DROP COLUMN "retired_at";
  ALTER TABLE "closures" DROP COLUMN "retired_by_change_set_id";
  ALTER TABLE "closures" DROP COLUMN "superseded_by_record_id";
  DROP TYPE "public"."enum_opening_hour_exceptions_record_state";
  DROP TYPE "public"."enum_opening_hour_exceptions_retired_reason";
  DROP TYPE "public"."enum_closures_record_state";
  DROP TYPE "public"."enum_closures_retired_reason";`)
}
