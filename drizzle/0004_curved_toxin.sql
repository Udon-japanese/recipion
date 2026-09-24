CREATE TABLE "recipe" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"servings" numeric(10, 3) NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recipe_id_user_id_unique" UNIQUE("id","user_id"),
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
ALTER TABLE "recipe" ADD CONSTRAINT "recipe_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredient_node" ADD CONSTRAINT "recipe_ingredient_recipe_owner_fk" FOREIGN KEY ("recipe_id","user_id") REFERENCES "public"."recipe"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredient_node" ADD CONSTRAINT "recipe_ingredient_parent_same_recipe_fk" FOREIGN KEY ("parent_id","recipe_id") REFERENCES "public"."recipe_ingredient_node"("id","recipe_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_instruction" ADD CONSTRAINT "recipe_instruction_recipe_owner_fk" FOREIGN KEY ("recipe_id","user_id") REFERENCES "public"."recipe"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_preparation" ADD CONSTRAINT "recipe_preparation_recipe_owner_fk" FOREIGN KEY ("recipe_id","user_id") REFERENCES "public"."recipe"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recipe_user_id_idx" ON "recipe" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recipe_ingredient_recipe_order_idx" ON "recipe_ingredient_node" USING btree ("recipe_id","sort_order");--> statement-breakpoint
CREATE INDEX "recipe_ingredient_parent_order_idx" ON "recipe_ingredient_node" USING btree ("parent_id","sort_order");--> statement-breakpoint
CREATE INDEX "recipe_instruction_recipe_order_idx" ON "recipe_instruction" USING btree ("recipe_id","sort_order");--> statement-breakpoint
CREATE INDEX "recipe_preparation_recipe_order_idx" ON "recipe_preparation" USING btree ("recipe_id","sort_order");