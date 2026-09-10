# دليل نشر SANAD على استضافة عامة

هذا الدليل غير مرتبط بـ Vercel أو Railway. الطريقة الموصى بها هي تشغيل المشروع على خادم Linux أو أي مزوّد يدعم Docker Compose.

## البنية

- `web`: واجهة Next.js تعمل كخادم Node.js كامل، وليست Static Export.
- `api`: واجهة NestJS الخلفية.
- `postgres`: قاعدة PostgreSQL مع Volume دائم.
- `uploads`: تخزين دائم للملفات عند عدم استخدام R2/S3.
- `database_backups`: Volume لنسخ قاعدة البيانات.
- Nginx أو Reverse Proxy مشابه: إنهاء HTTPS وتوجيه الدومينات إلى الحاويات المحلية.

الخدمات ترتبط بالمضيف على `127.0.0.1` فقط؛ لا يتم كشف Node.js أو PostgreSQL مباشرة للإنترنت.

## متطلبات الخادم

- Linux حديث بذاكرة 2 GB على الأقل، ويفضل 4 GB للبناء على نفس الخادم.
- Docker Engine وDocker Compose v2.
- دومين يشير إلى الخادم.
- Nginx ووسيلة إصدار شهادة TLS مثل Certbot، أو Reverse Proxy مُدار.
- مساحة خارج الخادم لنسخ احتياطية دورية.

## 1. إعداد متغيرات الإنتاج

من جذر المشروع:

```bash
cp .env.production.example .env.production
chmod 600 .env.production
```

استبدل كل قيمة `replace-with-*` واضبط على الأقل:

- `POSTGRES_PASSWORD`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `PAYMENT_WEBHOOK_SECRET`
- `PAYMENT_PROVIDER=manual`
- `FRONTEND_URL`
- `CORS_ORIGINS`
- `NEXT_PUBLIC_API_BASE_URL`، ويجب أن ينتهي بـ `/api/v1`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_MEDIA_BASE_URL`
- `NEXT_PUBLIC_CHECKOUT_MODE=manual`
- مزود بريد عبر `RESEND_API_KEY` أو إعدادات `SMTP_*`

ولّد الأسرار بقيم عشوائية مختلفة، طول كل منها 32 بايت على الأقل. لا تحفظ ملف `.env.production` الحقيقي داخل Git.

إذا كانت الملفات ستُحفظ محليًا، اترك جميع متغيرات `R2_*` فارغة وسيستخدم النظام Volume باسم `uploads`. أما عند استخدام R2/S3، فيجب إدخال إعداداته كاملة.

متغيرات `NEXT_PUBLIC_*` تُدمج داخل الواجهة أثناء `docker compose build`. أي تغيير فيها يحتاج إعادة بناء حاوية `web`، وليس مجرد إعادة تشغيلها.

## 2. فحص الإعدادات قبل النشر

تحقق أولًا من ملف Compose:

```bash
SANAD_ENV_FILE=.env.production docker compose --env-file .env.production -f docker-compose.production.yml config --quiet
```

ابنِ الصور:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml build
```

حاوية الـAPI تشغّل فحص بيئة الإنتاج ثم `prisma migrate deploy` تلقائيًا قبل بدء التطبيق. إذا كانت قيمة ناقصة أو غير آمنة فسيتوقف النشر بدل تشغيل إعداد غير صالح.

## 3. تشغيل المنظومة

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up -d
docker compose --env-file .env.production -f docker-compose.production.yml ps
```

تحقق محليًا على الخادم:

```bash
curl --fail http://127.0.0.1:3001/api/v1/health/live
curl --fail http://127.0.0.1:3001/api/v1/health/ready
curl --fail http://127.0.0.1:3000/
```

## 4. إعداد Nginx وHTTPS

يوجد نموذج في `deploy/nginx/sanad.conf.example`. انسخه إلى إعدادات Nginx، واستبدل `example.com` بالدومين الحقيقي، ثم اختبر الإعداد قبل إعادة التحميل:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

بعدها فعّل شهادة TLS بالطريقة المناسبة للاستضافة. لا تفتح الموقع للمستخدمين قبل عمل HTTPS وإعادة توجيه HTTP إلى HTTPS.

نموذج Nginx يعطّل buffering للواجهة لدعم Streaming في Next.js، ويحدد حجم الطلب بما يناسب حد رفع الملفات الحالي.

## 5. البيانات الأولية وحساب الإدارة

المهاجرات تعمل تلقائيًا، لكن يجب التأكد مرة واحدة من وجود الباقات المطلوبة وحساب `super_admin`. نفّذ أوامر الـseed فقط بعد مراجعة أنها لن تستبدل بيانات موجودة:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml exec api npm run db:seed-packages
docker compose --env-file .env.production -f docker-compose.production.yml exec api npm run db:seed-admin
```

## 6. النسخ الاحتياطي

لإنشاء نسخة داخل Volume الدائم:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml exec api npm run db:backup
```

النسخة وحدها على نفس الخادم لا تكفي. انسخ ملفات `.dump` و`.sha256` دوريًا إلى Object Storage أو خادم آخر، وفعّل Cron أو أداة النسخ الخاصة بمزوّد الاستضافة.

اختبر الاستعادة دوريًا على قاعدة منفصلة فقط:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml exec \
  -e RESTORE_CONFIRM=restore-test-database \
  -e RESTORE_DATABASE_URL=postgresql://user:password@test-db:5432/sanad_restore \
  api npm run db:restore:check -- /app/backups/backup-file.dump
```

السكريبت يرفض الاستعادة إذا كانت قاعدة الاختبار هي نفس قاعدة الإنتاج.

## 7. تحديث نسخة منشورة

```bash
git pull --ff-only
docker compose --env-file .env.production -f docker-compose.production.yml build
docker compose --env-file .env.production -f docker-compose.production.yml up -d
```

راجع حالة الخدمات والـlogs بعد كل تحديث:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml ps
docker compose --env-file .env.production -f docker-compose.production.yml logs --tail=200 api web
```

## 8. بوابة القبول قبل فتح الموقع

- كل اختبارات Backend وFrontend ناجحة.
- `npm audit --omit=dev` لا يعرض ثغرات عالية أو حرجة.
- `/health/live` و`/health/ready` يعملان من الدومين النهائي.
- التسجيل وتسجيل الدخول والتحقق بالبريد تعمل برسائل حقيقية.
- CORS يسمح للدومين النهائي فقط.
- رفع ملف وتنزيله ينجحان، ويظل الملف موجودًا بعد إعادة تشغيل الحاويات.
- حساب العميل لا يستطيع الوصول إلى لوحة الإدارة.
- إنشاء طلب جديد ينتهي بحالة `pending_payment` ويعرض زر واتساب، ولا ينشئ دفعة صفرية أو يفتح صفحة البطاقة/Apple Pay.
- صفحة `/checkout/pay` تعيد 404 في وضع `manual` مع بقاء كودها محفوظًا لإعادة تفعيل بوابة الدفع لاحقًا.
- تأكيد الدفع من تفاصيل الطلب في لوحة الإدارة لا ينجح إلا بعد إدخال مبلغ يطابق إجمالي الطلب، ويظهر بعدها في الإيرادات والعملاء المشترين وسجل النشاط.
- لا يمكن تحويل الطلب يدويًا إلى `paid` من قائمة الحالات، ولا إكماله أو فتح التقييم دون دفعة موجبة مؤكدة.
- النسخ الاحتياطي يعمل وتم اختبار الاستعادة على قاعدة منفصلة.
- `SWAGGER_ENABLED=false` و`TRUST_PROXY=1` خلف الـReverse Proxy.
- لا توجد متغيرات Demo أو أسرار افتراضية.
- Sentry أو نظام مراقبة بديل يستقبل الأخطاء، مع مراقبة دورية للـhealth endpoint.

## ملاحظات التوسع

الإعداد الحالي مناسب لخادم واحد. عند تشغيل أكثر من نسخة من Next.js أو الـAPI خلف Load Balancer، أضف Cache مشتركًا مثل Redis، واضبط `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` وDeployment ID موحدين، ونسّق عمليات background workers حتى لا تعمل المهمة نفسها في أكثر من نسخة.
