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

في الإنتاج يجب إعداد مزوّد بريد (`RESEND_API_KEY` أو SMTP)، وتحديد CORS صراحةً. يمكن استخدام R2/S3 للملفات أو التخزين المحلي مع Volume دائم مركّب على `/app/uploads`؛ لا تضع إعدادات R2 جزئية. التطبيق يرفض الأسرار القصيرة أو الافتراضية عند الإقلاع.

للنشر على أي خادم Node.js أو Docker راجع [`../DEPLOYMENT.md`](../DEPLOYMENT.md).

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

## مسار الدفع اليدوي

استخدم `PAYMENT_PROVIDER=manual` عندما يتواصل العميل عبر واتساب ويحصل على رابط دفع أو QR خارج الموقع. يُنشأ الطلب بحالة `pending_payment` دون سجل دفع وهمي، ولا يصبح مدفوعًا إلا عبر `POST /api/v1/admin/payments/manual`. يتطلب المسار صلاحية مدير، ومبلغًا مطابقًا لإجمالي الطلب، ويسجل طريقة التحصيل والمرجع والتاريخ وسجل تدقيق دائم.

لا يستطيع المدير تحويل الطلب إلى `paid` من تحديث الحالة العادي، ولا يمكن إكمال الطلب أو إضافة تقييم دون دفعة مؤكدة موجبة. تعتمد الإيرادات وعدد العملاء المشترين وعدّاد مشتري الخدمة على هذه الدفعات الفعلية فقط.

استخدم `PAYMENT_PROVIDER=mock` لمحاكاة webhook محليًا فقط؛ إعداد الإنتاج يرفضه. يظل `bypass` متاحًا للتوافق مع الاختبارات القديمة، لكنه يسجل مبلغًا محصلًا قدره صفر ولا يُحتسب شراءً أو يسمح بالتقييم.
