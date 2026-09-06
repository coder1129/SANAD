-- AlterTable
ALTER TABLE "testimonials" ADD COLUMN "package_id" INTEGER;

-- CreateIndex
CREATE INDEX "idx_testimonials_package_id" ON "testimonials"("package_id");

-- AddForeignKey
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_package_id_fkey"
  FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
