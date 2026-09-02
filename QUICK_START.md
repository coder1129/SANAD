# البدء السريع

نفّذ الأوامر التالية من مجلد `backend/`:

```bash
npm install
```

انسخ `.env.example` إلى `.env` واضبط `DATABASE_URL` والأسرار المطلوبة، ثم:

```bash
npm run db:migrate
npx prisma generate
npm run start:dev
```

يمكن تشغيل PostgreSQL وRedis محليًا عبر:

```bash
docker compose up -d
```

يجب ضبط `POSTGRES_PASSWORD` و`REDIS_PASSWORD` قبل تشغيل Docker Compose. لا توجد حسابات أو كلمات مرور افتراضية. لإنشاء أول مدير، اضبط `ADMIN_EMAIL` و`ADMIN_PASSWORD` ثم شغّل `npm run db:seed-admin`.
