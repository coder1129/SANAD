ALTER TABLE "payments"
  DROP CONSTRAINT IF EXISTS "payments_payment_method_check";

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_payment_method_check"
  CHECK (
    "payment_method" IN (
      'card',
      'apple_pay',
      'mada',
      'telr',
      'paytabs',
      'payment_link',
      'qr_code',
      'bank_transfer',
      'cash',
      'other'
    )
  );
