CREATE TABLE "recipe_report" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid,
	"recipe_public_id" text NOT NULL,
	"recipe_name" text NOT NULL,
	"reporter_user_id" text,
	"reason" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolution" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "recipe_report_reason_valid" CHECK ("recipe_report"."reason" IN ('copyright', 'inappropriate', 'other')),
	CONSTRAINT "recipe_report_detail_length" CHECK (char_length("recipe_report"."detail") <= 1000),
	CONSTRAINT "recipe_report_resolution_valid" CHECK (("recipe_report"."status" = 'open' AND "recipe_report"."resolution" IS NULL AND "recipe_report"."resolved_at" IS NULL) OR ("recipe_report"."status" = 'resolved' AND "recipe_report"."resolution" IN ('made-private', 'deleted', 'dismissed') AND "recipe_report"."resolved_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "recipe_report" ADD CONSTRAINT "recipe_report_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_report" ADD CONSTRAINT "recipe_report_reporter_user_id_user_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_report_open_unique" ON "recipe_report" USING btree ("recipe_id","reporter_user_id") WHERE "recipe_report"."status" = 'open';--> statement-breakpoint
CREATE INDEX "recipe_report_status_created_idx" ON "recipe_report" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "recipe_report_reporter_created_idx" ON "recipe_report" USING btree ("reporter_user_id","created_at");