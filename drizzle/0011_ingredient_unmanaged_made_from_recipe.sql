ALTER TABLE "ingredient" ADD COLUMN "unmanaged" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredient" ADD COLUMN "made_from_recipe" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- 今、作り置きの在庫が残っている食材に、作り置き由来の印を付ける（在庫を消した食材は、見分けられないので付かない）。
UPDATE "ingredient" SET "made_from_recipe" = true WHERE "id" IN (SELECT "ingredient_id" FROM "inventory_item" WHERE "source_recipe_id" IS NOT NULL);
