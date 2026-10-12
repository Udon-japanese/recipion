CREATE TABLE "user_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reported_user_id" text,
	"reported_name" text NOT NULL,
	"reported_handle" text NOT NULL,
	"reporter_user_id" text,
	"reason" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolution" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "user_report_reason_valid" CHECK ("user_report"."reason" IN ('inappropriate', 'impersonation', 'other')),
	CONSTRAINT "user_report_detail_length" CHECK (char_length("user_report"."detail") <= 1000),
	CONSTRAINT "user_report_resolution_valid" CHECK (("user_report"."status" = 'open' AND "user_report"."resolution" IS NULL AND "user_report"."resolved_at" IS NULL) OR ("user_report"."status" = 'resolved' AND "user_report"."resolution" IN ('name-reset', 'suspended', 'dismissed') AND "user_report"."resolved_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "user_report" ADD CONSTRAINT "user_report_reported_user_id_user_id_fk" FOREIGN KEY ("reported_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_report" ADD CONSTRAINT "user_report_reporter_user_id_user_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_report_open_unique" ON "user_report" USING btree ("reported_user_id","reporter_user_id") WHERE "user_report"."status" = 'open';--> statement-breakpoint
CREATE INDEX "user_report_status_created_idx" ON "user_report" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "user_report_reporter_created_idx" ON "user_report" USING btree ("reporter_user_id","created_at");