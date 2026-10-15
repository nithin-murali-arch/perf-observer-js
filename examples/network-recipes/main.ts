import { PerformanceMonitor, type PerformanceEntryWithHeaders } from 'perf-observer-js';
import { showSlowRequests } from '../slow-request-overlay/overlay';
import { cacheResult, deprecatedAPI } from './recipes';
import { forwardToOpenTelemetry } from '../rum-integrations/opentelemetry';
import { forwardToDatadog } from '../rum-integrations/datadog';

export const entries: PerformanceEntryWithHeaders[] = [];
const monitor = new PerformanceMonitor({ workerUrl: '/worker.js' });
export const cacheCounts = new Map<string, { hit: number; miss: number; unknown: number }>();
monitor.subscribe((entry) => {
  entries.push(entry);
  const path = new URL(entry.name).pathname;
  const count = cacheCounts.get(path) ?? { hit: 0, miss: 0, unknown: 0 };
  count[cacheResult(entry)] += 1;
  cacheCounts.set(path, count);
});
const removeOverlay = showSlowRequests(100);
const stopOTel = forwardToOpenTelemetry('/v1/traces', ['/datadog-mock']);
const stopDatadog = forwardToDatadog({
  addAction(name, context) {
    void fetch('/datadog-mock', { method: 'POST', body: JSON.stringify({ name, context }) });
  }
}, ['/v1/traces', '/datadog-mock']);

export async function controlled() {
  await navigator.serviceWorker.ready;
  if (!navigator.serviceWorker.controller) {
    await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
  }
}
export function summarize() {
  return { entries, cacheCounts: Object.fromEntries(cacheCounts), caches: entries.map((entry) => ({ path: new URL(entry.name).pathname, result: cacheResult(entry) })), deprecated: entries.map(deprecatedAPI).filter(Boolean) };
}
document.querySelector('#run')?.addEventListener('click', async () => {
  await controlled();
  await fetch('/api/delayed');
});
window.addEventListener('pagehide', () => { monitor.disconnect(); removeOverlay(); stopDatadog(); void stopOTel(); });
