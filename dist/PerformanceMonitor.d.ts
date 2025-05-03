import { PerformanceMonitorConfig, SubscriptionCallback, Subscription } from './types';
export declare class PerformanceMonitor {
    private observer;
    private subscribers;
    private transform;
    private originalXHROpen;
    private originalXHRSend;
    private originalFetch;
    constructor(config?: PerformanceMonitorConfig);
    private initializeObserver;
    private processEntry;
    private isValidEntry;
    private emitEntry;
    private interceptXHR;
    private interceptFetch;
    subscribe(callback: SubscriptionCallback): Subscription;
    disconnect(): void;
}
