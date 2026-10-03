CREATE TABLE "ingredient" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"stock_unit_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "ingredient_id_user_id_unique" UNIQUE("id","user_id")
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
	"quantity" numeric(18, 6) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "inventory_item_id_user_id_unique" UNIQUE("id","user_id"),
	CONSTRAINT "inventory_item_user_ingredient_unique" UNIQUE("user_id","ingredient_id"),
	CONSTRAINT "inventory_item_quantity_nonnegative" CHECK ("inventory_item"."quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "inventory_transaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"input_quantity" numeric(18, 6) NOT NULL,
	"input_unit_code" text NOT NULL,
	"quantity_delta" numeric(18, 6) NOT NULL,
	"resulting_quantity" numeric(18, 6) NOT NULL,
	"stock_unit_code" text NOT NULL,
	"reason" text NOT NULL,
	"source_type" text,
	"source_id" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_transaction_input_quantity_positive" CHECK ("inventory_transaction"."input_quantity" > 0),
	CONSTRAINT "inventory_transaction_delta_nonzero" CHECK ("inventory_transaction"."quantity_delta" <> 0),
	CONSTRAINT "inventory_transaction_result_nonnegative" CHECK ("inventory_transaction"."resulting_quantity" >= 0)
);
--> statement-breakpoint
ALTER TABLE "ingredient" ADD CONSTRAINT "ingredient_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_alias" ADD CONSTRAINT "ingredient_alias_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_alias" ADD CONSTRAINT "ingredient_alias_ingredient_owner_fk" FOREIGN KEY ("ingredient_id","user_id") REFERENCES "public"."ingredient"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_item" ADD CONSTRAINT "inventory_item_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_item" ADD CONSTRAINT "inventory_item_ingredient_owner_fk" FOREIGN KEY ("ingredient_id","user_id") REFERENCES "public"."ingredient"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transaction" ADD CONSTRAINT "inventory_transaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transaction" ADD CONSTRAINT "inventory_transaction_item_owner_fk" FOREIGN KEY ("inventory_item_id","user_id") REFERENCES "public"."inventory_item"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ingredient_user_id_idx" ON "ingredient" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ingredient_alias_ingredient_id_idx" ON "ingredient_alias" USING btree ("ingredient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ingredient_alias_primary_unique" ON "ingredient_alias" USING btree ("ingredient_id") WHERE "ingredient_alias"."is_primary" = true;--> statement-breakpoint
CREATE INDEX "inventory_item_user_id_idx" ON "inventory_item" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "inventory_transaction_user_occurred_at_idx" ON "inventory_transaction" USING btree ("user_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "inventory_transaction_item_occurred_at_idx" ON "inventory_transaction" USING btree ("inventory_item_id","occurred_at" DESC NULLS LAST);