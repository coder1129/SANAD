# مشروع سند

واجهة API لمنصة خدمات مهنية، مبنية باستخدام NestJS وTypeScript وPostgreSQL وPrisma.

المجلد `backend/` هو التطبيق الفعلي. مخطط قاعدة البيانات الرسمي موجود في `backend/prisma/schema.prisma`، وجميع تغييرات القاعدة تُطبّق حصريًا من خلال `backend/prisma/migrations/`. ملفات SQL القديمة داخل `database/` معطلة عمدًا حتى لا تنشئ مخططًا مختلفًا أو حسابات بكلمات مرور ثابتة.

## تشغيل سريع

1. انتقل إلى `backend/` وثبّت الحزم:

   ```bash
   npm install
   ```

2. انسخ `.env.example` إلى `.env`، وأنشئ أسرارًا عشوائية مستقلة لا تقل عن 32 حرفًا.

3. شغّل PostgreSQL، ثم طبّق migrations وولّد Prisma Client:

   ```bash
   npm run db:migrate
   npx prisma generate
   ```

4. شغّل الخادم:

   ```bash
   npm run start:dev
   ```

الخادم يعمل افتراضيًا على `http://localhost:3001/api/v1`، وSwagger متاح في بيئة التطوير عند ضبط `SWAGGER_ENABLED=true`.

للنشر على Railway وVercel راجع [دليل النشر](DEPLOYMENT.md).

## إنشاء أول مدير

لا توجد بيانات دخول افتراضية. ضع `ADMIN_EMAIL` و`ADMIN_PASSWORD` في `backend/.env`، ويجب أن تكون كلمة المرور قوية وفريدة، ثم شغّل:

```bash
npm run db:seed-admin
```

لن يستبدل السكربت بيانات مستخدم موجود مسبقًا.

## التحقق

```bash
npm run build
npm run lint
npm test
npm run test:e2e
```

راجع [توثيق الباك إند](backend/README.md) للتفاصيل.
