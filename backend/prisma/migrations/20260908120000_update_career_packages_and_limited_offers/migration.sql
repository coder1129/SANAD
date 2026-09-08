-- Update the three existing bundle records in place so their order history,
-- images, reviews, and testimonials remain connected to the same package IDs.
UPDATE "packages"
SET
  "name_ar" = 'الباقة المتكاملة المميزة',
  "name_en" = 'Premium Full Package',
  "description_ar" = 'باقة مهنية متكاملة باللغتين العربية والإنجليزية تشمل السيرة الذاتية وخطاب التقديم وتحسين ملف لينكدإن وملفات وخدمة التقديم على الوظائف.',
  "description_en" = 'A premium bilingual career package covering your CV, cover letter, LinkedIn profile, job application file, and job application service.',
  "price" = 800.00,
  "features_ar" = '["السيرة الذاتية (العربية + الإنجليزية) — 300 درهم", "خطاب التقديم (العربية + الإنجليزية) — 200 درهم", "تحسين ملف لينكدإن — 150 درهم", "ملف التقديم على الوظائف — 50 درهم", "خدمة التقديم على الوظائف — 100 درهم"]'::jsonb,
  "features_en" = '["CV (English + Arabic) — 300 AED", "Cover Letter (English + Arabic) — 200 AED", "LinkedIn Profile Optimization — 150 AED", "Job Application File — 50 AED", "Job Application — 100 AED"]'::jsonb,
  "updated_at" = CURRENT_TIMESTAMP
WHERE "name_en" IN ('Premium Full Package', 'Golden Signature Package', 'Complete Package');

UPDATE "packages"
SET
  "name_ar" = 'الباقة المتكاملة',
  "name_en" = 'Full Package',
  "description_ar" = 'باقة متكاملة باللغتين العربية والإنجليزية تجمع السيرة الذاتية وخطاب التقديم وتحسين ملف لينكدإن.',
  "description_en" = 'A bilingual package combining your CV, cover letter, and LinkedIn profile optimization in one coordinated service.',
  "price" = 650.00,
  "features_ar" = '["السيرة الذاتية (العربية + الإنجليزية) — 300 درهم", "خطاب التقديم (العربية + الإنجليزية) — 200 درهم", "تحسين ملف لينكدإن — 150 درهم"]'::jsonb,
  "features_en" = '["CV (English + Arabic) — 300 AED", "Cover Letter (English + Arabic) — 200 AED", "LinkedIn Profile Optimization — 150 AED"]'::jsonb,
  "updated_at" = CURRENT_TIMESTAMP
WHERE "name_en" IN ('Full Package', 'Career Excellence Package', 'Advanced Package');

UPDATE "packages"
SET
  "name_ar" = 'الباقة الاحترافية',
  "name_en" = 'Professional Package',
  "description_ar" = 'سيرة ذاتية وخطاب تقديم متناسقان باللغة العربية أو الإنجليزية حسب اختيارك.',
  "description_en" = 'A focused CV and matching cover letter in either English or Arabic, based on your preferred language.',
  "price" = 250.00,
  "features_ar" = '["السيرة الذاتية (العربية أو الإنجليزية) — 150 درهم", "خطاب التقديم (العربية أو الإنجليزية) — 100 درهم"]'::jsonb,
  "features_en" = '["CV (English or Arabic) — 150 AED", "Cover Letter (English or Arabic) — 100 AED"]'::jsonb,
  "updated_at" = CURRENT_TIMESTAMP
WHERE "name_en" IN ('Professional Package', 'Professional Distinction Package', 'Basic Package');

-- Preserve dates already managed by an admin. Existing matching offers only
-- receive the new label and percentage; a fresh offer gets a 30-day window.
UPDATE "offers"
SET
  "name_ar" = 'خصم 50% (عرض محدود)',
  "name_en" = '50% OFF (Limited Offer)',
  "description_ar" = 'خصم محدود بنسبة 50% على السعر الأساسي للباقة.',
  "description_en" = 'Limited-time 50% discount on the package base price.',
  "discount_percentage" = 50.00,
  "updated_at" = CURRENT_TIMESTAMP
WHERE "offer_type" = 'standard'
  AND "name_en" IN ('50% OFF (Limited Offer)', 'Limited Offer')
  AND "package_id" IN (
    SELECT "id"
    FROM "packages"
    WHERE "name_en" IN ('Premium Full Package', 'Full Package', 'Professional Package')
  );

INSERT INTO "offers" (
  "package_id",
  "offer_type",
  "name_ar",
  "name_en",
  "description_ar",
  "description_en",
  "discount_percentage",
  "start_date",
  "end_date",
  "is_active",
  "created_at",
  "updated_at"
)
SELECT
  package."id",
  'standard',
  'خصم 50% (عرض محدود)',
  '50% OFF (Limited Offer)',
  'خصم محدود بنسبة 50% على السعر الأساسي للباقة.',
  'Limited-time 50% discount on the package base price.',
  50.00,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP + INTERVAL '30 days',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "packages" AS package
WHERE package."name_en" IN (
  'Premium Full Package',
  'Full Package',
  'Professional Package'
)
AND NOT EXISTS (
  SELECT 1
  FROM "offers" AS offer
  WHERE offer."package_id" = package."id"
    AND offer."offer_type" = 'standard'
    AND offer."name_en" IN ('50% OFF (Limited Offer)', 'Limited Offer')
);
