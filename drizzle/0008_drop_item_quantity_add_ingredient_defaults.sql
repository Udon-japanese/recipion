ALTER TABLE "inventory_item" DROP CONSTRAINT "inventory_item_quantity_nonnegative";--> statement-breakpoint
ALTER TABLE "ingredient" ADD COLUMN "default_expiry_kind" text;--> statement-breakpoint
ALTER TABLE "ingredient" ADD COLUMN "default_storage" text;--> statement-breakpoint
ALTER TABLE "inventory_item" DROP COLUMN "quantity";--> statement-breakpoint
ALTER TABLE "ingredient" ADD CONSTRAINT "ingredient_default_expiry_kind_valid" CHECK ("ingredient"."default_expiry_kind" is null or "ingredient"."default_expiry_kind" in ('use-by', 'best-before', 'none'));--> statement-breakpoint
ALTER TABLE "ingredient" ADD CONSTRAINT "ingredient_default_storage_valid" CHECK ("ingredient"."default_storage" is null or "ingredient"."default_storage" in ('room', 'fridge', 'freezer'));