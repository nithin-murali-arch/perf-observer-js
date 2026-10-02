# perf-observer-js

Monitor network requests in web apps with Service Worker timing and response headers.

[![CI](https://github.com/nithin-murali-arch/perf-observer-js/actions/workflows/test.yml/badge.svg)](https://github.com/nithin-murali-arch/perf-observer-js/actions/workflows/test.yml)
[![npm version](https://img.shields.io/npm/v/perf-observer-js.svg)](https://www.npmjs.com/package/perf-observer-js)

```bash
npm install perf-observer-js
```

```typescript
import { PerformanceMonitor } from 'perf-observer-js';
const monitor = new PerformanceMonitor({ workerUrl: '/worker.js' });
monitor.subscribe((entry) => {
  console.log(entry.name, entry.duration, entry.responseHeaders);
});
```

## Features

- 🔍 **Comprehensive Network Monitoring**: Track all network requests with detailed timing information
- 📊 **Response Headers**: Access response headers for each request
- ⚡ **Service Worker Based**: Uses Service Workers for reliable request interception
- 🔄 **Transform Support**: Customize performance entries with transform functions
- 🎯 **TypeScript Ready**: Full TypeScript support with type definitions
- 📦 **Zero Dependencies**: Lightweight and framework-agnostic
- 🛡️ **Error Handling**: Robust error handling for failed requests

## Installation

```bash
npm install performance-observer-js
# or
yarn add performance-observer-js
```

## Quick Start

```typescript
import { PerformanceMonitor } from 'performance-observer-js';

// Initialize the monitor
const monitor = new PerformanceMonitor({
  workerUrl: '/worker.js'
});

// Subscribe to performance entries
const subscription = monitor.subscribe((entry) => {
  console.log('Network request:', entry);
  // Access timing information
  console.log('Request duration:', entry.duration);
  // Access response headers
  console.log('Response headers:', entry.responseHeaders);
});

// Cleanup when done
subscription.unsubscribe();
// or
monitor.disconnect();
```

## Configuration

The `PerformanceMonitor` constructor accepts the following configuration options:

```typescript
interface PerformanceMonitorConfig {
  workerUrl: string;  // Required: URL to the service worker file
  transform?: (entry: PerformanceEntryWithHeaders) => PerformanceEntryWithHeaders;  // Optional: Transform function
}
```

### Example with Transform

```typescript
const monitor = new PerformanceMonitor({
  workerUrl: '/worker.js',
  transform: (entry) => {
    // Add custom properties
    return {
      ...entry,
      customMetric: entry.duration * 2
    };
  }
});
```

## Performance Entry Structure

Each performance entry includes:

```typescript
interface PerformanceEntryWithHeaders {
  name: string;              // Request URL
  entryType: string;         // Always 'resource'
  startTime: number;         // Request start time
  duration: number;          // Total request duration
  responseHeaders: {         // Response headers
    [key: string]: string;
  };
  timing: {                  // Detailed timing information
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
  request: {                 // Request details
    method: string;
    type: string;
  };
  error?: string;            // Error message if request failed
}
```

## Setup

### 1. Copy Worker File

First, copy the worker file from the package to your public directory:

```bash
cp node_modules/performance-observer-js/public/worker.js public/
```

### 2. Configure Your Build Tool

#### Webpack

```javascript
// webpack.config.js
module.exports = {
  // ... other config
  output: {
    publicPath: '/'
  }
};
```

#### Vite

```javascript
// vite.config.js
export default {
  // ... other config
  publicDir: 'public'
};
```

#### Next.js

```javascript
// next.config.js
module.exports = {
  // ... other config
  async rewrites() {
    return [
      {
        source: '/worker.js',
        destination: '/public/worker.js'
      }
    ];
  }
};
```

### 3. Manual Setup

If you're not using a build tool, ensure your web server is configured to serve the worker file from the public directory.

## Browser Support

- Chrome 60+
- Firefox 54+
- Safari 11.1+
- Edge 79+

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by the [Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API)
- Built with [TypeScript](https://www.typescriptlang.org/)