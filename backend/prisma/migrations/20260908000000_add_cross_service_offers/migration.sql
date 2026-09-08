ALTER TABLE "offers" ADD COLUMN "trigger_package_id" INTEGER;
ALTER TABLE "offers" ADD COLUMN "offer_type" VARCHAR(30) NOT NULL DEFAULT 'standard';
CREATE INDEX "idx_offers_trigger_package_id" ON "offers"("trigger_package_id");
ALTER TABLE "offers"
  ADD CONSTRAINT "offers_trigger_package_id_fkey"
  FOREIGN KEY ("trigger_package_id") REFERENCES "packages"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "orders" ADD COLUMN "secondary_package_id" INTEGER;
ALTER TABLE "orders" ADD COLUMN "secondary_original_amount" DECIMAL(10,2);
ALTER TABLE "orders" ADD COLUMN "secondary_discount_amount" DECIMAL(10,2) DEFAULT 0;
CREATE INDEX "idx_orders_secondary_package_id" ON "orders"("secondary_package_id");
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_secondary_package_id_fkey"
  FOREIGN KEY ("secondary_package_id") REFERENCES "packages"("id")
  ON DELETE SET NULL ON UPDATE NO ACTION;
