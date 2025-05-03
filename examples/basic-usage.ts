import { PerformanceMonitor } from '../src';

// Create a performance monitor instance with all features enabled
const monitor = new PerformanceMonitor({
  resourceTiming: true,    // Monitor resource timing
  navigationTiming: true,  // Monitor navigation timing
  xhrTiming: true,        // Monitor XHR requests
  fetchTiming: true,      // Monitor fetch requests
});

// Subscribe to performance entries
const subscription = monitor.subscribe((entry) => {
  console.log('Performance entry:', {
    name: entry.name,
    type: entry.entryType,
    duration: entry.duration,
    startTime: entry.startTime,
    // Log response headers if available
    headers: entry.responseHeaders
  });
});

// Example: Make some requests to monitor
async function makeRequests() {
  // XHR request
  const xhr = new XMLHttpRequest();
  xhr.open('GET', 'https://api.example.com/data');
  xhr.send();

  // Fetch request
  try {
    const response = await fetch('https://api.example.com/data');
    const data = await response.json();
    console.log('Fetch response:', data);
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

// Run the example
makeRequests();

// Clean up when done
setTimeout(() => {
  subscription.unsubscribe();
  monitor.disconnect();
}, 5000); 