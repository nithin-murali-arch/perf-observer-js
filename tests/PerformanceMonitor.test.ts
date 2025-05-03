import { PerformanceMonitor } from '../src/PerformanceMonitor';
import { PerformanceEntryWithHeaders } from '../src/types';
import { workerCode } from '../src/worker';

// Mock Service Worker
const mockServiceWorker = {
  register: jest.fn().mockResolvedValue({
    active: {
      postMessage: jest.fn()
    }
  }),
  addEventListener: jest.fn()
};

// Mock btoa
const mockBtoa = jest.fn().mockReturnValue('base64-encoded-string');
global.btoa = mockBtoa;

// Mock performance entries with enhanced data
const mockPerformanceEntry: PerformanceEntryWithHeaders = {
  name: 'https://example.com/resource',
  entryType: 'resource',
  startTime: 100,
  duration: 50,
  responseHeaders: {
    'content-type': 'application/json',
    'content-length': '1000'
  },
  timing: {
    connectStart: 100,
    connectEnd: 120,
    domainLookupStart: 90,
    domainLookupEnd: 95,
    fetchStart: 80,
    requestStart: 130,
    responseStart: 140,
    responseEnd: 150,
    secureConnectionStart: 110,
    redirectStart: 0,
    redirectEnd: 0
  },
  request: {
    method: 'GET',
    type: 'fetch'
  },
  toJSON: function() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      responseHeaders: this.responseHeaders,
      timing: this.timing,
      request: this.request
    };
  }
};

// Mock error performance entry
const mockErrorEntry: PerformanceEntryWithHeaders = {
  name: 'https://example.com/error',
  entryType: 'resource',
  startTime: 100,
  duration: 30,
  responseHeaders: {},
  error: 'Network error',
  timing: null,
  request: {
    method: 'GET',
    type: 'fetch'
  },
  toJSON: function() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      responseHeaders: this.responseHeaders,
      error: this.error,
      timing: this.timing,
      request: this.request
    };
  }
};

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;
  let mockTransform: jest.Mock<PerformanceEntryWithHeaders, [PerformanceEntryWithHeaders]>;
  let mockSubscriber: jest.Mock<void, [PerformanceEntryWithHeaders]>;
  let messageHandler: (event: MessageEvent) => void;
  const workerUrl = 'https://example.com/worker.js';

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock Service Worker
    Object.defineProperty(navigator, 'serviceWorker', {
      value: mockServiceWorker,
      writable: true
    });

    mockTransform = jest.fn((entry: PerformanceEntryWithHeaders) => entry);
    mockSubscriber = jest.fn();
    monitor = new PerformanceMonitor({
      workerUrl,
      transform: mockTransform
    });

    // Wait for service worker registration and get message handler
    await new Promise(resolve => setTimeout(resolve, 0));
    messageHandler = mockServiceWorker.addEventListener.mock.calls[0][1];
  });

  afterEach(() => {
    if (monitor) {
      monitor.disconnect();
    }
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw error when workerUrl is not provided', () => {
      expect(() => {
        new PerformanceMonitor({} as any);
      }).toThrow('workerUrl is required in PerformanceMonitor configuration');
    });

    it('should initialize with required config', () => {
      const monitor = new PerformanceMonitor({ workerUrl });
      expect(monitor).toBeDefined();
    });

    it('should register service worker with provided URL', async () => {
      expect(mockServiceWorker.register).toHaveBeenCalledWith(workerUrl);
    });

    it('should handle service worker registration failure', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockServiceWorker.register.mockRejectedValueOnce(new Error('Registration failed'));

      const monitor = new PerformanceMonitor({ workerUrl });
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(consoleError).toHaveBeenCalledWith(
        'Service Worker registration failed:',
        expect.any(Error)
      );
      consoleError.mockRestore();
    });
  });

  describe('service worker integration', () => {
    it('should process successful performance entries from service worker', async () => {
      const callback = jest.fn();
      monitor.subscribe(callback);

      // Simulate service worker message with successful request
      messageHandler({
        data: {
          type: 'PERFORMANCE_ENTRY',
          entry: mockPerformanceEntry
        }
      } as MessageEvent);

      expect(callback).toHaveBeenCalledWith(mockPerformanceEntry);
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        timing: expect.objectContaining({
          connectStart: expect.any(Number),
          connectEnd: expect.any(Number),
          domainLookupStart: expect.any(Number),
          domainLookupEnd: expect.any(Number)
        }),
        request: expect.objectContaining({
          method: expect.any(String),
          type: expect.any(String)
        })
      }));
    });

    it('should process failed performance entries from service worker', async () => {
      const callback = jest.fn();
      monitor.subscribe(callback);

      // Simulate service worker message with failed request
      messageHandler({
        data: {
          type: 'PERFORMANCE_ENTRY',
          entry: mockErrorEntry
        }
      } as MessageEvent);

      expect(callback).toHaveBeenCalledWith(mockErrorEntry);
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.any(String),
        timing: null,
        responseHeaders: expect.any(Object)
      }));
    });

    it('should apply transform to entries', async () => {
      const transformedEntry = {
        ...mockPerformanceEntry,
        transformed: true
      };

      const transform = jest.fn().mockReturnValue(transformedEntry);

      // Create a new monitor with the transform
      const monitor = new PerformanceMonitor({
        workerUrl,
        transform
      });

      // Wait for service worker registration and get message handler
      await new Promise(resolve => setTimeout(resolve, 0));
      const newMessageHandler = mockServiceWorker.addEventListener.mock.calls[1][1];

      const callback = jest.fn();
      monitor.subscribe(callback);

      // Simulate service worker message
      newMessageHandler({
        data: {
          type: 'PERFORMANCE_ENTRY',
          entry: mockPerformanceEntry
        }
      } as MessageEvent);

      expect(transform).toHaveBeenCalledWith(mockPerformanceEntry);
      expect(callback).toHaveBeenCalledWith(transformedEntry);
    });

    it('should handle transform errors gracefully', async () => {
      const error = new Error('Transform error');
      const transform = jest.fn().mockImplementation((entry) => {
        throw error;
      });

      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      const monitor = new PerformanceMonitor({ workerUrl, transform });
      const callback = jest.fn();
      monitor.subscribe(callback);

      // Wait for service worker registration and get message handler
      await new Promise(resolve => setTimeout(resolve, 0));
      const newMessageHandler = mockServiceWorker.addEventListener.mock.calls[1][1];

      // Simulate service worker message
      newMessageHandler({
        data: {
          type: 'PERFORMANCE_ENTRY',
          entry: mockPerformanceEntry
        }
      } as MessageEvent);

      expect(consoleError).toHaveBeenCalledWith(
        'Error processing performance entry:',
        error
      );
      expect(callback).not.toHaveBeenCalled();

      consoleError.mockRestore();
    });
  });

  describe('subscription', () => {
    it('should allow subscribing to performance entries', () => {
      const callback = jest.fn();
      const subscription = monitor.subscribe(callback);

      expect(subscription).toHaveProperty('unsubscribe');
      expect(typeof subscription.unsubscribe).toBe('function');
    });

    it('should allow unsubscribing from performance entries', async () => {
      const callback = jest.fn();
      const subscription = monitor.subscribe(callback);

      subscription.unsubscribe();

      // Simulate service worker message
      messageHandler({
        data: {
          type: 'PERFORMANCE_ENTRY',
          entry: mockPerformanceEntry
        }
      } as MessageEvent);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should throw error for invalid subscriber', () => {
      expect(() => {
        monitor.subscribe(undefined as any);
      }).toThrow('Subscriber callback must be a function');
    });
  });

  describe('disconnect', () => {
    it('should clear all subscribers', async () => {
      const callback = jest.fn();
      monitor.subscribe(callback);
      monitor.disconnect();

      // Simulate service worker message
      messageHandler({
        data: {
          type: 'PERFORMANCE_ENTRY',
          entry: mockPerformanceEntry
        }
      } as MessageEvent);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle multiple disconnects', () => {
      monitor.disconnect();
      monitor.disconnect(); // Should not throw
    });
  });
}); 