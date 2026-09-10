import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const prisma = new PrismaClient();

describe('PostgreSQL schema integration', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('has every committed migration applied successfully', async () => {
    const rows = await prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name
      FROM "_prisma_migrations"
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
      ORDER BY migration_name
    `;

    expect(rows.map((row) => row.migration_name)).toEqual(
      expect.arrayContaining([
        '20260828030000_init',
        '20260828032000_add_rate_limit_buckets',
        '20260828050000_add_email_verification_tokens',
        '20260905150000_add_package_reviews',
        '20260909101500_add_manual_payment_methods',
      ]),
    );
  });

  it('contains the security and workflow columns used by the application', async () => {
    const rows = await prisma.$queryRaw<
      Array<{ table_name: string; column_name: string }>
    >`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (table_name, column_name) IN (
          ('users', 'token_version'),
          ('orders', 'requirements'),
          ('order_files', 'file_category'),
          ('order_files', 'metadata'),
          ('package_images', 'alt_text'),
          ('package_reviews', 'order_id'),
          ('package_reviews', 'rating'),
          ('package_reviews', 'status'),
          ('email_verification_tokens', 'token_hash')
        )
    `;
    const names = new Set(
      rows.map((row) => `${row.table_name}.${row.column_name}`),
    );

    expect(names).toEqual(
      new Set([
        'users.token_version',
        'orders.requirements',
        'order_files.file_category',
        'order_files.metadata',
        'package_images.alt_text',
        'package_reviews.order_id',
        'package_reviews.rating',
        'package_reviews.status',
        'email_verification_tokens.token_hash',
      ]),
    );
  });

  it('has unique indexes for opaque tokens and payment transactions', async () => {
    const rows = await prisma.$queryRaw<
      Array<{ table_name: string; index_name: string }>
    >`
      SELECT tablename AS table_name, indexname AS index_name
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexdef ILIKE '%UNIQUE%'
        AND tablename IN (
          'user_sessions',
          'password_reset_tokens',
          'email_verification_tokens',
          'payments'
        )
    `;
    const tables = new Set(rows.map((row) => row.table_name));

    expect(tables).toEqual(
      new Set([
        'user_sessions',
        'password_reset_tokens',
        'email_verification_tokens',
        'payments',
      ]),
    );
  });

  it('allows every supported externally reconciled payment method', async () => {
    const rows = await prisma.$queryRaw<Array<{ definition: string }>>`
      SELECT pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
      WHERE conname = 'payments_payment_method_check'
    `;

    expect(rows[0]?.definition).toContain('payment_link');
    expect(rows[0]?.definition).toContain('qr_code');
    expect(rows[0]?.definition).toContain('bank_transfer');
    expect(rows[0]?.definition).toContain('cash');
  });

  it('can atomically address the shared rate-limit table', async () => {
    const rows = await prisma.$queryRaw<Array<{ table_name: string | null }>>`
      SELECT to_regclass('public.rate_limit_buckets')::text AS table_name
    `;
    expect(rows[0]?.table_name).toBe('rate_limit_buckets');
  });

  it('enforces one verified review per completed order at the database layer', async () => {
    const rows = await prisma.$queryRaw<Array<{ index_name: string }>>`
      SELECT indexname AS index_name
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'package_reviews'
        AND indexdef ILIKE '%UNIQUE%'
        AND indexdef ILIKE '%order_id%'
    `;

    expect(rows.length).toBeGreaterThan(0);
  });
});
