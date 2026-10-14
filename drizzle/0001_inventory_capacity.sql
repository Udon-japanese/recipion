ALTER TABLE "inventory_item" ADD COLUMN "capacity" numeric(18, 6) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_item" ADD CONSTRAINT "inventory_item_capacity_valid" CHECK ("inventory_item"."capacity" >= 0);--> statement-breakpoint
UPDATE "inventory_item" SET "capacity" = (SELECT coalesce(sum("inventory_lot"."quantity"), 0) FROM "inventory_lot" WHERE "inventory_lot"."inventory_item_id" = "inventory_item"."id");
