ALTER TABLE "recipe" ADD COLUMN "public_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "recipe" ADD CONSTRAINT "recipe_public_id_unique" UNIQUE("public_id");--> statement-breakpoint
ALTER TABLE "recipe" ADD CONSTRAINT "recipe_public_id_nonempty" CHECK (length("recipe"."public_id") > 0);