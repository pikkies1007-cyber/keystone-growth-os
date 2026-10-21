CREATE TYPE "public"."invite_status" AS ENUM('pending', 'accepted');--> statement-breakpoint
CREATE TABLE "employee_invites" (
	"id" serial PRIMARY KEY NOT NULL,
	"ownerId" integer NOT NULL,
	"email" varchar(320) NOT NULL,
	"status" "invite_status" DEFAULT 'pending' NOT NULL,
	"invitedAt" timestamp DEFAULT now() NOT NULL,
	"acceptedAt" timestamp
);
