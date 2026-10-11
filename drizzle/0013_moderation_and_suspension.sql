CREATE TABLE "account_suspension" (
	"user_id" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"reason" text NOT NULL,
	"suspended_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_suspension_status_valid" CHECK ("account_suspension"."status" IN ('suspended', 'banned'))
);
--> statement-breakpoint
CREATE TABLE "banned_email" (
	"email_hash" text PRIMARY KEY NOT NULL,
	"banned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_cache" (
	"content_hash" text PRIMARY KEY NOT NULL,
	"decision" text NOT NULL,
	"reasons" jsonb NOT NULL,
	"user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "moderation_cache_decision_valid" CHECK ("moderation_cache"."decision" IN ('allow', 'flag', 'block'))
);
--> statement-breakpoint
CREATE TABLE "moderation_violation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"categories" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suspension_appeal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"message" text NOT NULL,
	"ai_verdict" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolution" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "suspension_appeal_message_length" CHECK (char_length("suspension_appeal"."message") BETWEEN 1 AND 1000),
	CONSTRAINT "suspension_appeal_verdict_valid" CHECK ("suspension_appeal"."ai_verdict" IN ('legitimate', 'not-legitimate', 'unsure', 'not-judged')),
	CONSTRAINT "suspension_appeal_resolution_valid" CHECK (("suspension_appeal"."status" = 'open' AND "suspension_appeal"."resolution" IS NULL AND "suspension_appeal"."resolved_at" IS NULL) OR ("suspension_appeal"."status" = 'resolved' AND "suspension_appeal"."resolution" IN ('lifted', 'banned', 'rejected') AND "suspension_appeal"."resolved_at" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "recipe_report" DROP CONSTRAINT "recipe_report_reason_valid";--> statement-breakpoint
ALTER TABLE "account_suspension" ADD CONSTRAINT "account_suspension_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_cache" ADD CONSTRAINT "moderation_cache_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_violation" ADD CONSTRAINT "moderation_violation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suspension_appeal" ADD CONSTRAINT "suspension_appeal_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "moderation_cache_user_created_idx" ON "moderation_cache" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "moderation_violation_user_created_idx" ON "moderation_violation" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "suspension_appeal_status_created_idx" ON "suspension_appeal" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "suspension_appeal_user_created_idx" ON "suspension_appeal" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_report_auto_open_unique" ON "recipe_report" USING btree ("recipe_id") WHERE "recipe_report"."reason" = 'auto-detected' AND "recipe_report"."status" = 'open';--> statement-breakpoint
ALTER TABLE "recipe_report" ADD CONSTRAINT "recipe_report_reason_valid" CHECK ("recipe_report"."reason" IN ('copyright', 'inappropriate', 'other', 'auto-detected'));