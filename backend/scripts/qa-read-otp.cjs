// Read-only helper for the explicitly named local manual-test accounts.
const path = require('node:path');
const crypto = require('node:crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const { PrismaClient } = require('@prisma/client');

const accounts = {
  customer: 'qa.customer.20260906@example.invalid',
  customer2: 'qa.customer2.20260906@example.invalid',
  new: 'qa.new.20260906@example.invalid',
  admin: 'qa.admin.20260906@example.invalid',
};

async function main() {
  const email = accounts[process.argv[2]];
  if (!email) throw new Error('Usage: node scripts/qa-read-otp.cjs customer|customer2|new|admin');
  const databaseUrl = new URL(process.env.DATABASE_URL);
  if (
    (process.env.NODE_ENV || 'development') !== 'development' ||
    !['localhost', '127.0.0.1', '[::1]'].includes(databaseUrl.hostname)
  ) throw new Error('This helper only supports a local development database.');

  const prisma = new PrismaClient();
  try {
    const challenge = await prisma.email_otp_challenges.findFirst({
      where: { email, consumed_at: null, expires_at: { gt: new Date() } },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
    if (!challenge || challenge.attempt_count >= 5) {
      console.log('No usable OTP. Request a new code from the website first.');
      return;
    }
    const messages = await prisma.email_queue.findMany({
      where: {
        recipient_email: email,
        template_name: 'otp_verification',
        created_at: { gte: new Date(Date.now() - 15 * 60_000) },
      },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      take: 10,
      select: { template_data: true },
    });
    const otp = messages.map(message => message.template_data?.otp).find(value =>
      typeof value === 'string' && /^\d{6}$/.test(value) &&
      crypto.createHash('sha256').update(value).digest('hex') === challenge.otp_hash,
    );
    if (!otp) throw new Error('No matching queued OTP yet. Retry after the website request finishes.');
    console.log(`Account: ${email}\nOTP: ${otp}\nExpires: ${challenge.expires_at.toISOString()}\nAttempts used: ${challenge.attempt_count}/5`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Could not read the local test OTP.');
  process.exitCode = 1;
});
