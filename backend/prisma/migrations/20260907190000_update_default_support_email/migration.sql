-- Update only the old project default. A manually configured support address is preserved.
UPDATE "settings"
SET "setting_value" = 'saanadcv@gmail.com',
    "updated_at" = CURRENT_TIMESTAMP
WHERE "setting_key" = 'support_email'
  AND "setting_value" = 'contact@sanad.ae';
