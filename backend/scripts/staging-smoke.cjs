#!/usr/bin/env node
const baseUrl = (process.env.STAGING_BASE_URL || '').replace(/\/$/, '');
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || 10_000);

if (!baseUrl) {
  process.stderr.write(
    'STAGING_BASE_URL is required, for example https://staging-api.example.com\n',
  );
  process.exit(1);
}

const parsedBase = new URL(baseUrl);
if (
  parsedBase.protocol !== 'https:' &&
  process.env.ALLOW_HTTP_STAGING !== 'true'
) {
  process.stderr.write(
    'Staging must use HTTPS. Set ALLOW_HTTP_STAGING=true only for a local run.\n',
  );
  process.exit(1);
}

let failures = 0;

async function probe(method, path, expectedStatus, body) {
  const startedAt = performance.now();
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const elapsed = Math.round(performance.now() - startedAt);
    const ok = response.status === expectedStatus;
    process.stdout.write(
      `${ok ? 'PASS' : 'FAIL'} ${method} ${path} -> ${response.status} (${elapsed}ms)\n`,
    );
    if (!ok) failures += 1;
    let json;
    try {
      json = await response.json();
    } catch {
      json = null;
    }
    return { response, json, ok };
  } catch (error) {
    failures += 1;
    process.stderr.write(`FAIL ${method} ${path}: ${error.message}\n`);
    return { response: null, json: null, ok: false };
  }
}

async function main() {
  const live = await probe('GET', '/api/v1/health/live', 200);
  await probe('GET', '/api/v1/health/ready', 200);
  const packages = await probe('GET', '/api/v1/packages?limit=1', 200);
  await probe('GET', '/api/v1/offers', 200);
  await probe('GET', '/api/v1/settings/public', 200);

  if (live.response) {
    for (const [header, expected] of [
      ['x-content-type-options', 'nosniff'],
      ['x-frame-options', 'SAMEORIGIN'],
    ]) {
      const actual = live.response.headers.get(header);
      if (actual !== expected) {
        failures += 1;
        process.stderr.write(
          `FAIL security header ${header}: expected ${expected}, received ${actual}\n`,
        );
      }
    }
  }

  const packageId =
    packages.json?.data?.items?.[0]?.id ||
    packages.json?.items?.[0]?.id ||
    Number(process.env.LOAD_TEST_PACKAGE_ID || 1);
  await probe('POST', '/api/v1/checkout/preview', 201, {
    package_id: packageId,
  });

  await probe('POST', '/api/v1/orders/1/files', 404);
  await probe('GET', '/api/v1/orders/1/files', 404);
  await probe('DELETE', '/api/v1/orders/1/files/1', 404);
  await probe('GET', '/api/v1/orders/1/deliverables', 404);
  await probe('POST', '/api/v1/admin/orders/1/deliverables', 404);

  if (process.env.EXPECT_SWAGGER_DISABLED !== 'false') {
    await probe('GET', '/api/docs', 404);
  }

  if (failures > 0) {
    throw new Error(`${failures} staging smoke check(s) failed`);
  }
  process.stdout.write('All staging smoke checks passed.\n');
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
