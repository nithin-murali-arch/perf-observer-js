import { PerformanceMonitor, PerformanceEntryWithHeaders } from '../../src';

// Datadog RUM integration
class DatadogIntegration {
  private datadog: any;

  constructor() {
    // In a real app, Datadog RUM would be loaded via their script
    // This is a mock of the Datadog RUM API
    this.datadog = {
      addAction: (name: string, attributes: Record<string, any>) => {
        console.log('Datadog Action:', { name, attributes });
      },
      addError: (error: Error, attributes?: Record<string, any>) => {
        console.error('Datadog Error:', { error, attributes });
      },
      addTiming: (name: string, value: number) => {
        console.log('Datadog Timing:', { name, value });
      },
      addResource: (resource: Record<string, any>) => {
        console.log('Datadog Resource:', resource);
      }
    };
  }

  trackPerformance(entry: PerformanceEntryWithHeaders) {
    // Track successful requests
    if (!entry.error) {
      // Add resource timing
      this.datadog.addResource({
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

      // Add custom timing
      this.datadog.addTiming(
        `resource_${this.getResourceName(entry.name)}`,
        entry.duration
      );

      // Track response size if available
      const contentLength = entry.responseHeaders?.['content-length'];
      if (contentLength) {
        this.datadog.addAction('resource_size', {
          name: this.getResourceName(entry.name),
          size: parseInt(contentLength, 10)
        });
      }
      return;
    }

    // Track errors
    this.datadog.addError(new Error(entry.error), {
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

// Create Datadog integration
const datadog = new DatadogIntegration();

// Create performance monitor
const monitor = new PerformanceMonitor({
  resourceTiming: true,
  xhrTiming: true,
  fetchTiming: true,
  transform: (entry: PerformanceEntryWithHeaders) => {
    // Add Datadog specific fields
    return {
      ...entry,
      // Add session ID
      sessionId: (window as any).DD_RUM?.getSessionId(),
      // Add view ID
      viewId: (window as any).DD_RUM?.getViewId(),
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
    datadog.trackPerformance(entry);
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