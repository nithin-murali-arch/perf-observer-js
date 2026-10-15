import { PerformanceMonitorConfig, SubscriptionCallback, Subscription } from './types';
export declare class PerformanceMonitor {
    private subscribers;
    private transform;
    private disconnected;
    private readonly onMessage;
    constructor(config: PerformanceMonitorConfig);
    private registerServiceWorker;
    private notifySubscribers;
    subscribe(callback: SubscriptionCallback): Subscription;
    /** Terminal for this instance. Create a new monitor to start again. */
    disconnect(): void;
}
