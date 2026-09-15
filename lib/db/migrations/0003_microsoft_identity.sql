CREATE TABLE "external_identities" (
	"id" text PRIMARY KEY NOT NULL,
	"orgni_tenant_id" text NOT NULL,
	"provider" text DEFAULT 'microsoft' NOT NULL,
	"microsoft_tenant_id" text NOT NULL,
	"entra_object_id" text NOT NULL,
	"email" text,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "microsoft_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"orgni_tenant_id" text NOT NULL,
	"microsoft_tenant_id" text NOT NULL,
	"status" text DEFAULT 'connected' NOT NULL,
	"installed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "processed_teams_activities" (
	"microsoft_tenant_id" text NOT NULL,
	"activity_id" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "processed_teams_activities_microsoft_tenant_id_activity_id_pk" PRIMARY KEY("microsoft_tenant_id","activity_id")
);
--> statement-breakpoint
CREATE TABLE "teams_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"orgni_tenant_id" text,
	"microsoft_tenant_id" text,
	"entra_object_id" text,
	"conversation_id" text,
	"activity_id" text,
	"question" text,
	"outcome" text NOT NULL,
	"sources_used" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"orgni_action_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams_conversations" (
	"orgni_tenant_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"microsoft_tenant_id" text,
	"conversation_type" text,
	"team_id" text,
	"channel_id" text,
	"service_url" text,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teams_conversations_orgni_tenant_id_conversation_id_pk" PRIMARY KEY("orgni_tenant_id","conversation_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "external_identities_ms_user_uidx" ON "external_identities" USING btree ("provider","microsoft_tenant_id","entra_object_id");--> statement-breakpoint
CREATE INDEX "external_identities_tenant_idx" ON "external_identities" USING btree ("orgni_tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "microsoft_connections_ms_tenant_uidx" ON "microsoft_connections" USING btree ("microsoft_tenant_id");--> statement-breakpoint
CREATE INDEX "microsoft_connections_tenant_idx" ON "microsoft_connections" USING btree ("orgni_tenant_id");--> statement-breakpoint
CREATE INDEX "teams_audit_log_tenant_idx" ON "teams_audit_log" USING btree ("orgni_tenant_id");--> statement-breakpoint
CREATE INDEX "teams_conversations_tenant_idx" ON "teams_conversations" USING btree ("orgni_tenant_id");