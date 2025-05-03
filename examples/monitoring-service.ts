import { PerformanceMonitor } from 'perf-observer-js';
import type { PerformanceEntryWithHeaders } from 'perf-observer-js';

// Define the monitoring service interface
interface MonitoringService {
  track(entry: PerformanceEntryWithHeaders): void;
  getMetrics(): PerformanceMetrics;
  reset(): void;
}

interface PerformanceMetrics {
  totalRequests: number;
  failedRequests: number;
  averageDuration: number;
  slowRequests: number;
  requestsByType: Record<string, number>;
  requestsByStatus: Record<string, number>;
}

// Implementation of the monitoring service
class PerformanceMonitoringService implements MonitoringService {
  private metrics: PerformanceMetrics = {
    totalRequests: 0,
    failedRequests: 0,
    averageDuration: 0,
    slowRequests: 0,
    requestsByType: {},
    requestsByStatus: {}
  };

  private totalDuration: number = 0;
  private monitor: PerformanceMonitor;

  constructor() {
    // Create performance monitor instance
    this.monitor = new PerformanceMonitor({
      transform: (entry) => {
        // Add any custom transformations here
        return entry;
      }
    });

    // Subscribe to performance entries
    this.monitor.subscribe(this.handleEntry.bind(this));
  }

  private handleEntry(entry: PerformanceEntryWithHeaders): void {
    // Update metrics
    this.metrics.totalRequests++;
    this.totalDuration += entry.duration;
    this.metrics.averageDuration = this.totalDuration / this.metrics.totalRequests;

    // Track request types
    const requestType = entry.request?.type || 'unknown';
    this.metrics.requestsByType[requestType] = (this.metrics.requestsByType[requestType] || 0) + 1;

    // Track status codes
    const status = entry.responseHeaders['status'] || 'unknown';
    this.metrics.requestsByStatus[status] = (this.metrics.requestsByStatus[status] || 0) + 1;

    // Track failed requests
    if (status.startsWith('4') || status.startsWith('5')) {
      this.metrics.failedRequests++;
    }

    // Track slow requests (over 1 second)
    if (entry.duration > 1000) {
      this.metrics.slowRequests++;
    }

    // Log the entry
    console.log('Performance Entry:', {
      url: entry.name,
      duration: entry.duration,
      status,
      type: requestType
    });
  }

  public track(entry: PerformanceEntryWithHeaders): void {
    this.handleEntry(entry);
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public reset(): void {
    this.metrics = {
      totalRequests: 0,
      failedRequests: 0,
      averageDuration: 0,
      slowRequests: 0,
      requestsByType: {},
      requestsByStatus: {}
    };
    this.totalDuration = 0;
  }

  public disconnect(): void {
    this.monitor.disconnect();
  }
}

// Example usage
const monitoringService = new PerformanceMonitoringService();

// Example: Get metrics after some time
setInterval(() => {
  const metrics = monitoringService.getMetrics();
  console.log('Current Metrics:', metrics);
}, 5000);

// Example: Reset metrics
// monitoringService.reset();

// Example: Clean up
// monitoringService.disconnect(); 