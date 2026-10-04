CREATE TABLE "inventory_lot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"quantity" numeric(18, 6) DEFAULT '0' NOT NULL,
	"acquired_on" date NOT NULL,
	"storage" text,
	"expires_on" date,
	"expiry_kind" text,
	"expiry_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_lot_id_user_id_unique" UNIQUE("id","user_id"),
	CONSTRAINT "inventory_lot_quantity_nonnegative" CHECK ("inventory_lot"."quantity" >= 0),
	CONSTRAINT "inventory_lot_storage_valid" CHECK ("inventory_lot"."storage" is null or "inventory_lot"."storage" in ('room', 'fridge', 'freezer')),
	CONSTRAINT "inventory_lot_expiry_kind_valid" CHECK ("inventory_lot"."expiry_kind" is null or "inventory_lot"."expiry_kind" in ('use-by', 'best-before', 'none')),
	CONSTRAINT "inventory_lot_expiry_source_valid" CHECK ("inventory_lot"."expiry_source" is null or "inventory_lot"."expiry_source" in ('entered', 'estimated'))
);
--> statement-breakpoint
ALTER TABLE "inventory_transaction" ADD COLUMN "inventory_lot_id" uuid;--> statement-breakpoint
ALTER TABLE "inventory_lot" ADD CONSTRAINT "inventory_lot_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_lot" ADD CONSTRAINT "inventory_lot_item_owner_fk" FOREIGN KEY ("inventory_item_id","user_id") REFERENCES "public"."inventory_item"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_lot_item_id_idx" ON "inventory_lot" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE INDEX "inventory_lot_user_expires_on_idx" ON "inventory_lot" USING btree ("user_id","expires_on");--> statement-breakpoint
ALTER TABLE "inventory_transaction" ADD CONSTRAINT "inventory_transaction_inventory_lot_id_inventory_lot_id_fk" FOREIGN KEY ("inventory_lot_id") REFERENCES "public"."inventory_lot"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- 既存の在庫は、食材ごとに、ロット1つへ移す（期限なし。買った日は、在庫項目を作った日）。数量が0の食材にも、ロットを作る（履歴の紐づけ先にする）。
INSERT INTO "inventory_lot" ("user_id", "inventory_item_id", "quantity", "acquired_on", "created_at")
SELECT "user_id", "id", "quantity", ("created_at" AT TIME ZONE 'Asia/Tokyo')::date, "created_at" FROM "inventory_item";
--> statement-breakpoint
-- 既存の履歴は、移したロットに紐づける（当時は、食材ごとに数量が1つだったため）。
UPDATE "inventory_transaction" AS t SET "inventory_lot_id" = l."id" FROM "inventory_lot" AS l WHERE l."inventory_item_id" = t."inventory_item_id";
