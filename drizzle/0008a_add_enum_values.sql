-- STEP 1 of 2. Run this on its own (click Run), wait for it to finish, THEN
-- run 0008b_finish_schema.sql separately. Postgres requires new enum values
-- to be committed before anything can use them as a default — that's what
-- caused the "unsafe use of new value" error.
-- Safe to re-run: every statement below is guarded with IF NOT EXISTS.

DO $$ BEGIN
  CREATE TYPE "public"."ks_route" AS ENUM('Sales', 'Delegation', 'Funding');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TYPE "public"."client_stage" ADD VALUE IF NOT EXISTS 'Audit completed' BEFORE 'lead';
ALTER TYPE "public"."client_stage" ADD VALUE IF NOT EXISTS 'Discovery meeting booked' BEFORE 'lead';
ALTER TYPE "public"."client_stage" ADD VALUE IF NOT EXISTS 'Discovery meeting held' BEFORE 'lead';
ALTER TYPE "public"."client_stage" ADD VALUE IF NOT EXISTS 'SLA sent' BEFORE 'lead';
ALTER TYPE "public"."client_stage" ADD VALUE IF NOT EXISTS 'SLA signed' BEFORE 'lead';
ALTER TYPE "public"."client_stage" ADD VALUE IF NOT EXISTS 'Documents & baseline' BEFORE 'lead';
ALTER TYPE "public"."client_stage" ADD VALUE IF NOT EXISTS 'Term 1 (set-up, no fee)' BEFORE 'lead';
ALTER TYPE "public"."client_stage" ADD VALUE IF NOT EXISTS 'Profit share active' BEFORE 'lead';
ALTER TYPE "public"."client_stage" ADD VALUE IF NOT EXISTS 'Completed' BEFORE 'lead';
ALTER TYPE "public"."client_stage" ADD VALUE IF NOT EXISTS 'Lost' BEFORE 'lead';
