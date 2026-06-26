CREATE TABLE IF NOT EXISTS "volunteer_tokens" (
	"token" text PRIMARY KEY NOT NULL,
	"volunteer_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"confirmed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "volunteer_tokens" ADD CONSTRAINT "volunteer_tokens_volunteer_id_volunteers_id_fk" FOREIGN KEY ("volunteer_id") REFERENCES "public"."volunteers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
