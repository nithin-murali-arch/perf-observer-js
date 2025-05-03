import { PerformanceMonitor } from '../../src';

// Mock Datadog RUM API
const datadog = {
  addAction: (name, attributes) => {
    console.log('Datadog Action:', { name, attributes });
  },
  addError: (error, attributes) => {
    console.error('Datadog Error:', { error, attributes });
  },
  addTiming: (name, value) => {
    console.log('Datadog Timing:', { name, value });
  },
  addResource: (resource) => {
    console.log('Datadog Resource:', resource);
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
    // Add resource timing
    datadog.addResource({
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

    // Add custom timing
    datadog.addTiming(
      `resource_${getResourceName(entry.name)}`,
      entry.duration
    );

    // Track response size if available
    const contentLength = entry.responseHeaders?.['content-length'];
    if (contentLength) {
      datadog.addAction('resource_size', {
        name: getResourceName(entry.name),
        size: parseInt(contentLength, 10)
      });
    }
    return;
  }

  // Track errors
  datadog.addError(new Error(entry.error), {
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
    // Add Datadog specific fields
    return {
      ...entry,
      // Add session ID
      sessionId: window.DD_RUM?.getSessionId(),
      // Add view ID
      viewId: window.DD_RUM?.getViewId(),
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
    // Send to Datadog
    trackPerformance(entry);
  } catch (error) {
    console.error('Error sending to Datadog:', error);
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