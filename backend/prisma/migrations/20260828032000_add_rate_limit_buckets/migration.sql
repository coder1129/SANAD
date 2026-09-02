CREATE TABLE "rate_limit_buckets" (
    "key" VARCHAR(255) NOT NULL,
    "count" INTEGER NOT NULL,
    "reset_at" TIMESTAMP(6) NOT NULL,
    CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "idx_rate_limit_buckets_reset_at"
ON "rate_limit_buckets"("reset_at");
