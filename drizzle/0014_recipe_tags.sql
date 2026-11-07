ALTER TABLE "recipe" ADD COLUMN "public_tags" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "recipe" ADD COLUMN "personal_tags" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
CREATE INDEX "recipe_public_tags_idx" ON "recipe" USING gin ("public_tags") WHERE "recipe"."visibility" = 'public';--> statement-breakpoint
ALTER TABLE "recipe" ADD CONSTRAINT "recipe_public_tags_limit" CHECK (cardinality("recipe"."public_tags") <= 5);--> statement-breakpoint
ALTER TABLE "recipe" ADD CONSTRAINT "recipe_personal_tags_limit" CHECK (cardinality("recipe"."personal_tags") <= 10);