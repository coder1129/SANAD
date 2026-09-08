-- The offer columns are timestamps without a time zone. Store UTC explicitly
-- because the API compares them with JavaScript Date values in UTC.
UPDATE "offers"
SET
  "start_date" = CURRENT_TIMESTAMP AT TIME ZONE 'UTC',
  "end_date" = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + INTERVAL '30 days',
  "updated_at" = CURRENT_TIMESTAMP
WHERE "name_en" = '50% OFF (Limited Offer)'
  AND "discount_percentage" = 50.00
  AND "created_at" = "updated_at";
