CREATE TYPE "public"."growth_spurt_stage" AS ENUM('started', 'completed', 'contact');--> statement-breakpoint
CREATE TABLE "growth_spurt_audits" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessionId" varchar(64) NOT NULL,
	"stage" "growth_spurt_stage" DEFAULT 'started' NOT NULL,
	"name" varchar(255),
	"phone" varchar(30),
	"email" varchar(320),
	"businessName" varchar(255),
	"website" varchar(255),
	"category" varchar(64),
	"severity" varchar(32),
	"severityScore" integer,
	"symptoms" jsonb,
	"answers" jsonb,
	"preferredContact" varchar(32),
	"notified" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "growth_spurt_audits_sessionId_unique" UNIQUE("sessionId")
);
