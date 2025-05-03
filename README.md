# Performance Observer JS

[![npm version](https://img.shields.io/npm/v/performance-observer-js.svg)](https://www.npmjs.com/package/performance-observer-js)
[![npm downloads](https://img.shields.io/npm/dm/performance-observer-js.svg)](https://www.npmjs.com/package/performance-observer-js)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

A powerful and lightweight TypeScript/JavaScript library for monitoring web performance using the PerformanceObserver API. Built with modern web standards in mind, it provides comprehensive performance monitoring capabilities with zero dependencies.

## ✨ Features

- 📊 Monitor resource and navigation timing with PerformanceObserver
- 🔄 Intercept and monitor XHR and fetch requests
- 📝 Capture response headers for each request
- 🔧 Data transformation at configuration level
- 📡 Real-time performance monitoring with subscription system
- 🎯 Full TypeScript support with type definitions
- 🚀 Zero dependencies
- 📦 Works in both Node.js and browser environments
- 🔍 Comprehensive error handling
- 🧪 Well-tested with Jest

## 📦 Installation

```bash
# Using npm
npm install performance-observer-js

# Using yarn
yarn add performance-observer-js

# Using pnpm
pnpm add performance-observer-js
```

## 🚀 Quick Start

### TypeScript

```typescript
import { PerformanceMonitor } from 'performance-observer-js';

// Create a performance monitor instance
const monitor = new PerformanceMonitor({
  resourceTiming: true,    // Monitor resource timing
  navigationTiming: true,  // Monitor navigation timing
  xhrTiming: true,        // Monitor XHR requests
  fetchTiming: true,      // Monitor fetch requests
  transform: (entry) => { // Optional data transformation
    return {
      ...entry,
      customField: 'value'
    };
  }
});

// Subscribe to performance entries
const subscription = monitor.subscribe((entry) => {
  console.log('Performance entry:', entry);
  // Access response headers if available
  if (entry.responseHeaders) {
    console.log('Response headers:', entry.responseHeaders);
  }
});

// Clean up when done
subscription.unsubscribe();
monitor.disconnect();
```

### JavaScript

```javascript
const { PerformanceMonitor } = require('performance-observer-js');

const monitor = new PerformanceMonitor({
  resourceTiming: true,
  navigationTiming: true,
  xhrTiming: true,
  fetchTiming: true,
  transform: (entry) => {
    return {
      ...entry,
      customField: 'value'
    };
  }
});

const subscription = monitor.subscribe((entry) => {
  console.log('Performance entry:', entry);
  if (entry.responseHeaders) {
    console.log('Response headers:', entry.responseHeaders);
  }
});

// Clean up
subscription.unsubscribe();
monitor.disconnect();
```

## 🔧 Configuration

The `PerformanceMonitor` constructor accepts a configuration object with the following options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `resourceTiming` | `boolean` | `false` | Enable resource timing monitoring |
| `navigationTiming` | `boolean` | `false` | Enable navigation timing monitoring |
| `xhrTiming` | `boolean` | `false` | Enable XHR request monitoring |
| `fetchTiming` | `boolean` | `false` | Enable fetch request monitoring |
| `transform` | `TransformFunction` | `undefined` | Optional function to transform entries |

## 🔄 Data Transformation

The `transform` function allows you to modify performance entries at the configuration level. This is useful for:

- Adding custom fields
- Filtering out sensitive information
- Normalizing data
- Adding business-specific metrics

Example:

```typescript
const monitor = new PerformanceMonitor({
  transform: (entry) => {
    return {
      ...entry,
      timestamp: Date.now(),
      environment: 'production',
      // Normalize response headers
      responseHeaders: entry.responseHeaders ? {
        ...entry.responseHeaders,
        'content-type': entry.responseHeaders['content-type']?.toLowerCase()
      } : undefined
    };
  }
});
```

## 📊 Performance Entry Structure

Each performance entry includes:

- Standard PerformanceEntry properties (name, entryType, startTime, duration)
- Response headers (if available)
- Any custom fields added by the transform function

Example entry:

```typescript
{
  name: 'https://api.example.com/data',
  entryType: 'resource',
  startTime: 1234,
  duration: 567,
  responseHeaders: {
    'content-type': 'application/json',
    'x-custom-header': 'value'
  },
  // Custom fields from transform
  timestamp: 1678901234567,
  environment: 'production'
}
```

## 🧪 Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build the library
npm run build
```

## 📚 API Reference

### `PerformanceMonitor`

The main class for monitoring performance.

#### Constructor

```typescript
new PerformanceMonitor(config?: PerformanceMonitorConfig)
```

#### Methods

- `subscribe(callback: SubscriptionCallback): Subscription`
  - Subscribe to performance entries
  - Returns a subscription object with an `unsubscribe` method

- `disconnect(): void`
  - Disconnect the monitor and clean up resources
  - Restores original XHR and fetch implementations
  - Clears all subscribers

### Types

```typescript
interface PerformanceMonitorConfig {
  resourceTiming?: boolean;
  navigationTiming?: boolean;
  xhrTiming?: boolean;
  fetchTiming?: boolean;
  transform?: TransformFunction;
}

type TransformFunction = (entry: PerformanceEntryWithHeaders) => PerformanceEntryWithHeaders;

type SubscriptionCallback = (entry: PerformanceEntryWithHeaders) => void;

interface Subscription {
  unsubscribe: () => void;
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## References

- [PerformanceObserver API](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver)
- [Performance Timeline API](https://developer.mozilla.org/en-US/docs/Web/API/Performance_Timeline)
- [Resource Timing API](https://developer.mozilla.org/en-US/docs/Web/API/Resource_Timing_API)