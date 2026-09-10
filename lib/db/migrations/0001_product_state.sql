CREATE TABLE "approval_policies" (
	"tenant_id" text NOT NULL,
	"key" text NOT NULL,
	"level" text DEFAULT 'ask_first' NOT NULL,
	CONSTRAINT "approval_policies_tenant_id_key_pk" PRIMARY KEY("tenant_id","key")
);
--> statement-breakpoint
CREATE TABLE "capabilities" (
	"tenant_id" text NOT NULL,
	"key" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	CONSTRAINT "capabilities_tenant_id_key_pk" PRIMARY KEY("tenant_id","key")
);
--> statement-breakpoint
CREATE TABLE "connections" (
	"id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'not_connected' NOT NULL,
	"mode" text DEFAULT 'mock' NOT NULL,
	"connected_at" timestamp with time zone,
	"services" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "connections_tenant_id_key_pk" PRIMARY KEY("tenant_id","key")
);
--> statement-breakpoint
CREATE TABLE "organisations" (
	"tenant_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"work_email" text NOT NULL,
	"website" text DEFAULT '' NOT NULL,
	"onboarding_step" integer DEFAULT 0 NOT NULL,
	"onboarding_complete" boolean DEFAULT false NOT NULL,
	"teams_aad_tenant_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orgni_actions" (
	"id" text NOT NULL,
	"tenant_id" text NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"requested_by" text,
	"capability" text NOT NULL,
	"understood" text DEFAULT '' NOT NULL,
	"sources_used" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"actions_performed" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"result" text DEFAULT '' NOT NULL,
	"approval" jsonb,
	"conversation_ref" jsonb,
	CONSTRAINT "orgni_actions_tenant_id_id_pk" PRIMARY KEY("tenant_id","id")
);
--> statement-breakpoint
CREATE TABLE "permissions_state" (
	"tenant_id" text PRIMARY KEY NOT NULL,
	"access" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"audience" text DEFAULT 'all_employees' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams_integration" (
	"tenant_id" text PRIMARY KEY NOT NULL,
	"state" text DEFAULT 'not_installed' NOT NULL,
	"mode" text DEFAULT 'mock' NOT NULL,
	"installed_at" timestamp with time zone,
	"service_url" text,
	"conversation_ref" jsonb
);
--> statement-breakpoint
CREATE INDEX "connections_tenant_idx" ON "connections" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "orgni_actions_tenant_idx" ON "orgni_actions" USING btree ("tenant_id");