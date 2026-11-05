CREATE TABLE "recipe_cook_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"recipe_id" uuid,
	"recipe_name" text NOT NULL,
	"source_id" text NOT NULL,
	"cooked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recipe_cook_log_user_source_unique" UNIQUE("user_id","source_id")
);
--> statement-breakpoint
ALTER TABLE "recipe" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "recipe_cook_log" ADD CONSTRAINT "recipe_cook_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_cook_log" ADD CONSTRAINT "recipe_cook_log_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recipe_cook_log_user_cooked_at_idx" ON "recipe_cook_log" USING btree ("user_id","cooked_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "recipe_cook_log_recipe_idx" ON "recipe_cook_log" USING btree ("recipe_id","user_id");--> statement-breakpoint
UPDATE "recipe" SET "published_at" = "created_at" WHERE "visibility" <> 'private';--> statement-breakpoint
ALTER TABLE "recipe" ADD CONSTRAINT "recipe_published_at_matches_visibility" CHECK (("recipe"."visibility" = 'private') = ("recipe"."published_at" IS NULL));