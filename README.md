# Performance Observer JS

[![npm version](https://badge.fury.io/js/performance-observer-js.svg)](https://badge.fury.io/js/performance-observer-js)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

A lightweight, zero-dependency JavaScript library for comprehensive web performance observability. Monitor, transform, and analyze performance metrics with ease.

## 🌟 Key Features

- **Comprehensive Observability**: Monitor resource timing, XHR, and fetch requests with detailed metrics
- **Real-time Monitoring**: Subscribe to performance entries as they occur
- **Data Transformation**: Transform performance data to match your observability needs
- **Header Capture**: Automatically capture and sanitize response headers
- **Zero Dependencies**: Lightweight and framework-agnostic
- **TypeScript Support**: Full type safety with TypeScript definitions

## 🚀 Quick Start

```bash
npm install performance-observer-js
```

### Basic Usage

```typescript
import { PerformanceMonitor } from 'performance-observer-js';

const monitor = new PerformanceMonitor({
  resourceTiming: true,
  xhrTiming: true,
  fetchTiming: true
});

// Subscribe to performance entries
const subscription = monitor.subscribe((entry) => {
  console.log('Performance entry:', entry);
});

// Clean up when done
subscription.unsubscribe();
monitor.disconnect();
```

### Data Transformation

```typescript
const monitor = new PerformanceMonitor({
  transform: (entry) => ({
    ...entry,
    timestamp: Date.now(),
    environment: 'production',
    requestId: entry.responseHeaders?.requestId
  })
});
```

## 📊 Observability Integration

### New Relic Integration

```javascript
import { PerformanceMonitor } from 'performance-observer-js';

const monitor = new PerformanceMonitor({
  transform: (entry) => ({
    ...entry,
    transactionId: window.newrelic?.getBrowserTimingHeader()?.split('"')[1],
    sessionId: window.newrelic?.getSessionId(),
    requestId: entry.responseHeaders?.requestId
  })
});

monitor.subscribe((entry) => {
  newrelic.addPageAction('resource_timing', {
    name: entry.name,
    duration: entry.duration,
    ...entry.responseHeaders
  });
});
```

### Datadog Integration

```javascript
import { PerformanceMonitor } from 'performance-observer-js';

const monitor = new PerformanceMonitor({
  transform: (entry) => ({
    ...entry,
    sessionId: window.DD_RUM?.getSessionId(),
    viewId: window.DD_RUM?.getViewId(),
    requestId: entry.responseHeaders?.requestId
  })
});

monitor.subscribe((entry) => {
  datadog.addResource({
    name: entry.name,
    duration: entry.duration,
    ...entry.responseHeaders
  });
});
```

## 🔍 Performance Entry Structure

Each performance entry includes:
- Resource name and type
- Duration and timing metrics
- Response headers (sanitized)
- Custom transformed fields

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
```

## 📝 License

MIT