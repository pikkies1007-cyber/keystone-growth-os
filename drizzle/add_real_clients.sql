-- Adds your two real Keystone deals directly (replaces the earlier
-- seed_initial_clients.sql + fix_initial_clients.sql — just run this one).
-- RETURNING means you'll see the new rows appear right here when it runs.

INSERT INTO "keystone_clients"
  ("name", "businessName", "contact", "stage", "assignedTo", "route", "sharePct", "termMonths", "contractMonths", "createdByUserId")
SELECT v."name", v."businessName", v."contact", v."stage", v."assignedTo", v."route", v."sharePct", v."termMonths", v."contractMonths",
  (SELECT "id" FROM "users" WHERE "email" = 'pikkies1007@gmail.com' LIMIT 1)
FROM (VALUES
  ('Corika Prinsloo', 'Forever Perfect', NULL, 'Discovery meeting held', 'Sulette', 'Delegation', 30, 3, 36),
  ('Hagan Smit', 'Eyonanto Aircon', '+27 71 829 0169', 'SLA sent', 'Sulette', 'Delegation', 30, 3, 36)
) AS v("name", "businessName", "contact", "stage", "assignedTo", "route", "sharePct", "termMonths", "contractMonths")
RETURNING id, name, "businessName", stage;
