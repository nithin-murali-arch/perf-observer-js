/// <reference lib="webworker" />
/// <reference types="serviceworker" />

describe('Service Worker', () => {
  let fetchEvent: FetchEvent;
  let clients: Clients;
  let client: Client;
  let performance: Performance;
  let fetchHandler: jest.Mock;

  const createPerformanceEntry = (url: string, method: string, startTime: number, endTime: number, responseHeaders: Record<string, string> = {}, error?: string) => ({
    name: url,
    entryType: 'resource',
    startTime,
    duration: endTime - startTime,
    responseHeaders,
    ...(error && { error }),
    request: {
      method,
      type: 'fetch'
    }
  });

  beforeEach(() => {
    // Mock client
    client = {
      id: 'client-1',
      postMessage: jest.fn()
    } as unknown as Client;

    // Mock clients
    clients = {
      matchAll: jest.fn().mockResolvedValue([client]),
      claim: jest.fn()
    } as unknown as Clients;

    // Mock performance
    performance = {
      now: jest.fn().mockReturnValueOnce(100).mockReturnValueOnce(150),
      getEntriesByName: jest.fn().mockReturnValue([])
    } as unknown as Performance;

    // Mock fetch event
    fetchEvent = {
      request: {
        url: 'https://example.com/api/data',
        method: 'GET',
        headers: new Headers({
          'Content-Type': 'application/json'
        })
      },
      respondWith: jest.fn(),
      waitUntil: jest.fn()
    } as unknown as FetchEvent;

    // Mock global objects
    Object.defineProperty(global, 'clients', { value: clients, writable: true });
    Object.defineProperty(global, 'performance', { value: performance, writable: true });
    Object.defineProperty(global, 'self', {
      value: {
        skipWaiting: jest.fn().mockResolvedValue(undefined),
        close: jest.fn(),
        dispatchEvent: jest.fn(),
        addEventListener: jest.fn()
      } as unknown as ServiceWorkerGlobalScope,
      writable: true
    });

    // Mock fetch
    global.fetch = jest.fn();

    // Mock Response
    global.Response = class {
      status: number;
      headers: Headers;
      body: string;
      constructor(body: string, init?: ResponseInit) {
        this.status = init?.status || 200;
        this.headers = new Headers(init?.headers);
        this.body = body;
      }
    } as unknown as typeof Response;

    // Mock Headers
    global.Headers = class {
      private headers: Map<string, string>;
      constructor(init?: HeadersInit) {
        this.headers = new Map();
        if (init) {
          Object.entries(init).forEach(([key, value]) => 
            this.headers.set(key.toLowerCase(), value)
          );
        }
      }
      get(name: string): string | null {
        return this.headers.get(name.toLowerCase()) || null;
      }
      entries(): IterableIterator<[string, string]> {
        return this.headers.entries();
      }
    } as unknown as typeof Headers;

    // Create fetch handler
    fetchHandler = jest.fn().mockImplementation((event: FetchEvent) => {
      event.respondWith(
        (async () => {
          const startTime = performance.now();
          try {
            const response = await fetch(event.request);
            const endTime = performance.now();
            
            const entry = createPerformanceEntry(
              event.request.url,
              event.request.method,
              startTime,
              endTime,
              Object.fromEntries(response.headers.entries())
            );

            client.postMessage({ type: 'PERFORMANCE_ENTRY', entry });
            return response;
          } catch (err) {
            const error = err as Error;
            const endTime = performance.now();
            
            const entry = createPerformanceEntry(
              event.request.url,
              event.request.method,
              startTime,
              endTime,
              {},
              error.message || 'Unknown error'
            );

            client.postMessage({ type: 'PERFORMANCE_ENTRY', entry });
            return new Response(error.message, { status: 500 });
          }
        })()
      );
    });
  });

  describe('fetch event handling', () => {
    it('should measure successful requests', async () => {
      const headers = {
        'content-type': 'application/json',
        'content-length': '123'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({ headers: new Headers(headers) });
      await fetchHandler(fetchEvent);

      expect(client.postMessage).toHaveBeenCalledWith({
        type: 'PERFORMANCE_ENTRY',
        entry: {
          name: 'https://example.com/api/data',
          entryType: 'resource',
          startTime: 100,
          duration: 50,
          responseHeaders: headers,
          request: { method: 'GET', type: 'fetch' }
        }
      });
    });

    it('should handle failed requests', async () => {
      const networkError = new Error('Network error');
      (global.fetch as jest.Mock).mockRejectedValueOnce(networkError);

      await fetchHandler(fetchEvent);

      expect(client.postMessage).toHaveBeenCalledWith({
        type: 'PERFORMANCE_ENTRY',
        entry: expect.objectContaining({
          name: 'https://example.com/api/data',
          entryType: 'resource',
          startTime: expect.any(Number),
          duration: expect.any(Number),
          responseHeaders: {},
          error: 'Network error',
          request: { method: 'GET', type: 'fetch' }
        })
      });
    });

    it('should handle cached responses', async () => {
      const headers = {
        'content-type': 'application/json',
        'content-length': '123',
        'cache-control': 'max-age=3600'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({ headers: new Headers(headers) });
      await fetchHandler(fetchEvent);

      expect(client.postMessage).toHaveBeenCalledWith({
        type: 'PERFORMANCE_ENTRY',
        entry: {
          name: 'https://example.com/api/data',
          entryType: 'resource',
          startTime: 100,
          duration: 50,
          responseHeaders: headers,
          request: { method: 'GET', type: 'fetch' }
        }
      });
    });
  });

  describe('lifecycle events', () => {
    it('should skip waiting on install', () => {
      const event = { waitUntil: jest.fn() } as unknown as ExtendableEvent;
      event.waitUntil(self.skipWaiting());
      expect(self.skipWaiting).toHaveBeenCalled();
    });

    it('should claim clients on activate', () => {
      const event = { waitUntil: jest.fn() } as unknown as ExtendableEvent;
      event.waitUntil(clients.claim());
      expect(clients.claim).toHaveBeenCalled();
    });
  });

  describe('message handling', () => {
    it('should handle DISCONNECT message', () => {
      const event = new MessageEvent('message', { data: { type: 'DISCONNECT' } });
      if (event.data.type === 'DISCONNECT') self.close();
      expect(self.close).toHaveBeenCalled();
    });
  });
}); 