-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "password_hash" VARCHAR(255) NOT NULL,
    "role" VARCHAR(20) NOT NULL DEFAULT 'customer',
    "email_verified" BOOLEAN DEFAULT false,
    "email_verification_token" VARCHAR(255),
    "password_reset_token" VARCHAR(255),
    "password_reset_expires" TIMESTAMP(6),
    "last_login" TIMESTAMP(6),
    "failed_login_attempts" INTEGER DEFAULT 0,
    "account_locked" BOOLEAN DEFAULT false,
    "locked_until" TIMESTAMP(6),
    "token_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" SERIAL NOT NULL,
    "name_ar" VARCHAR(255) NOT NULL,
    "name_en" VARCHAR(255) NOT NULL,
    "description_ar" TEXT,
    "description_en" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "features_ar" JSONB,
    "features_en" JSONB,
    "is_active" BOOLEAN DEFAULT true,
    "sort_order" INTEGER DEFAULT 0,
    "delivery_days" INTEGER NOT NULL DEFAULT 7,
    "max_revisions" INTEGER DEFAULT 1,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" SERIAL NOT NULL,
    "package_id" INTEGER,
    "name_ar" VARCHAR(255) NOT NULL,
    "name_en" VARCHAR(255) NOT NULL,
    "description_ar" TEXT,
    "description_en" TEXT,
    "discount_percentage" DECIMAL(5,2) NOT NULL,
    "start_date" TIMESTAMP(6) NOT NULL,
    "end_date" TIMESTAMP(6) NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_images" (
    "id" SERIAL NOT NULL,
    "package_id" INTEGER NOT NULL,
    "image_path" VARCHAR(500) NOT NULL,
    "is_primary" BOOLEAN DEFAULT false,
    "display_order" INTEGER DEFAULT 0,
    "alt_text" VARCHAR(255),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "discount_type" VARCHAR(20) NOT NULL,
    "discount_value" DECIMAL(10,2) NOT NULL,
    "min_order_amount" DECIMAL(10,2) DEFAULT 0,
    "max_discount_amount" DECIMAL(10,2),
    "usage_limit" INTEGER,
    "usage_per_user" INTEGER DEFAULT 1,
    "times_used" INTEGER DEFAULT 0,
    "start_date" TIMESTAMP(6),
    "end_date" TIMESTAMP(6),
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_usage" (
    "id" SERIAL NOT NULL,
    "coupon_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "order_id" INTEGER,
    "discount_amount" DECIMAL(10,2) NOT NULL,
    "used_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "order_number" VARCHAR(50) NOT NULL,
    "user_id" INTEGER,
    "package_id" INTEGER,
    "offer_id" INTEGER,
    "customer_name" VARCHAR(255) NOT NULL,
    "customer_email" VARCHAR(255) NOT NULL,
    "customer_phone" VARCHAR(20) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "original_amount" DECIMAL(10,2) NOT NULL,
    "discount_amount" DECIMAL(10,2) DEFAULT 0,
    "vat_amount" DECIMAL(10,2) NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "final_amount" DECIMAL(10,2) NOT NULL,
    "coupon_code" VARCHAR(50),
    "delivery_date" DATE,
    "notes" TEXT,
    "admin_notes" TEXT,
    "requirements" JSONB,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_files" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_path" VARCHAR(500) NOT NULL,
    "file_type" VARCHAR(50) NOT NULL,
    "file_size" INTEGER,
    "uploaded_by" INTEGER,
    "file_category" VARCHAR(50) NOT NULL DEFAULT 'customer_upload',
    "description" TEXT,
    "metadata" JSONB,
    "uploaded_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "transaction_id" VARCHAR(255) NOT NULL,
    "payment_method" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) DEFAULT 'AED',
    "status" VARCHAR(50) NOT NULL,
    "payment_date" TIMESTAMP(6),
    "payment_response" JSONB,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "order_id" INTEGER,
    "title_ar" VARCHAR(255) NOT NULL,
    "title_en" VARCHAR(255) NOT NULL,
    "message_ar" TEXT NOT NULL,
    "message_en" TEXT NOT NULL,
    "notification_type" VARCHAR(50) NOT NULL,
    "is_read" BOOLEAN DEFAULT false,
    "read_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_media" (
    "id" SERIAL NOT NULL,
    "media_key" VARCHAR(100) NOT NULL,
    "media_path" VARCHAR(500) NOT NULL,
    "media_type" VARCHAR(50) NOT NULL,
    "alt_text_ar" VARCHAR(255),
    "alt_text_en" VARCHAR(255),
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pages" (
    "id" SERIAL NOT NULL,
    "title_ar" VARCHAR(255) NOT NULL,
    "title_en" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "content_ar" TEXT,
    "content_en" TEXT,
    "meta_description_ar" TEXT,
    "meta_description_en" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" SERIAL NOT NULL,
    "setting_key" VARCHAR(100) NOT NULL,
    "setting_value" TEXT,
    "setting_type" VARCHAR(50) DEFAULT 'string',
    "description" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimonials" (
    "id" SERIAL NOT NULL,
    "customer_name" VARCHAR(255) NOT NULL,
    "customer_title" VARCHAR(255),
    "customer_image" VARCHAR(500),
    "testimonial_ar" TEXT NOT NULL,
    "testimonial_en" TEXT NOT NULL,
    "rating" INTEGER,
    "is_published" BOOLEAN DEFAULT false,
    "display_order" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_activity_log" (
    "id" SERIAL NOT NULL,
    "admin_id" INTEGER NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "table_name" VARCHAR(100),
    "record_id" INTEGER,
    "description" TEXT,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "changes" JSONB,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_queue" (
    "id" SERIAL NOT NULL,
    "recipient_email" VARCHAR(255) NOT NULL,
    "recipient_name" VARCHAR(255),
    "subject" VARCHAR(500) NOT NULL,
    "body_html" TEXT NOT NULL,
    "body_text" TEXT,
    "template_name" VARCHAR(100),
    "template_data" JSONB,
    "status" VARCHAR(50) DEFAULT 'pending',
    "priority" INTEGER DEFAULT 5,
    "attempts" INTEGER DEFAULT 0,
    "max_attempts" INTEGER DEFAULT 3,
    "scheduled_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(6),
    "error_message" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" SERIAL NOT NULL,
    "template_name" VARCHAR(100) NOT NULL,
    "subject_ar" VARCHAR(500) NOT NULL,
    "subject_en" VARCHAR(500) NOT NULL,
    "body_ar" TEXT NOT NULL,
    "body_en" TEXT NOT NULL,
    "variables" JSONB,
    "description" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "session_token" VARCHAR(255) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "last_activity" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "from_status" VARCHAR(50),
    "to_status" VARCHAR(50) NOT NULL,
    "changed_by" INTEGER,
    "note" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "used" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_role" ON "users"("role");

-- CreateIndex
CREATE INDEX "idx_users_account_locked" ON "users"("account_locked");

-- CreateIndex
CREATE INDEX "idx_users_last_login" ON "users"("last_login");

-- CreateIndex
CREATE INDEX "idx_offers_package_id" ON "offers"("package_id");

-- CreateIndex
CREATE INDEX "idx_offers_is_active" ON "offers"("is_active");

-- CreateIndex
CREATE INDEX "idx_offers_end_date" ON "offers"("end_date");

-- CreateIndex
CREATE INDEX "idx_offers_start_date" ON "offers"("start_date");

-- CreateIndex
CREATE INDEX "idx_package_images_package_id" ON "package_images"("package_id");

-- CreateIndex
CREATE INDEX "idx_package_images_is_primary" ON "package_images"("is_primary");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "idx_coupons_code" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "idx_coupons_is_active" ON "coupons"("is_active");

-- CreateIndex
CREATE INDEX "idx_coupons_end_date" ON "coupons"("end_date");

-- CreateIndex
CREATE INDEX "idx_coupons_start_date" ON "coupons"("start_date");

-- CreateIndex
CREATE INDEX "idx_coupon_usage_coupon_id" ON "coupon_usage"("coupon_id");

-- CreateIndex
CREATE INDEX "idx_coupon_usage_user_id" ON "coupon_usage"("user_id");

-- CreateIndex
CREATE INDEX "idx_coupon_usage_order_id" ON "coupon_usage"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "idx_orders_order_number" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "idx_orders_user_id" ON "orders"("user_id");

-- CreateIndex
CREATE INDEX "idx_orders_status" ON "orders"("status");

-- CreateIndex
CREATE INDEX "idx_orders_created_at" ON "orders"("created_at");

-- CreateIndex
CREATE INDEX "idx_orders_delivery_date" ON "orders"("delivery_date");

-- CreateIndex
CREATE INDEX "idx_order_files_order_id" ON "order_files"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_transaction_id_key" ON "payments"("transaction_id");

-- CreateIndex
CREATE INDEX "idx_payments_order_id" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "idx_payments_transaction_id" ON "payments"("transaction_id");

-- CreateIndex
CREATE INDEX "idx_payments_status" ON "payments"("status");

-- CreateIndex
CREATE INDEX "idx_notifications_user_id" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "idx_notifications_is_read" ON "notifications"("is_read");

-- CreateIndex
CREATE INDEX "idx_notifications_created_at" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "idx_notifications_order_id" ON "notifications"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "site_media_media_key_key" ON "site_media"("media_key");

-- CreateIndex
CREATE INDEX "idx_site_media_media_key" ON "site_media"("media_key");

-- CreateIndex
CREATE UNIQUE INDEX "pages_slug_key" ON "pages"("slug");

-- CreateIndex
CREATE INDEX "idx_pages_slug" ON "pages"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "settings_setting_key_key" ON "settings"("setting_key");

-- CreateIndex
CREATE INDEX "idx_testimonials_is_published" ON "testimonials"("is_published");

-- CreateIndex
CREATE INDEX "idx_admin_activity_log_admin_id" ON "admin_activity_log"("admin_id");

-- CreateIndex
CREATE INDEX "idx_admin_activity_log_action" ON "admin_activity_log"("action");

-- CreateIndex
CREATE INDEX "idx_admin_activity_log_created_at" ON "admin_activity_log"("created_at");

-- CreateIndex
CREATE INDEX "idx_admin_activity_log_record_id" ON "admin_activity_log"("record_id");

-- CreateIndex
CREATE INDEX "idx_admin_activity_log_table_name" ON "admin_activity_log"("table_name");

-- CreateIndex
CREATE INDEX "idx_email_queue_status" ON "email_queue"("status");

-- CreateIndex
CREATE INDEX "idx_email_queue_priority" ON "email_queue"("priority");

-- CreateIndex
CREATE INDEX "idx_email_queue_scheduled_at" ON "email_queue"("scheduled_at");

-- CreateIndex
CREATE INDEX "idx_email_queue_recipient_email" ON "email_queue"("recipient_email");

-- CreateIndex
CREATE INDEX "idx_email_queue_created_at" ON "email_queue"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_template_name_key" ON "email_templates"("template_name");

-- CreateIndex
CREATE INDEX "idx_email_templates_template_name" ON "email_templates"("template_name");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_session_token_key" ON "user_sessions"("session_token");

-- CreateIndex
CREATE INDEX "idx_user_sessions_user_id" ON "user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_sessions_session_token" ON "user_sessions"("session_token");

-- CreateIndex
CREATE INDEX "idx_user_sessions_expires_at" ON "user_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "idx_user_sessions_is_active" ON "user_sessions"("is_active");

-- CreateIndex
CREATE INDEX "idx_order_status_history_order_id" ON "order_status_history"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "idx_pwd_reset_token" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "idx_pwd_reset_user_id" ON "password_reset_tokens"("user_id");

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "package_images" ADD CONSTRAINT "package_images_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "coupon_usage" ADD CONSTRAINT "coupon_usage_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "coupon_usage" ADD CONSTRAINT "coupon_usage_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "coupon_usage" ADD CONSTRAINT "coupon_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_files" ADD CONSTRAINT "order_files_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_files" ADD CONSTRAINT "order_files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admin_activity_log" ADD CONSTRAINT "admin_activity_log_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Domain integrity constraints intentionally aligned with application enums.
ALTER TABLE "users" ADD CONSTRAINT "users_role_check"
  CHECK ("role" IN ('customer', 'admin', 'super_admin'));
ALTER TABLE "offers" ADD CONSTRAINT "offers_discount_percentage_check"
  CHECK ("discount_percentage" >= 0 AND "discount_percentage" <= 100);
ALTER TABLE "offers" ADD CONSTRAINT "offers_valid_date_range_check"
  CHECK ("end_date" > "start_date");
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_discount_type_check"
  CHECK ("discount_type" IN ('percentage', 'fixed'));
ALTER TABLE "orders" ADD CONSTRAINT "orders_status_check"
  CHECK ("status" IN ('pending', 'pending_payment', 'paid', 'awaiting_information', 'received', 'in_progress', 'under_review', 'ready', 'completed', 'cancelled', 'refunded'));
ALTER TABLE "payments" ADD CONSTRAINT "payments_payment_method_check"
  CHECK ("payment_method" IN ('card', 'apple_pay', 'mada', 'telr', 'paytabs', 'other'));
ALTER TABLE "payments" ADD CONSTRAINT "payments_status_check"
  CHECK ("status" IN ('pending', 'paid', 'success', 'failed', 'refunded'));
ALTER TABLE "settings" ADD CONSTRAINT "settings_setting_type_check"
  CHECK ("setting_type" IN ('string', 'number', 'boolean', 'json'));
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_rating_check"
  CHECK ("rating" IS NULL OR ("rating" >= 1 AND "rating" <= 5));
ALTER TABLE "email_queue" ADD CONSTRAINT "email_queue_status_check"
  CHECK ("status" IN ('pending', 'processing', 'sent', 'failed', 'cancelled'));
ALTER TABLE "email_queue" ADD CONSTRAINT "email_queue_priority_check"
  CHECK ("priority" IS NULL OR ("priority" >= 1 AND "priority" <= 10));
