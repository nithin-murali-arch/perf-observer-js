import { PerformanceMonitorConfig, PerformanceEntryWithHeaders, SubscriptionCallback, Subscription, TransformFunction } from './types';
import { workerCode } from './worker';

export class PerformanceMonitor {
  private subscribers: Set<SubscriptionCallback> = new Set();
  private transform: TransformFunction | null = null;
  private worker: ServiceWorker | null = null;

  constructor(config: PerformanceMonitorConfig = {}) {
    this.transform = config.transform || null;
    this.registerServiceWorker();
  }

  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        // Create a blob URL for the service worker
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);

        // Register the service worker
        const registration = await navigator.serviceWorker.register(workerUrl);
        this.worker = registration.active;

        // Set up message listener
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data.type === 'PERFORMANCE_ENTRY') {
            const entry = event.data.entry;
            this.notifySubscribers(entry);
          }
        });

        // Clean up the blob URL
        URL.revokeObjectURL(workerUrl);
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  private notifySubscribers(entry: PerformanceEntryWithHeaders): void {
    try {
      const processedEntry = this.transform ? this.transform(entry) : entry;
      this.subscribers.forEach(callback => callback(processedEntry));
    } catch (error) {
      console.error('Error processing performance entry:', error);
    }
  }

  public subscribe(callback: SubscriptionCallback): Subscription {
    if (!callback || typeof callback !== 'function') {
      throw new Error('Subscriber callback must be a function');
    }
    this.subscribers.add(callback);
    return {
      unsubscribe: () => this.subscribers.delete(callback)
    };
  }

  public disconnect(): void {
    if (this.worker) {
      this.worker.postMessage({ type: 'DISCONNECT' });
    }
    this.subscribers.clear();
  }
} 