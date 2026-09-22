ALTER TABLE "inventory_transaction" DROP CONSTRAINT "inventory_transaction_delta_nonzero";--> statement-breakpoint
ALTER TABLE "inventory_item" ADD COLUMN "tracking_mode" text DEFAULT 'estimated' NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_transaction" ADD COLUMN "requested_quantity_delta" numeric(18, 6) NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_item" ADD CONSTRAINT "inventory_item_tracking_mode_valid" CHECK ("inventory_item"."tracking_mode" in ('exact', 'estimated'));--> statement-breakpoint
ALTER TABLE "inventory_transaction" ADD CONSTRAINT "inventory_transaction_requested_delta_nonzero" CHECK ("inventory_transaction"."requested_quantity_delta" <> 0);