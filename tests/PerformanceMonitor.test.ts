import { PerformanceMonitor } from '../src/PerformanceMonitor';
import { PerformanceEntryWithHeaders, TransformFunction } from '../src/types';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;
  let mockTransform: jest.Mock<PerformanceEntryWithHeaders, [PerformanceEntryWithHeaders]>;
  let mockSubscriber: jest.Mock<void, [PerformanceEntryWithHeaders]>;

  beforeEach(() => {
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
    monitor.disconnect();
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
      expect(mockSubscriber).not.toHaveBeenCalled();
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

      // Should not throw, but should log error
      expect(errorSubscriber).toHaveBeenCalled();
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
  });

  describe('header handling', () => {
    it('should handle XHR response headers', () => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', 'http://test.com');
      xhr.setRequestHeader('Content-Type', 'application/json');
      
      // Mock getAllResponseHeaders
      xhr.getAllResponseHeaders = jest.fn().mockReturnValue(
        'content-type: application/json\n' +
        'x-custom-header: test'
      );

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
  });
}); 