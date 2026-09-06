-- Link the existing published seed feedback to the services described by each review.
-- No testimonial text or rating is changed by this data migration.
UPDATE "testimonials"
SET "package_id" = CASE "id"
  WHEN 1 THEN (SELECT "id" FROM "packages" WHERE "name_en" = 'Professional CV' LIMIT 1)
  WHEN 2 THEN (SELECT "id" FROM "packages" WHERE "name_en" = 'Career Excellence Package' LIMIT 1)
  WHEN 3 THEN (SELECT "id" FROM "packages" WHERE "name_en" = 'Golden Signature Package' LIMIT 1)
  ELSE "package_id"
END
WHERE "id" IN (1, 2, 3) AND "package_id" IS NULL;
