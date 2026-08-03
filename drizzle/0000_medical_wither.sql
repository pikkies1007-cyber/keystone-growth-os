CREATE TYPE "public"."money_archetype" AS ENUM('hustler', 'giver', 'protector', 'enjoyer');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('pending', 'in_progress', 'completed');--> statement-breakpoint
CREATE TABLE "audit_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessionId" varchar(64) NOT NULL,
	"scores" jsonb NOT NULL,
	"primaryBottleneck" varchar(64),
	"moneyFrictionDetected" integer DEFAULT 0,
	"clientId" varchar(64) DEFAULT 'keystone',
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goal_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessionId" varchar(64) NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"dimension" varchar(64),
	"priority" "priority" DEFAULT 'medium',
	"status" "status" DEFAULT 'pending',
	"dueWeek" integer,
	"clientId" varchar(64) DEFAULT 'keystone',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(320) NOT NULL,
	"whatsapp" varchar(30),
	"moneyArchetype" "money_archetype",
	"archetypeScore" integer,
	"diagnosticAnswers" jsonb,
	"source" varchar(64) DEFAULT 'direct',
	"clientId" varchar(64) DEFAULT 'keystone',
	"notified" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lms_enrolments" (
	"id" serial PRIMARY KEY NOT NULL,
	"studentName" varchar(255),
	"studentEmail" varchar(320) NOT NULL,
	"courseTitle" varchar(500),
	"courseId" varchar(64),
	"moneyArchetype" varchar(64),
	"primaryBottleneck" varchar(64),
	"emailSent" integer DEFAULT 0,
	"ownerNotified" integer DEFAULT 0,
	"rawPayload" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
