// Service Worker for capturing resource performance data
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Store performance entries
const performanceEntries = new Map();

// Function to send performance data to clients
function sendPerformanceData(client, entry) {
  client.postMessage({
    type: 'PERFORMANCE_ENTRY',
    data: entry
  });
}

// Function to create a performance entry
function createPerformanceEntry(url, response, timing) {
  const headers = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return {
    name: url,
    entryType: 'resource',
    startTime: timing?.startTime || performance.now(),
    duration: timing?.duration || 0,
    responseHeaders: headers,
    // Include detailed timing data
    timing: timing ? {
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
    } : null,
    // Include request information
    request: {
      method: timing?.requestMethod || 'GET',
      type: timing?.initiatorType || 'fetch'
    }
  };
}

// Handle performance observer entries
self.addEventListener('message', (event) => {
  if (event.data.type === 'PERFORMANCE_ENTRY') {
    const entry = event.data.data;
    performanceEntries.set(entry.name, entry);
    
    // Broadcast to all clients
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        sendPerformanceData(client, entry);
      });
    });
  }
});

// Intercept all fetch requests
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  const startTime = performance.now();
  
  // Clone the request to avoid consuming it
  const fetchPromise = fetch(event.request).then(async (response) => {
    // Clone the response to avoid consuming it
    const responseClone = response.clone();
    
    // Get timing data
    const timing = performance.getEntriesByName(url).pop();
    
    // Create performance entry
    const entry = createPerformanceEntry(url, responseClone, timing);
    
    // Store and broadcast the entry
    performanceEntries.set(url, entry);
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        sendPerformanceData(client, entry);
      });
    });

    return response;
  }).catch(error => {
    // Handle failed requests
    const entry = createPerformanceEntry(url, new Response(), null);
    entry.error = error.message;
    entry.duration = performance.now() - startTime;
    
    // Store and broadcast the error entry
    performanceEntries.set(url, entry);
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        sendPerformanceData(client, entry);
      });
    });

    throw error;
  });

  event.respondWith(fetchPromise);
});

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createPerformanceEntry,
    sendPerformanceData
  };
} 