# perf-observer-js

[![Tests](https://github.com/nithin-murali-arch/perf-observer-js/actions/workflows/test.yml/badge.svg)](https://github.com/nithin-murali-arch/perf-observer-js/actions/workflows/test.yml)
[![npm version](https://img.shields.io/npm/v/perf-observer-js)](https://www.npmjs.com/package/perf-observer-js)
[![npm downloads](https://img.shields.io/npm/dm/perf-observer-js)](https://www.npmjs.com/package/perf-observer-js)
[![license](https://img.shields.io/npm/l/perf-observer-js)](https://github.com/nithin-murali-arch/perf-observer-js/blob/main/LICENSE)
[![types](https://img.shields.io/npm/types/perf-observer-js)](https://www.npmjs.com/package/perf-observer-js)
[![minified + gzip size](https://img.shields.io/bundlejs/size/perf-observer-js)](https://bundlejs.com/?q=perf-observer-js)

`perf-observer-js` is a service worker based monitor for network requests in web apps. It reports the URL, method, duration and response headers of each request the service worker intercepts through one `subscribe` callback. It does not use `PerformanceObserver` and it does not measure Web Vitals (LCP, INP, CLS, FCP, TTFB). Use [`web-vitals`](https://www.npmjs.com/package/web-vitals) for those.

It has no dependencies. Unminified, the client code is 3.1 kB (1,034 bytes gzipped) and the worker file is 2.7 kB (768 bytes gzipped).

## Install

```bash
npm install perf-observer-js
```

Copy the worker file into the directory your server serves from the site root, for example `public/`:

```bash
cp node_modules/perf-observer-js/public/worker.js public/worker.js
```

## Quick start

```typescript
import { PerformanceMonitor } from 'perf-observer-js';

const monitor = new PerformanceMonitor({ workerUrl: '/worker.js' });

const subscription = monitor.subscribe((entry) => {
  console.log(entry.name, entry.duration, entry.responseHeaders);
});

// Stop one subscriber
subscription.unsubscribe();
// or stop the monitor: removes every subscriber and the page's message listener
monitor.disconnect();
```

Create the monitor in the browser only. The constructor registers the service worker.

## What it measures

The worker file runs a `fetch` handler. For each request it intercepts, the handler re-issues the request with `fetch()`, notes the time before and after, and posts one entry to the page that made the request.

| Field | Value |
| --- | --- |
| `name` | Request URL |
| `request.method` | Request method |
| `request.type` | Always `'fetch'` |
| `duration` | Milliseconds from the start of the fetch event until `fetch()` resolves, measured in the service worker. This is the time to response headers, not the time to download the body. |
| `startTime` | `performance.now()` in the service worker. Its time origin differs from the page, so do not compare it with page timestamps. |
| `responseHeaders` | Response headers. For cross-origin requests the browser exposes only CORS-safelisted headers and those listed in `Access-Control-Expose-Headers`. |
| `error` | The error message when `fetch()` rejects. The entry then has empty `responseHeaders` and `timing: null`. |

HTTP error statuses such as 404 or 500 are not errors here, because `fetch()` resolves for them. Entries carry no status code.

The `timing` sub-fields are coarse placeholders, not measurements. The worker copies the start time into `connectStart`, `domainLookupStart`, `domainLookupEnd`, `fetchStart` and `requestStart`, and the end time into `connectEnd`, `responseStart` and `responseEnd`. `secureConnectionStart` is the start time for `https:` URLs and `undefined` otherwise. `redirectStart` and `redirectEnd` are always `0`. The package cannot give you DNS, connection or TLS durations. Use the Resource Timing API for those.

The worker posts each entry only to the page that made the request. A subscriber in one tab does not see the requests of other tabs. Requests made before the service worker controls the page, such as those during the first page load after install, are not reported.

## API

### `new PerformanceMonitor(config)`

```typescript
interface PerformanceMonitorConfig {
  workerUrl: string;
  transform?: (entry: PerformanceEntryWithHeaders) => PerformanceEntryWithHeaders;
}
```

`workerUrl` is required. The constructor throws if it is empty. It registers the worker at that URL and listens for its messages. A worker served from `/worker.js` controls the whole origin.

`transform` runs on each entry before subscribers receive it:

```typescript
const monitor = new PerformanceMonitor({
  workerUrl: '/worker.js',
  transform: (entry) => ({ ...entry, duration: Math.round(entry.duration) })
});
```

If `transform` or a subscriber throws, the monitor logs the error with `console.error` and the remaining subscribers do not run for that entry.

### `monitor.subscribe(callback)`

Adds `callback` and returns `{ unsubscribe }`. Throws if `callback` is not a function.

### `monitor.disconnect()`

Removes all subscribers and stops the monitor from listening to the worker. `disconnect()` is terminal for that instance. Create a new `PerformanceMonitor` to start again. The worker keeps running and keeps handling requests.

### `PerformanceEntryWithHeaders`

```typescript
interface PerformanceEntryWithHeaders {
  name: string;
  entryType: string;                      // always 'resource'
  startTime: number;
  duration: number;
  responseHeaders: Record<string, string>;
  error?: string;
  timing?: {
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
  request?: {
    method: string;
    type: string;                         // always 'fetch'
  };
}
```

The package also exports the types `Subscription`, `SubscriptionCallback`, `TransformFunction` and `PerformanceMonitorConfig`.

## Setup by build tool

The worker must be a real file at the URL you pass as `workerUrl`, on the same origin as the page. Copy `node_modules/perf-observer-js/public/worker.js` there.

### Vite

Put `worker.js` in the `public/` directory. Vite serves it at `/worker.js` and copies it to the root of the build output.

### webpack

webpack does not copy static files. Copy the worker to the output root with `copy-webpack-plugin`:

```javascript
// webpack.config.js
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  plugins: [
    new CopyPlugin({
      patterns: [{ from: 'node_modules/perf-observer-js/public/worker.js', to: 'worker.js' }]
    })
  ]
};
```

### Next.js

Copy `worker.js` into the `public/` directory. Next.js serves `public/` at the site root, so the file is available at `/worker.js` and needs no rewrite. Create the monitor inside a client component, in `useEffect`:

```tsx
'use client';
import { useEffect } from 'react';
import { PerformanceMonitor } from 'perf-observer-js';

export function NetworkMonitor() {
  useEffect(() => {
    const monitor = new PerformanceMonitor({ workerUrl: '/worker.js' });
    const subscription = monitor.subscribe((entry) => console.log(entry.name, entry.duration));
    return () => subscription.unsubscribe();
  }, []);
  return null;
}
```

### Other setups

Serve `public/worker.js` as a static file with a JavaScript content type at the URL you pass as `workerUrl`.

## When to use it

- You want the response headers of every request a page makes, such as cache headers, CDN headers or request IDs, in real user sessions.
- You want a single `subscribe` callback to forward per-request duration and headers to your own logging endpoint.
- Do not use it for Web Vitals. Use `web-vitals`.
- Do not use it when you need DNS, connection, TLS or time-to-first-byte breakdowns, or when your app already has its own service worker. A scope has one active worker, and this worker answers every request it intercepts.

## Alternatives

| | Measures | Per-request timing | Response headers | Needs a service worker |
| --- | --- | --- | --- | --- |
| `perf-observer-js` | Requests the service worker intercepts | Total duration to response headers | Yes | Yes |
| [`@opentelemetry/instrumentation-fetch`](https://www.npmjs.com/package/@opentelemetry/instrumentation-fetch) | Calls to `fetch()` in the page, exported as traces | Spans for each call | Not recorded by default | No |
| [`web-vitals`](https://www.npmjs.com/package/web-vitals) | Core Web Vitals for the page | No, page-level metrics | No | No |
| Resource Timing API with `PerformanceObserver` | Resources the page loads | Yes, with DNS, connection, TLS and response phases | No | No |

Resource Timing gives finer timing than this package and needs no service worker or install. Choose it when timing detail matters more than headers. For cross-origin requests it reports most phases only when the response sends a `Timing-Allow-Origin` header. Choose OpenTelemetry when you want traces sent to a tracing backend. This package is the better fit when you need response headers for every request and a single subscription API.

## FAQ

### How do I monitor all network requests in a web app?

Register a service worker that handles `fetch` events and forward what it sees to the page. This package does that. Create a `PerformanceMonitor` with the URL of `worker.js` and call `subscribe`. You receive one entry for each request the service worker intercepts, within the worker's scope.

### How do I read the response headers of every fetch request?

Subscribe and read `entry.responseHeaders`.

```typescript
monitor.subscribe((entry) => {
  console.log(entry.name, entry.responseHeaders['cache-control']);
});
```

Header names are lowercase. Cross-origin responses expose only the headers the server allows with `Access-Control-Expose-Headers`.

### How do I measure fetch request duration in JavaScript?

For one call, subtract `performance.now()` values around it. For every request, subscribe to this package and read `entry.duration`.

```typescript
const start = performance.now();
const response = await fetch('/api/items');
console.log('time to response headers', performance.now() - start);
```

`entry.duration` is also time to response headers, not time to the end of the body.

### Does it measure Core Web Vitals?

No. It does not report LCP, INP, CLS, FCP or TTFB. Use [`web-vitals`](https://www.npmjs.com/package/web-vitals) for those.

### Does it work without a service worker?

No. The service worker is the only source of its data. It does nothing in browsers without Service Worker support, and the worker only registers on pages served over HTTPS or on `localhost`.

### Does it capture requests on the first page load?

Not all of them. The worker takes control of the open page when it activates, by calling `clients.claim()`. Requests the page made before that point are not seen, and the page is fully monitored from the next load on. The Resource Timing API with `buffered: true` can report requests made before your script ran.

### How do I set it up with Vite, webpack and Next.js?

Copy `worker.js` so that your site serves it at the URL you pass as `workerUrl`. See [Setup by build tool](#setup-by-build-tool) for each tool.

### How is it different from the Resource Timing API?

Resource Timing is built into the browser and gives finer timing, but it does not give response headers. This package gives response headers and one subscription API, with coarse timing. The Resource Timing version looks like this:

```typescript
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) console.log(entry.name, entry.duration);
}).observe({ type: 'resource', buffered: true });
```

## Browser support

Browsers with Service Worker support. Pages must be served over HTTPS or from `localhost`. The service worker only sees requests after it controls the page, so the first load is not monitored until `clients.claim()` runs. CI runs the unit tests on Node 22 and 24 with jsdom and does not test in real browsers.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

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
