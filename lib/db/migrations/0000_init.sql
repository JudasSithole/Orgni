CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"key_prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "facts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"source_id" text NOT NULL,
	"schema_version" text NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"source_id" text NOT NULL,
	"field_path" text NOT NULL,
	"action" text NOT NULL,
	"corrected_value" jsonb,
	"reviewer" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"source_id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"checksum" text NOT NULL,
	"byte_size" integer NOT NULL,
	"state" text NOT NULL,
	"document_type" text,
	"confidence" double precision,
	"source_acl" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"duplicate_of" text,
	"uploaded_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tokens" (
	"token_id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"source_id" text NOT NULL,
	"token_kind" text NOT NULL,
	"token" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "facts" ADD CONSTRAINT "facts_source_id_sources_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("source_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_source_id_sources_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("source_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_source_id_sources_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("source_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_keys_tenant_idx" ON "api_keys" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "api_keys_hash_idx" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "facts_source_uq" ON "facts" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "facts_tenant_idx" ON "facts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "reviews_source_idx" ON "reviews" USING btree ("source_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_tenant_checksum_uq" ON "sources" USING btree ("tenant_id","checksum");--> statement-breakpoint
CREATE INDEX "sources_tenant_idx" ON "sources" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "tokens_source_idx" ON "tokens" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "tokens_tenant_idx" ON "tokens" USING btree ("tenant_id");