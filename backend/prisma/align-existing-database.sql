-- Idempotent bridge for databases created by the legacy database/*.sql scripts.
-- Run this once before marking the initial Prisma migration as applied.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "token_version" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "requirements" JSONB;

ALTER TABLE "order_files"
  ADD COLUMN IF NOT EXISTS "file_category" VARCHAR(50) NOT NULL DEFAULT 'customer_upload',
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB;

ALTER TABLE "package_images"
  ADD COLUMN IF NOT EXISTS "alt_text" VARCHAR(255);

ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_status_check";
ALTER TABLE "orders" ADD CONSTRAINT "orders_status_check" CHECK (
  "status" IN (
    'pending', 'pending_payment', 'paid', 'awaiting_information', 'received',
    'in_progress', 'under_review', 'ready', 'completed', 'cancelled', 'refunded'
  )
);

ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_payment_method_check";
ALTER TABLE "payments" ADD CONSTRAINT "payments_payment_method_check" CHECK (
  "payment_method" IN ('card', 'apple_pay', 'mada', 'telr', 'paytabs', 'other')
);
ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_status_check";
ALTER TABLE "payments" ADD CONSTRAINT "payments_status_check" CHECK (
  "status" IN ('pending', 'paid', 'success', 'failed', 'refunded')
);

ALTER TABLE "email_queue" DROP CONSTRAINT IF EXISTS "email_queue_status_check";
ALTER TABLE "email_queue" ADD CONSTRAINT "email_queue_status_check" CHECK (
  "status" IN ('pending', 'processing', 'sent', 'failed', 'cancelled')
);

-- These values are intentionally extensible application event/action/MIME names.
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_notification_type_check";
ALTER TABLE "admin_activity_log" DROP CONSTRAINT IF EXISTS "admin_activity_log_action_check";
ALTER TABLE "site_media" DROP CONSTRAINT IF EXISTS "site_media_media_type_check";
