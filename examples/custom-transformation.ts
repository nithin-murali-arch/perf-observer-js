import { PerformanceMonitor } from 'perf-observer-js';
import type { PerformanceEntryWithHeaders } from 'perf-observer-js';

// Example transform functions
const addCustomMetrics = (entry: PerformanceEntryWithHeaders) => {
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

    return {
      ...entry,
      customMetrics: {
        dnsLookup: domainLookupEnd - domainLookupStart,
        tcpConnection: connectEnd - connectStart,
        requestTime: responseStart - requestStart,
        responseTime: responseEnd - responseStart,
        totalTime: responseEnd - fetchStart
      }
    };
  }
  return entry;
};

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

// Create a performance monitor with multiple transformations
const monitor = new PerformanceMonitor({
  transform: (entry) => {
    // Apply transformations in sequence
    let transformed = addCustomMetrics(entry);
    transformed = categorizeRequests(transformed);
    transformed = normalizeHeaders(transformed);
    return transformed;
  }
});

// Subscribe to transformed entries
const subscription = monitor.subscribe((entry) => {
  console.log('Transformed Performance Entry:', {
    url: entry.name,
    category: (entry as any).category,
    customMetrics: (entry as any).customMetrics,
    normalizedHeaders: entry.responseHeaders
  });
});

// Example: Clean up when done
// subscription.unsubscribe();
// monitor.disconnect();

// Example: Make some requests to monitor
async function makeRequests() {
  // API request
  await fetch('https://api.example.com/data');

  // Script request
  await fetch('https://example.com/script.js');

  // Style request
  await fetch('https://example.com/styles.css');
}

// Run the example
makeRequests();

// Clean up when done
setTimeout(() => {
  subscription.unsubscribe();
  monitor.disconnect();
}, 5000); 