-- Read-only diagnostic. Run both and share the results (a screenshot is fine).

-- 1. Does your user record match the email the seed script looked for?
SELECT id, email, role FROM "users" WHERE email = 'pikkies1007@gmail.com';

-- 2. Did any rows actually land in keystone_clients?
SELECT id, name, "businessName", stage, "assignedTo", "route", "createdByUserId"
FROM "keystone_clients"
ORDER BY id;
