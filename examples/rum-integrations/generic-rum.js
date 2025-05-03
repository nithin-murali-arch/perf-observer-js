import { PerformanceMonitor } from '../../src';

// Configuration
const config = {
  service: 'web-app',
  environment: 'production',
  version: '1.0.0',
  endpoint: 'https://rum.example.com/collect',
  apiKey: 'your-api-key'
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

// Create payload for RUM service
function createPayload(entry) {
  const basePayload = {
    // Common fields
    service: config.service,
    environment: config.environment,
    version: config.version,
    timestamp: Date.now(),
    
    // Resource information
    resource: {
      name: entry.name,
      type: entry.entryType,
      duration: entry.duration,
      startTime: entry.startTime,
      // Add response headers (sanitized)
      headers: sanitizeHeaders(entry.responseHeaders)
    },

    // Browser information
    browser: {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform
    },

    // Page information
    page: {
      url: window.location.href,
      referrer: document.referrer
    }
  };

  // Add error information if available
  if (entry.error) {
    return {
      ...basePayload,
      type: 'error',
      error: {
        message: entry.error,
        url: entry.name,
        duration: entry.duration
      }
    };
  }

  // Add performance metrics
  return {
    ...basePayload,
    type: 'performance',
    metrics: {
      duration: entry.duration,
      startTime: entry.startTime,
      endTime: entry.startTime + entry.duration,
      // Add response size if available
      size: entry.responseHeaders?.['content-length'] 
        ? parseInt(entry.responseHeaders['content-length'], 10)
        : undefined
    }
  };
}

// Send data to RUM service
async function sendToRUM(payload) {
  // In a real implementation, this would send data to your RUM service
  // This is a mock implementation
  console.log('Sending to RUM:', {
    endpoint: config.endpoint,
    payload
  });

  // Example of how you might send to a real RUM service
  // await fetch(config.endpoint, {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${config.apiKey}`
  //   },
  //   body: JSON.stringify(payload)
  // });
}

// Track performance data
async function trackPerformance(entry) {
  try {
    const payload = createPayload(entry);
    await sendToRUM(payload);
  } catch (error) {
    console.error('Error sending to RUM:', error);
  }
}

// Create performance monitor
const monitor = new PerformanceMonitor({
  resourceTiming: true,
  xhrTiming: true,
  fetchTiming: true,
  transform: (entry) => {
    // Add custom fields
    return {
      ...entry,
      // Add session ID
      sessionId: crypto.randomUUID(),
      requestId: entry.responseHeaders?.requestId,
      // Add custom attributes
      attributes: {
        environment: config.environment,
        service: config.service,
        version: config.version
      }
    };
  }
});

// Subscribe to performance entries
const subscription = monitor.subscribe((entry) => {
  // Send to RUM service
  trackPerformance(entry);
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