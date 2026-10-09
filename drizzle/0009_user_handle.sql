ALTER TABLE "user" ADD COLUMN "handle" text;--> statement-breakpoint
-- 既存のユーザーに、自動のハンドルを付ける（id から作るので、ユーザーごとに違う）。
UPDATE "user" SET "handle" = 'user-' || substr(md5("id"), 1, 8) WHERE "handle" IS NULL;--> statement-breakpoint
-- これまでの表示名は、メールアドレスの @ の前が自動で入っていた（名前を変える画面はなかった）。公開される名前に、メールアドレスの一部が出ないよう、既定の名前にする。
UPDATE "user" SET "name" = 'れしぴょなー' WHERE "name" = split_part("email", '@', 1);--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "handle" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_handle_unique" UNIQUE("handle");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_handle_format" CHECK ("user"."handle" ~ '^[a-z0-9_-]{3,20}$');
