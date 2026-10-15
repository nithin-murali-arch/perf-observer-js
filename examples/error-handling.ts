import { PerformanceMonitor } from 'perf-observer-js';

const monitor = new PerformanceMonitor({
  workerUrl: '/worker.js'
});

const subscription = monitor.subscribe((entry) => {
  try {
    if ('error' in entry) {
      console.error('Failed Request:', {
        url: entry.name,
        error: entry.error,
        headers: entry.responseHeaders
      });
      return;
    }

    console.log('HTTP Response:', {
      url: entry.name,
      duration: entry.duration,
      status: entry.status,
      headers: entry.responseHeaders
    });

    if (entry.duration > 1000) { // 1 second threshold
      console.warn('Slow Request:', {
        url: entry.name,
        duration: entry.duration,
        status: entry.status
      });
    }

    const statusCode = entry.status;
    if (statusCode >= 400) {
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

// subscription.unsubscribe();
// monitor.disconnect();

async function makeRequests() {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', 'https://api.example.com/nonexistent');
  xhr.send();

  try {
    await fetch('https://api.example.com/error');
  } catch (error) {
    console.log('Fetch error caught:', error);
  }

  try {
    await fetch('https://api.example.com/slow', {
      signal: AbortSignal.timeout(1000) // 1 second timeout
    });
  } catch (error) {
    console.log('Timeout error caught:', error);
  }
}

makeRequests();

setTimeout(() => {
  subscription.unsubscribe();
  monitor.disconnect();
}, 5000);
