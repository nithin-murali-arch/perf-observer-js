import { PerformanceMonitorConfig, SubscriptionCallback, Subscription } from './types';
export declare class PerformanceMonitor {
    private subscribers;
    private transform;
    private worker;
    constructor(config: PerformanceMonitorConfig);
    private registerServiceWorker;
    private notifySubscribers;
    subscribe(callback: SubscriptionCallback): Subscription;
    disconnect(): void;
}
