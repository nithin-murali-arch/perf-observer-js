import { PerformanceMonitor } from '../src/PerformanceMonitor';
import { PerformanceEntryWithHeaders, TransformFunction } from '../src/types';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;
  let mockTransform: jest.Mock<PerformanceEntryWithHeaders, [PerformanceEntryWithHeaders]>;
  let mockSubscriber: jest.Mock<void, [PerformanceEntryWithHeaders]>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTransform = jest.fn((entry: PerformanceEntryWithHeaders) => entry);
    mockSubscriber = jest.fn();
    monitor = new PerformanceMonitor({
      resourceTiming: true,
      navigationTiming: true,
      xhrTiming: true,
      fetchTiming: true,
      transform: mockTransform
    });
  });

  afterEach(() => {
    if (monitor) {
      monitor.disconnect();
    }
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const defaultMonitor = new PerformanceMonitor();
      expect(defaultMonitor).toBeDefined();
    });

    it('should initialize with custom config', () => {
      const customMonitor = new PerformanceMonitor({
        resourceTiming: true,
        xhrTiming: true
      });
      expect(customMonitor).toBeDefined();
    });

    it('should initialize performance observers based on config', () => {
      const observerSpy = jest.spyOn(PerformanceObserver.prototype, 'observe');
      new PerformanceMonitor({
        resourceTiming: true,
        navigationTiming: true,
        xhrTiming: true,
        fetchTiming: true
      });

      expect(observerSpy).toHaveBeenCalledTimes(4);
    });

    it('should not initialize observers when config is false', () => {
      jest.clearAllMocks();
      const observerSpy = jest.spyOn(PerformanceObserver.prototype, 'observe');
      
      new PerformanceMonitor({
        resourceTiming: false,
        navigationTiming: false,
        xhrTiming: false,
        fetchTiming: false
      });

      expect(observerSpy).not.toHaveBeenCalled();
      observerSpy.mockRestore();
    });
  });

  describe('transform function', () => {
    it('should apply transform function to entries', () => {
      const entry: PerformanceEntryWithHeaders = {
        name: 'test',
        entryType: 'resource',
        startTime: 0,
        duration: 100,
        toJSON: () => ({})
      };

      monitor['processEntry'](entry);
      expect(mockTransform).toHaveBeenCalledWith(entry);
    });

    it('should emit transformed entries to subscribers', () => {
      const entry: PerformanceEntryWithHeaders = {
        name: 'test',
        entryType: 'resource',
        startTime: 0,
        duration: 100,
        toJSON: () => ({})
      };

      const transformedEntry: PerformanceEntryWithHeaders = {
        ...entry,
        name: 'transformed'
      };

      mockTransform.mockReturnValue(transformedEntry);
      monitor.subscribe(mockSubscriber);
      monitor['processEntry'](entry);

      expect(mockTransform).toHaveBeenCalledWith(entry);
      expect(mockSubscriber).toHaveBeenCalledWith(transformedEntry);
    });

    it('should handle transform function errors', () => {
      const errorTransform = jest.fn().mockImplementation(() => {
        throw new Error('Transform error');
      });

      const monitorWithError = new PerformanceMonitor({
        transform: errorTransform
      });

      const entry: PerformanceEntryWithHeaders = {
        name: 'test',
        entryType: 'resource',
        startTime: 0,
        duration: 100,
        toJSON: () => ({})
      };

      monitorWithError['processEntry'](entry);
      expect(console.error).toHaveBeenCalledWith('Error in transform function:', expect.any(Error));
    });

    it('should handle null transform result', () => {
      const nullTransform = jest.fn().mockReturnValue(null);
      const monitorWithNullTransform = new PerformanceMonitor({
        transform: nullTransform as any
      });

      const entry: PerformanceEntryWithHeaders = {
        name: 'test',
        entryType: 'resource',
        startTime: 0,
        duration: 100,
        toJSON: () => ({})
      };

      monitorWithNullTransform['processEntry'](entry);
      expect(nullTransform).toHaveBeenCalled();
    });
  });

  describe('subscription system', () => {
    it('should add and remove subscribers', () => {
      const entry: PerformanceEntryWithHeaders = {
        name: 'test',
        entryType: 'resource',
        startTime: 0,
        duration: 100,
        toJSON: () => ({})
      };

      const subscription = monitor.subscribe(mockSubscriber);
      monitor['processEntry'](entry);
      expect(mockSubscriber).toHaveBeenCalledWith(entry);

      mockSubscriber.mockClear();
      subscription.unsubscribe();
      monitor['processEntry'](entry);
      expect(mockSubscriber).not.toHaveBeenCalled();
    });

    it('should handle subscriber errors', () => {
      const errorSubscriber = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });

      const entry: PerformanceEntryWithHeaders = {
        name: 'test',
        entryType: 'resource',
        startTime: 0,
        duration: 100,
        toJSON: () => ({})
      };

      monitor.subscribe(errorSubscriber);
      monitor['processEntry'](entry);

      expect(errorSubscriber).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith('Error in subscriber callback:', expect.any(Error));
    });

    it('should handle multiple subscribers', () => {
      const subscriber1 = jest.fn();
      const subscriber2 = jest.fn();
      const entry: PerformanceEntryWithHeaders = {
        name: 'test',
        entryType: 'resource',
        startTime: 0,
        duration: 100,
        toJSON: () => ({})
      };

      monitor.subscribe(subscriber1);
      monitor.subscribe(subscriber2);
      monitor['processEntry'](entry);

      expect(subscriber1).toHaveBeenCalledWith(entry);
      expect(subscriber2).toHaveBeenCalledWith(entry);
    });

    it('should handle undefined subscriber', () => {
      expect(() => {
        monitor.subscribe(undefined as any);
      }).toThrow();
    });

    it('should handle duplicate subscribers', () => {
      monitor.subscribe(mockSubscriber);
      monitor.subscribe(mockSubscriber);

      const entry: PerformanceEntryWithHeaders = {
        name: 'test',
        entryType: 'resource',
        startTime: 0,
        duration: 100,
        toJSON: () => ({})
      };

      monitor['processEntry'](entry);
      expect(mockSubscriber).toHaveBeenCalledTimes(1);
    });
  });

  describe('disconnect', () => {
    it('should clear all subscribers', () => {
      const entry: PerformanceEntryWithHeaders = {
        name: 'test',
        entryType: 'resource',
        startTime: 0,
        duration: 100,
        toJSON: () => ({})
      };

      monitor.subscribe(mockSubscriber);
      monitor.disconnect();
      monitor['processEntry'](entry);

      expect(mockSubscriber).not.toHaveBeenCalled();
    });

    it('should handle multiple disconnects', () => {
      monitor.disconnect();
      monitor.disconnect(); // Should not throw
    });
  });

  describe('header handling', () => {
    it('should handle XHR response headers', () => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', 'http://test.com');
      xhr.setRequestHeader('Content-Type', 'application/json');
      
      const entry: PerformanceEntryWithHeaders = {
        name: 'http://test.com',
        entryType: 'resource',
        startTime: 0,
        duration: 100,
        toJSON: () => ({}),
        responseHeaders: {
          'content-type': 'application/json',
          'x-custom-header': 'test'
        }
      };

      monitor['processEntry'](entry);
      expect(mockTransform).toHaveBeenCalledWith(entry);
    });

    it('should handle fetch response headers', () => {
      const entry: PerformanceEntryWithHeaders = {
        name: 'http://test.com',
        entryType: 'resource',
        startTime: 0,
        duration: 100,
        toJSON: () => ({}),
        responseHeaders: {
          'content-type': 'application/json',
          'x-custom-header': 'test'
        }
      };

      monitor['processEntry'](entry);
      expect(mockTransform).toHaveBeenCalledWith(entry);
    });

    it('should handle missing headers', () => {
      const entry: PerformanceEntryWithHeaders = {
        name: 'http://test.com',
        entryType: 'resource',
        startTime: 0,
        duration: 100,
        toJSON: () => ({})
      };

      monitor['processEntry'](entry);
      expect(mockTransform).toHaveBeenCalledWith(entry);
    });
  });

  describe('error handling', () => {
    it('should handle invalid entries', () => {
      const invalidEntry = {
        name: undefined,
        entryType: null,
        startTime: 'invalid',
        duration: NaN
      } as unknown as PerformanceEntryWithHeaders;
      
      monitor['processEntry'](invalidEntry);
      expect(console.error).toHaveBeenCalledWith('Invalid performance entry:', expect.anything());
    });

    it('should handle missing toJSON method', () => {
      const invalidEntry = {
        name: 'test',
        entryType: 'resource',
        startTime: 0,
        duration: 100
      } as PerformanceEntryWithHeaders;

      monitor['processEntry'](invalidEntry);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle invalid entry types', () => {
      const invalidEntries = [
        null,
        undefined,
        42,
        'string',
        true,
        [],
        { random: 'object' }
      ];

      jest.clearAllMocks();
      
      invalidEntries.forEach(entry => {
        monitor['processEntry'](entry as any);
      });

      expect(console.error).toHaveBeenCalledTimes(invalidEntries.length);
      expect(console.error).toHaveBeenCalledWith('Invalid performance entry:', expect.anything());
    });
  });

  describe('XHR and Fetch interception', () => {
    it('should intercept XHR requests', () => {
      const xhr = new XMLHttpRequest();
      const openSpy = jest.spyOn(xhr, 'open');
      const sendSpy = jest.spyOn(xhr, 'send');

      xhr.open('GET', 'http://test.com');
      xhr.send();

      expect(openSpy).toHaveBeenCalled();
      expect(sendSpy).toHaveBeenCalled();
    });

    it('should intercept fetch requests', async () => {
      await fetch('http://test.com');
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle fetch errors', async () => {
      const mockFetchError = jest.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetchError;

      try {
        await fetch('http://test.com');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
}); 