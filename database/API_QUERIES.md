# API Documentation - نماذج استعلامات شائعة

## 1. إدارة الباقات

### الحصول على جميع الباقات النشطة
```sql
SELECT * FROM v_active_packages_with_offers ORDER BY sort_order;
```

### الحصول على باقة محددة
```sql
SELECT * FROM v_active_packages_with_offers WHERE id = $1;
```

### تحديث سعر باقة
```sql
UPDATE packages SET price = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;
```

## 2. إدارة الطلبات

### إنشاء طلب جديد (مع التحقق من الكوبون)
```sql
-- الخطوة 1: التحقق من الكوبون
SELECT * FROM validate_coupon($1, $2, $3);
-- $1: coupon_code, $2: user_id, $3: order_amount

-- الخطوة 2: حساب السعر النهائي
SELECT * FROM calculate_order_total($1, $2, $3);
-- $1: package_price, $2: discount_amount, $3: vat_percentage

-- الخطوة 3: إنشاء الطلب
INSERT INTO orders (
    order_number, user_id, package_id, customer_name,
    customer_email, customer_phone, status, original_amount,
    discount_amount, vat_amount, total_amount, final_amount,
    coupon_code, delivery_date
) VALUES (
    generate_order_number(), $1, $2, $3, $4, $5, 'pending',
    $6, $7, $8, $9, $10, $11, CURRENT_DATE + INTERVAL '$12 days'
) RETURNING *;
```

### الحصول على طلبات العميل
```sql
SELECT * FROM v_orders_details 
WHERE user_id = $1 
ORDER BY created_at DESC;
```

### الحصول على طلب محدد
```sql
SELECT * FROM v_orders_details WHERE order_number = $1;
```

### تحديث حالة الطلب
```sql
UPDATE orders 
SET status = $1, updated_at = CURRENT_TIMESTAMP 
WHERE id = $2 
RETURNING *;
```

### البحث في الطلبات
```sql
-- البحث بالاسم أو البريد أو الهاتف أو رقم الطلب
SELECT * FROM v_orders_details
WHERE 
    customer_name ILIKE '%' || $1 || '%'
    OR customer_email ILIKE '%' || $1 || '%'
    OR customer_phone ILIKE '%' || $1 || '%'
    OR order_number ILIKE '%' || $1 || '%'
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
```

## 3. إدارة المدفوعات

### إضافة دفعة جديدة
```sql
INSERT INTO payments (
    order_id, transaction_id, payment_method,
    amount, currency, status, payment_date, payment_response
) VALUES (
    $1, $2, $3, $4, 'AED', 'success', CURRENT_TIMESTAMP, $5
) RETURNING *;
```

### الحصول على مدفوعات طلب
```sql
SELECT * FROM payments 
WHERE order_id = $1 
ORDER BY created_at DESC;
```

### الحصول على المدفوعات الناجحة
```sql
SELECT * FROM v_successful_payments 
ORDER BY payment_date DESC 
LIMIT $1 OFFSET $2;
```

## 4. إدارة الكوبونات

### الحصول على جميع الكوبونات
```sql
SELECT * FROM v_coupon_statistics ORDER BY created_at DESC;
```

### إنشاء كوبون جديد
```sql
INSERT INTO coupons (
    code, discount_type, discount_value, 
    min_order_amount, max_discount_amount,
    usage_limit, usage_per_user,
    start_date, end_date, is_active
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
) RETURNING *;
```

### تحديث كوبون
```sql
UPDATE coupons 
SET 
    discount_value = $1,
    min_order_amount = $2,
    usage_limit = $3,
    is_active = $4,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $5
RETURNING *;
```

### تعطيل/تفعيل كوبون
```sql
UPDATE coupons 
SET is_active = $1, updated_at = CURRENT_TIMESTAMP 
WHERE id = $2;
```

## 5. إدارة العروض

### الحصول على العروض النشطة
```sql
SELECT o.*, p.name_ar as package_name
FROM offers o
JOIN packages p ON o.package_id = p.id
WHERE o.is_active = TRUE
AND o.start_date <= CURRENT_TIMESTAMP
AND o.end_date >= CURRENT_TIMESTAMP
ORDER BY o.created_at DESC;
```

### إنشاء عرض جديد
```sql
INSERT INTO offers (
    package_id, name_ar, name_en, description_ar,
    description_en, discount_percentage, start_date,
    end_date, is_active
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
) RETURNING *;
```

## 6. إدارة المستخدمين

### تسجيل مستخدم جديد
```sql
INSERT INTO users (name, email, phone, password_hash, role)
VALUES ($1, $2, $3, crypt($4, gen_salt('bf')), 'customer')
RETURNING id, name, email, phone, role, created_at;
```

### تسجيل الدخول
```sql
SELECT 
    id, name, email, phone, role, 
    email_verified, account_locked, locked_until
FROM users
WHERE email = $1
AND password_hash = crypt($2, password_hash)
AND account_locked = FALSE;
```

### تحديث محاولات تسجيل الدخول الفاشلة
```sql
UPDATE users 
SET 
    failed_login_attempts = failed_login_attempts + 1,
    account_locked = CASE 
        WHEN failed_login_attempts + 1 >= 5 THEN TRUE 
        ELSE FALSE 
    END,
    locked_until = CASE 
        WHEN failed_login_attempts + 1 >= 5 
        THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes'
        ELSE NULL 
    END
WHERE email = $1;
```

### إعادة تعيين محاولات تسجيل الدخول
```sql
UPDATE users 
SET 
    failed_login_attempts = 0,
    last_login = CURRENT_TIMESTAMP
WHERE id = $1;
```

### تغيير كلمة المرور
```sql
UPDATE users 
SET 
    password_hash = crypt($1, gen_salt('bf')),
    updated_at = CURRENT_TIMESTAMP
WHERE id = $2;
```

## 7. إدارة الإشعارات

### الحصول على إشعارات المستخدم
```sql
SELECT * FROM notifications
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
```

### إضافة إشعار
```sql
INSERT INTO notifications (
    user_id, order_id, title_ar, title_en,
    message_ar, message_en, notification_type
) VALUES (
    $1, $2, $3, $4, $5, $6, $7
) RETURNING *;
```

### تحديد الإشعار كمقروء
```sql
UPDATE notifications 
SET is_read = TRUE, read_at = CURRENT_TIMESTAMP 
WHERE id = $1;
```

### عدد الإشعارات غير المقروءة
```sql
SELECT COUNT(*) as unread_count
FROM notifications
WHERE user_id = $1 AND is_read = FALSE;
```

## 8. إدارة الإيميلات

### إضافة إيميل لقائمة الانتظار
```sql
INSERT INTO email_queue (
    recipient_email, recipient_name, subject,
    body_html, template_name, template_data, priority
) VALUES (
    $1, $2, $3, $4, $5, $6, $7
) RETURNING *;
```

### الحصول على الإيميلات المعلقة
```sql
SELECT * FROM email_queue
WHERE status = 'pending'
AND scheduled_at <= CURRENT_TIMESTAMP
ORDER BY priority DESC, scheduled_at ASC
LIMIT $1;
```

### تحديث حالة الإيميل
```sql
UPDATE email_queue
SET 
    status = $1,
    sent_at = CASE WHEN $1 = 'sent' THEN CURRENT_TIMESTAMP ELSE NULL END,
    error_message = $2,
    attempts = attempts + 1,
    updated_at = CURRENT_TIMESTAMP
WHERE id = $3;
```

## 9. إدارة الملفات

### إضافة ملف لطلب
```sql
INSERT INTO order_files (
    order_id, file_name, file_path, file_type,
    file_size, uploaded_by
) VALUES (
    $1, $2, $3, $4, $5, $6
) RETURNING *;
```

### الحصول على ملفات طلب
```sql
SELECT * FROM order_files
WHERE order_id = $1
ORDER BY uploaded_at DESC;
```

## 10. التقارير والإحصائيات

### إحصائيات لوحة التحكم
```sql
SELECT * FROM v_dashboard_statistics;
```

### إيرادات شهرية
```sql
SELECT
    DATE_TRUNC('month', payment_date) as month,
    COUNT(*) as payment_count,
    SUM(amount) as total_revenue
FROM payments
WHERE status = 'success'
AND payment_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY month
ORDER BY month DESC;
```

### أكثر الباقات مبيعاً
```sql
SELECT
    p.name_ar,
    COUNT(o.id) as order_count,
    SUM(o.final_amount) as total_revenue
FROM packages p
LEFT JOIN orders o ON p.id = o.package_id
WHERE o.status IN ('paid', 'processing', 'completed')
GROUP BY p.id, p.name_ar
ORDER BY order_count DESC;
```

### معدل التحويل
```sql
SELECT
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
    COUNT(CASE WHEN status IN ('paid', 'processing', 'completed') THEN 1 END) as paid_orders,
    ROUND(
        COUNT(CASE WHEN status IN ('paid', 'processing', 'completed') THEN 1 END)::NUMERIC /
        NULLIF(COUNT(*), 0) * 100,
        2
    ) as conversion_rate
FROM orders;
```

## 11. سجل نشاط الأدمن

### إضافة سجل نشاط
```sql
INSERT INTO admin_activity_log (
    admin_id, action, table_name, record_id,
    description, ip_address, user_agent, changes
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
) RETURNING *;
```

### الحصول على سجل نشاط أدمن
```sql
SELECT * FROM admin_activity_log
WHERE admin_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;
```

### الحصول على سجل تعديلات سجل معين
```sql
SELECT * FROM admin_activity_log
WHERE table_name = $1 AND record_id = $2
ORDER BY created_at DESC;
```

## 12. إدارة الجلسات

### إنشاء جلسة جديدة
```sql
INSERT INTO user_sessions (
    user_id, session_token, ip_address,
    user_agent, expires_at
) VALUES (
    $1, $2, $3, $4, CURRENT_TIMESTAMP + INTERVAL '1 hour'
) RETURNING *;
```

### التحقق من صلاحية الجلسة
```sql
SELECT * FROM user_sessions
WHERE session_token = $1
AND is_active = TRUE
AND expires_at > CURRENT_TIMESTAMP;
```

### تحديث نشاط الجلسة
```sql
UPDATE user_sessions
SET 
    last_activity = CURRENT_TIMESTAMP,
    expires_at = CURRENT_TIMESTAMP + INTERVAL '1 hour'
WHERE session_token = $1;
```

### إنهاء جلسة
```sql
UPDATE user_sessions
SET is_active = FALSE
WHERE session_token = $1;
```

### إنهاء جميع جلسات مستخدم
```sql
UPDATE user_sessions
SET is_active = FALSE
WHERE user_id = $1;
```
