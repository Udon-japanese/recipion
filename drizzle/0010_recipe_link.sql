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
ALTER TABLE "recipe_link" ADD CONSTRAINT "recipe_link_recipe_owner_fk" FOREIGN KEY ("recipe_id","user_id") REFERENCES "public"."recipe"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_link" ADD CONSTRAINT "recipe_link_target_fk" FOREIGN KEY ("target_recipe_id") REFERENCES "public"."recipe"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recipe_link_recipe_id_idx" ON "recipe_link" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "recipe_link_target_idx" ON "recipe_link" USING btree ("target_recipe_id");