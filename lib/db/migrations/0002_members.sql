CREATE TABLE "members" (
	"tenant_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'invited' NOT NULL,
	"avatar" text,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_tenant_id_email_pk" PRIMARY KEY("tenant_id","email")
);
--> statement-breakpoint
CREATE INDEX "members_tenant_idx" ON "members" USING btree ("tenant_id");