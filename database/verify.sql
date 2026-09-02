-- ============================================
-- Sanad Database - Verification Queries
-- Run these after installation to verify data
-- ============================================

-- 1. List all tables
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Count records in all tables
SELECT 'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'packages', COUNT(*) FROM packages
UNION ALL
SELECT 'offers', COUNT(*) FROM offers
UNION ALL
SELECT 'coupons', COUNT(*) FROM coupons
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'coupon_usage', COUNT(*) FROM coupon_usage
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'order_files', COUNT(*) FROM order_files
UNION ALL
SELECT 'pages', COUNT(*) FROM pages
UNION ALL
SELECT 'settings', COUNT(*) FROM settings
UNION ALL
SELECT 'testimonials', COUNT(*) FROM testimonials
UNION ALL
SELECT 'package_images', COUNT(*) FROM package_images
UNION ALL
SELECT 'site_media', COUNT(*) FROM site_media
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'admin_activity_log', COUNT(*) FROM admin_activity_log
UNION ALL
SELECT 'email_queue', COUNT(*) FROM email_queue
UNION ALL
SELECT 'email_templates', COUNT(*) FROM email_templates
UNION ALL
SELECT 'user_sessions', COUNT(*) FROM user_sessions
ORDER BY table_name;

-- 3. View all packages with details
SELECT
    id,
    name_ar,
    name_en,
    price,
    delivery_days,
    max_revisions,
    jsonb_array_length(features_ar) as features_count_ar,
    jsonb_array_length(features_en) as features_count_en,
    is_active
FROM packages
ORDER BY sort_order;

-- 4. View package features (Arabic)
SELECT
    name_ar as package_name,
    jsonb_array_elements_text(features_ar) as feature
FROM packages
ORDER BY sort_order;

-- 5. View active offers with calculated prices
SELECT
    o.id,
    o.title_ar,
    o.title_en,
    p.name_ar as package_name_ar,
    p.name_en as package_name_en,
    p.price as original_price,
    o.discount_percentage,
    ROUND(p.price * (1 - o.discount_percentage/100), 2) as discounted_price,
    ROUND(p.price - (p.price * (1 - o.discount_percentage/100)), 2) as savings,
    o.start_date,
    o.end_date,
    o.is_active,
    CASE
        WHEN o.end_date > CURRENT_TIMESTAMP THEN 'Active'
        ELSE 'Expired'
    END as status
FROM offers o
JOIN packages p ON o.package_id = p.id
WHERE o.is_active = TRUE;

-- 6. View all coupons with details
SELECT
    code,
    discount_type,
    discount_value,
    min_order_amount,
    max_discount_amount,
    usage_limit,
    usage_per_user,
    CASE
        WHEN start_date IS NULL THEN 'No start limit'
        WHEN start_date > CURRENT_TIMESTAMP THEN 'Not started'
        ELSE 'Started'
    END as start_status,
    CASE
        WHEN end_date IS NULL THEN 'No expiry'
        WHEN end_date < CURRENT_TIMESTAMP THEN 'Expired'
        ELSE 'Valid'
    END as expiry_status,
    is_active
FROM coupons
ORDER BY code;

-- 7. View all pages
SELECT
    id,
    title_ar,
    title_en,
    slug,
    LENGTH(content_ar) as content_ar_length,
    LENGTH(content_en) as content_en_length,
    is_active,
    created_at
FROM pages
ORDER BY slug;

-- 8. View all testimonials
SELECT
    id,
    customer_name,
    customer_title,
    rating,
    LEFT(comment_ar, 100) || '...' as comment_ar_preview,
    LEFT(comment_en, 100) || '...' as comment_en_preview,
    is_published,
    created_at
FROM testimonials
ORDER BY created_at DESC;

-- 9. View system settings
SELECT
    setting_key,
    setting_value,
    setting_type
FROM settings
ORDER BY setting_key;

-- 10. View email templates
SELECT
    id,
    template_name,
    subject_ar,
    subject_en,
    variables,
    is_active
FROM email_templates
ORDER BY template_name;

-- 11. Check all foreign key constraints
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 12. Check all indexes
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 13. Database size and table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 14. Check extensions
SELECT
    extname as extension_name,
    extversion as version
FROM pg_extension
WHERE extname != 'plpgsql';

-- ============================================
-- Sample Test Queries
-- ============================================

-- Test 1: Calculate order total with package, offer, and coupon
WITH order_calculation AS (
    SELECT
        p.name_en as package_name,
        p.price as original_price,
        o.discount_percentage as offer_discount,
        ROUND(p.price * o.discount_percentage / 100, 2) as offer_amount,
        50.00 as coupon_amount, -- FIRST50 coupon
        ROUND(p.price - (p.price * o.discount_percentage / 100) - 50.00, 2) as subtotal_after_discounts
    FROM packages p
    JOIN offers o ON o.package_id = p.id
    WHERE p.id = 2 AND o.is_active = TRUE
)
SELECT
    package_name,
    original_price,
    offer_discount || '% off' as offer,
    offer_amount,
    coupon_amount,
    subtotal_after_discounts,
    ROUND(subtotal_after_discounts * 0.05, 2) as vat_amount,
    ROUND(subtotal_after_discounts * 1.05, 2) as total_amount
FROM order_calculation;

-- Test 2: Verify email template variables
SELECT
    template_name,
    subject_ar,
    subject_en,
    variables,
    jsonb_array_length(variables) as variable_count
FROM email_templates
ORDER BY template_name;

-- Test 3: Check package features as individual rows
SELECT
    p.name_en as package,
    ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY p.id) as feature_num,
    jsonb_array_elements_text(p.features_en) as feature
FROM packages p
ORDER BY p.sort_order, feature_num;

-- ============================================
-- Success Message
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Verification queries completed successfully!';
    RAISE NOTICE 'Review the results above to verify installation.';
    RAISE NOTICE '============================================';
END $$;
