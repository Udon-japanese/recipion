CREATE TABLE "admin_notification_log" (
	"kind" text PRIMARY KEY NOT NULL,
	"last_sent_at" timestamp with time zone NOT NULL
);
