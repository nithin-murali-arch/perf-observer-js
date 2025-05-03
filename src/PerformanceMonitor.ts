import { PerformanceMonitorConfig, PerformanceEntryWithHeaders, SubscriptionCallback, Subscription, TransformFunction } from './types';

interface ExtendedXMLHttpRequest extends XMLHttpRequest {
  _url?: string;
  _method?: string;
}

export class PerformanceMonitor {
  private observer: PerformanceObserver | null = null;
  private subscribers: Set<SubscriptionCallback> = new Set();
  private transform: TransformFunction | null = null;
  private originalXHROpen: typeof XMLHttpRequest.prototype.open | null = null;
  private originalXHRSend: typeof XMLHttpRequest.prototype.send | null = null;
  private originalFetch: typeof window.fetch | null = null;

  constructor(config: PerformanceMonitorConfig = {}) {
    this.transform = config.transform || null;
    this.initializeObserver(config);
    if (config.xhrTiming) this.interceptXHR();
    if (config.fetchTiming) this.interceptFetch();
  }

  private initializeObserver(config: PerformanceMonitorConfig): void {
    const entryTypes: string[] = [];
    
    if (config.resourceTiming) entryTypes.push('resource');
    if (config.navigationTiming) entryTypes.push('navigation');

    if (entryTypes.length === 0) return;

    this.observer = new PerformanceObserver((list) => {
      const entries = list.getEntries() as PerformanceEntryWithHeaders[];
      entries.forEach(entry => this.processEntry(entry));
    });

    this.observer.observe({ entryTypes, buffered: true });
  }

  private processEntry(entry: PerformanceEntryWithHeaders): void {
    let processedEntry = { ...entry };
    
    // Apply transform function if exists
    if (this.transform) {
      processedEntry = this.transform(processedEntry);
    }

    // Emit the processed entry to all subscribers
    this.emitEntry(processedEntry);
  }

  private emitEntry(entry: PerformanceEntryWithHeaders): void {
    this.subscribers.forEach(callback => {
      try {
        callback(entry);
      } catch (error) {
        console.error('Error in performance entry subscriber:', error);
      }
    });
  }

  private interceptXHR(): void {
    const self = this;
    
    this.originalXHROpen = XMLHttpRequest.prototype.open;
    this.originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method: string, url: string | URL) {
      (this as ExtendedXMLHttpRequest)._url = url.toString();
      (this as ExtendedXMLHttpRequest)._method = method;
      return self.originalXHROpen!.apply(this, arguments as any);
    };

    XMLHttpRequest.prototype.send = function() {
      const startTime = performance.now();
      const xhr = this as ExtendedXMLHttpRequest;

      xhr.addEventListener('load', function() {
        const endTime = performance.now();
        const duration = endTime - startTime;

        const entry: PerformanceEntryWithHeaders = {
          name: xhr._url || '',
          entryType: 'resource',
          startTime,
          duration,
          responseHeaders: this.getAllResponseHeaders().split('\r\n').reduce((acc: Record<string, string>, line: string) => {
            const [key, value] = line.split(': ');
            if (key && value) acc[key] = value;
            return acc;
          }, {}),
          toJSON: function() {
            return {
              name: this.name,
              entryType: this.entryType,
              startTime: this.startTime,
              duration: this.duration,
              responseHeaders: this.responseHeaders
            };
          }
        } as PerformanceEntryWithHeaders;

        self.processEntry(entry);
      });

      return self.originalXHRSend!.apply(this, arguments as any);
    };
  }

  private interceptFetch(): void {
    const self = this;
    this.originalFetch = window.fetch;

    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
      const startTime = performance.now();
      const url = input instanceof Request ? input.url : input.toString();

      try {
        const response = await self.originalFetch!.apply(this, arguments as any);
        const endTime = performance.now();
        const duration = endTime - startTime;

        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        const entry: PerformanceEntryWithHeaders = {
          name: url,
          entryType: 'resource',
          startTime,
          duration,
          responseHeaders,
          toJSON: function() {
            return {
              name: this.name,
              entryType: this.entryType,
              startTime: this.startTime,
              duration: this.duration,
              responseHeaders: this.responseHeaders
            };
          }
        } as PerformanceEntryWithHeaders;

        self.processEntry(entry);
        return response;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        const entry: PerformanceEntryWithHeaders = {
          name: url,
          entryType: 'resource',
          startTime,
          duration,
          error: error instanceof Error ? error.message : String(error),
          toJSON: function() {
            return {
              name: this.name,
              entryType: this.entryType,
              startTime: this.startTime,
              duration: this.duration,
              error: (this as any).error
            };
          }
        } as PerformanceEntryWithHeaders;

        self.processEntry(entry);
        throw error;
      }
    };
  }

  public subscribe(callback: SubscriptionCallback): Subscription {
    this.subscribers.add(callback);
    return {
      unsubscribe: () => {
        this.subscribers.delete(callback);
      }
    };
  }

  public disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
    }

    // Restore original XHR methods
    if (this.originalXHROpen) {
      XMLHttpRequest.prototype.open = this.originalXHROpen;
      XMLHttpRequest.prototype.send = this.originalXHRSend!;
    }

    // Restore original fetch
    if (this.originalFetch) {
      window.fetch = this.originalFetch;
    }

    // Clear all subscribers
    this.subscribers.clear();
  }
} 