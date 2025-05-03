export interface PerformanceEntryWithHeaders {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
  responseHeaders: Record<string, string>;
  error?: string;
  timing?: {
    connectStart: number;
    connectEnd: number;
    domainLookupStart: number;
    domainLookupEnd: number;
    fetchStart: number;
    requestStart: number;
    responseStart: number;
    responseEnd: number;
    secureConnectionStart?: number;
    redirectStart?: number;
    redirectEnd?: number;
  } | null;
  request?: {
    method: string;
    type: string;
  };
  toJSON(): {
    name: string;
    entryType: string;
    startTime: number;
    duration: number;
    responseHeaders: Record<string, string>;
    error?: string;
    timing?: {
      connectStart: number;
      connectEnd: number;
      domainLookupStart: number;
      domainLookupEnd: number;
      fetchStart: number;
      requestStart: number;
      responseStart: number;
      responseEnd: number;
      secureConnectionStart?: number;
      redirectStart?: number;
      redirectEnd?: number;
    } | null;
    request?: {
      method: string;
      type: string;
    };
  };
}

export interface PerformanceObserverOptions {
  entryTypes: string[];
  buffered?: boolean;
}

export type TransformFunction = (entry: PerformanceEntryWithHeaders) => PerformanceEntryWithHeaders;

export type SubscriptionCallback = (entry: PerformanceEntryWithHeaders) => void;

export interface PerformanceMonitorConfig {
  transform?: TransformFunction;
  workerUrl: string;
}

export interface Subscription {
  unsubscribe: () => void;
} 