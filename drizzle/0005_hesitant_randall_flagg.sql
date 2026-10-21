CREATE TYPE "public"."business_role" AS ENUM('owner', 'employee');--> statement-breakpoint
CREATE TYPE "public"."inquiry_status" AS ENUM('new', 'follow_up', 'declined', 'converted');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('sent', 'paid', 'overdue');--> statement-breakpoint
CREATE TABLE "customer_inquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerId" integer NOT NULL,
	"createdByUserId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"contact" varchar(255),
	"source" varchar(128),
	"status" "inquiry_status" DEFAULT 'new' NOT NULL,
	"notes" text,
	"declinedReason" text,
	"followUpDate" date,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerId" integer NOT NULL,
	"createdByUserId" integer NOT NULL,
	"assignedToUserId" integer,
	"title" varchar(500) NOT NULL,
	"description" text,
	"dueDate" date,
	"status" "status" DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerId" integer NOT NULL,
	"createdByUserId" integer NOT NULL,
	"customerInquiryId" integer,
	"clientName" varchar(255) NOT NULL,
	"description" varchar(500),
	"amount" numeric(12, 2) NOT NULL,
	"status" "invoice_status" DEFAULT 'sent' NOT NULL,
	"issuedDate" date NOT NULL,
	"dueDate" date,
	"paidDate" date,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "businessRole" "business_role" DEFAULT 'owner' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ownerId" integer;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_ownerId_users_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;