// Mock PerformanceObserver
class MockPerformanceObserver {
  private callback: PerformanceObserverCallback;
  private isObserving: boolean = false;

  constructor(callback: PerformanceObserverCallback) {
    this.callback = callback;
  }

  observe(options: { entryTypes: string[], buffered?: boolean }) {
    this.isObserving = true;
    // Simulate an initial callback with empty entries
    const mockEntryList = {
      getEntries: () => [],
      getEntriesByName: () => [],
      getEntriesByType: () => []
    } as PerformanceObserverEntryList;
    
    this.callback(mockEntryList, this);
  }

  disconnect() {
    this.isObserving = false;
  }

  takeRecords() {
    return [];
  }

  static supportedEntryTypes = ['resource', 'navigation', 'longtask', 'paint', 'mark', 'measure'];
}

// Mock PerformanceEntry
class MockPerformanceEntry implements PerformanceEntry {
  constructor(
    public name: string,
    public entryType: string,
    public startTime: number,
    public duration: number
  ) {}

  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration
    };
  }
}

// Mock XMLHttpRequest
class MockXMLHttpRequest {
  private headers: { [key: string]: string } = {};
  private listeners: { [key: string]: Function[] } = {};

  open(method: string, url: string) {}
  
  send() {
    // Simulate a successful load event
    setTimeout(() => {
      this.dispatchEvent('load');
    }, 0);
  }
  
  addEventListener(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  dispatchEvent(event: string) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback.call(this));
    }
  }

  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
  }

  getAllResponseHeaders() {
    return Object.entries(this.headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\r\n');
  }
}

// Mock fetch
const mockFetch = jest.fn().mockImplementation(() => 
  Promise.resolve({
    headers: new Map([
      ['content-type', 'application/json'],
      ['x-custom-header', 'test']
    ])
  })
);

// Mock performance
const mockPerformance = {
  now: () => Date.now(),
  timeOrigin: Date.now(),
  timing: {},
  navigation: {},
  eventCounts: {
    size: 0
  },
  getEntries: () => [],
  getEntriesByName: () => [],
  getEntriesByType: () => [],
  mark: () => {},
  measure: () => {},
  clearMarks: () => {},
  clearMeasures: () => {},
  clearResourceTimings: () => {},
  setResourceTimingBufferSize: () => {},
  onresourcetimingbufferfull: null,
  toJSON: () => ({}),
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true
} as unknown as Performance;

// Mock window
const mockWindow = {
  PerformanceObserver: MockPerformanceObserver,
  XMLHttpRequest: MockXMLHttpRequest,
  fetch: mockFetch,
  location: {
    href: 'https://example.com'
  },
  navigator: {
    userAgent: 'test-agent',
    language: 'en-US',
    platform: 'test-platform'
  },
  document: {
    referrer: 'https://referrer.com'
  },
  performance: mockPerformance
};

// Mock crypto
const mockCrypto = {
  randomUUID: () => 'test-uuid'
};

// Setup global mocks
global.PerformanceObserver = MockPerformanceObserver as any;
global.PerformanceEntry = MockPerformanceEntry as any;
global.XMLHttpRequest = MockXMLHttpRequest as any;
global.fetch = mockFetch as any;
global.window = mockWindow as any;
global.crypto = mockCrypto as any;
global.performance = mockPerformance;

// Mock console methods
global.console = {
  ...console,
  error: jest.fn(),
  log: jest.fn(),
  warn: jest.fn()
}; 