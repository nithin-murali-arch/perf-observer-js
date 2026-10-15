import { PerformanceMonitor } from 'perf-observer-js';
import type { PerformanceEntryWithHeaders } from 'perf-observer-js';

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
    this.monitor = new PerformanceMonitor({
      workerUrl: '/worker.js',
    });

    this.monitor.subscribe(this.handleEntry.bind(this));
  }

  private handleEntry(entry: PerformanceEntryWithHeaders): void {
    this.metrics.totalRequests++;
    this.totalDuration += entry.duration;
    this.metrics.averageDuration = this.totalDuration / this.metrics.totalRequests;

    const requestType = entry.request?.type || 'unknown';
    this.metrics.requestsByType[requestType] = (this.metrics.requestsByType[requestType] || 0) + 1;

    const status = String(entry.status);
    this.metrics.requestsByStatus[status] = (this.metrics.requestsByStatus[status] || 0) + 1;

    if (entry.error || entry.status >= 400) {
      this.metrics.failedRequests++;
    }

    if (entry.duration > 1000) {
      this.metrics.slowRequests++;
    }

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

const monitoringService = new PerformanceMonitoringService();

setInterval(() => {
  const metrics = monitoringService.getMetrics();
  console.log('Current Metrics:', metrics);
}, 5000);

// monitoringService.reset();

// monitoringService.disconnect();
