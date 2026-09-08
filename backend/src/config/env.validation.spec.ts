import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { validate } from './env.validation';

const valid = {
  NODE_ENV: 'development',
  DATABASE_URL: 'postgresql://localhost/sanad',
  JWT_ACCESS_SECRET: 'a9c8e7f6b5d4c3a2-ACCESS-7f6e5d4c3b2a1',
  JWT_REFRESH_SECRET: '0f1e2d3c4b5a6978-REFRESH-8a7b6c5d4e3f2',
  PAYMENT_WEBHOOK_SECRET: '1234abcd5678efgh-WEBHOOK-9876ijkl5432',
};

const productionServices = {
  R2_ACCOUNT_ID: 'cloudflare-account-id',
  R2_ACCESS_KEY_ID: 'access-key',
  R2_SECRET_ACCESS_KEY: 'secret-key',
  R2_BUCKET: 'sanad-files',
  R2_PUBLIC_URL: 'https://media.sanad.example',
  RESEND_API_KEY: 'resend-key',
};

describe('environment validation', () => {
  it('accepts independent strong secrets', () => {
    expect(validate(valid)).toMatchObject({ NODE_ENV: 'development' });
  });

  it('validates the optional Google OAuth web client ID', () => {
    expect(
      validate({
        ...valid,
        GOOGLE_CLIENT_ID: '123456789-example.apps.googleusercontent.com',
      }).GOOGLE_CLIENT_ID,
    ).toBe('123456789-example.apps.googleusercontent.com');

    expect(() =>
      validate({ ...valid, GOOGLE_CLIENT_ID: 'not-a-google-client-id' }),
    ).toThrow(/GOOGLE_CLIENT_ID/);
  });

  it('rejects identical JWT secrets', () => {
    expect(() =>
      validate({ ...valid, JWT_REFRESH_SECRET: valid.JWT_ACCESS_SECRET }),
    ).toThrow(/must be different/);
  });

  it('rejects placeholder secrets even when they are long enough', () => {
    expect(() =>
      validate({
        ...valid,
        JWT_ACCESS_SECRET:
          'replace-with-a-unique-random-value-of-at-least-32-characters',
      }),
    ).toThrow(/insecure default/);
  });

  it('rejects malformed trust-proxy addresses and CIDRs', () => {
    expect(() => validate({ ...valid, TRUST_PROXY: '999.1.1.1' })).toThrow(
      /TRUST_PROXY/,
    );
    expect(() => validate({ ...valid, TRUST_PROXY: '10.0.0.0/99' })).toThrow(
      /TRUST_PROXY/,
    );
  });

  it('accepts a valid trust-proxy hop count or CIDR list', () => {
    expect(validate({ ...valid, TRUST_PROXY: '1' }).TRUST_PROXY).toBe('1');
    expect(
      validate({ ...valid, TRUST_PROXY: '10.0.0.0/8,2001:db8::/32' })
        .TRUST_PROXY,
    ).toContain('10.0.0.0');
  });

  it('requires email delivery in production', () => {
    expect(() =>
      validate({ ...valid, NODE_ENV: 'production', TRUST_PROXY: 'false' }),
    ).toThrow(/SMTP_HOST or RESEND_API_KEY/);
  });

  it('requires an explicit trust-proxy decision in production', () => {
    expect(() => validate({ ...valid, NODE_ENV: 'production' })).toThrow(
      /explicit TRUST_PROXY/,
    );
  });

  it('accepts a fully configured production environment', () => {
    expect(
      validate({
        ...valid,
        NODE_ENV: 'production',
        TRUST_PROXY: 'false',
        ...productionServices,
        PAYMENT_PROVIDER: 'bypass',
      }),
    ).toMatchObject({ NODE_ENV: 'production' });
  });

  it('rejects the mock payment gateway in production', () => {
    expect(() =>
      validate({
        ...valid,
        NODE_ENV: 'production',
        TRUST_PROXY: 'false',
        ...productionServices,
        PAYMENT_PROVIDER: 'mock',
      }),
    ).toThrow(/PAYMENT_PROVIDER=mock/);
  });

  it('rejects placeholder email credentials in production', () => {
    expect(() =>
      validate({
        ...valid,
        ...productionServices,
        NODE_ENV: 'production',
        TRUST_PROXY: '1',
        PAYMENT_PROVIDER: 'bypass',
        RESEND_API_KEY: 're_placeholder',
      }),
    ).toThrow(/SMTP_HOST or RESEND_API_KEY/);
  });

  it('rejects insecure production CORS origins and exposed Swagger', () => {
    expect(() =>
      validate({
        ...valid,
        ...productionServices,
        NODE_ENV: 'production',
        TRUST_PROXY: '1',
        PAYMENT_PROVIDER: 'bypass',
        CORS_ORIGINS: 'http://admin.sanad.example',
      }),
    ).toThrow(/CORS_ORIGINS must use HTTPS/);

    expect(() =>
      validate({
        ...valid,
        ...productionServices,
        NODE_ENV: 'production',
        TRUST_PROXY: '1',
        PAYMENT_PROVIDER: 'bypass',
        SWAGGER_ENABLED: 'true',
      }),
    ).toThrow(/SWAGGER_ENABLED=false/);
  });

  it('allows Railway local storage but rejects incomplete R2/S3 configuration', () => {
    expect(
      validate({
        ...valid,
        NODE_ENV: 'production',
        TRUST_PROXY: '1',
        PAYMENT_PROVIDER: 'bypass',
        RESEND_API_KEY: 'resend-key',
      }),
    ).toMatchObject({ NODE_ENV: 'production' });

    expect(() =>
      validate({
        ...valid,
        NODE_ENV: 'production',
        TRUST_PROXY: '1',
        PAYMENT_PROVIDER: 'bypass',
        RESEND_API_KEY: 'resend-key',
        R2_PUBLIC_URL: 'https://media.sanad.example',
      }),
    ).toThrow(/R2\/S3 configuration is incomplete/);

    expect(() =>
      validate({
        ...valid,
        ...productionServices,
        NODE_ENV: 'production',
        TRUST_PROXY: '1',
        PAYMENT_PROVIDER: 'bypass',
        R2_PUBLIC_URL: 'http://media.sanad.example',
      }),
    ).toThrow(/valid HTTPS URL/);
  });
});
