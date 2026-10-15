import { PerformanceMonitorConfig, PerformanceEntryWithHeaders, SubscriptionCallback, Subscription, TransformFunction } from './types';

export class PerformanceMonitor {
  private subscribers: Set<SubscriptionCallback> = new Set();
  private transform: TransformFunction | null = null;
  private disconnected = false;
  private readonly onMessage = (event: MessageEvent): void => {
    if (event.data.type === 'PERFORMANCE_ENTRY') {
      const entry = event.data.entry;
      if (entry) {
        this.notifySubscribers(entry);
      }
    }
  };

  constructor(config: PerformanceMonitorConfig) {
    if (!config.workerUrl) {
      throw new Error('workerUrl is required in PerformanceMonitor configuration');
    }
    this.transform = config.transform || null;
    this.registerServiceWorker(config.workerUrl);
  }

  private async registerServiceWorker(workerUrl: string): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register(workerUrl);
        // disconnect() can run while register() is pending (React StrictMode remounts)
        if (!this.disconnected) {
          navigator.serviceWorker.addEventListener('message', this.onMessage);
        }
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

  /** Terminal for this instance. Create a new monitor to start again. */
  public disconnect(): void {
    this.disconnected = true;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('message', this.onMessage);
    }
    this.subscribers.clear();
  }
}