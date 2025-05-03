export interface PerformanceEntryWithHeaders extends PerformanceEntry {
    headers?: Record<string, string>;
    responseHeaders?: Record<string, string>;
    error?: string;
}
export interface PerformanceObserverOptions {
    entryTypes: string[];
    buffered?: boolean;
}
export type TransformFunction = (entry: PerformanceEntryWithHeaders) => PerformanceEntryWithHeaders;
export type SubscriptionCallback = (entry: PerformanceEntryWithHeaders) => void;
export interface PerformanceMonitorConfig {
    resourceTiming?: boolean;
    navigationTiming?: boolean;
    xhrTiming?: boolean;
    fetchTiming?: boolean;
    transform?: TransformFunction;
}
export interface Subscription {
    unsubscribe: () => void;
}
