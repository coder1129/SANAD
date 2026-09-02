# سكريبتات SQL إضافية للصيانة

## 1. نسخ احتياطي

### Windows (PowerShell)
```powershell
# نسخ احتياطي كامل
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
pg_dump -U postgres -d sanad_db -F c -f "backup_sanad_db_$timestamp.dump"

# نسخ احتياطي للبيانات فقط
pg_dump -U postgres -d sanad_db --data-only -f "backup_sanad_db_data_$timestamp.sql"
```

### Linux/Mac (Bash)
```bash
#!/bin/bash
# نسخ احتياطي كامل
timestamp=$(date +"%Y%m%d_%H%M%S")
pg_dump -U postgres -d sanad_db -F c -f "backup_sanad_db_$timestamp.dump"

# نسخ احتياطي للبيانات فقط
pg_dump -U postgres -d sanad_db --data-only -f "backup_sanad_db_data_$timestamp.sql"
```

## 2. استعادة النسخة الاحتياطية

```bash
# استعادة من dump
pg_restore -U postgres -d sanad_db -c backup_sanad_db_20260821_120000.dump

# استعادة من SQL
psql -U postgres -d sanad_db -f backup_sanad_db_data_20260821_120000.sql
```

## 3. تنظيف البيانات

```sql
-- حذف الجلسات المنتهية
DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP;

-- حذف الإيميلات المرسلة القديمة (أكثر من 30 يوم)
DELETE FROM email_queue 
WHERE status = 'sent' 
AND sent_at < CURRENT_DATE - INTERVAL '30 days';

-- حذف الإشعارات المقروءة القديمة (أكثر من 60 يوم)
DELETE FROM notifications
WHERE is_read = TRUE
AND read_at < CURRENT_DATE - INTERVAL '60 days';

-- تنظيف محاولات تسجيل الدخول الفاشلة
UPDATE users
SET failed_login_attempts = 0,
    account_locked = FALSE,
    locked_until = NULL
WHERE account_locked = TRUE
AND locked_until < CURRENT_TIMESTAMP;
```

## 4. إحصائيات متقدمة

```sql
-- إيرادات شهرية
SELECT
    DATE_TRUNC('month', payment_date) as month,
    COUNT(*) as payment_count,
    SUM(amount) as total_revenue
FROM payments
WHERE status = 'success'
GROUP BY month
ORDER BY month DESC;

-- أكثر الباقات مبيعاً
SELECT
    p.name_ar,
    COUNT(o.id) as order_count,
    SUM(o.final_amount) as total_revenue
FROM packages p
LEFT JOIN orders o ON p.id = o.package_id
WHERE o.status IN ('paid', 'processing', 'completed')
GROUP BY p.id, p.name_ar
ORDER BY order_count DESC;

-- أداء الكوبونات
SELECT
    c.code,
    COUNT(cu.id) as usage_count,
    SUM(cu.discount_amount) as total_discount,
    AVG(cu.discount_amount) as avg_discount
FROM coupons c
LEFT JOIN coupon_usage cu ON c.id = cu.coupon_id
GROUP BY c.id, c.code
ORDER BY total_discount DESC;

-- معدل التحويل (من pending إلى paid)
SELECT
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
    COUNT(CASE WHEN status IN ('paid', 'processing', 'completed') THEN 1 END) as paid_orders,
    ROUND(
        COUNT(CASE WHEN status IN ('paid', 'processing', 'completed') THEN 1 END)::NUMERIC /
        NULLIF(COUNT(*), 0) * 100,
        2
    ) as conversion_rate
FROM orders;

-- العملاء الأكثر شراءً
SELECT
    u.name,
    u.email,
    COUNT(o.id) as order_count,
    SUM(o.final_amount) as total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.role = 'customer'
GROUP BY u.id, u.name, u.email
HAVING COUNT(o.id) > 0
ORDER BY total_spent DESC
LIMIT 10;
```

## 5. تحسين الأداء

```sql
-- تحديث الإحصائيات
ANALYZE;

-- إعادة فهرسة الجداول
REINDEX TABLE orders;
REINDEX TABLE payments;
REINDEX TABLE users;

-- تفريغ الجداول من البيانات المحذوفة
VACUUM ANALYZE orders;
VACUUM ANALYZE payments;
VACUUM ANALYZE users;
```

## 6. مراقبة حجم قاعدة البيانات

```sql
-- حجم قاعدة البيانات
SELECT
    pg_size_pretty(pg_database_size('sanad_db')) as database_size;

-- حجم كل جدول
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- حجم الفهارس
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_indexes
JOIN pg_class ON pg_indexes.indexname = pg_class.relname
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
```

## 7. نقل البيانات

```sql
-- تصدير الطلبات إلى CSV
COPY (
    SELECT
        order_number,
        customer_name,
        customer_email,
        package_name_ar,
        status,
        final_amount,
        created_at
    FROM v_orders_details
) TO '/tmp/orders_export.csv' WITH CSV HEADER;

-- تصدير المدفوعات الناجحة
COPY (
    SELECT * FROM v_successful_payments
) TO '/tmp/payments_export.csv' WITH CSV HEADER;
```

## 8. إنشاء مستخدم قاعدة بيانات خاص بالتطبيق

```sql
-- إنشاء مستخدم
CREATE USER sanad_app WITH PASSWORD 'your_secure_password_here';

-- منح الصلاحيات
GRANT CONNECT ON DATABASE sanad_db TO sanad_app;
GRANT USAGE ON SCHEMA public TO sanad_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO sanad_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sanad_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO sanad_app;

-- للجداول الجديدة في المستقبل
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO sanad_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO sanad_app;
```

## 9. مراقبة الأداء

```sql
-- الاستعلامات البطيئة
SELECT
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- الجداول الأكثر استخداماً
SELECT
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    idx_tup_fetch
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY seq_scan + idx_scan DESC;
```

## 10. التحقق من سلامة البيانات

```sql
-- التحقق من الطلبات بدون مدفوعات
SELECT
    order_number,
    customer_name,
    status,
    final_amount,
    created_at
FROM orders
WHERE status IN ('paid', 'processing', 'completed')
AND id NOT IN (SELECT DISTINCT order_id FROM payments WHERE status = 'success');

-- التحقق من المدفوعات بدون طلبات
SELECT
    transaction_id,
    amount,
    status,
    payment_date
FROM payments
WHERE order_id NOT IN (SELECT id FROM orders);

-- التحقق من الكوبونات المستخدمة أكثر من الحد المسموح
SELECT
    c.code,
    c.usage_limit,
    c.times_used,
    COUNT(cu.id) as actual_usage
FROM coupons c
LEFT JOIN coupon_usage cu ON c.id = cu.coupon_id
WHERE c.usage_limit IS NOT NULL
GROUP BY c.id, c.code, c.usage_limit, c.times_used
HAVING COUNT(cu.id) > c.usage_limit;
```
