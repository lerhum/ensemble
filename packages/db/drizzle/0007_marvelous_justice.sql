ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "reminder_hours_before" integer DEFAULT 24 NOT NULL;
--> statement-breakpoint
ALTER TABLE "inscriptions" ADD COLUMN IF NOT EXISTS "reminder_sent_at" timestamp with time zone;
