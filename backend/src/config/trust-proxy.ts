import { isIP } from 'node:net';

export type TrustProxySetting = boolean | number | string[];

// Express accepts these named ranges in addition to IPs and CIDR blocks.
const NAMED_SUBNETS = new Set(['loopback', 'linklocal', 'uniquelocal']);

function isIpOrCidr(value: string): boolean {
  const parts = value.split('/');
  if (parts.length > 2) return false;

  const version = isIP(parts[0]);
  if (version === 0) return false;
  if (parts.length === 1) return true;
  if (!/^\d+$/.test(parts[1])) return false;

  const prefix = Number(parts[1]);
  return prefix >= 0 && prefix <= (version === 4 ? 32 : 128);
}

/**
 * Translates the TRUST_PROXY env var into an Express `trust proxy` value.
 *
 * Accepted forms:
 *   false | true          - disable, or trust every hop (only safe when the app
 *                           is never reachable except through your own proxy)
 *   <n>                   - trust n hops closest to the app
 *   <ip|cidr|name>,...    - trust a specific set of proxy addresses
 *
 * Returns null when the value is not one of those, so callers can reject it.
 */
export function parseTrustProxy(
  raw: string | undefined,
): TrustProxySetting | null {
  const value = (raw ?? '').trim();
  if (value === '' || value.toLowerCase() === 'false') return false;
  if (value.toLowerCase() === 'true') return true;

  if (/^\d+$/.test(value)) {
    const hops = Number(value);
    return hops > 0 ? hops : false;
  }

  const entries = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (entries.length === 0) return null;

  const allValid = entries.every(
    (entry) => NAMED_SUBNETS.has(entry.toLowerCase()) || isIpOrCidr(entry),
  );
  return allValid ? entries : null;
}

/** True when the value would make `request.ip` fall back to the socket address. */
export function trustProxyIsDisabled(setting: TrustProxySetting): boolean {
  return setting === false;
}
