CREATE TABLE "recipe_unlock" (
	"recipe_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recipe_unlock_recipe_id_user_id_pk" PRIMARY KEY("recipe_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "recipe_unlock_attempt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recipe" ADD COLUMN "unlisted_passphrase" text;--> statement-breakpoint
ALTER TABLE "recipe_unlock" ADD CONSTRAINT "recipe_unlock_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_unlock" ADD CONSTRAINT "recipe_unlock_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_unlock_attempt" ADD CONSTRAINT "recipe_unlock_attempt_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recipe_unlock_attempt_recent_idx" ON "recipe_unlock_attempt" USING btree ("user_id","public_id","created_at");--> statement-breakpoint
ALTER TABLE "recipe" ADD CONSTRAINT "recipe_unlisted_has_passphrase" CHECK (("recipe"."visibility" = 'unlisted') = ("recipe"."unlisted_passphrase" IS NOT NULL));