ALTER TABLE "recipe" ADD COLUMN "yield_text" text;--> statement-breakpoint
UPDATE "recipe" SET "yield_text" = trim_scale("servings")::text || '人分';--> statement-breakpoint
ALTER TABLE "recipe" ALTER COLUMN "yield_text" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "recipe_cook_log" ADD COLUMN "yield_text" text;--> statement-breakpoint
UPDATE "recipe_cook_log" SET "yield_text" = "recipe"."yield_text" FROM "recipe" WHERE "recipe"."id" = "recipe_cook_log"."recipe_id";--> statement-breakpoint
UPDATE "recipe_cook_log" SET "yield_text" = '' WHERE "yield_text" IS NULL;--> statement-breakpoint
ALTER TABLE "recipe_cook_log" ALTER COLUMN "yield_text" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "recipe" ADD CONSTRAINT "recipe_yield_text_valid" CHECK (char_length(trim("recipe"."yield_text")) BETWEEN 1 AND 30);--> statement-breakpoint
ALTER TABLE "recipe" DROP CONSTRAINT "recipe_servings_positive";--> statement-breakpoint
ALTER TABLE "recipe" DROP COLUMN "servings";
