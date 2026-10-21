-- One-time seed: Sulette's two existing Keystone Business Group clients.
-- Run this AFTER 0008_living_expediter.sql. Safe to run once — re-running
-- will create duplicate rows, so skip it if these two already exist.
--
-- Defaults used (standard Keystone deal terms): stage "Audit completed",
-- director "Sulette", route "Delegation", 30% fee, 3-month terms, 36-month
-- contract. Sulette can correct any of these from the CRM itself once the
-- clients are in — this just gets them onto the board.

INSERT INTO "keystone_clients"
  ("name", "businessName", "stage", "assignedTo", "route", "sharePct", "termMonths", "contractMonths", "createdByUserId")
SELECT v."name", v."businessName", v."stage", v."assignedTo", v."route", v."sharePct", v."termMonths", v."contractMonths",
  (SELECT "id" FROM "users" WHERE "email" = 'pikkies1007@gmail.com' LIMIT 1)
FROM (VALUES
  ('Stella', 'Skynetics', 'Audit completed', 'Sulette', 'Delegation', 30, 3, 36),
  ('Iontona', 'Iontona Aircons', 'Audit completed', 'Sulette', 'Delegation', 30, 3, 36)
) AS v("name", "businessName", "stage", "assignedTo", "route", "sharePct", "termMonths", "contractMonths");
