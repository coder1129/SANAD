require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const packageCatalog = [
  {
    legacyName: 'Complete Package',
    nameAr: 'باقة التوقيع الذهبي',
    nameEn: 'Golden Signature Package',
    descriptionAr:
      'حل متكامل يجمع أهم مستنداتك المهنية في ملف واحد متناسق وجاهز للفرص الجديدة.',
    descriptionEn:
      'A complete, coordinated career-document suite for presenting one clear professional story across every application touchpoint.',
    price: 799,
    featuresAr: [
      'سيرة ذاتية احترافية',
      'خطاب تعريفي',
      'تحسين الملف الشخصي على لينكدإن',
      'ملف التقديم على الوظائف',
    ],
    featuresEn: [
      'Professional CV',
      'Cover Letter',
      'LinkedIn Profile Optimization',
      'Job Application File',
    ],
    deliveryDays: 10,
    maxRevisions: 3,
    imagePath: '/images/packages/golden-signature-package.png',
    altText:
      'Premium coordinated collection of professional career documents on an executive desk',
  },
  {
    legacyName: 'Advanced Package',
    nameAr: 'باقة التفوق المهني',
    nameEn: 'Career Excellence Package',
    descriptionAr:
      'مجموعة مهنية متناسقة توحّد سيرتك الذاتية وخطابك التعريفي وملفك على لينكدإن.',
    descriptionEn:
      'A coordinated CV, cover letter, and professional profile package designed to keep your positioning consistent.',
    price: 499,
    featuresAr: [
      'سيرة ذاتية احترافية',
      'خطاب تعريفي',
      'تحسين الملف الشخصي على لينكدإن',
    ],
    featuresEn: [
      'Professional CV',
      'Cover Letter',
      'LinkedIn Profile Optimization',
    ],
    deliveryDays: 7,
    maxRevisions: 2,
    imagePath: '/images/packages/career-excellence-package.png',
    altText:
      'Coordinated CV, cover letter, and professional profile planning set in a modern office',
  },
  {
    legacyName: 'Basic Package',
    nameAr: 'باقة التميز الاحترافي',
    nameEn: 'Professional Distinction Package',
    descriptionAr:
      'سيرة ذاتية وخطاب تعريفي متطابقان لتقديم خبرتك المهنية بصورة واضحة ومتسقة.',
    descriptionEn:
      'A focused CV and matching cover letter pair for a clear, consistent professional presentation.',
    price: 299,
    featuresAr: ['سيرة ذاتية احترافية', 'خطاب تعريفي'],
    featuresEn: ['Professional CV', 'Cover Letter'],
    deliveryDays: 5,
    maxRevisions: 1,
    imagePath: '/images/packages/professional-distinction-package.png',
    altText:
      'Matching professional CV and cover letter presented side by side on an executive desk',
  },
  {
    nameAr: 'السيرة الذاتية الاحترافية',
    nameEn: 'Professional CV',
    descriptionAr:
      'خدمة مستقلة لكتابة سيرتك الذاتية وتحسين محتواها وبنيتها وعرض خبراتك بوضوح.',
    descriptionEn:
      'A standalone professional CV writing and optimization service focused on clarity, structure, and career relevance.',
    price: 199,
    featuresAr: [
      'كتابة وتحسين السيرة الذاتية',
      'بنية واعية بأنظمة تتبع المتقدمين',
      'عرض واضح للخبرات والإنجازات',
    ],
    featuresEn: [
      'Professional CV writing and optimization',
      'ATS-conscious content structure',
      'Clear experience and achievement positioning',
    ],
    deliveryDays: 5,
    maxRevisions: 2,
    imagePath: '/images/packages/professional-cv.png',
    altText:
      'Single professional CV being carefully reviewed on a navy executive desk pad',
  },
  {
    nameAr: 'تحسين الملف الشخصي على لينكدإن',
    nameEn: 'LinkedIn Profile Optimization',
    descriptionAr:
      'خدمة مستقلة لتحسين العنوان والنبذة والخبرات وبناء حضور مهني أكثر اتساقًا على لينكدإن.',
    descriptionEn:
      'A standalone professional LinkedIn profile optimization service for a clearer, more consistent professional presence.',
    price: 149,
    featuresAr: [
      'تحسين العنوان المهني والنبذة',
      'إعادة صياغة الخبرات',
      'إرشادات عملية لتحسين الملف',
    ],
    featuresEn: [
      'Headline and About section optimization',
      'Experience section refinement',
      'Practical profile improvement guidance',
    ],
    deliveryDays: 4,
    maxRevisions: 1,
    imagePath: '/images/packages/linkedin-profile-optimization.png',
    altText:
      'Generic professional networking profile dashboard in a contemporary corporate workspace',
  },
  {
    nameAr: 'خدمة التقديم على الوظائف',
    nameEn: 'Job Application Service',
    descriptionAr:
      'دعم مهني منظم لتجهيز مستندات التقديم ومتابعة خطوات التقديم على الفرص المناسبة.',
    descriptionEn:
      'Professional job-application support for organizing opportunities, tailoring documents, and preparing a clear submission workflow.',
    price: 249,
    featuresAr: [
      'تنظيم فرص التقديم المستهدفة',
      'تجهيز مستندات التقديم',
      'قائمة تحقق ومسار تقديم واضح',
    ],
    featuresEn: [
      'Target opportunity organization',
      'Job application document support',
      'Submission checklist and workflow',
    ],
    deliveryDays: 3,
    maxRevisions: 1,
    imagePath: '/images/packages/job-application-service.png',
    altText:
      'Organized professional job application workflow with documents, checklist, and progress dashboard',
  },
];

async function findExistingPackage(item) {
  const candidateNames = [item.nameEn, item.legacyName].filter(Boolean);

  return prisma.packages.findFirst({
    where: { name_en: { in: candidateNames } },
    orderBy: { id: 'asc' },
  });
}

async function savePrimaryImage(packageId, imagePath, altText) {
  const primaryImage = await prisma.package_images.findFirst({
    where: { package_id: packageId, is_primary: true },
    orderBy: [{ display_order: 'asc' }, { id: 'asc' }],
  });

  if (primaryImage) {
    await prisma.package_images.update({
      where: { id: primaryImage.id },
      data: {
        image_path: imagePath,
        alt_text: altText,
        display_order: 0,
      },
    });
    return;
  }

  await prisma.package_images.create({
    data: {
      package_id: packageId,
      image_path: imagePath,
      alt_text: altText,
      is_primary: true,
      display_order: 0,
    },
  });
}

async function main() {
  const activePackageIds = [];

  for (const [index, item] of packageCatalog.entries()) {
    const existing = await findExistingPackage(item);
    const data = {
      name_ar: item.nameAr,
      name_en: item.nameEn,
      description_ar: item.descriptionAr,
      description_en: item.descriptionEn,
      price: item.price,
      features_ar: item.featuresAr,
      features_en: item.featuresEn,
      is_active: true,
      sort_order: index + 1,
      delivery_days: item.deliveryDays,
      max_revisions: item.maxRevisions,
    };

    const saved = existing
      ? await prisma.packages.update({ where: { id: existing.id }, data })
      : await prisma.packages.create({ data });

    await savePrimaryImage(saved.id, item.imagePath, item.altText);
    activePackageIds.push(saved.id);
  }

  const defaultSettings = [
    { setting_key: 'whatsapp_number', setting_value: '+971500000000', description: 'WhatsApp contact number' },
    { setting_key: 'support_email', setting_value: 'saanadcv@gmail.com', description: 'Support email address' },
    { setting_key: 'currency', setting_value: 'AED', description: 'System currency code' },
    { setting_key: 'site_name', setting_value: 'سند | المنصة الأولى للخدمات المهنية', description: 'Site name (Arabic)' },
    { setting_key: 'site_name_en', setting_value: 'SANAD | Professional Career Services', description: 'Site name (English)' },
    { setting_key: 'facebook_url', setting_value: 'https://facebook.com', description: 'Facebook page URL' },
    { setting_key: 'instagram_url', setting_value: 'https://instagram.com', description: 'Instagram profile URL' },
    { setting_key: 'linkedin_url', setting_value: 'https://linkedin.com', description: 'LinkedIn company URL' },
    { setting_key: 'twitter_url', setting_value: 'https://x.com', description: 'X / Twitter profile URL' },
  ];

  for (const s of defaultSettings) {
    await prisma.settings.upsert({
      where: { setting_key: s.setting_key },
      update: {},
      create: {
        setting_key: s.setting_key,
        setting_value: s.setting_value,
        description: s.description,
        setting_type: 'string',
      },
    });
  }

  process.stdout.write(
    `Seeded ${activePackageIds.length} active SANAD career services and default settings.\n`,
  );
}

main()
  .catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
