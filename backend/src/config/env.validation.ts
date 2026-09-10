import { plainToInstance, Transform } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';
import { parseTrustProxy } from './trust-proxy';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

const DURATION_MESSAGE =
  'must be a duration such as 30s, 15m, 12h, or 30d (digits followed by s, m, h, or d)';

/**
 * Swagger is never enabled in production. Hosting dashboards sometimes expose
 * an empty, quoted, or templated value, so every value other than an explicit
 * `true` safely becomes `false` before validation. Production still rejects
 * an explicit `true` below.
 */
function normalizeBooleanEnvironmentValue(value: unknown): unknown {
  if (typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return value;

  const normalized = value.trim().replace(/^['"](true|false)['"]$/i, '$1');
  return normalized.toLowerCase() === 'true' ? 'true' : 'false';
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @MinLength(1)
  DATABASE_URL!: string;

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @MinLength(32)
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d+[smhd]$/, {
    message: `JWT_ACCESS_EXPIRES_IN ${DURATION_MESSAGE}`,
  })
  JWT_ACCESS_EXPIRES_IN: string = '15m';

  @IsString()
  @IsOptional()
  @Matches(/^\d+[smhd]$/, {
    message: `JWT_REFRESH_EXPIRES_IN ${DURATION_MESSAGE}`,
  })
  JWT_REFRESH_EXPIRES_IN: string = '30d';

  @IsString()
  @IsOptional()
  FRONTEND_URL: string = 'http://localhost:3001';

  @IsString()
  @IsOptional()
  CORS_ORIGINS?: string;

  @IsString()
  @IsOptional()
  TRUST_PROXY: string = 'false';

  @IsString()
  @IsOptional()
  @Transform(({ value }) => normalizeBooleanEnvironmentValue(value))
  @IsIn(['true', 'false'])
  SWAGGER_ENABLED: string = 'false';

  @IsString()
  @IsOptional()
  SENTRY_DSN?: string;

  @IsString()
  @IsOptional()
  SENTRY_ENVIRONMENT?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => normalizeBooleanEnvironmentValue(value))
  @IsIn(['true', 'false'])
  REQUIRE_EMAIL_VERIFICATION: string = 'false';

  @IsString()
  @IsOptional()
  @Matches(/^\d+[smhd]$/, {
    message: `EMAIL_VERIFICATION_EXPIRES_IN ${DURATION_MESSAGE}`,
  })
  EMAIL_VERIFICATION_EXPIRES_IN: string = '24h';

  @IsString()
  @IsOptional()
  R2_ACCOUNT_ID?: string;

  @IsString()
  @IsOptional()
  R2_ACCESS_KEY_ID?: string;

  @IsString()
  @IsOptional()
  R2_SECRET_ACCESS_KEY?: string;

  @IsString()
  @IsOptional()
  R2_BUCKET?: string;

  @IsString()
  @IsOptional()
  R2_PUBLIC_URL?: string;

  @IsString()
  @IsOptional()
  R2_ENDPOINT?: string;

  @IsString()
  @IsOptional()
  RESEND_API_KEY?: string;

  @IsString()
  @IsOptional()
  EMAIL_FROM: string = 'noreply@sanad.ae';

  @IsString()
  @IsOptional()
  SMTP_HOST?: string;

  @IsNumber()
  @IsOptional()
  SMTP_PORT: number = 587;

  @IsString()
  @IsOptional()
  SMTP_USER?: string;

  @IsString()
  @IsOptional()
  SMTP_PASSWORD?: string;

  @IsString()
  @IsOptional()
  @IsIn(['true', 'false'])
  SMTP_SECURE?: string;

  @IsString()
  @IsOptional()
  SMTP_FROM_EMAIL?: string;

  @IsString()
  @IsOptional()
  DEMO_OTP_EMAIL?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{6}$/, {
    message: 'DEMO_OTP_CODE must be exactly 6 digits',
  })
  DEMO_OTP_CODE?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/i, {
    message: 'GOOGLE_CLIENT_ID must be a valid Google OAuth web client ID',
  })
  GOOGLE_CLIENT_ID?: string;

  @IsString()
  @IsIn(['mock', 'manual', 'bypass'])
  PAYMENT_PROVIDER: string = 'mock';

  @IsString()
  @IsOptional()
  PAYMENT_SECRET_KEY?: string;

  @IsString()
  @MinLength(32)
  PAYMENT_WEBHOOK_SECRET!: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  THROTTLE_TTL: number = 60;

  @IsNumber()
  @IsOptional()
  @Min(1)
  THROTTLE_LIMIT: number = 60;

  @IsNumber()
  @IsOptional()
  @Min(1024)
  MAX_FILE_SIZE: number = 10485760;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Environment validation error:\n${errors.toString()}`);
  }

  if (
    validatedConfig.JWT_ACCESS_SECRET === validatedConfig.JWT_REFRESH_SECRET
  ) {
    throw new Error(
      'JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different',
    );
  }

  if (parseTrustProxy(validatedConfig.TRUST_PROXY) === null) {
    throw new Error(
      'TRUST_PROXY must be false, true, a hop count (e.g. 1), or a comma-separated list of proxy IPs/CIDRs',
    );
  }

  let databaseUrl: URL;
  let frontendUrl: URL;
  try {
    databaseUrl = new URL(validatedConfig.DATABASE_URL);
    frontendUrl = new URL(validatedConfig.FRONTEND_URL);
  } catch {
    throw new Error('DATABASE_URL and FRONTEND_URL must be valid URLs');
  }
  if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
    throw new Error('DATABASE_URL must use the PostgreSQL protocol');
  }

  const corsOrigins = (validatedConfig.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  for (const origin of [validatedConfig.FRONTEND_URL, ...corsOrigins]) {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`Invalid CORS origin: ${origin}`);
    }
    if (parsed.origin !== origin.replace(/\/$/, '')) {
      throw new Error(`CORS origins must not contain a path: ${origin}`);
    }
  }

  for (const [name, value] of [
    ['JWT_ACCESS_SECRET', validatedConfig.JWT_ACCESS_SECRET],
    ['JWT_REFRESH_SECRET', validatedConfig.JWT_REFRESH_SECRET],
    ['PAYMENT_WEBHOOK_SECRET', validatedConfig.PAYMENT_WEBHOOK_SECRET],
  ]) {
    const normalized = value.toLowerCase();
    if (
      /(change[-_ ]?in[-_ ]?production|replace[-_ ]?with|generate[-_ ]?|your[-_ ]|default|super[-_ ]?secret|mock[-_ ]?payment)/.test(
        normalized,
      ) ||
      new Set(value).size < 12
    ) {
      throw new Error(`${name} uses an insecure default value`);
    }
  }

  if (validatedConfig.NODE_ENV === Environment.Production) {
    // Read the raw value: the class default would otherwise hide the difference
    // between "explicitly not behind a proxy" and "nobody thought about it".
    const rawTrustProxy = config.TRUST_PROXY;
    if (
      rawTrustProxy === undefined ||
      String(rawTrustProxy).trim().length === 0
    ) {
      throw new Error(
        'Production requires an explicit TRUST_PROXY. Set TRUST_PROXY=1 (or the hop count / proxy IP list) when the API sits behind a proxy or load balancer, or TRUST_PROXY=false when it is directly exposed. Left unset, request.ip resolves to the proxy and every client shares one rate-limit bucket.',
      );
    }

    if (
      frontendUrl.protocol !== 'https:' &&
      !['localhost', '127.0.0.1'].includes(frontendUrl.hostname)
    ) {
      throw new Error('Production FRONTEND_URL must use HTTPS');
    }
    for (const origin of corsOrigins) {
      const parsed = new URL(origin);
      if (
        parsed.protocol !== 'https:' &&
        !['localhost', '127.0.0.1'].includes(parsed.hostname)
      ) {
        throw new Error('Production CORS_ORIGINS must use HTTPS');
      }
    }
    if (validatedConfig.SWAGGER_ENABLED === 'true') {
      throw new Error('Production must keep SWAGGER_ENABLED=false');
    }
    const storageValues = [
      validatedConfig.R2_ACCOUNT_ID,
      validatedConfig.R2_ENDPOINT,
      validatedConfig.R2_ACCESS_KEY_ID,
      validatedConfig.R2_SECRET_ACCESS_KEY,
      validatedConfig.R2_BUCKET,
      validatedConfig.R2_PUBLIC_URL,
    ];
    const hasStorageConfiguration = storageValues.some((value) =>
      Boolean(value?.trim()),
    );

    // A persistent volume can preserve the built-in `/app/uploads` storage.
    // R2/S3 remains optional, but when it is configured every field must be
    // present so a half-configured client can never start accepting uploads.
    if (
      hasStorageConfiguration &&
      ((!validatedConfig.R2_ACCOUNT_ID && !validatedConfig.R2_ENDPOINT) ||
        !validatedConfig.R2_ACCESS_KEY_ID ||
        !validatedConfig.R2_SECRET_ACCESS_KEY ||
        !validatedConfig.R2_BUCKET ||
        !validatedConfig.R2_PUBLIC_URL)
    ) {
      throw new Error(
        'R2/S3 configuration is incomplete: provide account ID or endpoint, access key, secret, bucket, and public URL; or remove all R2_* variables to use local storage backed by a persistent volume.',
      );
    }
    if (hasStorageConfiguration) {
      for (const [name, value] of [
        ['R2_PUBLIC_URL', validatedConfig.R2_PUBLIC_URL],
        ...(validatedConfig.R2_ENDPOINT
          ? [['R2_ENDPOINT', validatedConfig.R2_ENDPOINT] as const]
          : []),
      ] as const) {
        try {
          const parsed = new URL(value);
          if (parsed.protocol !== 'https:') throw new Error();
        } catch {
          throw new Error(`Production ${name} must be a valid HTTPS URL`);
        }
      }
    }
    if (
      !validatedConfig.SMTP_HOST &&
      (!validatedConfig.RESEND_API_KEY ||
        validatedConfig.RESEND_API_KEY === 're_placeholder')
    ) {
      throw new Error('Production requires SMTP_HOST or RESEND_API_KEY');
    }
    if (validatedConfig.PAYMENT_PROVIDER === 'mock') {
      throw new Error(
        'Production cannot use PAYMENT_PROVIDER=mock. Use manual for admin-confirmed external payments, or configure a real payment provider.',
      );
    }
  }

  return validatedConfig;
}
