import { PerformanceMonitor } from '../..';
import type {
  PerformanceEntryWithHeaders,
  PerformanceMonitorConfig,
  Subscription
} from '../..';

const entry: PerformanceEntryWithHeaders = {
  name: 'https://example.com/api',
  entryType: 'resource',
  startTime: 1,
  duration: 2,
  responseHeaders: { 'content-type': 'application/json' }
};

const config: PerformanceMonitorConfig = {
  workerUrl: '/worker.js',
  transform: (e) => ({ ...e, duration: e.duration * 2 })
};

export function subscribeAll(): Subscription {
  const monitor = new PerformanceMonitor(config);
  return monitor.subscribe((e) => {
    console.log(e.name, e.duration, e.responseHeaders, entry.name);
  });
}
