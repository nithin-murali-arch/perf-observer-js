# Performance Observer JS Examples

This directory contains example implementations showing different ways to use the Performance Observer JS library.

## Examples Overview

### 1. Basic Usage (`basic-usage.ts`)
Shows the fundamental setup and usage of the performance monitoring:
- Service Worker registration
- Basic performance data collection
- Simple data logging

### 2. React Integration (`react-integration.tsx`)
Demonstrates how to integrate the performance monitoring with React applications:
- Custom hook for performance monitoring
- Performance data visualization component
- Real-time updates in React components

### 3. Error Handling (`error-handling.ts`)
Shows how to handle various error scenarios:
- Failed request monitoring
- Network error tracking
- Custom error reporting integration

### 4. Custom Transformations (`custom-transformation.ts`)
Examples of how to transform and process performance data:
- Custom data filtering
- Data aggregation
- Metric calculations

### 5. Monitoring Service (`monitoring-service.ts`)
Implementation of a dedicated monitoring service:
- Centralized performance monitoring
- Data persistence
- Analytics integration

### 6. RUM Integrations
Examples of Real User Monitoring integrations in the `rum-integrations` directory:
- Google Analytics integration
- Custom analytics platform integration
- Performance data aggregation

## Running the Examples

1. Install dependencies:
```bash
npm install
# or
yarn
```

2. Start the development server:
```bash
npm run dev
# or
yarn dev
```

3. Open the browser and navigate to the example pages:
- Basic Usage: http://localhost:3000/basic
- React Integration: http://localhost:3000/react
- Error Handling: http://localhost:3000/error
- Custom Transformations: http://localhost:3000/transform
- Monitoring Service: http://localhost:3000/monitor

## Example Data Structure

All examples use the following performance entry structure:

```typescript
interface PerformanceEntry {
  name: string;              // Resource URL
  entryType: 'resource';     // Entry type
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

## Best Practices

1. **Error Handling**: Always implement proper error handling as shown in `error-handling.ts`
2. **Data Transformation**: Use custom transformations to process data before consumption
3. **Performance**: Consider using throttling or debouncing for high-frequency updates
4. **Memory Management**: Clean up subscriptions and listeners when components unmount
5. **Security**: Validate and sanitize performance data before processing

## Contributing

Feel free to contribute additional examples by submitting a pull request. Please ensure your examples:
- Are well documented
- Follow the existing code style
- Include proper error handling
- Are tested and working 