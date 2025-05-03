import { PerformanceMonitor } from 'perf-observer-js';
import type { PerformanceEntryWithHeaders } from 'perf-observer-js';

// Define the type for our transformed entry
interface ErrorDetails {
  type: string;
  message: string;
  timestamp: number;
}

type ErrorEntry = Omit<PerformanceEntryWithHeaders, 'error'> & {
  error?: ErrorDetails;
};

// Create a performance monitor with error handling
const monitor = new PerformanceMonitor({
  transform: (entry: PerformanceEntryWithHeaders): PerformanceEntryWithHeaders => {
    // Add error information if the request failed
    if (!entry.timing || entry.duration === 0) {
      return {
        ...entry,
        error: 'Request failed or timed out'
      };
    }
    return entry;
  }
});

// Subscribe to performance entries with error handling
const subscription = monitor.subscribe((entry) => {
  try {
    // Check for errors
    if ('error' in entry) {
      console.error('Failed Request:', {
        url: entry.name,
        error: (entry as ErrorEntry).error,
        headers: entry.responseHeaders
      });
      return;
    }

    // Log successful requests
    console.log('Successful Request:', {
      url: entry.name,
      duration: entry.duration,
      timing: entry.timing,
      headers: entry.responseHeaders
    });

    // Example: Check for slow requests
    if (entry.duration > 1000) { // 1 second threshold
      console.warn('Slow Request:', {
        url: entry.name,
        duration: entry.duration,
        timing: entry.timing
      });
    }

    // Example: Check for specific error status codes
    const statusCode = entry.responseHeaders['status'];
    if (statusCode && parseInt(statusCode) >= 400) {
      console.error('Error Status Code:', {
        url: entry.name,
        status: statusCode,
        headers: entry.responseHeaders
      });
    }

  } catch (error) {
    console.error('Error processing performance entry:', error);
  }
});

// Example: Clean up when done
// subscription.unsubscribe();
// monitor.disconnect();

// Example: Make some requests that might fail
async function makeRequests() {
  // XHR request that might fail
  const xhr = new XMLHttpRequest();
  xhr.open('GET', 'https://api.example.com/nonexistent');
  xhr.send();

  // Fetch request that might fail
  try {
    await fetch('https://api.example.com/error');
  } catch (error) {
    console.log('Fetch error caught:', error);
  }

  // Timeout request
  try {
    await fetch('https://api.example.com/slow', {
      signal: AbortSignal.timeout(1000) // 1 second timeout
    });
  } catch (error) {
    console.log('Timeout error caught:', error);
  }
}

// Run the example
makeRequests();

// Clean up when done
setTimeout(() => {
  subscription.unsubscribe();
  monitor.disconnect();
}, 5000); 