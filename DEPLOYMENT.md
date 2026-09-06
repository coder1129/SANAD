# دليل النشر

هذا المشروع ينقسم إلى خدمتين:

- `backend/` على Railway
- `frontend/` على Vercel

## 1) نشر الباك إند على Railway

### الإعداد الموصى به

- أنشئ خدمة PostgreSQL على Railway.
- أنشئ خدمة Web للباك إند من مجلد `backend`.
- استخدم `backend/Dockerfile` إن أمكن، لأنه يشغّل migrations تلقائيًا قبل الإقلاع.

### متغيرات البيئة

اضبط القيم التالية في Railway:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
FRONTEND_URL=https://your-vercel-domain.vercel.app
CORS_ORIGINS=https://your-vercel-domain.vercel.app
TRUST_PROXY=1
SWAGGER_ENABLED=false
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=...
R2_PUBLIC_URL=https://media.your-domain.com
RESEND_API_KEY=...   # أو SMTP_* بدلًا منه
EMAIL_FROM=noreply@your-domain.com
PAYMENT_PROVIDER=bypass   # أو مزود دفع حقيقي
PAYMENT_WEBHOOK_SECRET=...
SENTRY_DSN=
SENTRY_ENVIRONMENT=production
```

مهم:

- لا تضبط `PORT` يدويًا على Railway، لأنه يمرره تلقائيًا.
- `PAYMENT_PROVIDER=mock` مرفوض في الإنتاج.
- لو لم يكن الدفع الحقيقي جاهزًا، استخدم `bypass` فقط مؤقتًا.

### النشر

1. اربط المستودع في Railway.
2. اجعل Root Directory هو `backend`.
3. انشر الخدمة.
4. خذ رابط Railway النهائي واستخدمه في Vercel كقيمة `NEXT_PUBLIC_API_BASE_URL`.

## 2) نشر الواجهة على Vercel

### الإعداد الموصى به

- أنشئ مشروع Vercel من مجلد `frontend`.
- اترك الإطار كـ `Next.js`.

### متغيرات البيئة

```bash
NEXT_PUBLIC_API_BASE_URL=https://your-railway-api.up.railway.app/api/v1
NEXT_PUBLIC_SITE_URL=https://your-vercel-domain.vercel.app
NEXT_PUBLIC_MEDIA_BASE_URL=https://media.your-domain.com
R2_PUBLIC_URL=https://media.your-domain.com
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_DSN=
SENTRY_ENVIRONMENT=production
SENTRY_AUTH_TOKEN=
SENTRY_ORG=
SENTRY_PROJECT=
```

مهم:

- أي تغيير في `NEXT_PUBLIC_*` يحتاج إعادة نشر للواجهة.
- `NEXT_PUBLIC_API_BASE_URL` لازم يحتوي `/api/v1` في آخره.

## 3) ترتيب الرفع

1. ارفع Railway أولًا.
2. انسخ رابط الـ API النهائي.
3. اضبط متغيرات Vercel.
4. ارفع Vercel.
5. بعد ظهور دومين Vercel النهائي، ارجعه داخل Railway في `FRONTEND_URL` و`CORS_ORIGINS`.
6. أعد نشر Railway.

## 4) فحص سريع بعد النشر

```bash
GET https://your-railway-api.up.railway.app/api/v1/health/live
GET https://your-railway-api.up.railway.app/api/v1/health/ready
```

ثم افتح الواجهة على Vercel وتأكد أن الطلبات تصل للباك إند بدون CORS errors.
