// Basic usage example of Performance Observer JS
import { PerformanceMonitor } from 'perf-observer-js';
import type { PerformanceEntryWithHeaders } from 'perf-observer-js';

// Create a performance monitor instance
const monitor = new PerformanceMonitor({
  // Optional: Add a transform function to process entries
  transform: (entry) => {
    // Add any custom processing here
    return entry;
  }
});

// Subscribe to performance entries
const subscription = monitor.subscribe((entry) => {
  // Log the performance data
  console.log('Performance Entry:', {
    url: entry.name,
    duration: entry.duration,
    timing: entry.timing,
    headers: entry.responseHeaders,
    request: entry.request
  });

  // Example: Log specific timing metrics
  if (entry.timing) {
    const {
      fetchStart,
      domainLookupStart,
      domainLookupEnd,
      connectStart,
      connectEnd,
      requestStart,
      responseStart,
      responseEnd
    } = entry.timing;

    console.log('Detailed Timing:', {
      dnsLookup: domainLookupEnd - domainLookupStart,
      tcpConnection: connectEnd - connectStart,
      requestTime: responseStart - requestStart,
      responseTime: responseEnd - responseStart,
      totalTime: responseEnd - fetchStart
    });
  }

  // Example: Check for cached responses
  const cacheControl = entry.responseHeaders['cache-control'];
  if (cacheControl) {
    console.log('Cache Status:', cacheControl);
  }

  // Example: Monitor specific request types
  if (entry.request?.type === 'fetch' && entry.request?.method === 'POST') {
    console.log('POST Request Performance:', entry.duration);
  }
});

// Example: Clean up when done
// subscription.unsubscribe();
// monitor.disconnect(); 