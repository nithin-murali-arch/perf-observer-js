import { PerformanceMonitor, PerformanceEntryWithHeaders } from '../src';

// Create a performance monitor with custom transformation
const monitor = new PerformanceMonitor({
  resourceTiming: true,
  xhrTiming: true,
  fetchTiming: true,
  transform: (entry: PerformanceEntryWithHeaders) => {
    // Add custom fields
    const transformed = {
      ...entry,
      // Add timestamp
      timestamp: Date.now(),
      // Add environment
      environment: process.env.NODE_ENV || 'development',
      // Add custom metrics
      metrics: {
        totalTime: entry.duration,
        startTime: entry.startTime,
        endTime: entry.startTime + entry.duration,
        // Calculate time to first byte (if available)
        ttfb: entry.responseHeaders?.['server-timing'] 
          ? parseFloat(entry.responseHeaders['server-timing'].split(';')[0])
          : null
      },
      // Normalize response headers
      responseHeaders: entry.responseHeaders ? {
        ...entry.responseHeaders,
        'content-type': entry.responseHeaders['content-type']?.toLowerCase(),
        // Remove sensitive headers
        'set-cookie': undefined,
        'authorization': undefined
      } : undefined
    };

    // Add custom categorization
    if (entry.name.includes('/api/')) {
      transformed.category = 'api';
    } else if (entry.name.endsWith('.js')) {
      transformed.category = 'script';
    } else if (entry.name.endsWith('.css')) {
      transformed.category = 'style';
    } else {
      transformed.category = 'other';
    }

    return transformed;
  }
});

// Subscribe to transformed entries
const subscription = monitor.subscribe((entry) => {
  console.log('Transformed entry:', {
    name: entry.name,
    category: (entry as any).category,
    environment: (entry as any).environment,
    metrics: (entry as any).metrics,
    headers: entry.responseHeaders
  });
});

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