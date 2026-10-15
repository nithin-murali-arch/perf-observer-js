import { PerformanceMonitor } from 'perf-observer-js';
import type { PerformanceEntryWithHeaders } from 'perf-observer-js';

const categorizeRequests = (entry: PerformanceEntryWithHeaders) => {
  const url = new URL(entry.name);
  const path = url.pathname;

  let category = 'other';
  if (path.startsWith('/api/')) {
    category = 'api';
  } else if (path.match(/\.(js|css|png|jpg|gif)$/)) {
    category = 'static';
  } else if (path.startsWith('/assets/')) {
    category = 'assets';
  }

  return {
    ...entry,
    category
  };
};

const normalizeHeaders = (entry: PerformanceEntryWithHeaders) => {
  const normalizedHeaders: Record<string, string> = {};

  Object.entries(entry.responseHeaders).forEach(([key, value]) => {
    normalizedHeaders[key.toLowerCase()] = value;
  });

  return {
    ...entry,
    responseHeaders: normalizedHeaders
  };
};

const monitor = new PerformanceMonitor({
  workerUrl: '/worker.js',
  transform: (entry) => {
    return categorizeRequests(normalizeHeaders(entry));
  }
});

const subscription = monitor.subscribe((entry) => {
  console.log('Transformed Performance Entry:', {
    url: entry.name,
    category: categorizeRequests(entry).category,
    normalizedHeaders: entry.responseHeaders
  });
});

// subscription.unsubscribe();
// monitor.disconnect();

async function makeRequests() {
  await fetch('https://api.example.com/data');

  await fetch('https://example.com/script.js');

  await fetch('https://example.com/styles.css');
}

makeRequests();

setTimeout(() => {
  subscription.unsubscribe();
  monitor.disconnect();
}, 5000);
