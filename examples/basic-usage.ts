import { PerformanceMonitor } from 'perf-observer-js';

const monitor = new PerformanceMonitor({
  workerUrl: '/worker.js',
});

const subscription = monitor.subscribe((entry) => {
  console.log('Performance Entry:', {
    url: entry.name,
    duration: entry.duration,
    headers: entry.responseHeaders,
    request: entry.request
  });

  const cacheControl = entry.responseHeaders['cache-control'];
  if (cacheControl) {
    console.log('Cache Control:', cacheControl);
  }

  if (entry.request?.type === 'fetch' && entry.request?.method === 'POST') {
    console.log('POST Request Performance:', entry.duration);
  }
});

// subscription.unsubscribe();
// monitor.disconnect();
