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

Copy `worker.js` into the `public/` directory. Next.js serves `public/` at the site root, so the file is available at `/worker.js` and needs no rewrite. Create the monitor inside a client component, as in [Show requests in a Next.js App Router app](#show-requests-in-a-nextjs-app-router-app).

### Other setups

Serve `public/worker.js` as a static file with a JavaScript content type at the URL you pass as `workerUrl`.

## Use it with your framework

Each guide creates the monitor only in the browser and expects your site to serve the worker at `/worker.js`. To serve it there, see [Setup by build tool](#setup-by-build-tool).

### Show requests in a React component

To keep a component's requests in state, create the monitor in `useEffect` and call `disconnect()` in the cleanup.

```typescript
// src/useNetworkEntries.ts
import { useEffect, useState } from 'react';
import { PerformanceMonitor, type PerformanceEntryWithHeaders } from 'perf-observer-js';

export function useNetworkEntries(workerUrl = '/worker.js') {
  const [entries, setEntries] = useState<PerformanceEntryWithHeaders[]>([]);

  useEffect(() => {
    const monitor = new PerformanceMonitor({ workerUrl });
    monitor.subscribe((entry) => setEntries((previous) => [...previous, entry].slice(-100)));
    return () => monitor.disconnect();
  }, [workerUrl]);

  return entries;
}
```

```tsx
// src/NetworkLog.tsx
import { useNetworkEntries } from './useNetworkEntries';

export function NetworkLog() {
  const entries = useNetworkEntries();
  return (
    <ul>
      {entries.map((entry, index) => (
        <li key={index}>
          {entry.request?.method} {entry.name} {Math.round(entry.duration)} ms
        </li>
      ))}
    </ul>
  );
}
```

The hook keeps the last 100 entries. In development, `<StrictMode>` runs the effect, the cleanup and the effect again, and `disconnect()` stops the first monitor before it starts listening.

### Show requests in a Next.js App Router app

To list the requests of every page, save the hook from [Show requests in a React component](#show-requests-in-a-react-component) as `app/useNetworkEntries.ts`, call it from a client component, and render that component in the root layout.

```tsx
// app/NetworkLog.tsx
'use client';
import { useNetworkEntries } from './useNetworkEntries';

export function NetworkLog() {
  const entries = useNetworkEntries();
  return (
    <ul>
      {entries.map((entry, index) => (
        <li key={index}>
          {entry.request?.method} {entry.name} {Math.round(entry.duration)} ms
        </li>
      ))}
    </ul>
  );
}
```

```tsx
// app/layout.tsx
import type { ReactNode } from 'react';
import { NetworkLog } from './NetworkLog';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <NetworkLog />
      </body>
    </html>
  );
}
```

On the server, Next.js renders `NetworkLog` without running its effect, so the server never creates a monitor.

### Show requests in a Vue 3 component

To keep a component's requests in a ref, create the monitor in `onMounted` and call `disconnect()` in `onBeforeUnmount`.

```typescript
// src/useNetworkEntries.ts
import { onBeforeUnmount, onMounted, shallowRef } from 'vue';
import { PerformanceMonitor, type PerformanceEntryWithHeaders } from 'perf-observer-js';

export function useNetworkEntries(workerUrl = '/worker.js') {
  const entries = shallowRef<PerformanceEntryWithHeaders[]>([]);
  let monitor: PerformanceMonitor | undefined;

  onMounted(() => {
    monitor = new PerformanceMonitor({ workerUrl });
    monitor.subscribe((entry) => {
      entries.value = [...entries.value, entry].slice(-100);
    });
  });
  onBeforeUnmount(() => monitor?.disconnect());

  return entries;
}
```

```vue
<!-- src/components/NetworkLog.vue -->
<script setup lang="ts">
import { useNetworkEntries } from '../useNetworkEntries';

const entries = useNetworkEntries();
</script>

<template>
  <ul>
    <li v-for="(entry, index) in entries" :key="index">
      {{ entry.request?.method }} {{ entry.name }} {{ Math.round(entry.duration) }} ms
    </li>
  </ul>
</template>
```

Call the composable from `setup`. Vue does not run `onMounted` during server rendering, so the server never creates a monitor.

### Show requests in a Svelte 5 component

To keep a component's requests in state, create the monitor in `onMount` and return a function that calls `disconnect()`.

```svelte
<!-- src/lib/NetworkLog.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { PerformanceMonitor, type PerformanceEntryWithHeaders } from 'perf-observer-js';

  let entries = $state.raw<PerformanceEntryWithHeaders[]>([]);

  onMount(() => {
    const monitor = new PerformanceMonitor({ workerUrl: '/worker.js' });
    monitor.subscribe((entry) => {
      entries = [...entries, entry].slice(-100);
    });
    return () => monitor.disconnect();
  });
</script>

<ul>
  {#each entries as entry, index (index)}
    <li>{entry.request?.method} {entry.name} {Math.round(entry.duration)} ms</li>
  {/each}
</ul>
```

Svelte runs `onMount` only in the browser, so SvelteKit can render this component on the server.

### Expose requests from an Angular service

To share requests across components, create the monitor in a root service only when `isPlatformBrowser` is true, and call `disconnect()` in `ngOnDestroy`.

```typescript
// src/app/network-entries.service.ts
import { Injectable, OnDestroy, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PerformanceMonitor, type PerformanceEntryWithHeaders } from 'perf-observer-js';

@Injectable({ providedIn: 'root' })
export class NetworkEntriesService implements OnDestroy {
  private readonly monitor = isPlatformBrowser(inject(PLATFORM_ID))
    ? new PerformanceMonitor({ workerUrl: '/worker.js' })
    : null;
  private readonly list = signal<PerformanceEntryWithHeaders[]>([]);
  readonly entries = this.list.asReadonly();

  constructor() {
    this.monitor?.subscribe((entry) => this.list.update((previous) => [...previous, entry].slice(-100)));
  }

  ngOnDestroy(): void {
    this.monitor?.disconnect();
  }
}
```

Inject `NetworkEntriesService` in a component and read `entries()` in its template. On the server, `isPlatformBrowser` returns `false`, so the service creates no monitor and `entries()` stays empty.

### Send entries to your analytics endpoint

To report requests to your own endpoint, collect entries and send them with `navigator.sendBeacon` when the page becomes hidden.

```typescript
// src/networkAnalytics.ts
import { PerformanceMonitor } from 'perf-observer-js';

const endpoint = new URL('/analytics/network', location.href).href;
const queue: { url: string; method?: string; duration: number; error?: string }[] = [];

const monitor = new PerformanceMonitor({ workerUrl: '/worker.js' });

monitor.subscribe((entry) => {
  if (entry.name === endpoint) return;
  queue.push({
    url: entry.name,
    method: entry.request?.method,
    duration: Math.round(entry.duration),
    error: entry.error
  });
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && queue.length > 0) {
    navigator.sendBeacon(endpoint, JSON.stringify(queue.splice(0)));
  }
});
```

The `entry.name === endpoint` check stops the recipe from reporting its own beacon. `sendBeacon` sends the string with a `text/plain;charset=UTF-8` content type, so parse the body as JSON on your server.

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

### How do I use perf-observer-js with React, Vue, Svelte or Angular?

Follow the guide for your framework in [Use it with your framework](#use-it-with-your-framework), which creates the monitor in the browser and calls `disconnect()` on cleanup.

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
