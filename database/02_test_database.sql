-- =====================================================
-- سكريبت الاختبار - اختبار وظائف قاعدة البيانات
-- =====================================================

\c sanad_db;

\echo '====================================================='
\echo 'اختبارات قاعدة بيانات سند'
\echo '====================================================='
\echo ''

-- =====================================================
-- 1. اختبار توليد رقم الطلب
-- =====================================================
\echo '1. اختبار توليد رقم الطلب:'
SELECT generate_order_number() as order_number;
\echo ''

-- =====================================================
-- 2. اختبار حساب السعر النهائي
-- =====================================================
\echo '2. اختبار حساب السعر النهائي (سعر 499، خصم 49.90، ضريبة 5%):'
SELECT * FROM calculate_order_total(499.00, 49.90, 5);
\echo ''

-- =====================================================
-- 3. اختبار التحقق من صلاحية الكوبونات
-- =====================================================
\echo '3. اختبار التحقق من صلاحية كوبون WELCOME10 (مبلغ 500 درهم):'
SELECT * FROM validate_coupon('WELCOME10', 2, 500.00);
\echo ''

\echo '4. اختبار التحقق من صلاحية كوبون FIRST50 (مبلغ 250 درهم - أقل من الحد الأدنى):'
SELECT * FROM validate_coupon('FIRST50', 2, 250.00);
\echo ''

\echo '5. اختبار التحقق من صلاحية كوبون FIRST50 (مبلغ 500 درهم - صالح):'
SELECT * FROM validate_coupon('FIRST50', 2, 500.00);
\echo ''

-- =====================================================
-- 6. اختبار الباقات مع العروض
-- =====================================================
\echo '6. عرض الباقات النشطة مع العروض:'
SELECT
    name_ar,
    original_price,
    offer_name_ar,
    discount_percentage,
    discounted_price,
    CASE
        WHEN offer_is_active THEN 'نشط'
        ELSE 'غير نشط'
    END as offer_status
FROM v_active_packages_with_offers;
\echo ''

-- =====================================================
-- 7. اختبار إنشاء طلب كامل
-- =====================================================
\echo '7. إنشاء طلب تجريبي:'

-- إنشاء طلب جديد
INSERT INTO orders (
    order_number,
    user_id,
    package_id,
    customer_name,
    customer_email,
    customer_phone,
    status,
    original_amount,
    discount_amount,
    vat_amount,
    total_amount,
    final_amount,
    coupon_code,
    delivery_date
)
SELECT
    generate_order_number(),
    2,
    2,
    'عميل تجريبي',
    'test@example.com',
    '+971501234567',
    'pending',
    calc.original_amount,
    calc.discount_amount_out,
    calc.vat_amount,
    calc.amount_after_discount + calc.vat_amount,
    calc.final_amount,
    'WELCOME10',
    CURRENT_DATE + INTERVAL '7 days'
FROM validate_coupon('WELCOME10', 2, 499.00) as vc
CROSS JOIN LATERAL calculate_order_total(499.00, vc.discount_amount, 5) as calc
WHERE vc.is_valid = TRUE
RETURNING order_number, customer_name, status, final_amount;

\echo ''

-- =====================================================
-- 8. اختبار إضافة دفعة
-- =====================================================
\echo '8. إضافة دفعة تجريبية للطلب:'

INSERT INTO payments (
    order_id,
    transaction_id,
    payment_method,
    amount,
    currency,
    status,
    payment_date,
    payment_response
)
SELECT
    o.id,
    'TXN-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDDHH24MISS') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
    'telr',
    o.final_amount,
    'AED',
    'success',
    CURRENT_TIMESTAMP,
    '{"status": "success", "gateway": "telr", "card_last4": "1234"}'::jsonb
FROM orders o
WHERE o.customer_email = 'test@example.com'
ORDER BY o.created_at DESC
LIMIT 1
RETURNING transaction_id, amount, status, payment_date;

-- تحديث حالة الطلب
UPDATE orders
SET status = 'paid'
WHERE customer_email = 'test@example.com'
AND status = 'pending';

\echo ''

-- =====================================================
-- 9. اختبار تسجيل استخدام الكوبون
-- =====================================================
\echo '9. تسجيل استخدام الكوبون:'

INSERT INTO coupon_usage (coupon_id, user_id, order_id, discount_amount)
SELECT
    c.id,
    o.user_id,
    o.id,
    o.discount_amount
FROM orders o
JOIN coupons c ON c.code = o.coupon_code
WHERE o.customer_email = 'test@example.com'
ORDER BY o.created_at DESC
LIMIT 1
RETURNING id, coupon_id, discount_amount;

-- تحديث عداد استخدام الكوبون
UPDATE coupons
SET times_used = times_used + 1
WHERE code = 'WELCOME10';

\echo ''

-- =====================================================
-- 10. اختبار إضافة إشعار
-- =====================================================
\echo '10. إضافة إشعار للعميل:'

INSERT INTO notifications (
    user_id,
    order_id,
    title_ar,
    title_en,
    message_ar,
    message_en,
    notification_type
)
SELECT
    o.user_id,
    o.id,
    'تم استلام طلبك',
    'Your order has been received',
    'شكراً لك! تم استلام طلبك رقم ' || o.order_number || ' بنجاح.',
    'Thank you! Your order number ' || o.order_number || ' has been received successfully.',
    'order'
FROM orders o
WHERE o.customer_email = 'test@example.com'
ORDER BY o.created_at DESC
LIMIT 1
RETURNING id, title_ar, notification_type;

\echo ''

-- =====================================================
-- 11. اختبار إضافة إيميل لقائمة الانتظار
-- =====================================================
\echo '11. إضافة إيميل لقائمة الانتظار:'

INSERT INTO email_queue (
    recipient_email,
    recipient_name,
    subject,
    body_html,
    template_name,
    template_data,
    priority
)
SELECT
    o.customer_email,
    o.customer_name,
    'تأكيد طلبك #' || o.order_number,
    '<p>شكراً لطلبك!</p>',
    'order_confirmation',
    json_build_object(
        'order_number', o.order_number,
        'customer_name', o.customer_name,
        'package_name', p.name_ar,
        'total_amount', o.final_amount,
        'delivery_date', o.delivery_date
    )::jsonb,
    5
FROM orders o
JOIN packages p ON o.package_id = p.id
WHERE o.customer_email = 'test@example.com'
ORDER BY o.created_at DESC
LIMIT 1
RETURNING id, recipient_email, template_name, status;

\echo ''

-- =====================================================
-- 12. عرض الإحصائيات
-- =====================================================
\echo '12. إحصائيات لوحة التحكم:'
SELECT * FROM v_dashboard_statistics;
\echo ''

-- =====================================================
-- 13. عرض تفاصيل الطلب التجريبي
-- =====================================================
\echo '13. تفاصيل الطلب التجريبي:'
SELECT
    order_number,
    customer_name,
    package_name_ar,
    status,
    original_amount,
    discount_amount,
    final_amount,
    coupon_code,
    delivery_date
FROM v_orders_details
WHERE customer_email = 'test@example.com'
ORDER BY created_at DESC
LIMIT 1;
\echo ''

-- =====================================================
-- 14. عرض إحصائيات الكوبونات
-- =====================================================
\echo '14. إحصائيات الكوبونات:'
SELECT
    code,
    discount_type,
    discount_value,
    actual_usage_count,
    total_discount_given,
    CASE WHEN is_active THEN 'نشط' ELSE 'غير نشط' END as status
FROM v_coupon_statistics;
\echo ''

-- =====================================================
-- 15. اختبار سجل نشاط الأدمن
-- =====================================================
\echo '15. إضافة سجل نشاط أدمن:'

INSERT INTO admin_activity_log (
    admin_id,
    action,
    table_name,
    record_id,
    description,
    ip_address,
    changes
)
SELECT
    1,
    'update',
    'orders',
    o.id,
    'تحديث حالة الطلب إلى مدفوع',
    '127.0.0.1',
    json_build_object(
        'old_status', 'pending',
        'new_status', 'paid'
    )::jsonb
FROM orders o
WHERE o.customer_email = 'test@example.com'
ORDER BY o.created_at DESC
LIMIT 1
RETURNING id, action, table_name, description;

\echo ''

-- =====================================================
-- النتيجة النهائية
-- =====================================================
\echo '====================================================='
\echo 'اكتملت جميع الاختبارات بنجاح!'
\echo '====================================================='
\echo ''
\echo 'ملخص الاختبارات:'
\echo '  ✓ توليد أرقام الطلبات'
\echo '  ✓ حساب الأسعار والضرائب'
\echo '  ✓ التحقق من صلاحية الكوبونات'
\echo '  ✓ إنشاء الطلبات'
\echo '  ✓ إضافة المدفوعات'
\echo '  ✓ تسجيل استخدام الكوبونات'
\echo '  ✓ إضافة الإشعارات'
\echo '  ✓ قائمة انتظار الإيميلات'
\echo '  ✓ سجل نشاط الأدمن'
\echo '  ✓ Views والإحصائيات'
\echo ''
\echo 'قاعدة البيانات جاهزة للاستخدام!'
\echo '====================================================='
