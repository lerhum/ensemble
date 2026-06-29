CREATE TABLE IF NOT EXISTS "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"site_title" text DEFAULT '' NOT NULL,
	"site_logo" text
);
