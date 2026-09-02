# SANAD Backend API

> Order document upload and deliverable routes are intentionally disabled.
> Customers send service requirements through the company WhatsApp channel.
> Image uploads for site content and packages remain enabled.
>
> Production deployment, load testing, backup/restore, and rollback procedures
> are documented in [`PRODUCTION_RUNBOOK.md`](./PRODUCTION_RUNBOOK.md).

REST API مبنية باستخدام NestJS وTypeScript وPostgreSQL وPrisma. تشمل مصادقة JWT مع تدوير refresh tokens، صلاحيات RBAC، طلبات ومدفوعات، كوبونات، ملفات خاصة، إشعارات وطابور بريد إلكتروني.

## المتطلبات

- Node.js 20 أو أحدث
- PostgreSQL 14 أو أحدث
- npm

Redis موجود في Docker Compose للتوسع المستقبلي، لكن rate limiting الحالي يستخدم PostgreSQL ذريًا ليعمل بأمان مع أكثر من نسخة للخادم.

## الإعداد

```bash
npm install
```

انسخ `.env.example` إلى `.env`. ولّد قيمًا عشوائية مستقلة لـ `JWT_ACCESS_SECRET` و`JWT_REFRESH_SECRET` و`PAYMENT_WEBHOOK_SECRET`، كل منها 32 حرفًا على الأقل. مثال لتوليد قيمة:

```bash
openssl rand -hex 32
```

ثم طبّق قاعدة البيانات:

```bash
npm run db:migrate
npx prisma generate
```

لا تستخدم سكربتات SQL القديمة داخل `../database/`؛ Prisma migrations هي المصدر الوحيد للمخطط.

## التشغيل

```bash
npm run start:dev
```

- API: `http://localhost:3001/api/v1`
- Swagger: `http://localhost:3001/api/docs` عند `SWAGGER_ENABLED=true` خارج الإنتاج
- health: `GET /api/v1/health`

في الإنتاج يجب إعداد R2/S3 ومزوّد بريد (`RESEND_API_KEY` أو SMTP)، وتحديد CORS صراحةً. التطبيق يرفض الأسرار القصيرة أو الافتراضية عند الإقلاع.

## إنشاء أول مدير

ضع قيمًا قوية في `ADMIN_EMAIL` و`ADMIN_PASSWORD`، ثم:

```bash
npm run db:seed-admin
```

يستخدم السكربت Argon2id ويرفض كلمات المرور الضعيفة أو استبدال حساب موجود.

## الاختبارات والتحقق

```bash
npm run test:all
npm run preflight
npx prisma validate
npx prisma migrate status
```

`test:all` يشغّل lint وفحص TypeScript واختبارات الوحدة مع التغطية وE2E
واختبار PostgreSQL الحقيقي ثم البناء. اختبار قاعدة البيانات الحالي للقراءة فقط.

## قواعد أمان أساسية

- جميع المسارات خاصة افتراضيًا؛ المسارات العامة فقط تحمل `@Public()`.
- أدوار الإدارة تُفرض بحارسين عامين، و`super_admin` يرث صلاحيات الإدارة.
- refresh/reset/session tokens مخزنة كـ SHA-256 hashes وتُلغى عند تغيير كلمة المرور أو قفل الحساب.
- webhooks تتطلب HMAC صالحًا وتطابق العملية والطلب والمبلغ والعملة.
- الملفات محدودة الحجم ويُفحص MIME والتوقيع الثنائي، وروابط التخزين المحلي موقعة ومؤقتة.
- Swagger معطل افتراضيًا في الإنتاج، وCORS لا يستخدم wildcard.

## التخطي المؤقت للدفع

استخدم `PAYMENT_PROVIDER=bypass` فقط خلال فترة تجهيز حساب بوابة الدفع. في هذا الوضع يؤكد الباك إند الطلب فور إنشائه، وينشئ سجل دفع تدقيقيًا بقيمة محصلة `0 AED`، ولا يعرض قيمة الطلب كإيراد فعلي. استدعاء `POST /api/v1/payments/create` يظل متوافقًا ويعيد السجل نفسه دون إنشاء عملية مكررة.

استخدم `PAYMENT_PROVIDER=mock` لمحاكاة webhook محليًا فقط؛ إعداد الإنتاج يرفضه. قبل تفعيل التحصيل الحقيقي، أضف مزود دفع فعليًا ثم غيّر `PAYMENT_PROVIDER` وأوقف `bypass`.
