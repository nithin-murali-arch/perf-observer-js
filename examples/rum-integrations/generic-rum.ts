import { PerformanceMonitor, PerformanceEntryWithHeaders } from '../../src';

// Generic RUM integration that can be adapted for any monitoring service
class GenericRUMIntegration {
  private config: {
    service: string;
    environment: string;
    version: string;
    endpoint: string;
    apiKey?: string;
  };

  constructor(config: {
    service: string;
    environment: string;
    version: string;
    endpoint: string;
    apiKey?: string;
  }) {
    this.config = config;
  }

  async trackPerformance(entry: PerformanceEntryWithHeaders) {
    try {
      const payload = this.createPayload(entry);
      await this.sendToRUM(payload);
    } catch (error) {
      console.error('Error sending to RUM:', error);
    }
  }

  private createPayload(entry: PerformanceEntryWithHeaders) {
    const basePayload = {
      // Common fields
      service: this.config.service,
      environment: this.config.environment,
      version: this.config.version,
      timestamp: Date.now(),
      
      // Resource information
      resource: {
        name: entry.name,
        type: entry.entryType,
        duration: entry.duration,
        startTime: entry.startTime,
        // Add response headers (sanitized)
        headers: this.sanitizeHeaders(entry.responseHeaders)
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

  private async sendToRUM(payload: any) {
    // In a real implementation, this would send data to your RUM service
    // This is a mock implementation
    console.log('Sending to RUM:', {
      endpoint: this.config.endpoint,
      payload
    });

    // Example of how you might send to a real RUM service
    // await fetch(this.config.endpoint, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${this.config.apiKey}`
    //   },
    //   body: JSON.stringify(payload)
    // });
  }

  private sanitizeHeaders(headers?: Record<string, string>): Record<string, string> {
    if (!headers) return {};
    
    // Remove sensitive headers
    const sensitiveHeaders = ['authorization', 'cookie', 'set-cookie'];
    return Object.entries(headers)
      .filter(([key]) => !sensitiveHeaders.includes(key.toLowerCase()))
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
  }
}

// Create RUM integration
const rum = new GenericRUMIntegration({
  service: 'web-app',
  environment: 'production',
  version: '1.0.0',
  endpoint: 'https://rum.example.com/collect',
  apiKey: 'your-api-key'
});

// Create performance monitor
const monitor = new PerformanceMonitor({
  resourceTiming: true,
  xhrTiming: true,
  fetchTiming: true,
  transform: (entry: PerformanceEntryWithHeaders) => {
    // Add custom fields
    return {
      ...entry,
      // Add session ID
      sessionId: crypto.randomUUID(),
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
  // Send to RUM service
  rum.trackPerformance(entry);
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