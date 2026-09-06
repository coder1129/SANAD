import 'dotenv/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { hash } from 'argon2';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GlobalExceptionFilter } from '../src/common/filters';
import { TransformResponseInterceptor } from '../src/common/interceptors';
import { PrismaService } from '../src/prisma/prisma.service';

describe('SANAD real customer-to-public journey', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let customerId: number | undefined;
  let otherCustomerId: number | undefined;
  let adminId: number | undefined;
  let orderId: number | undefined;

  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const customerEmail = `journey-customer-${runId}@example.invalid`;
  const otherEmail = `journey-other-${runId}@example.invalid`;
  const adminEmail = `journey-admin-${runId}@example.invalid`;
  const password = 'Journey1!Test';

  beforeAll(async () => {
    process.env.PAYMENT_PROVIDER = 'bypass';
    const { AppModule } = await import('../src/app.module');
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
        transform: true,
        validationError: { target: false, value: false },
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new TransformResponseInterceptor());
    await app.init();

    prisma = app.get(PrismaService);
    const passwordHash = await hash(password);
    const [customer, otherCustomer, admin] = await prisma.$transaction([
      prisma.users.create({
        data: {
          name: 'Journey Customer',
          first_name: 'Journey',
          last_name: 'Customer',
          email: customerEmail,
          phone: '+971500001111',
          password_hash: passwordHash,
          email_verified: true,
          role: 'customer',
        },
      }),
      prisma.users.create({
        data: {
          name: 'Other Customer',
          first_name: 'Other',
          last_name: 'Customer',
          email: otherEmail,
          phone: '+971500002222',
          password_hash: passwordHash,
          email_verified: true,
          role: 'customer',
        },
      }),
      prisma.users.create({
        data: {
          name: 'Journey Administrator',
          email: adminEmail,
          password_hash: passwordHash,
          email_verified: true,
          role: 'admin',
        },
      }),
    ]);
    customerId = customer.id;
    otherCustomerId = otherCustomer.id;
    adminId = admin.id;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.email_queue.deleteMany({
        where: {
          recipient_email: { in: [customerEmail, otherEmail, adminEmail] },
        },
      });
      await prisma.orders.deleteMany({
        where: {
          OR: [
            ...(orderId ? [{ id: orderId }] : []),
            { customer_email: customerEmail },
          ],
        },
      });
      const ids = [customerId, otherCustomerId, adminId].filter(
        (id): id is number => id !== undefined,
      );
      if (ids.length > 0) {
        await prisma.users.deleteMany({ where: { id: { in: ids } } });
      }
    }
    if (app) await app.close();
  });

  it('completes checkout, ownership, administration, review moderation, and public display', async () => {
    const packageRecord = await prisma.packages.findFirst({
      where: { is_active: true },
      orderBy: { id: 'asc' },
    });
    expect(packageRecord).not.toBeNull();

    const login = async (email: string) => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email, password })
        .expect(200);
      return response.body.data.accessToken as string;
    };
    const customerToken = await login(customerEmail);
    const otherToken = await login(otherEmail);
    const adminToken = await login(adminEmail);

    await request(app.getHttpServer())
      .get('/api/v1/admin/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);

    const created = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        package_id: packageRecord!.id,
        requirements: {
          target_job_title: 'Product Manager',
          career_goals: 'Integration verification only',
        },
      })
      .expect(201);
    orderId = created.body.data.id;
    const orderNumber = created.body.data.order_number as string;
    expect(created.body.data.status).toBe('paid');

    const payment = await request(app.getHttpServer())
      .post('/api/v1/payments/create')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ order_id: orderId, payment_method: 'card' })
      .expect(201);
    expect(payment.body.data).toMatchObject({
      status: 'paid',
      bypassed: true,
      requires_payment: false,
    });

    await request(app.getHttpServer())
      .get(`/api/v1/orders/${orderId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .get(`/api/v1/orders/number/${orderNumber}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403);

    const success = await request(app.getHttpServer())
      .get(`/api/v1/orders/number/${orderNumber}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(success.body.data).toMatchObject({
      id: orderId,
      order_number: orderNumber,
      status: 'paid',
    });
    expect(success.body.data.payments[0].status).toBe('paid');

    const ownOrders = await request(app.getHttpServer())
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(
      ownOrders.body.data.items.some(
        (item: { id: number }) => item.id === orderId,
      ),
    ).toBe(true);

    for (const status of [
      'in_progress',
      'under_review',
      'ready',
      'completed',
    ]) {
      await request(app.getHttpServer())
        .patch(`/api/v1/admin/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status, note: `Journey transition to ${status}` })
        .expect(200);
    }

    const review = await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ order_id: orderId, rating: 5, comment: 'Excellent service' })
      .expect(201);
    const reviewId = review.body.data.id as number;
    expect(review.body.data.status).toBe('pending');

    await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ order_id: orderId, rating: 4, comment: 'Duplicate review' })
      .expect(409);

    const edited = await request(app.getHttpServer())
      .patch(`/api/v1/reviews/${reviewId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ rating: 4, comment: 'Excellent and responsive service' })
      .expect(200);
    expect(edited.body.data).toMatchObject({ rating: 4, status: 'pending' });

    await request(app.getHttpServer())
      .patch(`/api/v1/admin/reviews/${reviewId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'published' })
      .expect(200);

    const publicReviews = await request(app.getHttpServer())
      .get(`/api/v1/reviews/public?package_id=${packageRecord!.id}`)
      .expect(200);
    const publicReview = publicReviews.body.data.items.find(
      (item: { id: number }) => item.id === reviewId,
    );
    expect(publicReview).toMatchObject({
      rating: 4,
      verified_customer: true,
      customer_display_name: 'Journey C.',
    });
    expect(publicReview).not.toHaveProperty('email');
    expect(publicReview).not.toHaveProperty('phone');

    const packageResponse = await request(app.getHttpServer())
      .get(`/api/v1/packages/${packageRecord!.id}`)
      .expect(200);
    expect(packageResponse.body.data.rating_count).toBeGreaterThanOrEqual(1);

    const adminReadRoutes = [
      '/api/v1/admin/dashboard',
      '/api/v1/admin/orders',
      '/api/v1/admin/packages',
      '/api/v1/admin/offers',
      '/api/v1/admin/coupons',
      '/api/v1/admin/customers',
      '/api/v1/admin/payments',
      '/api/v1/admin/reviews',
      '/api/v1/admin/pages',
      '/api/v1/admin/media',
      '/api/v1/admin/settings',
      '/api/v1/admin/activity-logs',
    ];
    for (const path of adminReadRoutes) {
      await request(app.getHttpServer())
        .get(path)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    }
  }, 60_000);
});
