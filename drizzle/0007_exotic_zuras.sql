CREATE TYPE "public"."client_stage" AS ENUM('lead', 'contacted', 'proposal', 'client', 'declined');--> statement-breakpoint
CREATE TABLE "keystone_clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"businessName" varchar(255),
	"contact" varchar(255),
	"stage" "client_stage" DEFAULT 'lead' NOT NULL,
	"value" numeric(12, 2),
	"source" varchar(128),
	"notes" text,
	"declinedReason" text,
	"followUpDate" date,
	"createdByUserId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
