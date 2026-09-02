-- ============================================
-- Sanad Database - Sample Orders for Testing
-- Create test orders with different statuses
-- ============================================

-- Note: Make sure you have user_id 2 (customer) created first
-- Run create_admin.sql before this script

-- Sample Order 1: Completed order with Basic Package
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
    delivery_date,
    notes,
    created_at,
    updated_at
) VALUES (
    'SND-2026-001',
    2,
    1,
    'أحمد محمد',
    'ahmed@example.com',
    '+971501111111',
    'completed',
    299.00,
    29.90, -- WELCOME10 coupon (10%)
    13.46, -- VAT 5% on (299 - 29.90)
    282.56,
    282.56,
    'WELCOME10',
    CURRENT_DATE - INTERVAL '3 days',
    'سيرة ذاتية لمهندس برمجيات',
    CURRENT_TIMESTAMP - INTERVAL '10 days',
    CURRENT_TIMESTAMP - INTERVAL '3 days'
);

-- Payment for Order 1
INSERT INTO payments (
    order_id,
    transaction_id,
    payment_method,
    amount,
    currency,
    status,
    payment_date,
    payment_response,
    created_at
) VALUES (
    1,
    'TXN-2026-08-10-001',
    'telr',
    282.56,
    'AED',
    'success',
    CURRENT_TIMESTAMP - INTERVAL '10 days',
    '{"gateway": "telr", "card_type": "visa", "last4": "4242"}'::jsonb,
    CURRENT_TIMESTAMP - INTERVAL '10 days'
);

-- Order file for Order 1
INSERT INTO order_files (
    order_id,
    file_name,
    file_path,
    file_type,
    file_size,
    uploaded_at
) VALUES (
    1,
    'Ahmed_Mohammed_CV_AR.pdf',
    '/uploads/orders/2026/08/ahmed_mohammed_cv_ar.pdf',
    'application/pdf',
    245678,
    CURRENT_TIMESTAMP - INTERVAL '3 days'
);

-- Coupon usage for Order 1
INSERT INTO coupon_usage (
    coupon_id,
    user_id,
    order_id,
    used_at
) VALUES (
    1, -- WELCOME10
    2,
    1,
    CURRENT_TIMESTAMP - INTERVAL '10 days'
);

-- Sample Order 2: In Progress with Advanced Package and Active Offer
INSERT INTO orders (
    order_number,
    user_id,
    package_id,
    offer_id,
    customer_name,
    customer_email,
    customer_phone,
    status,
    original_amount,
    discount_amount,
    vat_amount,
    total_amount,
    final_amount,
    delivery_date,
    notes,
    created_at,
    updated_at
) VALUES (
    'SND-2026-002',
    2,
    2,
    1, -- Summer Offer 15%
    'فاطمة علي',
    'fatima@example.com',
    '+971502222222',
    'in_progress',
    499.00,
    74.85, -- 15% offer discount
    21.21, -- VAT 5%
    445.36,
    445.36,
    CURRENT_DATE + INTERVAL '4 days',
    'سيرة ذاتية ثنائية اللغة لمديرة تسويق',
    CURRENT_TIMESTAMP - INTERVAL '3 days',
    CURRENT_TIMESTAMP - INTERVAL '1 day'
);

-- Payment for Order 2
INSERT INTO payments (
    order_id,
    transaction_id,
    payment_method,
    amount,
    currency,
    status,
    payment_date,
    payment_response,
    created_at
) VALUES (
    2,
    'TXN-2026-08-17-001',
    'paytabs',
    445.36,
    'AED',
    'success',
    CURRENT_TIMESTAMP - INTERVAL '3 days',
    '{"gateway": "paytabs", "card_type": "mastercard", "last4": "5555"}'::jsonb,
    CURRENT_TIMESTAMP - INTERVAL '3 days'
);

-- Sample Order 3: Pending Payment with Comprehensive Package
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
    delivery_date,
    notes,
    created_at,
    updated_at
) VALUES (
    'SND-2026-003',
    NULL, -- Guest checkout
    3,
    'خالد السعدي',
    'khaled@example.com',
    '+971503333333',
    'pending',
    799.00,
    50.00, -- FIRST50 coupon
    37.45, -- VAT 5%
    786.45,
    786.45,
    'FIRST50',
    CURRENT_DATE + INTERVAL '10 days',
    'حزمة كاملة مع استشارة مهنية',
    CURRENT_TIMESTAMP - INTERVAL '2 hours',
    CURRENT_TIMESTAMP - INTERVAL '2 hours'
);

-- Pending payment for Order 3
INSERT INTO payments (
    order_id,
    transaction_id,
    payment_method,
    amount,
    currency,
    status,
    created_at
) VALUES (
    3,
    'TXN-2026-08-20-001',
    'telr',
    786.45,
    'AED',
    'pending',
    CURRENT_TIMESTAMP - INTERVAL '2 hours'
);

-- Coupon usage for Order 3
INSERT INTO coupon_usage (
    coupon_id,
    user_id,
    order_id,
    used_at
) VALUES (
    2, -- FIRST50
    NULL,
    3,
    CURRENT_TIMESTAMP - INTERVAL '2 hours'
);

-- Sample Order 4: Paid and waiting to start
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
    delivery_date,
    notes,
    created_at,
    updated_at
) VALUES (
    'SND-2026-004',
    2,
    1,
    'سارة محمود',
    'sara@example.com',
    '+971504444444',
    'paid',
    299.00,
    0.00,
    14.95, -- VAT 5%
    313.95,
    313.95,
    CURRENT_DATE + INTERVAL '5 days',
    'سيرة ذاتية لخريجة جديدة',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP - INTERVAL '1 day'
);

-- Payment for Order 4
INSERT INTO payments (
    order_id,
    transaction_id,
    payment_method,
    amount,
    currency,
    status,
    payment_date,
    payment_response,
    created_at
) VALUES (
    4,
    'TXN-2026-08-19-001',
    'card',
    313.95,
    'AED',
    'success',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    '{"gateway": "stripe", "card_type": "visa", "last4": "1234"}'::jsonb,
    CURRENT_TIMESTAMP - INTERVAL '1 day'
);

-- Create notifications for the orders
INSERT INTO notifications (user_id, order_id, title_ar, title_en, message_ar, message_en, type, is_read, created_at) VALUES
(2, 1, 'طلبك جاهز', 'Your Order is Ready', 'تم إكمال طلبك #SND-2026-001 ويمكنك تحميل الملفات الآن', 'Your order #SND-2026-001 is completed and ready for download', 'order', TRUE, CURRENT_TIMESTAMP - INTERVAL '3 days'),
(2, 2, 'جاري العمل على طلبك', 'Working on Your Order', 'بدأنا العمل على طلبك #SND-2026-002', 'We started working on your order #SND-2026-002', 'order', FALSE, CURRENT_TIMESTAMP - INTERVAL '1 day'),
(2, 4, 'تم استلام الدفع', 'Payment Received', 'تم استلام دفعة طلبك #SND-2026-004 بنجاح', 'Your payment for order #SND-2026-004 has been received', 'payment', FALSE, CURRENT_TIMESTAMP - INTERVAL '1 day');

-- Add some emails to the queue
INSERT INTO email_queue (recipient_email, recipient_name, subject, body, template_name, template_data, status, priority, scheduled_at, created_at) VALUES
('ahmed@example.com', 'أحمد محمد', 'طلبك جاهز للتحميل - طلب #SND-2026-001', 'Email body here...', 'order_completed', '{"order_number": "SND-2026-001", "customer_name": "أحمد محمد"}'::jsonb, 'sent', 10, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days'),
('fatima@example.com', 'فاطمة علي', 'تم استلام الدفع بنجاح - طلب #SND-2026-002', 'Email body here...', 'payment_success', '{"order_number": "SND-2026-002", "customer_name": "فاطمة علي"}'::jsonb, 'sent', 10, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days'),
('sara@example.com', 'سارة محمود', 'تأكيد الطلب #SND-2026-004', 'Email body here...', 'order_confirmation', '{"order_number": "SND-2026-004", "customer_name": "سارة محمود"}'::jsonb, 'sent', 10, CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day'),
('khaled@example.com', 'خالد السعدي', 'تأكيد الطلب #SND-2026-003', 'Email body here...', 'order_confirmation', '{"order_number": "SND-2026-003", "customer_name": "خالد السعدي"}'::jsonb, 'pending', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP - INTERVAL '2 hours');

-- Display created orders summary
SELECT
    o.order_number,
    o.customer_name,
    p.name_ar as package_name,
    o.status,
    o.final_amount,
    py.status as payment_status,
    o.delivery_date
FROM orders o
JOIN packages p ON o.package_id = p.id
LEFT JOIN payments py ON py.order_id = o.id
ORDER BY o.created_at DESC;

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Sample orders created successfully!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '4 Orders created:';
    RAISE NOTICE '  - SND-2026-001: Completed (Basic)';
    RAISE NOTICE '  - SND-2026-002: In Progress (Advanced with Offer)';
    RAISE NOTICE '  - SND-2026-003: Pending Payment (Comprehensive)';
    RAISE NOTICE '  - SND-2026-004: Paid (Basic)';
    RAISE NOTICE '';
    RAISE NOTICE '4 Payments recorded';
    RAISE NOTICE '2 Coupon usages tracked';
    RAISE NOTICE '1 Order file uploaded';
    RAISE NOTICE '3 Notifications created';
    RAISE NOTICE '4 Emails queued';
    RAISE NOTICE '============================================';
END $$;
