CREATE TABLE "shopping_record" (
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"id" text NOT NULL,
	"data" jsonb,
	"deleted" boolean DEFAULT false NOT NULL,
	"version" bigint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shopping_record_user_id_kind_id_pk" PRIMARY KEY("user_id","kind","id"),
	CONSTRAINT "shopping_record_kind_valid" CHECK ("shopping_record"."kind" in ('item', 'store', 'branch', 'storeDefault', 'conversionMemory')),
	CONSTRAINT "shopping_record_data_present" CHECK (("shopping_record"."deleted" and "shopping_record"."data" is null) or (not "shopping_record"."deleted" and "shopping_record"."data" is not null))
);
--> statement-breakpoint
CREATE TABLE "shopping_sync_state" (
	"user_id" text PRIMARY KEY NOT NULL,
	"version" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shopping_record" ADD CONSTRAINT "shopping_record_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_sync_state" ADD CONSTRAINT "shopping_sync_state_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shopping_record_user_version_idx" ON "shopping_record" USING btree ("user_id","version");