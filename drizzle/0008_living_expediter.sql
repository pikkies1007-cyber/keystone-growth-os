CREATE TYPE "public"."ks_route" AS ENUM('Sales', 'Delegation', 'Funding');--> statement-breakpoint
ALTER TYPE "public"."client_stage" ADD VALUE 'Audit completed' BEFORE 'lead';--> statement-breakpoint
ALTER TYPE "public"."client_stage" ADD VALUE 'Discovery meeting booked' BEFORE 'lead';--> statement-breakpoint
ALTER TYPE "public"."client_stage" ADD VALUE 'Discovery meeting held' BEFORE 'lead';--> statement-breakpoint
ALTER TYPE "public"."client_stage" ADD VALUE 'SLA sent' BEFORE 'lead';--> statement-breakpoint
ALTER TYPE "public"."client_stage" ADD VALUE 'SLA signed' BEFORE 'lead';--> statement-breakpoint
ALTER TYPE "public"."client_stage" ADD VALUE 'Documents & baseline' BEFORE 'lead';--> statement-breakpoint
ALTER TYPE "public"."client_stage" ADD VALUE 'Term 1 (set-up, no fee)' BEFORE 'lead';--> statement-breakpoint
ALTER TYPE "public"."client_stage" ADD VALUE 'Profit share active' BEFORE 'lead';--> statement-breakpoint
ALTER TYPE "public"."client_stage" ADD VALUE 'Completed' BEFORE 'lead';--> statement-breakpoint
ALTER TYPE "public"."client_stage" ADD VALUE 'Lost' BEFORE 'lead';--> statement-breakpoint
CREATE TABLE "keystone_client_terms" (
	"id" serial PRIMARY KEY NOT NULL,
	"clientId" integer NOT NULL,
	"termNumber" integer NOT NULL,
	"netProfit" numeric(12, 2),
	"feeAmount" numeric(12, 2),
	"paidDate" date,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "keystone_clients" ALTER COLUMN "stage" SET DEFAULT 'Audit completed';--> statement-breakpoint
ALTER TABLE "keystone_clients" ADD COLUMN "assignedTo" varchar(64) DEFAULT 'Sulette';--> statement-breakpoint
ALTER TABLE "keystone_clients" ADD COLUMN "route" "ks_route" DEFAULT 'Delegation';--> statement-breakpoint
ALTER TABLE "keystone_clients" ADD COLUMN "bottleneck" text;--> statement-breakpoint
ALTER TABLE "keystone_clients" ADD COLUMN "discoveryDate" date;--> statement-breakpoint
ALTER TABLE "keystone_clients" ADD COLUMN "slaSentDate" date;--> statement-breakpoint
ALTER TABLE "keystone_clients" ADD COLUMN "slaSignedDate" date;--> statement-breakpoint
ALTER TABLE "keystone_clients" ADD COLUMN "cipcReceived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "keystone_clients" ADD COLUMN "financialsReceived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "keystone_clients" ADD COLUMN "baselineNetProfit" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "keystone_clients" ADD COLUMN "baselineAgreedDate" date;--> statement-breakpoint
ALTER TABLE "keystone_clients" ADD COLUMN "startDate" date;--> statement-breakpoint
ALTER TABLE "keystone_clients" ADD COLUMN "sharePct" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "keystone_clients" ADD COLUMN "termMonths" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "keystone_clients" ADD COLUMN "contractMonths" integer DEFAULT 36 NOT NULL;--> statement-breakpoint
ALTER TABLE "keystone_clients" ADD COLUMN "lostReason" text;--> statement-breakpoint
ALTER TABLE "keystone_client_terms" ADD CONSTRAINT "keystone_client_terms_clientId_keystone_clients_id_fk" FOREIGN KEY ("clientId") REFERENCES "public"."keystone_clients"("id") ON DELETE cascade ON UPDATE no action;