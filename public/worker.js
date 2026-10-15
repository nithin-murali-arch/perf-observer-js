// Service Worker for Performance Monitoring
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Entries go only to the page that made the request. A navigation has no clientId yet,
// so fall back to the client the navigation creates.
async function postEntry(event, entry) {
  const id = event.clientId || event.resultingClientId;
  const client = id ? await self.clients.get(id) : undefined;
  if (client) {
    client.postMessage({
      type: 'PERFORMANCE_ENTRY',
      entry
    });
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const startTime = performance.now();

  event.respondWith(
    fetch(request)
      .then(async (response) => {
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Clone the response to read headers
        const clonedResponse = response.clone();
        const headers = {};
        clonedResponse.headers.forEach((value, key) => {
          headers[key] = value;
        });

        // Create performance entry
        const entry = {
          name: request.url,
          entryType: 'resource',
          startTime,
          duration,
          responseHeaders: headers,
          timing: {
            connectStart: startTime,
            connectEnd: endTime,
            domainLookupStart: startTime,
            domainLookupEnd: startTime,
            fetchStart: startTime,
            requestStart: startTime,
            responseStart: endTime,
            responseEnd: endTime,
            secureConnectionStart: request.url.startsWith('https:') ? startTime : undefined,
            redirectStart: 0,
            redirectEnd: 0
          },
          request: {
            method: request.method,
            type: request.type || 'fetch'
          }
        };

        await postEntry(event, entry);

        return response;
      })
      .catch(async (error) => {
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Create error entry
        const entry = {
          name: request.url,
          entryType: 'resource',
          startTime,
          duration,
          responseHeaders: {},
          error: error.message,
          timing: null,
          request: {
            method: request.method,
            type: request.type || 'fetch'
          }
        };

        await postEntry(event, entry);

        throw error;
      })
  );
}); 