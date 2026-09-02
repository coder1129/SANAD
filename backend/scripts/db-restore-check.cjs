#!/usr/bin/env node
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {
  connectionArgs,
  databaseIdentity,
  parseDatabaseUrl,
  runPostgresTool,
} = require('./postgres-tools.cjs');

function resolveBackup() {
  if (process.argv[2]) return path.resolve(process.argv[2]);
  const backupDir = path.resolve(process.env.BACKUP_DIR || 'backups');
  if (!fs.existsSync(backupDir)) throw new Error('No backup directory exists');
  const files = fs
    .readdirSync(backupDir)
    .filter((name) => name.endsWith('.dump'))
    .sort()
    .reverse();
  if (!files[0]) throw new Error('No .dump backup was found');
  return path.join(backupDir, files[0]);
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function verifyChecksum(backupPath) {
  const checksumPath = `${backupPath}.sha256`;
  if (!fs.existsSync(checksumPath)) {
    throw new Error(`Missing checksum file: ${checksumPath}`);
  }
  const expected = fs.readFileSync(checksumPath, 'utf8').trim().split(/\s+/)[0];
  const actual = await sha256File(backupPath);
  if (actual !== expected) throw new Error('Backup checksum does not match');
}

async function main() {
  if (process.env.RESTORE_CONFIRM !== 'restore-test-database') {
    throw new Error(
      'Set RESTORE_CONFIRM=restore-test-database to acknowledge that the restore target will be replaced',
    );
  }

  const source = parseDatabaseUrl('DATABASE_URL');
  const target = parseDatabaseUrl('RESTORE_DATABASE_URL');
  if (databaseIdentity(source) === databaseIdentity(target)) {
    throw new Error('RESTORE_DATABASE_URL must not point to DATABASE_URL');
  }

  const backupPath = resolveBackup();
  if (!fs.statSync(backupPath).isFile())
    throw new Error('Backup is not a file');
  await verifyChecksum(backupPath);

  runPostgresTool(
    'pg_restore',
    [
      ...connectionArgs(target),
      '--clean',
      '--if-exists',
      '--exit-on-error',
      '--no-owner',
      '--no-privileges',
      '--dbname',
      target.database,
      backupPath,
    ],
    target,
  );

  const tableCount = runPostgresTool(
    'psql',
    [
      ...connectionArgs(target),
      '--dbname',
      target.database,
      '--tuples-only',
      '--no-align',
      '--command',
      "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('users','packages','orders','payments');",
    ],
    target,
    { capture: true },
  ).trim();
  if (tableCount !== '4') {
    throw new Error(
      `Restore verification found ${tableCount || '0'} of 4 core tables`,
    );
  }

  process.stdout.write(`Restore drill passed using ${backupPath}\n`);
  process.stdout.write(`Verified target: ${databaseIdentity(target)}\n`);
}

main().catch((error) => {
  process.stderr.write(`Restore drill failed: ${error.message}\n`);
  process.exitCode = 1;
});
