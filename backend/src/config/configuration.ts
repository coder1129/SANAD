export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3001',
  },
  trustProxy: process.env.TRUST_PROXY || 'false',
  sentry: {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  },
  storage: {
    accountId: process.env.R2_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucket: process.env.R2_BUCKET || 'sanad-files',
    publicUrl: process.env.R2_PUBLIC_URL,
    endpoint: process.env.R2_ENDPOINT,
  },
  email: {
    resendApiKey: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM || 'noreply@sanad.ae',
    verification: {
      required: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
      expiresIn: process.env.EMAIL_VERIFICATION_EXPIRES_IN || '24h',
    },
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
      fromEmail:
        process.env.SMTP_FROM_EMAIL ||
        process.env.EMAIL_FROM ||
        'noreply@sanad.ae',
    },
  },
  demo: {
    otpEmail: process.env.DEMO_OTP_EMAIL?.trim().toLowerCase(),
    otpCode: process.env.DEMO_OTP_CODE?.trim(),
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID?.trim(),
  },
  payment: {
    provider: process.env.PAYMENT_PROVIDER || 'mock',
    secretKey: process.env.PAYMENT_SECRET_KEY,
    webhookSecret: process.env.PAYMENT_WEBHOOK_SECRET,
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '60', 10),
  },
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
});
