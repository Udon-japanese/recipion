ALTER TABLE "recipe" ADD COLUMN "parent_recipe_id" uuid;--> statement-breakpoint
ALTER TABLE "recipe" ADD COLUMN "parent_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "recipe" ADD CONSTRAINT "recipe_parent_recipe_id_recipe_id_fk" FOREIGN KEY ("parent_recipe_id") REFERENCES "public"."recipe"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recipe_parent_recipe_id_idx" ON "recipe" USING btree ("parent_recipe_id");--> statement-breakpoint
ALTER TABLE "recipe" ADD CONSTRAINT "recipe_parent_has_snapshot" CHECK ("recipe"."parent_recipe_id" IS NULL OR "recipe"."parent_snapshot" IS NOT NULL);