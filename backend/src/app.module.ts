import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { configuration, validate } from './config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PackagesModule } from './packages/packages.module';
import { OffersModule } from './offers/offers.module';
import { CouponsModule } from './coupons/coupons.module';
import { CheckoutModule } from './checkout/checkout.module';
import { OrdersModule } from './orders/orders.module';
import { FilesModule } from './files/files.module';
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EmailModule } from './email/email.module';
import { TestimonialsModule } from './testimonials/testimonials.module';
import { PagesModule } from './pages/pages.module';
import { SettingsModule } from './settings/settings.module';
import { MediaModule } from './media/media.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';
import { ReviewsModule } from './reviews/reviews.module';
import { LoggerModule } from './common/logger';
import { CorrelationIdMiddleware } from './common/context';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RateLimitGuard, RolesGuard } from './common/guards';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validate,
    }),
    LoggerModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    PackagesModule,
    OffersModule,
    CouponsModule,
    CheckoutModule,
    OrdersModule,
    FilesModule,
    PaymentsModule,
    NotificationsModule,
    EmailModule,
    TestimonialsModule,
    ReviewsModule,
    PagesModule,
    SettingsModule,
    MediaModule,
    AdminModule,
    HealthModule,
  ],
  providers: [
    // Order matters: global guards run in registration order. Rate limiting
    // goes first so a flood of requests is rejected before JwtAuthGuard issues
    // a users-table lookup for every one of them. RateLimitGuard verifies the
    // bearer token itself (signature only, no database) to keep per-user
    // buckets working from this position in the chain.
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes({
      path: '{*path}',
      method: RequestMethod.ALL,
    });
  }
}
