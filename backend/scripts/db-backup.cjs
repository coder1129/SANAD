#!/usr/bin/env node
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {
  connectionArgs,
  parseDatabaseUrl,
  runPostgresTool,
} = require('./postgres-tools.cjs');

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function main() {
  const connection = parseDatabaseUrl('DATABASE_URL');
  const backupDir = path.resolve(process.env.BACKUP_DIR || 'backups');
  fs.mkdirSync(backupDir, { recursive: true, mode: 0o700 });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeDatabase = connection.database.replace(/[^a-zA-Z0-9_-]/g, '_');
  const finalPath = path.join(backupDir, `${safeDatabase}-${timestamp}.dump`);
  const partialPath = `${finalPath}.partial`;

  try {
    runPostgresTool(
      'pg_dump',
      [
        ...connectionArgs(connection),
        '--format=custom',
        '--compress=9',
        '--no-owner',
        '--no-privileges',
        '--file',
        partialPath,
        connection.database,
      ],
      connection,
    );
    fs.renameSync(partialPath, finalPath);
  } catch (error) {
    if (fs.existsSync(partialPath)) fs.unlinkSync(partialPath);
    throw error;
  }

  const checksum = await sha256File(finalPath);
  fs.writeFileSync(
    `${finalPath}.sha256`,
    `${checksum}  ${path.basename(finalPath)}\n`,
    {
      mode: 0o600,
    },
  );

  process.stdout.write(`Backup created: ${finalPath}\n`);
  process.stdout.write(`SHA-256: ${checksum}\n`);
}

main().catch((error) => {
  process.stderr.write(`Backup failed: ${error.message}\n`);
  process.exitCode = 1;
});
