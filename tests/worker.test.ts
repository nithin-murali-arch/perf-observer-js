/// <reference lib="webworker" />
/// <reference types="serviceworker" />

import { readFileSync } from 'fs';
import { join } from 'path';

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
});

describe('public/worker.js', () => {
  const source = readFileSync(join(__dirname, '../public/worker.js'), 'utf8');

  type Listener = (event: unknown) => unknown;
  let listeners: Record<string, Listener[]>;
  let clientA: { id: string; postMessage: jest.Mock };
  let clientB: { id: string; postMessage: jest.Mock };
  let clientsMock: { get: jest.Mock; matchAll: jest.Mock; claim: jest.Mock };
  let fetchMock: jest.Mock;

  const loadWorker = () => {
    const fakeSelf = {
      addEventListener: (type: string, listener: Listener) => {
        (listeners[type] = listeners[type] || []).push(listener);
      },
      skipWaiting: jest.fn(),
      clients: clientsMock
    };
    const fakePerformance = { now: jest.fn().mockReturnValueOnce(100).mockReturnValueOnce(150) };
    new Function('self', 'clients', 'fetch', 'performance', source)(
      fakeSelf, clientsMock, fetchMock, fakePerformance
    );
  };

  const fetchEvent = (ids: { clientId?: string; resultingClientId?: string }) => ({
    request: { url: 'https://example.com/api/data', method: 'GET', type: '' },
    clientId: '',
    resultingClientId: '',
    ...ids,
    respondWith: jest.fn()
  });

  const dispatchFetch = (event: ReturnType<typeof fetchEvent>) => {
    listeners.fetch[0](event);
    return event.respondWith.mock.calls[0][0] as Promise<unknown>;
  };

  const entryMessage = (extra: Record<string, unknown> = {}) => ({
    type: 'PERFORMANCE_ENTRY',
    entry: expect.objectContaining({ name: 'https://example.com/api/data', ...extra })
  });

  beforeEach(() => {
    listeners = {};
    clientA = { id: 'client-a', postMessage: jest.fn() };
    clientB = { id: 'client-b', postMessage: jest.fn() };
    const byId: Record<string, unknown> = { 'client-a': clientA, 'client-b': clientB };
    clientsMock = {
      get: jest.fn(async (id: string) => byId[id]),
      matchAll: jest.fn().mockResolvedValue([clientA, clientB]),
      claim: jest.fn()
    };
    fetchMock = jest.fn();
    loadWorker();
  });

  it('posts a successful entry only to the client that made the request', async () => {
    fetchMock.mockResolvedValue({
      clone: () => ({ headers: new Map([['content-type', 'application/json']]) })
    });

    await dispatchFetch(fetchEvent({ clientId: 'client-a' }));

    expect(clientsMock.get).toHaveBeenCalledWith('client-a');
    expect(clientA.postMessage).toHaveBeenCalledTimes(1);
    expect(clientA.postMessage).toHaveBeenCalledWith(
      entryMessage({ responseHeaders: { 'content-type': 'application/json' } })
    );
    expect(clientB.postMessage).not.toHaveBeenCalled();
  });

  it('posts a failed entry only to the client that made the request', async () => {
    fetchMock.mockRejectedValue(new Error('Network error'));

    await expect(dispatchFetch(fetchEvent({ clientId: 'client-a' }))).rejects.toThrow('Network error');

    expect(clientA.postMessage).toHaveBeenCalledTimes(1);
    expect(clientA.postMessage).toHaveBeenCalledWith(entryMessage({ error: 'Network error' }));
    expect(clientB.postMessage).not.toHaveBeenCalled();
  });

  it('posts a navigation entry to the resulting client', async () => {
    fetchMock.mockResolvedValue({ clone: () => ({ headers: new Map() }) });

    await dispatchFetch(fetchEvent({ clientId: '', resultingClientId: 'client-b' }));

    expect(clientsMock.get).toHaveBeenCalledWith('client-b');
    expect(clientB.postMessage).toHaveBeenCalledTimes(1);
    expect(clientA.postMessage).not.toHaveBeenCalled();
  });

  it('posts nothing when the request has no client id', async () => {
    fetchMock.mockResolvedValue({ clone: () => ({ headers: new Map() }) });

    await dispatchFetch(fetchEvent({}));

    expect(clientsMock.get).not.toHaveBeenCalled();
    expect(clientA.postMessage).not.toHaveBeenCalled();
    expect(clientB.postMessage).not.toHaveBeenCalled();
  });

  it('registers no message listener', () => {
    expect(listeners.message).toBeUndefined();
  });
});
