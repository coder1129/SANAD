const argon2 = require('argon2');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function requireValue(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function validatePassword(password) {
  const obviousValues = [
    'admin@123',
    'password',
    'changeme',
    'customer@123',
  ];
  if (
    password.length < 12 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/\d/.test(password) ||
    !/[^A-Za-z0-9]/.test(password) ||
    obviousValues.includes(password.toLowerCase())
  ) {
    throw new Error(
      'ADMIN_PASSWORD must be at least 12 characters and include upper/lowercase letters, a number, and a symbol',
    );
  }
}

async function main() {
  const email = requireValue('ADMIN_EMAIL').toLowerCase();
  const password = requireValue('ADMIN_PASSWORD');
  const name = process.env.ADMIN_NAME?.trim() || 'Sanad Administrator';

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    throw new Error('ADMIN_EMAIL must be a valid email address');
  }
  validatePassword(password);

  const existing = await prisma.users.findUnique({ where: { email } });
  if (existing) {
    throw new Error(
      `A user with ${email} already exists; refusing to overwrite credentials`,
    );
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  await prisma.users.create({
    data: {
      name,
      email,
      password_hash: passwordHash,
      role: 'super_admin',
      email_verified: true,
    },
  });

  process.stdout.write(`Created super administrator ${email}\n`);
}

main()
  .catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
