import type { PerformanceEntryWithHeaders } from 'perf-observer-js';

export function cacheResult(entry: PerformanceEntryWithHeaders): 'hit' | 'miss' | 'unknown' {
  const headers = entry.responseHeaders;
  const value = headers['cf-cache-status'] ?? headers['x-cache'];
  if (value && /\bhit\b/i.test(value)) return 'hit';
  if (value && /\bmiss\b/i.test(value)) return 'miss';
  const age = headers['age'];
  if (age !== undefined && Number.isFinite(Number(age)) && Number(age) > 0) return 'hit';
  return 'unknown';
}

export function deprecatedAPI(entry: PerformanceEntryWithHeaders) {
  const deprecation = entry.responseHeaders['deprecation'];
  const sunset = entry.responseHeaders['sunset'];
  return deprecation !== undefined || sunset !== undefined
    ? { path: new URL(entry.name).pathname, deprecation, sunset }
    : undefined;
}
