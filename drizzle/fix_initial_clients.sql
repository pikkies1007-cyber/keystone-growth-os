-- One-time fix: the names I seeded earlier (Stella/Skynetics,
-- Iontona/Iontona Aircons) were wrong guesses. Replacing them with the
-- two real deals from Sulette's actual Keystone pipeline screenshot.
-- Safe to run once; matches by businessName on the placeholder rows.

UPDATE "keystone_clients"
SET "name" = 'Corika Prinsloo',
    "businessName" = 'Forever Perfect',
    "stage" = 'Discovery meeting held',
    "assignedTo" = 'Sulette',
    "route" = 'Delegation'
WHERE "businessName" = 'Skynetics';

UPDATE "keystone_clients"
SET "name" = 'Hagan Smit',
    "businessName" = 'Eyonanto Aircon',
    "contact" = '+27 71 829 0169',
    "stage" = 'SLA sent',
    "assignedTo" = 'Sulette',
    "route" = 'Delegation'
WHERE "businessName" = 'Iontona Aircons';
