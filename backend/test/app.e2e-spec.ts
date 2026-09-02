import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { GlobalExceptionFilter } from '../src/common/filters';
import { TransformResponseInterceptor } from '../src/common/interceptors';

describe('SANAD Backend E2E Tests', () => {
  let app: INestApplication;
  const rateBuckets = new Map<string, { count: number; resetAt: Date }>();

  const mockPrismaService = {
    $connect: async () => {},
    $disconnect: async () => {},
    $queryRaw: async (query: TemplateStringsArray, ...values: unknown[]) => {
      const sql = Array.from(query).join(' ');
      if (sql.includes('rate_limit_buckets')) {
        const key = String(values[0]);
        const requestedReset = values[1] as Date;
        const current = rateBuckets.get(key);
        const record =
          !current || current.resetAt <= new Date()
            ? { count: 1, resetAt: requestedReset }
            : { count: current.count + 1, resetAt: current.resetAt };
        rateBuckets.set(key, record);
        return [{ count: record.count, reset_at: record.resetAt }];
      }
      return [{ 1: 1 }];
    },
    $executeRaw: async () => 0,
    packages: {
      findMany: async () => [
        {
          id: 1,
          name_ar: 'باقة السيرة الذاتية الاحترافية',
          name_en: 'Professional CV Package',
          price: 499,
          delivery_days: 3,
          is_active: true,
          package_images: [],
        },
      ],
      count: async () => 1,
      findUnique: async () => ({
        id: 1,
        name_ar: 'باقة السيرة الذاتية الاحترافية',
        name_en: 'Professional CV Package',
        price: 499,
        delivery_days: 3,
        is_active: true,
        package_images: [],
      }),
    },
    offers: {
      findMany: async () => [
        {
          id: 1,
          name_ar: 'عرض اليوم الوطني',
          name_en: 'National Day Offer',
          discount_percentage: 20,
          is_active: true,
          package: { name_ar: 'باقة السيرة الذاتية', name_en: 'CV Package' },
        },
      ],
      findFirst: async () => null,
      count: async () => 1,
    },
    testimonials: {
      findMany: async () => [
        {
          id: 1,
          customer_name: 'سارة العتيبي',
          customer_title: 'أخصائية تسويق',
          testimonial_ar: 'تجربة ممتازة وسريعة جداً!',
          testimonial_en: 'Great and fast experience!',
          rating: 5,
          is_published: true,
        },
      ],
    },
    settings: {
      findMany: async () => [
        { setting_key: 'currency', setting_value: 'AED' },
        { setting_key: 'site_name', setting_value: 'SANAD' },
        { setting_key: 'vat_percentage', setting_value: '5' },
      ],
      findUnique: async ({ where }: any) => {
        if (where.setting_key === 'currency') return { setting_value: 'AED' };
        if (where.setting_key === 'vat_percentage')
          return { setting_value: '5' };
        return null;
      },
    },
    coupons: {
      findUnique: async () => null,
      findMany: async () => [],
      count: async () => 0,
    },
    orders: {
      findMany: async () => [],
      count: async () => 0,
    },
    notifications: {
      findMany: async () => [],
      count: async () => 0,
    },
    users: {
      findUnique: async () => null,
      findMany: async () => [],
      count: async () => 0,
    },
  };

  beforeAll(async () => {
    rateBuckets.clear();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .compile();

    app = moduleFixture.createNestApplication();

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
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Health Check (/api/v1/health)', () => {
    it('should return 200 OK and database status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('status');
      expect(res.body.data).toHaveProperty('database');
    });
  });

  describe('Public Catalog Endpoints', () => {
    it('GET /api/v1/packages should return active packages', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/packages')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThan(0);
    });

    it('GET /api/v1/offers should return promotional offers', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/offers')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/v1/testimonials should return published testimonials', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/testimonials')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/v1/settings/public should return public safe settings', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/settings/public')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('currency');
      expect(res.body.data.currency).toBe('AED');
    });
  });

  describe('Security & RBAC Protection', () => {
    it.each([
      ['post', '/api/v1/orders/1/files'],
      ['get', '/api/v1/orders/1/files'],
      ['delete', '/api/v1/orders/1/files/1'],
      ['get', '/api/v1/orders/1/deliverables'],
      ['post', '/api/v1/admin/orders/1/deliverables'],
    ] as const)('%s %s is disabled and returns 404', async (method, path) => {
      await request(app.getHttpServer())[method](path).expect(404);
    });

    it('GET /api/v1/admin/dashboard should reject unauthenticated requests with 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('GET /api/v1/orders should reject unauthenticated requests with 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/orders')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('GET /api/v1/notifications should reject unauthenticated requests with 401', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/notifications')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it.each([
      '/api/v1/admin/packages',
      '/api/v1/admin/offers',
      '/api/v1/profile',
      '/api/v1/auth/me',
    ])(
      'GET %s should reject unauthenticated requests with 401',
      async (path) => {
        const res = await request(app.getHttpServer()).get(path).expect(401);
        expect(res.body.success).toBe(false);
      },
    );

    it('rate-limits repeated login attempts', async () => {
      const payload = {
        email: 'rate-limit-test@example.invalid',
        password: 'WrongPass1!',
      };
      for (let attempt = 1; attempt <= 10; attempt++) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send(payload)
          .expect(401);
      }
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(payload)
        .expect(429);
    });
  });
});
