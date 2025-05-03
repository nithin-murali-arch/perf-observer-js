import { PerformanceMonitor, PerformanceEntryWithHeaders } from '../../src';

// New Relic Browser integration
class NewRelicIntegration {
  private newrelic: any;

  constructor() {
    // In a real app, New Relic would be loaded via their script
    // This is a mock of the New Relic Browser API
    this.newrelic = {
      addPageAction: (name: string, attributes: Record<string, any>) => {
        console.log('New Relic Page Action:', { name, attributes });
      },
      setCustomAttribute: (name: string, value: any) => {
        console.log('New Relic Custom Attribute:', { name, value });
      },
      noticeError: (error: Error, attributes?: Record<string, any>) => {
        console.error('New Relic Error:', { error, attributes });
      }
    };
  }

  trackPerformance(entry: PerformanceEntryWithHeaders) {
    // Track successful requests
    if (!entry.error) {
      this.newrelic.addPageAction('resource_timing', {
        name: entry.name,
        type: entry.entryType,
        duration: entry.duration,
        startTime: entry.startTime,
        // Add response headers as attributes
        ...this.sanitizeHeaders(entry.responseHeaders),
        // Add custom attributes
        environment: 'production',
        service: 'web-app'
      });

      // Track response size if available
      const contentLength = entry.responseHeaders?.['content-length'];
      if (contentLength) {
        this.newrelic.setCustomAttribute(
          `response_size_${this.getResourceName(entry.name)}`,
          parseInt(contentLength, 10)
        );
      }
      return;
    }

    // Track errors
    this.newrelic.noticeError(new Error(entry.error), {
      url: entry.name,
      type: entry.entryType,
      duration: entry.duration,
      headers: this.sanitizeHeaders(entry.responseHeaders)
    });
  }

  private sanitizeHeaders(headers?: Record<string, string>): Record<string, string> {
    if (!headers) return {};
    
    // Remove sensitive headers
    const sensitiveHeaders = ['authorization', 'cookie', 'set-cookie'];
    return Object.entries(headers)
      .filter(([key]) => !sensitiveHeaders.includes(key.toLowerCase()))
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
  }

  private getResourceName(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.split('/').pop() || 'unknown';
    } catch {
      return 'unknown';
    }
  }
}

// Create New Relic integration
const newrelic = new NewRelicIntegration();

// Create performance monitor
const monitor = new PerformanceMonitor({
  resourceTiming: true,
  xhrTiming: true,
  fetchTiming: true,
  transform: (entry: PerformanceEntryWithHeaders) => {
    // Add New Relic specific fields
    return {
      ...entry,
      // Add transaction ID if available
      transactionId: (window as any).newrelic?.getBrowserTimingHeader()?.split('"')[1],
      // Add session ID
      sessionId: (window as any).newrelic?.getSessionId(),
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
    newrelic.trackPerformance(entry);
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