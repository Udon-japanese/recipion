ALTER TABLE "inventory_item" ADD COLUMN "source_recipe_id" uuid;--> statement-breakpoint
ALTER TABLE "recipe" ADD COLUMN "stocks_when_made" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_item" ADD CONSTRAINT "inventory_item_source_recipe_id_recipe_id_fk" FOREIGN KEY ("source_recipe_id") REFERENCES "public"."recipe"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_item" ADD CONSTRAINT "inventory_item_user_source_recipe_unique" UNIQUE("user_id","source_recipe_id");