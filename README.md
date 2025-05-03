# Performance Observer JS

A lightweight, flexible performance monitoring library for JavaScript applications using Service Workers. This library helps you track and analyze resource loading performance, API calls, and other network requests in real-time.

## Features

- 🔍 Automatic performance monitoring of all network requests
- 📊 Detailed timing metrics including DNS, connection, and response times
- 🔄 Cache-aware performance tracking
- 🚦 Error handling and failed request monitoring
- 📡 Real-time performance data broadcasting
- ⚛️ Framework agnostic (works with React, Vue, Angular, etc.)
- 🧪 Thoroughly tested with Jest

## Installation

```bash
npm install perf-observer-js
# or
yarn add perf-observer-js
```

## Quick Start

1. Import and create a PerformanceMonitor instance:

```javascript
import { PerformanceMonitor } from 'perf-observer-js';

// Create a performance monitor instance
const monitor = new PerformanceMonitor({
  // Optional: Add a transform function to process entries
  transform: (entry) => {
    // Add any custom processing here
    return entry;
  }
});
```

2. Subscribe to performance entries:

```javascript
// Subscribe to performance entries
const subscription = monitor.subscribe((entry) => {
  console.log('Performance entry:', {
    url: entry.name,
    duration: entry.duration,
    timing: entry.timing,
    headers: entry.responseHeaders,
    request: entry.request
  });
});

// Clean up when done
// subscription.unsubscribe();
// monitor.disconnect();
```

The PerformanceMonitor class automatically handles:
- Service Worker registration
- Message event listening
- Error handling
- Data transformation
- Subscriber management

## Performance Data Structure

The library provides detailed performance entries with the following structure:

```typescript
interface PerformanceEntry {
  name: string;              // URL of the resource
  entryType: 'resource';     // Type of entry
  startTime: number;         // Start timestamp
  duration: number;          // Total duration
  responseHeaders: {         // Response headers
    [key: string]: string;
  };
  timing: {                  // Detailed timing data
    connectStart: number;
    connectEnd: number;
    domainLookupStart: number;
    domainLookupEnd: number;
    fetchStart: number;
    requestStart: number;
    responseStart: number;
    responseEnd: number;
    secureConnectionStart: number;
    redirectStart: number;
    redirectEnd: number;
  } | null;
  request: {                 // Request information
    method: string;
    type: string;
  };
}
```

## Examples

Check out the [examples](./examples) directory for more detailed usage scenarios:

- Basic Usage
- React Integration
- Error Handling
- Custom Transformations
- RUM (Real User Monitoring) Integrations

## Testing

The library includes a comprehensive test suite. Run the tests with:

```bash
npm test
# or
yarn test
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.