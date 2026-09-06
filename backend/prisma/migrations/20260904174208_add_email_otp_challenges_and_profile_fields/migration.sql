-- AlterTable
ALTER TABLE "users" ADD COLUMN     "first_name" VARCHAR(100),
ADD COLUMN     "gender" VARCHAR(20),
ADD COLUMN     "last_name" VARCHAR(100),
ALTER COLUMN "password_hash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "email_otp_challenges" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "otp_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "consumed_at" TIMESTAMP(6),
    "last_sent_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_otp_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_email_otp_challenges_email" ON "email_otp_challenges"("email");

-- CreateIndex
CREATE INDEX "idx_email_otp_challenges_expires_at" ON "email_otp_challenges"("expires_at");
