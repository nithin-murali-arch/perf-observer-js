import { PerformanceMonitor } from '../src';

// Create a performance monitor instance
const monitor = new PerformanceMonitor({
  resourceTiming: true,
  xhrTiming: true,
  fetchTiming: true,
  transform: (entry) => {
    // Add error information if available
    if (entry.error) {
      return {
        ...entry,
        errorDetails: {
          message: entry.error,
          timestamp: Date.now(),
          url: entry.name
        }
      };
    }
    return entry;
  }
});

// Subscribe to performance entries with error handling
const subscription = monitor.subscribe((entry) => {
  try {
    // Log successful entries
    if (!entry.error) {
      console.log('Successful request:', {
        url: entry.name,
        duration: entry.duration,
        headers: entry.responseHeaders
      });
      return;
    }

    // Log error entries
    console.error('Failed request:', {
      url: entry.name,
      error: entry.error,
      duration: entry.duration,
      // Additional error details from transform
      details: (entry as any).errorDetails
    });

    // You could send errors to your error tracking service here
    // errorTrackingService.captureError(entry.error, {
    //   url: entry.name,
    //   duration: entry.duration,
    //   headers: entry.responseHeaders
    // });
  } catch (error) {
    console.error('Error processing performance entry:', error);
  }
});

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