ALTER TYPE "public"."event_statut" ADD VALUE 'archive';--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "date_iso" text;