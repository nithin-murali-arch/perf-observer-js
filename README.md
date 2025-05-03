# Performance Observer JS

A TypeScript library for monitoring web performance metrics using Service Workers.

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
npm install performance-observer-js
```

## Usage

### Basic Usage

1. First, copy the `worker.js` file from the `dist` directory to your public assets directory.

2. Create a monitor instance with the worker URL:

```typescript
import { PerformanceMonitor } from 'performance-observer-js';

// Create a monitor instance with the worker URL
const monitor = new PerformanceMonitor({
  workerUrl: '/path/to/worker.js' // URL to your service worker file
});

// Subscribe to performance entries
const subscription = monitor.subscribe((entry) => {
  console.log('Performance entry:', entry);
});

// Unsubscribe when done
subscription.unsubscribe();
```

### Configuration Options

The `PerformanceMonitor` constructor requires a configuration object with the following options:

```typescript
interface PerformanceMonitorConfig {
  transform?: (entry: PerformanceEntryWithHeaders) => PerformanceEntryWithHeaders;
  workerUrl: string; // Required URL to the service worker file
}
```

#### Serving the Service Worker

The service worker file must be served from your web server. First, copy the worker file from the library to your project's public directory:

```bash
# Copy the worker file to your public directory
cp node_modules/performance-observer-js/public/worker.js public/
```

Then, configure your build tool to serve the worker file:

##### Webpack

```javascript
// webpack.config.js
module.exports = {
  // ... other config
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'node_modules/performance-observer-js/public/worker.js',
          to: 'worker.js'
        }
      ]
    })
  ]
};
```

Use the worker in your code:

```typescript
const monitor = new PerformanceMonitor({
  workerUrl: '/worker.js'
});
```

##### Vite

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // ... other config
  publicDir: 'public',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        worker: resolve(__dirname, 'node_modules/performance-observer-js/public/worker.js')
      }
    }
  }
});
```

Use the worker in your code:

```typescript
const monitor = new PerformanceMonitor({
  workerUrl: '/worker.js'
});
```

##### Next.js

```javascript
// next.config.js
module.exports = {
  // ... other config
  async headers() {
    return [
      {
        source: '/worker.js',
        headers: [
          {
            key: 'Service-Worker-Allowed',
            value: '/'
          }
        ]
      }
    ];
  }
};
```

Use the worker in your code:

```typescript
const monitor = new PerformanceMonitor({
  workerUrl: '/worker.js'
});
```

##### Manual Setup

If you're not using a build tool:

1. Copy the worker file from the library to your web server's public directory:
```bash
cp node_modules/performance-observer-js/public/worker.js public/
```

2. Configure your web server to:
   - Serve the file with the correct MIME type (`application/javascript`)
   - Allow service worker registration for the worker file

### Performance Entry Structure

Each performance entry includes:

```typescript
interface PerformanceEntryWithHeaders {
  name: string;              // Resource URL
  entryType: string;         // Type of entry (e.g., 'resource')
  startTime: number;         // Start time of the request
  duration: number;          // Duration of the request
  responseHeaders: {         // Response headers
    [key: string]: string;
  };
  error?: string;           // Error message if request failed
  timing?: {                // Detailed timing information
    connectStart: number;
    connectEnd: number;
    domainLookupStart: number;
    domainLookupEnd: number;
    fetchStart: number;
    requestStart: number;
    responseStart: number;
    responseEnd: number;
    secureConnectionStart?: number;
    redirectStart?: number;
    redirectEnd?: number;
  } | null;
  request?: {               // Request information
    method: string;
    type: string;
  };
}
```

### Transform Function

You can transform performance entries before they are passed to subscribers:

```typescript
const monitor = new PerformanceMonitor({
  workerUrl: '/path/to/worker.js',
  transform: (entry) => {
    // Modify the entry as needed
    return {
      ...entry,
      // Add custom properties
      customProperty: 'value'
    };
  }
});
```

### Cleanup

When you're done with the monitor, call `disconnect()` to clean up:

```typescript
monitor.disconnect();
```

## Browser Support

- Chrome 60+
- Firefox 57+
- Safari 11.1+
- Edge 79+

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