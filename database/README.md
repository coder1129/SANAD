# Database compatibility directory

قاعدة بيانات التطبيق تُدار بواسطة Prisma فقط:

- المخطط: `../backend/prisma/schema.prisma`
- migrations: `../backend/prisma/migrations/`
- التطبيق: من `backend/` شغّل `npm run db:migrate`

الملفات `01_create_database.sql` و`sanad_db_complete.sql` و`04_insert_data.sql` و`create_admin.sql` ملفات توافق قديمة ومعطلة عمدًا. لا تستخدمها لإنشاء قاعدة جديدة.

يمكن تشغيل `install.bat` على Windows أو `install.sh` على Linux/macOS كغلاف لأوامر Prisma. لا تنشئ هذه السكربتات حسابات تجريبية ولا تحتوي كلمات مرور ثابتة.
