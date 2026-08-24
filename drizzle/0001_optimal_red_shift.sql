CREATE TYPE "public"."suggestion_status" AS ENUM('not_started', 'in_progress', 'done');--> statement-breakpoint
CREATE TYPE "public"."win_learning_type" AS ENUM('win', 'learning');--> statement-breakpoint
CREATE TABLE "toolkit_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"toolkitKey" varchar(64) NOT NULL,
	"inputData" jsonb NOT NULL,
	"resultSummary" jsonb NOT NULL,
	"submittedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "toolkit_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"submissionId" integer NOT NULL,
	"userId" integer NOT NULL,
	"toolkitKey" varchar(64) NOT NULL,
	"suggestionText" text NOT NULL,
	"status" "suggestion_status" DEFAULT 'not_started' NOT NULL,
	"statusUpdatedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wins_learnings" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"toolkitKey" varchar(64) NOT NULL,
	"submissionId" integer,
	"type" "win_learning_type" NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
