-- 最後に書いた変更（端末の changeId）。いまある行には、新しい ID を入れてから、NOT NULL にする。
ALTER TABLE "shopping_record" ADD COLUMN "change_id" text;--> statement-breakpoint
UPDATE "shopping_record" SET "change_id" = gen_random_uuid()::text WHERE "change_id" IS NULL;--> statement-breakpoint
ALTER TABLE "shopping_record" ALTER COLUMN "change_id" SET NOT NULL;
