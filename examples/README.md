# Examples

This directory contains various examples demonstrating how to use the Performance Observer JS library in different scenarios.

## Basic Usage (`basic-usage.ts`)

A simple example showing the core functionality of the library:
- Creating a performance monitor instance
- Subscribing to performance entries
- Monitoring XHR and fetch requests
- Basic cleanup

## Custom Transformation (`custom-transformation.ts`)

Demonstrates how to use the transform function to:
- Add custom fields to entries
- Categorize requests
- Normalize response headers
- Add custom metrics
- Remove sensitive information

## Error Handling (`error-handling.ts`)

Shows how to handle various error scenarios:
- Failed XHR requests
- Failed fetch requests
- Timeout handling
- Error tracking and reporting
- Custom error transformation

## Monitoring Service Integration (`monitoring-service.ts`)

Example of integrating with a monitoring service:
- Custom metrics tracking
- Error tracking
- Response size monitoring
- Environment tagging
- Service name tracking

## React Integration (`react-integration.tsx`)

Demonstrates how to use the library in a React application:
- Custom hook for performance monitoring
- Component-level monitoring
- Cleanup on unmount
- React-specific transformations
- Multiple component tracking

## Running the Examples

To run any example:

1. Install dependencies:
```bash
npm install
```

2. Run the example:
```bash
# For TypeScript examples
ts-node examples/basic-usage.ts

# For React example
# First, set up a React project and copy the example
npm start
```

Note: The React example requires a React project setup with TypeScript support. You'll need to:
1. Install React and its type definitions
2. Configure TypeScript for React
3. Set up a build system (like Create React App or Vite) 