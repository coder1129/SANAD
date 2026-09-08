require('dotenv/config');

const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    await Promise.race([
      prisma.$connect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 10000),
      ),
    ]);
    console.log('connected');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
