import { PerformanceMonitor } from 'perf-observer-js';

interface DatadogActions {
  addAction(name: string, context: { path: string; duration_ms: number; status: number; rejected: boolean }): void;
}

export function forwardToDatadog(rum: DatadogActions, collectorPaths: string[] = []) {
  const monitor = new PerformanceMonitor({ workerUrl: '/worker.js' });
  monitor.subscribe((entry) => {
    const path = new URL(entry.name).pathname;
    if (collectorPaths.includes(path)) return;
    rum.addAction('network_request', {
      path, duration_ms: entry.duration, status: entry.status, rejected: Boolean(entry.error)
    });
  });
  return () => monitor.disconnect();
}
