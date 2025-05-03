import { PerformanceMonitor, PerformanceEntryWithHeaders } from '../src';

// Extend the type to include our custom fields
type TransformedEntry = PerformanceEntryWithHeaders & {
  timestamp: number;
  environment: string;
  metrics: {
    totalTime: number;
    startTime: number;
    endTime: number;
    ttfb: number | null;
  };
  category: 'api' | 'script' | 'style' | 'other';
};

// Create a performance monitor with custom transformation
const monitor = new PerformanceMonitor({
  resourceTiming: true,
  xhrTiming: true,
  fetchTiming: true,
  transform: (entry: PerformanceEntryWithHeaders): TransformedEntry => {
    // Add custom fields
    const transformed: TransformedEntry = {
      ...entry,
      // Add timestamp
      timestamp: Date.now(),
      // Add environment
      environment: window.location.href.includes('https://www.example.com') ? 'production' : 'development',
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
      responseHeaders: entry.responseHeaders ? Object.fromEntries(
        Object.entries(entry.responseHeaders)
          .filter(([key]) => !['set-cookie', 'authorization'].includes(key.toLowerCase()))
          .map(([key, value]) => [
            key,
            key === 'content-type' ? value.toLowerCase() : value
          ])
      ) : undefined,
      // Add category
      category: entry.name.includes('/api/') ? 'api' 
        : entry.name.endsWith('.js') ? 'script'
        : entry.name.endsWith('.css') ? 'style'
        : 'other'
    };

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