import { PerformanceMonitor } from 'perf-observer-js';
import type { PerformanceEntryWithHeaders } from 'perf-observer-js';

// Generic RUM integration interface
interface RUMIntegration {
  track(entry: PerformanceEntryWithHeaders): void;
  getMetrics(): RUMetrics;
  reset(): void;
}

interface RUMetrics {
  pageLoads: number;
  resourceCount: number;
  averageLoadTime: number;
  slowResources: number;
  errors: number;
  resourceTypes: Record<string, number>;
}

// Generic RUM integration implementation
class GenericRUMIntegration implements RUMIntegration {
  private metrics: RUMetrics = {
    pageLoads: 0,
    resourceCount: 0,
    averageLoadTime: 0,
    slowResources: 0,
    errors: 0,
    resourceTypes: {}
  };

  private totalLoadTime: number = 0;
  private monitor: PerformanceMonitor;

  constructor() {
    // Create performance monitor instance
    this.monitor = new PerformanceMonitor({
      transform: (entry) => {
        // Add RUM-specific fields
        return {
          ...entry,
          rum: {
            timestamp: Date.now(),
            pageUrl: window.location.href,
            userAgent: navigator.userAgent
          }
        };
      }
    });

    // Subscribe to performance entries
    this.monitor.subscribe(this.handleEntry.bind(this));
  }

  private handleEntry(entry: PerformanceEntryWithHeaders): void {
    // Update metrics
    this.metrics.resourceCount++;
    this.totalLoadTime += entry.duration;
    this.metrics.averageLoadTime = this.totalLoadTime / this.metrics.resourceCount;

    // Track resource types
    const resourceType = this.getResourceType(entry.name);
    this.metrics.resourceTypes[resourceType] = (this.metrics.resourceTypes[resourceType] || 0) + 1;

    // Track slow resources (over 1 second)
    if (entry.duration > 1000) {
      this.metrics.slowResources++;
    }

    // Track errors
    const status = entry.responseHeaders['status'];
    if (status && (status.startsWith('4') || status.startsWith('5'))) {
      this.metrics.errors++;
    }

    // Log the entry
    console.log('RUM Entry:', {
      url: entry.name,
      type: resourceType,
      duration: entry.duration,
      status,
      rum: (entry as any).rum
    });
  }

  private getResourceType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'js':
        return 'script';
      case 'css':
        return 'style';
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return 'image';
      case 'woff':
      case 'woff2':
      case 'ttf':
      case 'eot':
        return 'font';
      default:
        return 'other';
    }
  }

  public track(entry: PerformanceEntryWithHeaders): void {
    this.handleEntry(entry);
  }

  public getMetrics(): RUMetrics {
    return { ...this.metrics };
  }

  public reset(): void {
    this.metrics = {
      pageLoads: 0,
      resourceCount: 0,
      averageLoadTime: 0,
      slowResources: 0,
      errors: 0,
      resourceTypes: {}
    };
    this.totalLoadTime = 0;
  }

  public disconnect(): void {
    this.monitor.disconnect();
  }
}

// Example usage
const rumIntegration = new GenericRUMIntegration();

// Example: Get metrics after some time
setInterval(() => {
  const metrics = rumIntegration.getMetrics();
  console.log('RUM Metrics:', metrics);
}, 5000);

// Example: Reset metrics
// rumIntegration.reset();

// Example: Clean up
// rumIntegration.disconnect(); 