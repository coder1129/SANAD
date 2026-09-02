// Must be the first import: Sentry patches runtime internals before Nest,
// Express, and Prisma are loaded.
import './instrument';

import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as Sentry from '@sentry/node';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters';
import { TransformResponseInterceptor } from './common/interceptors';
import { LoggerService } from './common/logger';
import { parseTrustProxy, trustProxyIsDisabled } from './config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    bufferLogs: true,
  });

  // Route Nest's own logging through the structured JSON logger. Every existing
  // `new Logger(Name)` call in the codebase picks this up without changes.
  app.useLogger(app.get(LoggerService));

  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';
  const logger = new Logger('Bootstrap');

  app.enableShutdownHooks();

  // Explicit body limits. Express defaults to 100kb, which is generous for an
  // API whose largest JSON payload is an order's requirements object; file
  // uploads go through multer and are bounded separately. useBodyParser keeps
  // the rawBody buffer that webhook signature verification depends on.
  app.useBodyParser('json', { limit: '256kb' });
  app.useBodyParser('urlencoded', { limit: '256kb', extended: true });

  // Rate limiting keys off request.ip, which resolves to the proxy's address
  // unless Express is told how many hops to trust. Validation rejects unset
  // TRUST_PROXY in production so this is always a deliberate choice.
  const trustProxy = parseTrustProxy(configService.get<string>('TRUST_PROXY'));
  if (trustProxy !== null && !trustProxyIsDisabled(trustProxy)) {
    app.set('trust proxy', trustProxy);
    logger.log(
      `Trust proxy enabled (${JSON.stringify(trustProxy)}); X-Forwarded-For is honoured`,
    );
  }

  // Security headers
  app.use(helmet());

  // CORS
  const frontendUrl =
    configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
  const configuredOrigins = (configService.get<string>('CORS_ORIGINS') || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigins = new Set([
    frontendUrl,
    ...configuredOrigins,
    ...(nodeEnv === 'development'
      ? ['http://localhost:3000', 'http://localhost:3001']
      : []),
  ]);
  app.enableCors({
    origin: [...allowedOrigins],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'X-Signature',
      'X-Request-Id',
    ],
    exposedHeaders: [
      'X-Request-Id',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'Retry-After',
    ],
  });

  // API Prefix
  app.setGlobalPrefix('api/v1');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      forbidUnknownValues: true,
      validationError: { target: false, value: false },
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter & response transform interceptor
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TransformResponseInterceptor());

  const swaggerEnabled =
    nodeEnv !== 'production' ||
    configService.get<string>('SWAGGER_ENABLED') === 'true';
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('SANAD API')
      .setDescription(
        'SANAD Arabic-First Career Services Platform REST API Documentation',
      )
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Enter JWT Access Token',
          in: 'header',
        },
        'bearer',
      )
      .addTag('Auth', 'Authentication and session management')
      .addTag('Users', 'User profile management')
      .addTag('Packages', 'Career services packages catalog')
      .addTag('Offers', 'Promotional package offers')
      .addTag('Coupons', 'Discount coupons & validation')
      .addTag('Checkout', 'Order checkout preview')
      .addTag('Orders', 'Order processing and lifecycle')
      .addTag('Payments', 'Payment processing and webhooks')
      .addTag('Notifications', 'User notifications')
      .addTag('Testimonials', 'Customer reviews and testimonials')
      .addTag('Pages', 'CMS dynamic pages')
      .addTag('Settings', 'System configuration and settings')
      .addTag('Media', 'Site media assets')
      .addTag('Admin', 'Administrative backoffice endpoints')
      .addTag('Health', 'System health checks')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'SANAD API Documentation',
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  // Give queued Sentry events a chance to leave the process on shutdown.
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.once(signal, () => {
      void Sentry.close(2_000);
    });
  }

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
  logger.log(`SANAD API running on http://localhost:${port}/api/v1`);
  if (swaggerEnabled) {
    logger.log(`Swagger Docs available at http://localhost:${port}/api/docs`);
  }
}

bootstrap().catch((error: unknown) => {
  const logger = new Logger('Bootstrap');
  logger.error(
    'Application failed to start',
    error instanceof Error ? error.stack : String(error),
  );
  Sentry.captureException(error);
  void Sentry.close(2_000).then(() => {
    process.exitCode = 1;
  });
});
