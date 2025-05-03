// Enable fake timers
jest.useFakeTimers();

// Create proper event objects
class ExtendableEvent {
  constructor(type) {
    this.type = type;
    this._promises = [];
  }

  waitUntil(promise) {
    this._promises.push(promise);
  }
}

class FetchEvent extends ExtendableEvent {
  constructor(type, init) {
    super(type);
    this.request = init.request;
    this._response = null;
  }

  respondWith(response) {
    this._response = response;
  }
}

// Mock Headers class
class Headers {
  constructor(init = {}) {
    this._headers = new Map(Object.entries(init));
  }

  forEach(callback) {
    this._headers.forEach((value, key) => callback(value, key));
  }
}

// Mock Response class
class Response {
  constructor(body = '', init = {}) {
    this.body = body;
    this.headers = new Headers(init.headers);
  }

  clone() {
    return new Response(this.body, { headers: this.headers });
  }
}

// Mock service worker functions
const mockSkipWaiting = jest.fn().mockResolvedValue(undefined);
const mockClaim = jest.fn().mockResolvedValue(undefined);
const mockPostMessage = jest.fn();
const mockMatchAll = jest.fn().mockResolvedValue([{ postMessage: mockPostMessage }]);
const mockFetch = jest.fn().mockResolvedValue(
  new Response('', {
    headers: {
      'content-type': 'application/json',
      'content-length': '1000'
    }
  })
);

// Mock service worker environment
global.self = {
  addEventListener: jest.fn(),
  skipWaiting: mockSkipWaiting,
  clients: {
    claim: mockClaim,
    matchAll: mockMatchAll
  },
  performance: {
    now: jest.fn().mockReturnValue(1000),
    getEntriesByName: jest.fn().mockReturnValue([{
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
      redirectEnd: 0,
      startTime: 80,
      duration: 70,
      requestMethod: 'GET',
      initiatorType: 'fetch'
    }])
  }
};

// Mock fetch
global.fetch = mockFetch;

// Import service worker code
require('../public/performance-worker.js');

// Import the functions we want to test
const { createPerformanceEntry, sendPerformanceData } = require('../public/performance-worker.js');

describe('Performance Worker Functions', () => {
  let mockPerformanceNow;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock performance.now()
    mockPerformanceNow = jest.fn().mockReturnValue(1000);
    global.performance = {
      now: mockPerformanceNow
    };
  });

  describe('createPerformanceEntry', () => {
    it('should create a performance entry for a successful API request', () => {
      const url = 'https://api.example.com/data';
      const response = new Response('', {
        headers: {
          'content-type': 'application/json',
          'content-length': '2048',
          'cache-control': 'no-cache',
          'x-request-id': '123456'
        }
      });
      const timing = {
        startTime: 1000,
        duration: 150,
        connectStart: 1020,
        connectEnd: 1040,
        domainLookupStart: 1010,
        domainLookupEnd: 1015,
        fetchStart: 1000,
        requestStart: 1050,
        responseStart: 1100,
        responseEnd: 1150,
        secureConnectionStart: 1030,
        redirectStart: 0,
        redirectEnd: 0,
        requestMethod: 'POST',
        initiatorType: 'fetch'
      };

      const entry = createPerformanceEntry(url, response, timing);

      expect(entry).toEqual({
        name: url,
        entryType: 'resource',
        startTime: timing.startTime,
        duration: timing.duration,
        responseHeaders: {
          'content-type': 'application/json',
          'content-length': '2048',
          'cache-control': 'no-cache',
          'x-request-id': '123456'
        },
        timing: {
          connectStart: timing.connectStart,
          connectEnd: timing.connectEnd,
          domainLookupStart: timing.domainLookupStart,
          domainLookupEnd: timing.domainLookupEnd,
          fetchStart: timing.fetchStart,
          requestStart: timing.requestStart,
          responseStart: timing.responseStart,
          responseEnd: timing.responseEnd,
          secureConnectionStart: timing.secureConnectionStart,
          redirectStart: timing.redirectStart,
          redirectEnd: timing.redirectEnd
        },
        request: {
          method: timing.requestMethod,
          type: timing.initiatorType
        }
      });
    });

    it('should create a performance entry for a failed request', () => {
      const url = 'https://api.example.com/error';
      const response = new Response('', {
        headers: {
          'content-type': 'application/json'
        }
      });

      const entry = createPerformanceEntry(url, response, null);

      expect(entry).toEqual({
        name: url,
        entryType: 'resource',
        startTime: 1000, // From mockPerformanceNow
        duration: 0,
        responseHeaders: {
          'content-type': 'application/json'
        },
        timing: null,
        request: {
          method: 'GET',
          type: 'fetch'
        }
      });
    });

    it('should create a performance entry for a cached response', () => {
      const url = 'https://api.example.com/cached';
      const response = new Response('', {
        headers: {
          'content-type': 'application/json',
          'content-length': '1024',
          'cache-control': 'max-age=3600',
          'etag': 'W/"123456"'
        }
      });
      const timing = {
        startTime: 1000,
        duration: 50, // Fast because it's cached
        connectStart: 1000,
        connectEnd: 1010,
        domainLookupStart: 1000,
        domainLookupEnd: 1005,
        fetchStart: 1000,
        requestStart: 1015,
        responseStart: 1040,
        responseEnd: 1050,
        secureConnectionStart: 1005,
        redirectStart: 0,
        redirectEnd: 0,
        requestMethod: 'GET',
        initiatorType: 'fetch'
      };

      const entry = createPerformanceEntry(url, response, timing);

      expect(entry).toEqual({
        name: url,
        entryType: 'resource',
        startTime: timing.startTime,
        duration: timing.duration,
        responseHeaders: {
          'content-type': 'application/json',
          'content-length': '1024',
          'cache-control': 'max-age=3600',
          'etag': 'W/"123456"'
        },
        timing: {
          connectStart: timing.connectStart,
          connectEnd: timing.connectEnd,
          domainLookupStart: timing.domainLookupStart,
          domainLookupEnd: timing.domainLookupEnd,
          fetchStart: timing.fetchStart,
          requestStart: timing.requestStart,
          responseStart: timing.responseStart,
          responseEnd: timing.responseEnd,
          secureConnectionStart: timing.secureConnectionStart,
          redirectStart: timing.redirectStart,
          redirectEnd: timing.redirectEnd
        },
        request: {
          method: timing.requestMethod,
          type: timing.initiatorType
        }
      });
    });
  });

  describe('sendPerformanceData', () => {
    it('should send performance data to a client', () => {
      const mockPostMessage = jest.fn();
      const client = { postMessage: mockPostMessage };
      const entry = {
        name: 'https://api.example.com/data',
        entryType: 'resource',
        startTime: 1000,
        duration: 150,
        responseHeaders: {
          'content-type': 'application/json',
          'content-length': '2048'
        },
        timing: {
          connectStart: 1020,
          connectEnd: 1040,
          domainLookupStart: 1010,
          domainLookupEnd: 1015,
          fetchStart: 1000,
          requestStart: 1050,
          responseStart: 1100,
          responseEnd: 1150,
          secureConnectionStart: 1030,
          redirectStart: 0,
          redirectEnd: 0
        },
        request: {
          method: 'POST',
          type: 'fetch'
        }
      };

      sendPerformanceData(client, entry);

      expect(mockPostMessage).toHaveBeenCalledWith({
        type: 'PERFORMANCE_ENTRY',
        data: entry
      });
      expect(mockPostMessage).toHaveBeenCalledTimes(1);
    });
  });
}); 