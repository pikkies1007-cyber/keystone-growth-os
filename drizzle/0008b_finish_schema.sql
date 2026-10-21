-- STEP 2 of 2. Run this ONLY after 0008a_add_enum_values.sql has completed
-- and that run has finished (new query tab/run is fine). Safe to re-run —
-- every statement is guarded.

CREATE TABLE IF NOT EXISTS "keystone_client_terms" (
	"id" serial PRIMARY KEY NOT NULL,
	"clientId" integer NOT NULL,
	"termNumber" integer NOT NULL,
	"netProfit" numeric(12, 2),
	"feeAmount" numeric(12, 2),
	"paidDate" date,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "keystone_clients" ALTER COLUMN "stage" SET DEFAULT 'Audit completed';
ALTER TABLE "keystone_clients" ADD COLUMN IF NOT EXISTS "assignedTo" varchar(64) DEFAULT 'Sulette';
ALTER TABLE "keystone_clients" ADD COLUMN IF NOT EXISTS "route" "ks_route" DEFAULT 'Delegation';
ALTER TABLE "keystone_clients" ADD COLUMN IF NOT EXISTS "bottleneck" text;
ALTER TABLE "keystone_clients" ADD COLUMN IF NOT EXISTS "discoveryDate" date;
ALTER TABLE "keystone_clients" ADD COLUMN IF NOT EXISTS "slaSentDate" date;
ALTER TABLE "keystone_clients" ADD COLUMN IF NOT EXISTS "slaSignedDate" date;
ALTER TABLE "keystone_clients" ADD COLUMN IF NOT EXISTS "cipcReceived" boolean DEFAULT false NOT NULL;
ALTER TABLE "keystone_clients" ADD COLUMN IF NOT EXISTS "financialsReceived" boolean DEFAULT false NOT NULL;
ALTER TABLE "keystone_clients" ADD COLUMN IF NOT EXISTS "baselineNetProfit" numeric(12, 2);
ALTER TABLE "keystone_clients" ADD COLUMN IF NOT EXISTS "baselineAgreedDate" date;
ALTER TABLE "keystone_clients" ADD COLUMN IF NOT EXISTS "startDate" date;
ALTER TABLE "keystone_clients" ADD COLUMN IF NOT EXISTS "sharePct" integer DEFAULT 30 NOT NULL;
ALTER TABLE "keystone_clients" ADD COLUMN IF NOT EXISTS "termMonths" integer DEFAULT 3 NOT NULL;
ALTER TABLE "keystone_clients" ADD COLUMN IF NOT EXISTS "contractMonths" integer DEFAULT 36 NOT NULL;
ALTER TABLE "keystone_clients" ADD COLUMN IF NOT EXISTS "lostReason" text;

DO $$ BEGIN
  ALTER TABLE "keystone_client_terms" ADD CONSTRAINT "keystone_client_terms_clientId_keystone_clients_id_fk"
    FOREIGN KEY ("clientId") REFERENCES "public"."keystone_clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
