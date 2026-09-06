CREATE TABLE "package_reviews" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "package_id" INTEGER NOT NULL,
    "order_id" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_reviews_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "package_reviews_rating_check" CHECK ("rating" BETWEEN 1 AND 5),
    CONSTRAINT "package_reviews_status_check" CHECK ("status" IN ('pending', 'published', 'hidden'))
);

CREATE UNIQUE INDEX "package_reviews_order_id_key" ON "package_reviews"("order_id");
CREATE INDEX "idx_package_reviews_user_id" ON "package_reviews"("user_id");
CREATE INDEX "idx_package_reviews_package_id" ON "package_reviews"("package_id");
CREATE INDEX "idx_package_reviews_status" ON "package_reviews"("status");
CREATE INDEX "idx_package_reviews_created_at" ON "package_reviews"("created_at");

ALTER TABLE "package_reviews" ADD CONSTRAINT "package_reviews_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "package_reviews" ADD CONSTRAINT "package_reviews_package_id_fkey"
FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "package_reviews" ADD CONSTRAINT "package_reviews_order_id_fkey"
FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
