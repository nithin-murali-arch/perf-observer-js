"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workerCode = void 0;
// Service worker code as a string
exports.workerCode = `
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PERFORMANCE_ENTRY') {
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'PERFORMANCE_ENTRY',
          entry: event.data.entry
        });
      });
    });
  }
});

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
          startTime: startTime,
          duration: duration,
          timing: {
            fetchStart: startTime,
            responseEnd: endTime
          },
          responseHeaders: headers,
          request: {
            type: request.type,
            method: request.method,
            mode: request.mode,
            credentials: request.credentials,
            headers: Object.fromEntries(request.headers)
          }
        };

        // Send to main thread
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'PERFORMANCE_ENTRY',
              entry
            });
          });
        });

        return response;
      })
      .catch((error) => {
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Create error entry
        const entry = {
          name: request.url,
          entryType: 'resource',
          startTime: startTime,
          duration: duration,
          error: error.message,
          request: {
            type: request.type,
            method: request.method,
            mode: request.mode,
            credentials: request.credentials,
            headers: Object.fromEntries(request.headers)
          }
        };

        // Send to main thread
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'PERFORMANCE_ENTRY',
              entry
            });
          });
        });

        throw error;
      })
  );
});
`;
