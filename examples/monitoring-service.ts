import { PerformanceMonitor, PerformanceEntryWithHeaders } from '../src';

// Mock monitoring service
class MonitoringService {
  private metrics: any[] = [];
  private errors: any[] = [];

  trackMetric(metric: any) {
    this.metrics.push(metric);
    console.log('Metric tracked:', metric);
  }

  trackError(error: any) {
    this.errors.push(error);
    console.error('Error tracked:', error);
  }

  getMetrics() {
    return this.metrics;
  }

  getErrors() {
    return this.errors;
  }
}

// Create monitoring service instance
const monitoringService = new MonitoringService();

// Create performance monitor with monitoring service integration
const monitor = new PerformanceMonitor({
  resourceTiming: true,
  xhrTiming: true,
  fetchTiming: true,
  transform: (entry: PerformanceEntryWithHeaders) => {
    // Add monitoring-specific fields
    return {
      ...entry,
      // Add service name
      service: 'web-app',
      // Add environment
      environment: 'production',
      // Add timestamp
      timestamp: Date.now(),
      // Add custom metrics
      metrics: {
        duration: entry.duration,
        startTime: entry.startTime,
        endTime: entry.startTime + entry.duration
      }
    };
  }
});

// Subscribe to performance entries
const subscription = monitor.subscribe((entry) => {
  try {
    const transformedEntry = entry as any;

    // Track successful requests
    if (!entry.error) {
      monitoringService.trackMetric({
        name: 'request.duration',
        value: entry.duration,
        tags: {
          url: entry.name,
          type: entry.entryType,
          service: transformedEntry.service,
          environment: transformedEntry.environment
        },
        timestamp: transformedEntry.timestamp
      });

      // Track response size if available
      const contentLength = entry.responseHeaders?.['content-length'];
      if (contentLength) {
        monitoringService.trackMetric({
          name: 'response.size',
          value: parseInt(contentLength, 10),
          tags: {
            url: entry.name,
            type: entry.entryType,
            service: transformedEntry.service,
            environment: transformedEntry.environment
          },
          timestamp: transformedEntry.timestamp
        });
      }
      return;
    }

    // Track errors
    monitoringService.trackError({
      name: 'request.error',
      message: entry.error,
      tags: {
        url: entry.name,
        type: entry.entryType,
        service: transformedEntry.service,
        environment: transformedEntry.environment
      },
      timestamp: transformedEntry.timestamp,
      duration: entry.duration
    });
  } catch (error) {
    console.error('Error processing performance entry:', error);
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
  // Log collected metrics and errors
  console.log('Collected metrics:', monitoringService.getMetrics());
  console.log('Collected errors:', monitoringService.getErrors());

  // Clean up
  subscription.unsubscribe();
  monitor.disconnect();
}, 5000); 