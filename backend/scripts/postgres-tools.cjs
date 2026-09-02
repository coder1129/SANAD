require('dotenv/config');

const { spawnSync } = require('node:child_process');

function parseDatabaseUrl(name) {
  const raw = process.env[name];
  if (!raw) throw new Error(`${name} is required`);

  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${name} must be a valid PostgreSQL URL`);
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error(`${name} must use the PostgreSQL protocol`);
  }

  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (!url.hostname || !database || !url.username) {
    throw new Error(`${name} must include host, username, and database name`);
  }
  return { raw, url, database };
}

function connectionArgs(connection) {
  return [
    '--host',
    connection.url.hostname,
    '--port',
    connection.url.port || '5432',
    '--username',
    decodeURIComponent(connection.url.username),
  ];
}

function runPostgresTool(tool, args, connection, options = {}) {
  const sslMode = connection.url.searchParams.get('sslmode');
  const result = spawnSync(tool, args, {
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
    env: {
      ...process.env,
      PGPASSWORD: decodeURIComponent(connection.url.password),
      ...(sslMode && { PGSSLMODE: sslMode }),
    },
  });

  if (result.error?.code === 'ENOENT') {
    throw new Error(
      `${tool} was not found. Install the PostgreSQL client tools matching the server major version.`,
    );
  }
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = options.capture ? result.stderr.trim() : '';
    throw new Error(`${tool} failed${detail ? `: ${detail}` : ''}`);
  }
  return result.stdout || '';
}

function databaseIdentity(connection) {
  return `${connection.url.hostname.toLowerCase()}:${connection.url.port || '5432'}/${connection.database}`;
}

module.exports = {
  connectionArgs,
  databaseIdentity,
  parseDatabaseUrl,
  runPostgresTool,
};
