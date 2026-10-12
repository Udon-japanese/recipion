CREATE TABLE "admin_notification_log" (
	"kind" text PRIMARY KEY NOT NULL,
	"last_sent_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingredient" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"stock_unit_code" text NOT NULL,
	"stock_unit_label" text NOT NULL,
	"default_expiry_kind" text,
	"default_storage" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "ingredient_id_user_id_unique" UNIQUE("id","user_id"),
	CONSTRAINT "ingredient_default_expiry_kind_valid" CHECK ("ingredient"."default_expiry_kind" is null or "ingredient"."default_expiry_kind" in ('use-by', 'best-before', 'none')),
	CONSTRAINT "ingredient_default_storage_valid" CHECK ("ingredient"."default_storage" is null or "ingredient"."default_storage" in ('room', 'fridge', 'freezer'))
);
--> statement-breakpoint
CREATE TABLE "ingredient_alias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ingredient_alias_user_normalized_name_unique" UNIQUE("user_id","normalized_name")
);
--> statement-breakpoint
CREATE TABLE "inventory_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"ingredient_id" uuid NOT NULL,
	"tracking_mode" text DEFAULT 'estimated' NOT NULL,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "inventory_item_id_user_id_unique" UNIQUE("id","user_id"),
	CONSTRAINT "inventory_item_user_ingredient_unique" UNIQUE("user_id","ingredient_id"),
	CONSTRAINT "inventory_item_display_name_valid" CHECK ("inventory_item"."display_name" is null or char_length(btrim("inventory_item"."display_name")) between 1 and 50),
	CONSTRAINT "inventory_item_tracking_mode_valid" CHECK ("inventory_item"."tracking_mode" in ('exact', 'estimated', 'presence'))
);
--> statement-breakpoint
CREATE TABLE "inventory_lot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"quantity" numeric(18, 6) DEFAULT '0' NOT NULL,
	"acquired_on" date NOT NULL,
	"storage" text,
	"expires_on" date,
	"expiry_kind" text,
	"expiry_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_lot_id_user_id_unique" UNIQUE("id","user_id"),
	CONSTRAINT "inventory_lot_quantity_nonnegative" CHECK ("inventory_lot"."quantity" >= 0),
	CONSTRAINT "inventory_lot_storage_valid" CHECK ("inventory_lot"."storage" is null or "inventory_lot"."storage" in ('room', 'fridge', 'freezer')),
	CONSTRAINT "inventory_lot_expiry_kind_valid" CHECK ("inventory_lot"."expiry_kind" is null or "inventory_lot"."expiry_kind" in ('use-by', 'best-before', 'none')),
	CONSTRAINT "inventory_lot_expiry_source_valid" CHECK ("inventory_lot"."expiry_source" is null or "inventory_lot"."expiry_source" in ('entered', 'estimated'))
);
--> statement-breakpoint
CREATE TABLE "inventory_transaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"inventory_lot_id" uuid,
	"input_quantity" numeric(18, 6) NOT NULL,
	"input_unit_code" text NOT NULL,
	"requested_quantity_delta" numeric(18, 6) NOT NULL,
	"quantity_delta" numeric(18, 6) NOT NULL,
	"resulting_quantity" numeric(18, 6) NOT NULL,
	"stock_unit_code" text NOT NULL,
	"reason" text NOT NULL,
	"source_type" text,
	"source_id" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_transaction_input_quantity_positive" CHECK ("inventory_transaction"."input_quantity" > 0),
	CONSTRAINT "inventory_transaction_requested_delta_nonzero" CHECK ("inventory_transaction"."requested_quantity_delta" <> 0),
	CONSTRAINT "inventory_transaction_result_nonnegative" CHECK ("inventory_transaction"."resulting_quantity" >= 0)
);
--> statement-breakpoint
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
CREATE TABLE "recipe" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"public_id" text NOT NULL,
	"name" text NOT NULL,
	"servings" numeric(10, 3) NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"source_url" text,
	"visibility" text DEFAULT 'private' NOT NULL,
	"unlisted_passphrase" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recipe_id_user_id_unique" UNIQUE("id","user_id"),
	CONSTRAINT "recipe_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "recipe_public_id_nonempty" CHECK (length("recipe"."public_id") > 0),
	CONSTRAINT "recipe_source_url_http" CHECK ("recipe"."source_url" IS NULL OR "recipe"."source_url" ~* '^https?://'),
	CONSTRAINT "recipe_visibility_valid" CHECK ("recipe"."visibility" IN ('private', 'unlisted', 'public')),
	CONSTRAINT "recipe_public_has_no_source_url" CHECK ("recipe"."visibility" = 'private' OR "recipe"."source_url" IS NULL),
	CONSTRAINT "recipe_unlisted_has_passphrase" CHECK (("recipe"."visibility" = 'unlisted') = ("recipe"."unlisted_passphrase" IS NOT NULL)),
	CONSTRAINT "recipe_name_nonempty" CHECK (length(trim("recipe"."name")) > 0),
	CONSTRAINT "recipe_servings_positive" CHECK ("recipe"."servings" > 0)
);
--> statement-breakpoint
CREATE TABLE "recipe_ingredient_node" (
	"id" uuid PRIMARY KEY NOT NULL,
	"recipe_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"parent_id" uuid,
	"sort_order" integer NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"raw_text" text NOT NULL,
	"inferred" boolean,
	"status" text,
	"amount_text" text,
	"quantity" numeric(18, 6),
	"unit_label" text,
	CONSTRAINT "recipe_ingredient_id_recipe_id_unique" UNIQUE("id","recipe_id"),
	CONSTRAINT "recipe_ingredient_sort_order_nonnegative" CHECK ("recipe_ingredient_node"."sort_order" >= 0),
	CONSTRAINT "recipe_ingredient_name_nonempty" CHECK (length(trim("recipe_ingredient_node"."name")) > 0),
	CONSTRAINT "recipe_ingredient_shape_valid" CHECK (((
				"recipe_ingredient_node"."type" = 'group'
				AND "recipe_ingredient_node"."inferred" IS NOT NULL
				AND "recipe_ingredient_node"."status" IS NULL
				AND "recipe_ingredient_node"."amount_text" IS NULL
				AND "recipe_ingredient_node"."quantity" IS NULL
				AND "recipe_ingredient_node"."unit_label" IS NULL
			) OR (
				"recipe_ingredient_node"."type" = 'ingredient'
				AND "recipe_ingredient_node"."inferred" IS NULL
				AND (
					"recipe_ingredient_node"."status" = 'parsed'
					AND "recipe_ingredient_node"."amount_text" IS NOT NULL
					AND ("recipe_ingredient_node"."quantity" IS NULL OR "recipe_ingredient_node"."quantity" > 0)
					OR
					"recipe_ingredient_node"."status" = 'missing-amount'
					AND "recipe_ingredient_node"."amount_text" IS NULL
					AND "recipe_ingredient_node"."quantity" IS NULL
					AND "recipe_ingredient_node"."unit_label" IS NULL
				))
		) IS TRUE)
);
--> statement-breakpoint
CREATE TABLE "recipe_instruction" (
	"id" uuid PRIMARY KEY NOT NULL,
	"recipe_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"sort_order" integer NOT NULL,
	"text" text NOT NULL,
	"referenced_instruction_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "recipe_instruction_sort_order_nonnegative" CHECK ("recipe_instruction"."sort_order" >= 0),
	CONSTRAINT "recipe_instruction_text_nonempty" CHECK (length(trim("recipe_instruction"."text")) > 0)
);
--> statement-breakpoint
CREATE TABLE "recipe_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"label" text NOT NULL,
	"target_recipe_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recipe_link_recipe_label_unique" UNIQUE("recipe_id","label"),
	CONSTRAINT "recipe_link_label_valid" CHECK (char_length("recipe_link"."label") BETWEEN 1 AND 100 AND "recipe_link"."label" = btrim("recipe_link"."label") AND "recipe_link"."label" !~ '[\[\]\n\r]')
);
--> statement-breakpoint
CREATE TABLE "recipe_preparation" (
	"id" uuid PRIMARY KEY NOT NULL,
	"recipe_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"sort_order" integer NOT NULL,
	"text" text NOT NULL,
	CONSTRAINT "recipe_preparation_sort_order_nonnegative" CHECK ("recipe_preparation"."sort_order" >= 0),
	CONSTRAINT "recipe_preparation_text_nonempty" CHECK (length(trim("recipe_preparation"."text")) > 0)
);
--> statement-breakpoint
CREATE TABLE "recipe_unlock" (
	"recipe_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recipe_unlock_recipe_id_user_id_pk" PRIMARY KEY("recipe_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "recipe_unlock_attempt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
	CONSTRAINT "recipe_report_reason_valid" CHECK ("recipe_report"."reason" IN ('copyright', 'inappropriate', 'other', 'auto-detected')),
	CONSTRAINT "recipe_report_detail_length" CHECK (char_length("recipe_report"."detail") <= 1000),
	CONSTRAINT "recipe_report_resolution_valid" CHECK (("recipe_report"."status" = 'open' AND "recipe_report"."resolution" IS NULL AND "recipe_report"."resolved_at" IS NULL) OR ("recipe_report"."status" = 'resolved' AND "recipe_report"."resolution" IN ('made-private', 'deleted', 'dismissed') AND "recipe_report"."resolved_at" IS NOT NULL))
);
--> statement-breakpoint
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
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"handle" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_handle_unique" UNIQUE("handle"),
	CONSTRAINT "user_handle_format" CHECK ("user"."handle" ~ '^[a-z0-9_-]{3,20}$')
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ingredient" ADD CONSTRAINT "ingredient_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_alias" ADD CONSTRAINT "ingredient_alias_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_alias" ADD CONSTRAINT "ingredient_alias_ingredient_owner_fk" FOREIGN KEY ("ingredient_id","user_id") REFERENCES "public"."ingredient"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_item" ADD CONSTRAINT "inventory_item_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_item" ADD CONSTRAINT "inventory_item_ingredient_owner_fk" FOREIGN KEY ("ingredient_id","user_id") REFERENCES "public"."ingredient"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_lot" ADD CONSTRAINT "inventory_lot_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_lot" ADD CONSTRAINT "inventory_lot_item_owner_fk" FOREIGN KEY ("inventory_item_id","user_id") REFERENCES "public"."inventory_item"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transaction" ADD CONSTRAINT "inventory_transaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transaction" ADD CONSTRAINT "inventory_transaction_inventory_lot_id_inventory_lot_id_fk" FOREIGN KEY ("inventory_lot_id") REFERENCES "public"."inventory_lot"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transaction" ADD CONSTRAINT "inventory_transaction_item_owner_fk" FOREIGN KEY ("inventory_item_id","user_id") REFERENCES "public"."inventory_item"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_suspension" ADD CONSTRAINT "account_suspension_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_cache" ADD CONSTRAINT "moderation_cache_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_violation" ADD CONSTRAINT "moderation_violation_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suspension_appeal" ADD CONSTRAINT "suspension_appeal_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe" ADD CONSTRAINT "recipe_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredient_node" ADD CONSTRAINT "recipe_ingredient_recipe_owner_fk" FOREIGN KEY ("recipe_id","user_id") REFERENCES "public"."recipe"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredient_node" ADD CONSTRAINT "recipe_ingredient_parent_same_recipe_fk" FOREIGN KEY ("parent_id","recipe_id") REFERENCES "public"."recipe_ingredient_node"("id","recipe_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_instruction" ADD CONSTRAINT "recipe_instruction_recipe_owner_fk" FOREIGN KEY ("recipe_id","user_id") REFERENCES "public"."recipe"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_link" ADD CONSTRAINT "recipe_link_recipe_owner_fk" FOREIGN KEY ("recipe_id","user_id") REFERENCES "public"."recipe"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_link" ADD CONSTRAINT "recipe_link_target_fk" FOREIGN KEY ("target_recipe_id") REFERENCES "public"."recipe"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_preparation" ADD CONSTRAINT "recipe_preparation_recipe_owner_fk" FOREIGN KEY ("recipe_id","user_id") REFERENCES "public"."recipe"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_unlock" ADD CONSTRAINT "recipe_unlock_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_unlock" ADD CONSTRAINT "recipe_unlock_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_unlock_attempt" ADD CONSTRAINT "recipe_unlock_attempt_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_report" ADD CONSTRAINT "recipe_report_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_report" ADD CONSTRAINT "recipe_report_reporter_user_id_user_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_report" ADD CONSTRAINT "user_report_reported_user_id_user_id_fk" FOREIGN KEY ("reported_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_report" ADD CONSTRAINT "user_report_reporter_user_id_user_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ingredient_user_id_idx" ON "ingredient" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ingredient_alias_ingredient_id_idx" ON "ingredient_alias" USING btree ("ingredient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_alias_primary_unique" ON "ingredient_alias" USING btree ("ingredient_id") WHERE "ingredient_alias"."is_primary" = true;--> statement-breakpoint
CREATE INDEX "inventory_item_user_id_idx" ON "inventory_item" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "inventory_lot_item_id_idx" ON "inventory_lot" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE INDEX "inventory_lot_user_expires_on_idx" ON "inventory_lot" USING btree ("user_id","expires_on");--> statement-breakpoint
CREATE INDEX "inventory_transaction_user_occurred_at_idx" ON "inventory_transaction" USING btree ("user_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "inventory_transaction_item_occurred_at_idx" ON "inventory_transaction" USING btree ("inventory_item_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "moderation_cache_user_created_idx" ON "moderation_cache" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "moderation_violation_user_created_idx" ON "moderation_violation" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "suspension_appeal_status_created_idx" ON "suspension_appeal" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "suspension_appeal_user_created_idx" ON "suspension_appeal" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "recipe_user_id_idx" ON "recipe" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recipe_ingredient_recipe_order_idx" ON "recipe_ingredient_node" USING btree ("recipe_id","sort_order");--> statement-breakpoint
CREATE INDEX "recipe_ingredient_parent_order_idx" ON "recipe_ingredient_node" USING btree ("parent_id","sort_order");--> statement-breakpoint
CREATE INDEX "recipe_instruction_recipe_order_idx" ON "recipe_instruction" USING btree ("recipe_id","sort_order");--> statement-breakpoint
CREATE INDEX "recipe_link_recipe_id_idx" ON "recipe_link" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "recipe_link_target_idx" ON "recipe_link" USING btree ("target_recipe_id");--> statement-breakpoint
CREATE INDEX "recipe_preparation_recipe_order_idx" ON "recipe_preparation" USING btree ("recipe_id","sort_order");--> statement-breakpoint
CREATE INDEX "recipe_unlock_attempt_recent_idx" ON "recipe_unlock_attempt" USING btree ("user_id","public_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_report_open_unique" ON "recipe_report" USING btree ("recipe_id","reporter_user_id") WHERE "recipe_report"."status" = 'open';--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_report_auto_open_unique" ON "recipe_report" USING btree ("recipe_id") WHERE "recipe_report"."reason" = 'auto-detected' AND "recipe_report"."status" = 'open';--> statement-breakpoint
CREATE INDEX "recipe_report_status_created_idx" ON "recipe_report" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "recipe_report_reporter_created_idx" ON "recipe_report" USING btree ("reporter_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_report_open_unique" ON "user_report" USING btree ("reported_user_id","reporter_user_id") WHERE "user_report"."status" = 'open';--> statement-breakpoint
CREATE INDEX "user_report_status_created_idx" ON "user_report" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "user_report_reporter_created_idx" ON "user_report" USING btree ("reporter_user_id","created_at");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");