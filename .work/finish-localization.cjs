const fs = require('fs');
const p = 'frontend/messages/interface-ar.json';
const d = JSON.parse(fs.readFileSync(p, 'utf8'));
Object.assign(d, {
  'My Orders': 'طلباتي', 'Order Details': 'تفاصيل الطلب', 'Order Confirmed': 'تم تأكيد الطلب',
  'My Profile': 'ملفي الشخصي', 'Admin Dashboard': 'لوحة الإدارة', 'Administrator Sign In': 'تسجيل دخول الإدارة',
  'FAQ': 'الأسئلة الشائعة', 'Client Feedback': 'آراء العملاء', 'Career Services': 'الخدمات المهنية',
  'Career Service': 'خدمة مهنية', 'SANAD Career Services': 'خدمات سند المهنية', 'SANAD': 'سند',
  'About Us': 'من نحن', 'Privacy Policy': 'سياسة الخصوصية', 'Terms & Conditions': 'الشروط والأحكام',
  'Find answers about SANAD career services, delivery, revisions, privacy, and choosing the right package.': 'إجابات عن خدمات سند المهنية والتسليم والتعديلات والخصوصية واختيار الباقة المناسبة.',
  'Read published client feedback and service ratings from SANAD career services.': 'اطّلع على آراء العملاء المنشورة وتقييماتهم لخدمات سند المهنية.',
  'Compare CV writing, LinkedIn optimization, application support and complete career packages by scope, price, delivery and revisions.': 'قارن خدمات كتابة السيرة الذاتية وتحسين لينكدإن ودعم التقديم والباقات المهنية حسب المحتوى والسعر والتسليم والتعديلات.',
  'SANAD helps professionals present their experience with clarity across CVs, LinkedIn profiles, and career documents for the UAE and Gulf market.': 'تساعد سند المهنيين على عرض خبراتهم بوضوح في السير الذاتية وملفات لينكدإن والمستندات المهنية لسوق الإمارات والخليج.',
  'How SANAD collects, uses, and protects your personal and professional information.': 'كيف تجمع سند بياناتك الشخصية والمهنية وتستخدمها وتحميها.',
  'Service terms, revision policies, delivery timelines, and client agreements for SANAD career services.': 'شروط الخدمات وسياسات التعديلات ومواعيد التسليم واتفاقيات العملاء لخدمات سند المهنية.',
  'service preview': 'معاينة الخدمة', 'published review': 'تقييم منشور', 'published reviews': 'تقييمات منشورة', 's': 'ث',
  'revision': 'تعديل', 'revisions': 'تعديلات', '{0} revision': '{0} تعديل', '{0} revisions': '{0} تعديلات',
  'Edit {0}': 'تعديل {0}', 'Activate {0}': 'تفعيل {0}', 'Deactivate {0}': 'إيقاف {0}', 'Explore {0}': 'استكشاف {0}',
  'Order #{0}': 'الطلب رقم {0}', 'Payment #{0}': 'الدفعة رقم {0}',
  'Move this order to {0}? This change is recorded in the activity log.': 'هل تريد تغيير حالة الطلب إلى {0}؟ يُسجّل هذا التغيير في سجل النشاط.',
  'Too small: expected string to have >={0} characters': 'أدخل نصًا من {0} أحرف على الأقل',
  'Too big: expected string to have <={0} characters': 'أدخل نصًا لا يتجاوز {0} حرفًا',
  'Invalid email address': 'أدخل بريدًا إلكترونيًا صحيحًا',
});
fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n');
for (const p of ['frontend/messages/ar.json', 'frontend/messages/interface-ar.json']) {
  fs.writeFileSync(p, fs.readFileSync(p,'utf8').replaceAll('سناد', 'سند'));
}
