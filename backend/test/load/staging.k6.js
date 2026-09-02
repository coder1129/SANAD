import http from 'k6/http';
import { check, group, sleep } from 'k6';

const baseUrl = (__ENV.STAGING_BASE_URL || '').replace(/\/$/, '');
const packageId = Number(__ENV.LOAD_TEST_PACKAGE_ID || 1);

export const options = {
  vus: Number(__ENV.LOAD_VUS || 10),
  duration: __ENV.LOAD_DURATION || '60s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<750', 'p(99)<1500'],
    checks: ['rate>0.99'],
  },
};

export function setup() {
  if (!baseUrl) throw new Error('STAGING_BASE_URL is required');
  if (!baseUrl.startsWith('https://') && __ENV.ALLOW_HTTP_STAGING !== 'true') {
    throw new Error('Use an HTTPS staging URL');
  }

  const ready = http.get(`${baseUrl}/api/v1/health/ready`, {
    tags: { endpoint: 'readiness' },
  });
  if (ready.status !== 200) throw new Error('Staging is not ready');
}

export default function () {
  group('public catalog', () => {
    const responses = http.batch([
      [
        'GET',
        `${baseUrl}/api/v1/packages?limit=10`,
        null,
        { tags: { endpoint: 'packages' } },
      ],
      [
        'GET',
        `${baseUrl}/api/v1/offers`,
        null,
        { tags: { endpoint: 'offers' } },
      ],
      [
        'GET',
        `${baseUrl}/api/v1/testimonials`,
        null,
        { tags: { endpoint: 'testimonials' } },
      ],
      [
        'GET',
        `${baseUrl}/api/v1/settings/public`,
        null,
        { tags: { endpoint: 'settings' } },
      ],
    ]);
    for (const response of responses) {
      check(response, {
        'catalog response is 200': (result) => result.status === 200,
      });
    }
  });

  group('checkout calculation', () => {
    const response = http.post(
      `${baseUrl}/api/v1/checkout/preview`,
      JSON.stringify({ package_id: packageId }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { endpoint: 'checkout-preview' },
      },
    );
    check(response, {
      'checkout preview succeeds': (result) => result.status === 201,
    });
  });

  sleep(1);
}
