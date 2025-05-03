import { PerformanceMonitor } from '../../src';

// Mock New Relic Browser API
const newrelic = {
  addPageAction: (name, attributes) => {
    console.log('New Relic Page Action:', { name, attributes });
  },
  setCustomAttribute: (name, value) => {
    console.log('New Relic Custom Attribute:', { name, value });
  },
  noticeError: (error, attributes) => {
    console.error('New Relic Error:', { error, attributes });
  }
};

// Helper functions
function sanitizeHeaders(headers) {
  if (!headers) return {};
  
  // Remove sensitive headers
  const sensitiveHeaders = ['authorization', 'cookie', 'set-cookie'];
  return Object.entries(headers)
    .filter(([key]) => !sensitiveHeaders.includes(key.toLowerCase()))
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
}

function getResourceName(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.split('/').pop() || 'unknown';
  } catch {
    return 'unknown';
  }
}

// Track performance data
function trackPerformance(entry) {
  // Track successful requests
  if (!entry.error) {
    newrelic.addPageAction('resource_timing', {
      name: entry.name,
      type: entry.entryType,
      duration: entry.duration,
      startTime: entry.startTime,
      // Add response headers as attributes
      ...sanitizeHeaders(entry.responseHeaders),
      // Add custom attributes
      environment: 'production',
      service: 'web-app'
    });

    // Track response size if available
    const contentLength = entry.responseHeaders?.['content-length'];
    if (contentLength) {
      newrelic.setCustomAttribute(
        `response_size_${getResourceName(entry.name)}`,
        parseInt(contentLength, 10)
      );
    }
    return;
  }

  // Track errors
  newrelic.noticeError(new Error(entry.error), {
    url: entry.name,
    type: entry.entryType,
    duration: entry.duration,
    headers: sanitizeHeaders(entry.responseHeaders)
  });
}

// Create performance monitor
const monitor = new PerformanceMonitor({
  resourceTiming: true,
  xhrTiming: true,
  fetchTiming: true,
  transform: (entry) => {
    // Add New Relic specific fields
    return {
      ...entry,
      // Add transaction ID if available
      transactionId: window.newrelic?.getBrowserTimingHeader()?.split('"')[1],
      // Add session ID
      sessionId: window.newrelic?.getSessionId(),
      requestId: entry.responseHeaders?.requestId,
      // Add custom attributes
      attributes: {
        environment: 'production',
        service: 'web-app',
        version: '1.0.0'
      }
    };
  }
});

// Subscribe to performance entries
const subscription = monitor.subscribe((entry) => {
  try {
    // Send to New Relic
    trackPerformance(entry);
  } catch (error) {
    console.error('Error sending to New Relic:', error);
  }
});

// Example: Make some requests to monitor
async function makeRequests() {
  // Successful request
  await fetch('https://api.example.com/data');

  // Failed request
  try {
    await fetch('https://api.example.com/error');
  } catch (error) {
    console.log('Fetch error caught:', error);
  }

  // Large response
  await fetch('https://api.example.com/large-data');
}

// Run the example
makeRequests();

// Clean up when done
setTimeout(() => {
  subscription.unsubscribe();
  monitor.disconnect();
}, 5000); 