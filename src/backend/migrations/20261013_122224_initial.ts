// Adjusted after generation: type-only imports, so the file also runs under Node type stripping
// (integration tests). The generated SQL is unchanged.
import { sql, type MigrateUpArgs, type MigrateDownArgs } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_staff_role" AS ENUM('STAFF', 'DOCTOR', 'ADMIN');
  CREATE TYPE "public"."enum_weekly_schedules_rules_weekday" AS ENUM('1', '2', '3', '4', '5', '6', '7');
  CREATE TYPE "public"."enum_weekly_schedules_rules_consultation_type" AS ENUM('GENERAL', 'ACUTE', 'APPOINTMENT', 'HEALTHY_ONLY', 'OTHER');
  CREATE TYPE "public"."enum_weekly_schedules_rules_verification_status" AS ENUM('VERIFIED_CURRENT', 'TO_BE_CONFIRMED', 'OUTDATED_DO_NOT_PUBLISH');
  CREATE TYPE "public"."enum_weekly_schedules_confirmed_closed_weekdays" AS ENUM('1', '2', '3', '4', '5', '6', '7');
  CREATE TYPE "public"."enum_weekly_schedules_verification_status" AS ENUM('VERIFIED_CURRENT', 'TO_BE_CONFIRMED', 'OUTDATED_DO_NOT_PUBLISH');
  CREATE TYPE "public"."enum_consultation_types_code" AS ENUM('GENERAL', 'ACUTE', 'APPOINTMENT', 'HEALTHY_ONLY', 'OTHER');
  CREATE TYPE "public"."enum_consultation_types_verification_status" AS ENUM('VERIFIED_CURRENT', 'TO_BE_CONFIRMED', 'OUTDATED_DO_NOT_PUBLISH');
  CREATE TYPE "public"."enum_opening_hour_exceptions_intervals_consultation_type" AS ENUM('GENERAL', 'ACUTE', 'APPOINTMENT', 'HEALTHY_ONLY', 'OTHER');
  CREATE TYPE "public"."enum_opening_hour_exceptions_kind" AS ENUM('SPECIAL_HOURS', 'CLOSED');
  CREATE TYPE "public"."enum_opening_hour_exceptions_verification_status" AS ENUM('VERIFIED_CURRENT', 'TO_BE_CONFIRMED', 'OUTDATED_DO_NOT_PUBLISH');
  CREATE TYPE "public"."enum_closures_kind" AS ENUM('VACATION', 'TRAINING', 'SHORT_NOTICE', 'OTHER');
  CREATE TYPE "public"."enum_closures_verification_status" AS ENUM('VERIFIED_CURRENT', 'TO_BE_CONFIRMED', 'OUTDATED_DO_NOT_PUBLISH');
  CREATE TYPE "public"."enum_replacement_practices_verification_status" AS ENUM('VERIFIED_CURRENT', 'TO_BE_CONFIRMED', 'OUTDATED_DO_NOT_PUBLISH');
  CREATE TYPE "public"."enum_announcements_category" AS ENUM('INFO', 'IMPORTANT', 'URGENT');
  CREATE TYPE "public"."enum_announcements_verification_status" AS ENUM('VERIFIED_CURRENT', 'TO_BE_CONFIRMED', 'OUTDATED_DO_NOT_PUBLISH');
  CREATE TYPE "public"."enum_holiday_calendar_policy" AS ENUM('REQUIRE_EXPLICIT_ENTRY', 'CLOSED_ON_PUBLIC_HOLIDAYS');
  CREATE TYPE "public"."enum_holiday_calendar_policy_verification_status" AS ENUM('VERIFIED_CURRENT', 'TO_BE_CONFIRMED', 'OUTDATED_DO_NOT_PUBLISH');
  CREATE TABLE "staff_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "staff" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"role" "enum_staff_role" DEFAULT 'STAFF' NOT NULL,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "weekly_schedules_rules_verification_source_ids" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"source_id" varchar NOT NULL
  );
  
  CREATE TABLE "weekly_schedules_rules" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"rule_id" varchar NOT NULL,
  	"weekday" "enum_weekly_schedules_rules_weekday" NOT NULL,
  	"start" varchar NOT NULL,
  	"end" varchar NOT NULL,
  	"consultation_type" "enum_weekly_schedules_rules_consultation_type" NOT NULL,
  	"valid_from" varchar,
  	"valid_until" varchar,
  	"public_note" varchar,
  	"verification_status" "enum_weekly_schedules_rules_verification_status" DEFAULT 'TO_BE_CONFIRMED' NOT NULL,
  	"verification_last_verified" varchar,
  	"verification_verified_by" varchar,
  	"verification_review_due" varchar,
  	"verification_internal_notes" varchar
  );
  
  CREATE TABLE "weekly_schedules_confirmed_closed_weekdays" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_weekly_schedules_confirmed_closed_weekdays",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "weekly_schedules_verification_source_ids" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"source_id" varchar NOT NULL
  );
  
  CREATE TABLE "weekly_schedules" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"verification_status" "enum_weekly_schedules_verification_status" DEFAULT 'TO_BE_CONFIRMED' NOT NULL,
  	"verification_last_verified" varchar,
  	"verification_verified_by" varchar,
  	"verification_review_due" varchar,
  	"verification_internal_notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "consultation_types_verification_source_ids" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"source_id" varchar NOT NULL
  );
  
  CREATE TABLE "consultation_types" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"code" "enum_consultation_types_code" NOT NULL,
  	"label" varchar NOT NULL,
  	"explanation" varchar,
  	"verification_status" "enum_consultation_types_verification_status" DEFAULT 'TO_BE_CONFIRMED' NOT NULL,
  	"verification_last_verified" varchar,
  	"verification_verified_by" varchar,
  	"verification_review_due" varchar,
  	"verification_internal_notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "opening_hour_exceptions_intervals" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"start" varchar NOT NULL,
  	"end" varchar NOT NULL,
  	"consultation_type" "enum_opening_hour_exceptions_intervals_consultation_type" NOT NULL
  );
  
  CREATE TABLE "opening_hour_exceptions_verification_source_ids" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"source_id" varchar NOT NULL
  );
  
  CREATE TABLE "opening_hour_exceptions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"record_id" varchar NOT NULL,
  	"kind" "enum_opening_hour_exceptions_kind" NOT NULL,
  	"start_date" varchar NOT NULL,
  	"end_date" varchar NOT NULL,
  	"reason" varchar,
  	"public_message" varchar,
  	"priority" numeric DEFAULT 10 NOT NULL,
  	"verification_status" "enum_opening_hour_exceptions_verification_status" DEFAULT 'TO_BE_CONFIRMED' NOT NULL,
  	"verification_last_verified" varchar,
  	"verification_verified_by" varchar,
  	"verification_review_due" varchar,
  	"verification_internal_notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "closures_replacements" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"replacement_practice_id" varchar NOT NULL,
  	"from" varchar NOT NULL,
  	"until" varchar NOT NULL,
  	"note" varchar
  );
  
  CREATE TABLE "closures_emergency_information_ids" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"emergency_id" varchar NOT NULL
  );
  
  CREATE TABLE "closures_verification_source_ids" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"source_id" varchar NOT NULL
  );
  
  CREATE TABLE "closures" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"record_id" varchar NOT NULL,
  	"kind" "enum_closures_kind" NOT NULL,
  	"start_date" varchar NOT NULL,
  	"end_date" varchar NOT NULL,
  	"announce_from" varchar,
  	"public_message" varchar,
  	"verification_status" "enum_closures_verification_status" DEFAULT 'TO_BE_CONFIRMED' NOT NULL,
  	"verification_last_verified" varchar,
  	"verification_verified_by" varchar,
  	"verification_review_due" varchar,
  	"verification_internal_notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "replacement_practices_contact_persons" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL
  );
  
  CREATE TABLE "replacement_practices_verification_source_ids" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"source_id" varchar NOT NULL
  );
  
  CREATE TABLE "replacement_practices" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"record_id" varchar NOT NULL,
  	"practice_name" varchar NOT NULL,
  	"street" varchar NOT NULL,
  	"postal_code" varchar NOT NULL,
  	"city" varchar NOT NULL,
  	"phone" varchar NOT NULL,
  	"email" varchar,
  	"website" varchar,
  	"public_note" varchar,
  	"verification_status" "enum_replacement_practices_verification_status" DEFAULT 'TO_BE_CONFIRMED' NOT NULL,
  	"verification_last_verified" varchar,
  	"verification_verified_by" varchar,
  	"verification_review_due" varchar,
  	"verification_internal_notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "announcements_verification_source_ids" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"source_id" varchar NOT NULL
  );
  
  CREATE TABLE "announcements" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"record_id" varchar NOT NULL,
  	"category" "enum_announcements_category" NOT NULL,
  	"title" varchar NOT NULL,
  	"short_text" varchar NOT NULL,
  	"valid_from" varchar NOT NULL,
  	"valid_until" varchar,
  	"open_ended" boolean DEFAULT false,
  	"priority" numeric DEFAULT 10 NOT NULL,
  	"homepage_highlight" boolean DEFAULT false,
  	"published" boolean DEFAULT false,
  	"verification_status" "enum_announcements_verification_status" DEFAULT 'TO_BE_CONFIRMED' NOT NULL,
  	"verification_last_verified" varchar,
  	"verification_verified_by" varchar,
  	"verification_review_due" varchar,
  	"verification_internal_notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "audit_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event_id" varchar NOT NULL,
  	"at" varchar NOT NULL,
  	"actor_id" varchar NOT NULL,
  	"actor_name" varchar NOT NULL,
  	"actor_role" varchar NOT NULL,
  	"entity_type" varchar NOT NULL,
  	"entity_id" varchar NOT NULL,
  	"operation" varchar NOT NULL,
  	"publish_state" varchar NOT NULL,
  	"change_set_id" varchar,
  	"revert_of" varchar,
  	"previous" jsonb,
  	"next" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"staff_id" integer,
  	"weekly_schedules_id" integer,
  	"consultation_types_id" integer,
  	"opening_hour_exceptions_id" integer,
  	"closures_id" integer,
  	"replacement_practices_id" integer,
  	"announcements_id" integer,
  	"audit_events_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"staff_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "holiday_calendar_holidays" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" varchar NOT NULL,
  	"name" varchar
  );
  
  CREATE TABLE "holiday_calendar_policy_verification_source_ids" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"source_id" varchar NOT NULL
  );
  
  CREATE TABLE "holiday_calendar" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"policy" "enum_holiday_calendar_policy" DEFAULT 'REQUIRE_EXPLICIT_ENTRY' NOT NULL,
  	"policy_verification_status" "enum_holiday_calendar_policy_verification_status" DEFAULT 'TO_BE_CONFIRMED' NOT NULL,
  	"policy_verification_last_verified" varchar,
  	"policy_verification_verified_by" varchar,
  	"policy_verification_review_due" varchar,
  	"policy_verification_internal_notes" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "staff_sessions" ADD CONSTRAINT "staff_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "weekly_schedules_rules_verification_source_ids" ADD CONSTRAINT "weekly_schedules_rules_verification_source_ids_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."weekly_schedules_rules"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "weekly_schedules_rules" ADD CONSTRAINT "weekly_schedules_rules_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."weekly_schedules"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "weekly_schedules_confirmed_closed_weekdays" ADD CONSTRAINT "weekly_schedules_confirmed_closed_weekdays_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."weekly_schedules"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "weekly_schedules_verification_source_ids" ADD CONSTRAINT "weekly_schedules_verification_source_ids_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."weekly_schedules"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "consultation_types_verification_source_ids" ADD CONSTRAINT "consultation_types_verification_source_ids_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."consultation_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "opening_hour_exceptions_intervals" ADD CONSTRAINT "opening_hour_exceptions_intervals_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."opening_hour_exceptions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "opening_hour_exceptions_verification_source_ids" ADD CONSTRAINT "opening_hour_exceptions_verification_source_ids_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."opening_hour_exceptions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "closures_replacements" ADD CONSTRAINT "closures_replacements_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."closures"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "closures_emergency_information_ids" ADD CONSTRAINT "closures_emergency_information_ids_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."closures"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "closures_verification_source_ids" ADD CONSTRAINT "closures_verification_source_ids_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."closures"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "replacement_practices_contact_persons" ADD CONSTRAINT "replacement_practices_contact_persons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."replacement_practices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "replacement_practices_verification_source_ids" ADD CONSTRAINT "replacement_practices_verification_source_ids_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."replacement_practices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "announcements_verification_source_ids" ADD CONSTRAINT "announcements_verification_source_ids_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_staff_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_weekly_schedules_fk" FOREIGN KEY ("weekly_schedules_id") REFERENCES "public"."weekly_schedules"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_consultation_types_fk" FOREIGN KEY ("consultation_types_id") REFERENCES "public"."consultation_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_opening_hour_exceptions_fk" FOREIGN KEY ("opening_hour_exceptions_id") REFERENCES "public"."opening_hour_exceptions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_closures_fk" FOREIGN KEY ("closures_id") REFERENCES "public"."closures"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_replacement_practices_fk" FOREIGN KEY ("replacement_practices_id") REFERENCES "public"."replacement_practices"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_announcements_fk" FOREIGN KEY ("announcements_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audit_events_fk" FOREIGN KEY ("audit_events_id") REFERENCES "public"."audit_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_staff_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "holiday_calendar_holidays" ADD CONSTRAINT "holiday_calendar_holidays_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."holiday_calendar"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "holiday_calendar_policy_verification_source_ids" ADD CONSTRAINT "holiday_calendar_policy_verification_source_ids_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."holiday_calendar"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "staff_sessions_order_idx" ON "staff_sessions" USING btree ("_order");
  CREATE INDEX "staff_sessions_parent_id_idx" ON "staff_sessions" USING btree ("_parent_id");
  CREATE INDEX "staff_updated_at_idx" ON "staff" USING btree ("updated_at");
  CREATE INDEX "staff_created_at_idx" ON "staff" USING btree ("created_at");
  CREATE UNIQUE INDEX "staff_email_idx" ON "staff" USING btree ("email");
  CREATE INDEX "weekly_schedules_rules_verification_source_ids_order_idx" ON "weekly_schedules_rules_verification_source_ids" USING btree ("_order");
  CREATE INDEX "weekly_schedules_rules_verification_source_ids_parent_id_idx" ON "weekly_schedules_rules_verification_source_ids" USING btree ("_parent_id");
  CREATE INDEX "weekly_schedules_rules_order_idx" ON "weekly_schedules_rules" USING btree ("_order");
  CREATE INDEX "weekly_schedules_rules_parent_id_idx" ON "weekly_schedules_rules" USING btree ("_parent_id");
  CREATE INDEX "weekly_schedules_confirmed_closed_weekdays_order_idx" ON "weekly_schedules_confirmed_closed_weekdays" USING btree ("order");
  CREATE INDEX "weekly_schedules_confirmed_closed_weekdays_parent_idx" ON "weekly_schedules_confirmed_closed_weekdays" USING btree ("parent_id");
  CREATE INDEX "weekly_schedules_verification_source_ids_order_idx" ON "weekly_schedules_verification_source_ids" USING btree ("_order");
  CREATE INDEX "weekly_schedules_verification_source_ids_parent_id_idx" ON "weekly_schedules_verification_source_ids" USING btree ("_parent_id");
  CREATE INDEX "weekly_schedules_updated_at_idx" ON "weekly_schedules" USING btree ("updated_at");
  CREATE INDEX "weekly_schedules_created_at_idx" ON "weekly_schedules" USING btree ("created_at");
  CREATE INDEX "consultation_types_verification_source_ids_order_idx" ON "consultation_types_verification_source_ids" USING btree ("_order");
  CREATE INDEX "consultation_types_verification_source_ids_parent_id_idx" ON "consultation_types_verification_source_ids" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "consultation_types_code_idx" ON "consultation_types" USING btree ("code");
  CREATE INDEX "consultation_types_updated_at_idx" ON "consultation_types" USING btree ("updated_at");
  CREATE INDEX "consultation_types_created_at_idx" ON "consultation_types" USING btree ("created_at");
  CREATE INDEX "opening_hour_exceptions_intervals_order_idx" ON "opening_hour_exceptions_intervals" USING btree ("_order");
  CREATE INDEX "opening_hour_exceptions_intervals_parent_id_idx" ON "opening_hour_exceptions_intervals" USING btree ("_parent_id");
  CREATE INDEX "opening_hour_exceptions_verification_source_ids_order_idx" ON "opening_hour_exceptions_verification_source_ids" USING btree ("_order");
  CREATE INDEX "opening_hour_exceptions_verification_source_ids_parent_id_idx" ON "opening_hour_exceptions_verification_source_ids" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "opening_hour_exceptions_record_id_idx" ON "opening_hour_exceptions" USING btree ("record_id");
  CREATE INDEX "opening_hour_exceptions_updated_at_idx" ON "opening_hour_exceptions" USING btree ("updated_at");
  CREATE INDEX "opening_hour_exceptions_created_at_idx" ON "opening_hour_exceptions" USING btree ("created_at");
  CREATE INDEX "closures_replacements_order_idx" ON "closures_replacements" USING btree ("_order");
  CREATE INDEX "closures_replacements_parent_id_idx" ON "closures_replacements" USING btree ("_parent_id");
  CREATE INDEX "closures_emergency_information_ids_order_idx" ON "closures_emergency_information_ids" USING btree ("_order");
  CREATE INDEX "closures_emergency_information_ids_parent_id_idx" ON "closures_emergency_information_ids" USING btree ("_parent_id");
  CREATE INDEX "closures_verification_source_ids_order_idx" ON "closures_verification_source_ids" USING btree ("_order");
  CREATE INDEX "closures_verification_source_ids_parent_id_idx" ON "closures_verification_source_ids" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "closures_record_id_idx" ON "closures" USING btree ("record_id");
  CREATE INDEX "closures_updated_at_idx" ON "closures" USING btree ("updated_at");
  CREATE INDEX "closures_created_at_idx" ON "closures" USING btree ("created_at");
  CREATE INDEX "replacement_practices_contact_persons_order_idx" ON "replacement_practices_contact_persons" USING btree ("_order");
  CREATE INDEX "replacement_practices_contact_persons_parent_id_idx" ON "replacement_practices_contact_persons" USING btree ("_parent_id");
  CREATE INDEX "replacement_practices_verification_source_ids_order_idx" ON "replacement_practices_verification_source_ids" USING btree ("_order");
  CREATE INDEX "replacement_practices_verification_source_ids_parent_id_idx" ON "replacement_practices_verification_source_ids" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "replacement_practices_record_id_idx" ON "replacement_practices" USING btree ("record_id");
  CREATE INDEX "replacement_practices_updated_at_idx" ON "replacement_practices" USING btree ("updated_at");
  CREATE INDEX "replacement_practices_created_at_idx" ON "replacement_practices" USING btree ("created_at");
  CREATE INDEX "announcements_verification_source_ids_order_idx" ON "announcements_verification_source_ids" USING btree ("_order");
  CREATE INDEX "announcements_verification_source_ids_parent_id_idx" ON "announcements_verification_source_ids" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "announcements_record_id_idx" ON "announcements" USING btree ("record_id");
  CREATE INDEX "announcements_updated_at_idx" ON "announcements" USING btree ("updated_at");
  CREATE INDEX "announcements_created_at_idx" ON "announcements" USING btree ("created_at");
  CREATE UNIQUE INDEX "audit_events_event_id_idx" ON "audit_events" USING btree ("event_id");
  CREATE INDEX "audit_events_at_idx" ON "audit_events" USING btree ("at");
  CREATE INDEX "audit_events_actor_id_idx" ON "audit_events" USING btree ("actor_id");
  CREATE INDEX "audit_events_entity_type_idx" ON "audit_events" USING btree ("entity_type");
  CREATE INDEX "audit_events_entity_id_idx" ON "audit_events" USING btree ("entity_id");
  CREATE INDEX "audit_events_change_set_id_idx" ON "audit_events" USING btree ("change_set_id");
  CREATE INDEX "audit_events_updated_at_idx" ON "audit_events" USING btree ("updated_at");
  CREATE INDEX "audit_events_created_at_idx" ON "audit_events" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_staff_id_idx" ON "payload_locked_documents_rels" USING btree ("staff_id");
  CREATE INDEX "payload_locked_documents_rels_weekly_schedules_id_idx" ON "payload_locked_documents_rels" USING btree ("weekly_schedules_id");
  CREATE INDEX "payload_locked_documents_rels_consultation_types_id_idx" ON "payload_locked_documents_rels" USING btree ("consultation_types_id");
  CREATE INDEX "payload_locked_documents_rels_opening_hour_exceptions_id_idx" ON "payload_locked_documents_rels" USING btree ("opening_hour_exceptions_id");
  CREATE INDEX "payload_locked_documents_rels_closures_id_idx" ON "payload_locked_documents_rels" USING btree ("closures_id");
  CREATE INDEX "payload_locked_documents_rels_replacement_practices_id_idx" ON "payload_locked_documents_rels" USING btree ("replacement_practices_id");
  CREATE INDEX "payload_locked_documents_rels_announcements_id_idx" ON "payload_locked_documents_rels" USING btree ("announcements_id");
  CREATE INDEX "payload_locked_documents_rels_audit_events_id_idx" ON "payload_locked_documents_rels" USING btree ("audit_events_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_staff_id_idx" ON "payload_preferences_rels" USING btree ("staff_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "holiday_calendar_holidays_order_idx" ON "holiday_calendar_holidays" USING btree ("_order");
  CREATE INDEX "holiday_calendar_holidays_parent_id_idx" ON "holiday_calendar_holidays" USING btree ("_parent_id");
  CREATE INDEX "holiday_calendar_policy_verification_source_ids_order_idx" ON "holiday_calendar_policy_verification_source_ids" USING btree ("_order");
  CREATE INDEX "holiday_calendar_policy_verification_source_ids_parent_id_idx" ON "holiday_calendar_policy_verification_source_ids" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "staff_sessions" CASCADE;
  DROP TABLE "staff" CASCADE;
  DROP TABLE "weekly_schedules_rules_verification_source_ids" CASCADE;
  DROP TABLE "weekly_schedules_rules" CASCADE;
  DROP TABLE "weekly_schedules_confirmed_closed_weekdays" CASCADE;
  DROP TABLE "weekly_schedules_verification_source_ids" CASCADE;
  DROP TABLE "weekly_schedules" CASCADE;
  DROP TABLE "consultation_types_verification_source_ids" CASCADE;
  DROP TABLE "consultation_types" CASCADE;
  DROP TABLE "opening_hour_exceptions_intervals" CASCADE;
  DROP TABLE "opening_hour_exceptions_verification_source_ids" CASCADE;
  DROP TABLE "opening_hour_exceptions" CASCADE;
  DROP TABLE "closures_replacements" CASCADE;
  DROP TABLE "closures_emergency_information_ids" CASCADE;
  DROP TABLE "closures_verification_source_ids" CASCADE;
  DROP TABLE "closures" CASCADE;
  DROP TABLE "replacement_practices_contact_persons" CASCADE;
  DROP TABLE "replacement_practices_verification_source_ids" CASCADE;
  DROP TABLE "replacement_practices" CASCADE;
  DROP TABLE "announcements_verification_source_ids" CASCADE;
  DROP TABLE "announcements" CASCADE;
  DROP TABLE "audit_events" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "holiday_calendar_holidays" CASCADE;
  DROP TABLE "holiday_calendar_policy_verification_source_ids" CASCADE;
  DROP TABLE "holiday_calendar" CASCADE;
  DROP TYPE "public"."enum_staff_role";
  DROP TYPE "public"."enum_weekly_schedules_rules_weekday";
  DROP TYPE "public"."enum_weekly_schedules_rules_consultation_type";
  DROP TYPE "public"."enum_weekly_schedules_rules_verification_status";
  DROP TYPE "public"."enum_weekly_schedules_confirmed_closed_weekdays";
  DROP TYPE "public"."enum_weekly_schedules_verification_status";
  DROP TYPE "public"."enum_consultation_types_code";
  DROP TYPE "public"."enum_consultation_types_verification_status";
  DROP TYPE "public"."enum_opening_hour_exceptions_intervals_consultation_type";
  DROP TYPE "public"."enum_opening_hour_exceptions_kind";
  DROP TYPE "public"."enum_opening_hour_exceptions_verification_status";
  DROP TYPE "public"."enum_closures_kind";
  DROP TYPE "public"."enum_closures_verification_status";
  DROP TYPE "public"."enum_replacement_practices_verification_status";
  DROP TYPE "public"."enum_announcements_category";
  DROP TYPE "public"."enum_announcements_verification_status";
  DROP TYPE "public"."enum_holiday_calendar_policy";
  DROP TYPE "public"."enum_holiday_calendar_policy_verification_status";`)
}
