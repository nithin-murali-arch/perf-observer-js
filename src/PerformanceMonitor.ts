import { PerformanceMonitorConfig, PerformanceEntryWithHeaders, SubscriptionCallback, Subscription, TransformFunction } from './types';

export class PerformanceMonitor {
  private subscribers: Set<SubscriptionCallback> = new Set();
  private transform: TransformFunction | null = null;

  constructor(config: PerformanceMonitorConfig = {}) {
    this.transform = config.transform || null;
    this.registerServiceWorker();
  }

  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/performance-worker.js');
        console.log('Service Worker registered:', registration);

        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data.type === 'PERFORMANCE_ENTRY') {
            const entry = event.data.data;
            this.notifySubscribers(entry);
          }
        });
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
    this.subscribers.clear();
  }
} 